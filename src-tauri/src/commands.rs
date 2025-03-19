use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, command};

use crate::clipboard;
use crate::fs::browser::{self, FileItem};
use crate::fs::reader;
use crate::prompt::manager::{self, Prompt, PromptTag};
use crate::xml::generator;
use crate::xml::parser::{self, FileChange, ChangeResult};
use crate::undo;
use crate::workspace;

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryScanOptions {
    pub use_git_ignore: bool,
    pub include_patterns: Option<Vec<String>>,
    pub exclude_patterns: Option<Vec<String>>,
}

#[command]
pub async fn scan_directory(path: String, options: Option<DirectoryScanOptions>) -> Result<FileItem, String> {
    let use_git_ignore = options.as_ref().map_or(true, |o| o.use_git_ignore);

    browser::scan_directory(&path, use_git_ignore)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    reader::read_file(&path)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_prompts() -> Result<Vec<Prompt>, String> {
    manager::list_prompts()
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn save_prompt(title: String, content: String, tags: Vec<PromptTag>) -> Result<Prompt, String> {
    manager::add_prompt(&title, &content, tags)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn delete_prompt(id: String) -> Result<(), String> {
    manager::delete_prompt(&id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn generate_copy_content(files: Vec<String>, prompts: Vec<String>) -> Result<String, String> {
    let mut content = String::new();

    // Add file contents with clear headers
    for file_path in &files {
        let file_content = reader::read_file(file_path)
            .await
            .map_err(|e| e.to_string())?;

        content.push_str(&format!("File: {}\n```\n{}\n```\n\n", file_path, file_content));
    }

    // Add prompts
    if !prompts.is_empty() {
        content.push_str("===== Prompts =====\n\n");

        for prompt in &prompts {
            content.push_str(&format!("{}\n\n", prompt));
        }
    }

    Ok(content)
}

#[command]
pub fn copy_to_clipboard(app_handle: AppHandle, content: String) -> Result<(), String> {
    clipboard::copy_to_clipboard(&content, &app_handle)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn generate_xml_prompt(files: Vec<String>, prompt: String) -> Result<String, String> {
    generator::generate_xml_prompt(&files, &prompt)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn generate_xml_prompt_for_workspace(workspace_id: String, prompt: String, use_git_ignore: bool) -> Result<String, String> {
    generator::generate_xml_prompt_for_workspace(&workspace_id, &prompt, use_git_ignore)
        .await
        .map_err(|e| e.to_string())
}


#[command]
pub async fn parse_xml_response(xml: String) -> Result<Vec<FileChange>, String> {
    parser::parse_xml_diff(&xml)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn apply_xml_changes(changes: Vec<FileChange>) -> Result<Vec<ChangeResult>, String> {
    // Create a change set for undo
    let mut change_set = undo::create_change_set("Applied XML changes")
        .await
        .map_err(|e| e.to_string())?;

    // Backup files before changing them
    for file_change in &changes {
        if file_change.action != parser::ChangeAction::Create {
            undo::add_to_change_set(&mut change_set, &file_change.path)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    // Apply changes
    let results = parser::apply_changes(&changes)
        .await
        .map_err(|e| e.to_string())?;

    // Save change set for undo
    undo::save_change_set(&change_set)
        .await
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[command]
pub async fn undo_last_change() -> Result<Option<String>, String> {
    undo::undo_last_change()
        .await
        .map_err(|e| e.to_string())
}

// Add selective undo command
#[command]
pub async fn undo_file_change(file_path: String) -> Result<bool, String> {
    crate::undo::undo_file_change(&file_path)
        .await
        .map_err(|e| e.to_string())
}

// Add workspace commands
#[command]
pub async fn list_workspaces() -> Result<Vec<workspace::Workspace>, String> {
    workspace::list_workspaces()
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn create_workspace(name: String) -> Result<workspace::Workspace, String> {
    workspace::create_workspace(&name)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_workspace(id: String, name: String) -> Result<workspace::Workspace, String> {
    workspace::update_workspace(&id, &name)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn delete_workspace(id: String) -> Result<(), String> {
    workspace::delete_workspace(&id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_workspace(id: String) -> Result<workspace::Workspace, String> {
    workspace::get_workspace(&id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn add_folder_to_workspace(workspace_id: String, path: String, name: Option<String>) -> Result<workspace::WorkspaceFolder, String> {
    workspace::add_folder_to_workspace(&workspace_id, &path, name.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn remove_folder_from_workspace(workspace_id: String, folder_id: String) -> Result<(), String> {
    workspace::remove_folder_from_workspace(&workspace_id, &folder_id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_folder(workspace_id: String, folder_id: String, name: String) -> Result<workspace::WorkspaceFolder, String> {
    workspace::update_folder(&workspace_id, &folder_id, &name)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_all_files_in_workspace(workspace_id: String, use_git_ignore: bool) -> Result<Vec<String>, String> {
    workspace::get_all_files_in_workspace(&workspace_id, use_git_ignore)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub fn start_watching_filesystem(app_handle: AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut fs_watcher = state.fs_watcher.lock().unwrap();
    fs_watcher.start(app_handle)
        .map_err(|e| e.to_string())
}

#[command]
pub fn watch_path(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut fs_watcher = state.fs_watcher.lock().unwrap();
    fs_watcher.add_path(&path)
        .map_err(|e| e.to_string())
}

#[command]
pub fn unwatch_path(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut fs_watcher = state.fs_watcher.lock().unwrap();
    fs_watcher.remove_path(&path)
        .map_err(|e| e.to_string())
}

#[command]
pub fn stop_watching_filesystem(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut fs_watcher = state.fs_watcher.lock().unwrap();
    fs_watcher.stop();
    Ok(())
}