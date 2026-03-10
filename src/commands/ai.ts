import path from "path";
import os from "os";
import fs from "fs-extra";
import { Listr } from "listr2";
import color from "chalk";
import { outro } from "@clack/prompts";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath);

export type AiAction = "prepare-images" | "spectrogram" | "split-dataset";

export interface AiOptions {
  action: AiAction;
  inputDir: string;
  outputDir: string;
  size?: string; // e.g., "224x224"
  grayscale?: boolean;
  ratios?: string; // e.g., "80-10-10"
}

export const aiCommand = async (options: AiOptions) => {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir || path.join(os.homedir(), "Desktop", "octo-ai-output"));

  if (!fs.existsSync(inputDir)) {
    console.error(color.red(`\n❌ Pasta de origem não encontrada: ${inputDir}\n`));
    return;
  }

  try {
    fs.ensureDirSync(outputDir);
  } catch {
    console.error(color.red(`\n❌ Não foi possível criar a pasta: ${outputDir}\n`));
    return;
  }

  if (options.action === "prepare-images") {
    await handlePrepareImages(inputDir, outputDir, options);
  } else if (options.action === "spectrogram") {
    await handleSpectrograms(inputDir, outputDir);
  } else if (options.action === "split-dataset") {
    await handleSplitDataset(inputDir, outputDir, options.ratios || "80-10-10");
  } else {
    console.error(color.red("\n❌ Ação AI não reconhecida.\n"));
  }
};

function isImageFile(file: string) {
  return [".png", ".jpg", ".jpeg", ".webp", ".avif"].includes(path.extname(file).toLowerCase());
}

async function handlePrepareImages(inputDir: string, outputDir: string, options: AiOptions) {
  const files = fs.readdirSync(inputDir).filter(isImageFile);

  if (files.length === 0) {
    console.error(color.yellow("\nNenhuma imagem encontrada para normalização."));
    return;
  }

  let [width, height] = (options.size || "224x224").split("x").map(Number);
  if (!width || !height) {
    console.warn(color.yellow("Tamanho inválido fornecido. Usando fallback 224x224."));
    width = 224;
    height = 224;
  }

  console.log(color.dim(`\n🧠 Normalizando ${files.length} imagens para o dataset...`));

  const tasks = new Listr(
    files.map((file, i) => {
      const inputPath = path.join(inputDir, file);
      // Salvaremos output padronizado em JPG para datasets ML
      const outputPath = path.join(outputDir, `${path.parse(file).name}.jpg`);

      return {
        title: `[${i + 1}/${files.length}] Processando ${file}`,
        task: async (ctx, task) => {
          let pipeline = sharp(inputPath)
            .resize(width, height, { fit: "fill" }) // Força o formato exato 
            .jpeg({ quality: 100 }); // Qualidade maxima para ML

          if (options.grayscale) {
            pipeline = pipeline.grayscale();
          }

          // Strip metadados (exif) removendo perfils de cor problematicos no opencv/pytorch
          pipeline.keepMetadata();

          await pipeline.toFile(outputPath);
          task.title = color.green(`✓ Normalizado: ${file} -> ${width}x${height}`);
        },
      };
    })
  );

  try {
    await tasks.run();
    outro(color.green(`🎉 Normalização concluída! Imagens prontas para treino em: ${outputDir}`));
  } catch (err: any) {
    outro(color.red(`❌ Falha na normalização: ${err.message}`));
  }
}

