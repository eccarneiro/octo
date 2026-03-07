import { select, isCancel, cancel, text, outro, confirm, note } from "@clack/prompts";
import os from "os";
import path from "path";
import fs from "fs-extra";
import { dataCommand } from "../commands/data.js";
import { youtubeCommand, isValidYoutubeUrl } from "../commands/youtube.js";
import { videoCommand } from "../commands/video.js";
import type { VideoAction } from "../commands/video.js";
import { docsCommand } from "../commands/docs.js";
import type { DocsAction } from "../commands/docs.js";
import { imageCommand } from "../commands/image.js";
import type { ImageAction } from "../commands/image.js";
import color from "chalk";

const BACK = "back";
const desktopPath = path.join(os.homedir(), "Desktop");

function backOption(label = "← Voltar") {
  return { value: BACK, label: color.dim(label) };
}


export async function showMainMenu() {
  while (true) {
    const action = await select({
      message: "Escolha um módulo:",
      options: [
        { value: "video", label: "🎬 Vídeo Tools", hint: "Comprimir, Converter e Redimensionar" },
        { value: "image", label: "🖼️  Imagem Tools", hint: "Redimensionar, Converter e Comprimir" },
        { value: "youtube", label: "📺 YouTube Downloader", hint: "Baixar vídeo ou áudio" },
        { value: "docs", label: "📄 Documentos", hint: "Markdown → HTML / PDF" },
        { value: "data", label: "💾 Dados & Utils", hint: "JSON, CSV, YAML" },
        { value: "exit", label: "🚪 Sair" },
      ],
    });

    if (isCancel(action) || action === "exit") {
      cancel("Até a próxima! 👋");
      process.exit(0);
    }

    switch (action) {
      case "video":
        await handleVideoFlow();
        break;
      case "image":
        await handleImageFlow();
        break;
      case "youtube":
        await handleYoutubeFlow();
        break;
      case "docs":
        await handleDocsFlow();
        break;
      case "data":
        await handleDataFlow();
        break;
    }
  }
}


async function handleYoutubeFlow() {
  let step = 0;
  let url = "";
  let format: "video" | "audio" = "video";
  let quality: "best" | "1080" | "720" | "480" = "best";
  let outputDir = desktopPath;

  while (step >= 0) {
    switch (step) {
      case 0: {
        const input = await text({
          message: "Cole o link do YouTube:",
          placeholder: "https://www.youtube.com/watch?v=...",
          defaultValue: url || undefined,
          validate(value) {
            if (!value || !isValidYoutubeUrl(value)) {
              return "Link inválido. Aceito: youtube.com/watch, youtu.be, shorts, embed, live, music.youtube.com";
            }
          },
        });
        if (isCancel(input)) { step = -1; break; }
        url = input as string;
        step++;
        break;
      }

      case 1: {
        const input = await select({
          message: "O que você deseja baixar?",
          options: [
            { value: "video", label: "🎬 Vídeo (MP4)", hint: "Baixa vídeo e áudio juntos" },
            { value: "audio", label: "🎵 Áudio (MP3)", hint: "Extrai apenas o som" },
            backOption(),
          ],
        });
        if (isCancel(input) || input === BACK) { step--; break; }
        format = input as any;
        step = format === "video" ? 2 : 3; 
        break;
      }

      case 2: {
        const input = await select({
          message: "Escolha a qualidade do vídeo:",
          options: [
            { value: "best", label: "🏆 Melhor disponível", hint: "Máxima qualidade" },
            { value: "1080", label: "📺 1080p (Full HD)", hint: "Recomendado" },
            { value: "720", label: "📱 720p (HD)", hint: "Bom equilíbrio" },
            { value: "480", label: "💾 480p (SD)", hint: "Arquivo menor" },
            backOption(),
          ],
        });
        if (isCancel(input) || input === BACK) { step = 1; break; }
        quality = input as any;
        step++;
        break;
      }

      case 3: {
        const input = await text({
          message: "Onde salvar o download?",
          placeholder: desktopPath,
          defaultValue: outputDir,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const parent = path.dirname(path.resolve(value));
            if (!fs.existsSync(parent)) {
              return `Pasta não encontrada: ${parent}\nDigite um caminho válido.`;
            }
          },
        });
        if (isCancel(input)) { step = format === "video" ? 2 : 1; break; }
        outputDir = input as string;
        step++;
        break;
      }

      case 4: {
        await youtubeCommand(url, { format, quality, outputDir });
        return;
      }
    }
  }
}


