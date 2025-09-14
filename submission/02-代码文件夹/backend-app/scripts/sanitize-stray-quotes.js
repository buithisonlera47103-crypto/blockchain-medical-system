#!/usr/bin/env node

/**
 * Conservative sanitizer for stray quotes and artifacts introduced by prior broken edits.
 *
 * What it does (safe heuristics):
 * - Removes lines that are only a single quote ' or double quote " or backtick `
 * - Strips a trailing single/double quote at end of line when it follows ), }, ], ;, ,, {, (, [, :, = or the end of a block comment (star-slash)
 * - Normalizes very common artifacts:
 *     ")'," -> "),"
 *     "}'," -> "},"
 *     ")]'" -> ")]"
 *     "block-end + '" -> "block-end" (e.g. turn comment terminator followed by quote into just terminator)
 *     "= {'" -> "= {"
 *     "return {'" -> "return {"
 *     ": ['" -> ": ["
 * - Does NOT touch content inside string literals beyond trimming an obviously dangling quote at line end
 * - Processes only .ts and .tsx files under backend-app/src
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

function listFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip node_modules, dist, build-like folders under src (rare)
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      out.push(...listFiles(full));
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

function sanitizeContent(content) {
  const lines = content.split(/\r?\n/);
  let changed = false;

  const sanitized = lines.map((line) => {
    const original = line;
    const trimmed = line.trim();

    // Remove lines that are just a dangling quote or backtick
    if (trimmed === "'" || trimmed === '"' || trimmed === '`') {
      changed = true;
      return '';
    }

    // Remove trailing quote if it's clearly dangling after delimiters, braces, or comment ends
    // Examples:
    //   "),'  => "),
    //   "},' => "},
    //   ")]' => ")]
    //   "*/' => "*/
    //   "= {' => "= {"
    line = line
      .replace(/([\)\]\};,:=\(\[\{])\s*['\"]\s*$/g, '$1')
      .replace(/\*\/\s*['\"]\s*$/g, '*/');

    // Replace common broken patterns within the line
    line = line
      // ,'<eol> or , '<eol>
      .replace(/,\s*['\"]\s*$/g, ',')
      // }'<eol> or }',
      .replace(/}\s*['\"](,?)\s*$/g, '}$1')
      // ]'<eol> or ]',
      .replace(/]\s*['\"](,?)\s*$/g, ']$1')
      // )'<eol> or )',
      .replace(/\)\s*['\"](,?)\s*$/g, ')$1')
      // = '{  => = {
      .replace(/=\s*\{\s*['\"]\s*$/g, '= {')
      // return '{ => return {
      .replace(/return\s*\{\s*['\"]\s*$/g, 'return {')
      // key: ['  => key: [
      .replace(/(:\s*)\[\s*['\"]\s*$/g, '$1[')
      // transports: ['  => transports: [
      .replace(/(transports:\s*)\[\s*['\"]\s*$/g, '$1[')
      // requiredEnvVars = ['  => requiredEnvVars = [
      .replace(/(requiredEnvVars\s*=\s*)\[\s*['\"]\s*$/g, '$1[');

    if (line !== original) changed = true;
    return line;
  });

  const result = sanitized.join('\n');
  return { result, changed };
}

function processFile(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { result, changed } = sanitizeContent(content);
    if (changed) {
      fs.writeFileSync(file, result, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to process ${file}: ${err.message}`);
    return false;
  }
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = listFiles(SRC_DIR);
  let changed = 0;
  for (const f of files) {
    if (processFile(f)) changed++;
  }

  console.log(`Sanitizer processed ${files.length} files, modified ${changed}.`);
}

main();

