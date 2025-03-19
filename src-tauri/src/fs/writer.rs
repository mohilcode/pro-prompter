use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// Writes content to a file, creating parent directories if needed
pub async fn write_file(path: &str, content: &str) -> Result<()> {
    let path = Path::new(path);

    // Create parent directories if they don't exist
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            tokio::fs::create_dir_all(parent)
                .await
                .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
        }
    }

    tokio::fs::write(path, content)
        .await
        .with_context(|| format!("Failed to write to file: {}", path.display()))?;

    Ok(())
}

/// Creates a backup of a file before modifying it
pub async fn create_backup(path: &str) -> Result<PathBuf> {
    let source_path = Path::new(path);

    if !source_path.exists() {
        anyhow::bail!("File does not exist: {}", path);
    }

    // Create a backup directory if it doesn't exist
    let app_dir = directories::ProjectDirs::from("com", "repoprompt", "ProPrompter")
        .context("Failed to determine app directories")?
        .data_dir()
        .to_path_buf();

    let backup_dir = app_dir.join("backups");

    if !backup_dir.exists() {
        tokio::fs::create_dir_all(&backup_dir)
            .await
            .context("Failed to create backup directory")?;
    }

    // Generate a unique backup filename
    let uuid = Uuid::new_v4();
    let file_name = source_path.file_name()
        .context("Failed to get file name")?
        .to_string_lossy();

    let backup_path = backup_dir.join(format!("{}-{}", uuid, file_name));

    // Copy the file to the backup location
    tokio::fs::copy(source_path, &backup_path)
        .await
        .with_context(|| format!("Failed to create backup of {}", path))?;

    Ok(backup_path)
}

/// Restores a file from backup
pub async fn restore_from_backup(backup_path: &Path, destination_path: &str) -> Result<()> {
    let dest_path = Path::new(destination_path);

    if !backup_path.exists() {
        anyhow::bail!("Backup file does not exist: {}", backup_path.display());
    }

    // Copy the backup back to the original location
    tokio::fs::copy(backup_path, dest_path)
        .await
        .with_context(|| format!("Failed to restore backup to {}", destination_path))?;

    Ok(())
}