async function handleVideoFlow() {
  let step = 0;
  let action: VideoAction = "compress";
  let inputDir = "";
  let outputDir = desktopPath;
  let preset: "h264" | "h265" = "h264";
  let format: "mp4" | "mov" | "avi" | "webm" = "mp4";
  let resolution: "1080" | "720" | "480" = "720";

  while (step >= 0) {
    switch (step) {

      case 0: {
        const input = await select({
          message: "O que deseja fazer?",
          options: [
            { value: "compress", label: "🗜️  Comprimir", hint: "Reduz tamanho do arquivo (H.264/H.265)" },
            { value: "convert", label: "🔄 Converter formato", hint: "MP4, MOV, AVI, WebM" },
            { value: "resize", label: "📏 Redimensionar", hint: "1080p, 720p, 480p" },
            backOption(),
          ],
        });
        if (isCancel(input) || input === BACK) { step = -1; break; }
        action = input as VideoAction;
        step++;
        break;
      }

      case 1: {
        const input = await text({
          message: "Pasta com os vídeos de origem:",
          placeholder: "./videos",
          defaultValue: inputDir || undefined,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const resolved = path.resolve(value);
            if (!fs.existsSync(resolved)) {
              return `Pasta não encontrada: ${resolved}\nDigite um caminho válido.`;
            }
          },
        });
        if (isCancel(input)) { step--; break; }
        inputDir = input as string;
        step++;
        break;
      }

      case 2: {
        const input = await text({
          message: "Pasta de destino (onde salvar):",
          placeholder: desktopPath,
          defaultValue: outputDir,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const parent = path.dirname(path.resolve(value));
            if (!fs.existsSync(parent)) {
              return `Pasta não encontrada: ${parent}\nDigite um caminho válido.`;
            }
          },
        });
        if (isCancel(input)) { step--; break; }
        outputDir = input as string;
        step++;
        break;
      }

      case 3: {
        note(
          color.yellow("⚠️  Todos os vídeos da pasta serão processados!"),
          "🎥 Atenção",
        );
        const shouldContinue = await confirm({ message: "Deseja continuar?" });
        if (isCancel(shouldContinue) || !shouldContinue) { step--; break; }
        step++;
        break;
      }

      case 4: {
        if (action === "compress") {
          const input = await select({
            message: "Qual codec usar?",
            options: [
              { value: "h264", label: "H.264", hint: "Compatibilidade total" },
              { value: "h265", label: "H.265 (HEVC)", hint: "Arquivo menor, mais lento" },
              backOption(),
            ],
          });
          if (isCancel(input) || input === BACK) { step = 2; break; }
          preset = input as any;
        }

        if (action === "convert") {
          const input = await select({
            message: "Converter para qual formato?",
            options: [
              { value: "mp4", label: "MP4", hint: "Compatível com tudo" },
              { value: "mov", label: "MOV", hint: "Formato Apple" },
              { value: "avi", label: "AVI", hint: "Formato clássico" },
              { value: "webm", label: "WebM", hint: "Otimizado para web" },
              backOption(),
            ],
          });
          if (isCancel(input) || input === BACK) { step = 2; break; }
          format = input as any;
        }

        if (action === "resize") {
          const input = await select({
            message: "Qual resolução?",
            options: [
              { value: "1080", label: "📺 1080p (Full HD)" },
              { value: "720", label: "📱 720p (HD)" },
              { value: "480", label: "💾 480p (SD)" },
              backOption(),
            ],
          });
          if (isCancel(input) || input === BACK) { step = 2; break; }
          resolution = input as any;
        }

        step++;
        break;
      }

      case 5: {
        await videoCommand({ action, inputDir, outputDir, preset, format, resolution });
        return;
      }
    }
  }
}


