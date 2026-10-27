import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
const realRequire = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../..");
const featureAlias = "@/app/(site)/profile/calendario-universita/_lib/";
const featureDirectory = path.resolve(root, featureAlias.slice(2));

// Compile just the feature modules in memory, using the project's existing TypeScript.
export default function load(name, mocks = {}, cache = new Map()) {
  const filename = name.startsWith("@/") ? path.resolve(root, `${name.slice(2)}.ts`) : path.resolve(featureDirectory, `${name}.ts`);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule.exports);
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith(featureAlias) && Object.hasOwn(mocks, `./${id.slice(featureAlias.length)}`)) return mocks[`./${id.slice(featureAlias.length)}`];
    if (id.startsWith(featureAlias) || id === "@/lib/profile-options") return load(id, mocks, cache);
    return id.startsWith("./") ? load(path.resolve(path.dirname(filename), id), mocks, cache) : realRequire(id);
  };
  new Function("require", "module", "exports", output)(localRequire, compiledModule, compiledModule.exports);
  cache.set(filename, compiledModule.exports);
  return compiledModule.exports;
};
