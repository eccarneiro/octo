import { select, isCancel, cancel, text, outro } from "@clack/prompts";
import os from "os";
import path from "path";
import fs from "fs-extra";
import { dataCommand } from "../commands/data.js";
import { youtubeCommand, isValidYoutubeUrl } from "../commands/youtube.js";
import color from "chalk";
export async function showMainMenu() {
  const action = await select({
    message: "Escolha um módulo:",
    options: [
      {
        value: "video",
        label: "🎬 Vídeo Tools",
        hint: "Comprimir, Converter e Redimensionar",
      },
      {
        value: "youtube",
        label: "📺 YouTube Downloader",
        hint: "Baixar vídeo ou áudio",
      },
      {
        value: "docs",
        label: "📄 Documentos",
        hint: "PDF, Docx, Conversões de Texto",
      },
      {
        value: "data",
        label: "💾 Dados & Utils",
        hint: "JSON, CSV, Base64, Excel",
      },
      { value: "exit", label: "🚪 Sair" },
    ],
  });

  if (isCancel(action) || action === "exit") {
    cancel("Operação cancelada.");
    process.exit(0);
  }

  switch (action) {
    case "video":
      await handleVideoFlow();
      break;
    case "youtube":
      await handleYoutubeFlow();
      break;
    case "data":
      await handleDataFlow();
      break;
    default:
      outro("Funcionalidade ainda não implementada.");
  }
}

async function handleVideoFlow() {
  const pathInput = await text({
    message: "Qual o caminho da pasta com os vídeos?",
    placeholder: "./videos",
    validate(value) {
      if (value?.length === 0) return "O caminho é obrigatório!";
    },
  });

  if (isCancel(pathInput)) return;

  const presetInput = await select({
    message: "Qual formato de saída?",
    options: [
      {
        value: "h265",
        label: "H.265 (HEVC)",
        hint: "Melhor para Mobile/Web (Arquivo menor)",
      },
      { value: "h264", label: "H.264", hint: "Compatibilidade total" },
      {
        value: "MP4",
        label: "MP4 (Compatível com todos os dispositivos)",
        hint: "Videos em MP4 sem reencodificação",
      },
      { value: "MOV", label: "MOV (Formato Apple)", hint: "Vídeos em MOV" },
      { value: "AVI", label: "AVI (Formato Antigo)", hint: "Vídeos em AVI" },
    ],
  });

  if (isCancel(presetInput)) return;

  console.log("\n");
  console.log("Em desenvolvimento...");
}
async function handleDataFlow() {
  const fileInput = await text({
    message: "Caminho do arquivo (JSON, CSV ou YAML):",
    placeholder: "./data/users.json",
    validate(value) {
      if (!value) return "O caminho é obrigatório";
    },
  });
  if (isCancel(fileInput)) return;

  const formatInput = await select({
    message: "Converter para qual formato?",
    options: [
      { value: "csv", label: "CSV", hint: "Para Excel/Planilhas" },
      { value: "json", label: "JSON", hint: "Para APIs/Frontend" },
      { value: "yaml", label: "YAML", hint: "Para Configs/DevOps" },
    ],
  });
  if (isCancel(formatInput)) return;

  console.log("\n");
  await dataCommand(fileInput as string, { to: formatInput as any });
}

async function handleYoutubeFlow() {
  const urlInput = await text({
    message: "Cole o link do YouTube:",
    placeholder: "https://www.youtube.com/watch?v=...",
    validate(value) {
      if (!value || !isValidYoutubeUrl(value)) {
        return "Link inválido. Aceito: youtube.com/watch, youtu.be, shorts, embed, live, music.youtube.com";
      }
    },
  });

  if (isCancel(urlInput)) return;

  const formatInput = await select({
    message: "O que você deseja baixar?",
    options: [
      {
        value: "video",
        label: "🎬 Vídeo (MP4)",
        hint: "Baixa vídeo e áudio juntos",
      },
      { value: "audio", label: "🎵 Áudio (MP3)", hint: "Extrai apenas o som" },
    ],
  });

  if (isCancel(formatInput)) return;

  let quality: "best" | "1080" | "720" | "480" = "best";

  if (formatInput === "video") {
    const qualityInput = await select({
      message: "Escolha a qualidade do vídeo:",
      options: [
        { value: "best", label: "🏆 Melhor disponível", hint: "Máxima qualidade" },
        { value: "1080", label: "📺 1080p (Full HD)", hint: "Recomendado" },
        { value: "720", label: "📱 720p (HD)", hint: "Bom equilíbrio" },
        { value: "480", label: "💾 480p (SD)", hint: "Arquivo menor" },
      ],
    });

    if (isCancel(qualityInput)) return;
    quality = qualityInput as any;
  }

  const desktopPath = path.join(os.homedir(), "Desktop");

  const outputInput = await text({
    message: "Onde salvar o download?",
    placeholder: desktopPath,
    defaultValue: desktopPath,
    validate(value) {
      if (!value) return "O caminho é obrigatório!";
      const resolved = path.resolve(value);
      const parent = path.dirname(resolved);
      if (!fs.existsSync(parent)) {
        return `Pasta não encontrada: ${parent}\nDigite um caminho válido.`;
      }
    },
  });

  if (isCancel(outputInput)) return;

  await youtubeCommand(urlInput as string, {
    format: formatInput as any,
    quality,
    outputDir: outputInput as string,
  });
}

