import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dataset = JSON.parse(
  await readFile(new URL("../public/data/os-orc.json", import.meta.url), "utf8")
);

test("dataset possui metadados e registros coerentes", () => {
  assert.ok(dataset.metadata);
  assert.ok(Array.isArray(dataset.records));
  assert.equal(dataset.metadata.recordCount, dataset.records.length);
});

test("IDs dos registros são únicos", () => {
  const ids = new Set(dataset.records.map((record) => record.id));
  assert.equal(ids.size, dataset.records.length);
});

test("status cobrem toda a base", () => {
  const sum = Object.values(dataset.metadata.statusCounts).reduce(
    (total, value) => total + Number(value),
    0
  );
  assert.equal(sum, dataset.records.length);
});

test("contagem de pendentes é derivada corretamente", () => {
  const pending = dataset.records.filter(
    (record) => record.status !== "CONCLUÍDO"
  ).length;
  assert.equal(dataset.metadata.pendingCount, pending);
});

test("todos os registros possuem linha de origem e valor numérico", () => {
  for (const record of dataset.records) {
    assert.ok(Number.isInteger(record.sourceRow));
    assert.equal(typeof record.valorTotal, "number");
    assert.ok(Number.isFinite(record.valorTotal));
  }
});
