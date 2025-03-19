pub mod generator;
pub mod parser;

pub use generator::generate_xml_prompt;
pub use parser::{parse_xml_diff, apply_changes, FileChange, ChangeAction, ChangeResult};