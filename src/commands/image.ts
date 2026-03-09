import path from "path";
import os from "os";
import fs from "fs-extra";
import { Listr } from "listr2";
import color from "chalk";
import { outro } from "@clack/prompts";
import sharp from "sharp";

export type ImageAction = "resize" | "convert" | "compress";

export interface ImageOptions {
  action: ImageAction;
  inputDir: string;
  outputDir: string;
  width?: number;
  height?: number;
  format?: "png" | "jpg" | "webp" | "avif";
  quality?: number;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff", ".gif", ".bmp"];

function isImageFile(file: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase());
}

function getImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => isImageFile(f))
    .map((f) => path.join(dir, f));
}

function buildProgressBar(current: number, total: number, width = 25): string {
  const percent = (current / total) * 100;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return color.cyan("█".repeat(filled)) + color.dim("░".repeat(empty));
}

function getActionLabel(options: ImageOptions): string {
  switch (options.action) {
    case "resize":
      return `Redimensionando para ${options.width || "auto"}x${options.height || "auto"}`;
    case "convert":
      return `Convertendo para ${options.format?.toUpperCase() || "PNG"}`;
    case "compress":
      return `Comprimindo (qualidade: ${options.quality || 80}%)`;
  }
}

function getOutputExtension(options: ImageOptions): string {
  if (options.action === "convert" && options.format) {
    return options.format === "jpg" ? ".jpg" : `.${options.format}`;
  }
  return "";
}

async function processImage(
  inputFile: string,
  outputFile: string,
  options: ImageOptions,
): Promise<{ inputSize: number; outputSize: number }> {
  const inputSize = (await fs.stat(inputFile)).size;
  let pipeline = sharp(inputFile);

  switch (options.action) {
    case "resize":
      pipeline = pipeline.resize(options.width || null, options.height || null, {
        fit: "inside",
        withoutEnlargement: true,
      });
      break;

    case "convert": {
      const fmt = options.format || "png";
      if (fmt === "png") pipeline = pipeline.png();
      else if (fmt === "jpg") pipeline = pipeline.jpeg({ quality: 90 });
      else if (fmt === "webp") pipeline = pipeline.webp({ quality: 85 });
      else if (fmt === "avif") pipeline = pipeline.avif({ quality: 65 });
      break;
    }

    case "compress": {
      const ext = path.extname(inputFile).toLowerCase();
      const q = options.quality || 80;
      if (ext === ".png") pipeline = pipeline.png({ quality: q });
      else if (ext === ".jpg" || ext === ".jpeg") pipeline = pipeline.jpeg({ quality: q });
      else if (ext === ".webp") pipeline = pipeline.webp({ quality: q });
      else if (ext === ".avif") pipeline = pipeline.avif({ quality: q });
      else pipeline = pipeline.jpeg({ quality: q });
      break;
    }
  }

  await pipeline.toFile(outputFile);
  const outputSize = (await fs.stat(outputFile)).size;
  return { inputSize, outputSize };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const imageCommand = async (options: ImageOptions) => {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir || path.join(os.homedir(), "Desktop"));

  if (!fs.existsSync(inputDir)) {
    console.error(color.red(`\n❌ Pasta de origem não encontrada: ${inputDir}\n`));
    return;
  }

  const imageFiles = getImageFiles(inputDir);

  if (imageFiles.length === 0) {
    console.error(color.red(`\n❌ Nenhuma imagem encontrada em: ${inputDir}`));
    console.error(color.dim(`   Extensões suportadas: ${IMAGE_EXTENSIONS.join(", ")}\n`));
    return;
  }

  try {
    fs.ensureDirSync(outputDir);
  } catch {
    console.error(color.red(`\n❌ Não foi possível criar a pasta: ${outputDir}\n`));
    return;
  }

  const actionLabel = getActionLabel(options);
  const newExt = getOutputExtension(options);

  console.log(color.dim(`\n📂 Origem:  ${inputDir}`));
  console.log(color.dim(`📂 Destino: ${outputDir}`));
  console.log(color.dim(`⚙️  Ação:    ${actionLabel}`));
  console.log(color.dim(`🖼️  Imagens: ${imageFiles.length} arquivo(s)\n`));

  let totalSaved = 0;

  const tasks = new Listr(
    imageFiles.map((file, index) => {
      const baseName = path.basename(file, path.extname(file));
      const ext = newExt || path.extname(file);
      const outputFile = path.join(outputDir, `${baseName}${ext}`);

      return {
        title: `[${index + 1}/${imageFiles.length}] ${path.basename(file)}`,
        task: async (_ctx: any, task: any) => {
          const { inputSize, outputSize } = await processImage(file, outputFile, options);
          const saved = inputSize - outputSize;
          totalSaved += saved;

          const sizeInfo =
            options.action === "compress"
              ? ` (${formatFileSize(inputSize)} → ${formatFileSize(outputSize)}, ${saved > 0 ? color.green(`-${formatFileSize(saved)}`) : color.yellow(`+${formatFileSize(Math.abs(saved))}`)})`
              : ` (${formatFileSize(outputSize)})`;

          task.title = color.green(
            `✓ [${index + 1}/${imageFiles.length}] ${path.basename(file)} → ${path.basename(outputFile)}${sizeInfo}`,
          );
        },
      };
    }),
    { concurrent: false },
  );

  try {
    await tasks.run();

    let summary = `🎉 ${imageFiles.length} imagem(ns) processada(s)! Verifique: ${outputDir}`;
    if (options.action === "compress" && totalSaved > 0) {
      summary += `\n   💾 Economia total: ${formatFileSize(totalSaved)}`;
    }
    outro(color.green(summary));
  } catch (e: any) {
    outro(color.red(`❌ Erro no processamento: ${e.message}`));
  }
};
