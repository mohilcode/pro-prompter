use anyhow::{Context, Result};
use ignore::Walk;
use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum FileType {
    File,
    Directory,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileItem {
    pub path: String,
    pub name: String,
    pub file_type: FileType,
    pub children: Option<Vec<FileItem>>,
    pub size: u64,
}

/// Scans a directory with optional filtering
pub async fn scan_directory(dir_path: &str, use_git_ignore: bool) -> Result<FileItem> {
    let path = Path::new(dir_path);

    if !path.exists() {
        anyhow::bail!("Directory does not exist: {}", dir_path);
    }

    if !path.is_dir() {
        anyhow::bail!("Path is not a directory: {}", dir_path);
    }

    let root_name = path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| {
            path.to_string_lossy().to_string()
        });

    let mut root = FileItem {
        path: path.to_string_lossy().to_string(),
        name: root_name,
        file_type: FileType::Directory,
        children: Some(Vec::new()),
        size: 0,
    };

    // Use different directory traversal based on whether to respect .gitignore
    if use_git_ignore {
        scan_with_gitignore(path, &mut root)?;
    } else {
        scan_without_gitignore(path, &mut root)?;
    }

    Ok(root)
}

// Implementation for scanning with .gitignore support
fn scan_with_gitignore(dir_path: &Path, parent: &mut FileItem) -> Result<()> {
    let children = parent.children.as_mut().unwrap();

    for entry in Walk::new(dir_path) {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();

        // Skip the root directory itself
        if path == dir_path {
            continue;
        }

        // Only process immediate children of the parent
        if path.parent() != Some(dir_path) {
            continue;
        }

        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        if path.is_dir() {
            let mut dir_item = FileItem {
                path: path.to_string_lossy().to_string(),
                name,
                file_type: FileType::Directory,
                children: Some(Vec::new()),
                size: 0,
            };

            // Recursively scan the subdirectory
            scan_with_gitignore(path, &mut dir_item)?;
            children.push(dir_item);
        } else {
            let size = std::fs::metadata(path)
                .map(|m| m.len())
                .unwrap_or(0);

            children.push(FileItem {
                path: path.to_string_lossy().to_string(),
                name,
                file_type: FileType::File,
                children: None,
                size,
            });
        }
    }

    // Sort children: directories first, then files, both alphabetically
    children.sort_by(|a, b| {
        match (&a.file_type, &b.file_type) {
            (FileType::Directory, FileType::File) => std::cmp::Ordering::Less,
            (FileType::File, FileType::Directory) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(())
}

// Implementation for scanning without .gitignore support
fn scan_without_gitignore(dir_path: &Path, parent: &mut FileItem) -> Result<()> {
  let children = parent.children.as_mut().unwrap();

  for entry in WalkDir::new(dir_path).max_depth(1).into_iter().skip(1) {
      let entry = entry.context("Failed to read directory entry")?;
      let path = entry.path();

      let name = path.file_name()
          .map(|n| n.to_string_lossy().to_string())
          .unwrap_or_default();

      if path.is_dir() {
          let mut dir_item = FileItem {
              path: path.to_string_lossy().to_string(),
              name,
              file_type: FileType::Directory,
              children: Some(Vec::new()),
              size: 0,
          };

          // Recursively scan the subdirectory
          scan_without_gitignore(path, &mut dir_item)?;
          children.push(dir_item);
      } else {
          let size = std::fs::metadata(path)
              .map(|m| m.len())
              .unwrap_or(0);

          children.push(FileItem {
              path: path.to_string_lossy().to_string(),
              name,
              file_type: FileType::File,
              children: None,
              size,
          });
      }
  }

  // Sort children: directories first, then files, both alphabetically
  children.sort_by(|a, b| {
      match (&a.file_type, &b.file_type) {
          (FileType::Directory, FileType::File) => std::cmp::Ordering::Less,
          (FileType::File, FileType::Directory) => std::cmp::Ordering::Greater,
          _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
      }
  });

  Ok(())
}