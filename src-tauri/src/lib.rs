pub mod fs;
pub mod prompt;
pub mod xml;
pub mod clipboard;
pub mod undo;
pub mod commands;
pub mod workspace;

use commands::*;
use std::sync::Mutex;

// Add this struct for state management
pub struct AppState {
    fs_watcher: Mutex<fs::watcher::FileSystemWatcher>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the file system watcher
    let fs_watcher = fs::watcher::FileSystemWatcher::new()
        .expect("Failed to create file system watcher");

    let state = AppState {
        fs_watcher: Mutex::new(fs_watcher),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)  // Add state management
        .invoke_handler(tauri::generate_handler![
            // File system commands
            scan_directory,
            read_file_content,

            // Prompt commands
            get_prompts,
            save_prompt,
            delete_prompt,

            // Copy mode commands
            generate_copy_content,
            copy_to_clipboard,

            // XML mode commands
            generate_xml_prompt,
            generate_xml_prompt_for_workspace, // Add this command
            parse_xml_response,
            apply_xml_changes,

            // Undo commands
            undo_last_change,
            undo_file_change,

            // Workspace commands
            list_workspaces,
            create_workspace,
            update_workspace,
            delete_workspace,
            get_workspace,
            add_folder_to_workspace,
            remove_folder_from_workspace,
            update_folder,
            get_all_files_in_workspace,

            // File system watching commands
            start_watching_filesystem,
            watch_path,
            unwatch_path,
            stop_watching_filesystem,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}