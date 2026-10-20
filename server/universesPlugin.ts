import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-zA-Z0-9_-]{4,80}$/;
const MAX_BYTES = 8_000_000;

type Stored = {
  schemaVersion?: number;
  kind?: string;
  meta?: {
    id?: string;
    title?: string;
    slug?: string;
    status?: string;
    updatedAt?: string;
    publishedAt?: string;
  };
  intro?: { forName?: string };
  forName?: string;
  stars?: unknown[];
};

function isProject(doc: Stored | null): doc is Stored {
  if (!doc) return false;
  if (doc.kind === 'cita') return Boolean(doc.meta?.id);
  return Array.isArray(doc.stars);
}

function rootDir() {
  return path.resolve(process.cwd(), 'data');
}

async function readJson(file: string): Promise<Stored | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

async function writeJson(file: string, body: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  await fs.rename(tmp, file);
}

type VisitReply = {
  at: string;
  answer: 'yes';
  dateId: string;
  dateLabel: string;
};

type VisitStored = {
  opens: number;
  lastAt: string;
  lastMs: number;
  started: Record<string, string>;
  noTries: number;
  reply?: VisitReply;
};

function visitsPath() {
  return path.join(rootDir(), 'visits.json');
}

async function readVisits(): Promise<Record<string, VisitStored>> {
  try {
    const raw = await fs.readFile(visitsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, Partial<VisitStored>>;
    const rows: Record<string, VisitStored> = {};
    for (const [id, value] of Object.entries(parsed ?? {})) {
      rows[id] = {
        opens: typeof value.opens === 'number' ? value.opens : 0,
        lastAt: typeof value.lastAt === 'string' ? value.lastAt : '',
        lastMs: typeof value.lastMs === 'number' ? value.lastMs : 0,
        started: value.started && typeof value.started === 'object' ? value.started : {},
        noTries: typeof value.noTries === 'number' ? value.noTries : 0,
        reply: value.reply && typeof value.reply === 'object' ? (value.reply as VisitReply) : undefined,
      };
    }
    return rows;
  } catch {
    return {};
  }
}

function publicVisits(all: Record<string, VisitStored>) {
  return Object.fromEntries(
    Object.entries(all).map(([id, row]) => [
      id,
      { opens: row.opens, lastAt: row.lastAt, lastMs: row.lastMs, noTries: row.noTries, reply: row.reply },
    ]),
  );
}

function summary(doc: Stored, fallbackId: string) {
  return {
    id: doc.meta?.id || fallbackId,
    slug: doc.meta?.slug || '',
    title: doc.meta?.title || '',
    forName: doc.intro?.forName || doc.forName || '',
    status: doc.meta?.status || 'draft',
    updatedAt: doc.meta?.updatedAt || '',
    publishedAt: doc.meta?.publishedAt || '',
    starCount: doc.kind === 'cita' ? (Array.isArray((doc as { dates?: unknown[] }).dates) ? (doc as { dates: unknown[] }).dates.length : 0) : Array.isArray(doc.stars) ? doc.stars.length : 0,
  };
}

async function listDir(kind: 'drafts' | 'universes') {
  const dir = path.join(rootDir(), kind);
  await fs.mkdir(dir, { recursive: true });
  const names = await fs.readdir(dir);
  const rows = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const id = name.slice(0, -5);
    const doc = await readJson(path.join(dir, name));
    if (doc) rows.push(summary(doc, id));
  }
  rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return rows;
}

function lanUrls(port: number) {
  const wifi: string[] = [];
  const other: string[] = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const url = `http://${net.address}:${port}`;
      if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) wifi.push(url);
      else other.push(url);
    }
  }
  return [...new Set([`http://localhost:${port}`, ...wifi, ...other])];
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BYTES) throw new Error('too-large');
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(res: ServerResponse, status: number, body: unknown) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(json);
}

function wantsDocument(req: IncomingMessage) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (req.headers['sec-fetch-dest'] === 'document') return true;
  return String(req.headers.accept || '').includes('text/html');
}

const DIST = path.resolve(process.cwd(), 'dist');

