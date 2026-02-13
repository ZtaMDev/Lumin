use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum DiagnosticSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SourceRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LineCol {
    pub line: usize,
    pub col: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub message: String,
    pub range: SourceRange,
    pub start: LineCol,
    pub end: LineCol,
}

pub fn compute_line_starts(source: &str) -> Vec<usize> {
    let mut starts = vec![0usize];
    for (i, b) in source.bytes().enumerate() {
        if b == b'\n' {
            starts.push(i + 1);
        }
    }
    starts
}

pub fn offset_to_line_col(line_starts: &[usize], offset: usize) -> LineCol {
    // binary search greatest start <= offset
    let idx = match line_starts.binary_search(&offset) {
        Ok(i) => i,
        Err(i) => i.saturating_sub(1),
    };
    let line_start = line_starts.get(idx).copied().unwrap_or(0);
    LineCol {
        line: idx + 1,
        col: (offset - line_start) + 1,
    }
}

pub fn range_to_line_cols(line_starts: &[usize], start: usize, end: usize) -> (LineCol, LineCol) {
    (offset_to_line_col(line_starts, start), offset_to_line_col(line_starts, end))
}
