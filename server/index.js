// AS VPN serweri: saýty (dist/) görkezýär we admin panel üçin API berýär.
// Işletmek: npm run build && npm start
// Sazlamalar (env): PORT=3000 ADMIN_USER=admin ADMIN_PASS=admin TRUST_PROXY=1 (nginx yzynda bolsa)
//   TG_BOT_TOKEN=... TG_CHAT_ID=...  (täze sargytda Telegram bildirişi)
//   NTFY_TOPIC=...  [NTFY_SERVER=https://ntfy.sh]  (täze sargytda ntfy programmasyna bildiriş)
//   NOTIFY_VISITS=0  (saýt açylanda bildiriş ibermezlik; adaty: iberýär)

import http from 'node:http'
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto'
import { defaultContent, normalizeContent } from '../src/content.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
// .env faýly bar bolsa sazlamalary şondan okaýar (buýrukdaky env has ileri tutulýar)
const ENV_FILE = join(ROOT, '.env')
if (existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') process.loadEnvFile(ENV_FILE)
const DIST = join(ROOT, 'dist')
const DATA = join(ROOT, 'server', 'data')
const CONTENT_FILE = join(DATA, 'content.json')
const ORDERS_FILE = join(DATA, 'orders.json')

const PORT = Number(process.env.PORT) || 3000
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin'
const TRUST_PROXY = process.env.TRUST_PROXY === '1'
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || ''
const TG_CHAT_ID = process.env.TG_CHAT_ID || ''
const NTFY_TOPIC = process.env.NTFY_TOPIC || ''
const NOTIFY_VISITS = process.env.NOTIFY_VISITS !== '0'
const VISIT_COOLDOWN = 30 * 60 * 1000 // bir IP-den 30 minutda iň köp 1 bildiriş
const VISIT_MAX_PER_HOUR = 60 // umumy çäk (spamdan gorag)
const NTFY_SERVER = (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '')
const SESSION_TTL = 12 * 60 * 60 * 1000
const MAX_ORDERS = 5000
const STATUSES = ['new', 'contacted', 'paid', 'cancelled']

// ---------- storage ----------
await mkdir(DATA, { recursive: true })

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return structuredClone(fallback)
  }
}
let writing = Promise.resolve()
function writeJSON(file, data) {
  // yzygider ýazmak + atomik çalyşmak (faýl ýarym galmaz)
  writing = writing.then(async () => {
    const tmp = `${file}.${process.pid}.tmp`
    await writeFile(tmp, JSON.stringify(data, null, 2))
    await rename(tmp, file)
  })
  return writing
}

let content = normalizeContent(await readJSON(CONTENT_FILE, defaultContent))
let orders = await readJSON(ORDERS_FILE, [])
if (!Array.isArray(orders)) orders = []
if (!existsSync(CONTENT_FILE)) await writeJSON(CONTENT_FILE, content)

// ---------- auth ----------
const sessions = new Map() // token -> expiresAt
const loginFails = new Map() // ip -> { n, until }
const orderHits = new Map() // ip -> { n, reset }
const visitSeen = new Map() // ip -> last notified at
const visitHour = { n: 0, reset: 0 }

const sha = (s) => createHash('sha256').update(String(s)).digest()
const safeEq = (a, b) => timingSafeEqual(sha(a), sha(b))

function clientIp(req) {
  if (TRUST_PROXY) {
    const xf = req.headers['x-forwarded-for']
    if (xf) return String(xf).split(',')[0].trim()
  }
  return req.socket.remoteAddress || ''
}

function isAuthed(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const exp = token && sessions.get(token)
  if (!exp) return false
  if (exp < Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [t, exp] of sessions) if (exp < now) sessions.delete(t)
  for (const [ip, v] of loginFails) if (v.until < now) loginFails.delete(ip)
  for (const [ip, v] of orderHits) if (v.reset < now) orderHits.delete(ip)
  for (const [ip, at] of visitSeen) if (at + VISIT_COOLDOWN < now) visitSeen.delete(ip)
}, 10 * 60 * 1000).unref()

// ---------- helpers ----------
function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(data)
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(Object.assign(new Error('too large'), { status: 413 }))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : '')

// ---------- täze sargyt bildirişi (Telegram / ntfy) ----------
const deviceOf = (ua = '') =>
  /iphone|ipad/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : '—'