function isLoopback(req: IncomingMessage) {
  const host = String(req.headers.host || '')
    .replace(/:\d+$/, '')
    .toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

function contentType(file: string) {
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.woff2')) return 'font/woff2';
  if (file.endsWith('.woff')) return 'font/woff';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function canGzip(file: string) {
  return file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.svg');
}

function ensureFastBuild() {
  const flag = globalThis as typeof globalThis & { __lumenFastBuild?: boolean };
  if (flag.__lumenFastBuild) return;
  flag.__lumenFastBuild = true;
  const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [viteBin, 'build', '--watch'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
  child.on('exit', () => {
    flag.__lumenFastBuild = false;
  });
}

async function injectDoc(html: string, url: URL) {
  const page = url.pathname.match(/^\/(?:u\/([^/]+)|p\/([^/]+))\/?$/);
  if (!page) return html;
  const slug = page[1] ? decodeURIComponent(page[1]) : '';
  const id = page[2] ? decodeURIComponent(page[2]) : '';
  const valid = slug ? SLUG.test(slug) : ID.test(id);
  const file = slug ? path.join(rootDir(), 'universes', `${slug}.json`) : path.join(rootDir(), 'drafts', `${id}.json`);
  const doc = valid ? await readJson(file) : null;
  if (!doc) return html;
  const payload = JSON.stringify(doc).replace(/</g, '\\u003c');
  return html.replace('<div id="root"></div>', `<div id="root"></div><script>window.__LUMEN_DOC__=${payload}</script>`);
}

async function serveBuiltApp(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (isLoopback(req) || url.pathname.startsWith('/api/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname.includes('..') || url.pathname.includes('\0')) return false;

  let indexHtml: string;
  try {
    indexHtml = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  } catch {
    return false;
  }

  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const candidate = path.normalize(path.join(DIST, rel === '' ? 'index.html' : rel));
  const root = path.normalize(DIST + path.sep);
  if (!candidate.startsWith(root) && candidate !== path.normalize(DIST)) return false;

  if (!wantsDocument(req)) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) return false;
      const buf = await fs.readFile(candidate);
      const gzip = canGzip(candidate) && String(req.headers['accept-encoding'] || '').includes('gzip');
      const body = gzip ? zlib.gzipSync(buf) : buf;
      res.statusCode = 200;
      res.setHeader('content-type', contentType(candidate));
      res.setHeader('cache-control', candidate.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
      res.setHeader('vary', 'accept-encoding');
      if (gzip) res.setHeader('content-encoding', 'gzip');
      res.end(req.method === 'HEAD' ? undefined : body);
      return true;
    } catch {
      return false;
    }
  }

  const html = await injectDoc(indexHtml, url);
  const gzip = String(req.headers['accept-encoding'] || '').includes('gzip');
  const raw = Buffer.from(html);
  const body = gzip ? zlib.gzipSync(raw) : raw;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('vary', 'accept-encoding');
  if (gzip) res.setHeader('content-encoding', 'gzip');
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}

export function universesApi(): Plugin {
  return {
    name: 'lumen-universes',
    configureServer(server) {
      ensureFastBuild();
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (await serveBuiltApp(req, res, url)) return;
        const page = url.pathname.match(/^\/(?:u\/([^/]+)|p\/([^/]+))\/?$/);
        if (page && wantsDocument(req)) {
          try {
            const slug = page[1] ? decodeURIComponent(page[1]) : '';
            const id = page[2] ? decodeURIComponent(page[2]) : '';
            const valid = slug ? SLUG.test(slug) : ID.test(id);
            const file = slug
              ? path.join(rootDir(), 'universes', `${slug}.json`)
              : path.join(rootDir(), 'drafts', `${id}.json`);
            const doc = valid ? await readJson(file) : null;
            const indexPath = path.resolve(process.cwd(), 'index.html');
            let html = await fs.readFile(indexPath, 'utf8');
            if (doc) {
              const payload = JSON.stringify(doc).replace(/</g, '\\u003c');
              html = html.replace(
                '<div id="root"></div>',
                `<div id="root"></div><script>window.__LUMEN_DOC__=${payload}</script>`,
              );
            }
            html = await server.transformIndexHtml(url.pathname + url.search, html);
            res.statusCode = 200;
            res.setHeader('content-type', 'text/html; charset=utf-8');
            res.setHeader('cache-control', 'no-store');
            res.end(req.method === 'HEAD' ? undefined : html);
          } catch (error) {
            next(error);
          }
          return;
        }

        if (!url.pathname.startsWith('/api/')) {
          next();
          return;
        }
        try {
          const port = server.config.server.port || 5180;
          if (url.pathname === '/api/health') {
            send(res, 200, { ok: true, port, urls: lanUrls(port) });
            return;
          }
          if (url.pathname === '/api/drafts' && req.method === 'GET') {
            send(res, 200, await listDir('drafts'));
            return;
          }
          if (url.pathname === '/api/universes' && req.method === 'GET') {
            send(res, 200, await listDir('universes'));
            return;
          }
          if (url.pathname === '/api/visits' && req.method === 'GET') {
            send(res, 200, publicVisits(await readVisits()));
            return;
          }
          const visit = url.pathname.match(/^\/api\/visits\/([^/]+)$/);
          if (visit && req.method === 'POST') {
            const id = decodeURIComponent(visit[1] || '');
            if (!ID.test(id)) {
              send(res, 400, { error: 'Identificador no válido.' });
              return;
            }
            let body: { visitor?: string; kind?: string; dateId?: string; dateLabel?: string } = {};
            try {
              const raw = await readBody(req);
              body = raw ? (JSON.parse(raw) as typeof body) : {};
            } catch {
              body = {};
            }
            const all = await readVisits();
            const visitor = String(body.visitor || 'anon').slice(0, 80);
            const kind = body.kind === 'pulse' || body.kind === 'reply' || body.kind === 'no' ? body.kind : 'start';
            const now = new Date().toISOString();
            const current = all[id] ?? { opens: 0, lastAt: '', lastMs: 0, started: {}, noTries: 0 };
            if (kind === 'start') {
              current.opens += 1;
              current.started[visitor] = now;
              current.lastMs = 0;
            } else if (kind === 'pulse' && current.started[visitor]) {
              current.lastMs = Math.max(0, Date.now() - new Date(current.started[visitor]).getTime());
            } else if (kind === 'no') {
              current.noTries += 1;
            } else if (kind === 'reply') {
              current.reply = {
                at: now,
                answer: 'yes',
                dateId: String(body.dateId || '').slice(0, 80),
                dateLabel: String(body.dateLabel || '').slice(0, 180),
              };
            }
            current.lastAt = now;
            all[id] = current;
            await writeJson(visitsPath(), JSON.stringify(all, null, 2));
            send(res, 200, { ok: true });
            return;
          }

          const draft = url.pathname.match(/^\/api\/drafts\/([^/]+)$/);
          if (draft) {
            const id = decodeURIComponent(draft[1] || '');
            if (!ID.test(id)) {
              send(res, 400, { error: 'Identificador no válido.' });
              return;
            }
            const file = path.join(rootDir(), 'drafts', `${id}.json`);
            if (req.method === 'GET') {
              const doc = await readJson(file);
              if (!doc) send(res, 404, { error: 'No está este borrador.' });
              else send(res, 200, doc);
              return;
            }
            if (req.method === 'PUT') {
              const raw = await readBody(req);
              const doc = JSON.parse(raw) as Stored;
              if (!isProject(doc)) {
                send(res, 400, { error: 'El proyecto no se reconoce.' });
                return;
              }
              await writeJson(file, JSON.stringify(doc, null, 2));
              send(res, 200, { ok: true });
              return;
            }
            if (req.method === 'DELETE') {
              await fs.rm(file, { force: true });
              send(res, 200, { ok: true });
              return;
            }
          }

          const published = url.pathname.match(/^\/api\/universes\/([^/]+)$/);
          if (published) {
            const slug = decodeURIComponent(published[1] || '');
            if (!SLUG.test(slug)) {
              send(res, 400, { error: 'El enlace solo puede llevar letras, números y guiones.' });
              return;
            }
            const file = path.join(rootDir(), 'universes', `${slug}.json`);
            if (req.method === 'GET') {
              const doc = await readJson(file);
              if (!doc) send(res, 404, { error: 'Este universo no está publicado.' });
              else send(res, 200, doc);
              return;
            }
            if (req.method === 'PUT') {
              const raw = await readBody(req);
              const doc = JSON.parse(raw) as Stored;
              if (!isProject(doc) || !doc.meta?.id) {
                send(res, 400, { error: 'Falta el proyecto.' });
                return;
              }
              const existing = await readJson(file);
              if (existing?.meta?.id && existing.meta.id !== doc.meta.id) {
                send(res, 409, { error: 'Ese enlace ya pertenece a otro universo.' });
                return;
              }
              doc.meta.slug = slug;
              doc.meta.status = 'published';
              await writeJson(file, JSON.stringify(doc, null, 2));
              send(res, 200, { ok: true, slug });
              return;
            }
            if (req.method === 'DELETE') {
              await fs.rm(file, { force: true });
              send(res, 200, { ok: true });
              return;
            }
          }

          send(res, 404, { error: 'No existe.' });
        } catch (error) {
          const tooLarge = error instanceof Error && error.message === 'too-large';
          send(res, tooLarge ? 413 : 500, {
            error: tooLarge ? 'El universo pesa demasiado.' : 'No se pudo guardar.',
          });
        }
      });
    },
  };
}
