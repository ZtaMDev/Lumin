use std::fs;

#[test]
fn compiles_simple_lumin_file_to_js() {
    let tmp_dir: tempfile::TempDir = tempfile::tempdir().expect("tempdir");
    let input_path: std::path::PathBuf = tmp_dir.path().join("App.lumin");

    let source: &str = r#"<script>
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

    let js: String = luminjs::compile_file(&input_path).expect("compile");

    assert!(js.contains("renderToString"));
    assert!(js.contains("hydrate"));
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
fn supports_inline_arrow_event_handlers_with_blocks() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<script>
const count = signal(0)
</script>

<div>
  <button onClick={() => { count(count() + 1) }}>Inc</button>
</div>
"#;

    fs::write(&input_path, source).expect("write input");

    let js = luminjs::compile_file(&input_path).expect("compile");

    // We should emit an on-click data attribute and a synthetic handler (h0).
    assert!(js.contains("data-lumin-on-click=\"h0\""));
    assert!(js.contains("h0: () => { count(count() + 1) }"));
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
    assert!(res.diagnostics.is_empty());
    assert!(res.js.contains("const __luminComponents"));
    assert!(res.js.contains("data-lumin-mount=\"Counter\""));
}

#[test]
fn errors_when_component_tag_is_not_imported() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let input_path = tmp_dir.path().join("App.lumin");

    let source = r#"<div><Missing /></div>"#;
    fs::write(&input_path, source).expect("write input");

    let (_js, diags) = luminjs::compile_file_with_diagnostics(&input_path)
        .expect("compile_with_diagnostics");

    assert!(
        diags.iter()
            .any(|d| d.message.contains("Cannot find component 'Missing'")),
        "expected missing-component diagnostic"
    );
}

#[test]
fn bundler_does_not_include_unused_imported_components() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let app_path = tmp_dir.path().join("App.lumin");
    let counter_path = tmp_dir.path().join("Counter.lumin");

    fs::write(
        &counter_path,
        r#"<div><h1>Counter</h1></div>"#,
    )
    .expect("write counter");

    fs::write(
        &app_path,
        r#"---
import Counter from "./Counter.lumin"
---

<div><h1>App</h1></div>
"#,
    )
    .expect("write app");

    let res = luminjs::bundler::bundle_entry(&app_path).expect("bundle");
    assert!(res.diagnostics.is_empty());
    assert!(!res.js.contains("__luminComponents[\"Counter\"]"));
}
