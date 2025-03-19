use anyhow::{Context, Result};
use memmap2::Mmap;
use std::fs::File;
use std::path::Path;

/// Reads a file with memory mapping for large files
pub async fn read_file(path: &str) -> Result<String> {
    let path = Path::new(path);

    if !path.exists() {
        anyhow::bail!("File does not exist: {}", path.display());
    }

    if !path.is_file() {
        anyhow::bail!("Path is not a file: {}", path.display());
    }

    let file = File::open(path)
        .with_context(|| format!("Failed to open file: {}", path.display()))?;

    let file_size = file.metadata()?.len() as usize;

    // Use memory mapping for large files
    if file_size > 1_048_576 { // 1 MB threshold
        let mmap = unsafe { Mmap::map(&file)? };

        // Try to convert to UTF-8, or provide bytes as fallback
        match std::str::from_utf8(&mmap[..]) {
            Ok(s) => Ok(s.to_string()),
            Err(_) => {
                // If not valid UTF-8, try lossy conversion
                Ok(String::from_utf8_lossy(&mmap[..]).to_string())
            }
        }
    } else {
        // For smaller files, use standard reading
        tokio::fs::read_to_string(path)
            .await
            .with_context(|| format!("Failed to read file: {}", path.display()))
    }
}