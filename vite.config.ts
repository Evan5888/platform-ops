import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import type { Connect } from 'vite'

const inboxDir = path.resolve(
  process.env.DASHBOARD_INBOX ??
    '/cursor/stores/bc-93ae83e4-a329-4f86-98a1-8b6b50ccefa7/internal/dashboard-inbox',
)

const MAX_BYTES = 25 * 1024 * 1024

function ensureDir() {
  fs.mkdirSync(inboxDir, { recursive: true })
}

function listInbox() {
  ensureDir()
  return fs
    .readdirSync(inboxDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && /\.(csv|xlsx|xls)$/i.test(entry.name))
    .map((entry) => {
      const stat = fs.statSync(path.join(inboxDir, entry.name))
      return { name: entry.name, bytes: stat.size, modifiedAt: stat.mtime.toISOString() }
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
}

function resolveSafe(name: string): string | null {
  if (!name || name !== path.basename(name) || name.startsWith('.')) return null
  if (!/\.(csv|xlsx|xls)$/i.test(name)) return null
  ensureDir()
  const root = fs.realpathSync(inboxDir)
  const full = path.resolve(root, name)
  if (path.dirname(full) !== root || !fs.existsSync(full)) return null
  const stat = fs.lstatSync(full)
  if (!stat.isFile() || stat.isSymbolicLink()) return null
  if (stat.size > MAX_BYTES) return null
  return full
}

function attach(middlewares: Connect.Server) {
  middlewares.use((req, res, next) => {
    let url: URL
    try {
      url = new URL(req.url ?? '/', 'http://127.0.0.1')
    } catch {
      next()
      return
    }
    if (req.method !== 'GET' || (url.pathname !== '/api/inbox' && url.pathname !== '/api/inbox/file')) {
      next()
      return
    }
    res.setHeader('cache-control', 'no-store')
    res.setHeader('x-content-type-options', 'nosniff')
    try {
      if (url.pathname === '/api/inbox') {
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ folder: inboxDir, files: listInbox() }))
        return
      }
      const name = url.searchParams.get('name') ?? ''
      const full = resolveSafe(name)
      if (!full) {
        const tooBig = name === path.basename(name) && fs.existsSync(path.resolve(inboxDir, name)) && fs.statSync(path.resolve(inboxDir, name)).size > MAX_BYTES
        res.statusCode = tooBig ? 413 : 404
        res.end(tooBig ? 'too large' : 'not found')
        return
      }
      const stat = fs.statSync(full)
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', String(stat.size))
      fs.createReadStream(full).pipe(res)
    } catch {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'inbox unavailable' }))
    }
  })
}

function inboxPlugin(): Plugin {
  return {
    name: 'ops-inbox',
    configureServer(server) {
      ensureDir()
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      ensureDir()
      attach(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), inboxPlugin()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
})
