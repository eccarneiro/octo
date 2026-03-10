import fs from "fs-extra";
import path from "path";
import { Listr } from "listr2";
import color from "chalk";
import { outro } from "@clack/prompts";
import { Parser } from "json2csv";
import csv from "csvtojson";
import yaml from "js-yaml";
import dotenv from "dotenv";
import { jsonToParquet, csvToParquet } from "../services/data/parquet.js";

interface DataOptions {
  to: "json" | "csv" | "yaml" | "parquet";
}

export const dataCommand = async (filePath: string, options: DataOptions) => {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const dir = path.dirname(absolutePath);
  const name = path.basename(absolutePath, ext);

  const outputPath = path.join(dir, `${name}_converted.${options.to}`);

  if (!fs.existsSync(absolutePath)) {
    console.error(color.red(`Arquivo não encontrado: ${absolutePath}`));
    return;
  }

  let dataPayload: any = null;

  const tasks = new Listr([
    {
      title: `Processando arquivo original (${ext})`,
      task: async (ctx, task) => {
        // Fluxos de Streaming para Parquet (Evitando On-Memory)
        if (options.to === "parquet") {
          task.title = `Convertendo ${ext} para PARQUET (Streaming) ...`;
          if (ext === ".csv") {
            await csvToParquet(absolutePath, outputPath);
          } else if (ext === ".json") {
            await jsonToParquet(absolutePath, outputPath);
          } else {
            throw new Error(`Conversão de ${ext} para Parquet ainda não suportada.`);
          }
          return; 
        }

        task.title = `Lendo arquivo original (${ext})`;
        const rawContent = await fs.readFile(absolutePath, "utf-8");

        if (ext === ".json") {
          dataPayload = JSON.parse(rawContent);
        } else if (ext === ".csv") {
          dataPayload = await csv().fromString(rawContent);
        } else if (ext === ".yaml" || ext === ".yml") {
          dataPayload = yaml.load(rawContent);
        } else if (ext === ".env" || ext === "") {
          dataPayload = dotenv.parse(rawContent);
        } else {
          throw new Error(`Formato de entrada não suportado: ${ext}`);
        }
      },
    },
    {
      title: `Convertendo para ${options.to.toUpperCase()}`,
      skip: () => options.to === "parquet", 
      task: async () => {
        if (options.to === "csv") {
          const parser = new Parser();
          dataPayload = parser.parse(dataPayload);
        } else if (options.to === "json") {
          dataPayload = JSON.stringify(dataPayload, null, 2);
        } else if (options.to === "yaml") {
          dataPayload = yaml.dump(dataPayload);
        }
      },
    },
    {
      title: "Salvando arquivo",
      skip: () => options.to === "parquet", 
      task: async () => {
        await fs.writeFile(outputPath, dataPayload);
      },
    },
  ]);

  try {
    console.log(
      color.magenta(
        `\n Processando: ${name}${ext} -> ${options.to.toUpperCase()}`,
      ),
    );
    await tasks.run();
    outro(color.green(`✅ Salvo em: ${path.basename(outputPath)}`));
  } catch (e: any) {
    outro(color.red(`Erro na conversão: ${e.message}`));
  }
};