async function handleDataFlow() {
  let step = 0;
  let filePath = "";
  let format: "csv" | "json" | "yaml" = "csv";

  while (step >= 0) {
    switch (step) {
      case 0: {
        const input = await text({
          message: "Caminho do arquivo (JSON, CSV ou YAML):",
          placeholder: "./data/users.json",
          defaultValue: filePath || undefined,
          validate(value) {
            if (!value) return "O caminho é obrigatório";
          },
        });
        if (isCancel(input)) { step = -1; break; }
        filePath = input as string;
        step++;
        break;
      }

      case 1: {
        const input = await select({
          message: "Converter para qual formato?",
          options: [
            { value: "csv", label: "CSV", hint: "Para Excel/Planilhas" },
            { value: "json", label: "JSON", hint: "Para APIs/Frontend" },
            { value: "yaml", label: "YAML", hint: "Para Configs/DevOps" },
            backOption(),
          ],
        });
        if (isCancel(input) || input === BACK) { step--; break; }
        format = input as any;
        step++;
        break;
      }

      case 2: {
        console.log("\n");
        await dataCommand(filePath, { to: format });
        return;
      }
    }
  }
}


async function handleDocsFlow() {
  let step = 0;
  let action: DocsAction = "md-to-html";
  let inputFile = "";
  let outputDir = desktopPath;

  while (step >= 0) {
    switch (step) {
      case 0: {
        const input = await select({
          message: "O que deseja fazer?",
          options: [
            { value: "md-to-html", label: "🌐 Markdown → HTML", hint: "Gera página web estilizada" },
            { value: "md-to-pdf", label: "📄 Markdown → PDF", hint: "HTML imprimível (Ctrl+P no navegador)" },
            backOption(),
          ],
        });
        if (isCancel(input) || input === BACK) { step = -1; break; }
        action = input as DocsAction;
        step++;
        break;
      }

      case 1: {
        const input = await text({
          message: "Caminho do arquivo Markdown:",
          placeholder: "./README.md",
          defaultValue: inputFile || undefined,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const resolved = path.resolve(value);
            if (!fs.existsSync(resolved)) {
              return `Arquivo não encontrado: ${resolved}`;
            }
            const ext = path.extname(resolved).toLowerCase();
            if (![".md", ".markdown", ".mdx"].includes(ext)) {
              return "Apenas arquivos Markdown (.md, .markdown, .mdx) são aceitos.";
            }
          },
        });
        if (isCancel(input)) { step--; break; }
        inputFile = input as string;
        step++;
        break;
      }

      case 2: {
        const input = await text({
          message: "Pasta de destino:",
          placeholder: desktopPath,
          defaultValue: outputDir,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const parent = path.dirname(path.resolve(value));
            if (!fs.existsSync(parent)) {
              return `Pasta não encontrada: ${parent}\nDigite um caminho válido.`;
            }
          },
        });
        if (isCancel(input)) { step--; break; }
        outputDir = input as string;
        step++;
        break;
      }

      case 3: {
        await docsCommand({ action, inputFile, outputDir });
        return;
      }
    }
  }
}


