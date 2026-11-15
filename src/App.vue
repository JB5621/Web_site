<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import logo from './assets/logo.jpg'
import { defaultContent, normalizeContent, ICONS, LANGS } from './content.js'

// ---------- Dil (türkmençe / rusça) ----------
const plural = (n, one, few, many) => {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return one
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few
  return many
}
const lastNum = (v) => Number((String(v).match(/\d+/g) || [0]).pop())

const UI = {
  tk: {
    nav: ['Artykmaçlyklar', 'Tarifler', 'Nädip?', 'Soraglar'],
    contact: 'Habarlaşmak',
    users: () => 'ulanyjy',
    people: () => 'adam',
    atOnce: 'bir wagtda',
    traffic: 'trafik',
    statLabels: ['-dan başlaýar', 'çenli trafik', 'bir hasapda'],
    copied: 'Göçürildi ✓',
    siteLink: 'Biziň sahypamyz',
    bar: (price, cur) => `Tarif saýla · ${price} ${cur}-dan`,
    tgWrite: 'Telegram-da ýaz',
    phone: 'Telefon',
    copyNum: 'belgisini göçür',
    mailSubject: 'AS VPN satyn almak',
    planSubject: 'AS VPN tarif',
    menu: 'Menýu',
    mainMenu: 'Esasy menýu',
    footerMenu: 'Aşaky menýu',
    home: 'AS VPN baş sahypa',
    logoAlt: 'AS VPN logosy',
    loading: 'Ýüklenýär',
    lang: 'Dil',
    title: 'AS VPN — Howpsuz we çalt internet',
  },
  ru: {
    nav: ['Преимущества', 'Тарифы', 'Как?', 'Вопросы'],
    contact: 'Контакты',
    users: (n) => plural(n, 'пользователь', 'пользователя', 'пользователей'),
    people: (n) => plural(n, 'человек', 'человека', 'человек'),
    atOnce: 'одновременно',
    traffic: 'трафика',
    statLabels: ['начальная цена', 'максимум трафика', 'на один аккаунт'],
    copied: 'Скопировано ✓',
    siteLink: 'Наш сайт',
    bar: (price, cur) => `Выбрать тариф · от ${price} ${cur}`,
    tgWrite: 'Написать в Telegram',
    phone: 'Телефон',
    copyNum: 'скопировать номер',
    mailSubject: 'Покупка AS VPN',
    planSubject: 'Тариф AS VPN',
    menu: 'Меню',
    mainMenu: 'Главное меню',
    footerMenu: 'Нижнее меню',
    home: 'AS VPN — главная',
    logoAlt: 'Логотип AS VPN',
    loading: 'Загрузка',
    lang: 'Язык',
    title: 'AS VPN — Безопасный и быстрый интернет',
  },
}

const readLang = () => {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (LANGS.includes(q)) return q
    const saved = localStorage.getItem('asvpn_lang')
    if (LANGS.includes(saved)) return saved
  } catch {
    /* storage ýapyk */
  }
  return 'tk'
}
const lang = ref(readLang())
const t = computed(() => UI[lang.value])
const applyLang = () => {
  document.documentElement.lang = lang.value
  document.title = t.value.title
}
const setLang = (l) => {
  if (l === lang.value) return
  lang.value = l
  applyLang()
  try {
    localStorage.setItem('asvpn_lang', l)
  } catch {
    /* ignore */
  }
  buildStats()
  countUp()
}
applyLang()

// Mazmun admin panelden (/api/content) gelýär; serwer jogap bermese başlangyç mazmun ulanylýar.
const raw = ref(structuredClone(defaultContent))
const c = computed(() => {
  const L = raw.value[lang.value]
  return { ...L, contact: raw.value.contact, plans: { ...L.plans, items: raw.value.planItems } }
})
const ready = ref(false)
const usersLabel = (p) => `${p.users} ${t.value.users(lastNum(p.users))}`
const peopleLabel = (p) => `${p.users} ${t.value.people(lastNum(p.users))} ${t.value.atOnce}`

const loadContent = async () => {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const r = await fetch('/api/content', { signal: ctrl.signal })
    clearTimeout(t)
    if (r.ok) raw.value = normalizeContent(await r.json())
  } catch {
    /* serwer ýok — başlangyç mazmun */
  }
  ready.value = true
}

const contact = computed(() => c.value.contact)
const plans = computed(() => c.value.plans.items)
const telegramUrl = computed(() => `https://t.me/${contact.value.telegram}`)
const emailUrl = computed(
  () => `mailto:${contact.value.email}?subject=${encodeURIComponent(t.value.mailSubject)}`,
)
const iconPath = (key) => (ICONS[key] || ICONS.bolt).d

