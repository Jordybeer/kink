import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/directionality-consumer-closeout.mjs";
let source = readFileSync(path, "utf8");
const helperNeedle = `function appendOnce(path, marker, content) {`;
if (!source.includes(helperNeedle)) throw new Error("forge helper anchor ontbreekt");
source = source.replace(helperNeedle, `function replaceFirst(path, before, after) {\n  const source = read(path);\n  if (!source.includes(before)) throw new Error(\`${"${path}"}: match ontbreekt\`);\n  write(path, source.replace(before, after));\n}\n\nfunction appendOnce(path, marker, content) {`);
const callNeedle = `  replaceOnce(\n    "app/scene/page.tsx",\n    \`onAdd={() => addFromKink(k.name, k.id)} />\`,`;
if (!source.includes(callNeedle)) throw new Error("scene onAdd transform anchor ontbreekt");
source = source.replace(callNeedle, `  replaceFirst(\n    "app/scene/page.tsx",\n    \`onAdd={() => addFromKink(k.name, k.id)} />\`,`);
writeFileSync(path, source, "utf8");
console.log("temporary forge fixed");
