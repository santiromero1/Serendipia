import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const DATA = fileURLToPath(new URL('./.library-cache/data', import.meta.url))
const LIBRARY = path.join(DATA, 'library.json')
const PREVIEWS = fileURLToPath(new URL('./.library-cache/audio', import.meta.url))
const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  aiff: 'audio/aiff',
  aif: 'audio/aiff',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
}

/**
 * Chrome no reproduce AIFF. La primera vez que se pide un AIFF se convierte a MP3 en
 * .library-cache/audio (el original no se toca) y después se sirve esa copia.
 */
const converting = new Map<string, Promise<string>>()
function playable(id: string, file: string): Promise<string> {
  if (!/\.aiff?$/i.test(file)) return Promise.resolve(file)
  const out = path.join(PREVIEWS, `${id}.mp3`)
  if (fs.existsSync(out)) return Promise.resolve(out)
  let job = converting.get(id)
  if (!job) {
    fs.mkdirSync(PREVIEWS, { recursive: true })
    const tmp = `${out}.part`
    job = new Promise<string>((resolve, reject) => {
      const p = spawn('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', '-f', 'mp3', tmp], { stdio: 'ignore' })
      p.on('error', reject)
      p.on('close', (code) => {
        if (code === 0) {
          fs.renameSync(tmp, out)
          resolve(out)
        } else reject(new Error('ffmpeg'))
      })
    }).finally(() => converting.delete(id))
    converting.set(id, job)
  }
  return job
}

/**
 * Sirve el audio de la biblioteca local en /audio/<id>, con soporte de Range para poder saltar.
 * Solo entrega archivos que figuran en library.json: el id nunca se usa como ruta.
 */
function localAudio(): Plugin {
  let cache: { mtime: number; root: string; paths: Map<string, string> } | null = null
  const index = () => {
    const mtime = fs.statSync(LIBRARY).mtimeMs
    if (cache?.mtime !== mtime) {
      const lib = JSON.parse(fs.readFileSync(LIBRARY, 'utf8'))
      cache = { mtime, root: lib.root, paths: new Map(lib.tracks.map((t: { id: string; rel: string }) => [t.id, t.rel])) }
    }
    return cache!
  }
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    // /data/library.json, /data/peaks.json y /data/covers/<id>.jpg
    const data = req.url?.match(/^\/data\/(library\.json|peaks\.json|covers\/[a-f0-9]{12}\.jpg)(?:\?.*)?$/)?.[1]
    if (data) {
      const file = path.join(DATA, data)
      if (!fs.existsSync(file)) {
        res.statusCode = 404
        return res.end()
      }
      res.writeHead(200, { 'Content-Type': data.endsWith('.jpg') ? 'image/jpeg' : 'application/json', 'Cache-Control': 'no-store' })
      return void fs.createReadStream(file).pipe(res)
    }
    const id = req.url?.match(/^\/audio\/([a-f0-9]{12})(?:\?.*)?$/)?.[1]
    if (!id) return next()
    try {
      const { root, paths } = index()
      const rel = paths.get(id)
      if (!rel) throw new Error('desconocido')
      const file = await playable(id, path.join(root, rel))
      const size = fs.statSync(file).size
      const type = MIME[path.extname(file).slice(1).toLowerCase()] ?? 'application/octet-stream'
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/)
      const start = range?.[1] ? Number(range[1]) : 0
      const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1
      res.writeHead(range ? 206 : 200, {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
      })
      fs.createReadStream(file, { start, end }).pipe(res)
    } catch {
      res.statusCode = 404
      res.end()
    }
  }
  return {
    name: 'serendipia-local-audio',
    configureServer: (server) => void server.middlewares.use(handler),
    configurePreviewServer: (server) => void server.middlewares.use(handler),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localAudio()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
})