// Habarlaşmak düwmeleri: admin panelde doldurylanlar görkezilýär
const contactLinks = computed(() => {
  const ct = contact.value
  const list = [
    { key: 'tg', label: `@${ct.telegram}`, name: 'Telegram', href: telegramUrl.value, ext: true, fill: true,
      d: 'M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.1l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z' },
    { key: 'mail', label: ct.email, name: 'Gmail', href: emailUrl.value, d: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6' },
  ]
  if (ct.phone)
    list.push({ key: 'phone', label: ct.phone, name: t.value.phone, href: `tel:${ct.phone.replace(/[^\d+]/g, '')}`,
      d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z' })
  if (ct.imo)
    list.push({ key: 'imo', label: `imo: ${ct.imo}`, name: 'imo', copy: ct.imo,
      d: 'M7.9 20A9 9 0 1 0 4 16.1L2 22zM8 12h.01M12 12h.01M16 12h.01' })
  if (ct.link)
    list.push({ key: 'link', label: ct.linkLabel || t.value.siteLink, name: 'Link', href: ct.link, ext: true,
      d: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7' })
  return list
})

const copied = ref('')
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    document.body.appendChild(t)
    t.select()
    try { document.execCommand('copy') } catch { /* ignore */ }
    t.remove()
  }
  copied.value = text
  setTimeout(() => (copied.value = ''), 2000)
}

// Saýt açylanda serwere habar berýär (eýesine Telegram bildirişi). Bir sessiýada 1 gezek.
const logVisit = () => {
  try {
    if (sessionStorage.getItem('asvpn_visit')) return
    sessionStorage.setItem('asvpn_visit', '1')
  } catch {
    /* private mode */
  }
  let ref = ''
  try {
    const u = document.referrer && new URL(document.referrer)
    if (u && u.host !== location.host) ref = u.host
  } catch {
    /* ignore */
  }
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: lang.value, ref }),
    keepalive: true,
  }).catch(() => {})
}

const logOrder = (p, channel) => {
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: { users: p.users, price: p.price, gb: p.gb }, channel, lang: lang.value }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}

// "Satyn al": ilki Telegram programmasyny açmaga synanyşýar,
// açylmasa ~1.5 sekuntdan soň Gmail-e geçýär. Ikisinde-de saýlanan tarif ýazylýar.
const buy = (p) => {
  const enc = encodeURIComponent
  const cur = c.value.plans.currency
  const plan = `${usersLabel(p)} — ${p.gb} GB — ${p.price} ${cur}`
  const msg = `${c.value.plans.message}\n${plan}`
  const mailUrl = `mailto:${contact.value.email}?subject=${enc(`${t.value.planSubject}: ${plan}`)}&body=${enc(msg)}`
  const tgApp = `tg://resolve?domain=${contact.value.telegram}&text=${enc(msg)}`

  let opened = false
  const markOpened = () => (opened = true)
  const onVisibility = () => document.hidden && markOpened()
  window.addEventListener('blur', markOpened)
  window.addEventListener('pagehide', markOpened)
  document.addEventListener('visibilitychange', onVisibility)

  window.location.href = tgApp

  setTimeout(() => {
    window.removeEventListener('blur', markOpened)
    window.removeEventListener('pagehide', markOpened)
    document.removeEventListener('visibilitychange', onVisibility)
    const fallback = !opened && !document.hidden
    logOrder(p, fallback ? 'gmail' : 'telegram')
    if (fallback) window.location.href = mailUrl
  }, 1500)
}

const maxGb = computed(() => Math.max(1, ...plans.value.map((p) => Number(p.gb) || 0)))

const navIds = ['artykmaclyklar', 'tarifler', 'nadip', 'soraglar']
const nav = computed(() => navIds.map((id, i) => ({ id, label: t.value.nav[i] })))

const openFaq = ref(0)
const toggleFaq = (i) => (openFaq.value = openFaq.value === i ? -1 : i)
const year = new Date().getFullYear()

const menuOpen = ref(false)
const scrolled = ref(false)
const active = ref('')
const stats = ref([])
const buildStats = () => {
  const ps = plans.value
  const nums = (v) => (String(v).match(/\d+/g) || []).map(Number)
  const minPrice = ps.length ? Math.min(...ps.map((p) => Number(p.price) || 0)) : 0
  const maxUsers = Math.max(0, ...ps.flatMap((p) => nums(p.users)))
  const L = t.value.statLabels
  stats.value = [
    { to: minPrice, val: 0, suffix: ` ${c.value.plans.currency}`, label: L[0] },
    { to: ps.length ? maxGb.value : 0, val: 0, suffix: ' GB', label: L[1] },
    { to: maxUsers, val: 0, suffix: ` ${t.value.people(maxUsers)}`, label: L[2] },
  ]
}

const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Scroll reveal directive
let revealObs
const vReveal = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.setProperty('--d', `${binding.value}ms`)
    revealObs?.observe(el)
  },
}
if (typeof window !== 'undefined') {
  revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          revealObs.unobserve(e.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )
}

// Spotlight on cards
const spot = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

