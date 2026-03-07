import path from "path";
import os from "os";
import fs from "fs-extra";
import { Listr } from "listr2";
import color from "chalk";
import { outro, note } from "@clack/prompts";
import { execSync } from "child_process";
import { create as createYtDlp } from "youtube-dl-exec";


function findYtDlpPath(): string {
  try {
    const result = execSync("which yt-dlp", { encoding: "utf-8" }).trim();
    if (result) return result;
  } catch {
    // which falha se yt-dlp não está no PATH — fallback abaixo
  }

  const commonPaths = [
    "/opt/homebrew/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    path.join(process.env.HOME || "~", ".local/bin/yt-dlp"),
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  console.error(color.red("\n❌ yt-dlp não encontrado no sistema!\n"));
  console.error(color.yellow("Instale com um dos comandos abaixo:"));
  console.error(color.dim("  brew install yt-dlp        # macOS (Homebrew)"));
  console.error(color.dim("  pip install yt-dlp         # Python (pip)"));
  console.error(color.dim("  sudo apt install yt-dlp    # Ubuntu/Debian"));
  console.error(color.dim("  winget install yt-dlp      # Windows\n"));
  process.exit(1);
}

const youtubeDl = createYtDlp(findYtDlpPath());

interface YoutubeOptions {
  format: "video" | "audio";
  quality?: "best" | "1080" | "720" | "480";
  outputDir?: string;
}

interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  filesize_approx?: number;
  resolution?: string;
}


/**
 * Valida se a URL é um link válido do YouTube.
 * Aceita: youtube.com/watch, youtu.be, shorts, embed, live, e music.
 */
export function isValidYoutubeUrl(url: string): boolean {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/[\w-]+/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/[\w-]+/,
    /(?:https?:\/\/)?youtu\.be\/[\w-]+/,
    /(?:https?:\/\/)?music\.youtube\.com\/watch\?v=[\w-]+/,
  ];
  return patterns.some((p) => p.test(url));
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Busca metadados do vídeo.
 */
async function getVideoInfo(url: string): Promise<VideoInfo> {
  const result = (await youtubeDl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    noPlaylist: true,
  })) as any;

  return {
    title: result.title || "Título desconhecido",
    duration: result.duration || 0,
    uploader: result.uploader || result.channel || "Desconhecido",
    filesize_approx: result.filesize_approx || result.filesize || undefined,
    resolution: result.resolution || undefined,
  };
}

/**
 * Retorna o format string do yt-dlp com base na qualidade escolhida.
 */
function getFormatString(quality: string): string {
  switch (quality) {
    case "1080":
      return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best";
    case "720":
      return "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best";
    case "480":
      return "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best";
    case "best":
    default:
      return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  }
}

/**
 * Extrai mensagem de erro legível do yt-dlp.
 */
function extractErrorMessage(error: any): string {
  const raw =
    error.stderr ||
    error.stdout ||
    error.message ||
    (typeof error === "string" ? error : "");

  if (!raw || raw.trim() === "") {
    // Se nenhuma saída, logar o erro inteiro para debug
    console.error(color.dim("\n🔍 Debug — Objeto de erro completo:"));
    console.error(color.dim(JSON.stringify(error, null, 2)));
    return "Erro desconhecido. Verifique se o yt-dlp está instalado e atualizado.";
  }

  // Extrair apenas a linha de ERROR do yt-dlp
  const errorLines = raw
    .split("\n")
    .filter((line: string) => line.includes("ERROR") || line.includes("error"));

  if (errorLines.length > 0) {
    return errorLines.join("\n").trim();
  }

  return raw.trim();
}

/**
 * Executa o download com progresso via subprocess.
 */
function downloadWithProgress(
  url: string,
  flags: any,
  onProgress: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const subprocess = youtubeDl.exec(url, flags);

    // yt-dlp envia progresso para stderr
    subprocess.stderr?.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        onProgress(line.trim());
      }
    });

    subprocess.stdout?.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        onProgress(line.trim());
      }
    });

    subprocess
      .then(() => resolve())
      .catch((err: any) => reject(err));
  });
}

/**
 * Faz parse da linha de progresso do yt-dlp.
 * Exemplo: "[download]  45.2% of 10.50MiB at 2.30MiB/s ETA 00:03"
 */
function parseProgressLine(line: string): string | null {
  // Padrão de progresso de download
  const progressMatch = line.match(
    /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\S+)\s+at\s+([\d.]+\S+)\s+ETA\s+(\S+)/,
  );
  if (progressMatch) {
    const [, percent, size, speed, eta] = progressMatch;
    const pct = parseFloat(percent!);
    const bar = buildProgressBar(pct);
    return `${bar} ${color.cyan(`${pct.toFixed(1)}%`)} de ${size} • ${speed}/s • ETA ${eta}`;
  }

  // Quando o download está 100%
  if (line.includes("[download] 100%")) {
    return `${buildProgressBar(100)} ${color.green("100%")} — Download completo!`;
  }

  // Fase de merge
  if (line.includes("[Merger]") || line.includes("[Merger]")) {
    return `🔧 Unindo vídeo e áudio...`;
  }

  // Fase de extração de áudio
  if (line.includes("[ExtractAudio]")) {
    return `🎵 Extraindo áudio...`;
  }

  // Já existe
  if (line.includes("has already been downloaded")) {
    return `✅ Arquivo já existe, pulando download.`;
  }

  return null;
}

