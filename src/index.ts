#!/usr/bin/env bun
import { Command } from "commander";
import { intro, outro } from "@clack/prompts";
import color from "chalk";
import figlet from "figlet";
import { showMainMenu } from "./ui/menu.js";
import { dataCommand } from "./commands/data.js";

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

  // --- REGISTRO DE COMANDOS (Para uso direto) ---
  //   program
  //     .command("video")
  //     .description("Processamento de vídeo em lote")
  //     .argument("<path>", "Caminho da pasta")
  //     .option("-p, --preset <type>", "h265 (padrão) ou h264", "h265")
  //     .action(console.log); // Substitua por videoCommand depois

  // Adicionaremos os outros comandos aqui depois...

  // Lógica de Entrada
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
