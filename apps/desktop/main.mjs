/**
 * Serendipia de escritorio (uso personal).
 * Levanta el servidor local de la web (datos, audio, bandeja) dentro de la app, abre una ventana
 * y vigila la carpeta de descargas: cuando aparece un tema nuevo avisa y lo cuenta en el Dock.
 */
import { app, BrowserWindow, Menu, Notification, shell } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = fileURLToPath(new URL('../web', import.meta.url))
const DOWNLOADS = process.env.SERENDIPIA_INBOX_DIR ?? path.join(os.homedir(), 'Downloads')
const AUDIO = /\.(mp3|aiff?|wav|m4a)$/i

// la app se abre desde el Finder con un PATH mínimo: ffmpeg y node suelen estar en Homebrew
process.env.PATH = ['/opt/homebrew/bin', '/usr/local/bin', process.env.PATH].join(':')

let win = null
let url = null
let server = null

async function startServer() {
  const { createServer } = await import(path.join(WEB, 'node_modules', 'vite', 'dist', 'node', 'index.js')).catch(() => import('vite'))
  server = await createServer({ root: WEB, configFile: path.join(WEB, 'vite.config.ts'), server: { host: '127.0.0.1', port: 5183, strictPort: false, open: false }, logLevel: 'warn' })
  await server.listen()
  return server.resolvedUrls.local[0]
}

function createWindow(route = '') {
  if (win && !win.isDestroyed()) {
    if (route) win.loadURL(url + route)
    win.show()
    win.focus()
    return
  }
  win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0d0e10',
    title: 'Serendipia',
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  win.loadURL(url + route)
  // los enlaces externos se abren en el navegador, no dentro de la app
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target)
    return { action: 'deny' }
  })
}

/** Temas de audio en descargas (primer nivel y un nivel de subcarpetas). */
function audioIn(dir, depth = 1) {
  let out = []
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory() && depth > 0) out = out.concat(audioIn(p, depth - 1))
      else if (AUDIO.test(e.name) && !e.name.endsWith('.crdownload')) out.push(p)
    }
  } catch {
    /* carpeta sin permiso: se ignora */
  }
  return out
}

function watchDownloads() {
  let known = new Set(audioIn(DOWNLOADS))
  const refresh = () => {
    const now = audioIn(DOWNLOADS)
    const fresh = now.filter((f) => !known.has(f))
    known = new Set(now)
    app.dock?.setBadge(now.length ? String(now.length) : '')
    if (!fresh.length) return
    const n = new Notification({
      title: fresh.length === 1 ? 'Tema nuevo en la bandeja' : `${fresh.length} temas nuevos en la bandeja`,
      body: fresh.length === 1 ? path.basename(fresh[0]) : fresh.slice(0, 3).map((f) => path.basename(f)).join('\n'),
    })
    n.on('click', () => createWindow('bandeja'))
    n.show()
  }
  app.dock?.setBadge(known.size ? String(known.size) : '')
  let timer = null
  // las descargas llegan en varios eventos (archivo temporal, renombre): se espera a que se calme
  const onChange = () => {
    clearTimeout(timer)
    timer = setTimeout(refresh, 2500)
  }
  try {
    fs.watch(DOWNLOADS, { recursive: true }, onChange)
  } catch {
    setInterval(refresh, 15000)
  }
}

app.setName('Serendipia')
app.whenReady().then(async () => {
  app.dock?.setIcon(fileURLToPath(new URL('./icon.png', import.meta.url)))
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      {
        label: 'Ir',
        submenu: [
          { label: 'Biblioteca', accelerator: 'Cmd+1', click: () => createWindow('') },
          { label: 'Mapa', accelerator: 'Cmd+2', click: () => createWindow('mapa') },
          { label: 'Sets', accelerator: 'Cmd+3', click: () => createWindow('sets') },
          { label: 'Bandeja de descargas', accelerator: 'Cmd+4', click: () => createWindow('bandeja') },
          { label: 'Consejos', accelerator: 'Cmd+5', click: () => createWindow('consejos') },
        ],
      },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  )
  try {
    url = await startServer()
  } catch (e) {
    new Notification({ title: 'Serendipia no pudo arrancar', body: String(e.message ?? e).slice(0, 180) }).show()
    console.error(e)
    return app.quit()
  }
  console.log(`Serendipia en ${url}`)
  createWindow()
  watchDownloads()
  app.on('activate', () => createWindow())
})

app.on('window-all-closed', () => {
  /* en macOS la app sigue viva en el Dock para avisar de descargas nuevas */
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => server?.close())
