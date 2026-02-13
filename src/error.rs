use thiserror::Error;

#[derive(Debug, Error)]
pub enum CompileError {
    #[error("syntax error: {0}")]
    Syntax(String),

    #[error("invalid structure: {0}")]
    InvalidStructure(String),

    #[error("template error: {0}")]
    Template(String),
}
