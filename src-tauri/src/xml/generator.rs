use anyhow::Result;
use std::path::Path;

use crate::fs::reader::read_file;

pub async fn generate_xml_prompt(file_paths: &[String], user_prompt: &str) -> Result<String> {
    let mut xml = String::new();

    // Start with file map (directory structure)
    xml.push_str("<file_map>\n");
    xml.push_str(&generate_file_tree(file_paths)?);
    xml.push_str("</file_map>\n\n");

    // Add file contents
    xml.push_str("<file_contents>\n");

    for path in file_paths {
        if Path::new(path).is_file() {
            let content = read_file(path).await?;
            let extension = Path::new(path).extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("");

            let lang_identifier = match extension {
                "js" => "javascript",
                "ts" => "typescript",
                "jsx" | "tsx" => "tsx",
                "py" => "python",
                "rs" => "rust",
                "go" => "go",
                "java" => "java",
                "cpp" | "c" | "h" => "cpp",
                _ => extension
            };

            xml.push_str(&format!("File: {}\n```{}\n{}\n```\n\n", path, lang_identifier, content));
        }
    }

    xml.push_str("</file_contents>\n\n");

    xml.push_str("<xml_formatting_instructions>\n");
    xml.push_str("</xml_formatting_instructions>\n\n");

    // Add user prompt
    xml.push_str("<user_instructions>\n");
    xml.push_str(user_prompt);
    xml.push_str("\n</user_instructions>\n");

    Ok(xml)
}

fn generate_file_tree(file_paths: &[String]) -> Result<String> {
    // This is a simplified placeholder version
    // A real implementation would build a proper tree structure
    let mut tree = String::new();

    for path in file_paths {
        tree.push_str(&format!("{}\n", path));
    }

    Ok(tree)
}

pub async fn generate_xml_prompt_for_workspace(workspace_id: &str, user_prompt: &str, use_git_ignore: bool) -> Result<String> {
  // Get all files in the workspace
  let file_paths = crate::workspace::get_all_files_in_workspace(workspace_id, use_git_ignore).await?;

  // Use the existing function with the file paths
  generate_xml_prompt(&file_paths, user_prompt).await
}
