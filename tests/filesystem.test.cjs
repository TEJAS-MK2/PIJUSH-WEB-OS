const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "kernel.js"), "utf8");

function makeKernel() {
  const context = { console, structuredClone };
  vm.createContext(context);
  context.window = context;
  vm.runInContext(source, context, { filename: "kernel.js" });
  return context.PIJUSH.kernel;
}

test("virtual filesystem accepts ordinary nested paths and rejects traversal", () => {
  const kernel = makeKernel();
  const filesystem = kernel.fs;
  assert.equal(filesystem.normalize("Documents/README.txt"), "Documents/README.txt");
  assert.equal(filesystem.normalize("folder//child.txt"), "folder/child.txt");
  assert.equal(filesystem.normalize(""), "");
  for (const unsafe of [
    "../secret.txt",
    "Documents/../../secret.txt",
    "Documents/./secret.txt",
    "/absolute.txt",
    "folder/",
    "folder\\secret.txt",
    "folder/\u0000secret.txt",
  ]) {
    assert.throws(() => filesystem.normalize(unsafe), /invalid path/i, unsafe);
  }
});

test("filesystem rejects invalid records and does not accept empty file paths", async () => {
  const kernel = makeKernel();
  await kernel.ready;
  await assert.rejects(kernel.fs.write("", { type: "file", content: "bad" }), /invalid path/i);
  await assert.rejects(kernel.fs.write("bad.txt", { type: "file", content: 42 }), /invalid file record/i);
  await assert.rejects(kernel.fs.write("bad.txt", { type: "symlink", target: "notes.txt" }), /invalid file record/i);
  await assert.rejects(kernel.fs.read("../notes.txt"), /invalid path/i);
  await assert.rejects(kernel.fs.remove("folder\\notes.txt"), /invalid path/i);
});

test("restore validates every entry before replacing existing workspace data", async () => {
  const kernel = makeKernel();
  await kernel.ready;
  await kernel.fs.write("keep.txt", { type: "file", content: "keep me" });
  await assert.rejects(
    kernel.fs.replaceAll([
      ["safe.txt", { type: "file", content: "valid entry" }],
      ["../escape.txt", { type: "file", content: "invalid entry" }],
    ]),
    /invalid path/i,
  );
  assert.equal((await kernel.fs.read("keep.txt")).content, "keep me");
  await assert.rejects(
    kernel.fs.replaceAll([
      ["same.txt", { type: "file", content: "one" }],
      ["same.txt", { type: "file", content: "two" }],
    ]),
    /duplicate/i,
  );
  assert.equal((await kernel.fs.read("keep.txt")).content, "keep me");
});

test("filesystem supports local create, read, rename-by-copy, and delete primitives", async () => {
  const kernel = makeKernel();
  await kernel.ready;
  await kernel.fs.write("Projects", { type: "dir" });
  await kernel.fs.write("Projects/notes.txt", { type: "file", content: "local content" });
  assert.equal((await kernel.fs.read("Projects/notes.txt")).content, "local content");
  await kernel.fs.write("Projects/renamed.txt", await kernel.fs.read("Projects/notes.txt"));
  await kernel.fs.remove("Projects/notes.txt");
  assert.equal(await kernel.fs.read("Projects/notes.txt"), null);
  assert.equal((await kernel.fs.read("Projects/renamed.txt")).content, "local content");
});
