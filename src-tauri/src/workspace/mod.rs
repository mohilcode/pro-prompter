use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

pub mod storage;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceFolder {
    pub id: String,
    pub path: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub folders: Vec<WorkspaceFolder>,
    pub created_at: i64,
    pub updated_at: i64,
}

// Create a new workspace
pub async fn create_workspace(name: &str) -> Result<Workspace> {
    let now = chrono::Utc::now().timestamp();

    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        folders: Vec::new(),
        created_at: now,
        updated_at: now,
    };

    let mut workspaces = storage::load_workspaces().await?;
    workspaces.push(workspace.clone());
    storage::save_workspaces(&workspaces).await?;

    Ok(workspace)
}

// Update an existing workspace
pub async fn update_workspace(id: &str, name: &str) -> Result<Workspace> {
    let mut workspaces = storage::load_workspaces().await?;

    let workspace_index = workspaces.iter().position(|w| w.id == id)
        .ok_or_else(|| anyhow::anyhow!("Workspace not found"))?;

    workspaces[workspace_index].name = name.to_string();
    workspaces[workspace_index].updated_at = chrono::Utc::now().timestamp();

    let updated_workspace = workspaces[workspace_index].clone();
    storage::save_workspaces(&workspaces).await?;

    Ok(updated_workspace)
}

// Delete a workspace
pub async fn delete_workspace(id: &str) -> Result<()> {
    let mut workspaces = storage::load_workspaces().await?;

    workspaces.retain(|w| w.id != id);
    storage::save_workspaces(&workspaces).await?;

    Ok(())
}

// Get all workspaces
pub async fn list_workspaces() -> Result<Vec<Workspace>> {
    storage::load_workspaces().await
}

// Get a single workspace by ID
pub async fn get_workspace(id: &str) -> Result<Workspace> {
    let workspaces = storage::load_workspaces().await?;

    let workspace = workspaces.iter()
        .find(|w| w.id == id)
        .ok_or_else(|| anyhow::anyhow!("Workspace not found"))?;

    Ok(workspace.clone())
}

// Add a folder to a workspace
pub async fn add_folder_to_workspace(workspace_id: &str, path: &str, name: Option<&str>) -> Result<WorkspaceFolder> {
    let path_obj = Path::new(path);

    if !path_obj.exists() {
        anyhow::bail!("Path does not exist: {}", path);
    }

    if !path_obj.is_dir() {
        anyhow::bail!("Path is not a directory: {}", path);
    }

    let folder_name = name.map(|n| n.to_string()).unwrap_or_else(|| {
        path_obj.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unnamed Folder".to_string())
    });

    let folder = WorkspaceFolder {
        id: Uuid::new_v4().to_string(),
        path: path.to_string(),
        name: folder_name,
    };

    let mut workspaces = storage::load_workspaces().await?;

    let workspace_index = workspaces.iter().position(|w| w.id == workspace_id)
        .ok_or_else(|| anyhow::anyhow!("Workspace not found"))?;

    workspaces[workspace_index].folders.push(folder.clone());
    workspaces[workspace_index].updated_at = chrono::Utc::now().timestamp();

    storage::save_workspaces(&workspaces).await?;

    Ok(folder)
}

// Remove a folder from a workspace
pub async fn remove_folder_from_workspace(workspace_id: &str, folder_id: &str) -> Result<()> {
    let mut workspaces = storage::load_workspaces().await?;

    let workspace_index = workspaces.iter().position(|w| w.id == workspace_id)
        .ok_or_else(|| anyhow::anyhow!("Workspace not found"))?;

    workspaces[workspace_index].folders.retain(|f| f.id != folder_id);
    workspaces[workspace_index].updated_at = chrono::Utc::now().timestamp();

    storage::save_workspaces(&workspaces).await?;

    Ok(())
}

// Update a folder in a workspace
pub async fn update_folder(workspace_id: &str, folder_id: &str, name: &str) -> Result<WorkspaceFolder> {
    let mut workspaces = storage::load_workspaces().await?;

    let workspace_index = workspaces.iter().position(|w| w.id == workspace_id)
        .ok_or_else(|| anyhow::anyhow!("Workspace not found"))?;

    let folder_index = workspaces[workspace_index].folders.iter().position(|f| f.id == folder_id)
        .ok_or_else(|| anyhow::anyhow!("Folder not found"))?;

    workspaces[workspace_index].folders[folder_index].name = name.to_string();
    workspaces[workspace_index].updated_at = chrono::Utc::now().timestamp();

    let updated_folder = workspaces[workspace_index].folders[folder_index].clone();

    storage::save_workspaces(&workspaces).await?;

    Ok(updated_folder)
}

// Get all files from all folders in a workspace
pub async fn get_all_files_in_workspace(workspace_id: &str, use_git_ignore: bool) -> Result<Vec<String>> {
    let workspace = get_workspace(workspace_id).await?;
    let mut all_files = Vec::new();

    for folder in workspace.folders {
        let file_tree = crate::fs::browser::scan_directory(&folder.path, use_git_ignore).await?;
        collect_file_paths(&file_tree, &mut all_files);
    }

    Ok(all_files)
}

// Helper function to collect all file paths from a file tree
fn collect_file_paths(item: &crate::fs::browser::FileItem, paths: &mut Vec<String>) {
    if matches!(item.file_type, crate::fs::browser::FileType::File) {
        paths.push(item.path.clone());
    }

    if let Some(children) = &item.children {
        for child in children {
            collect_file_paths(child, paths);
        }
    }
}