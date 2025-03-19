use anyhow::{Context, Result};
use serde_json;
use std::path::PathBuf;
use tokio::fs;

use super::Workspace;

// Get the path to the workspaces file
fn get_workspaces_file_path() -> Result<PathBuf> {
    let app_dir = directories::ProjectDirs::from("com", "repoprompt", "ProPrompter")
        .context("Failed to determine app directories")?
        .data_dir()
        .to_path_buf();

    let workspaces_dir = app_dir.join("workspaces");

    // Create workspaces directory if it doesn't exist
    if !workspaces_dir.exists() {
        std::fs::create_dir_all(&workspaces_dir)
            .context("Failed to create workspaces directory")?;
    }

    Ok(workspaces_dir.join("workspaces.json"))
}

// Load workspaces from storage
pub async fn load_workspaces() -> Result<Vec<Workspace>> {
    let file_path = get_workspaces_file_path()?;

    if !file_path.exists() {
        // Return empty list if file doesn't exist yet
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(file_path)
        .await
        .context("Failed to read workspaces file")?;

    let workspaces = serde_json::from_str(&content)
        .context("Failed to parse workspaces file")?;

    Ok(workspaces)
}

// Save workspaces to storage
pub async fn save_workspaces(workspaces: &[Workspace]) -> Result<()> {
    let file_path = get_workspaces_file_path()?;

    let content = serde_json::to_string_pretty(workspaces)
        .context("Failed to serialize workspaces")?;

    fs::write(file_path, content)
        .await
        .context("Failed to write workspaces file")?;

    Ok(())
}