// Count-up
const countUp = () => {
  if (reduced) {
    stats.value.forEach((s) => (s.val = s.to))
    return
  }
  const start = performance.now()
  const dur = 1600
  const tick = (t) => {
    const p = Math.min((t - start) / dur, 1)
    const ease = 1 - Math.pow(1 - p, 3)
    stats.value.forEach((s) => (s.val = Math.round(s.to * ease)))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// Header + active section
let sectionObs
const pastHero = ref(false)
const onScroll = () => {
  scrolled.value = window.scrollY > 20
  pastHero.value = window.scrollY > window.innerHeight * 0.8
}
const onKey = (e) => e.key === 'Escape' && (menuOpen.value = false)
// Telefonda aşakdaky "Tarif saýla" zolagy: tarifler we habarlaşmak bölümlerinde gizlenýär
const showBar = computed(() => pastHero.value && !menuOpen.value && !['tarifler', 'habarlasmak'].includes(active.value))

// Particle network background
const canvas = ref(null)
let raf
let resizeHandler
const startParticles = () => {
  const c = canvas.value
  if (!c || reduced) return
  const ctx = c.getContext('2d')
  let w, h, pts
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const init = () => {
    w = c.width = window.innerWidth * dpr
    h = c.height = window.innerHeight * dpr
    c.style.width = window.innerWidth + 'px'
    c.style.height = window.innerHeight + 'px'
    const n = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 22000))
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3 * dpr,
      vy: (Math.random() - 0.5) * 0.3 * dpr,
    }))
  }
  init()
  resizeHandler = init
  window.addEventListener('resize', resizeHandler)
  const max = 140 * dpr
  const draw = () => {
    ctx.clearRect(0, 0, w, h)
    for (const p of pts) {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > w) p.vx *= -1
      if (p.y < 0 || p.y > h) p.vy *= -1
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        const d = Math.hypot(dx, dy)
        if (d < max) {
          ctx.strokeStyle = `rgba(92,200,255,${0.14 * (1 - d / max)})`
          ctx.lineWidth = dpr
          ctx.beginPath()
          ctx.moveTo(pts[i].x, pts[i].y)
          ctx.lineTo(pts[j].x, pts[j].y)
          ctx.stroke()
        }
      }
      ctx.fillStyle = 'rgba(159,230,255,0.55)'
      ctx.beginPath()
      ctx.arc(pts[i].x, pts[i].y, 1.4 * dpr, 0, Math.PI * 2)
      ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }
  draw()
}

onMounted(async () => {
  logVisit()
  await loadContent()
  buildStats()
  await nextTick()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  sectionObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (active.value = e.target.id)),
    { rootMargin: '-45% 0px -50% 0px' },
  )
  ;[...navIds, 'habarlasmak'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) sectionObs.observe(el)
  })
  window.addEventListener('keydown', onKey)
  setTimeout(countUp, 500)
  startParticles()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKey)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  cancelAnimationFrame(raf)
  sectionObs?.disconnect()
  revealObs?.disconnect()
})
</script>

