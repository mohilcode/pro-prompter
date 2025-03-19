use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::storage::{load_prompts, save_prompts};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptTag {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<PromptTag>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub async fn list_prompts() -> Result<Vec<Prompt>> {
    load_prompts().await
}

pub async fn add_prompt(title: &str, content: &str, tags: Vec<PromptTag>) -> Result<Prompt> {
    let mut prompts = load_prompts().await?;

    let now = chrono::Utc::now().timestamp();

    let new_prompt = Prompt {
        id: Uuid::new_v4().to_string(),
        title: title.to_string(),
        content: content.to_string(),
        tags,
        created_at: now,
        updated_at: now,
    };

    prompts.push(new_prompt.clone());
    save_prompts(&prompts).await?;

    Ok(new_prompt)
}

pub async fn update_prompt(id: &str, title: Option<&str>, content: Option<&str>, tags: Option<Vec<PromptTag>>) -> Result<Prompt> {
    let mut prompts = load_prompts().await?;

    let prompt_index = prompts.iter().position(|p| p.id == id)
        .ok_or_else(|| anyhow::anyhow!("Prompt not found"))?;

    let now = chrono::Utc::now().timestamp();

    // Update the prompt
    if let Some(new_title) = title {
        prompts[prompt_index].title = new_title.to_string();
    }

    if let Some(new_content) = content {
        prompts[prompt_index].content = new_content.to_string();
    }

    if let Some(new_tags) = tags {
        prompts[prompt_index].tags = new_tags;
    }

    prompts[prompt_index].updated_at = now;

    let updated_prompt = prompts[prompt_index].clone();

    save_prompts(&prompts).await?;

    Ok(updated_prompt)
}

pub async fn delete_prompt(id: &str) -> Result<()> {
    let mut prompts = load_prompts().await?;

    prompts.retain(|p| p.id != id);

    save_prompts(&prompts).await?;

    Ok(())
}