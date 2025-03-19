use anyhow::Result;
use tauri_plugin_clipboard_manager::ClipboardExt;

pub fn copy_to_clipboard(content: &str, app_handle: &tauri::AppHandle) -> Result<()> {
    app_handle.clipboard().write_text(content)
        .map_err(|e| anyhow::anyhow!("Failed to write to clipboard: {}", e))?;
    Ok(())
}

pub fn get_from_clipboard(app_handle: &tauri::AppHandle) -> Result<String> {
    let content = app_handle.clipboard().read_text()
        .map_err(|e| anyhow::anyhow!("Failed to read from clipboard: {}", e))?;
    Ok(content)
}