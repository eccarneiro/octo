#!/usr/bin/env bun
import { Command } from "commander";
import { intro } from "@clack/prompts";
import color from "chalk";
import figlet from "figlet";
import { showMainMenu } from "./ui/menu.js";
import { dataCommand } from "./commands/data.js";
import { youtubeCommand } from "./commands/youtube.js";

const program = new Command();

function showWelcomeBanner() {
  console.clear();

  console.log(
    color.cyan(
      figlet.textSync("OCTO CLI", {
        font: "Slant",
        horizontalLayout: "default",
        verticalLayout: "default",
      }),
    ),
  );

  console.log(color.dim(" v0.0.1 • The Ultimate Converter Engine\n"));
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
    .requiredOption("-t, --to <format>", "Formato de saída: json, csv, yaml")
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
