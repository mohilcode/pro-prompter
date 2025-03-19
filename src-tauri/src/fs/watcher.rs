use anyhow::Result;
use notify::{Watcher, RecursiveMode};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct FileSystemWatcher {
    watcher: Option<notify::RecommendedWatcher>,
    paths: Arc<Mutex<Vec<String>>>,
}

impl FileSystemWatcher {
    pub fn new() -> Result<Self> {
        Ok(FileSystemWatcher {
            watcher: None,
            paths: Arc::new(Mutex::new(Vec::new())),
        })
    }

    pub fn start(&mut self, app_handle: AppHandle) -> Result<()> {
        let paths = Arc::clone(&self.paths);

        let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            match res {
                Ok(event) => {
                    // Filter for create/modify/delete events
                    if let notify::EventKind::Create(_) | notify::EventKind::Modify(_) | notify::EventKind::Remove(_) = event.kind {
                        // Get the path that changed
                        let path_str = event.paths.first().map(|p| p.to_string_lossy().to_string());

                        if let Some(path) = path_str {
                            // Emit an event that the frontend can listen for
                            let _ = app_handle.emit("file-system-change", path);
                        }
                    }
                },
                Err(e) => {
                    eprintln!("Watch error: {:?}", e);
                }
            }
        })?;

        // Watch all the registered paths
        let paths_guard = paths.lock().unwrap();
        for path in paths_guard.iter() {
            let _ = watcher.watch(Path::new(path), RecursiveMode::Recursive);
        }

        self.watcher = Some(watcher);

        Ok(())
    }

    pub fn add_path(&mut self, path: &str) -> Result<()> {
        let mut paths_guard = self.paths.lock().unwrap();

        // Check if path is already watched
        if !paths_guard.contains(&path.to_string()) {
            paths_guard.push(path.to_string());

            // If watcher is active, start watching the new path
            if let Some(watcher) = &mut self.watcher {
                watcher.watch(Path::new(path), RecursiveMode::Recursive)?;
            }
        }

        Ok(())
    }

    pub fn remove_path(&mut self, path: &str) -> Result<()> {
        let mut paths_guard = self.paths.lock().unwrap();

        // Remove the path from the list
        paths_guard.retain(|p| p != path);

        // If watcher is active, unwatch the path
        if let Some(watcher) = &mut self.watcher {
            watcher.unwatch(Path::new(path))?;
        }

        Ok(())
    }

    pub fn stop(&mut self) {
        self.watcher = None;
    }
}
