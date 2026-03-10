import fs from "fs";
import { ParquetWriter, ParquetReader, ParquetSchema } from "@dsnp/parquetjs";
import csv from "csvtojson";

/**
 * Infer a Parquet schema based on an object's keys and values.
 * This is a basic implementation. For production, you'd want to sample
 * multiple rows to accurately determine the type (e.g. if one row has a null).
 */
export function inferSchema(sampleObject: Record<string, any>): ParquetSchema {
  const schemaDefinition: Record<string, any> = {};

  for (const [key, value] of Object.entries(sampleObject)) {
    let type = "UTF8";

    if (typeof value === "number") {
      type = Number.isInteger(value) ? "INT64" : "DOUBLE";
    } else if (typeof value === "boolean") {
      type = "BOOLEAN";
    }

    schemaDefinition[key] = { type, optional: true };
  }

  return new ParquetSchema(schemaDefinition);
}

/**
 * Convert a JSON array file to a Parquet file using iterators to save memory.
 */
export async function jsonToParquet(inputFilePath: string, outputFilePath: string): Promise<void> {
  // Ler arquivo como stream ou carregar em memória (idealmente streaming com JSONStream)
  // Para simplificar a base e por limitações do JSON puro, vamos ler usando require ou readFile, 
  // mas o ideal é usar `JSONStream` para parsear item a item.
  // Como primeiro passo, faremos a leitura básica.
  const data = JSON.parse(await fs.promises.readFile(inputFilePath, "utf-8"));
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("O arquivo JSON deve conter um array contendo ao menos um objeto.");
  }

  const schema = inferSchema(data[0]);
  const writer = await ParquetWriter.openFile(schema, outputFilePath);

  for (const row of data) {
    await writer.appendRow(row);
  }

  await writer.close();
}

/**
 * Convert a CSV file to a Parquet file using Streams.
 */
export async function csvToParquet(inputFilePath: string, outputFilePath: string): Promise<void> {
  const readStream = fs.createReadStream(inputFilePath);
  let writer: any = null;
  let schema: ParquetSchema | null = null;

  return new Promise((resolve, reject) => {
    csv()
      .fromStream(readStream)
      .subscribe(
        async (row: any) => {
          if (!schema) {
            schema = inferSchema(row);
            writer = await ParquetWriter.openFile(schema, outputFilePath);
          }
          await writer.appendRow(row);
        },
        reject,
        async () => {
          if (writer) {
            await writer.close();
          }
          resolve();
        }
      );
  });
}