async function handleSpectrograms(inputDir: string, outputDir: string) {
  const AUDIO_EXTS = [".mp3", ".wav", ".flac", ".ogg", ".m4a"];
  const files = fs.readdirSync(inputDir).filter(f => AUDIO_EXTS.includes(path.extname(f).toLowerCase()));

  if (files.length === 0) {
    console.error(color.yellow("\nNenhum arquivo de áudio encontrado para gerar espectrogramas."));
    return;
  }

  console.log(color.dim(`\n🎵 Gerando espectrogramas para ${files.length} áudios...`));

  const tasks = new Listr(
    files.map((file, i) => {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, `${path.parse(file).name}_spectrogram.png`);

      return {
        title: `[${i + 1}/${files.length}] Analisando ${file}`,
        task: async (ctx, task) => {
          return new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
              .complexFilter([
                {
                  filter: 'showspectrumpic',
                  options: 's=640x512:mode=separate'
                }
              ])
              .outputOptions([
                '-frames:v 1', 
                '-update 1'
              ])
              .output(outputPath)
              .on('end', () => {
                task.title = color.green(`✓ Espectrograma: ${file}`);
                resolve();
              })
              .on('error', (err) => reject(err))
              .run();
          });
        },
      };
    }),
    { concurrent: false } // FFmpeg takes CPU, better keep it sequential or use p-queue for max cores
  );

  try {
    await tasks.run();
    outro(color.green(`🎉 Espectrogramas gerados com sucesso em: ${outputDir}`));
  } catch (err: any) {
    outro(color.red(`❌ Falha ao processar áudios: ${err.message}`));
  }
}

async function handleSplitDataset(inputDir: string, outputDir: string, ratiosStr: string) {
  const parts = ratiosStr.split("-").map(Number);
  if (parts.length !== 3 || parts.reduce((a, b) => a + b, 0) !== 100) {
    console.error(color.red("\n❌ Proporção inválida. A soma deve ser 100 (ex: 80-10-10).\n"));
    return;
  }

  const [trainPct, testPct, valPct] = parts;
  const files = fs.readdirSync(inputDir).filter(f => fs.statSync(path.join(inputDir, f)).isFile());

  if (files.length === 0) {
    console.error(color.yellow("\nNenhum arquivo encontrado para separação."));
    return;
  }

  // Shuffle array using Fisher-Yates
  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = files[i];
    files[i] = files[j] as string;
    files[j] = temp as string;
  }

  const numTrain = Math.round((trainPct || 80) / 100 * files.length);
  const numTest = Math.round((testPct || 10) / 100 * files.length);
  // O que sobrar vai para val
  
  const trainFiles = files.slice(0, numTrain);
  const testFiles = files.slice(numTrain, numTrain + numTest);
  const valFiles = files.slice(numTrain + numTest);

  console.log(color.dim(`\n🔀 Separando ${files.length} arquivos...`));
  console.log(color.cyan(`  Train: ${trainFiles.length} (${trainPct}%)`));
  console.log(color.cyan(`  Test:  ${testFiles.length} (${testPct}%)`));
  console.log(color.cyan(`  Val:   ${valFiles.length} (${valPct}%)\n`));

  const trainDir = path.join(outputDir, "train");
  const testDir = path.join(outputDir, "test");
  const valDir = path.join(outputDir, "val");

  fs.ensureDirSync(trainDir);
  fs.ensureDirSync(testDir);
  fs.ensureDirSync(valDir);

  const tasks = new Listr([
    {
      title: "Copiando Train dataset...",
      task: async () => {
        await Promise.all(trainFiles.map(f => fs.copy(path.join(inputDir, f), path.join(trainDir, f))));
      }
    },
    {
      title: "Copiando Test dataset...",
      task: async () => {
        await Promise.all(testFiles.map(f => fs.copy(path.join(inputDir, f), path.join(testDir, f))));
      }
    },
    {
      title: "Copiando Val dataset...",
      task: async () => {
        await Promise.all(valFiles.map(f => fs.copy(path.join(inputDir, f), path.join(valDir, f))));
      }
    }
  ]);

  try {
    await tasks.run();
    outro(color.green(`🎉 Dataset separado em: ${outputDir}`));
  } catch (err: any) {
    outro(color.red(`❌ Erro ao mover arquivos: ${err.message}`));
  }
}
