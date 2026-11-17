import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const MARK='// GENERATED DEVELOPMENT STUDIO ENTRY\n';
const route=new URL('../apps/web/app/studio-entry/',import.meta.url);
const dataDir=fileURLToPath(new URL('../packages/content/data/',import.meta.url));
await mkdir(new URL('api/',route),{recursive:true});
await writeFile(new URL('page.tsx',route),MARK+'import Studio from "../../components/Studio";\nexport default Studio;\n');
// Local-only read/write of the repo content files. Generated for `dev:studio`
// and removed before every production build (scripts/prepare-build.mjs).
await writeFile(new URL('api/route.ts',route),MARK+`import { readFile, writeFile } from "node:fs/promises";
import { parseStudioBundle } from "@site/content/bundle";

const DIR = ${JSON.stringify(dataDir)};
const ALLOWED = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);

// A custom header forces a CORS preflight for cross-site pages, which this
// route never answers; the Origin check covers everything else.
function refuse(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (request.headers.get("x-studio") !== "1" || (origin !== null && !ALLOWED.has(origin)))
    return Response.json({ error: "Studio API is local only" }, { status: 403 });
  return null;
}

const text = (value: unknown) => JSON.stringify(value, null, 2) + "\\n";

export async function GET(request: Request) {
  const denied = refuse(request);
  if (denied) return denied;
  const [content, locale] = await Promise.all([
    readFile(DIR + "content.json", "utf8"),
    readFile(DIR + "locale.en.json", "utf8"),
  ]);
  return Response.json({ schemaVersion: 1, content: JSON.parse(content), locale: JSON.parse(locale) });
}

export async function PUT(request: Request) {
  const denied = refuse(request);
  if (denied) return denied;
  try {
    const bundle = parseStudioBundle(await request.text());
    const locale = Object.fromEntries(
      Object.entries(bundle.locale).sort(([a], [b]) => a.localeCompare(b)),
    );
    await writeFile(DIR + "content.json", text(bundle.content));
    await writeFile(DIR + "locale.en.json", text(locale));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
`);
console.log('Development Studio: http://127.0.0.1:3000/studio-entry/');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','apps/web','--hostname','127.0.0.1'],{stdio:'inherit',env:{...process.env,STUDIO_DEV:'1'}});
child.on('exit',code=>{process.exitCode=code??1;});
