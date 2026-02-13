use std::path::PathBuf;

use clap::{Parser, Subcommand};
use luminjs::diagnostic::DiagnosticSeverity;
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

        /// Emit a single bundle.js instead of a module per file
        #[arg(long, default_value_t = true)]
        bundle: bool,
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
            bundle,
        } => {
            if let Err(err) = run_build(input, out, format, no_emit, bundle) {
                eprintln!("error: {:#}", err);
                std::process::exit(1);
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
) -> anyhow::Result<()> {
    let (js, diags) = if bundle {
        let res = luminjs::bundler::bundle_entry(&input)?;
        (res.js, res.diagnostics)
    } else {
        luminjs::compile_file_with_diagnostics(&input)?
    };
    if !diags.is_empty() {
        match format {
            OutputFormat::Json => {
                let payload = serde_json::json!({
                    "file": input.display().to_string(),
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
        return Ok(());
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
    std::fs::write(&out_path, js)?;

    if !bundle {
        // Copy runtime.js if it exists in the project directory (module mode)
        let runtime_src = PathBuf::from("runtime.js");
        if runtime_src.exists() {
            let runtime_dst = out_dir.join("runtime.js");
            std::fs::copy(&runtime_src, &runtime_dst)?;
        }
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
    <title>LuminJS MVP</title>
  </head>
  <body>
    <div id="app"></div>

    <script src="./{0}"></script>
    <script>
      window.Lumin.hydrate(document.getElementById('app'));
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
    <title>LuminJS MVP</title>
  </head>
  <body>
    <div id="app"></div>

    <script type="module">
      import {{ hydrate }} from './{0}';

      const root = document.getElementById('app');
      hydrate(root);
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

    Ok(())
}
