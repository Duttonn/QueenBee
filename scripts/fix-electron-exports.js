#!/usr/bin/env node
/**
 * Patches vite-plugin-electron CJS output so the entry point actually executes.
 *
 * vite-plugin-electron wraps everything in __commonJS and may or may not add
 * `export default require_xxx();` at the bottom. In a .cjs file that line is
 * either a syntax error or a no-op depending on the Node version.
 *
 * This script:
 *  1. Removes any `export default …` lines.
 *  2. Ensures exactly one `require_<name>();` call at the end.
 */

const fs = require('fs');
const path = require('path');

// Accept optional directory argument, otherwise default to <root>/dist-electron
const dir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'dist-electron');

function patch(file) {
  const fp = path.join(dir, file);
  if (!fs.existsSync(fp)) {
    console.log(`[fix-exports] ${file} not found, skipping`);
    return;
  }

  let code = fs.readFileSync(fp, 'utf8');

  // Detect the __commonJS wrapper name: var require_main = __commonJS(…)
  const match = code.match(/var (require_\w+)\s*=\s*__commonJS/);
  if (!match) {
    console.log(`[fix-exports] ${file}: no __commonJS wrapper found, skipping`);
    return;
  }
  const fnName = match[1]; // e.g. require_main or require_preload

  // Remove all `export default …` lines
  code = code.replace(/^export default .*$/gm, '');

  // Remove any existing bare `require_xxx();` calls at the end
  code = code.replace(new RegExp(`^${fnName}\\(\\);\\s*$`, 'gm'), '');

  // Trim trailing whitespace and append exactly one call
  code = code.trimEnd() + '\n' + fnName + '();\n';

  fs.writeFileSync(fp, code);
  console.log(`[fix-exports] ${file}: patched → ${fnName}() appended`);
}

patch('main.cjs');
patch('preload.cjs');
