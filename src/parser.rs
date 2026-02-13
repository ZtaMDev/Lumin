use crate::ast::*;
use crate::error::CompileError;

/// Extremely simplified parser for the MVP:
/// - Detects an optional `--- ... ---` import block at the beginning.
/// - Detects a single `<script>...</script>` block.
/// - Treats the rest as a flat template string (without deep tag parsing yet).
pub fn parse_component(source: &str) -> Result<ComponentFile, CompileError> {
    let mut rest: &str = source.trim_start();
    let source_base_ptr = source.as_ptr() as usize;

    let mut imports: Vec<ComponentImport> = Vec::new();
    let mut script: Option<ScriptBlock> = None;

    // 1) Optional imports block at the beginning
    if rest.starts_with("---") {
        let end_idx: Option<usize> = rest.find("---").and_then(|start: usize| {
            // Find the next "---" after the first occurrence
            let tail: &str = &rest[start + 3..];
            tail.find("---").map(|i: usize| start + 3 + i)
        });

        let end_idx: usize = end_idx.ok_or_else(|| {
            CompileError::Syntax("imports block '---' without closing '---'".into())
        })?;

        let imports_block: &str = &rest[3..end_idx];
        imports = parse_imports_block(imports_block)?;

        rest = &rest[end_idx + 3..];
    }

    // 2) Optional <script> block
    if let Some(script_start) = rest.find("<script>") {
        if script_start != 0 {
            // For now, treat anything before <script> as part of the template
        }
        let after_open: usize = script_start + "<script>".len();
        let script_end: usize = rest[after_open..]
            .find("</script>")
            .ok_or_else(|| CompileError::Syntax("<script> without closing </script>".into()))?;
        let script_code: &str = &rest[after_open..after_open + script_end];

        let rest_base_ptr = rest.as_ptr() as usize;
        let abs_start = (rest_base_ptr - source_base_ptr) + after_open;
        let abs_end = abs_start + script_code.len();

        script = Some(ScriptBlock {
            code: script_code.to_string(),
            span: Some(SourceRange {
                start: abs_start,
                end: abs_end,
            }),
        });

        // resto después de </script>
        let after_script: usize = after_open + script_end + "</script>".len();
        rest = &rest[after_script..];
    }

    let template_src: &str = rest.trim();
    let template: Vec<TemplateNode> = if template_src.is_empty() {
        Vec::new()
    } else {
        let rest_base_ptr = rest.as_ptr() as usize;
        let template_base_offset = rest_base_ptr - source_base_ptr;
        let mut p = MarkupParser::new(template_src, template_base_offset);
        let nodes = p.parse_nodes(None)?;
        p.skip_ws();
        if !p.is_eof() {
            return Err(CompileError::Template("unexpected trailing input in template".into()));
        }
        nodes
    };

    Ok(ComponentFile {
        imports,
        script,
        template,
    })
}

