use swc_common::{FileName, SourceMap, sync::Lrc, GLOBALS, Globals, Mark, DUMMY_SP};
use swc_ecma_ast::{Program, Module};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsConfig};
use swc_ecma_transforms_base::resolver;
use swc_ecma_transforms_typescript::strip;
use swc_ecma_visit::{FoldWith, Fold};
use swc_ecma_codegen::{Emitter, Config};

struct DropSpan;
impl Fold for DropSpan {
    fn fold_span(&mut self, _: swc_common::Span) -> swc_common::Span {
        DUMMY_SP
    }
}

pub fn transpile_ts_module(module: Module) -> Module {
    let globals = Globals::default();
    GLOBALS.set(&globals, || {
        let unresolved_mark = Mark::new();
        let top_level_mark = Mark::new();
        let mut program = Program::Module(module);

        // Run resolver pass
        program = program.fold_with(&mut resolver(unresolved_mark, top_level_mark, false));

        // Strip TS types
        program = program.fold_with(&mut strip(top_level_mark));
        
        match program {
            Program::Module(m) => m,
            _ => unreachable!("Strip always returns the same program type for modules"),
        }
    })
}

pub fn emit_module_to_string(module: &Module) -> String {
    let mut module = module.clone();
    module = module.fold_with(&mut DropSpan);

    let cm: Lrc<SourceMap> = Default::default();
    let mut buf = vec![];
    {
        let mut emitter = Emitter {
            cfg: Config::default().with_minify(false),
            cm: cm.clone(),
            comments: None,
            wr: Box::new(swc_ecma_codegen::text_writer::JsWriter::new(cm, "\n", &mut buf, None)),
        };
        let _ = emitter.emit_module(&module);
    }
    String::from_utf8_lossy(&buf).to_string().trim().to_string()
}

pub fn transpile_ts_snippet(ts_code: &str) -> String {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(FileName::Custom("input.ts".into()), ts_code.into());

    let syntax = Syntax::Typescript(TsConfig {
        ..Default::default()
    });

    let mut parser = Parser::new(syntax, StringInput::from(&*fm), None);
    let module = match parser.parse_module() {
        Ok(m) => m,
        Err(_) => return ts_code.to_string(), 
    };

    let transpiled = transpile_ts_module(module);
    let mut out = emit_module_to_string(&transpiled);
    
    // Trim trailing semicolon for template expressions
    if out.ends_with(';') {
        out.pop();
    }
    out.trim().to_string()
}