/**
 * Constrói uma barra de progresso visual.
 */
function buildProgressBar(percent: number, width = 25): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const filledBar = "█".repeat(filled);
  const emptyBar = "░".repeat(empty);
  return color.cyan(filledBar) + color.dim(emptyBar);
}

// ── Comando principal ───────────────────────────────────────

export const youtubeCommand = async (url: string, options: YoutubeOptions) => {
  const defaultDir = path.join(os.homedir(), "Desktop");
  const downloadDir = path.resolve(options.outputDir || defaultDir);

  try {
    fs.ensureDirSync(downloadDir);
  } catch {
    console.error(color.red(`\n❌ Não foi possível criar a pasta: ${downloadDir}`));
    console.error(color.yellow("Verifique se o caminho é válido e se você tem permissão de escrita.\n"));
    return;
  }

  const quality = options.quality || "best";

  const tasks = new Listr([
    {
      title: "Obtendo informações do vídeo...",
      task: async (ctx, task) => {
        try {
          ctx.info = await getVideoInfo(url);
          const info = ctx.info as VideoInfo;

          const infoLines = [
            `${color.bold("Título:")}   ${info.title}`,
            `${color.bold("Canal:")}    ${info.uploader}`,
            `${color.bold("Duração:")}  ${formatDuration(info.duration)}`,
            info.resolution
              ? `${color.bold("Resolução:")} ${info.resolution}`
              : null,
            info.filesize_approx
              ? `${color.bold("Tamanho:")}  ~${formatFileSize(info.filesize_approx)}`
              : null,
          ]
            .filter(Boolean)
            .join("\n");

          note(infoLines, "📺 Informações do vídeo");

          task.title = `Vídeo encontrado: ${color.cyan(info.title)}`;
        } catch (err: any) {
          const msg = extractErrorMessage(err);
          task.title = color.yellow("⚠ Metadados indisponíveis, tentando download direto...");
          console.error(color.dim(`\n  Detalhe: ${msg}\n`));
        }
      },
    },
    {
      title: `Baixando ${options.format === "audio" ? "áudio (MP3)" : `vídeo (${quality})`}...`,
      task: async (ctx, task) => {
        const flags: any = {
          noWarnings: true,
          noCheckCertificates: true,
          preferFreeFormats: true,
          noPlaylist: true,
          output: path.join(downloadDir, "%(title)s.%(ext)s"),
        };

        if (options.format === "audio") {
          flags.extractAudio = true;
          flags.audioFormat = "mp3";
          flags.audioQuality = 0;
        } else {
          flags.format = getFormatString(quality);
          flags.mergeOutputFormat = "mp4";
        }

        try {
          await downloadWithProgress(url, flags, (line) => {
            const progressInfo = parseProgressLine(line);
            if (progressInfo) {
              task.output = progressInfo;
            }
          });

          const title = ctx.info?.title || "arquivo";
          task.title = color.green(`✓ Download concluído: ${title}`);
        } catch (error: any) {
          const errorMessage = extractErrorMessage(error);

          // Mensagens de erro mais amigáveis
          if (errorMessage.includes("Video unavailable")) {
            throw new Error(
              "Este vídeo não está disponível. Pode ser privado, excluído ou restrito por região.",
            );
          }
          if (errorMessage.includes("Sign in")) {
            throw new Error(
              "Este vídeo requer login. Vídeos com restrição de idade não são suportados.",
            );
          }
          if (errorMessage.includes("HTTP Error 429")) {
            throw new Error(
              "Muitas requisições ao YouTube. Aguarde alguns minutos e tente novamente.",
            );
          }
          if (errorMessage.includes("is not a valid URL")) {
            throw new Error(
              "URL inválida. Verifique se o link do YouTube está correto.",
            );
          }

          throw new Error(`Falha no download:\n${errorMessage}`);
        }
      },
    },
  ]);

  // Header
  console.log(
    color.dim(
      `\n🔗 URL: ${url}\n📂 Saída: ${downloadDir}\n⚙️  Modo: ${options.format.toUpperCase()}${options.format === "video" ? ` (${quality})` : ""}\n`,
    ),
  );

  try {
    await tasks.run();
    outro(
      color.green("🎉 Download finalizado! Verifique a pasta 'downloads'."),
    );
  } catch (e: any) {
    outro(color.red(`❌ ${e.message}`));
  }
};
