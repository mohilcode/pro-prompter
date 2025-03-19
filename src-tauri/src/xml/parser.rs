use anyhow::{Context, Result};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use serde::{Deserialize, Serialize};

use crate::fs::reader::read_file;
use crate::fs::writer::write_file;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ChangeAction {
    Create,
    Rewrite,
    Modify,
    Delete,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Change {
    pub description: String,
    pub search: Option<String>,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileChange {
    pub path: String,
    pub action: ChangeAction,
    pub changes: Vec<Change>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChangeResult {
    pub path: String,
    pub action: ChangeAction,
    pub success: bool,
    pub message: Option<String>,
}

pub async fn parse_xml_diff(xml: &str) -> Result<Vec<FileChange>> {
  let mut reader = Reader::from_str(xml);
  reader.config_mut().trim_text_start = true;
  reader.config_mut().trim_text_end = true;

  let mut file_changes = Vec::new();
  let mut current_file: Option<FileChange> = None;
  let mut current_change: Option<Change> = None;

  let mut buf = Vec::new();
  // Remove unused variables and use underscore prefix for these state tracking variables
  let mut _in_plan = false;
  let mut _in_file = false;
  let mut in_change = false;
  let mut in_description = false;
  let mut in_search = false;
  let mut in_content = false;

  loop {
      match reader.read_event_into(&mut buf) {
          Ok(Event::Start(ref e)) => {
              match e.name().as_ref() {
                  b"Plan" => { _in_plan = true; },
                  b"file" => {
                      _in_file = true;

                      // Extract file attributes
                      let mut path = String::new();
                      let mut action = ChangeAction::Modify;

                      for attr in e.attributes() {
                          let attr = attr.context("Invalid XML attribute")?;
                          let key = std::str::from_utf8(attr.key.as_ref())
                              .context("Invalid UTF-8 in attribute key")?;
                          let value = attr.decode_and_unescape_value(reader.decoder())
                              .context("Failed to decode attribute value")?;

                          match key {
                              "path" => path = value.to_string(),
                              "action" => {
                                  action = match value.as_ref() {
                                      "create" => ChangeAction::Create,
                                      "rewrite" => ChangeAction::Rewrite,
                                      "modify" => ChangeAction::Modify,
                                      "delete" => ChangeAction::Delete,
                                      _ => anyhow::bail!("Invalid action: {}", value),
                                  };
                              },
                              _ => {}
                          }
                      }

                      current_file = Some(FileChange {
                          path,
                          action,
                          changes: Vec::new(),
                      });
                  },
                  b"change" => {
                      in_change = true;
                      current_change = Some(Change {
                          description: String::new(),
                          search: None,
                          content: String::new(),
                      });
                  },
                  b"description" => { in_description = true; },
                  b"search" => { in_search = true; },
                  b"content" => { in_content = true; },
                  _ => {}
              }
          },
          Ok(Event::End(ref e)) => {
              match e.name().as_ref() {
                  b"Plan" => { _in_plan = false; },
                  b"file" => {
                      _in_file = false;
                      if let Some(file_change) = current_file.take() {
                          file_changes.push(file_change);
                      }
                  },
                  b"change" => {
                      in_change = false;
                      if let (Some(ref mut file), Some(change)) = (&mut current_file, current_change.take()) {
                          file.changes.push(change);
                      }
                  },
                  b"description" => { in_description = false; },
                  b"search" => { in_search = false; },
                  b"content" => { in_content = false; },
                  _ => {}
              }
          },
          Ok(Event::Text(ref e)) => {
              let text = e.unescape().context("Failed to unescape XML text")?.to_string();

              if in_description && in_change {
                  if let Some(ref mut change) = current_change {
                      change.description = text;
                  }
              } else if in_search && in_change {
                  if let Some(ref mut change) = current_change {
                      if let Some(content) = extract_between_markers(&text) {
                          change.search = Some(content);
                      }
                  }
              } else if in_content && in_change {
                  if let Some(ref mut change) = current_change {
                      if let Some(content) = extract_between_markers(&text) {
                          change.content = content;
                      }
                  }
              }
          },
          Ok(Event::Eof) => break,
          Err(e) => anyhow::bail!("Error parsing XML: {}", e),
          _ => {}
      }

      buf.clear();
  }

  Ok(file_changes)
}

// The rest of the code remains unchanged
fn extract_between_markers(text: &str) -> Option<String> {
    let lines: Vec<&str> = text.lines().collect();

    let mut start_idx = None;
    let mut end_idx = None;

    for (i, line) in lines.iter().enumerate() {
        if line.trim() == "===" {
            if start_idx.is_none() {
                start_idx = Some(i);
            } else if end_idx.is_none() {
                end_idx = Some(i);
            }
        }
    }

    if let (Some(start), Some(end)) = (start_idx, end_idx) {
        if start + 1 < end {
            let content = lines[start+1..end].join("\n");
            return Some(content);
        }
    }

    Some(text.to_string())
}

pub async fn apply_changes(file_changes: &[FileChange]) -> Result<Vec<ChangeResult>> {
    let mut results = Vec::new();

    for file_change in file_changes {
        let result = apply_file_change(file_change).await;

        match result {
            Ok(_) => {
                results.push(ChangeResult {
                    path: file_change.path.clone(),
                    action: file_change.action.clone(),
                    success: true,
                    message: None,
                });
            },
            Err(e) => {
                results.push(ChangeResult {
                    path: file_change.path.clone(),
                    action: file_change.action.clone(),
                    success: false,
                    message: Some(format!("Error: {}", e)),
                });
            }
        }
    }

    Ok(results)
}

async fn apply_file_change(file_change: &FileChange) -> Result<()> {
    match file_change.action {
        ChangeAction::Create => {
            let content = &file_change.changes[0].content;
            write_file(&file_change.path, content).await?;
        },
        ChangeAction::Rewrite => {
            let content = &file_change.changes[0].content;
            write_file(&file_change.path, content).await?;
        },
        ChangeAction::Modify => {
            let original_content = read_file(&file_change.path).await?;
            let mut modified_content = original_content.clone();

            for change in &file_change.changes {
                if let Some(ref search) = change.search {
                    if !modified_content.contains(search) {
                        anyhow::bail!("Search text not found in file: {}", file_change.path);
                    }

                    modified_content = modified_content.replace(search, &change.content);
                } else {
                    anyhow::bail!("Modify action requires a search section");
                }
            }

            write_file(&file_change.path, &modified_content).await?;
        },
        ChangeAction::Delete => {
            tokio::fs::remove_file(&file_change.path)
                .await
                .with_context(|| format!("Failed to delete file: {}", file_change.path))?;
        }
    }

    Ok(())
}