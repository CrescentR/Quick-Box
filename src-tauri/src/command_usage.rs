use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandUsage {
    pub command_id: String,
    pub run_count: i64,
    pub last_run_at: Option<String>,
}