<template>
  <div v-if="!ready" class="loader" :aria-label="t.loading"><img :src="logo" alt="" width="72" height="72" /></div>
  <div class="bg" aria-hidden="true">
    <canvas ref="canvas"></canvas>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="grid-bg"></div>
  </div>

  <template v-if="ready">
  <header class="header" :class="{ scrolled, open: menuOpen }">
    <div class="container header-inner">
      <a href="#" class="brand" :aria-label="t.home">
        <img :src="logo" alt="" width="40" height="40" />
        <span>AS VPN</span>
      </a>
      <nav class="nav" :aria-label="t.mainMenu">
        <a v-for="n in nav" :key="n.id" :href="`#${n.id}`" :class="{ active: active === n.id }"
          @click="menuOpen = false">{{ n.label }}</a>
        <a href="#habarlasmak" class="btn btn-sm nav-cta" @click="menuOpen = false">{{ t.contact }}</a>
      </nav>
      <div class="lang" role="group" :aria-label="t.lang">
        <button v-for="l in LANGS" :key="l" type="button" :class="{ on: lang === l }" :aria-pressed="lang === l"
          :lang="l" @click="setLang(l)">{{ l === 'tk' ? 'TM' : 'RU' }}</button>
      </div>
      <button class="burger" :aria-expanded="menuOpen" :aria-label="t.menu" @click="menuOpen = !menuOpen">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <span class="pill enter" style="--d: 0ms"><span class="dot"></span> {{ c.hero.badge }}</span>
          <h1 class="enter" style="--d: 120ms">
            {{ c.hero.title1 }} <span class="grad">{{ c.hero.highlight }}</span><br />{{ c.hero.title2 }}
          </h1>
          <p class="lead enter" style="--d: 240ms">
            {{ c.hero.lead }}
          </p>
          <div class="hero-cta enter" style="--d: 360ms">
            <a href="#tarifler" class="btn shine">
              {{ c.hero.ctaPrimary }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <a :href="telegramUrl" target="_blank" rel="noopener" class="btn btn-ghost">{{ c.hero.ctaSecondary }}</a>
          </div>
          <ul class="hero-stats enter" style="--d: 480ms">
            <li v-for="(s, si) in stats" :key="si">
              <strong>{{ s.val }}{{ s.suffix }}</strong><span>{{ s.label }}</span>
            </li>
          </ul>
        </div>

        <div class="hero-visual enter" style="--d: 200ms">
          <div class="halo"></div>
          <div class="orbit orbit-1"><i></i></div>
          <div class="orbit orbit-2"><i></i><i></i></div>
          <div class="orbit orbit-3"><i></i></div>
          <img :src="logo" :alt="t.logoAlt" width="420" height="420" />
          <div class="chip chip-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            {{ c.hero.chip1 }}
          </div>
          <div class="chip chip-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            {{ c.hero.chip2 }}
          </div>
        </div>
      </div>

      <div class="marquee" aria-hidden="true">
        <div class="marquee-track">
          <span v-for="(m, i) in [...c.marquee, ...c.marquee]" :key="i">{{ m }}</span>
        </div>
      </div>
    </section>

    <section id="artykmaclyklar" class="section">
      <div class="container">
        <div v-reveal class="section-head">
          <span class="eyebrow">{{ c.features.eyebrow }}</span>
          <h2>{{ c.features.title }}</h2>
          <p>{{ c.features.subtitle }}</p>
        </div>
        <div class="features">
          <article v-for="(f, i) in c.features.items" :key="i" v-reveal="i * 100" class="card feature spotlight"
            @mousemove="spot">
            <div class="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="iconPath(f.icon)" />
              </svg>
            </div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="tarifler" class="section">
      <div class="container">
        <div v-reveal class="section-head">
          <span class="eyebrow">{{ c.plans.eyebrow }}</span>
          <h2>{{ c.plans.title }}</h2>
          <p>{{ c.plans.subtitle }}</p>
        </div>
        <div class="plans">
          <div v-for="(p, i) in plans" :key="i" v-reveal="i * 110" class="plan-wrap" :class="{ best: p.best }">
            <article class="card plan spotlight" @mousemove="spot">
              <span v-if="p.best" class="badge">{{ c.plans.badge }}</span>
              <div class="plan-users">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {{ usersLabel(p) }}
              </div>
              <div class="price"><strong>{{ p.price }}</strong> {{ c.plans.currency }}</div>
              <div class="gb-bar" :style="{ '--w': `${Math.min(100, (p.gb / maxGb) * 100)}%` }"><span></span></div>
              <ul class="plan-list">
                <li>{{ p.gb }} GB {{ t.traffic }}</li>
                <li>{{ peopleLabel(p) }}</li>
                <li v-for="(x, xi) in c.plans.extras" :key="xi">{{ x }}</li>
              </ul>
              <button type="button" class="btn" :class="p.best ? 'shine' : 'btn-ghost'" @click="buy(p)">
                {{ c.plans.button }}
              </button>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="nadip" class="section">
      <div class="container">
        <div v-reveal class="section-head">
          <span class="eyebrow">{{ c.steps.eyebrow }}</span>
          <h2>{{ c.steps.title }}</h2>
          <p>{{ c.steps.subtitle }}</p>
        </div>
        <ol class="steps">
          <li v-for="(s, i) in c.steps.items" :key="i" v-reveal="i * 120" class="card step spotlight" @mousemove="spot">
            <span class="step-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section id="soraglar" class="section">
      <div class="container narrow">
        <div v-reveal class="section-head">
          <span class="eyebrow">{{ c.faq.eyebrow }}</span>
          <h2>{{ c.faq.title }}</h2>
        </div>
        <div class="faq">
          <div v-for="(f, i) in c.faq.items" :key="i" v-reveal="i * 80" class="card faq-item" :class="{ open: openFaq === i }">
            <button class="faq-q" :aria-expanded="openFaq === i" @click="toggleFaq(i)">
              {{ f.q }}
              <span class="plus" aria-hidden="true"></span>
            </button>
            <div class="faq-body">
              <div><p class="faq-a">{{ f.a }}</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="habarlasmak" class="section">
      <div class="container">
        <div v-reveal class="card cta">
          <div class="cta-glow" aria-hidden="true"></div>
          <h2>{{ c.cta.title }}</h2>
          <p>{{ c.cta.text }}</p>
          <div class="hero-cta center contacts">
            <component :is="l.copy ? 'button' : 'a'" v-for="(l, i) in contactLinks" :key="l.key"
              :type="l.copy ? 'button' : undefined" :href="l.href" :target="l.ext ? '_blank' : undefined"
              :rel="l.ext ? 'noopener' : undefined" class="btn" :class="[i === 0 ? 'shine' : 'btn-ghost', 'contact-btn']"
              :aria-label="l.copy ? `${l.name} ${t.copyNum}: ${l.copy}` : `${l.name}: ${l.label}`"
              @click="l.copy && copyText(l.copy)">
              <svg viewBox="0 0 24 24" :fill="l.fill ? 'currentColor' : 'none'" stroke="currentColor"
                :stroke-width="l.fill ? 0 : 2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="l.d" /></svg>
              {{ l.copy && copied === l.copy ? t.copied : l.label }}
            </component>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <div class="brand">
        <img :src="logo" alt="" width="32" height="32" />
        <span>AS VPN</span>
      </div>
      <nav class="footer-nav" :aria-label="t.footerMenu">
        <a v-for="n in nav" :key="n.id" :href="`#${n.id}`">{{ n.label }}</a>
      </nav>
      <div class="footer-contact">
        <template v-for="l in contactLinks" :key="l.key">
          <button v-if="l.copy" type="button" class="link-btn" @click="copyText(l.copy)">
            {{ copied === l.copy ? t.copied : `imo: ${l.copy}` }}
          </button>
          <a v-else :href="l.href" :target="l.ext ? '_blank' : undefined" :rel="l.ext ? 'noopener' : undefined">
            {{ l.key === 'tg' ? `Telegram: ${l.label}` : l.key === 'link' ? `${l.label} ↗` : l.label }}
          </a>
        </template>
      </div>
      <p class="copy">© {{ year }} {{ c.footer.copyright }}</p>
    </div>
  </footer>

  <div class="mbar" :class="{ show: showBar }" :aria-hidden="!showBar">
    <a href="#tarifler" class="btn shine" :tabindex="showBar ? 0 : -1">
      {{ t.bar(stats[0]?.to, c.plans.currency) }}
    </a>
    <a :href="telegramUrl" target="_blank" rel="noopener" class="btn btn-ghost mbar-tg" :aria-label="t.tgWrite"
      :tabindex="showBar ? 0 : -1">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.1l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z" /></svg>
    </a>
  </div>
  </template>
</template>

<style scoped>
.container {
  position: relative;
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 16px;
}
.narrow {
  max-width: 780px;
}

/* ---------- Loader ---------- */
.loader {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
}
.loader img {
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(92, 200, 255, 0.5);
  animation: breathe 1.4s ease-in-out infinite;
}

/* ---------- Background ---------- */
.bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.bg canvas {
  position: absolute;
  inset: 0;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
}
.orb-1 {
  width: 520px;
  height: 520px;
  background: #0f5cab;
  top: -160px;
  left: -140px;
  animation: drift 18s ease-in-out infinite alternate;
}
.orb-2 {
  width: 460px;
  height: 460px;
  background: #1b8fd6;
  bottom: -180px;
  right: -120px;
  opacity: 0.3;
  animation: drift 22s ease-in-out infinite alternate-reverse;
}
@keyframes drift {
  to {
    transform: translate(120px, 80px) scale(1.15);
  }
}
.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(92, 200, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 200, 255, 0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%);
}

