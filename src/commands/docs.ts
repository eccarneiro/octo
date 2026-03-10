import path from "path";
import os from "os";
import fs from "fs-extra";
import { Listr } from "listr2";
import color from "chalk";
import { outro } from "@clack/prompts";
import { marked, Renderer } from "marked";
import puppeteer from "puppeteer";

export type DocsAction = "md-to-html" | "md-to-pdf";

export interface DocsOptions {
  action: DocsAction;
  inputFile: string;
  outputDir: string;
}

const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdx"];

function isMarkdownFile(file: string): boolean {
  return MARKDOWN_EXTENSIONS.includes(path.extname(file).toLowerCase());
}

function wrapHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
    });
  </script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a2e;
      background: #fafafa;
      line-height: 1.7;
    }
    h1, h2, h3, h4 { margin: 1.5em 0 0.5em; color: #16213e; }
    h1 { font-size: 2em; border-bottom: 2px solid #e94560; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
    p { margin: 0.8em 0; }
    a { color: #e94560; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code {
      background: #f0f0f0; padding: 2px 6px; border-radius: 4px;
      font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.9em;
    }
    pre {
      background: #1a1a2e; color: #eee; padding: 16px; border-radius: 8px;
      overflow-x: auto; margin: 1em 0;
    }
    pre code { background: none; color: inherit; padding: 0; }
    blockquote {
      border-left: 4px solid #e94560; padding: 8px 16px; margin: 1em 0;
      background: #fff5f5; color: #555;
    }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #16213e; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    ul, ol { margin: 0.8em 0; padding-left: 2em; }
    li { margin: 0.3em 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
    @media print {
      body { max-width: 100%; padding: 20px; }
      pre { white-space: pre-wrap; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export const docsCommand = async (options: DocsOptions) => {
  const inputFile = path.resolve(options.inputFile);
  const outputDir = path.resolve(options.outputDir || path.join(os.homedir(), "Desktop"));

  if (!fs.existsSync(inputFile)) {
    console.error(color.red(`\n❌ Arquivo não encontrado: ${inputFile}\n`));
    return;
  }

  if (!isMarkdownFile(inputFile)) {
    console.error(color.red(`\n❌ Formato não suportado: ${path.extname(inputFile)}`));
    console.error(color.dim(`   Aceito: ${MARKDOWN_EXTENSIONS.join(", ")}\n`));
    return;
  }

  try {
    fs.ensureDirSync(outputDir);
  } catch {
    console.error(color.red(`\n❌ Não foi possível criar a pasta: ${outputDir}\n`));
    return;
  }

  const baseName = path.basename(inputFile, path.extname(inputFile));
  const ext = options.action === "md-to-html" ? ".html" : ".pdf";
  const outputFile = path.join(outputDir, `${baseName}${ext}`);

  console.log(color.magenta(`\n Entrada: ${inputFile}`));
  console.log(color.cyan(` Saída:   ${outputDir}`));
  console.log(color.yellow(` Ação:    ${options.action === "md-to-html" ? "Markdown → HTML" : "Markdown → PDF"}\n`));

  const tasks = new Listr([
    {
      title: "Lendo arquivo Markdown...",
      task: async (ctx) => {
        ctx.rawContent = await fs.readFile(inputFile, "utf-8");
        ctx.title = baseName;
      },
    },
    {
      title: "Convertendo para HTML...",
      task: async (ctx, task) => {
        // Intercepta e renderiza blocos de Mermaid.js corretamente
        const renderer = new Renderer();
        const originalCode = renderer.code.bind(renderer);
        renderer.code = function (...args: any[]) {
          const codeOptions = args[0];
          const text = typeof codeOptions === "string" ? codeOptions : codeOptions.text;
          const lang = typeof codeOptions === "string" ? args[1] : codeOptions.lang;
          
          if (lang === "mermaid") {
            return `<div class="mermaid">\n${text}\n</div>\n`;
          }
          return originalCode.apply(this, args as any);
        };

        const htmlBody = await marked.parse(ctx.rawContent, { renderer });
        ctx.html = wrapHtml(htmlBody, ctx.title);
        task.title = "Estrutura HTML gerada com sucesso";
      },
    },
    {
      title: options.action === "md-to-html" ? "Salvando HTML..." : "Renderizando PDF com Puppeteer...",
      task: async (ctx, task) => {
        if (options.action === "md-to-html") {
          await fs.writeFile(outputFile, ctx.html);
          task.title = color.green(`✓ HTML Salvo: ${path.basename(outputFile)}`);
        } else {
          task.output = "Inicializando Headless Browser...";
          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();
          
          task.output = "Injetando código e aguardando diagramas (Mermaid)...";
          await page.setContent(ctx.html, { waitUntil: "networkidle0" });
          
          task.output = "Imprimindo PDF...";
          await page.pdf({ path: outputFile, format: "A4", printBackground: true });
          
          await browser.close();
          task.title = color.green(`✓ PDF Renderizado com sucesso: ${path.basename(outputFile)}`);
        }
      },
    },
  ]);

  try {
    await tasks.run();
    if (options.action === "md-to-pdf") {
      outro(color.green(`🎉 PDF gerado com diagramas suportados nativamente e salvo em: ${outputFile}`));
    } else {
      outro(color.green(`🎉 HTML gerado com sucesso em: ${outputFile}`));
    }
  } catch (e: any) {
    outro(color.red(`❌ Erro na conversão: ${e.message}`));
  }
};
