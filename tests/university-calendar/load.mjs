import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
const realRequire = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

// Compile just the feature modules in memory, using the project's existing TypeScript.
export default function load(name, mocks = {}, cache = new Map()) {
  const filename = path.resolve(directory, "../../lib/university-calendar", `${name}.ts`);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule.exports);
  const localRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : id === "@/lib/profile-options" ? load("../profile-options", mocks, cache) : id.startsWith("./") ? load(path.basename(id), mocks, cache) : realRequire(id);
  new Function("require", "module", "exports", output)(localRequire, compiledModule, compiledModule.exports);
  cache.set(filename, compiledModule.exports);
  return compiledModule.exports;
};
