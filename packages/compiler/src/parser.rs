use crate::ast::*;
use crate::error::CompileError;
use crate::diagnostic::SourceRange as DiagnosticSourceRange;
use std::collections::HashMap;

use swc_common::{FileName, SourceMap, DUMMY_SP, Spanned};
use swc_ecma_ast::{ModuleDecl, ModuleItem, Decl, Pat, Callee};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsConfig};
use crate::transpiler::{transpile_ts_module, emit_module_to_string};

/// Robust parser for LuminJS components:
/// - Detects an optional `--- ... ---` import block at the beginning.
/// - Detects `<script>` and `<style>` blocks in any order.
/// - Parses the template as a reactive DOM.
pub fn parse_component(source: &str) -> Result<ComponentFile, CompileError> {
    let mut parser = MarkupParser::new(source, 0);
    let mut component = ComponentFile {
        imports: Vec::new(),
        script: None,
        style: None,
        template: Vec::new(),
        defined_slots: Vec::new(),
        head: None,
    };

    parser.skip_ws();

    // 1) Optional imports block at the beginning
    if parser.starts_with("---") {
        parser.pos += 3;
        let start = parser.pos;
        let end_idx = parser.input[start..].find("---");
        if let Some(end) = end_idx {
            let imports_block = &parser.input[start..start + end];
            component.imports = parse_imports_block(imports_block)?;
            parser.pos = start + end + 3;
        } else {
            return Err(CompileError::Syntax {
                message: "imports block '---' without closing '---'".into(),
                range: Some(DiagnosticSourceRange { start: 0, end: 3 }),
            });
        }
    }

    // 2) Collect everything in a loop
    loop {
        parser.skip_ws();
        if parser.is_eof() {
            break;
        }

        if parser.starts_with("<script>") {
            if component.script.is_some() {
                return Err(CompileError::Template {
                    message: "only one <script> block is allowed".into(),
                    range: None,
                });
            }
            let script_start = parser.pos;
            parser.pos += 8; // skip <script>
            
            let (code, end_pos) = parser.parse_script_or_style_block("</script>")?;
            let abs_start = parser.base_offset + script_start + 8;
            
            let (cleaned_code, props, imports, head_metadata) = parse_script_block_contents(&code)?;

            component.script = Some(ScriptBlock {
                code: cleaned_code,
                original_code: code.to_string(),
                props,
                imports,
                span: Some(SourceRange {
                    start: abs_start,
                    end: abs_start + code.len(),
                }),
            });
            
            // Store head metadata if found
            if let Some(head) = head_metadata {
                component.head = Some(head);
            }
            
            parser.pos = end_pos + 9; // skip </script>
            continue;
        }

        if parser.starts_with("<style>") {
            if component.style.is_some() {
                return Err(CompileError::Template {
                    message: "only one <style> block is allowed".into(),
                    range: None,
                });
            }
            let style_start = parser.pos;
            parser.pos += 7; // skip <style>
            
            let (code, end_pos) = parser.parse_script_or_style_block("</style>")?;
            let abs_start = parser.base_offset + style_start + 7;
            
            component.style = Some(StyleBlock {
                code: code.to_string(),
                span: Some(SourceRange {
                    start: abs_start,
                    end: abs_start + code.len(),
                }),
            });
            parser.pos = end_pos + 8; // skip </style>
            continue;
        }

        // Must be template
        let nodes = parser.parse_nodes(None, None)?;
        if nodes.is_empty() && !parser.is_eof() {
             // If we didn't get any nodes but aren't at EOF, something is wrong
             // (e.g. we're stuck at a tag we didn't handle)
             break;
        }
        component.template.extend(nodes);
    }

    component.defined_slots = collect_slots(&component.template);

    Ok(component)
}

fn collect_slots(nodes: &[TemplateNode]) -> Vec<String> {
    let mut slots = Vec::new();
    for n in nodes {
        match n {
            TemplateNode::Slot(s) => {
                slots.push(s.name.as_deref().unwrap_or("children").to_string());
                // Fallback can also have slots (unusual but possible)
                slots.extend(collect_slots(&s.fallback));
            }
            TemplateNode::Element(el) => {
                slots.extend(collect_slots(&el.children));
            }
            TemplateNode::ControlFlow(cf) => match cf {
                ControlFlowBlock::If {
                    then_branch,
                    else_ifs,
                    else_branch,
                    ..
                } => {
                    slots.extend(collect_slots(then_branch));
                    for (_, branch) in else_ifs {
                        slots.extend(collect_slots(branch));
                    }
                    if let Some(branch) = else_branch {
                        slots.extend(collect_slots(branch));
                    }
                }
                ControlFlowBlock::For { body, .. } => {
                    slots.extend(collect_slots(body));
                }
            },
            _ => {}
        }
    }
    slots
}

