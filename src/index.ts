#!/usr/bin/env bun
import { Command } from "commander";
import { intro } from "@clack/prompts";
import color from "chalk";
import figlet from "figlet";
import { showMainMenu } from "./ui/menu.js";
import { dataCommand } from "./commands/data.js";
import { youtubeCommand } from "./commands/youtube.js";
import { videoCommand } from "./commands/video.js";
import { docsCommand } from "./commands/docs.js";
import { imageCommand } from "./commands/image.js";
import { aiCommand } from "./commands/ai.js";

import boxen from "boxen";
import gradient from "gradient-string";

const program = new Command();

function showWelcomeBanner() {
  console.clear();

  const text = figlet.textSync("OCTO CLI", {
    font: "Slant",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  const bannerText = gradient(["#00f2fe", "#4facfe", "#f093fb", "#f5576c"])(text);
  
  const versionText = color.dim("v0.0.1 • The Ultimate Converter Engine");
  
  const box = boxen(`${bannerText}\n\n${versionText}`, {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "cyan",
    align: "center",
    backgroundColor: "#000000",
  });

  console.log(box);
}

async function main() {
  program
    .name("octo")
    .description("CLI para automação de conversões de mídia e dados")
    .version("0.0.1");
  program
    .command("data")
    .description("Converte arquivos de dados (JSON <-> CSV <-> YAML)")
    .argument("<file>", "Arquivo de entrada")
    .requiredOption("-t, --to <format>", "Formato de saída: json, csv, yaml, parquet")
    .action((file, options) => dataCommand(file, { to: options.to }));
  program
    .command("youtube")
    .description("Baixa vídeos ou áudios do YouTube")
    .argument("<url>", "URL do vídeo no YouTube")
    .option("-a, --audio", "Baixar apenas áudio (MP3)")
    .option(
      "-q, --quality <quality>",
      "Qualidade do vídeo: best, 1080, 720, 480",
      "best",
    )
    .option(
      "-o, --output <dir>",
      "Diretório de saída (padrão: ~/Desktop)",
    )
    .action((url, options) => {
      const format = options.audio ? "audio" : "video";
      youtubeCommand(url, { format, quality: options.quality, outputDir: options.output });
    });
  program
    .command("video")
    .description("Processamento de vídeo em lote (comprimir, converter, redimensionar)")
    .requiredOption("-a, --action <action>", "Ação: compress, convert, resize")
    .requiredOption("-i, --input <dir>", "Pasta de origem com os vídeos")
    .option("-o, --output <dir>", "Pasta de destino (padrão: ~/Desktop)")
    .option("-p, --preset <preset>", "Codec/Preset: h264, h265, web-optimized (para compress)", "h264")
    .option("-f, --format <format>", "Formato: mp4, mov, avi, webm (para convert)", "mp4")
    .option("-r, --resolution <res>", "Resolução: 1080, 720, 480 (para resize)", "720")
    .action((options) => {
      videoCommand({
        action: options.action,
        inputDir: options.input,
        outputDir: options.output,
        preset: options.preset,
        format: options.format,
        resolution: options.resolution,
      });
    });
  program
    .command("docs")
    .description("Converte documentos Markdown para HTML ou PDF")
    .argument("<file>", "Arquivo Markdown de entrada")
    .option("-t, --to <format>", "Formato: html, pdf", "html")
    .option("-o, --output <dir>", "Pasta de destino (padrão: ~/Desktop)")
    .action((file, options) => {
      const action = options.to === "pdf" ? "md-to-pdf" : "md-to-html";
      docsCommand({ action: action as any, inputFile: file, outputDir: options.output });
    });
  program
    .command("image")
    .description("Processamento de imagens em lote (comprimir, converter, redimensionar)")
    .requiredOption("-a, --action <action>", "Ação: compress, convert, resize")
    .requiredOption("-i, --input <dir>", "Pasta de origem com as imagens")
    .option("-o, --output <dir>", "Pasta de destino (padrão: ~/Desktop)")
    .option("-f, --format <format>", "Formato: png, jpg, webp, avif (para convert)", "avif")
    .option("-q, --quality <n>", "Qualidade 1-100 (para compress)", "80")
    .option("-w, --width <n>", "Largura em px (para resize)")
    .option("--height <n>", "Altura em px (para resize)")
    .action((options) => {
      imageCommand({
        action: options.action,
        inputDir: options.input,
        outputDir: options.output,
        format: options.format,
        quality: parseInt(options.quality),
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined,
      });
    });
  program
    .command("ai")
    .description("Ferramentas de pré-processamento para Machine Learning / Data Science")
    .requiredOption("-a, --action <action>", "Ação: prepare-images, spectrogram, split-dataset")
    .requiredOption("-i, --input <dir>", "Pasta de origem com o dataset")
    .option("-o, --output <dir>", "Pasta de destino")
    .option("--size <size>", "Dimensões para normatizar imagens (ex: 224x224)", "224x224")
    .option("--grayscale", "Converter imagens para tons de cinza", false)
    .option("--ratios <ratios>", "Proporções para o split-dataset (train-test-val, ex: 80-10-10)", "80-10-10")
    .action((options) => {
      aiCommand({
        action: options.action,
        inputDir: options.input,
        outputDir: options.output,
        size: options.size,
        grayscale: options.grayscale,
        ratios: options.ratios,
      });
    });

  const args = process.argv.slice(2);

  if (args.length > 0) {
    program.parse(process.argv);
  } else {
    showWelcomeBanner();
    intro(color.bgCyan.black("Olá! Como posso te ajudar hoje?"));
    await showMainMenu();
  }
}

main().catch(console.error);
