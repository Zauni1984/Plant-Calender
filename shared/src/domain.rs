use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuthMode {
    Anonymous,
    Email,
    Google,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionPlan {
    Free,
    Basic,
    Pro,
    Csc,
}

impl Default for SubscriptionPlan {
    fn default() -> Self {
        SubscriptionPlan::Free
    }
}

impl SubscriptionPlan {
    pub fn plant_limit(self) -> usize {
        match self {
            SubscriptionPlan::Free => 1,
            SubscriptionPlan::Basic => 3,
            SubscriptionPlan::Pro => 100,
            SubscriptionPlan::Csc => usize::MAX,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PlantStatus {
    Active,
    Ended,
    Archived,
    Deleted,
}

impl Default for PlantStatus {
    fn default() -> Self {
        PlantStatus::Active
    }
}

impl PlantStatus {
    pub fn is_counted_as_active(self) -> bool {
        matches!(self, PlantStatus::Active)
    }

    pub fn is_archived(self) -> bool {
        matches!(self, PlantStatus::Archived)
    }

    pub fn is_deleted(self) -> bool {
        matches!(self, PlantStatus::Deleted)
    }

    pub fn is_visible(self) -> bool {
        !self.is_deleted()
    }

    pub fn as_str(self) -> &'static str {
        match self {
            PlantStatus::Active => "active",
            PlantStatus::Ended => "ended",
            PlantStatus::Archived => "archived",
            PlantStatus::Deleted => "deleted",
        }
    }

    pub fn from_storage_value(value: &str, is_active: bool, archived: bool) -> Self {
        match value.trim().to_ascii_lowercase().as_str() {
            "ended" => PlantStatus::Ended,
            "archived" => PlantStatus::Archived,
            "deleted" => PlantStatus::Deleted,
            "active" => PlantStatus::Active,
            _ if archived => PlantStatus::Archived,
            _ if is_active => PlantStatus::Active,
            _ => PlantStatus::Ended,
        }
    }

    pub fn from_optional_storage_value(value: Option<&str>, is_active: bool, archived: bool) -> Self {
        match value {
            Some(value) if !value.trim().is_empty() => Self::from_storage_value(value, is_active, archived),
            _ => Self::from_storage_value("", is_active, archived),
        }
    }
}

pub fn resolve_requested_plant_status(
    current_status: PlantStatus,
    requested_status: Option<PlantStatus>,
    archived: Option<bool>,
    is_active: Option<bool>,
) -> PlantStatus {
    if let Some(status) = requested_status {
        return status;
    }
    if let Some(true) = archived {
        return PlantStatus::Archived;
    }
    if current_status == PlantStatus::Archived && archived == Some(false) {
        return PlantStatus::Active;
    }
    if let Some(true) = is_active {
        return PlantStatus::Active;
    }
    current_status
}

pub fn outbound_requested_plant_status(
    requested_status: Option<PlantStatus>,
    archived: Option<bool>,
    is_active: Option<bool>,
) -> Option<PlantStatus> {
    requested_status
        .or_else(|| archived.and_then(|value| value.then_some(PlantStatus::Archived)))
        .or_else(|| is_active.and_then(|value| value.then_some(PlantStatus::Active)))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionStatusSummary {
    #[serde(default)]
    pub plan: SubscriptionPlan,
    #[serde(default)]
    pub plant_limit: Option<usize>,
    #[serde(default)]
    pub active_plants: usize,
    #[serde(default)]
    pub ended_plants: usize,
    #[serde(default)]
    pub archived_plants: usize,
    #[serde(default)]
    pub inactive_plants: usize,
    #[serde(default)]
    pub visible_plants: usize,
    #[serde(default)]
    pub grandfathered_active_plants: usize,
    #[serde(default)]
    pub remaining_slots: Option<usize>,
    #[serde(default)]
    pub over_limit_by: usize,
    #[serde(default = "default_true")]
    pub can_create: bool,
    #[serde(default = "default_true")]
    pub can_reactivate: bool,
}

fn default_true() -> bool {
    true
}

impl SubscriptionStatusSummary {
    pub fn has_finite_limit(&self) -> bool {
        self.plant_limit.is_some()
    }

    pub fn is_over_limit(&self) -> bool {
        self.over_limit_by > 0
    }
    pub fn empty_for_plan(plan: SubscriptionPlan) -> Self {
        let finite_limit = (plan.plant_limit() != usize::MAX).then_some(plan.plant_limit());
        Self {
            plan,
            plant_limit: finite_limit,
            active_plants: 0,
            ended_plants: 0,
            archived_plants: 0,
            inactive_plants: 0,
            visible_plants: 0,
            grandfathered_active_plants: 0,
            remaining_slots: finite_limit,
            over_limit_by: 0,
            can_create: true,
            can_reactivate: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UserProfile {
    pub user_id: Uuid,
    pub auth_mode: AuthMode,
    pub adult_confirmed: bool,
    #[validate(length(min = 2, max = 16))]
    pub locale: String,
    #[validate(length(min = 2, max = 64))]
    pub timezone: String,
    pub plan: SubscriptionPlan,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PlantPhase {
    Seed,
    Veg,
    Flower,
    Harvest,
    Dry,
    Cure,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct Plant {
    pub plant_id: Uuid,
    pub user_id: Uuid,
    #[validate(length(min = 1, max = 120))]
    pub name: String,
    #[validate(length(min = 4, max = 16))]
    pub color_tag: String,
    pub start_date: DateTime<Utc>,
    pub phase: PlantPhase,
    pub phase_week: Option<i32>,
    #[serde(default)]
    pub status: PlantStatus,
    #[serde(default)]
    pub is_active: bool,
    #[serde(default)]
    pub archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Plant {
    pub fn normalize_status_from_legacy_flags(&mut self) {
        self.status = match self.status {
            PlantStatus::Deleted | PlantStatus::Archived | PlantStatus::Ended => self.status,
            PlantStatus::Active if self.archived => PlantStatus::Archived,
            PlantStatus::Active if !self.is_active => PlantStatus::Ended,
            PlantStatus::Active => PlantStatus::Active,
        };
    }

    pub fn sync_legacy_flags(&mut self) {
        self.is_active = self.status.is_counted_as_active();
        self.archived = self.status.is_archived();
    }

    pub fn normalize_in_place(&mut self) {
        self.normalize_status_from_legacy_flags();
        self.sync_legacy_flags();
    }

    pub fn normalized(mut self) -> Self {
        self.normalize_in_place();
        self
    }

    pub fn into_sync_ready(mut self) -> Self {
        self.normalize_in_place();
        self
    }

    pub fn normalized_ref(&self) -> Self {
        self.clone().normalized()
    }

    pub fn status_key(&self) -> &'static str {
        self.status.as_str()
    }

    pub fn is_active_state(&self) -> bool {
        self.status.is_counted_as_active()
    }

    pub fn is_archived_state(&self) -> bool {
        self.status.is_archived()
    }

    pub fn is_deleted_state(&self) -> bool {
        self.status.is_deleted()
    }

    pub fn is_ended_state(&self) -> bool {
        matches!(self.status, PlantStatus::Ended)
    }

    pub fn is_inactive_state(&self) -> bool {
        self.is_ended_state() || self.is_archived_state()
    }

    pub fn is_visible_state(&self) -> bool {
        self.status.is_visible()
    }
}


pub fn normalize_plants(plants: Vec<Plant>) -> Vec<Plant> {
    plants.into_iter().map(Plant::into_sync_ready).collect()
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskCategory {
    Water,
    Feed,
    Check,
    Train,
    Note,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Open,
    Done,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct Task {
    pub task_id: Uuid,
    pub plant_id: Uuid,
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    pub category: TaskCategory,
    pub due_at: DateTime<Utc>,
    pub repeat_interval_hours: Option<i32>,
    pub notification_enabled: bool,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Metrics {
    pub ph: Option<f32>,
    pub ec: Option<f32>,
    pub temp_c: Option<f32>,
    pub rh: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActionInfo {
    pub action_type: Option<String>,
    pub amount_ml: Option<i32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LogType {
    Note,
    Measurement,
    Photo,
    Action,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub log_id: Uuid,
    pub plant_id: Uuid,
    pub log_type: LogType,
    pub text: Option<String>,
    pub metrics: Option<Metrics>,
    pub action: Option<ActionInfo>,
    pub photo_refs: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
}


#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_plant(status: PlantStatus) -> Plant {
        let now = Utc::now();
        Plant {
            plant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            name: "Sample".into(),
            color_tag: "#0B3D2E".into(),
            start_date: now,
            phase: PlantPhase::Veg,
            phase_week: Some(1),
            status,
            is_active: false,
            archived: false,
            created_at: now,
            updated_at: now,
        }
    }

    #[test]
    fn storage_value_parsing_prefers_explicit_status_over_legacy_flags() {
        assert_eq!(PlantStatus::from_storage_value("ended", true, true), PlantStatus::Ended);
        assert_eq!(PlantStatus::from_storage_value("archived", true, false), PlantStatus::Archived);
        assert_eq!(PlantStatus::from_storage_value("deleted", true, true), PlantStatus::Deleted);
        assert_eq!(PlantStatus::from_storage_value("active", false, true), PlantStatus::Active);
    }

    #[test]
    fn optional_storage_value_falls_back_to_legacy_flags() {
        assert_eq!(PlantStatus::from_optional_storage_value(None, true, false), PlantStatus::Active);
        assert_eq!(PlantStatus::from_optional_storage_value(None, false, true), PlantStatus::Archived);
        assert_eq!(PlantStatus::from_optional_storage_value(Some(""), false, false), PlantStatus::Ended);
    }

    #[test]
    fn resolve_requested_status_handles_legacy_archive_toggle() {
        assert_eq!(
            resolve_requested_plant_status(PlantStatus::Archived, None, Some(false), None),
            PlantStatus::Active
        );
        assert_eq!(
            resolve_requested_plant_status(PlantStatus::Ended, None, Some(true), None),
            PlantStatus::Archived
        );
        assert_eq!(
            resolve_requested_plant_status(PlantStatus::Ended, None, None, Some(true)),
            PlantStatus::Active
        );
    }

    #[test]
    fn outbound_requested_status_prefers_explicit_status() {
        assert_eq!(
            outbound_requested_plant_status(Some(PlantStatus::Ended), Some(true), Some(true)),
            Some(PlantStatus::Ended)
        );
        assert_eq!(
            outbound_requested_plant_status(None, Some(true), None),
            Some(PlantStatus::Archived)
        );
        assert_eq!(
            outbound_requested_plant_status(None, None, Some(true)),
            Some(PlantStatus::Active)
        );
        assert_eq!(outbound_requested_plant_status(None, Some(false), Some(false)), None);
    }

    #[test]
    fn plant_normalization_keeps_legacy_flags_in_sync_with_status() {
        let plant = sample_plant(PlantStatus::Archived).normalized();
        assert!(!plant.is_active);
        assert!(plant.archived);

        let plant = sample_plant(PlantStatus::Active).normalized();
        assert!(plant.is_active);
        assert!(!plant.archived);
    }


    #[test]
    fn plant_normalization_backfills_archived_status_from_legacy_flags() {
        let mut plant = sample_plant(PlantStatus::Active);
        plant.is_active = false;
        plant.archived = true;
        let plant = plant.normalized();
        assert_eq!(plant.status, PlantStatus::Archived);
        assert!(!plant.is_active);
        assert!(plant.archived);
    }

    #[test]
    fn plant_normalization_backfills_ended_status_from_legacy_flags() {
        let mut plant = sample_plant(PlantStatus::Active);
        plant.is_active = false;
        plant.archived = false;
        let plant = plant.normalized();
        assert_eq!(plant.status, PlantStatus::Ended);
        assert!(!plant.is_active);
        assert!(!plant.archived);
    }

    #[test]
    fn empty_summary_helpers_are_consistent() {
        let free = SubscriptionStatusSummary::empty_for_plan(SubscriptionPlan::Free);
        assert!(free.has_finite_limit());
        assert!(!free.is_over_limit());

        let csc = SubscriptionStatusSummary::empty_for_plan(SubscriptionPlan::Csc);
        assert!(!csc.has_finite_limit());
        assert!(!csc.is_over_limit());
    }

    #[test]
    fn normalize_plants_returns_sync_ready_status_first_plants() {
        let mut plant = sample_plant(PlantStatus::Deleted);
        plant.is_active = true;
        plant.archived = true;
        let normalized = normalize_plants(vec![plant]);
        assert_eq!(normalized.len(), 1);
        assert_eq!(normalized[0].status, PlantStatus::Deleted);
        assert!(!normalized[0].is_active);
        assert!(!normalized[0].archived);
    }
}
