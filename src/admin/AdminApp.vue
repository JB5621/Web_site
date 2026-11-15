<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import logo from '../assets/logo.jpg'
import { defaultContent, ICONS, TELEGRAM_RE, EMAIL_RE, PHONE_RE, URL_RE } from '../content.js'

document.title = 'AS VPN — Админ-панель'
document.documentElement.lang = 'ru'
const robots = document.createElement('meta')
robots.name = 'robots'
robots.content = 'noindex, nofollow'
document.head.appendChild(robots)

// ---------- token ----------
const store = {
  get() {
    try {
      return sessionStorage.getItem('asvpn_token') || ''
    } catch {
      return memToken
    }
  },
  set(v) {
    memToken = v
    try {
      v ? sessionStorage.setItem('asvpn_token', v) : sessionStorage.removeItem('asvpn_token')
    } catch {
      /* private mode */
    }
  },
}
let memToken = ''
const token = ref(store.get())

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      ...(opts.headers || {}),
    },
  })
  let data = null
  try {
    data = await r.json()
  } catch {
    /* empty */
  }
  if (r.status === 401 && path !== '/api/login') {
    token.value = ''
    store.set('')
  }
  if (!r.ok) throw new Error(data?.error || `Ошибка (${r.status})`)
  return data
}

// ---------- toast ----------
const toast = ref(null)
let toastT
const notify = (text, type = 'ok') => {
  toast.value = { text, type }
  clearTimeout(toastT)
  toastT = setTimeout(() => (toast.value = null), 3200)
}

// ---------- login ----------
const loginForm = ref({ username: '', password: '' })
const loginError = ref('')
const loggingIn = ref(false)
const showPass = ref(false)

async function login() {
  loginError.value = ''
  loggingIn.value = true
  try {
    const { token: t } = await api('/api/login', { method: 'POST', body: JSON.stringify(loginForm.value) })
    token.value = t
    store.set(t)
    loginForm.value.password = ''
    await loadAll()
  } catch (e) {
    loginError.value = e.message === 'Failed to fetch' ? 'Нет связи с сервером' : e.message
  } finally {
    loggingIn.value = false
  }
}

async function logout() {
  if (dirty.value && !confirm('Несохранённые изменения будут потеряны. Выйти?')) return
  try {
    await api('/api/logout', { method: 'POST' })
  } catch {
    /* ignore */
  }
  token.value = ''
  store.set('')
}

// ---------- data ----------
const saved = ref(null)
const draft = ref(null)
const orders = ref([])
const loading = ref(false)
const saving = ref(false)

const dirty = computed(() => saved.value && JSON.stringify(saved.value) !== JSON.stringify(draft.value))

async function loadAll() {
  loading.value = true
  try {
    const [content, list] = await Promise.all([api('/api/content'), api('/api/orders')])
    saved.value = structuredClone(content)
    draft.value = structuredClone(content)
    orders.value = list
  } catch (e) {
    notify(e.message, 'err')
  } finally {
    loading.value = false
  }
}

async function refreshOrders(silent) {
  try {
    orders.value = await api('/api/orders')
    if (!silent) notify('Заказы обновлены')
  } catch (e) {
    if (!silent) notify(e.message, 'err')
  }
}

const contactErrors = computed(() => {
  const e = {}
  if (!draft.value) return e
  const tg = draft.value.contact.telegram.trim().replace(/^@/, '')
  if (!TELEGRAM_RE.test(tg)) e['contact.telegram'] = 'Только латинские буквы, цифры и _ (3–32 символа)'
  if (!EMAIL_RE.test(draft.value.contact.email.trim())) e['contact.email'] = 'Неверный адрес Gmail'
  const ct = draft.value.contact
  if (ct.phone.trim() && !PHONE_RE.test(ct.phone.trim())) e['contact.phone'] = 'Неверный номер телефона (пример: +993 61 234567)'
  if (ct.imo.trim() && !PHONE_RE.test(ct.imo.trim())) e['contact.imo'] = 'Неверный номер imo (пример: +993 61 234567)'
  if (ct.link.trim() && !URL_RE.test(ct.link.trim())) e['contact.link'] = 'Ссылка должна начинаться с https://'
  return e
})

async function save() {
  if (Object.keys(contactErrors.value).length) {
    page.value = 'contact'
    notify('Исправьте контактные данные', 'err')
    return
  }
  saving.value = true
  try {
    const content = await api('/api/content', { method: 'PUT', body: JSON.stringify(draft.value) })
    saved.value = structuredClone(content)
    draft.value = structuredClone(content)
    notify('Сохранено — сайт обновлён')
  } catch (e) {
    notify(e.message, 'err')
  } finally {
    saving.value = false
  }
}

function discard() {
  if (!confirm('Отменить все несохранённые изменения?')) return
  draft.value = structuredClone(saved.value)
}

function resetSection(key) {
  const where = key === 'contact' ? '' : ` (${LANG_NAMES[editLang.value]})`
  if (!confirm(`Вернуть этот раздел${where} к исходному состоянию? (Пока не сохраните, сайт не изменится)`)) return
  if (key === 'contact') draft.value.contact = structuredClone(defaultContent.contact)
  else draft.value[editLang.value][key] = structuredClone(defaultContent[editLang.value][key])
}

