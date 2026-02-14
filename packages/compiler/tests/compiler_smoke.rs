use std::fs;

#[test]
fn compiles_simple_lumin_file_to_js() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<script>
const count = signal(0)
function inc() {
  count(count() + 1)
}
</script>

<div>
  <h1>{count()}</h1>
  <button onClick={inc}>Increment</button>
</div>
"#;

    fs::write(&input_path, source).expect("write input");

    let js = luminjs::compile_file(&input_path).expect("compile");
    println!("Generated JS:\n{}", js);

    assert!(js.contains("import * as __LUMIN__ from 'lumin-js';"));
    assert!(js.contains("function Component"));
    assert!(js.contains("export default Component;"));
    assert!(js.contains("h('div'"));
    assert!(js.contains("h('h1'"));
    assert!(js.contains("'onClick': inc"));
}

#[test]
fn forbids_lumin_imports_inside_script_with_diagnostics() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<script>
import X from "./Card.lumin"
</script>

<div>Hello</div>
"#;
    fs::write(&input_path, source).expect("write input");

    let (_js, diags) = luminjs::compile_file_with_diagnostics(&input_path)
        .expect("compile_with_diagnostics");

    assert!(
        diags.iter().any(|d| d.message.contains("Component imports (.lumin)")),
        "expected a diagnostic about .lumin imports inside <script>"
    );
}

#[test]
fn supports_inline_arrow_event_handlers() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<script>
const count = signal(0)
</script>

<div>
  <button onClick={() => count(count() + 1)}>Inc</button>
</div>
"#;

    fs::write(&input_path, source).expect("write input");

    let js = luminjs::compile_file(&input_path).expect("compile");

    // Should contain the inline arrow in the h() call props
    assert!(js.contains("'onClick': () => count(count() + 1)"));
}

#[test]
fn errors_on_unclosed_tags() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<div><span>Hi</div>"#;
    fs::write(&input_path, source).expect("write input");

    let err = luminjs::compile_file(&input_path).expect_err("should error");
    let msg = format!("{:#}", err);
    assert!(msg.to_lowercase().contains("mismatched closing tag") || msg.to_lowercase().contains("unclosed tag"));
}

#[test]
fn reports_js_diagnostics_with_line_and_column() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    // Invalid JS expression inside { ... }
    let source = r#"<div>{(() => }</div>"#;
    fs::write(&input_path, source).expect("write input");

    let (_js, diags) = luminjs::compile_file_with_diagnostics(&input_path)
        .expect("compile_with_diagnostics");

    assert!(!diags.is_empty());
    let d = &diags[0];
    assert!(d.message.to_lowercase().contains("js parse error"));
    assert!(d.start.line >= 1);
    assert!(d.start.col >= 1);
}

#[test]
fn bundles_imported_components_and_mounts_them() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let app_path = tmp_dir.path().join("App.lumin");
    let counter_path = tmp_dir.path().join("Counter.lumin");

    let counter = r#"<script>
const count = signal(0)
function inc(){ count(count()+1) }
</script>

<div><button onClick={inc}>Inc</button><h1>{count()}</h1></div>
"#;

    let app = r#"---
import Counter from "./Counter.lumin"
---

<div><Counter /></div>
"#;

    fs::write(&counter_path, counter).expect("write counter");
    fs::write(&app_path, app).expect("write app");

    let res = luminjs::bundler::bundle_entry(&app_path).expect("bundle");
    println!("Bundled JS:\n{}", res.js);
    assert!(res.diagnostics.is_empty(), "Diagnostics: {:?}", res.diagnostics);
    
    // New ESM bundle assertions
    assert!(res.js.contains("import * as __LUMIN__ from 'lumin-js';"));
    assert!(res.js.contains("const __luminComponents = {};"));
    assert!(res.js.contains("h(__luminComponents['Counter'].default, null)"));
    assert!(res.js.contains("export function hydrate(root)"));
}

#[test]
fn supports_style_tags() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<style>
.red { color: red; }
</style>
<div class="red">Hello</div>
"#;

    fs::write(&input_path, source).expect("write input");

    let js = luminjs::compile_file(&input_path).expect("compile");

    assert!(js.contains(".red { color: red; }"));
    assert!(js.contains("const styleId = 'lumin-styles'"));
}
