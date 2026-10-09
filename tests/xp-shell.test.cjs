const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const index = read("index.html");
const app = read("app.js");
const styles = read("styles.css");
const sw = read("sw.js");

test("XP shell includes the Start menu, taskbar, clock, and desktop shortcuts", () => {
  assert.match(index, /id="launcher"/);
  assert.match(index, /class="start-links"/);
  assert.match(index, /class="desktop-shortcuts"/);
  assert.match(app, /id="task-buttons"/);
  assert.match(app, /class="xp-start"/);
  assert.match(styles, /\.dock\.xp-start|\.dock \.xp-start/);
});

test("taskbar clock updates the visible dock clock, not the hidden topbar clock", () => {
  assert.match(app, /const clockEl=\$\("#dock #clock"\)\|\|\$("#clock"\)/);
});

test("minimizing a window hands focus to another visible window", () => {
  assert.match(app, /function focusNext\(except\)/);
  assert.match(app, /focusNext\(el\)/);
  assert.match(app, /focusNext\(w\)/);
  assert.match(app, /el\.classList\.remove\("active"\)/);
});

test("all shell asset query versions match the service-worker cache generation", () => {
  const versions = [...index.matchAll(/\?v=(\d+)/g)].map((match) => match[1]);
  assert.ok(versions.length >= 6, "expected versioned script and stylesheet references");
  assert.equal(new Set(versions).size, 1, "all index assets should share one version");
  assert.match(sw, new RegExp('const CACHE="pijush-os-v' + versions[0] + '"'));
  assert.ok(sw.includes("?v=" + versions[0]), "service worker should precache the same asset version");
});

test("XP visual overrides retain a responsive mobile layout and boot screen", () => {
  assert.match(styles, /\.xp-boot-logo/);
  assert.match(styles, /\.task-window/);
  assert.match(styles, /@media\s*\(max-width:\s*600px\)/);
});
