use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use crate::ast::{ComponentFile, ImportSpecifier};
use crate::diagnostic::{compute_line_starts, Diagnostic};
use crate::js_validate::{
    diagnose_forbidden_lumin_imports_in_module, validate_js_snippet, JsSnippetKind,
};
use crate::parser::parse_component;
use crate::validate_component_tags_imported;
use swc_ecma_ast::{ModuleDecl, ModuleItem};
use swc_ecma_parser::{EsConfig, Parser, StringInput, Syntax};
use swc_common::{FileName, SourceMap};

#[derive(Debug, Clone)]
pub struct BundleResult {
    pub js: String,
    pub diagnostics: Vec<Diagnostic>,
}

fn collect_used_component_tags(nodes: &[crate::ast::TemplateNode], out: &mut HashSet<String>) {
    for n in nodes {
        if let crate::ast::TemplateNode::Element(el) = n {
            let is_component = el
                .tag_name
                .chars()
                .next()
                .map(|c| c.is_ascii_uppercase())
                .unwrap_or(false);
            if is_component {
                out.insert(el.tag_name.clone());
            }
            collect_used_component_tags(&el.children, out);
        }
    }
}

fn diagnose_non_lumin_imports_in_script_for_bundle(
    lumin_source: &str,
    line_starts: &[usize],
    module_code: &str,
    snippet_start_offset: usize,
) -> Vec<crate::diagnostic::Diagnostic> {
    let cm: SourceMap = Default::default();
    let fm = cm.new_source_file(FileName::Custom("lumin_script_bundle_check.js".into()), module_code.into());

    let syntax = Syntax::Es(EsConfig {
        jsx: false,
        ..Default::default()
    });
    let mut parser = Parser::new(syntax, StringInput::from(&*fm), None);
    let module = match parser.parse_module() {
        Ok(m) => m,
        Err(_) => return Vec::new(),
    };

    let mut diags = Vec::new();
    for item in module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)) = item {
            let src = import_decl.src.value.to_string();
            if !src.ends_with(".lumin") {
                // Reuse the same location mapping approach as other diagnostics.
                let span = import_decl.src.span;
                let start = span.lo.0 as usize;
                let end = span.hi.0 as usize;
                let abs_start = snippet_start_offset + start;
                let abs_end = snippet_start_offset + end;
                let (lc_start, lc_end) = crate::diagnostic::range_to_line_cols(line_starts, abs_start, abs_end);
                diags.push(crate::diagnostic::Diagnostic {
                    severity: crate::diagnostic::DiagnosticSeverity::Error,
                    message: "ESM imports inside <script> are not supported in --bundle mode. Use ESM output (bundle=false) and let Vite resolve/bundle dependencies.".into(),
                    range: crate::diagnostic::SourceRange { start: abs_start, end: abs_end },
                    start: lc_start,
                    end: lc_end,
                });
            }
        }
    }

    let _ = lumin_source;
    diags
}

pub fn bundle_entry(entry_path: &Path) -> Result<BundleResult, anyhow::Error> {
    let mut compiler = GraphCompiler::new();
    compiler.compile(entry_path)?;

    Ok(BundleResult {
        js: compiler.emit_bundle(entry_path)?,
        diagnostics: compiler.diagnostics,
    })
}

struct GraphCompiler {
    components_by_path: HashMap<PathBuf, ComponentFile>,
    component_names_by_path: HashMap<PathBuf, String>,
    diagnostics: Vec<Diagnostic>,
    visiting: HashSet<PathBuf>,
}

impl GraphCompiler {
    fn new() -> Self {
        Self {
            components_by_path: HashMap::new(),
            component_names_by_path: HashMap::new(),
            diagnostics: Vec::new(),
            visiting: HashSet::new(),
        }
    }