/* ---------- Header ---------- */
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid transparent;
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.header.scrolled,
.header.open {
  background: rgba(3, 27, 51, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-color: var(--card-border);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 72px;
  transition: height 0.3s;
}
.scrolled .header-inner {
  height: 62px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-h);
  font-weight: 800;
  font-size: 19px;
  letter-spacing: 0.5px;
}
.brand img {
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 16px rgba(92, 200, 255, 0.45);
  transition: transform 0.6s;
}
.brand:hover img {
  transform: rotate(360deg);
}
.nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.nav a:not(.btn) {
  position: relative;
  padding: 8px 14px;
  text-decoration: none;
  color: var(--text);
  font-weight: 600;
  font-size: 15px;
  transition: color 0.2s;
}
.nav a:not(.btn)::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  transform: scaleX(0);
  transition: transform 0.3s;
}
.nav a:not(.btn):hover,
.nav a.active {
  color: var(--text-h);
}
.nav a:not(.btn):hover::after,
.nav a.active::after {
  transform: scaleX(1);
}
.nav-cta {
  margin-left: 12px;
}
.lang {
  display: flex;
  padding: 3px;
  gap: 2px;
  border-radius: 12px;
  border: 1px solid var(--card-border);
  background: var(--card);
  flex-shrink: 0;
}
.lang button {
  min-width: 40px;
  min-height: 34px;
  padding: 0 8px;
  border: 0;
  border-radius: 9px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.lang button:hover {
  color: var(--text-h);
}
.lang button.on {
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  color: var(--accent-ink);
}
.burger {
  display: none;
  margin-left: auto;
  width: 44px;
  height: 44px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
}
.burger span {
  width: 20px;
  height: 2px;
  border-radius: 2px;
  background: var(--text-h);
  transition: transform 0.3s, opacity 0.3s;
}
.open .burger span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.open .burger span:nth-child(2) {
  opacity: 0;
}
.open .burger span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ---------- Buttons ---------- */
.btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 50px;
  padding: 0 26px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  color: var(--accent-ink);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  box-shadow: var(--glow);
  transition: transform 0.25s, box-shadow 0.25s, background 0.25s, border-color 0.25s;
}
.btn svg {
  width: 18px;
  height: 18px;
  transition: transform 0.25s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 36px rgba(92, 200, 255, 0.6);
}
.btn:hover svg {
  transform: translateX(3px);
}
.btn:active {
  transform: translateY(0) scale(0.98);
}
.shine::before {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 40%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.65), transparent);
  transform: skewX(-20deg);
  animation: shine 3.5s ease-in-out infinite;
}
@keyframes shine {
  0%,
  60% {
    left: -60%;
  }
  100% {
    left: 130%;
  }
}
.btn-ghost {
  background: rgba(92, 200, 255, 0.04);
  color: var(--accent-2);
  border-color: rgba(92, 200, 255, 0.4);
  box-shadow: none;
}
.btn-ghost:hover {
  background: rgba(92, 200, 255, 0.12);
  border-color: var(--accent);
  box-shadow: 0 0 24px rgba(92, 200, 255, 0.25);
}
.btn-sm {
  min-height: 42px;
  padding: 0 20px;
  font-size: 15px;
}

/* ---------- Entrance + reveal ---------- */
.enter {
  opacity: 0;
  animation: enter 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  animation-delay: var(--d, 0ms);
}
@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(28px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
.reveal {
  opacity: 0;
  transform: translateY(36px);
  transition:
    opacity 0.8s cubic-bezier(0.2, 0.7, 0.2, 1),
    transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
  transition-delay: var(--d, 0ms);
}
.reveal.in {
  opacity: 1;
  transform: none;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  padding: 64px 0 0;
}
.hero-inner {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: center;
  gap: 48px;
  padding-bottom: 64px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: var(--card);
  backdrop-filter: blur(8px);
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-2);
}
.dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
}
.dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #4ade80;
  animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ping {
  75%,
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}
.hero h1 {
  font-size: clamp(38px, 5.8vw, 64px);
  font-weight: 800;
  letter-spacing: -1.5px;
  margin: 22px 0 20px;
}
.grad {
  background: linear-gradient(90deg, #9fe6ff, #5cc8ff, #ffffff, #5cc8ff, #9fe6ff);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: grad 6s linear infinite;
  filter: drop-shadow(0 0 22px rgba(92, 200, 255, 0.4));
}
@keyframes grad {
  to {
    background-position: 300% 0;
  }
}
.lead {
  font-size: 18px;
  max-width: 540px;
}
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}
.hero-cta.center {
  justify-content: center;
}
.hero-stats {
  list-style: none;
  padding: 0;
  margin: 44px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}