fn parse_imports_block(block: &str) -> Result<Vec<ComponentImport>, CompileError> {
    let mut imports: Vec<ComponentImport> = Vec::new();

    for line in block.lines() {
        let line: &str = line.trim();
        if line.is_empty() {
            continue;
        }
        if !line.starts_with("import ") {
            return Err(CompileError::Syntax(format!(
                "invalid import line in imports block: {line}"
            )));
        }
        // Parse `import ... from "./X.lumin"`
        let from_idx: usize = line.find("from ").ok_or_else(|| {
            CompileError::Syntax(format!(
                "import without 'from' in imports block: {line}"
            ))
        })?;
        let spec_part: &str = line["import ".len()..from_idx].trim();
        let source_part: &str = line[from_idx + 5..].trim();
        let source: String = source_part
            .trim_matches('"')
            .trim_matches('"')
            .to_string();

        if !source.ends_with(".lumin") {
            return Err(CompileError::InvalidStructure(format!(
                "only .lumin component imports are allowed in the --- block: {source}"
            )));
        }

        let specifiers = parse_import_specifiers(spec_part)?;
        if specifiers.is_empty() {
            return Err(CompileError::Syntax(format!(
                "import missing specifiers: {line}"
            )));
        }

        imports.push(ComponentImport { specifiers, source });
    }

    Ok(imports)
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
            return Err(CompileError::Syntax(
                "combined default + named imports are not supported yet".into(),
            ));
        }
        return Ok(vec![ImportSpecifier::Default(spec.to_string())]);
    }

    // Named import list: `{ A, B as C }`
    if !spec.ends_with('}') {
        return Err(CompileError::Syntax("named imports missing closing '}'".into()));
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
            Err(CompileError::Template(format!("expected '{s}'")))
        }
    }

    fn parse_nodes(&mut self, closing_tag: Option<&str>) -> Result<Vec<TemplateNode>, CompileError> {
        let mut nodes: Vec<TemplateNode> = Vec::new();

        while !self.is_eof() {
            if self.starts_with("</") {
                let _saved = self.pos;
                self.pos += 2;
                let name = self.parse_tag_name()?;
                self.skip_ws();
                self.expect(">")?;

                if let Some(expected) = closing_tag {
                    if name != expected {
                        return Err(CompileError::Template(format!(
                            "mismatched closing tag </{name}>; expected </{expected}>"
                        )));
                    }
                    return Ok(nodes);
                }

                return Err(CompileError::Template(format!(
                    "unexpected closing tag </{name}>"
                )));
            }

            if self.starts_with("<") {
                let el = self.parse_element()?;
                nodes.push(TemplateNode::Element(el));
                continue;
            }

            if self.starts_with("{") {
                let expr = self.parse_braced_js_expr()?;
                nodes.push(TemplateNode::Expr(expr));
                continue;
            }

            let text = self.parse_text()?;
            if !text.is_empty() {
                nodes.push(TemplateNode::Text(text));
            }
        }

        if let Some(expected) = closing_tag {
            return Err(CompileError::Template(format!(
                "unclosed tag <{expected}>"
            )));
        }

        Ok(nodes)
    }

    fn parse_text(&mut self) -> Result<String, CompileError> {
        let start = self.pos;
        while !self.is_eof() {
            if self.starts_with("<") || self.starts_with("{") {
                break;
            }
            self.consume_char();
        }
        Ok(self.input[start..self.pos].to_string())
    }

    fn parse_element(&mut self) -> Result<ElementNode, CompileError> {
        self.expect("<")?;
        if self.starts_with("/") {
            return Err(CompileError::Template("unexpected closing tag".into()));
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
        let children = self.parse_nodes(Some(&tag_name))?;

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
            return Err(CompileError::Template("expected tag name".into()));
        }
        Ok(self.input[start..self.pos].to_string())
    }

    fn parse_attributes(&mut self) -> Result<Vec<AttributeNode>, CompileError> {
        let mut attrs: Vec<AttributeNode> = Vec::new();

        loop {
            self.skip_ws();
            if self.is_eof() {
                return Err(CompileError::Template("unexpected end of input while parsing tag".into()));
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
                    if name.starts_with("on") {
                        attrs.push(AttributeNode::EventHandler { name, expr });
                    } else {
                        attrs.push(AttributeNode::Dynamic { name, expr });
                    }
                    continue;
                }

                return Err(CompileError::Template(format!(
                    "invalid attribute value for '{name}'"
                )));
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
            return Err(CompileError::Template("expected attribute name".into()));
        }
        Ok(self.input[start..self.pos].to_string())
    }

    fn parse_quoted_string(&mut self, quote: char) -> Result<String, CompileError> {
        let first = self.consume_char();
        if first != Some(quote) {
            return Err(CompileError::Template("expected quoted string".into()));
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
        Err(CompileError::Template("unterminated string literal".into()))
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
                CompileError::Template("'{' expression without matching '}' in template".into())
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
                        return Err(CompileError::Template("empty {} expression in template".into()));
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

        Err(CompileError::Template(
            "'{' expression without matching '}' in template".into(),
        ))
    }
}
