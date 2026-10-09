const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const relative = pathname.replace(/^\/+/, "") || "index.html";
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(target, (statError, stat) => {
    const file = statError ? null : stat.isDirectory() ? path.join(target, "index.html") : target;
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    fs.readFile(file, (readError, data) => {
      if (readError) {
        res.writeHead(readError.code === "ENOENT" ? 404 : 500);
        res.end(readError.code === "ENOENT" ? "Not Found" : "Server Error");
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`PIJUSH OS E2E server listening on http://127.0.0.1:${port}`);
});
