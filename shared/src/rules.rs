use crate::{Plant, PlantStatus, SubscriptionPlan, SubscriptionStatusSummary};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum PlantLimitError {
    #[error("plan limit reached")]
    PlanLimitReached,
    #[error("inactive plant")]
    InactivePlant,
    #[error("invalid state")]
    InvalidState,
    #[error("plant not found")]
    PlantNotFound,
}

fn visible_plants<'a>(plants: &'a [Plant]) -> impl Iterator<Item = &'a Plant> {
    plants.iter().filter(|plant| plant.is_visible_state())
}

fn active_plants<'a>(plants: &'a [Plant]) -> impl Iterator<Item = &'a Plant> {
    visible_plants(plants).filter(|plant| plant.is_active_state())
}

pub fn active_plant_count(plants: &[Plant]) -> usize {
    active_plants(plants).count()
}

pub fn archived_plant_count(plants: &[Plant]) -> usize {
    visible_plants(plants).filter(|plant| plant.is_archived_state()).count()
}

pub fn ended_plant_count(plants: &[Plant]) -> usize {
    visible_plants(plants)
        .filter(|plant| plant.is_ended_state())
        .count()
}

pub fn visible_plant_count(plants: &[Plant]) -> usize {
    visible_plants(plants).count()
}

pub fn inactive_plant_count(plants: &[Plant]) -> usize {
    visible_plants(plants)
        .filter(|plant| plant.is_inactive_state())
        .count()
}

pub fn can_create_plant(active_count: usize, plan: SubscriptionPlan) -> Result<(), PlantLimitError> {
    let limit = plan.plant_limit();
    if limit != usize::MAX && active_count >= limit {
        return Err(PlantLimitError::PlanLimitReached);
    }
    Ok(())
}

pub fn validate_create_with_plants(plants: &[Plant], plan: SubscriptionPlan) -> Result<(), PlantLimitError> {
    can_create_plant(active_plant_count(plants), plan)
}

pub fn is_reactivation_transition(current_status: PlantStatus, requested_status: PlantStatus) -> bool {
    matches!(current_status, PlantStatus::Archived | PlantStatus::Ended) && requested_status == PlantStatus::Active
}

pub fn validate_reactivate_with_plants(plants: &[Plant], plant_id: Uuid, plan: SubscriptionPlan) -> Result<(), PlantLimitError> {
    let target = plants.iter().find(|plant| plant.plant_id == plant_id).ok_or(PlantLimitError::PlantNotFound)?;
    if !is_reactivation_transition(target.status, PlantStatus::Active) {
        return Ok(());
    }
    can_create_plant(active_plant_count(plants), plan)
}

pub fn subscription_status_summary(plants: &[Plant], plan: SubscriptionPlan) -> SubscriptionStatusSummary {
    let active = active_plant_count(plants);
    let ended = ended_plant_count(plants);
    let archived = archived_plant_count(plants);
    let inactive = inactive_plant_count(plants);
    let visible = visible_plant_count(plants);
    let limit = plan.plant_limit();
    let finite_limit = (limit != usize::MAX).then_some(limit);
    let over_limit_by = finite_limit.map(|value| active.saturating_sub(value)).unwrap_or(0);
    let remaining_slots = finite_limit.map(|value| value.saturating_sub(active));
    let can_create = finite_limit.map(|value| active < value).unwrap_or(true);

    SubscriptionStatusSummary {
        plan,
        plant_limit: finite_limit,
        active_plants: active,
        ended_plants: ended,
        archived_plants: archived,
        inactive_plants: inactive,
        visible_plants: visible,
        grandfathered_active_plants: over_limit_by,
        remaining_slots,
        over_limit_by,
        can_create,
        can_reactivate: can_create,
    }
}

