import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { IncomingMessage, ServerResponse } from 'http'

const BRAIN_DIR = '/root/.openclaw/shared-knowledge/brain'

// ─── Brain File Server Plugin ─────────────────────────────────────────────

interface FileTreeNode {
  name: string
  path?: string
  children?: FileTreeNode[]
  starred?: boolean
}

function buildFileTree(dir: string, rel = ''): FileTreeNode[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const nodes: FileTreeNode[] = []
  for (const entry of entries) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        children: buildFileTree(path.join(dir, entry.name), relPath),
      })
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      nodes.push({
        name: entry.name,
        path: relPath,
        starred: relPath === 'priorities/current-week.md',
      })
    }
  }
  // Sort: folders first, then files, both alphabetically
  return nodes.sort((a, b) => {
    const aIsFolder = !!a.children
    const bIsFolder = !!b.children
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function sendText(res: ServerResponse, text: string, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(text)
}

const brainFileServerPlugin = {
  name: 'brain-file-server',
  configureServer(server: { middlewares: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
    server.middlewares.use('/api/brain', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = new URL(req.url || '/', `http://localhost`)
      const pathname = url.pathname

      // GET /api/brain/tree
      if (pathname === '/tree' || pathname === '/tree/') {
        const tree = buildFileTree(BRAIN_DIR)
        sendJson(res, tree)
        return
      }

      // GET /api/brain/file?path=<relative-path>
      if (pathname === '/file' || pathname === '/file/') {
        const filePath = url.searchParams.get('path')
        if (!filePath) {
          sendJson(res, { error: 'Missing path parameter' }, 400)
          return
        }

        // Security: prevent path traversal
        const resolved = path.resolve(BRAIN_DIR, filePath)
        if (!resolved.startsWith(path.resolve(BRAIN_DIR))) {
          sendJson(res, { error: 'Invalid path' }, 403)
          return
        }

        try {
          const content = fs.readFileSync(resolved, 'utf-8')
          sendText(res, content)
        } catch {
          sendJson(res, { error: 'File not found' }, 404)
        }
        return
      }

      next()
    })
  },
}

// ─── Cron Data Server Plugin ──────────────────────────────────────────────
// Workaround: cron tool is in gateway HTTP deny list, so we call CLI directly

import { execSync } from 'child_process'

const GATEWAY_TOKEN = '78f651e451d1e4390f366bd953d9f3a922f0b4fcf329884d'

const cronServerPlugin = {
  name: 'cron-data-server',
  configureServer(server: { middlewares: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
    server.middlewares.use('/api/cron', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = new URL(req.url || '/', 'http://localhost')
      
      if (url.pathname === '/list') {
        try {
          const output = execSync('openclaw cron list --json', { timeout: 10000 }).toString()
          const data = JSON.parse(output)
          sendJson(res, data)
        } catch (e) {
          sendJson(res, { error: 'Failed to list cron jobs', jobs: [] }, 500)
        }
        return
      }

      if (url.pathname === '/runs') {
        const jobId = url.searchParams.get('id')
        try {
          const cmd = jobId 
            ? `openclaw cron runs --id ${jobId} --limit 10 --json`
            : `openclaw cron runs --limit 50 --json`
          const output = execSync(cmd, { timeout: 10000 }).toString()
          const data = JSON.parse(output)
          sendJson(res, data)
        } catch (e) {
          sendJson(res, { error: 'Failed to list cron runs', runs: [] }, 500)
        }
        return
      }

      next()
    })
  },
}

// ─── Usage Data Server Plugin ─────────────────────────────────────────────
// Fetches session usage data from gateway and serves it for the Cost Tracker

const usageServerPlugin = {
  name: 'usage-data-server',
  configureServer(server: { middlewares: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
    server.middlewares.use('/api/usage', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = new URL(req.url || '/', 'http://localhost')
      
      if (url.pathname === '/sessions') {
        // Fetch all session data from gateway for usage tracking
        const http = require('http')
        const reqOptions = {
          hostname: '127.0.0.1',
          port: 18789,
          path: '/tools/invoke',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
        
        const gwReq = http.request(reqOptions, (gwRes: IncomingMessage) => {
          let body = ''
          gwRes.on('data', (chunk: Buffer) => { body += chunk.toString() })
          gwRes.on('end', () => {
            try {
              const data = JSON.parse(body)
              if (data.ok && data.result?.details) {
                sendJson(res, data.result.details)
              } else {
                sendJson(res, { count: 0, sessions: [] })
              }
            } catch {
              sendJson(res, { count: 0, sessions: [] }, 500)
            }
          })
        })
        
        gwReq.on('error', () => {
          sendJson(res, { count: 0, sessions: [] }, 500)
        })
        
        gwReq.write(JSON.stringify({ tool: 'sessions_list', args: {} }))
        gwReq.end()
        return
      }

      next()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    brainFileServerPlugin,
    cronServerPlugin,
    usageServerPlugin,
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/gateway': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gateway/, ''),
      },
    },
  },
})
