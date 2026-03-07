import path from "path";
import os from "os";
import fs from "fs-extra";
import { Listr } from "listr2";
import color from "chalk";
import { outro } from "@clack/prompts";
import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath);


export type VideoAction = "compress" | "convert" | "resize";

export interface VideoOptions {
  action: VideoAction;
  inputDir: string;
  outputDir: string;
  preset?: "h264" | "h265";
  format?: "mp4" | "mov" | "avi" | "webm";
  resolution?: "1080" | "720" | "480";
}


const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".flv", ".wmv"];

function isVideoFile(file: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase());
}


function getVideoFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => isVideoFile(f))
    .map((f) => path.join(dir, f));
}

function buildProgressBar(percent: number, width = 25): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return color.cyan("█".repeat(filled)) + color.dim("░".repeat(empty));
}

function processVideo(
  inputFile: string,
  outputFile: string,
  configureFn: (command: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputFile);
    command = configureFn(command);

    command
      .on("progress", (progress) => {
        if (onProgress && progress.percent) {
          onProgress(Math.min(progress.percent, 100));
        }
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputFile);
  });
}


function configureCompress(
  cmd: ffmpeg.FfmpegCommand,
  preset: "h264" | "h265",
): ffmpeg.FfmpegCommand {
  if (preset === "h265") {
    return cmd
      .videoCodec("libx265")
      .addOutputOption("-crf", "28")
      .addOutputOption("-preset", "medium")
      .audioCodec("aac")
      .audioBitrate("128k");
  }
  return cmd
    .videoCodec("libx264")
    .addOutputOption("-crf", "23")
    .addOutputOption("-preset", "medium")
    .audioCodec("aac")
    .audioBitrate("128k");
}

function configureConvert(
  cmd: ffmpeg.FfmpegCommand,
  format: string,
): ffmpeg.FfmpegCommand {
  switch (format) {
    case "webm":
      return cmd.videoCodec("libvpx-vp9").audioCodec("libopus");
    case "avi":
      return cmd.videoCodec("mpeg4").audioCodec("mp3");
    case "mov":
      return cmd.videoCodec("libx264").audioCodec("aac");
    case "mp4":
    default:
      return cmd.videoCodec("libx264").audioCodec("aac");
  }
}

function configureResize(
  cmd: ffmpeg.FfmpegCommand,
  resolution: "1080" | "720" | "480",
): ffmpeg.FfmpegCommand {
  const scales: Record<string, string> = {
    "1080": "scale=-2:1080",
    "720": "scale=-2:720",
    "480": "scale=-2:480",
  };
  return cmd
    .videoCodec("libx264")
    .audioCodec("aac")
    .addOutputOption("-vf", scales[resolution]!);
}


function getActionLabel(options: VideoOptions): string {
  switch (options.action) {
    case "compress":
      return `Comprimindo (${options.preset?.toUpperCase() || "H.264"})`;
    case "convert":
      return `Convertendo para ${options.format?.toUpperCase() || "MP4"}`;
    case "resize":
      return `Redimensionando para ${options.resolution}p`;
  }
}

function getOutputExtension(options: VideoOptions): string {
  if (options.action === "convert" && options.format) {
    return `.${options.format}`;
  }
  return ".mp4";
}


export const videoCommand = async (options: VideoOptions) => {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir);

  if (!fs.existsSync(inputDir)) {
    console.error(color.red(`\n❌ Pasta de origem não encontrada: ${inputDir}\n`));
    return;
  }

  const videoFiles = getVideoFiles(inputDir);

  if (videoFiles.length === 0) {
    console.error(color.red(`\n❌ Nenhum vídeo encontrado em: ${inputDir}`));
    console.error(color.dim(`   Extensões suportadas: ${VIDEO_EXTENSIONS.join(", ")}\n`));
    return;
  }

  try {
    fs.ensureDirSync(outputDir);
  } catch {
    console.error(color.red(`\n❌ Não foi possível criar a pasta: ${outputDir}`));
    console.error(color.yellow("Verifique se o caminho é válido.\n"));
    return;
  }

  const actionLabel = getActionLabel(options);
  const ext = getOutputExtension(options);

  console.log(color.dim(`\n📂 Origem:  ${inputDir}`));
  console.log(color.dim(`📂 Destino: ${outputDir}`));
  console.log(color.dim(`⚙️  Ação:    ${actionLabel}`));
  console.log(color.dim(`🎬 Vídeos:  ${videoFiles.length} arquivo(s)\n`));

  const tasks = new Listr(
    videoFiles.map((file, index) => {
      const baseName = path.basename(file, path.extname(file));
      const outputFile = path.join(outputDir, `${baseName}${ext}`);

      return {
        title: `[${index + 1}/${videoFiles.length}] ${path.basename(file)}`,
        task: async (_ctx: any, task: any) => {
          const configureFn = (cmd: ffmpeg.FfmpegCommand) => {
            switch (options.action) {
              case "compress":
                return configureCompress(cmd, options.preset || "h264");
              case "convert":
                return configureConvert(cmd, options.format || "mp4");
              case "resize":
                return configureResize(cmd, options.resolution || "720");
            }
          };

          await processVideo(file, outputFile, configureFn, (percent) => {
            const bar = buildProgressBar(percent);
            task.output = `${bar} ${color.cyan(`${percent.toFixed(1)}%`)}`;
          });

          task.title = color.green(
            `✓ [${index + 1}/${videoFiles.length}] ${path.basename(file)} → ${path.basename(outputFile)}`,
          );
        },
      };
    }),
    { concurrent: false },
  );

  try {
    await tasks.run();
    outro(
      color.green(
        `🎉 ${videoFiles.length} vídeo(s) processado(s)! Verifique: ${outputDir}`,
      ),
    );
  } catch (e: any) {
    outro(color.red(`❌ Erro no processamento: ${e.message}`));
  }
};