async function handleImageFlow() {
  let step = 0;
  let action: ImageAction = "compress";
  let inputDir = "";
  let outputDir = desktopPath;
  let width: number | undefined;
  let height: number | undefined;
  let format: "png" | "jpg" | "webp" | "avif" = "webp";
  let quality = 80;

  while (step >= 0) {
    switch (step) {
      case 0: {
        const input = await select({
          message: "O que deseja fazer?",
          options: [
            { value: "compress", label: "🗜️  Comprimir", hint: "Reduz tamanho do arquivo" },
            { value: "convert", label: "🔄 Converter formato", hint: "PNG, JPG, WebP, AVIF" },
            { value: "resize", label: "📏 Redimensionar", hint: "Alterar dimensões" },
            backOption(),
          ],
        });
        if (isCancel(input) || input === BACK) { step = -1; break; }
        action = input as ImageAction;
        step++;
        break;
      }

      case 1: {
        const input = await text({
          message: "Pasta com as imagens de origem:",
          placeholder: "./images",
          defaultValue: inputDir || undefined,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const resolved = path.resolve(value);
            if (!fs.existsSync(resolved)) {
              return `Pasta não encontrada: ${resolved}\nDigite um caminho válido.`;
            }
          },
        });
        if (isCancel(input)) { step--; break; }
        inputDir = input as string;
        step++;
        break;
      }

      case 2: {
        const input = await text({
          message: "Pasta de destino (onde salvar):",
          placeholder: desktopPath,
          defaultValue: outputDir,
          validate(value) {
            if (!value) return "O caminho é obrigatório!";
            const parent = path.dirname(path.resolve(value));
            if (!fs.existsSync(parent)) {
              return `Pasta não encontrada: ${parent}\nDigite um caminho válido.`;
            }
          },
        });
        if (isCancel(input)) { step--; break; }
        outputDir = input as string;
        step++;
        break;
      }

      case 3: {
        note(
          color.yellow("⚠️  Todas as imagens da pasta serão processadas!"),
          "🖼️ Atenção",
        );
        const shouldContinue = await confirm({ message: "Deseja continuar?" });
        if (isCancel(shouldContinue) || !shouldContinue) { step--; break; }
        step++;
        break;
      }

      case 4: {
        if (action === "compress") {
          const input = await select({
            message: "Qualidade da compressão:",
            options: [
              { value: "90", label: "🏆 Alta (90%)", hint: "Pouca perda de qualidade" },
              { value: "80", label: "⚡ Média (80%)", hint: "Bom equilíbrio" },
              { value: "60", label: "💾 Baixa (60%)", hint: "Arquivo bem menor" },
              { value: "40", label: "📦 Mínima (40%)", hint: "Máxima redução" },
              backOption(),
            ],
          });
          if (isCancel(input) || input === BACK) { step = 2; break; }
          quality = parseInt(input as string);
        }

        if (action === "convert") {
          const input = await select({
            message: "Converter para qual formato?",
            options: [
              { value: "webp", label: "WebP", hint: "Moderno, menor tamanho" },
              { value: "png", label: "PNG", hint: "Sem perda de qualidade" },
              { value: "jpg", label: "JPG", hint: "Compatível com tudo" },
              { value: "avif", label: "AVIF", hint: "Mais moderno e eficiente" },
              backOption(),
            ],
          });
          if (isCancel(input) || input === BACK) { step = 2; break; }
          format = input as any;
        }

        if (action === "resize") {
          const widthInput = await text({
            message: "Largura (px) — deixe vazio para manter proporção:",
            placeholder: "800",
          });
          if (isCancel(widthInput)) { step = 2; break; }

          const heightInput = await text({
            message: "Altura (px) — deixe vazio para manter proporção:",
            placeholder: "600",
          });
          if (isCancel(heightInput)) { step = 2; break; }

          width = widthInput ? parseInt(widthInput as string) || undefined : undefined;
          height = heightInput ? parseInt(heightInput as string) || undefined : undefined;

          if (!width && !height) {
            outro(color.red("Informe pelo menos largura ou altura!"));
            break;
          }
        }

        step++;
        break;
      }

      case 5: {
        await imageCommand({ action, inputDir, outputDir, width, height, format, quality });
        return;
      }
    }
  }
}
