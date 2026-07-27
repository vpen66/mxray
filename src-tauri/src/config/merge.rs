use json_patch::patch;
use serde_json::Value;

pub struct ConfigMerger;

impl ConfigMerger {
    /// Apply RFC 6902 JSON Patch string to Xray config Value
    pub fn apply_patch(base_config: &mut Value, patch_json_str: &str) -> anyhow::Result<()> {
        if patch_json_str.trim().is_empty() {
            return Ok(());
        }

        let patch_val: json_patch::Patch = serde_json::from_str(patch_json_str)?;
        patch(base_config, &patch_val)?;
        Ok(())
    }
}
