use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ComponentFile {
    pub imports: Vec<ComponentImport>,
    pub script: Option<ScriptBlock>,
    pub style: Option<StyleBlock>,
    pub template: Vec<TemplateNode>,
    pub defined_slots: Vec<String>,
    pub head: Option<HeadMetadata>,
}

#[derive(Debug, Clone)]
pub struct HeadMetadata {
    pub title: Option<String>,
    pub meta: Vec<HashMap<String, String>>,
    pub link: Vec<HashMap<String, String>>,
    pub script: Vec<HashMap<String, String>>,
}

#[derive(Debug, Clone)]
pub struct StyleBlock {
    pub code: String,
    pub span: Option<SourceRange>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SourceRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone)]
pub struct ComponentImport {
    pub specifiers: Vec<ImportSpecifier>,
    pub source: String,
}

#[derive(Debug, Clone)]
pub enum ImportSpecifier {
    Default(String),
    Named(String),
    NamedAlias { local: String, imported: String },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PropKind {
    Prop,
    Signal,
}

#[derive(Debug, Clone)]
pub struct Prop {
    pub name: String,
    pub default_value: Option<String>,
    pub original_default_value: Option<String>, // Preserves TS types
    pub kind: PropKind,
}

#[derive(Debug, Clone)]
pub struct ScriptImport {
    pub code: String,
}

#[derive(Debug, Clone)]
pub struct ScriptBlock {
    pub code: String,
    pub original_code: String, // Preserved for type checking
    pub imports: Vec<ScriptImport>,
    pub props: Vec<Prop>,
    pub span: Option<SourceRange>,
}

#[derive(Debug, Clone)]
pub struct JsExpr {
    pub code: String,
    pub span: Option<SourceRange>,
}

#[derive(Debug, Clone)]
pub enum TemplateNode {
    Element(ElementNode),
    Text(String),
    Expr(JsExpr),
    ControlFlow(ControlFlowBlock),
    Slot(SlotNode),
}

#[derive(Debug, Clone)]
pub struct SlotNode {
    pub name: Option<String>,
    pub fallback: Vec<TemplateNode>,
}

#[derive(Debug, Clone)]
pub enum ControlFlowBlock {
    If {
        condition: JsExpr,
        then_branch: Vec<TemplateNode>,
        else_ifs: Vec<(JsExpr, Vec<TemplateNode>)>,
        else_branch: Option<Vec<TemplateNode>>,
    },
    For {
        params: String,
        key_expr: Option<String>,
        body: Vec<TemplateNode>,
    },
}

#[derive(Debug, Clone)]
pub struct ElementNode {
    pub tag_name: String,
    pub tag_span: Option<SourceRange>,
    pub attributes: Vec<AttributeNode>,
    pub children: Vec<TemplateNode>,
    pub self_closing: bool,
}

#[derive(Debug, Clone)]
pub enum AttributeNode {
    Static { name: String, value: String },
    Dynamic { name: String, expr: JsExpr },
    EventHandler { name: String, expr: JsExpr },
    Bind { property: String, expr: JsExpr },
}
