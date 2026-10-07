import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "apps/web/out");
const port = Number(process.argv[3] ?? "4010");

if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid static-server port");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function insideRoot(path) {
  return path === root || path.startsWith(root + sep);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    let file = resolve(root, "." + pathname);
    if (!insideRoot(file)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");

    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type":
        contentTypes[extname(file).toLowerCase()] ??
        "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Unknown-Yield-Export": "static",
    });
    if (request.method === "HEAD") response.end();
    else response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving static export from ${root} on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