fn parse_imports_block(block: &str) -> Result<Vec<ComponentImport>, CompileError> {
    let mut imports: Vec<ComponentImport> = Vec::new();

    for line in block.lines() {
        let line: &str = line.trim();
        if line.is_empty() {
            continue;
        }
        if !line.starts_with("import ") {
            return Err(CompileError::Syntax {
                message: format!("invalid import line in imports block: {line}"),
                range: None, // Simplified for now
            });
        }
        // Parse `import ... from "./X.lumin"`
        let from_idx: usize = line.find("from ").ok_or_else(|| {
            CompileError::Syntax {
                message: format!("import without 'from' in imports block: {line}"),
                range: None,
            }
        })?;
        let spec_part: &str = line["import ".len()..from_idx].trim();
        let source_part: &str = line[from_idx + 5..].trim().trim_end_matches(';');
        let source: String = source_part
            .trim()
            .trim_matches(|c| c == '"' || c == '\'')
            .to_string();

        if !source.ends_with(".lumix") {
            return Err(CompileError::InvalidStructure {
                message: format!("only .lumix component imports are allowed in the --- block: {source}"),
                range: None,
            });
        }

        let specifiers = parse_import_specifiers(spec_part)?;
        if specifiers.is_empty() {
            return Err(CompileError::Syntax {
                message: format!("import missing specifiers: {line}"),
                range: None,
            });
        }

        imports.push(ComponentImport { specifiers, source });
    }

    Ok(imports)
}

