// prompt/mod.rs
pub mod storage;
pub mod manager;

pub use storage::load_prompts;  // Remove save_prompt
pub use manager::{list_prompts, add_prompt, update_prompt, delete_prompt, Prompt, PromptTag};