// ---------- dil ----------
// Тексты отдельно для каждого языка; контакты и цена/GB тарифов общие.
const LANG_NAMES = { tk: 'Туркменский', ru: 'Русский' }
const editLang = ref('tk')
const isShared = (path) => path.startsWith('contact') || path.startsWith('planItems')
const fp = (path) => (isShared(path) ? path : `${editLang.value}.${path}`)
const showLangSwitch = computed(() => !['dashboard', 'orders', 'contact'].includes(page.value))

// ---------- path helpers ----------
const getAt = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
const setAt = (obj, path, val) => {
  const keys = path.split('.')
  const last = keys.pop()
  keys.reduce((o, k) => o[k], obj)[last] = val
}

// ---------- navigation ----------
const pages = [
  { id: 'dashboard', label: 'Обзор', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { id: 'orders', label: 'Заказы', icon: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
  { id: 'plans', label: 'Тарифы', icon: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01' },
  { id: 'contact', label: 'Контакты', icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6' },
  { id: 'hero', label: 'Главный блок', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
  { id: 'features', label: 'Преимущества', icon: ICONS.star.d },
  { id: 'steps', label: 'Шаги', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id: 'faq', label: 'Вопросы', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01' },
  { id: 'other', label: 'CTA и футер', icon: 'M4 6h16M4 12h16M4 18h10' },
]
const page = ref('dashboard')
const pageTitle = computed(() => pages.find((p) => p.id === page.value)?.label)

const head = (key) => [
  { path: `${key}.eyebrow`, label: 'Надзаголовок' },
  { path: `${key}.title`, label: 'Заголовок' },
  { path: `${key}.subtitle`, label: 'Описание' },
]

const editors = {
  contact: {
    reset: 'contact',
    groups: [
      {
        title: 'Контактные данные',
        desc: 'Кнопка «Купить» сначала открывает Telegram, а если Telegram не указан — Gmail.',
        fields: [
          { path: 'contact.telegram', label: 'Имя пользователя Telegram', prefix: '@', hint: 'Без @, пример: asvpntm' },
          { path: 'contact.email', label: 'Gmail', type: 'email' },
        ],
      },
      {
        title: 'Дополнительные контакты',
        desc: 'Заполненные поля появляются в разделе «Контакты» и в подвале сайта. Пустые поля не показываются.',
        fields: [
          { path: 'contact.phone', label: 'Номер телефона', type: 'tel', hint: 'Пример: +993 61 234567' },
          { path: 'contact.imo', label: 'Номер imo', type: 'tel', hint: 'При нажатии номер копируется' },
          { path: 'contact.link', label: 'Ссылка', type: 'url', hint: 'Пример: https://instagram.com/asvpn' },
          { path: 'contact.linkLabel', label: 'Название ссылки', hint: 'Пример: Instagram. Если пусто — «Наша страница»' },
        ],
      },
    ],
  },
  hero: {
    reset: 'hero',
    groups: [
      {
        title: 'Главный блок',
        fields: [
          { path: 'hero.badge', label: 'Текст зелёного бейджа' },
          { path: 'hero.title1', label: 'Заголовок (1-я часть)' },
          { path: 'hero.highlight', label: 'Заголовок (выделенное слово)' },
          { path: 'hero.title2', label: 'Заголовок (2-я строка)' },
          { path: 'hero.lead', label: 'Текст описания', type: 'textarea' },
          { path: 'hero.ctaPrimary', label: 'Основная кнопка' },
          { path: 'hero.ctaSecondary', label: 'Вторая кнопка' },
          { path: 'hero.chip1', label: 'Подпись у логотипа 1' },
          { path: 'hero.chip2', label: 'Подпись у логотипа 2' },
        ],
      },
    ],
    strings: [{ path: 'marquee', title: 'Бегущая строка', placeholder: 'Пример: Android' }],
  },
  features: {
    reset: 'features',
    groups: [{ title: 'Заголовок раздела', fields: head('features') }],
    list: {
      path: 'features.items',
      title: 'Преимущества',
      item: 'Преимущество',
      fields: [
        { key: 'icon', label: 'Иконка', type: 'icon' },
        { key: 'title', label: 'Название' },
        { key: 'text', label: 'Описание', type: 'textarea', wide: true },
      ],
      blank: { icon: 'bolt', title: 'Новое преимущество', text: '' },
    },
  },
  plans: {
    reset: 'plans',
    groups: [
      { title: 'Заголовок раздела', fields: head('plans') },
      {
        title: 'Карточки тарифов',
        fields: [
          { path: 'plans.badge', label: 'Бейдж «Самый выгодный»' },
          { path: 'plans.button', label: 'Текст кнопки' },
          { path: 'plans.currency', label: 'Валюта' },
          { path: 'plans.message', label: 'Начало сообщения в Telegram/Gmail', type: 'textarea', hint: 'Выбранный тариф добавляется в конец автоматически' },
        ],
      },
    ],
    list: {
      path: 'planItems',
      title: 'Тарифы',
      desc: 'Цена, GB и число пользователей общие для обоих языков — изменив один раз, вы меняете их в обоих.',
      item: 'Тариф',
      fields: [
        { key: 'users', label: 'Число пользователей', hint: 'Пример: 1–2 или 3' },
        { key: 'price', label: 'Цена', type: 'number', suffix: 'TMT' },
        { key: 'gb', label: 'Лимит трафика', type: 'number', suffix: 'GB' },
        { key: 'best', label: 'Отметить как «Самый выгодный»', type: 'check', exclusive: true },
      ],
      blank: { users: '1', price: 0, gb: 0, best: false },
    },
    strings: [{ path: 'plans.extras', title: 'Дополнительные строки в каждом тарифе', placeholder: 'Пример: поддержка 24/7' }],
  },
  steps: {
    reset: 'steps',
    groups: [{ title: 'Заголовок раздела', fields: head('steps') }],
    list: {
      path: 'steps.items',
      title: 'Шаги',
      item: 'Шаг',
      fields: [
        { key: 'title', label: 'Название' },
        { key: 'text', label: 'Описание', type: 'textarea', wide: true },
      ],
      blank: { title: 'Новый шаг', text: '' },
    },
  },
  faq: {
    reset: 'faq',
    groups: [{ title: 'Заголовок раздела', fields: head('faq').slice(0, 2) }],
    list: {
      path: 'faq.items',
      title: 'Вопросы',
      item: 'Вопрос',
      fields: [
        { key: 'q', label: 'Вопрос', wide: true },
        { key: 'a', label: 'Ответ', type: 'textarea', wide: true },
      ],
      blank: { q: 'Новый вопрос?', a: '' },
    },
  },
  other: {
    groups: [
      {
        title: 'Нижний призыв к действию',
        fields: [
          { path: 'cta.title', label: 'Заголовок' },
          { path: 'cta.text', label: 'Текст', type: 'textarea' },
        ],
      },
      { title: 'Футер', fields: [{ path: 'footer.copyright', label: 'Текст ©', hint: 'Год добавляется в начало автоматически' }] },
    ],
  },
}
const editor = computed(() => editors[page.value])

// list ops
const listOf = (path) => getAt(draft.value, fp(path))
const addItem = (l) => listOf(l.path).push(structuredClone(l.blank))
const removeItem = (l, i) => {
  if (confirm(`Удалить: ${l.item.toLowerCase()}?`)) listOf(l.path).splice(i, 1)
}
const moveItem = (l, i, d) => {
  const arr = listOf(l.path)
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
const setCheck = (l, i, f, val) => {
  const arr = listOf(l.path)
  if (f.exclusive && val) arr.forEach((it, k) => (it[f.key] = k === i))
  else arr[i][f.key] = val
}
const addString = (s) => getAt(draft.value, fp(s.path)).push('')
const removeString = (s, i) => getAt(draft.value, fp(s.path)).splice(i, 1)

// ---------- orders ----------
const STATUS = {
  new: { label: 'Новый', cls: 's-new' },
  contacted: { label: 'На связи', cls: 's-contacted' },
  paid: { label: 'Оплачен', cls: 's-paid' },
  cancelled: { label: 'Отменён', cls: 's-cancelled' },
}
const filter = ref('all')
const query = ref('')
const filteredOrders = computed(() => {
  const q = query.value.trim().toLowerCase()
  return orders.value.filter((o) => {
    if (filter.value !== 'all' && o.status !== filter.value) return false
    if (!q) return true
    return [planLabel(o.plan), o.note, o.channel, o.ip].join(' ').toLowerCase().includes(q)
  })
})
const countBy = (s) => orders.value.filter((o) => o.status === s).length

async function updateOrder(o, patch) {
  const prev = { ...o }
  Object.assign(o, patch)
  try {
    await api(`/api/orders/${o.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    notify('Заказ обновлён')
  } catch (e) {
    Object.assign(o, prev)
    notify(e.message, 'err')
  }
}
async function deleteOrder(o) {
  if (!confirm('Удалить этот заказ?')) return
  try {
    await api(`/api/orders/${o.id}`, { method: 'DELETE' })
    orders.value = orders.value.filter((x) => x.id !== o.id)
    notify('Заказ удалён')
  } catch (e) {
    notify(e.message, 'err')
  }
}

const cur = computed(() => draft.value?.tk.plans.currency || 'TMT')
const planLabel = (p) => `${p.users} польз. · ${p.gb} GB · ${p.price} ${cur.value}`
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (iso) => {
  const d = new Date(iso)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString()
const device = (ua = '') =>
  /iphone|ipad/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : '—'

// ---------- dashboard ----------
const dash = computed(() => {
  const os = orders.value
  const byPlan = {}
  for (const o of os) {
    const k = planLabel(o.plan)
    byPlan[k] = (byPlan[k] || 0) + 1
  }
  const planRows = Object.entries(byPlan)
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
  const max = Math.max(1, ...planRows.map((r) => r.n))
  return {
    total: os.length,
    fresh: countBy('new'),
    today: os.filter((o) => isToday(o.createdAt)).length,
    revenue: os.filter((o) => o.status === 'paid').reduce((s, o) => s + (Number(o.plan.price) || 0), 0),
    paid: countBy('paid'),
    tg: os.filter((o) => o.channel === 'telegram').length,
    gm: os.filter((o) => o.channel === 'gmail').length,
    planRows: planRows.map((r) => ({ ...r, w: (r.n / max) * 100 })),
    recent: os.slice(0, 6),
  }
})

// ---------- lifecycle ----------
const sideOpen = ref(false)
watch(page, () => (sideOpen.value = false))

let poll
const beforeUnload = (e) => {
  if (dirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => {
  if (token.value) loadAll()
  window.addEventListener('beforeunload', beforeUnload)
  poll = setInterval(() => {
    if (token.value && (page.value === 'orders' || page.value === 'dashboard')) refreshOrders(true)
  }, 30000)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  clearInterval(poll)
})
</script>

<template>
  <!-- ========== LOGIN ========== -->
  <div v-if="!token" class="login-wrap">
    <div class="login-glow" aria-hidden="true"></div>
    <form class="login card" @submit.prevent="login">
      <img :src="logo" alt="AS VPN" width="88" height="88" class="login-logo" />
      <h1>Админ-панель</h1>
      <p class="muted">Войдите в аккаунт, чтобы продолжить</p>

      <label class="field">
        <span>Имя пользователя</span>
        <input v-model.trim="loginForm.username" autocomplete="username" required autofocus />
      </label>
      <label class="field">
        <span>Пароль</span>
        <div class="pass">
          <input v-model="loginForm.password" :type="showPass ? 'text' : 'password'" autocomplete="current-password" required />
          <button type="button" class="pass-toggle" :aria-label="showPass ? 'Скрыть пароль' : 'Показать пароль'" @click="showPass = !showPass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path v-if="!showPass" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path v-else d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 1 1-4.2-4.2" />
            </svg>
          </button>
        </div>
      </label>
      <p v-if="loginError" class="error" role="alert">{{ loginError }}</p>
      <button class="btn btn-primary btn-block" :disabled="loggingIn">
        <span v-if="loggingIn" class="spinner"></span>
        {{ loggingIn ? 'Вход…' : 'Войти' }}
      </button>
      <a href="/" class="back-link">← Вернуться на сайт</a>
    </form>
  </div>

  <!-- ========== PANEL ========== -->
  <div v-else class="shell">
    <aside class="side" :class="{ open: sideOpen }">
      <div class="side-brand">
        <img :src="logo" alt="" width="36" height="36" />
        <div>
          <strong>AS VPN</strong>
          <small>Админ-панель</small>
        </div>
      </div>
      <nav class="side-nav" aria-label="Меню админки">
        <button v-for="p in pages" :key="p.id" :class="{ active: page === p.id }" @click="page = p.id">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="p.icon" /></svg>
          {{ p.label }}
          <span v-if="p.id === 'orders' && dash.fresh" class="count">{{ dash.fresh }}</span>
        </button>
      </nav>
      <div class="side-foot">
        <a href="/" target="_blank" rel="noopener" class="btn btn-ghost btn-block">Открыть сайт ↗</a>
        <button class="btn btn-text btn-block" @click="logout">Выйти</button>
      </div>
    </aside>
    <div v-if="sideOpen" class="side-backdrop" @click="sideOpen = false"></div>

    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" aria-label="Меню" @click="sideOpen = !sideOpen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <h1>{{ pageTitle }}</h1>
        <div v-if="showLangSwitch" class="lang-switch" role="group" aria-label="Язык редактируемых текстов">
          <button v-for="(n, l) in LANG_NAMES" :key="l" type="button" :class="{ on: editLang === l }"
            :aria-pressed="editLang === l" @click="editLang = l">{{ n }}</button>
        </div>
        <div class="topbar-actions">
          <template v-if="dirty">
            <span class="dirty-dot">Есть несохранённые изменения</span>
            <button class="btn btn-text" @click="discard">Отменить</button>
          </template>
          <button class="btn btn-primary" :disabled="!dirty || saving" @click="save">
            <span v-if="saving" class="spinner"></span>
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </div>
      </header>

      <div v-if="loading || !draft" class="content center">
        <span class="spinner big"></span>
      </div>

      <div v-else class="content">
        <!-- DASHBOARD -->
        <template v-if="page === 'dashboard'">
          <div class="stats">
            <div class="card stat">
              <span>Всего заказов</span>
              <strong>{{ dash.total }}</strong>
              <small>Нажатий «Купить»</small>
            </div>
            <div class="card stat accent">
              <span>Новые</span>
              <strong>{{ dash.fresh }}</strong>
              <small>Ждут ответа</small>
            </div>
            <div class="card stat">
              <span>Сегодня</span>
              <strong>{{ dash.today }}</strong>
              <small>Поступило</small>
            </div>
            <div class="card stat">
              <span>Выручка</span>
              <strong>{{ dash.revenue }} <em>{{ cur }}</em></strong>
              <small>Оплачено: {{ dash.paid }}</small>
            </div>
          </div>

          <div class="grid-2">
            <section class="card panel">
              <h2>По тарифам</h2>
              <p v-if="!dash.planRows.length" class="empty">Заказов пока нет</p>
              <ul v-else class="bars">
                <li v-for="r in dash.planRows" :key="r.label">
                  <div class="bar-head"><span>{{ r.label }}</span><b>{{ r.n }}</b></div>
                  <div class="bar"><span :style="{ width: r.w + '%' }"></span></div>
                </li>
              </ul>
              <div class="channels">
                <span><i class="ch tg"></i>Telegram: <b>{{ dash.tg }}</b></span>
                <span><i class="ch gm"></i>Gmail: <b>{{ dash.gm }}</b></span>
              </div>
            </section>
            <section class="card panel">
              <div class="panel-head">
                <h2>Последние заказы</h2>
                <button class="btn btn-text btn-sm" @click="page = 'orders'">Все →</button>
              </div>
              <p v-if="!dash.recent.length" class="empty">Заказов пока нет</p>
              <ul v-else class="recent">
                <li v-for="o in dash.recent" :key="o.id">
                  <div>
                    <b>{{ planLabel(o.plan) }}</b>
                    <small>{{ fmtDate(o.createdAt) }} · {{ o.channel === 'gmail' ? 'Gmail' : 'Telegram' }}</small>
                  </div>
                  <span class="status" :class="STATUS[o.status].cls">{{ STATUS[o.status].label }}</span>
                </li>
              </ul>
            </section>
          </div>
          <p class="note">
            Когда на сайте нажимают «Купить», заказ записывается сюда. После того как человек напишет вам в Telegram или Gmail,
            меняйте статус: <b>На связи</b> → <b>Оплачен</b>. Выручка считается только по заказам со статусом «Оплачен».
          </p>
        </template>

        <!-- ORDERS -->
        <template v-else-if="page === 'orders'">
          <div class="toolbar">
            <div class="chips">
              <button :class="{ on: filter === 'all' }" @click="filter = 'all'">Все <b>{{ orders.length }}</b></button>
              <button v-for="(s, k) in STATUS" :key="k" :class="{ on: filter === k }" @click="filter = k">
                {{ s.label }} <b>{{ countBy(k) }}</b>
              </button>
            </div>
            <div class="toolbar-right">
              <input v-model="query" class="search" type="search" placeholder="Поиск…" aria-label="Поиск заказов" />
              <button class="btn btn-ghost btn-sm" @click="refreshOrders()">Обновить</button>
            </div>
          </div>

          <div class="card table-wrap">
            <p v-if="!filteredOrders.length" class="empty pad">Заказы не найдены</p>
            <table v-else class="table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Тариф</th>
                  <th>Канал</th>
                  <th>Язык</th>
                  <th>Устройство</th>
                  <th>Статус</th>
                  <th>Заметка</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in filteredOrders" :key="o.id">
                  <td data-l="Время" class="nowrap">{{ fmtDate(o.createdAt) }}</td>
                  <td data-l="Тариф"><b>{{ planLabel(o.plan) }}</b></td>
                  <td data-l="Канал">
                    <span class="chan"><i class="ch" :class="o.channel === 'gmail' ? 'gm' : 'tg'"></i>{{ o.channel === 'gmail' ? 'Gmail' : 'Telegram' }}</span>
                  </td>
                  <td data-l="Язык"><span class="lang-tag">{{ o.lang === 'ru' ? 'RU' : 'TM' }}</span></td>
                  <td data-l="Устройство" :title="o.ua">{{ device(o.ua) }}</td>
                  <td data-l="Статус">
                    <select class="status-select" :class="STATUS[o.status].cls" :value="o.status"
                      aria-label="Статус" @change="updateOrder(o, { status: $event.target.value })">
                      <option v-for="(s, k) in STATUS" :key="k" :value="k">{{ s.label }}</option>
                    </select>
                  </td>
                  <td data-l="Заметка">
                    <input class="note-input" :value="o.note" placeholder="Добавить заметку…" aria-label="Заметка"
                      @change="updateOrder(o, { note: $event.target.value })" />
                  </td>
                  <td class="right">
                    <button class="icon-btn danger" aria-label="Удалить" title="Удалить" @click="deleteOrder(o)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- CONTENT EDITORS -->
        <template v-else-if="editor">
          <section v-for="g in editor.groups" :key="g.title" class="card panel">
            <div class="panel-head">
              <div>
                <h2>{{ g.title }} <span v-if="showLangSwitch" class="lang-tag">{{ editLang === 'tk' ? 'TM' : 'RU' }}</span></h2>
                <p v-if="g.desc" class="muted small">{{ g.desc }}</p>
              </div>
            </div>
            <div class="form-grid">
              <label v-for="f in g.fields" :key="f.path" class="field" :class="{ wide: f.type === 'textarea' }">
                <span>{{ f.label }}</span>
                <textarea v-if="f.type === 'textarea'" rows="3" :value="getAt(draft, fp(f.path))"
                  @input="setAt(draft, fp(f.path), $event.target.value)"></textarea>
                <div v-else class="input-affix" :class="{ invalid: contactErrors[f.path] }">
                  <em v-if="f.prefix">{{ f.prefix }}</em>
                  <input :type="f.type || 'text'" :value="getAt(draft, fp(f.path))"
                    @input="setAt(draft, fp(f.path), $event.target.value)" />
                </div>
                <small v-if="contactErrors[f.path]" class="error">{{ contactErrors[f.path] }}</small>
                <small v-else-if="f.hint" class="hint">{{ f.hint }}</small>
              </label>
            </div>
          </section>

          <section v-if="editor.list" class="card panel">
            <div class="panel-head">
              <div>
                <h2>
                  {{ editor.list.title }} <span class="muted">({{ listOf(editor.list.path).length }})</span>
                  <span v-if="!isShared(editor.list.path)" class="lang-tag">{{ editLang === 'tk' ? 'TM' : 'RU' }}</span>
                  <span v-else class="lang-tag shared">TM + RU</span>
                </h2>
                <p v-if="editor.list.desc" class="muted small">{{ editor.list.desc }}</p>
              </div>
              <button class="btn btn-ghost btn-sm" @click="addItem(editor.list)">+ Добавить: {{ editor.list.item.toLowerCase() }}</button>
            </div>
            <p v-if="!listOf(editor.list.path).length" class="empty">Список пуст</p>
            <div class="items">
              <div v-for="(it, i) in listOf(editor.list.path)" :key="i" class="item" :class="{ starred: it.best }">
                <div class="item-head">
                  <span class="item-num">{{ editor.list.item }} {{ i + 1 }}</span>
                  <div class="item-actions">
                    <button class="icon-btn" :disabled="i === 0" aria-label="Выше" title="Выше" @click="moveItem(editor.list, i, -1)">↑</button>
                    <button class="icon-btn" :disabled="i === listOf(editor.list.path).length - 1" aria-label="Ниже" title="Ниже" @click="moveItem(editor.list, i, 1)">↓</button>
                    <button class="icon-btn danger" aria-label="Удалить" title="Удалить" @click="removeItem(editor.list, i)">✕</button>
                  </div>
                </div>
                <div class="form-grid">
                  <template v-for="f in editor.list.fields" :key="f.key">
                    <label v-if="f.type === 'check'" class="check wide">
                      <input type="checkbox" :checked="it[f.key]" @change="setCheck(editor.list, i, f, $event.target.checked)" />
                      <span>{{ f.label }}</span>
                    </label>
                    <div v-else-if="f.type === 'icon'" class="field wide">
                      <span>{{ f.label }}</span>
                      <div class="icon-pick" role="radiogroup" :aria-label="f.label">
                        <button v-for="(ic, k) in ICONS" :key="k" type="button" role="radio"
                          :aria-checked="it.icon === k" :class="{ on: it.icon === k }" :title="ic.label" @click="it.icon = k">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ic.d" /></svg>
                        </button>
                      </div>
                    </div>
                    <label v-else class="field" :class="{ wide: f.wide }">
                      <span>{{ f.label }}</span>
                      <textarea v-if="f.type === 'textarea'" v-model="it[f.key]" rows="2"></textarea>
                      <div v-else class="input-affix">
                        <input v-if="f.type === 'number'" v-model.number="it[f.key]" type="number" min="0" />
                        <input v-else v-model="it[f.key]" />
                        <em v-if="f.suffix">{{ f.suffix === 'TMT' ? cur : f.suffix }}</em>
                      </div>
                      <small v-if="f.hint" class="hint">{{ f.hint }}</small>
                    </label>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <section v-for="s in editor.strings || []" :key="s.path" class="card panel">
            <div class="panel-head">
              <h2>{{ s.title }} <span class="lang-tag">{{ editLang === 'tk' ? 'TM' : 'RU' }}</span></h2>
              <button class="btn btn-ghost btn-sm" @click="addString(s)">+ Добавить</button>
            </div>
            <div class="strings">
              <div v-for="(v, i) in getAt(draft, fp(s.path))" :key="i" class="string-row">
                <input v-model="getAt(draft, fp(s.path))[i]" :placeholder="s.placeholder" :aria-label="`${s.title} ${i + 1}`" />
                <button class="icon-btn danger" aria-label="Удалить" @click="removeString(s, i)">✕</button>
              </div>
            </div>
          </section>

          <div v-if="editor.reset" class="reset-row">
            <button class="btn btn-text btn-sm" @click="resetSection(editor.reset)">Вернуть раздел к исходному состоянию</button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <transition name="toast">
    <div v-if="toast" class="toast" :class="toast.type" role="status">{{ toast.text }}</div>
  </transition>
</template>

<style scoped>
/* ---------- base ---------- */
.card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 16px;
}
.muted {
  color: var(--muted);
}
.small {
  font-size: 14px;
}
.error {
  color: #ff8a8a;
  font-size: 13px;
}
.hint {
  color: var(--muted);
  font-size: 13px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, opacity 0.2s, box-shadow 0.2s;
  white-space: nowrap;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  color: var(--accent-ink);
  box-shadow: 0 0 18px rgba(92, 200, 255, 0.35);
}
.btn-primary:not(:disabled):hover {
  box-shadow: 0 0 28px rgba(92, 200, 255, 0.55);
}
.btn-ghost {
  background: rgba(92, 200, 255, 0.06);
  border-color: rgba(92, 200, 255, 0.35);
  color: var(--accent-2);
}
.btn-ghost:hover {
  background: rgba(92, 200, 255, 0.14);
}
.btn-text {
  background: none;
  color: var(--text);
}
.btn-text:hover {
  color: var(--text-h);
  background: rgba(255, 255, 255, 0.05);
}
.btn-sm {
  min-height: 36px;
  padding: 0 14px;
  font-size: 14px;
}
.btn-block {
  width: 100%;
}
.icon-btn {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.icon-btn svg {
  width: 18px;
  height: 18px;
}
.icon-btn:hover:not(:disabled) {
  background: rgba(92, 200, 255, 0.12);
  color: var(--text-h);
}
.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.icon-btn.danger:hover {
  background: rgba(255, 99, 99, 0.15);
  border-color: rgba(255, 99, 99, 0.4);
  color: #ff9a9a;
}
.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: spin 0.7s linear infinite;
}
.spinner.big {
  width: 36px;
  height: 36px;
  color: var(--accent);
  border-width: 3px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- fields ---------- */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field > span {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
}
input,
textarea,
select {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: rgba(2, 18, 35, 0.6);
  color: var(--text-h);
  font: inherit;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
textarea {
  resize: vertical;
  line-height: 1.5;
}
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(92, 200, 255, 0.18);
}
.input-affix {
  display: flex;
  align-items: stretch;
  border-radius: 10px;
}
.input-affix em {
  display: grid;
  place-items: center;
  padding: 0 12px;
  font-style: normal;
  font-weight: 700;
  font-size: 13px;
  color: var(--muted);
  background: rgba(92, 200, 255, 0.06);
  border: 1px solid var(--card-border);
}
.input-affix em:first-child {
  border-radius: 10px 0 0 10px;
  border-right: 0;
}
.input-affix em:last-child {
  border-radius: 0 10px 10px 0;
  border-left: 0;
}
.input-affix em:first-child + input {
  border-radius: 0 10px 10px 0;
}
.input-affix input:has(+ em) {
  border-radius: 10px 0 0 10px;
}
.input-affix.invalid input {
  border-color: #ff7a7a;
}
.check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  min-height: 44px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-h);
}
.check input {
  width: 20px;
  min-height: 0;
  height: 20px;
  accent-color: var(--accent);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.form-grid .wide {
  grid-column: 1 / -1;
}

/* ---------- login ---------- */
.login-wrap {
  position: relative;
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  overflow: hidden;
}
.login-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(92, 200, 255, 0.18), transparent);
  pointer-events: none;
}
.login {
  position: relative;
  width: 100%;
  max-width: 400px;
  padding: 36px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
  backdrop-filter: blur(12px);
  animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}
.login .field {
  text-align: left;
}
.login-logo {
  margin: 0 auto;
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(92, 200, 255, 0.45);
}
.login h1 {
  font-size: 26px;
}
.login .muted {
  margin-top: -8px;
}
.pass {
  position: relative;
}
.pass input {
  padding-right: 48px;
}
.pass-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: none;
  border: 0;
  color: var(--muted);
  cursor: pointer;
}
.pass-toggle svg {
  width: 20px;
  height: 20px;
}
.back-link {
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}
.back-link:hover {
  color: var(--accent-2);
}

/* ---------- shell ---------- */
.shell {
  display: flex;
  min-height: 100svh;
}
.side {
  position: sticky;
  top: 0;
  height: 100svh;
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  background: rgba(2, 18, 35, 0.75);
  border-right: 1px solid var(--card-border);
}
.side-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 22px;
}
.side-brand img {
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(92, 200, 255, 0.45);
}
.side-brand strong {
  display: block;
  color: var(--text-h);
  font-size: 17px;
}
.side-brand small {
  color: var(--muted);
  font-size: 13px;
}
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}
.side-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.side-nav svg {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
}
.side-nav button:hover {
  background: rgba(92, 200, 255, 0.07);
  color: var(--text-h);
}
.side-nav button.active {
  background: rgba(92, 200, 255, 0.14);
  color: var(--accent-2);
  box-shadow: inset 3px 0 0 var(--accent);
}
.count {
  margin-left: auto;
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}
.side-foot {
  display: grid;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--card-border);
}
.side-backdrop {
  display: none;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 10px 28px;
  background: rgba(3, 27, 51, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--card-border);
}
.topbar h1 {
  font-size: 21px;
}
.topbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lang-switch {
  display: flex;
  padding: 3px;
  gap: 2px;
  border-radius: 12px;
  border: 1px solid var(--card-border);
  background: rgba(2, 18, 35, 0.6);
}
.lang-switch button {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.lang-switch button.on {
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  color: var(--accent-ink);
}
.lang-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(92, 200, 255, 0.14);
  color: var(--accent-2);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  vertical-align: middle;
}
.lang-tag.shared {
  background: rgba(74, 222, 128, 0.13);
  color: #7ee8a5;
}
.dirty-dot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #ffd27a;
}
.dirty-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffc14d;
  box-shadow: 0 0 8px #ffc14d;
}
.menu-btn {
  display: none;
}
.content {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  width: 100%;
}
.content.center {
  flex: 1;
  align-items: center;
  justify-content: center;
}

/* ---------- panels ---------- */
.panel {
  padding: 22px;
}
.panel h2 {
  font-size: 17px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}
.empty {
  color: var(--muted);
  font-size: 14px;
}
.empty.pad {
  padding: 28px;
  text-align: center;
}
.note {
  font-size: 14px;
  color: var(--muted);
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px dashed var(--card-border);
}
.note b {
  color: var(--text-h);
}

/* dashboard */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat span {
  font-size: 14px;
  color: var(--muted);
  font-weight: 600;
}
.stat strong {
  font-size: 32px;
  font-weight: 800;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}
.stat strong em {
  font-size: 16px;
  font-style: normal;
  color: var(--muted);
}
.stat small {
  font-size: 13px;
  color: var(--muted);
}
.stat.accent {
  border-color: rgba(92, 200, 255, 0.45);
  background: linear-gradient(160deg, rgba(92, 200, 255, 0.16), var(--card) 70%);
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.grid-2 .panel h2 {
  margin-bottom: 16px;
}
.grid-2 .panel-head h2 {
  margin: 0;
}
.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.bar-head {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 6px;
}
.bar-head b {
  color: var(--text-h);
}
.bar {
  height: 8px;
  border-radius: 8px;
  background: rgba(92, 200, 255, 0.1);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 0.6s;
}
.channels {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
  font-size: 14px;
}
.channels b {
  color: var(--text-h);
}
.ch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 7px;
}
.ch.tg {
  background: #3fb5f0;
}
.ch.gm {
  background: #f2a65a;
}
.recent {
  list-style: none;
  margin: 0;
  padding: 0;
}
.recent li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--card-border);
}
.recent li:last-child {
  border-bottom: 0;
}
.recent b {
  display: block;
  color: var(--text-h);
  font-size: 14px;
}
.recent small {
  color: var(--muted);
  font-size: 13px;
}

/* status */
.status,
.status-select {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
}
.status-select {
  width: auto;
  min-height: 34px;
  padding: 4px 10px;
  cursor: pointer;
}
.s-new {
  background: rgba(92, 200, 255, 0.15);
  color: #8fdcff;
  border-color: rgba(92, 200, 255, 0.35);
}
.s-contacted {
  background: rgba(255, 193, 77, 0.13);
  color: #ffd27a;
  border-color: rgba(255, 193, 77, 0.35);
}
.s-paid {
  background: rgba(74, 222, 128, 0.13);
  color: #7ee8a5;
  border-color: rgba(74, 222, 128, 0.35);
}
.s-cancelled {
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
  border-color: var(--card-border);
}
.status-select option {
  background: #062645;
  color: var(--text-h);
}

/* orders */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chips button {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.chips button b {
  margin-left: 4px;
  color: var(--muted);
}
.chips button.on {
  background: rgba(92, 200, 255, 0.15);
  border-color: var(--accent);
  color: var(--text-h);
}
.chips button.on b {
  color: var(--accent-2);
}
.toolbar-right {
  display: flex;
  gap: 8px;
}
.search {
  width: 200px;
  min-height: 38px;
  padding: 6px 12px;
}
.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--card-border);
}
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--card-border);
  vertical-align: middle;
}
.table tr:last-child td {
  border-bottom: 0;
}
.table tbody tr:hover {
  background: rgba(92, 200, 255, 0.04);
}
.table b {
  color: var(--text-h);
}
.nowrap {
  white-space: nowrap;
}
.right {
  text-align: right;
}
.chan {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.note-input {
  min-width: 160px;
  min-height: 36px;
  padding: 6px 10px;
  font-size: 14px;
  background: transparent;
  border-color: transparent;
}
.note-input:hover {
  border-color: var(--card-border);
}

/* list editors */
.items {
  display: grid;
  gap: 14px;
}
.item {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: rgba(2, 18, 35, 0.35);
}
.item.starred {
  border-color: rgba(92, 200, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(92, 200, 255, 0.15), 0 0 20px rgba(92, 200, 255, 0.1);
}
.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.item-num {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--accent-2);
}
.item-actions {
  display: flex;
  gap: 6px;
}
.icon-pick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.icon-pick button {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid var(--card-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  cursor: pointer;
}
.icon-pick button svg {
  width: 22px;
  height: 22px;
}
.icon-pick button.on {
  border-color: var(--accent);
  background: rgba(92, 200, 255, 0.16);
  color: var(--accent-2);
  box-shadow: 0 0 14px rgba(92, 200, 255, 0.3);
}
.strings {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.string-row {
  display: flex;
  gap: 6px;
}
.string-row .icon-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}
.reset-row {
  display: flex;
  justify-content: flex-end;
}

/* toast */
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 50;
  max-width: calc(100% - 40px);
  padding: 14px 18px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-h);
  background: #0b3964;
  border: 1px solid rgba(74, 222, 128, 0.5);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
.toast.err {
  border-color: rgba(255, 99, 99, 0.6);
  background: #3b1424;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* ---------- responsive ---------- */
@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 860px) {
  .side {
    position: fixed;
    left: 0;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform 0.3s;
    background: #021223;
  }
  .side.open {
    transform: none;
  }
  .side-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 25;
    background: rgba(0, 0, 0, 0.5);
  }
  .menu-btn {
    display: inline-grid;
  }
  .topbar {
    padding: 10px 16px;
    flex-wrap: wrap;
  }
  .dirty-dot {
    display: none;
  }
  .lang-switch {
    order: 5;
    width: 100%;
  }
  .lang-switch button {
    flex: 1;
  }
  .content {
    padding: 16px;
  }
  .search {
    width: 100%;
  }
  .toolbar-right {
    width: 100%;
  }
  /* table -> cards */
  .table thead {
    display: none;
  }
  .table,
  .table tbody,
  .table tr,
  .table td {
    display: block;
    width: 100%;
  }
  .table tr {
    padding: 12px 14px;
    border-bottom: 1px solid var(--card-border);
  }
  .table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border: 0;
  }
  .table td::before {
    content: attr(data-l);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--muted);
  }
  .table td.right {
    justify-content: flex-end;
  }
  .note-input {
    min-width: 0;
    flex: 1;
    max-width: 65%;
    border-color: var(--card-border);
  }
}
@media (max-width: 860px) {
  input,
  textarea,
  select {
    font-size: 16px;
  }
}
@media (max-width: 480px) {
  .stats {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .stat strong {
    font-size: 26px;
  }
  .topbar h1 {
    font-size: 18px;
  }
  .topbar .btn-text {
    display: none;
  }
}
</style>