// jogaby garaşmaýarys: bildiriş işlemese-de sargyt ýazylýar
function push(name, url, body) {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
    .then(async (r) => {
      if (!r.ok) console.error(`${name} bildirişi iberilmedi:`, r.status, await r.text())
    })
    .catch((e) => console.error(`${name} bildirişi iberilmedi:`, e.message))
}

const notifyOn = () => (TG_BOT_TOKEN && TG_CHAT_ID) || NTFY_TOPIC

function notifyAll({ emoji, title, body, tag, priority }) {
  if (TG_BOT_TOKEN && TG_CHAT_ID) {
    push('Telegram', `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, { chat_id: TG_CHAT_ID, text: `${emoji} ${title}\n\n${body}` })
  }
  if (NTFY_TOPIC) {
    push('ntfy', NTFY_SERVER, { topic: NTFY_TOPIC, title, message: body, tags: [tag], priority })
  }
}

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless|lighthouse/i

function notifyVisit(ip, ua, b) {
  if (!NOTIFY_VISITS || !notifyOn() || BOT_UA.test(ua)) return
  const now = Date.now()
  if ((visitSeen.get(ip) || 0) + VISIT_COOLDOWN > now) return
  if (visitHour.reset < now) Object.assign(visitHour, { n: 0, reset: now + 60 * 60 * 1000 })
  if (++visitHour.n > VISIT_MAX_PER_HOUR) return
  visitSeen.set(ip, now)
  const from = str(b.ref, 100).replace(/[^\w.-]/g, '')
  notifyAll({
    emoji: '👀',
    title: 'Кто-то открыл сайт — AS VPN',
    body: [`Устройство: ${deviceOf(ua)}`, `Язык: ${b.lang === 'ru' ? 'RU' : 'TM'}`, `Откуда: ${from || 'напрямую'}`].join('\n'),
    tag: 'eyes',
    priority: 3,
  })
}

function notifyOrder(o) {
  if (!notifyOn()) return
  const cur = content?.tk?.plans?.currency || 'TMT'
  const title = 'Новый заказ — AS VPN'
  const body = [
    `Тариф: ${o.plan.users} польз. · ${o.plan.gb} GB · ${o.plan.price} ${cur}`,
    `Канал: ${o.channel === 'gmail' ? 'Gmail' : 'Telegram'}`,
    `Язык: ${o.lang === 'ru' ? 'RU' : 'TM'}`,
    `Устройство: ${deviceOf(o.ua)}`,
  ].join('\n')
  notifyAll({ emoji: '🛒', title, body, tag: 'shopping_cart', priority: 4 })
}

// ---------- API ----------
async function api(req, res, path) {
  const method = req.method
  const ip = clientIp(req)

  if (path === '/api/content' && method === 'GET') return send(res, 200, content)

  if (path === '/api/visit' && method === 'POST') {
    const b = await readBody(req, 1024)
    notifyVisit(ip, str(req.headers['user-agent'], 200), b)
    return send(res, 204)
  }

  if (path === '/api/orders' && method === 'POST') {
    const now = Date.now()
    const hit = orderHits.get(ip) || { n: 0, reset: now + 60 * 60 * 1000 }
    if (hit.reset < now) Object.assign(hit, { n: 0, reset: now + 60 * 60 * 1000 })
    if (++hit.n > 30) return send(res, 429, { error: 'Gaty köp synanyşyk' })
    orderHits.set(ip, hit)

    const b = await readBody(req, 4096)
    const order = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      plan: {
        users: str(b.plan?.users, 40),
        price: Number(b.plan?.price) || 0,
        gb: Number(b.plan?.gb) || 0,
      },
      channel: b.channel === 'gmail' ? 'gmail' : 'telegram',
      lang: b.lang === 'ru' ? 'ru' : 'tk',
      status: 'new',
      note: '',
      ip,
      ua: str(req.headers['user-agent'], 200),
    }
    orders.unshift(order)
    if (orders.length > MAX_ORDERS) orders.length = MAX_ORDERS
    await writeJSON(ORDERS_FILE, orders)
    notifyOrder(order)
    return send(res, 201, { ok: true })
  }

  if (path === '/api/login' && method === 'POST') {
    const now = Date.now()
    const f = loginFails.get(ip)
    if (f && f.n >= 8 && f.until > now) {
      return send(res, 429, { error: 'Слишком много неудачных попыток. Повторите через 15 минут.' })
    }
    const b = await readBody(req, 4096)
    const okUser = safeEq(str(b.username, 200), ADMIN_USER)
    const okPass = safeEq(str(b.password, 200), ADMIN_PASS)
    if (!(okUser && okPass)) {
      const cur = f && f.until > now ? f : { n: 0, until: now + 15 * 60 * 1000 }
      cur.n++
      loginFails.set(ip, cur)
      return send(res, 401, { error: 'Неверное имя пользователя или пароль' })
    }
    loginFails.delete(ip)
    const token = randomBytes(32).toString('hex')
    sessions.set(token, now + SESSION_TTL)
    return send(res, 200, { token })
  }

  // --- admin-only below ---
  if (!isAuthed(req)) return send(res, 401, { error: 'Требуется вход' })

  if (path === '/api/logout' && method === 'POST') {
    sessions.delete((req.headers.authorization || '').slice(7))
    return send(res, 200, { ok: true })
  }

  if (path === '/api/me' && method === 'GET') return send(res, 200, { user: ADMIN_USER })

  if (path === '/api/content' && method === 'PUT') {
    const b = await readBody(req)
    content = normalizeContent(b)
    await writeJSON(CONTENT_FILE, content)
    return send(res, 200, content)
  }

  if (path === '/api/orders' && method === 'GET') return send(res, 200, orders)

  const m = path.match(/^\/api\/orders\/([0-9a-f-]{36})$/)
  if (m) {
    const idx = orders.findIndex((o) => o.id === m[1])
    if (idx === -1) return send(res, 404, { error: 'Не найдено' })
    if (method === 'PATCH') {
      const b = await readBody(req, 8192)
      if (b.status !== undefined) {
        if (!STATUSES.includes(b.status)) return send(res, 400, { error: 'Неверный статус' })
        orders[idx].status = b.status
      }
      if (b.note !== undefined) orders[idx].note = str(b.note, 1000)
      await writeJSON(ORDERS_FILE, orders)
      return send(res, 200, orders[idx])
    }
    if (method === 'DELETE') {
      orders.splice(idx, 1)
      await writeJSON(ORDERS_FILE, orders)
      return send(res, 200, { ok: true })
    }
  }

  return send(res, 404, { error: 'Tapylmady' })
}

// ---------- static ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function serveStatic(req, res, path) {
  let file = normalize(join(DIST, decodeURIComponent(path)))
  if (!file.startsWith(DIST)) return send(res, 403, { error: 'forbidden' })
  try {
    const s = await stat(file)
    if (s.isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(DIST, 'index.html') // SPA: /asvpn we ş.m.
  }
  try {
    const data = await readFile(file)
    const isAsset = file.includes(`${join(DIST, 'assets')}`)
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('dist/ tapylmady — ilki "npm run build" ediň.')
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  const path = new URL(req.url, 'http://x').pathname
  try {
    if (path.startsWith('/api/')) return await api(req, res, path)
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method' })
    return await serveStatic(req, res, path)
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Serwer ýalňyşlygy' })
    if (!e.status) console.error(e)
  }
})

server.listen(PORT, () => {
  console.log(`AS VPN serweri: http://localhost:${PORT}`)
  console.log(`Admin panel:    http://localhost:${PORT}/asvpn`)
  console.log(`Telegram bildirişi: ${TG_BOT_TOKEN && TG_CHAT_ID ? 'açyk' : 'öçük (TG_BOT_TOKEN / TG_CHAT_ID ýok)'}`)
  console.log(`Saýt açylanda:      ${NOTIFY_VISITS ? 'bildiriş iberilýär (bir IP-den 30 minutda 1 gezek)' : 'öçük (NOTIFY_VISITS=0)'}`)
  console.log(`ntfy bildirişi:     ${NTFY_TOPIC ? `açyk (${NTFY_SERVER})` : 'öçük (NTFY_TOPIC ýok)'}`)
  if (ADMIN_PASS === 'admin') console.warn('⚠ Admin paroly "admin". Hakyky serwerde ADMIN_PASS bilen üýtgediň!')
})
