import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([".tsx"]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "build",
  "coverage",
  "docs",
  "public",
  "__tests__",
  "e2e",
]);

const RAW_SVG_EXCEPTIONS = new Set([
  "components/ProfileTrendsChart.tsx",
  "components/ContractTrendsChart.tsx",
  "components/brand/FetLifeMark.tsx",
]);

const ALLOWED_BRAND_MARKS = new Set(["fetlife"]);
const DISALLOWED_ICON_IMPORT = /(lucide|react-icons|heroicons|fontawesome|iconify|icons8|material-icons|@mui\/icons-material)/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const CONTROL_GLYPH = /[←→↑↓↗↘↖↙✕✖✔✓]/u;

const failures = [];

function relative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function collectFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(absolute));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function lineAndColumn(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${position.line + 1}:${position.character + 1}`;
}

function report(sourceFile, node, message) {
  failures.push(`${relative(sourceFile.fileName)}:${lineAndColumn(sourceFile, node)} ${message}`);
}

function jsxTagName(node) {
  if (ts.isIdentifier(node.tagName)) return node.tagName.text;
  return node.tagName.getText();
}

function jsxAttributeName(property, sourceFile) {
  return property.name.getText(sourceFile);
}

function attribute(node, name, sourceFile) {
  return node.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && jsxAttributeName(property, sourceFile) === name,
  );
}

function literalAttributeValue(attributeNode) {
  if (!attributeNode?.initializer) return true;
  if (ts.isStringLiteral(attributeNode.initializer)) return attributeNode.initializer.text;
  if (ts.isJsxExpression(attributeNode.initializer)) {
    if (attributeNode.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (attributeNode.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (attributeNode.initializer.expression && ts.isStringLiteral(attributeNode.initializer.expression)) {
      return attributeNode.initializer.expression.text;
    }
  }
  return undefined;
}

function isExplicitlyHidden(node, sourceFile) {
  const hidden = attribute(node, "aria-hidden", sourceFile);
  const value = literalAttributeValue(hidden);
  return value === true || value === "true";
}

function hasAccessibleIconTag(node, sourceFile) {
  return isExplicitlyHidden(node, sourceFile)
    || Boolean(attribute(node, "aria-label", sourceFile));
}

function hasAccessibleSvgTag(node, sourceFile) {
  if (isExplicitlyHidden(node, sourceFile)) return true;
  const role = literalAttributeValue(attribute(node, "role", sourceFile));
  const label = attribute(node, "aria-label", sourceFile);
  return role === "img" && Boolean(label);
}

function isAllowedBrandMark(node, sourceFile) {
  const brand = literalAttributeValue(attribute(node, "data-brand-icon", sourceFile));
  return typeof brand === "string" && ALLOWED_BRAND_MARKS.has(brand);
}

function interactiveAncestor(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current)) {
      const tag = jsxTagName(current.openingElement);
      if (tag === "button" || tag === "a") return current;
    }
    current = current.parent;
  }
  return undefined;
}

function stringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
    return node.text;
  }
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
    return node.text;
  }
  return undefined;
}

function inspectFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const phosphorNames = new Set();
  let phosphorNamespace;

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const moduleName = statement.moduleSpecifier.text;

    if (DISALLOWED_ICON_IMPORT.test(moduleName)) {
      report(sourceFile, statement, `gebruik geen andere iconbibliotheek dan @phosphor-icons/react (${moduleName}).`);
    }

    if (moduleName !== "@phosphor-icons/react") continue;
    const clause = statement.importClause;
    if (!clause?.namedBindings) continue;
    if (ts.isNamespaceImport(clause.namedBindings)) {
      phosphorNamespace = clause.namedBindings.name.text;
      report(sourceFile, statement, "gebruik benoemde Phosphor-imports zodat elk icoon statisch controleerbaar blijft.");
      continue;
    }
    for (const element of clause.namedBindings.elements) phosphorNames.add(element.name.text);
  }

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = jsxTagName(node);

      if (tag === "svg") {
        const file = relative(filePath);
        const allowed = RAW_SVG_EXCEPTIONS.has(file) || isAllowedBrandMark(node, sourceFile);
        if (!allowed) {
          report(sourceFile, node, "vervang inline SVG-UI-iconen door een semantisch passend Phosphor-icoon.");
        } else if (!hasAccessibleSvgTag(node, sourceFile)) {
          report(sourceFile, node, "tag toegestane merk-/visualisatie-SVG als aria-hidden of als role=img met aria-label.");
        }
      }

      const isPhosphor = phosphorNames.has(tag)
        || (phosphorNamespace && tag.startsWith(`${phosphorNamespace}.`));
      if (isPhosphor && !hasAccessibleIconTag(node, sourceFile)) {
        report(sourceFile, node, `tag <${tag}> expliciet met aria-hidden=\"true\" (decoratief) of aria-label (informatief).`);
      }
    }

    const text = stringValue(node);
    if (text && EMOJI.test(text)) {
      report(sourceFile, node, "gebruik voor UI-betekenis een Phosphor-icoon in plaats van emoji.");
    }
    if (text && CONTROL_GLYPH.test(text) && interactiveAncestor(node)) {
      report(sourceFile, node, "gebruik in interactieve controls een Phosphor-icoon in plaats van een Unicode-pijl/check/kruis.");
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const file of collectFiles(ROOT)) inspectFile(file);

if (failures.length) {
  console.error(`\nIcon audit failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nPolicy: Phosphor for generic UI icons; raw SVG only for explicitly tagged brand marks/data visualisations.\n");
  process.exit(1);
}

console.log("Icon audit passed: Phosphor-only UI icons with explicit accessibility semantics.");