.hero-stats li {
  display: flex;
  flex-direction: column;
  padding: 0 28px;
  border-left: 1px solid var(--card-border);
}
.hero-stats li:first-child {
  padding-left: 0;
  border-left: 0;
}
.hero-stats strong {
  color: var(--text-h);
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.hero-stats span {
  font-size: 14px;
  color: var(--muted);
}

/* Hero visual */
.hero-visual {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  width: min(480px, 100%);
  justify-self: center;
}
.hero-visual img {
  position: relative;
  z-index: 2;
  width: 82%;
  height: auto;
  border-radius: 50%;
  mask-image: radial-gradient(circle, #000 58%, transparent 71%);
  -webkit-mask-image: radial-gradient(circle, #000 58%, transparent 71%);
  animation: float 6s ease-in-out infinite;
}
.halo {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(92, 200, 255, 0.35), transparent 65%);
  filter: blur(20px);
  animation: breathe 4s ease-in-out infinite;
}
@keyframes breathe {
  50% {
    transform: scale(1.12);
    opacity: 0.7;
  }
}
.orbit {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(92, 200, 255, 0.18);
  animation: spin linear infinite;
}
.orbit i {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 14px 3px var(--accent);
  top: -5px;
  left: calc(50% - 5px);
}
.orbit-1 {
  inset: 2%;
  animation-duration: 18s;
  border-style: dashed;
}
.orbit-2 {
  inset: -6%;
  animation-duration: 28s;
  animation-direction: reverse;
}
.orbit-2 i:nth-child(2) {
  top: auto;
  bottom: -5px;
  width: 7px;
  height: 7px;
}
.orbit-3 {
  inset: 12%;
  animation-duration: 12s;
  border-color: rgba(92, 200, 255, 0.1);
}
.orbit-3 i {
  width: 6px;
  height: 6px;
  top: -3px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes float {
  50% {
    transform: translateY(-14px);
  }
}
.chip {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(6, 38, 69, 0.75);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-h);
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: float 5s ease-in-out infinite;
}
.chip svg {
  width: 18px;
  height: 18px;
  color: var(--accent);
}
.chip-1 {
  top: 14%;
  left: -2%;
}
.chip-2 {
  bottom: 14%;
  right: -2%;
  animation-delay: -2.5s;
}

/* Marquee */
.marquee {
  position: relative;
  overflow: hidden;
  padding: 22px 0;
  border-block: 1px solid var(--card-border);
  background: rgba(6, 38, 69, 0.35);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 30s linear infinite;
}
.marquee-track span {
  display: flex;
  align-items: center;
  gap: 48px;
  padding-right: 48px;
  font-weight: 700;
  font-size: 18px;
  color: var(--muted);
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.marquee-track span::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}

/* ---------- Sections ---------- */
.section {
  position: relative;
  padding: 96px 0;
}
.section-head {
  text-align: center;
  margin-bottom: 52px;
}
.eyebrow {
  display: inline-block;
  margin-bottom: 14px;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(92, 200, 255, 0.3);
  background: rgba(92, 200, 255, 0.08);
  color: var(--accent-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.section-head h2 {
  font-size: clamp(30px, 4.2vw, 44px);
  font-weight: 800;
  letter-spacing: -0.8px;
}
.section-head p {
  margin-top: 12px;
  color: var(--muted);
  font-size: 17px;
}
.card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.spotlight {
  overflow: hidden;
}
.spotlight::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(320px circle at var(--mx, 50%) var(--my, -200px), rgba(92, 200, 255, 0.14), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.spotlight:hover::before {
  opacity: 1;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.feature {
  padding: 30px 26px;
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}
.feature.in:hover,
.step.in:hover {
  border-color: rgba(92, 200, 255, 0.45);
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition-delay: 0ms;
}
.icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(92, 200, 255, 0.22), rgba(92, 200, 255, 0.05));
  border: 1px solid rgba(92, 200, 255, 0.25);
  color: var(--accent-2);
  margin-bottom: 20px;
  transition: transform 0.4s, box-shadow 0.4s;
}
.feature:hover .icon {
  transform: rotate(-8deg) scale(1.08);
  box-shadow: 0 0 24px rgba(92, 200, 255, 0.4);
}
.icon svg {
  width: 24px;
  height: 24px;
}
.feature h3,
.step h3 {
  font-size: 18px;
  margin-bottom: 8px;
}
.feature p,
.step p {
  font-size: 15px;
  color: var(--muted);
}

/* Plans */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.plans {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  align-items: stretch;
}
.plan-wrap {
  position: relative;
  border-radius: calc(var(--radius) + 1px);
  display: flex;
}
.plan-wrap.in:hover {
  transform: translateY(-8px);
  transition-delay: 0ms;
}
.plan-wrap.best {
  padding: 1.5px;
  background: conic-gradient(from var(--angle), rgba(92, 200, 255, 0.15), var(--accent-2), var(--accent), rgba(92, 200, 255, 0.15) 40%, rgba(92, 200, 255, 0.15) 60%, var(--accent), var(--accent-2), rgba(92, 200, 255, 0.15));
  animation: rotate-border 5s linear infinite;
  box-shadow: 0 0 50px rgba(92, 200, 255, 0.25);
}
@keyframes rotate-border {
  to {
    --angle: 360deg;
  }
}
.plan {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 32px 26px 26px;
  transition: border-color 0.3s;
}
.plan-wrap:not(.best):hover .plan {
  border-color: rgba(92, 200, 255, 0.45);
}
.best .plan {
  border: 0;
  background: linear-gradient(180deg, #0b3964, #062645 60%);
  overflow: visible;
}
.badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 0 20px rgba(92, 200, 255, 0.5);
  z-index: 2;
}
.plan-users {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--accent-2);
}
.plan-users svg {
  width: 20px;
  height: 20px;
}
.price {
  margin: 16px 0 14px;
  color: var(--muted);
  font-weight: 700;
}
.price strong {
  font-size: 50px;
  font-weight: 800;
  color: var(--text-h);
  letter-spacing: -1.5px;
  margin-right: 4px;
}
.gb-bar {
  height: 6px;
  border-radius: 6px;
  background: rgba(92, 200, 255, 0.1);
  overflow: hidden;
}
.gb-bar span {
  display: block;
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  box-shadow: 0 0 10px var(--accent);
  transition: width 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s;
}
.in .gb-bar span {
  width: var(--w);
}
.plan-list {
  list-style: none;
  padding: 0;
  margin: 22px 0 28px;
  display: grid;
  gap: 12px;
  flex-grow: 1;
  font-size: 15px;
}
.plan-list li {
  position: relative;
  padding-left: 30px;
}
.plan-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(92, 200, 255, 0.15)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235cc8ff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")
    center / 12px no-repeat;
}
.plan-list li:first-child {
  color: var(--text-h);
  font-weight: 700;
}

/* Steps */
.steps {
  position: relative;
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.step {
  padding: 30px 26px;
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}
.step-num {
  display: block;
  margin-bottom: 18px;
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(180deg, var(--accent-2), rgba(92, 200, 255, 0.15));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* FAQ */
.faq {
  display: grid;
  gap: 12px;
}
.faq-item {
  transition: border-color 0.3s, background 0.3s;
}
.faq-item.open {
  border-color: rgba(92, 200, 255, 0.45);
  background: rgba(11, 57, 100, 0.55);
}
.faq-q {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 60px;
  padding: 18px 24px;
  background: none;
  border: 0;
  color: var(--text-h);
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.plus {
  position: relative;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(92, 200, 255, 0.4);
  transition: transform 0.35s, background 0.35s;
}
.plus::before,
.plus::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 2px;
  margin: -1px 0 0 -6px;
  border-radius: 2px;
  background: var(--accent-2);
}
.plus::after {
  transform: rotate(90deg);
}
.open .plus {
  transform: rotate(135deg);
  background: rgba(92, 200, 255, 0.15);
}
.faq-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.faq-body > div {
  overflow: hidden;
}
.open .faq-body {
  grid-template-rows: 1fr;
}
.faq-a {
  padding: 0 24px 22px;
  color: var(--muted);
}

/* CTA */
.cta {
  overflow: hidden;
  text-align: center;
  padding: 72px 24px;
  background: linear-gradient(180deg, rgba(11, 57, 100, 0.7), rgba(6, 38, 69, 0.6));
  border-color: rgba(92, 200, 255, 0.3);
}
.cta-glow {
  position: absolute;
  top: -60%;
  left: 50%;
  width: 700px;
  height: 400px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(92, 200, 255, 0.35), transparent);
  animation: breathe 5s ease-in-out infinite;
  pointer-events: none;
}
.cta h2 {
  position: relative;
  font-size: clamp(28px, 4.2vw, 42px);
  font-weight: 800;
  letter-spacing: -0.8px;
}
.cta > p {
  position: relative;
  margin-top: 12px;
  color: var(--muted);
  font-size: 17px;
}

/* Footer */
.footer {
  border-top: 1px solid var(--card-border);
  background: rgba(2, 18, 35, 0.6);
  padding: 32px 0;
  font-size: 14px;
  color: var(--muted);
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.footer .brand {
  font-size: 16px;
}
.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.footer-nav a {
  text-decoration: none;
  transition: color 0.2s;
}
.footer-nav a:hover,
.footer-contact a:hover {
  color: var(--accent-2);
}
.footer-contact {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.footer-contact a {
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s;
}
.copy {
  width: 100%;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
  text-align: center;
}
.contacts {
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
.contact-btn {
  text-align: center;
  overflow-wrap: anywhere;
}
.link-btn {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: inherit;
  transition: color 0.2s;
}
.link-btn:hover {
  color: var(--accent-2);
}
@media (max-width: 560px) {
  .contact-btn {
    flex: 1 1 100%;
    padding: 0 14px;
    gap: 8px;
    font-size: 14px;
  }
}

/* ---------- Responsive ---------- */
@media (max-width: 1040px) {
  .features,
  .plans,
  .steps {
    grid-template-columns: repeat(2, 1fr);
  }
  .plans {
    row-gap: 34px;
  }
}
@media (max-width: 860px) {
  .burger {
    display: flex;
    margin-left: 0;
  }
  .header-inner {
    gap: 10px;
  }
  .lang {
    margin-left: auto;
  }
  .nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 12px 16px 20px;
    background: rgba(3, 27, 51, 0.97);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--card-border);
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
    transition: opacity 0.3s, transform 0.3s;
  }
  .open .nav {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
  .nav a:not(.btn) {
    padding: 14px 8px;
    font-size: 17px;
    border-bottom: 1px solid var(--card-border);
  }
  .nav a:not(.btn)::after {
    display: none;
  }
  .nav-cta {
    margin: 12px 0 0;
  }
  .hero {
    padding-top: 28px;
  }
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: center;
    padding-bottom: 48px;
  }
  .hero-visual {
    order: -1;
    width: min(340px, 86%);
  }
  .lead {
    margin: 0 auto;
  }
  .hero-cta,
  .hero-stats {
    justify-content: center;
  }
  .section {
    padding: 72px 0;
  }
}
@media (max-width: 560px) {
  .features,
  .plans,
  .steps {
    grid-template-columns: 1fr;
  }
  .hero-cta .btn {
    flex: 1 1 100%;
  }
  .hero-stats li {
    padding: 0 14px;
  }
  .hero-stats strong {
    font-size: 21px;
  }
  .chip {
    padding: 8px 12px;
    font-size: 13px;
  }
  .chip-1 {
    left: -4%;
  }
  .chip-2 {
    right: -4%;
  }
  .footer-inner {
    flex-direction: column;
    text-align: center;
  }
  .footer-nav {
    justify-content: center;
  }
}

/* ---------- Telefon üçin optimizasiýa ---------- */
.hero {
  overflow-x: clip;
}
.container {
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}
.footer {
  padding-bottom: max(28px, env(safe-area-inset-bottom));
}

/* Aşaky zolak (diňe telefonda) */
.mbar {
  display: none;
}
@media (max-width: 860px) {
  .mbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 15;
    display: flex;
    gap: 10px;
    padding: 10px max(16px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom))
      max(16px, env(safe-area-inset-left));
    background: rgba(3, 27, 51, 0.92);
    border-top: 1px solid var(--card-border);
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
    transform: translateY(110%);
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .mbar.show {
    transform: none;
  }
  .mbar .btn {
    min-height: 48px;
  }
  .mbar .btn:first-child {
    flex: 1;
    padding: 0 16px;
    font-size: 15px;
  }
  .mbar-tg {
    width: 52px;
    padding: 0;
    flex-shrink: 0;
  }
  .mbar-tg svg {
    width: 22px;
    height: 22px;
  }
  .footer {
    padding-bottom: calc(92px + env(safe-area-inset-bottom));
  }

  /* agyr effektleri ýeňilletmek (köne telefonlar üçin) */
  .card,
  .chip,
  .pill {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .orb {
    filter: blur(60px);
  }
  .orbit-2 {
    inset: 0;
  }
  .orbit-1 {
    inset: 7%;
  }
  .hero-visual {
    width: min(300px, 78%);
  }
  .section-head {
    margin-bottom: 32px;
  }
}

@media (max-width: 560px) {
  .hero {
    padding-top: 16px;
  }
  .hero h1 {
    margin: 16px 0 14px;
  }
  .lead {
    font-size: 16px;
  }
  .hero-cta {
    margin-top: 24px;
  }
  .hero-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-top: 28px;
  }
  .hero-stats li,
  .hero-stats li:first-child {
    padding: 0 6px;
    border-left: 1px solid var(--card-border);
    align-items: center;
  }
  .hero-stats li:first-child {
    border-left: 0;
  }
  .hero-stats strong {
    font-size: clamp(16px, 5vw, 21px);
    white-space: nowrap;
  }
  .hero-stats span {
    font-size: 12px;
  }
  .hero-inner {
    padding-bottom: 36px;
  }
  .marquee {
    padding: 16px 0;
  }
  .marquee-track span {
    font-size: 15px;
    gap: 32px;
    padding-right: 32px;
  }
  .section {
    padding: 52px 0;
  }
  .section-head p {
    font-size: 15px;
  }

  /* Artykmaçlyklar we ädimler: nyşan çepde, ýazgy sagda — gysga kartlar */
  .features,
  .steps {
    gap: 12px;
  }
  .feature,
  .step {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 16px;
    align-items: start;
    padding: 18px;
  }
  .feature .icon,
  .step .step-num {
    grid-row: span 2;
    margin-bottom: 0;
  }
  .icon {
    width: 46px;
    height: 46px;
  }
  .step-num {
    font-size: 32px;
    min-width: 46px;
  }
  .feature h3,
  .step h3 {
    font-size: 17px;
    margin-bottom: 4px;
  }

  /* Tarifler */
  .plans {
    row-gap: 26px;
  }
  .plan {
    padding: 26px 20px 20px;
  }
  .price strong {
    font-size: 44px;
  }
  .plan-list {
    margin: 18px 0 22px;
    gap: 10px;
  }

  /* Soraglar */
  .faq-q {
    padding: 16px 18px;
    font-size: 16px;
  }
  .faq-a {
    padding: 0 18px 18px;
    font-size: 15px;
  }

  /* Habarlaşmak */
  .cta {
    padding: 44px 18px;
  }
  .contact-btn {
    font-size: clamp(12.5px, 3.9vw, 15px);
  }
  .footer-nav {
    gap: 8px 18px;
  }
}

/* Barmak bilen ulanylanda hover effektleri ýapyşyp galmasyn */
@media (hover: none) {
  .feature.in:hover,
  .step.in:hover,
  .plan-wrap.in:hover,
  .btn:hover {
    transform: none;
  }
  .spotlight::before {
    display: none;
  }
  .btn:active,
  .plan-wrap:active {
    transform: scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .enter,
  .reveal {
    opacity: 1;
    transform: none;
    filter: none;
  }
  .gb-bar span {
    width: var(--w);
  }
}
</style>
