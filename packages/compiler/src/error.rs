use crate::diagnostic::SourceRange;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CompileError {
    #[error("syntax error: {message}")]
    Syntax {
        message: String,
        range: Option<SourceRange>,
    },

    #[error("invalid structure: {message}")]
    InvalidStructure {
        message: String,
        range: Option<SourceRange>,
    },

    #[error("template error: {message}")]
    Template {
        message: String,
        range: Option<SourceRange>,
    },
}
