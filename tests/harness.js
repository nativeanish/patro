"use strict";

// Loads the plugin's QML JavaScript modules under node: `.pragma library` and `.import`
// are stripped and resolved by hand, and cached one instance per module as QML does.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const IMPORT = /^\s*\.import\s+"([^"]+)"\s+as\s+(\w+)\s*$/;
const PRAGMA = /^\s*\.pragma\s+\w+\s*$/;

const cache = new Map();

function load(file) {
  if (cache.has(file)) return cache.get(file);

  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  const body = [];
  const imports = [];

  for (const line of source.split("\n")) {
    const match = line.match(IMPORT);
    if (match) {
      imports.push({ file: match[1], alias: match[2] });
      body.push("");
    } else {
      body.push(PRAGMA.test(line) ? "" : line);
    }
  }

  const context = {};
  for (const dependency of imports) context[dependency.alias] = load(dependency.file);
  vm.createContext(context);

  cache.set(file, context);
  vm.runInContext(body.join("\n"), context, { filename: file });
  return context;
}

function readJson(...parts) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, ...parts), "utf8"));
}

// vm objects carry that realm's prototypes, which deepStrictEqual rejects.
function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

module.exports = { load, readJson, plain, ROOT };