pub fn enforce_downgrade(mut plants: Vec<Plant>, _plan: SubscriptionPlan) -> Vec<Plant> {
    for plant in &mut plants {
        plant.sync_legacy_flags();
    }
    plants
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Plant, PlantPhase};
    use chrono::Utc;

    fn plant(mins: i64) -> Plant {
        let t = Utc::now() + chrono::Duration::minutes(mins);
        Plant {
            plant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            name: "Test".into(),
            color_tag: "#0B3D2E".into(),
            start_date: t,
            phase: PlantPhase::Veg,
            phase_week: Some(1),
            status: PlantStatus::Active,
            is_active: true,
            archived: false,
            created_at: t,
            updated_at: t,
        }
    }

    #[test]
    fn free_limit_blocks_second_plant() {
        assert_eq!(can_create_plant(1, SubscriptionPlan::Free), Err(PlantLimitError::PlanLimitReached));
    }

    #[test]
    fn basic_allows_third_but_not_fourth() {
        assert!(can_create_plant(2, SubscriptionPlan::Basic).is_ok());
        assert!(can_create_plant(3, SubscriptionPlan::Basic).is_err());
    }

    #[test]
    fn summary_marks_grandfathered_over_limit() {
        let p1 = plant(1);
        let p2 = plant(2);
        let p3 = plant(3);
        let summary = subscription_status_summary(&vec![p1, p2, p3], SubscriptionPlan::Free);
        assert_eq!(summary.active_plants, 3);
        assert_eq!(summary.over_limit_by, 2);
        assert!(!summary.can_create);
        assert!(!summary.can_reactivate);
    }

    #[test]
    fn reactivation_is_blocked_when_limit_reached() {
        let active = plant(1);
        let mut archived = plant(2);
        archived.status = PlantStatus::Archived;
        archived.sync_legacy_flags();
        assert_eq!(validate_reactivate_with_plants(&vec![active, archived.clone()], archived.plant_id, SubscriptionPlan::Free), Err(PlantLimitError::PlanLimitReached));
    }

    #[test]
    fn downgrade_keeps_existing_active_plants() {
        let p1 = plant(1);
        let p2 = plant(2);
        let p3 = plant(3);
        let result = enforce_downgrade(vec![p1, p2, p3], SubscriptionPlan::Free);
        assert_eq!(result.iter().filter(|p| p.is_active_state()).count(), 3);
    }

    #[test]
    fn archived_plants_become_inactive() {
        let mut p1 = plant(1);
        p1.status = PlantStatus::Archived;
        p1.sync_legacy_flags();
        let result = enforce_downgrade(vec![p1], SubscriptionPlan::Free);
        assert!(!result[0].is_active);
    }

    #[test]
    fn summary_ignores_deleted_but_counts_ended_and_archived_as_inactive() {
        let active = plant(1);
        let mut ended = plant(2);
        ended.status = PlantStatus::Ended;
        ended.sync_legacy_flags();
        let mut archived = plant(3);
        archived.status = PlantStatus::Archived;
        archived.sync_legacy_flags();
        let mut deleted = plant(4);
        deleted.status = PlantStatus::Deleted;
        deleted.sync_legacy_flags();

        let summary = subscription_status_summary(&vec![active, ended, archived, deleted], SubscriptionPlan::Pro);
        assert_eq!(summary.active_plants, 1);
        assert_eq!(summary.ended_plants, 1);
        assert_eq!(summary.archived_plants, 1);
        assert_eq!(summary.inactive_plants, 2);
        assert_eq!(summary.visible_plants, 3);
    }

    #[test]
    fn reactivation_transition_helper_only_flags_ended_or_archived_to_active() {
        assert!(is_reactivation_transition(PlantStatus::Ended, PlantStatus::Active));
        assert!(is_reactivation_transition(PlantStatus::Archived, PlantStatus::Active));
        assert!(!is_reactivation_transition(PlantStatus::Active, PlantStatus::Active));
        assert!(!is_reactivation_transition(PlantStatus::Archived, PlantStatus::Ended));
    }

    #[test]
    fn empty_summary_uses_plan_limits() {
        let free = SubscriptionStatusSummary::empty_for_plan(SubscriptionPlan::Free);
        assert_eq!(free.plant_limit, Some(1));
        assert_eq!(free.remaining_slots, Some(1));
        assert!(free.can_create);

        let csc = SubscriptionStatusSummary::empty_for_plan(SubscriptionPlan::Csc);
        assert_eq!(csc.plant_limit, None);
        assert_eq!(csc.remaining_slots, None);
        assert!(csc.can_create);
    }
}
