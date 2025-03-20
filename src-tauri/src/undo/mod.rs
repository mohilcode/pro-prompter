use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::fs::writer::{create_backup, restore_from_backup};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupFile {
    pub original_path: String,
    pub backup_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChangeSet {
    pub id: String,
    pub backups: Vec<BackupFile>,
    pub timestamp: i64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct UndoHistory {
    change_sets: Vec<ChangeSet>,
}

async fn load_undo_history() -> Result<UndoHistory> {
    let file_path = get_undo_history_path()?;

    if !file_path.exists() {
        // Return empty history if file doesn't exist yet
        return Ok(UndoHistory {
            change_sets: Vec::new(),
        });
    }

    let content = tokio::fs::read_to_string(file_path)
        .await
        .context("Failed to read undo history file")?;

    let history = serde_json::from_str(&content)
        .context("Failed to parse undo history file")?;

    Ok(history)
}

fn get_undo_history_path() -> Result<PathBuf> {
    let app_dir = directories::ProjectDirs::from("com", "mohilcode", "proprompter")
        .context("Failed to determine app directories")?
        .data_dir()
        .to_path_buf();

    let history_dir = app_dir.join("history");

    // Create history directory if it doesn't exist
    if !history_dir.exists() {
        std::fs::create_dir_all(&history_dir)
            .context("Failed to create history directory")?;
    }

    Ok(history_dir.join("undo_history.json"))
}

pub async fn create_change_set(description: &str) -> Result<ChangeSet> {
    let change_set = ChangeSet {
        id: Uuid::new_v4().to_string(),
        backups: Vec::new(),
        timestamp: chrono::Utc::now().timestamp(),
        description: description.to_string(),
    };

    Ok(change_set)
}

pub async fn add_to_change_set(change_set: &mut ChangeSet, path: &str) -> Result<()> {
    let path_obj = Path::new(path);

    if !path_obj.exists() {
        anyhow::bail!("File does not exist: {}", path);
    }

    // Skip if this file is already backed up in this change set
    if change_set.backups.iter().any(|b| b.original_path == path) {
        return Ok(());
    }

    // Create backup
    let backup_path = create_backup(path).await?;

    // Add to change set
    change_set.backups.push(BackupFile {
        original_path: path.to_string(),
        backup_path: backup_path.to_string_lossy().to_string(),
    });

    Ok(())
}

pub async fn save_change_set(change_set: &ChangeSet) -> Result<()> {
    // Skip empty change sets
    if change_set.backups.is_empty() {
        return Ok(());
    }

    let mut history = load_undo_history().await?;

    // Add to history
    history.change_sets.push(change_set.clone());

    // Save history
    save_undo_history(&history).await?;

    Ok(())
}

async fn save_undo_history(history: &UndoHistory) -> Result<()> {
    let file_path = get_undo_history_path()?;

    let content = serde_json::to_string_pretty(history)
        .context("Failed to serialize undo history")?;

    tokio::fs::write(file_path, content)
        .await
        .context("Failed to write undo history file")?;

    Ok(())
}

pub async fn undo_last_change() -> Result<Option<String>> {
    let mut history = load_undo_history().await?;

    if history.change_sets.is_empty() {
        return Ok(None);
    }

    let last_change = history.change_sets.pop()
        .context("Failed to get last change set")?;

    for backup in &last_change.backups {
        restore_from_backup(Path::new(&backup.backup_path), &backup.original_path).await?;
    }

    // Update history
    save_undo_history(&history).await?;

    Ok(Some(last_change.description))
}

// Add this function to undo/mod.rs

// Undo changes for a specific file
pub async fn undo_file_change(file_path: &str) -> Result<bool> {
  let history = load_undo_history().await?;

  // Find the most recent change set that includes this file
  for i in (0..history.change_sets.len()).rev() {
      let change_set = &history.change_sets[i];

      if let Some(backup) = change_set.backups.iter().find(|b| b.original_path == file_path) {
          // Restore just this file
          restore_from_backup(Path::new(&backup.backup_path), file_path).await?;

          // We could update the change set to indicate this file was undone
          // but for simplicity, we'll leave the history as is

          return Ok(true);
      }
  }

  Ok(false) // No backup found for this file
}