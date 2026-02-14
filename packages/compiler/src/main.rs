use std::path::PathBuf;

use clap::{Parser, Subcommand};
use luminjs::diagnostic::DiagnosticSeverity;
use luminjs::error::CompileError;
use owo_colors::OwoColorize;

/// LuminJS compiler CLI
#[derive(Parser, Debug)]
#[command(name = "luminc", version, about = "LuminJS compiler", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Compile a .lumin file into a JS module
    Build {
        /// Input .lumin file
        input: PathBuf,

        /// Output directory
        #[arg(short, long, default_value = "dist")]
        out: PathBuf,

        /// Diagnostics output format
        #[arg(long, default_value = "pretty")]
        format: OutputFormat,

        /// Do not write output files; only run parsing/validation and print diagnostics
        #[arg(long)]
        no_emit: bool,

        /// Do not emit a single bundle.js; output a module per file
        #[arg(long)]
        no_bundle: bool,

        /// Do not generate an index.html file
        #[arg(long)]
        no_html: bool,
    },
}

#[derive(clap::ValueEnum, Clone, Debug)]
enum OutputFormat {
    Pretty,
    Json,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Build {
            input,
            out,
            format,
            no_emit,
            no_bundle,
            no_html,
        } => {
            let bundle = !no_bundle;
            match run_build(
                input.clone(),
                out.clone(),
                format.clone(),
                no_emit,
                bundle,
                no_html,
            ) {
                Ok(js) => {
                if matches!(format, OutputFormat::Json) {
                    let source = std::fs::read_to_string(&input).unwrap_or_default();
                    let component = luminjs::parser::parse_component(&source).unwrap();
                    let component_name = input.file_stem().and_then(|s| s.to_str()).unwrap_or("Component");
                    let ts = luminjs::ts_codegen::generate_ts(&component, component_name);

                    let payload = serde_json::json!({
                        "file": input.display().to_string(),
                        "js": js,
                        "ts": ts,
                        "diagnostics": [],
                    });
                    println!("{}", serde_json::to_string_pretty(&payload).unwrap());
                }
                }
                Err(err) => {
                    if err.to_string() == "build failed" {
                        std::process::exit(1);
                    }

                    match format {
                        OutputFormat::Json => {
                            let mut payload = serde_json::json!({
                                "file": input.display().to_string(),
                                "error": err.to_string(),
                            });

                            if let Some(ce) = err.downcast_ref::<CompileError>() {
                                let range = match ce {
                                    CompileError::Syntax { range, .. } => range,
                                    CompileError::InvalidStructure { range, .. } => range,
                                    CompileError::Template { range, .. } => range,
                                };

                                if let Some(r) = range {
                                    if let Ok(source) = std::fs::read_to_string(&input) {
                                        let starts =
                                            luminjs::diagnostic::compute_line_starts(&source);
                                        let (start_lc, end_lc) =
                                            luminjs::diagnostic::range_to_line_cols(
                                                &starts, r.start, r.end,
                                            );

                                        payload = serde_json::json!({
                                           "file": input.display().to_string(),
                                           "error": err.to_string(),
                                           "line": start_lc.line,
                                           "column": start_lc.col,
                                           "endLine": end_lc.line,
                                           "endColumn": end_lc.col
                                        });
                                    }
                                }
                            }

                            println!("{}", serde_json::to_string_pretty(&payload).unwrap());
                        }
                        OutputFormat::Pretty => {
                            eprintln!("error: {:#}", err);
                        }
                    }
                    std::process::exit(1);
                }
            }
        }
    }
}

fn run_build(
    input: PathBuf,
    out_dir: PathBuf,
    format: OutputFormat,
    no_emit: bool,
    bundle: bool,
    no_html: bool,
) -> anyhow::Result<String> {
    let (js, diags) = if bundle {
        let res = luminjs::bundler::bundle_entry(&input)?;
        (res.js, res.diagnostics)
    } else {
        luminjs::compile_file_with_diagnostics(&input)?
    };
    if !diags.is_empty() {
        match format {
            OutputFormat::Json => {
                let source = std::fs::read_to_string(&input).unwrap_or_default();
                let component_res = luminjs::parser::parse_component(&source);
                let ts = if let Ok(component) = component_res {
                    let component_name = input.file_stem().and_then(|s| s.to_str()).unwrap_or("Component");
                    luminjs::ts_codegen::generate_ts(&component, component_name)
                } else {
                    String::new()
                };

                let payload = serde_json::json!({
                    "file": input.display().to_string(),
                    "ts": ts,
                    "diagnostics": diags,
                });
                println!("{}", serde_json::to_string_pretty(&payload)?);
            }
            OutputFormat::Pretty => {
                for d in diags {
                    let (sev, sev_colored) = match d.severity {
                        DiagnosticSeverity::Error => ("error", "error".red().bold().to_string()),
                        DiagnosticSeverity::Warning => ("warning", "warning".yellow().bold().to_string()),
                    };
                    let loc = format!("{}:{}:{}", input.display(), d.start.line, d.start.col);
                    eprintln!(
                        "{}: {}: {}",
                        loc.cyan(),
                        sev_colored,
                        d.message
                    );
                    let _ = sev;
                }
            }
        }
        return Err(anyhow::anyhow!("build failed"));
    }

    if no_emit {
        if matches!(format, OutputFormat::Pretty) {
            println!("{}", "ok (no-emit)".green().bold());
        }
        return Ok(js);
    }

    std::fs::create_dir_all(&out_dir)?;

    let file_name = input
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| anyhow::anyhow!("invalid input file name"))?;

    let out_file_name = if bundle {
        "bundle.js".to_string()
    } else if let Some(stripped) = file_name.strip_suffix(".lumin") {
        format!("{}.js", stripped)
    } else {
        format!("{}.js", file_name)
    };

    let out_path = out_dir.join(out_file_name);
    std::fs::write(&out_path, &js)?;

    if !bundle {
        // Copy runtime.js if it exists in the project directory (module mode)
        let runtime_src = PathBuf::from("runtime.js");
        if runtime_src.exists() {
            let runtime_dst = out_dir.join("runtime.js");
            std::fs::copy(&runtime_src, &runtime_dst)?;
        }
    }

    if no_html {
        return Ok(js);
    }

    // Generate a simple index.html in the output directory that wires up hydrate
    let module_file = out_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| anyhow::anyhow!("invalid output file name"))?;

    let index_html = if bundle {
        format!(
            r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LuminJS App</title>
  </head>
  <body>
    <div id="app"></div>

    <script type="module">
      import {{ hydrate }} from './{0}';
      hydrate(document.getElementById('app'));
    </script>
  </body>
</html>
"#,
            module_file
        )
    } else {
        format!(
            r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LuminJS App</title>
  </head>
  <body>
    <div id="app"></div>

    <script type="module">
      import {{ hydrate }} from './{0}';
      hydrate(document.getElementById('app'));
    </script>
  </body>
</html>
"#,
            module_file
        )
    };

    let index_path = out_dir.join("index.html");
    std::fs::write(index_path, index_html)?;

    if matches!(format, OutputFormat::Pretty) {
        println!(
            "{} {} -> {}",
            "compiled".green().bold(),
            input.display(),
            out_path.display()
        );
    }

    Ok(js)
}
