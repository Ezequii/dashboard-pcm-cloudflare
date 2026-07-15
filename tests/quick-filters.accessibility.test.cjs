const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(
  path.join(__dirname, "..", "static", "styles_v100_quick_filters.css"),
  "utf8"
);

function relativeLuminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map(offset =>
    Number.parseInt(value.slice(offset, offset + 2), 16) / 255
  );

  const linear = channels.map(channel =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  );

  return (
    0.2126 * linear[0]
    + 0.7152 * linear[1]
    + 0.0722 * linear[2]
  );
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test("indicador de foco possui contraste mínimo de 3:1", () => {
  const focusRule = css.match(
    /\.quick-filter-bar-v100 \.quick-chip:focus-visible\s*\{([^}]*)\}/
  );

  assert.ok(focusRule, "Regra :focus-visible não encontrada.");

  const outlineColor = focusRule[1].match(
    /outline:\s*3px\s+solid\s+(#[0-9a-f]{6})/i
  );

  assert.ok(outlineColor, "Cor sólida do outline não encontrada.");

  const color = outlineColor[1];
  assert.ok(
    contrastRatio(color, "#ffffff") >= 3,
    `Contraste do foco contra branco insuficiente: ${contrastRatio(color, "#ffffff").toFixed(2)}:1`
  );
  assert.ok(
    contrastRatio(color, "#dbeafe") >= 3,
    `Contraste do foco contra chip ativo insuficiente: ${contrastRatio(color, "#dbeafe").toFixed(2)}:1`
  );
});

test("preferência de movimento reduzido remove transição e transformação", () => {
  const reducedMotionBlock = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/
  );

  assert.ok(
    reducedMotionBlock,
    "Bloco prefers-reduced-motion: reduce não encontrado."
  );

  assert.match(
    reducedMotionBlock[1],
    /transition:\s*none\s*!important\s*;/
  );
  assert.match(
    reducedMotionBlock[1],
    /transform:\s*none\s*!important\s*;/
  );
});
