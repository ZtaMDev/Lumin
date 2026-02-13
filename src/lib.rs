pub mod ast;
pub mod bundler;
pub mod diagnostic;
pub mod error;
pub mod js_validate;
pub mod parser;
pub mod codegen;

use std::path::Path;

use anyhow::Result;

use crate::diagnostic::{compute_line_starts, Diagnostic};
use crate::js_validate::{
    diagnose_forbidden_lumin_imports_in_module, validate_js_snippet, JsSnippetKind,
};
use crate::diagnostic::{range_to_line_cols, DiagnosticSeverity, SourceRange};

/// Compile a `.lumin` file from `input_path` and return the generated JS code.
pub fn compile_file<P: AsRef<Path>>(input_path: P) -> Result<String> {
    let source: String = std::fs::read_to_string(&input_path)?;
    let (js, diags) = compile_source_with_diagnostics(&source)
        .map_err(|e| anyhow::Error::new(e))?;

    if !diags.is_empty() {
        // Keep compile_file signature; caller can use compile_file_with_diagnostics.
        return Err(anyhow::anyhow!("compile failed with diagnostics"));
    }

    Ok(js)
}

/// Compile a `.lumin` file and return generated JS plus diagnostics.
pub fn compile_file_with_diagnostics<P: AsRef<Path>>(
    input_path: P,
) -> Result<(String, Vec<Diagnostic>)> {
    let source: String = std::fs::read_to_string(&input_path)?;
    compile_source_with_diagnostics(&source).map_err(|e| anyhow::Error::new(e))
}

fn compile_source_with_diagnostics(
    source: &str,
) -> std::result::Result<(String, Vec<Diagnostic>), error::CompileError> {
    let line_starts = compute_line_starts(source);

    let component: ast::ComponentFile = parser::parse_component(source)?;

    let mut diags: Vec<Diagnostic> = Vec::new();

    // Validate <script> block JS
    if let Some(script) = &component.script {
        if let Some(span) = script.span.as_ref() {
            diags.extend(validate_js_snippet(
                source,
                &line_starts,
                &script.code,
                span.start,
                JsSnippetKind::ScriptModule,
            ));

            // Enforce import rules inside <script>
            diags.extend(diagnose_forbidden_lumin_imports_in_module(
                source,
                &line_starts,
                &script.code,
                span.start,
            ));
        }
    }

    // Validate { ... } expressions in template and attributes
    lib_collect_expr_diagnostics(source, &line_starts, &component.template, &mut diags);

    // Semantic validation: component tags must be imported
    diags.extend(validate_component_tags_imported(source, &line_starts, &component));

    let js: String = codegen::generate_js(&component);
    Ok((js, diags))
}

pub(crate) fn lib_collect_expr_diagnostics(
    source: &str,
    line_starts: &[usize],
    nodes: &[ast::TemplateNode],
    out: &mut Vec<Diagnostic>,
) {
    for n in nodes {
        match n {
            ast::TemplateNode::Expr(e) => {
                if let Some(span) = e.span.as_ref() {
                    out.extend(validate_js_snippet(
                        source,
                        line_starts,
                        &e.code,
                        span.start,
                        JsSnippetKind::Expression,
                    ));
                }
            }
            ast::TemplateNode::Text(_) => {}
            ast::TemplateNode::Element(el) => {
                for a in &el.attributes {
                    match a {
                        ast::AttributeNode::Dynamic { expr, .. } => {
                            if let Some(span) = expr.span.as_ref() {
                                out.extend(validate_js_snippet(
                                    source,
                                    line_starts,
                                    &expr.code,
                                    span.start,
                                    JsSnippetKind::Expression,
                                ));
                            }
                        }
                        ast::AttributeNode::EventHandler { expr, .. } => {
                            if let Some(span) = expr.span.as_ref() {
                                out.extend(validate_js_snippet(
                                    source,
                                    line_starts,
                                    &expr.code,
                                    span.start,
                                    JsSnippetKind::Expression,
                                ));
                            }
                        }
                        ast::AttributeNode::Static { .. } => {}
                    }
                }

                lib_collect_expr_diagnostics(source, line_starts, &el.children, out);
            }
        }
    }
}

pub(crate) fn validate_component_tags_imported(
    _source: &str,
    line_starts: &[usize],
    component: &ast::ComponentFile,
) -> Vec<Diagnostic> {
    let mut imported: std::collections::HashSet<String> = std::collections::HashSet::new();
    for imp in &component.imports {
        for s in &imp.specifiers {
            match s {
                ast::ImportSpecifier::Default(n) => {
                    imported.insert(n.clone());
                }
                ast::ImportSpecifier::Named(n) => {
                    imported.insert(n.clone());
                }
                ast::ImportSpecifier::NamedAlias { local, .. } => {
                    imported.insert(local.clone());
                }
            }
        }
    }

    let mut out = Vec::new();
    validate_component_tags_imported_in_nodes(line_starts, &imported, &component.template, &mut out);
    out
}

fn validate_component_tags_imported_in_nodes(
    line_starts: &[usize],
    imported: &std::collections::HashSet<String>,
    nodes: &[ast::TemplateNode],
    out: &mut Vec<Diagnostic>,
) {
    for n in nodes {
        if let ast::TemplateNode::Element(el) = n {
            let is_component = el
                .tag_name
                .chars()
                .next()
                .map(|c| c.is_ascii_uppercase())
                .unwrap_or(false);

            if is_component && !imported.contains(&el.tag_name) {
                let (abs_start, abs_end) = if let Some(span) = el.tag_span.as_ref() {
                    (span.start, span.end)
                } else {
                    (0usize, 0usize)
                };

                let (lc_start, lc_end) = range_to_line_cols(line_starts, abs_start, abs_end);

                out.push(Diagnostic {
                    severity: DiagnosticSeverity::Error,
                    message: format!(
                        "Cannot find component '{}'. Import it in the --- imports block.",
                        el.tag_name
                    ),
                    range: SourceRange {
                        start: abs_start,
                        end: abs_end,
                    },
                    start: lc_start,
                    end: lc_end,
                });
            }

            validate_component_tags_imported_in_nodes(line_starts, imported, &el.children, out);
        }
    }
}