    fn compile(&mut self, path: &Path) -> Result<(), anyhow::Error> {
        let path = path.canonicalize()?;
        if self.components_by_path.contains_key(&path) {
            return Ok(());
        }
        if self.visiting.contains(&path) {
            return Err(anyhow::anyhow!("import cycle detected at {}", path.display()));
        }
        self.visiting.insert(path.clone());

        let source = std::fs::read_to_string(&path)?;
        let line_starts = compute_line_starts(&source);

        let component = parse_component(&source).map_err(|e| anyhow::Error::new(e))?;

        // SWC validation for this file
        if let Some(script) = &component.script {
            if let Some(span) = script.span.as_ref() {
                self.diagnostics.extend(validate_js_snippet(
                    &source,
                    &line_starts,
                    &script.code,
                    span.start,
                    JsSnippetKind::ScriptModule,
                ));
                self.diagnostics.extend(diagnose_forbidden_lumin_imports_in_module(
                    &source,
                    &line_starts,
                    &script.code,
                    span.start,
                ));

                // Bundle/IIFE mode cannot preserve ESM imports for JS libraries.
                // If user imports any non-.lumin module in <script>, emit a diagnostic
                // (they should use ESM output + Vite to bundle deps).
                self.diagnostics.extend(diagnose_non_lumin_imports_in_script_for_bundle(
                    &source,
                    &line_starts,
                    &script.code,
                    span.start,
                ));
            }
        }
        crate::lib_collect_expr_diagnostics(&source, &line_starts, &component.template, &mut self.diagnostics);
        self.diagnostics.extend(validate_component_tags_imported(
            &source,
            &line_starts,
            &component,
        ));

        // Determine component name (file stem)
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| anyhow::anyhow!("invalid component file name"))?
            .to_string();

        // Compile imported components
        let mut import_map: HashMap<String, PathBuf> = HashMap::new();
        for imp in &component.imports {
            let src = path.parent().unwrap_or(Path::new(".")).join(&imp.source);
            for s in &imp.specifiers {
                match s {
                    ImportSpecifier::Default(local) => {
                        import_map.insert(local.clone(), src.clone());
                    }
                    ImportSpecifier::Named(local) => {
                        import_map.insert(local.clone(), src.clone());
                    }
                    ImportSpecifier::NamedAlias { local, .. } => {
                        import_map.insert(local.clone(), src.clone());
                    }
                }
            }
        }

        let mut used_components: HashSet<String> = HashSet::new();
        collect_used_component_tags(&component.template, &mut used_components);

        for used in used_components {
            if let Some(src) = import_map.get(&used) {
                self.compile(src)?;
            }
        }

        self.component_names_by_path.insert(path.clone(), name);
        self.components_by_path.insert(path.clone(), component);
        self.visiting.remove(&path);
        Ok(())
    }

    fn emit_bundle(&self, entry_path: &Path) -> Result<String, anyhow::Error> {
        let entry = entry_path.canonicalize()?;

        let mut out = String::new();
        out.push_str("// Generated by luminjs bundle\n");
        out.push_str("import { h, hydrate as __hydrate } from '@luminjs/runtime';\n\n");

        out.push_str("const __luminComponents = {};\n");

        // Stable ordering: sort by path display
        let mut items: Vec<_> = self.components_by_path.iter().collect();
        items.sort_by_key(|(p, _)| p.display().to_string());

        for (path, component) in items {
            let name = self
                .component_names_by_path
                .get(path)
                .cloned()
                .unwrap_or_else(|| "Component".into());
            let js = crate::codegen::generate_component_factory_js(&name, component);
            out.push_str(&js);
            out.push_str("\n");
        }

        let entry_name = self
            .component_names_by_path
            .get(&entry)
            .cloned()
            .unwrap_or_else(|| "App".into());

        out.push_str("\n");
        out.push_str(&format!(
            "export const components = __luminComponents;\nexport function hydrate(root) {{ __hydrate(root, __luminComponents[\"{}\"], {{}}); }}\n",
            entry_name
        ));

        Ok(out)
    }
}

