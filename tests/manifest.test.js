"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { readJson, ROOT } = require("./harness.js");

const manifest = readJson("manifest.json");
const widget = manifest.barWidget;

test("the manifest carries every field the registry requires", () => {
  assert.equal(manifest.schemaVersion, 1);
  for (const field of ["id", "name", "version", "author", "description", "kinds", "entryPoints"]) {
    assert.ok(manifest[field], `manifest is missing ${field}`);
  }
  assert.deepEqual(manifest.kinds, ["bar-widget"]);
  assert.ok(manifest.version.length <= 64);
});

test("the id is one the shell will accept", () => {
  assert.match(manifest.id, /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9.-]*$/,
    "an id must be namespaced, lower case, and must not start with a digit");
  assert.ok(!manifest.id.startsWith("omarchy."), "the omarchy. prefix is reserved");
});

test("every entry point resolves to a file that exists", () => {
  for (const [kind, file] of Object.entries(manifest.entryPoints)) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${kind} points at a missing ${file}`);
  }
});

test("each QML and JS file the plugin ships is reachable from an entry point", () => {
  const seen = new Set();
  const queue = Object.values(manifest.entryPoints);
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const match of source.matchAll(/(?:^import|^\s*\.import)\s+"([^"]+\.js)"/gm)) {
      queue.push(match[1]);
    }
    // A Loader names its target in a string, not as a type.
    for (const match of source.matchAll(/Qt\.resolvedUrl\("([^"]+\.qml)"\)/g)) {
      queue.push(match[1]);
    }
    for (const match of source.matchAll(/^\s*([A-Z]\w+)\s*\{/gm)) {
      const sibling = `${match[1]}.qml`;
      if (fs.existsSync(path.join(ROOT, sibling))) queue.push(sibling);
    }
  }
  const shipped = fs.readdirSync(ROOT).filter((name) => /\.(qml|js)$/.test(name));
  for (const file of shipped) {
    assert.ok(seen.has(file), `${file} ships but nothing reaches it`);
  }
});

test("every default has a matching schema entry and vice versa", () => {
  const defaults = Object.keys(widget.defaults).sort();
  const schema = widget.schema.map((entry) => entry.key).sort();
  assert.deepEqual(schema, defaults);
});

test("each schema entry is a type the settings UI can render", () => {
  const types = new Set(["boolean", "enum", "string", "integer"]);
  for (const entry of widget.schema) {
    assert.ok(types.has(entry.type), `${entry.key} has type ${entry.type}`);
    assert.ok(entry.label, `${entry.key} has no label`);
    assert.deepEqual(entry.defaultValue, widget.defaults[entry.key],
      `${entry.key} disagrees with its own default`);
    if (entry.type === "enum") {
      assert.ok(Array.isArray(entry.options) && entry.options.length > 1, `${entry.key} needs options`);
      assert.ok(entry.options.includes(entry.defaultValue),
        `${entry.key} defaults to something not in its options`);
    }
  }
});

test("the enum options are the ones the code actually accepts", () => {
  const { load, plain } = require("./harness.js");
  const Nepali = load("Nepali.js");
  const byKey = Object.fromEntries(widget.schema.map((entry) => [entry.key, entry]));
  assert.deepEqual(byKey.language.options, plain(Nepali.LANGUAGES));
  assert.deepEqual(byKey.numerals.options, plain(Nepali.NUMERALS));
  assert.deepEqual(byKey.format.options, plain(Nepali.FORMATS));
  assert.deepEqual(byKey.weekStart.options, plain(Nepali.WEEK_STARTS));
});

test("the bar section is one the bar has", () => {
  assert.ok(["left", "center", "right"].includes(widget.defaultSection));
});

test("a preview image sits at the repo root", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "preview.png")),
    "preview.png must be at the root; nothing under screenshots/ is read");
});

test("the licence is declared and shipped", () => {
  assert.equal(manifest.license, "MIT");
  assert.ok(fs.existsSync(path.join(ROOT, "LICENSE")));
});
