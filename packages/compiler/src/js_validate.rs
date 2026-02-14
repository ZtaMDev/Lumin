use swc_common::{FileName, SourceMap, Span, Spanned};
use swc_ecma_ast::{ModuleDecl, ModuleItem};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsConfig};

use crate::diagnostic::{range_to_line_cols, Diagnostic, DiagnosticSeverity, SourceRange};

#[derive(Debug, Clone, Copy)]
pub enum JsSnippetKind {
    ScriptModule,
    Expression,
}

pub fn diagnose_forbidden_lumin_imports_in_module(
    lumin_source: &str,
    line_starts: &[usize],
    module_code: &str,
    snippet_start_offset: usize,
) -> Vec<Diagnostic> {
    let cm: SourceMap = Default::default();
    let fm = cm.new_source_file(FileName::Custom("lumin_script.ts".into()), module_code.into());

    let syntax = Syntax::Typescript(TsConfig {
        tsx: false,
        ..Default::default()
    });

    let mut parser = Parser::new(syntax, StringInput::from(&*fm), None);
    let module = match parser.parse_module() {
        Ok(m) => m,
        Err(_) => {
            // If JS doesn't parse, validation will already report it.
            return Vec::new();
        }
    };

    let mut diags: Vec<Diagnostic> = Vec::new();

    for item in module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)) = item {
            let src = import_decl.src.value.to_string();
            if src.ends_with(".lumix") {
                let span: Span = import_decl.src.span;
                let start = (span.lo.0 - fm.start_pos.0) as usize;
                let end = (span.hi.0 - fm.start_pos.0) as usize;
                let abs_start = snippet_start_offset + start;
                let abs_end = snippet_start_offset + end;
                let (lc_start, lc_end) = range_to_line_cols(line_starts, abs_start, abs_end);

                diags.push(Diagnostic {
                    severity: DiagnosticSeverity::Error,
                    message: "Component imports (.lumix) are not allowed inside <script>. Use the --- imports block instead.".into(),
                    range: SourceRange {
                        start: abs_start,
                        end: abs_end,
                    },
                    start: lc_start,
                    end: lc_end,
                });
            }
        }
    }

    let _ = lumin_source;
    diags
}

pub fn validate_js_snippet(
    lumin_source: &str,
    line_starts: &[usize],
    snippet: &str,
    snippet_start_offset: usize,
    kind: JsSnippetKind,
) -> Vec<Diagnostic> {
    let cm: SourceMap = Default::default();
    let fm = cm.new_source_file(FileName::Custom("lumin_snippet.ts".into()), snippet.into());

    let syntax = Syntax::Typescript(TsConfig {
        tsx: false,
        ..Default::default()
    });

    let mut parser = Parser::new(syntax, StringInput::from(&*fm), None);

    let parse_result = match kind {
        JsSnippetKind::ScriptModule => parser.parse_module().map(|_| ()),
        JsSnippetKind::Expression => parser.parse_expr().map(|_| ()),
    };

    let mut diags: Vec<Diagnostic> = Vec::new();

    if let Err(err) = parse_result {
        let span: Span = err.span();
        let msg = err.kind().msg().to_string();

        let start = (span.lo.0 - fm.start_pos.0) as usize;
        let end = (span.hi.0 - fm.start_pos.0) as usize;

        // Map snippet offsets into the full .lumin file
        let abs_start = snippet_start_offset + start;
        let abs_end = snippet_start_offset + end;
        let (lc_start, lc_end) = range_to_line_cols(line_starts, abs_start, abs_end);

        diags.push(Diagnostic {
            severity: DiagnosticSeverity::Error,
            message: format!("JS parse error: {}", msg),
            range: SourceRange {
                start: abs_start,
                end: abs_end,
            },
            start: lc_start,
            end: lc_end,
        });
    }

    // Also surface any trailing errors emitted by the parser (recovery errors)
    for err in parser.take_errors() {
        let span: Span = err.span();
        let msg = err.kind().msg().to_string();

        let start = (span.lo.0 - fm.start_pos.0) as usize;
        let end = (span.hi.0 - fm.start_pos.0) as usize;

        let abs_start = snippet_start_offset + start;
        let abs_end = snippet_start_offset + end;
        let (lc_start, lc_end) = range_to_line_cols(line_starts, abs_start, abs_end);

        diags.push(Diagnostic {
            severity: DiagnosticSeverity::Error,
            message: format!("JS parse error: {}", msg),
            range: SourceRange {
                start: abs_start,
                end: abs_end,
            },
            start: lc_start,
            end: lc_end,
        });
    }

    let _ = lumin_source;

    diags
}
