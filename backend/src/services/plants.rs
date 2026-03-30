use chrono::Utc;
use shared::{
    can_create_plant, enforce_downgrade, subscription_status_summary, validate_create_with_plants,
    validate_reactivate_with_plants, Plant, PlantLimitError, PlantPhase, PlantStatus, SubscriptionPlan,
    SubscriptionStatusSummary,
};
use uuid::Uuid;

pub fn build_plant(user_id: Uuid, name: String, color_tag: String, phase: PlantPhase) -> Plant {
    let now = Utc::now();
    Plant {
        plant_id: Uuid::new_v4(),
        user_id,
        name,
        color_tag,
        start_date: now,
        phase,
        phase_week: Some(1),
        status: PlantStatus::Active,
        is_active: true,
        archived: false,
        created_at: now,
        updated_at: now,
    }
    .normalized()
}

pub fn validate_create(active_count: usize, plan: SubscriptionPlan) -> Result<(), PlantLimitError> {
    can_create_plant(active_count, plan)
}

pub fn validate_create_from_plants(plants: &[Plant], plan: SubscriptionPlan) -> Result<(), PlantLimitError> {
    validate_create_with_plants(plants, plan)
}

pub fn validate_reactivate_from_plants(plants: &[Plant], plant_id: Uuid, plan: SubscriptionPlan) -> Result<(), PlantLimitError> {
    validate_reactivate_with_plants(plants, plant_id, plan)
}

pub fn summarize_subscription(plants: &[Plant], plan: SubscriptionPlan) -> SubscriptionStatusSummary {
    subscription_status_summary(plants, plan)
}

pub fn apply_downgrade(plants: Vec<Plant>, plan: SubscriptionPlan) -> Vec<Plant> {
    enforce_downgrade(plants, plan)
}


#[cfg(test)]
mod tests {
    use super::*;

    fn make_plant(status: PlantStatus) -> Plant {
        let mut plant = build_plant(Uuid::new_v4(), "Alpha".into(), "#0B3D2E".into(), PlantPhase::Veg);
        plant.status = status;
        plant.normalize_in_place();
        plant
    }

    #[test]
    fn build_plant_creates_active_normalized_plant() {
        let plant = build_plant(Uuid::new_v4(), "Alpha".into(), "#0B3D2E".into(), PlantPhase::Veg);
        assert_eq!(plant.status, PlantStatus::Active);
        assert!(plant.is_active_state());
        assert!(!plant.is_archived_state());
    }

    #[test]
    fn summarize_subscription_counts_active_and_inactive_states() {
        let active = make_plant(PlantStatus::Active);
        let ended = make_plant(PlantStatus::Ended);
        let archived = make_plant(PlantStatus::Archived);
        let deleted = make_plant(PlantStatus::Deleted);
        let summary = summarize_subscription(&[active, ended, archived, deleted], SubscriptionPlan::Basic);
        assert_eq!(summary.active_plants, 1);
        assert_eq!(summary.ended_plants, 1);
        assert_eq!(summary.archived_plants, 1);
        assert_eq!(summary.inactive_plants, 2);
        assert_eq!(summary.visible_plants, 3);
    }

    #[test]
    fn validate_reactivate_from_plants_blocks_when_limit_is_full() {
        let active = make_plant(PlantStatus::Active);
        let archived = make_plant(PlantStatus::Archived);
        let result = validate_reactivate_from_plants(&[active, archived.clone()], archived.plant_id, SubscriptionPlan::Free);
        assert_eq!(result, Err(PlantLimitError::PlanLimitReached));
    }
}
