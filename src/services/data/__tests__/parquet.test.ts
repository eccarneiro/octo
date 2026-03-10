import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import fs from "fs-extra";
import path from "path";
import { inferSchema, csvToParquet } from "../parquet.js";

const TEST_DIR = path.join(import.meta.dir, "temp_test_data");

describe("Parquet Service", () => {
  beforeAll(async () => {
    await fs.ensureDir(TEST_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEST_DIR);
  });

  test("inferSchema should map JavaScript types to Parquet types correctly", () => {
    const sampleLine = {
      id: 1,
      name: "Octo",
      score: 9.5,
      isActive: true,
      metadata: "some string"
    };

    const schema = inferSchema(sampleLine);

    expect(schema.fields.id!.primitiveType).toBe("INT64");
    expect(schema.fields.name!.originalType).toBe("UTF8");
    expect(schema.fields.score!.primitiveType).toBe("DOUBLE");
    expect(schema.fields.isActive!.primitiveType).toBe("BOOLEAN");
    expect(schema.fields.metadata!.originalType).toBe("UTF8");
  });

  test("csvToParquet should correctly parse a CSV and write to Parquet", async () => {
    const csvPath = path.join(TEST_DIR, "test.csv");
    const parquetPath = path.join(TEST_DIR, "test.parquet");

    // Prepara um CSV simples
    const csvContent = `id,name,value\n1,Alpha,100\n2,Beta,200`;
    await fs.writeFile(csvPath, csvContent);

    // Converte (usando nosso servico que utiliza Streams internamente)
    await csvToParquet(csvPath, parquetPath);

    // Verifica se o arquivo final foi criado e tem conteudo
    const stats = await fs.stat(parquetPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
