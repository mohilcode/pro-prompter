use anyhow::{Context, Result};
use serde_json;
use std::path::PathBuf;
use tokio::fs;

use super::manager::Prompt;

fn get_prompts_file_path() -> Result<PathBuf> {
    let app_dir = directories::ProjectDirs::from("com", "mohilcode", "proprompter")
        .context("Failed to determine app directories")?
        .data_dir()
        .to_path_buf();

    let prompts_dir = app_dir.join("prompts");

    // Create prompts directory if it doesn't exist
    if !prompts_dir.exists() {
        std::fs::create_dir_all(&prompts_dir)
            .context("Failed to create prompts directory")?;
    }

    Ok(prompts_dir.join("prompts.json"))
}

pub async fn load_prompts() -> Result<Vec<Prompt>> {
    let file_path = get_prompts_file_path()?;

    if !file_path.exists() {
        // Return empty list if file doesn't exist yet
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(file_path)
        .await
        .context("Failed to read prompts file")?;

    let prompts = serde_json::from_str(&content)
        .context("Failed to parse prompts file")?;

    Ok(prompts)
}

pub async fn save_prompts(prompts: &[Prompt]) -> Result<()> {
    let file_path = get_prompts_file_path()?;

    let content = serde_json::to_string_pretty(prompts)
        .context("Failed to serialize prompts")?;

    fs::write(file_path, content)
        .await
        .context("Failed to write prompts file")?;

    Ok(())
}