fn parse_script_block_contents(code: &str) -> Result<(String, Vec<Prop>, Vec<ScriptImport>, Option<HeadMetadata>), CompileError> {
    let cm: SourceMap = Default::default();
    let fm = cm.new_source_file(FileName::Custom("script.ts".into()), code.to_string());
    
    let syntax = Syntax::Typescript(TsConfig {
        ..Default::default()
    });

    let mut parser = Parser::new(syntax, StringInput::from(&*fm), None);
    let module = match parser.parse_module() {
        Ok(m) => m,
        Err(e) => {
             return Err(CompileError::Template {
                 message: format!("JS parse error in <script>: {}", e.kind().msg()),
                 range: None,
             });
        }
    };

    // Transpile the WHOLE module once to get type stripping and resolver context right.
    let transpiled_module = transpile_ts_module(module);

    let mut props: Vec<Prop> = Vec::new();
    let mut imports: Vec<ScriptImport> = Vec::new();
    let mut other_items: Vec<ModuleItem> = Vec::new();
    let mut head_metadata: Option<HeadMetadata> = None;

    for item in transpiled_module.body {
        match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)) => {
                // Generate JS code for JUST this import
                let temp_mod = swc_ecma_ast::Module {
                    span: import_decl.span,
                    body: vec![ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl))],
                    shebang: None,
                };
                imports.push(ScriptImport {
                    code: emit_module_to_string(&temp_mod),
                });
            }
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_decl)) => {
                if let Decl::Var(var_decl) = &export_decl.decl {
                    for decl in &var_decl.decls {
                        if let Pat::Ident(ident) = &decl.name {
                            let name = ident.id.sym.to_string();
                            
                            // Check if this is "export const head"
                            if name == "head" {
                                if let Some(init) = &decl.init {
                                    // Extract head metadata from the object literal
                                    head_metadata = extract_head_metadata(init, code, &fm);
                                }
                                // Don't add head to other_items, we'll handle it separately
                                continue;
                            }
                            
                            if let Some(init) = &decl.init {
                                let start = (init.span().lo.0 - fm.start_pos.0) as usize;
                                let end = (init.span().hi.0 - fm.start_pos.0) as usize;
                                let original_default_value = if start < end && end <= code.len() {
                                    Some(code[start..end].to_string())
                                } else {
                                    None
                                };

                                let temp_mod = swc_ecma_ast::Module {
                                    span: DUMMY_SP,
                                    body: vec![ModuleItem::Stmt(swc_ecma_ast::Stmt::Expr(swc_ecma_ast::ExprStmt {
                                        span: DUMMY_SP,
                                        expr: init.clone(),
                                    }))],
                                    shebang: None,
                                };
                                let default_value = Some(emit_module_to_string(&temp_mod).trim_end_matches(';').trim().to_string());
                                props.push(Prop { name, default_value, original_default_value, kind: PropKind::Prop });
                            } else {
                                props.push(Prop { name, default_value: None, original_default_value: None, kind: PropKind::Prop });
                            }
                        }
                    }
                }
            }
            ModuleItem::Stmt(swc_ecma_ast::Stmt::Decl(Decl::Var(var_decl))) => {
                let mut is_prop_decl = false;
                for decl in &var_decl.decls {
                    if let Some(init) = &decl.init {
                        if let swc_ecma_ast::Expr::Call(call) = &**init {
                            if let Callee::Expr(callee_expr) = &call.callee {
                                if let swc_ecma_ast::Expr::Ident(id) = &**callee_expr {
                                    if id.sym.as_ref() == "prop" {
                                        is_prop_decl = true;
                                        // Handle props/signals
                                        if let Pat::Ident(binding) = &decl.name {
                                            let original_default_value = call.args.get(0).map(|arg| {
                                                let start = (arg.span().lo.0 - fm.start_pos.0) as usize;
                                                let end = (arg.span().hi.0 - fm.start_pos.0) as usize;
                                                if start < end && end <= code.len() {
                                                    code[start..end].to_string()
                                                } else {
                                                    "".to_string()
                                                }
                                            });

                                            props.push(Prop {
                                                name: binding.id.sym.to_string(),
                                                default_value: call.args.get(0).map(|arg| {
                                                    let temp_mod = swc_ecma_ast::Module {
                                                        span: DUMMY_SP,
                                                        body: vec![ModuleItem::Stmt(swc_ecma_ast::Stmt::Expr(swc_ecma_ast::ExprStmt {
                                                            span: DUMMY_SP,
                                                            expr: arg.expr.clone(),
                                                        }))],
                                                        shebang: None,
                                                    };
                                                    emit_module_to_string(&temp_mod).trim_end_matches(';').trim().to_string()
                                                }),
                                                original_default_value,
                                                kind: if id.sym.as_ref() == "prop" { PropKind::Prop } else { PropKind::Signal },
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if !is_prop_decl {
                    other_items.push(ModuleItem::Stmt(swc_ecma_ast::Stmt::Decl(Decl::Var(var_decl))));
                }
            }
            item => {
                other_items.push(item);
            }
        }
    }

    let cleaned_mod = swc_ecma_ast::Module {
        span: DUMMY_SP,
        body: other_items,
        shebang: None,
    };
    let cleaned_code = emit_module_to_string(&cleaned_mod);

    Ok((cleaned_code, props, imports, head_metadata))
}

// Extract head metadata from an object literal expression
fn extract_head_metadata(expr: &swc_ecma_ast::Expr, code: &str, fm: &swc_common::SourceFile) -> Option<HeadMetadata> {
    use swc_ecma_ast::{Expr, Lit, PropOrSpread, Prop as SwcProp, KeyValueProp};
    use std::collections::HashMap;
    
    if let Expr::Object(obj_lit) = expr {
        let mut title: Option<String> = None;
        let mut meta: Vec<HashMap<String, String>> = Vec::new();
        let mut link: Vec<HashMap<String, String>> = Vec::new();
        let mut script: Vec<HashMap<String, String>> = Vec::new();
        
        for prop in &obj_lit.props {
            if let PropOrSpread::Prop(p) = prop {
                if let SwcProp::KeyValue(KeyValueProp { key, value, .. }) = &**p {
                    let key_name = match key {
                        swc_ecma_ast::PropName::Ident(id) => id.sym.to_string(),
                        swc_ecma_ast::PropName::Str(s) => s.value.to_string(),
                        _ => continue,
                    };
                    
                    match key_name.as_str() {
                        "title" => {
                            if let Expr::Lit(Lit::Str(s)) = &**value {
                                title = Some(s.value.to_string());
                            }
                        }
                        "meta" | "link" | "script" => {
                            if let Expr::Array(arr) = &**value {
                                let mut items = Vec::new();
                                for elem in &arr.elems {
                                    if let Some(elem_expr) = elem {
                                        if let Expr::Object(obj) = &*elem_expr.expr {
                                            let mut map = HashMap::new();
                                            for obj_prop in &obj.props {
                                                if let PropOrSpread::Prop(p) = obj_prop {
                                                    if let SwcProp::KeyValue(KeyValueProp { key: k, value: v, .. }) = &**p {
                                                        let k_name = match k {
                                                            swc_ecma_ast::PropName::Ident(id) => id.sym.to_string(),
                                                            swc_ecma_ast::PropName::Str(s) => s.value.to_string(),
                                                            _ => continue,
                                                        };
                                                        if let Expr::Lit(Lit::Str(s)) = &**v {
                                                            map.insert(k_name, s.value.to_string());
                                                        } else if let Expr::Lit(Lit::Bool(b)) = &**v {
                                                            map.insert(k_name, b.value.to_string());
                                                        }
                                                    }
                                                }
                                            }
                                            items.push(map);
                                        }
                                    }
                                }
                                match key_name.as_str() {
                                    "meta" => meta = items,
                                    "link" => link = items,
                                    "script" => script = items,
                                    _ => {}
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
        
        return Some(HeadMetadata { title, meta, link, script });
    }
    
    None
}

fn parse_import_specifiers(spec: &str) -> Result<Vec<ImportSpecifier>, CompileError> {
    let spec = spec.trim();
    if spec.is_empty() {
        return Ok(Vec::new());
    }

    // Default import: `Counter`
    if !spec.starts_with('{') {
        // Could be `Name` or `Name, { X }` (not supported yet)
        if spec.contains(',') {
            return Err(CompileError::Syntax {
                message: "combined default + named imports are not supported yet".into(),
                range: None,
            });
        }
        return Ok(vec![ImportSpecifier::Default(spec.to_string())]);
    }

    // Named import list: `{ A, B as C }`
    if !spec.ends_with('}') {
        return Err(CompileError::Syntax {
            message: "named imports missing closing '}'".into(),
            range: None,
        });
    }
    let inner = spec[1..spec.len() - 1].trim();
    if inner.is_empty() {
        return Ok(Vec::new());
    }

    let mut out = Vec::new();
    for part in inner.split(',') {
        let p = part.trim();
        if p.is_empty() {
            continue;
        }
        if let Some((left, right)) = p.split_once(" as ") {
            out.push(ImportSpecifier::NamedAlias {
                imported: left.trim().to_string(),
                local: right.trim().to_string(),
            });
        } else {
            out.push(ImportSpecifier::Named(p.to_string()));
        }
    }
    Ok(out)
}

struct MarkupParser<'a> {
    input: &'a str,
    pos: usize,
    base_offset: usize,
}

impl<'a> MarkupParser<'a> {
    fn new(input: &'a str, base_offset: usize) -> Self {
        Self {
            input,
            pos: 0,
            base_offset,
        }
    }

    fn is_eof(&self) -> bool {
        self.pos >= self.input.len()
    }

    fn remaining(&self) -> &'a str {
        &self.input[self.pos..]
    }

    fn skip_ws(&mut self) {
        while let Some(c) = self.peek_char() {
            if c.is_whitespace() {
                self.consume_char();
            } else {
                break;
            }
        }
    }

    fn peek_char(&self) -> Option<char> {
        self.remaining().chars().next()
    }

    fn consume_char(&mut self) -> Option<char> {
        let c = self.peek_char()?;
        self.pos += c.len_utf8();
        Some(c)
    }

    fn starts_with(&self, s: &str) -> bool {
        self.remaining().starts_with(s)
    }

    fn expect(&mut self, s: &str) -> Result<(), CompileError> {
        if self.starts_with(s) {
            self.pos += s.len();
            Ok(())
        } else {
            Err(CompileError::Template {
                message: format!("expected '{s}'"),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos,
                    end: self.base_offset + self.pos + 1, // Approx
                }),
            })
        }
    }

    /// Robustly extracts content between <script>...</script> or <style>...</style>
    /// by skipping strings and comments to find the closing tag.
    fn parse_script_or_style_block(&mut self, terminator: &str) -> Result<(String, usize), CompileError> {
        let start = self.pos;
        let mut in_single = false;
        let mut in_double = false;
        let mut in_backtick = false;
        let mut in_line_comment = false;
        let mut in_block_comment = false;
        let mut escaped = false;

        while !self.is_eof() {
            if !in_single && !in_double && !in_backtick && !in_line_comment && !in_block_comment {
                if self.starts_with(terminator) {
                    let code = self.input[start..self.pos].to_string();
                    return Ok((code, self.pos));
                }
            }

            let c = self.consume_char().unwrap();

            if escaped {
                escaped = false;
                continue;
            }

            match c {
                '\\' => {
                    if in_single || in_double || in_backtick {
                        escaped = true;
                    }
                }
                '\'' if !in_double && !in_backtick && !in_line_comment && !in_block_comment => {
                    in_single = !in_single;
                }
                '"' if !in_single && !in_backtick && !in_line_comment && !in_block_comment => {
                    in_double = !in_double;
                }
                '`' if !in_single && !in_double && !in_line_comment && !in_block_comment => {
                    in_backtick = !in_backtick;
                }
                '/' if !in_single && !in_double && !in_backtick => {
                    if !in_line_comment && !in_block_comment {
                        if self.starts_with("/") {
                            self.consume_char();
                            in_line_comment = true;
                        } else if self.starts_with("*") {
                            self.consume_char();
                            in_block_comment = true;
                        }
                    }
                }
                '\n' if in_line_comment => {
                    in_line_comment = false;
                }
                '*' if in_block_comment => {
                    if self.starts_with("/") {
                        self.consume_char();
                        in_block_comment = false;
                    }
                }
                _ => {}
            }
        }

        Err(CompileError::Template {
            message: format!("unclosed block; expected {terminator}"),
            range: Some(DiagnosticSourceRange {
                start: self.base_offset + start - 8, // heuristic
                end: self.base_offset + self.pos,
            }),
        })
    }

    fn parse_nodes(
        &mut self,
        closing_tag: Option<&str>,
        terminator: Option<&str>,
    ) -> Result<Vec<TemplateNode>, CompileError> {
        let mut nodes: Vec<TemplateNode> = Vec::new();

        while !self.is_eof() {
            if let Some(term) = terminator {
                if self.starts_with(term) {
                    return Ok(nodes);
                }
            }

            // Top-level blocks should stop template parsing
            if closing_tag.is_none() && terminator.is_none() {
                if self.starts_with("<script>") || self.starts_with("<style>") || self.starts_with("---") {
                    break;
                }
            }

            if self.starts_with("</") {
                let _saved = self.pos;
                self.pos += 2;
                let name = self.parse_tag_name()?;
                self.skip_ws();
                self.expect(">")?;

                if let Some(expected) = closing_tag {
                    if name != expected {
                        return Err(CompileError::Template {
                            message: format!("mismatched closing tag </{name}>; expected </{expected}>"),
                            range: Some(DiagnosticSourceRange {
                                start: self.base_offset + self.pos - (name.len() + 3), // approx backtrace
                                end: self.base_offset + self.pos,
                            }),
                        });
                    }
                    return Ok(nodes);
                }

                return Err(CompileError::Template {
                    message: format!("unexpected closing tag </{name}>"),
                    range: Some(DiagnosticSourceRange {
                        start: self.base_offset + self.pos - (name.len() + 3),
                        end: self.base_offset + self.pos,
                    }),
                });
            }

            if self.starts_with("<") {
                let el = self.parse_element()?;
                nodes.push(TemplateNode::Element(el));
                continue;
            }

            if self.starts_with("@{") {
                let cf = self.parse_control_flow_block()?;
                nodes.push(TemplateNode::ControlFlow(cf));
                continue;
            }

            if self.starts_with("{@slot") {
                let slot = self.parse_slot_node()?;
                nodes.push(TemplateNode::Slot(slot));
                continue;
            }

            if self.starts_with("{") {
                let expr = self.parse_braced_js_expr()?;
                nodes.push(TemplateNode::Expr(expr));
                continue;
            }

            let text = self.parse_text(terminator)?;
            if !text.is_empty() {
                nodes.push(TemplateNode::Text(text));
            }
        }

        if let Some(expected) = closing_tag {
            return Err(CompileError::Template {
                message: format!("unclosed tag <{expected}>"),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos, // EOF usually
                    end: self.base_offset + self.pos,
                }),
            });
        }

        Ok(nodes)
    }
    fn parse_text(&mut self, terminator: Option<&str>) -> Result<String, CompileError> {
        let start = self.pos;
        while !self.is_eof() {
            if self.starts_with("<") || self.starts_with("{") || self.starts_with("@{") {
                break;
            }
            if let Some(term) = terminator {
                if self.starts_with(term) {
                    break;
                }
            }
            self.consume_char();
        }
        Ok(self.input[start..self.pos].to_string())
    }

    fn parse_control_flow_block(&mut self) -> Result<ControlFlowBlock, CompileError> {
        self.expect("@{")?;
        self.skip_ws();

        if self.starts_with("if") {
            self.pos += 2;
            self.skip_ws();
            self.expect("(")?;
            let condition = self.parse_paren_js_expr()?;
            self.expect(")")?;
            self.skip_ws();

            let then_branch = self.parse_control_flow_branch()?;
            let mut else_ifs = Vec::new();
            let mut else_branch = None;

            loop {
                self.skip_ws();
                if self.starts_with("else if") {
                    self.pos += 7;
                    self.skip_ws();
                    self.expect("(")?;
                    let cond = self.parse_paren_js_expr()?;
                    self.expect(")")?;
                    self.skip_ws();
                    let body = self.parse_control_flow_branch()?;
                    else_ifs.push((cond, body));
                } else if self.starts_with("else") {
                    self.pos += 4;
                    self.skip_ws();
                    else_branch = Some(self.parse_control_flow_branch()?);
                    break;
                } else {
                    break;
                }
            }

            self.skip_ws();
            self.expect("}")?;
            
            Ok(ControlFlowBlock::If {
                condition,
                then_branch,
                else_ifs,
                else_branch,
            })
        } else if self.starts_with("for") {
            self.pos += 3;
            self.skip_ws();
            self.expect("(")?;
            
            // For params: we just want the string inside (e.g. "let item of items")
            let start = self.pos;
            let mut depth = 1;
            while !self.is_eof() && depth > 0 {
                let c = self.consume_char().unwrap();
                if c == '(' { depth += 1; }
                else if c == ')' { depth -= 1; }
            }
            if depth != 0 {
                return Err(CompileError::Template {
                    message: "unterminated '(' in for block".into(),
                    range: None,
                });
            }
            let params_full = self.input[start..self.pos-1].trim();
            let mut parts = params_full.split(';');
            let params = parts.next().unwrap_or("").trim().to_string();
            let mut key_expr = None;
            for part in parts {
                let p = part.trim();
                if p.starts_with("key=") {
                    key_expr = Some(p[4..].trim().to_string());
                }
            }
            
            self.skip_ws();
            let body = self.parse_control_flow_branch()?;
            
            self.skip_ws();
            self.expect("}")?;

            Ok(ControlFlowBlock::For {
                params,
                key_expr,
                body,
            })
        } else {
            Err(CompileError::Template {
                message: "expected 'if' or 'for' after '@{'".into(),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos,
                    end: self.base_offset + self.pos + 1,
                }),
            })
        }
    }

    fn parse_slot_node(&mut self) -> Result<SlotNode, CompileError> {
        self.expect("{@slot")?;
        self.skip_ws();

        let mut name = None;
        if !self.starts_with("??") && !self.starts_with("}") {
            name = Some(self.parse_tag_name()?);
            self.skip_ws();
        }

        let mut fallback = Vec::new();
        if self.starts_with("??") {
            self.pos += 2;
            self.skip_ws();
            // Terminate at '}'
            fallback = self.parse_nodes(None, Some("}"))?;
        }

        self.expect("}")?;
        Ok(SlotNode {
            name,
            fallback,
        })
    }

    fn parse_control_flow_branch(&mut self) -> Result<Vec<TemplateNode>, CompileError> {
        self.skip_ws();
        if self.starts_with("{") {
            self.pos += 1;
            let nodes = self.parse_nodes(None, Some("}"))?;
            self.skip_ws();
            self.expect("}")?;
            Ok(nodes)
        } else {
            // Single node branch
            if self.starts_with("<") {
                let el = self.parse_element()?;
                Ok(vec![TemplateNode::Element(el)])
            } else if self.starts_with("{") {
                let expr = self.parse_braced_js_expr()?;
                Ok(vec![TemplateNode::Expr(expr)])
            } else {
                // Must be text
                let text = self.parse_text(None)?;
                Ok(vec![TemplateNode::Text(text)])
            }
        }
    }

    fn parse_paren_js_expr(&mut self) -> Result<JsExpr, CompileError> {
        let start = self.pos;
        let mut depth = 1;
        while !self.is_eof() && depth > 0 {
            let c = self.peek_char().unwrap();
            if c == '(' {
                depth += 1;
                self.consume_char();
            } else if c == ')' {
                depth -= 1;
                if depth > 0 {
                    self.consume_char();
                }
            } else {
                self.consume_char();
            }
        }
        
        let code = self.input[start..self.pos].trim().to_string();
        Ok(JsExpr {
            code,
            span: Some(SourceRange {
                start: self.base_offset + start,
                end: self.base_offset + self.pos,
            }),
        })
    }

    fn parse_element(&mut self) -> Result<ElementNode, CompileError> {
        self.expect("<")?;
        if self.starts_with("/") {
            return Err(CompileError::Template {
                message: "unexpected closing tag".into(),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos,
                    end: self.base_offset + self.pos + 2,
                }),
            });
        }

        let (tag_name, tag_span) = self.parse_tag_name_with_span()?;
        let attributes = self.parse_attributes()?;

        if self.starts_with("/>") {
            self.pos += 2;
            return Ok(ElementNode {
                tag_name,
                tag_span,
                attributes,
                children: Vec::new(),
                self_closing: true,
            });
        }

        self.expect(">")?;
        let children = self.parse_nodes(Some(&tag_name), None)?;

        Ok(ElementNode {
            tag_name,
            tag_span,
            attributes,
            children,
            self_closing: false,
        })
    }

    fn parse_tag_name_with_span(&mut self) -> Result<(String, Option<SourceRange>), CompileError> {
        self.skip_ws();
        let start_local = self.pos;

        let name = self.parse_tag_name()?;
        let end_local = self.pos;

        Ok((
            name,
            Some(SourceRange {
                start: self.base_offset + start_local,
                end: self.base_offset + end_local,
            }),
        ))
    }

    fn parse_tag_name(&mut self) -> Result<String, CompileError> {
        self.skip_ws();
        let start = self.pos;
        while let Some(c) = self.peek_char() {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                self.consume_char();
            } else {
                break;
            }
        }
        if self.pos == start {
            return Err(CompileError::Template {
                message: "expected tag name".into(),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos,
                    end: self.base_offset + self.pos + 1,
                }),
            });
        }
        Ok(self.input[start..self.pos].to_string())
    }

    fn parse_attributes(&mut self) -> Result<Vec<AttributeNode>, CompileError> {
        let mut attrs: Vec<AttributeNode> = Vec::new();

        loop {
            self.skip_ws();
            if self.is_eof() {
                return Err(CompileError::Template {
                    message: "unexpected end of input while parsing tag".into(),
                    range: Some(DiagnosticSourceRange {
                        start: self.base_offset + self.pos,
                        end: self.base_offset + self.pos,
                    }),
                });
            }
            if self.starts_with(">") || self.starts_with("/>") {
                break;
            }

            let name = self.parse_attr_name()?;
            self.skip_ws();

            if self.starts_with("=") {
                self.pos += 1;
                self.skip_ws();

                if self.starts_with("\"") {
                    let value = self.parse_quoted_string('"')?;
                    attrs.push(AttributeNode::Static { name, value });
                    continue;
                }
                if self.starts_with("'") {
                    let value = self.parse_quoted_string('\'')?;
                    attrs.push(AttributeNode::Static { name, value });
                    continue;
                }
                if self.starts_with("{") {
                    let expr = self.parse_braced_js_expr()?;
                    if name.starts_with("bind:") {
                        let property = name[5..].to_string();
                        attrs.push(AttributeNode::Bind { property, expr });
                    } else if name.starts_with("on") {
                        attrs.push(AttributeNode::EventHandler { name, expr });
                    } else {
                        attrs.push(AttributeNode::Dynamic { name, expr });
                    }
                    continue;
                }

                return Err(CompileError::Template {
                    message: format!("invalid attribute value for '{name}'"),
                    range: Some(DiagnosticSourceRange {
                        start: self.base_offset + self.pos,
                        end: self.base_offset + self.pos + 1,
                    }),
                });
            }

            // Boolean attribute
            attrs.push(AttributeNode::Static {
                name,
                value: "true".into(),
            });
        }

        Ok(attrs)
    }

    fn parse_attr_name(&mut self) -> Result<String, CompileError> {
        let start = self.pos;
        while let Some(c) = self.peek_char() {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == ':' {
                self.consume_char();
            } else {
                break;
            }
        }
        if self.pos == start {
            return Err(CompileError::Template {
                message: "expected attribute name".into(),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos,
                    end: self.base_offset + self.pos + 1,
                }),
            });
        }
        Ok(self.input[start..self.pos].to_string())
    }

    fn parse_quoted_string(&mut self, quote: char) -> Result<String, CompileError> {
        let first = self.consume_char();
        if first != Some(quote) {
            return Err(CompileError::Template {
                message: "expected quoted string".into(),
                range: Some(DiagnosticSourceRange {
                    start: self.base_offset + self.pos,
                    end: self.base_offset + self.pos + 1,
                }),
            });
        }
        let start = self.pos;
        while let Some(c) = self.peek_char() {
            if c == quote {
                let s = self.input[start..self.pos].to_string();
                self.consume_char();
                return Ok(s);
            }
            // naive escaping support
            if c == '\\' {
                self.consume_char();
                if !self.is_eof() {
                    self.consume_char();
                }
                continue;
            }
            self.consume_char();
        }
        Err(CompileError::Template {
            message: "unterminated string literal".into(),
            range: Some(DiagnosticSourceRange {
                start: self.base_offset + start,
                end: self.base_offset + self.pos,
            }),
        })
    }

    fn parse_braced_js_expr(&mut self) -> Result<JsExpr, CompileError> {
        let _brace_start = self.pos;
        self.expect("{")?;
        let start = self.pos;
        let mut depth: i32 = 1;
        let mut in_single = false;
        let mut in_double = false;
        let mut in_backtick = false;
        let mut escaped = false;

        while !self.is_eof() {
            let c = self.consume_char().ok_or_else(|| {
                CompileError::Template {
                    message: "'{' expression without matching '}' in template".into(),
                    range: Some(DiagnosticSourceRange {
                        start: self.base_offset + _brace_start,
                        end: self.base_offset + self.pos,
                    }),
                }
            })?;

            if escaped {
                escaped = false;
                continue;
            }

            if c == '\\' {
                escaped = true;
                continue;
            }

            if in_single {
                if c == '\'' {
                    in_single = false;
                }
                continue;
            }
            if in_double {
                if c == '"' {
                    in_double = false;
                }
                continue;
            }
            if in_backtick {
                if c == '`' {
                    in_backtick = false;
                }
                continue;
            }

            if c == '\'' {
                in_single = true;
                continue;
            }
            if c == '"' {
                in_double = true;
                continue;
            }
            if c == '`' {
                in_backtick = true;
                continue;
            }

            if c == '{' {
                depth += 1;
                continue;
            }
            if c == '}' {
                depth -= 1;
                if depth == 0 {
                    let end = self.pos - 1;
                    let expr_src = &self.input[start..end];
                    let expr_trimmed = expr_src.trim();
                    if expr_trimmed.is_empty() {
                        // TODO: use range
                        return Err(CompileError::Template {
                            message: "empty {} expression in template".into(),
                            range: Some(DiagnosticSourceRange {
                                start: self.base_offset + start,
                                end: self.base_offset + end,
                            }),
                        });
                    }
                    // Compute absolute offsets for diagnostics.
                    let leading_ws = expr_src.len() - expr_src.trim_start().len();
                    let trailing_ws = expr_src.len() - expr_src.trim_end().len();

                    let abs_start = self.base_offset + start + leading_ws;
                    let abs_end = self.base_offset + end - trailing_ws;

                    return Ok(JsExpr {
                        code: expr_trimmed.to_string(),
                        span: Some(SourceRange {
                            start: abs_start,
                            end: abs_end,
                        }),
                    });
                }
                continue;
            }
        }

        Err(CompileError::Template {
            message: "'{' expression without matching '}' in template".into(),
            range: Some(DiagnosticSourceRange {
                start: self.base_offset + _brace_start,
                end: self.base_offset + self.pos,
            }),
        })
    }
}
