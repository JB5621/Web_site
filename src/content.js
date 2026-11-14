// Saýtyň başlangyç mazmuny (türkmençe we rusça). Admin panelde üýtgedilenler server/data/content.json-da saklanýar.
// Serwer hem şu gurluşy ulanyp gelen maglumatlary barlaýar (sanitize).

export const ICONS = {
  bolt: { label: 'Ýyldyrym (tizlik)', d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' },
  shield: { label: 'Galkan (howpsuzlyk)', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4' },
  phone: { label: 'Telefon (enjamlar)', d: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01' },
  chat: { label: 'Habar (goldaw)', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  globe: { label: 'Dünýä', d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20' },
  lock: { label: 'Gulp', d: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z' },
  clock: { label: 'Sagat (24/7)', d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2' },
  star: { label: 'Ýyldyz', d: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z' },
}

export const LANGS = ['tk', 'ru']

// Umumy: contact we planItems (baha, GB, ulanyjy) iki dil üçin birmeňzeş.
// tk / ru: her diliň öz ýazgylary.
export const defaultContent = {
  contact: {
    telegram: 'qqq_sergo',
    email: 'support.admin2000@gmail.com',
    // Goşmaça (boş bolsa saýtda görkezilmeýär)
    phone: '',
    imo: '',
    link: '',
    linkLabel: '',
  },
  planItems: [
    { users: '1–2', price: 100, gb: 100, best: false },
    { users: '3', price: 150, gb: 150, best: false },
    { users: '4', price: 200, gb: 200, best: false },
    { users: '5', price: 250, gb: 300, best: true },
  ],
  tk: {
    hero: {
      badge: 'Serwerler işjeň',
      title1: 'Internetiňiz',
      highlight: 'howpsuz,',
      title2: 'çalt we erkin',
      lead: 'AS VPN bilen islendik saýta we programma aladasyz giriň. Bir hasaby maşgalaňyz ýa-da dostlaryňyz bilen 5 adama çenli bile ulanyň.',
      ctaPrimary: 'Tarifleri gör',
      ctaSecondary: 'Telegram-da ýaz',
      chip1: 'Şifrlenen',
      chip2: 'Çalt',
    },
    marquee: ['Android', 'iPhone', 'Windows', 'macOS', 'YouTube', 'Instagram', 'TikTok', 'Telegram', 'WhatsApp', 'Oýunlar'],
    features: {
      eyebrow: 'Artykmaçlyklar',
      title: 'Näme üçin AS VPN?',
      subtitle: 'Ýönekeý, ynamdar we hemmeler üçin elýeterli.',
      items: [
        { icon: 'bolt', title: 'Ýokary tizlik', text: 'Wideo, oýun we sosial ulgamlar üçin çalt we durnukly baglanyşyk.' },
        { icon: 'shield', title: 'Doly howpsuzlyk', text: 'Maglumatlaryňyz şifrlenýär — hiç kim siziň näme edýäniňizi görüp bilmeýär.' },
        { icon: 'phone', title: 'Ähli enjamlarda', text: 'Android, iPhone, Windows we macOS enjamlarynda işleýär.' },
        { icon: 'chat', title: 'Goldaw hyzmaty', text: 'Sorag ýüze çyksa, birikdirmekde we sazlamakda size kömek ederis.' },
      ],
    },
    plans: {
      eyebrow: 'Bahalar',
      title: 'Tarifler',
      subtitle: 'Näçe adam ulanjak bolsaňyz, şoňa görä tarif saýlaň.',
      badge: '★ Iň amatly',
      button: 'Satyn al',
      currency: 'TMT',
      message: 'Salam! Men AS VPN tarifini satyn almak isleýärin:',
      extras: ['Ähli enjamlarda işleýär', 'Birikdirmekde kömek'],
    },
    steps: {
      eyebrow: 'Ädimler',
      title: 'Nädip birikmeli?',
      subtitle: 'Dört ädimde VPN-i ulanyp başlaň.',
      items: [
        { title: 'Tarif saýlaň', text: 'Size we maşgalaňyza laýyk tarifi saýlaň.' },
        { title: 'Bize ýazyň', text: 'Telegram ýa-da Gmail arkaly bize ýazyň.' },
        { title: 'Töleg ediň', text: 'Tölegden soň size birikmek üçin açar iberilýär.' },
        { title: 'Birikdiriň', text: 'Açary programma goşuň we ulanyp başlaň.' },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Köp soralýan soraglar',
      items: [
        { q: 'Bir hasaby birnäçe adam ulanyp bilermi?', a: 'Hawa. Saýlan tarifiňize görä 1-den 5 adama çenli bir wagtda ulanyp biler.' },
        { q: 'Trafik limiti gutarsa näme bolýar?', a: 'Limit gutaranda täze tarif satyn alyp, VPN-i ulanmagy dowam etdirip bilersiňiz.' },
        { q: 'Haýsy enjamlarda işleýär?', a: 'Android, iPhone (iOS), Windows we macOS enjamlarynda işleýär. Birikdirmekde kömek ederis.' },
        { q: 'Nädip töleg edip bilerin?', a: 'Töleg usullary barada Telegram ýa-da Gmail arkaly habarlaşyň.' },
      ],
    },
    cta: {
      title: 'Häzir birikmäge taýýarmy?',
      text: 'Bize ýazyň — birnäçe minutda VPN-iňiz işläp başlar.',
    },
    footer: {
      copyright: 'AS VPN. Ähli hukuklar goralan.',
    },
  },
  ru: {
    hero: {
      badge: 'Серверы работают',
      title1: 'Ваш интернет',
      highlight: 'безопасный,',
      title2: 'быстрый и свободный',
      lead: 'С AS VPN заходите на любые сайты и в приложения без ограничений. Пользуйтесь одним аккаунтом вместе с семьёй или друзьями — до 5 человек.',
      ctaPrimary: 'Смотреть тарифы',
      ctaSecondary: 'Написать в Telegram',
      chip1: 'Зашифровано',
      chip2: 'Быстро',
    },
    marquee: ['Android', 'iPhone', 'Windows', 'macOS', 'YouTube', 'Instagram', 'TikTok', 'Telegram', 'WhatsApp', 'Игры'],
    features: {
      eyebrow: 'Преимущества',
      title: 'Почему AS VPN?',
      subtitle: 'Просто, надёжно и доступно каждому.',
      items: [
        { icon: 'bolt', title: 'Высокая скорость', text: 'Быстрое и стабильное соединение для видео, игр и соцсетей.' },
        { icon: 'shield', title: 'Полная безопасность', text: 'Ваши данные зашифрованы — никто не видит, что вы делаете в сети.' },
        { icon: 'phone', title: 'На всех устройствах', text: 'Работает на Android, iPhone, Windows и macOS.' },
        { icon: 'chat', title: 'Поддержка', text: 'Если возникнут вопросы, поможем с подключением и настройкой.' },
      ],
    },
    plans: {
      eyebrow: 'Цены',
      title: 'Тарифы',
      subtitle: 'Выберите тариф в зависимости от количества пользователей.',
      badge: '★ Самый выгодный',
      button: 'Купить',
      currency: 'TMT',
      message: 'Здравствуйте! Хочу купить тариф AS VPN:',
      extras: ['Работает на всех устройствах', 'Помощь с подключением'],
    },
    steps: {
      eyebrow: 'Шаги',
      title: 'Как подключиться?',
      subtitle: 'Начните пользоваться VPN за четыре шага.',
      items: [
        { title: 'Выберите тариф', text: 'Выберите подходящий тариф для себя и своей семьи.' },
        { title: 'Напишите нам', text: 'Напишите нам в Telegram или на Gmail.' },
        { title: 'Оплатите', text: 'После оплаты мы отправим вам ключ для подключения.' },
        { title: 'Подключитесь', text: 'Добавьте ключ в приложение и начните пользоваться.' },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Частые вопросы',
      items: [
        { q: 'Могут ли несколько человек пользоваться одним аккаунтом?', a: 'Да. В зависимости от тарифа одновременно могут пользоваться от 1 до 5 человек.' },
        { q: 'Что будет, если трафик закончится?', a: 'Когда лимит закончится, вы можете купить новый тариф и продолжить пользоваться VPN.' },
        { q: 'На каких устройствах работает?', a: 'На Android, iPhone (iOS), Windows и macOS. Поможем с подключением.' },
        { q: 'Как можно оплатить?', a: 'По способам оплаты свяжитесь с нами в Telegram или по Gmail.' },
      ],
    },
    cta: {
      title: 'Готовы подключиться?',
      text: 'Напишите нам — VPN заработает через несколько минут.',
    },
    footer: {
      copyright: 'AS VPN. Все права защищены.',
    },
  },
}

export const TELEGRAM_RE = /^[A-Za-z0-9_]{3,32}$/
export const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/
export const PHONE_RE = /^\+?[0-9][0-9\s\-()]{4,22}$/
export const URL_RE = /^https?:\/\/[^\s<>"']{3,300}$/

// Gelen maglumatlary başlangyç gurluşa görä arassalaýar: artykmaç meýdanlar taşlanýar,
// görnüşler (tekst/san/bool/sanaw) barlanýar, uzynlyklar çäklendirilýär.
export function sanitize(template, value) {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return structuredClone(template)
    const itemT = template[0]
    return value.slice(0, 50).map((v) => sanitize(itemT, v))
  }
  if (template && typeof template === 'object') {
    const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const out = {}
    for (const k of Object.keys(template)) {
      out[k] = k in src ? sanitize(template[k], src[k]) : structuredClone(template[k])
    }
    return out
  }
  if (typeof template === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 1e7) : template
  }
  if (typeof template === 'boolean') return value === true
  if (typeof value === 'string' || typeof value === 'number') return String(value).slice(0, 3000)
  return template
}

// Köne (bir dilli) gurluşy täze gurluşa geçirýär
function migrate(input) {
  if (input && typeof input === 'object' && !input.tk && input.hero) {
    return { contact: input.contact, planItems: input.plans?.items, tk: input, ru: defaultContent.ru }
  }
  return input
}

export function normalizeContent(input) {
  const c = sanitize(defaultContent, migrate(input))
  c.contact.telegram = c.contact.telegram.trim().replace(/^@/, '')
  c.contact.email = c.contact.email.trim()
  if (!TELEGRAM_RE.test(c.contact.telegram)) c.contact.telegram = defaultContent.contact.telegram
  if (!EMAIL_RE.test(c.contact.email)) c.contact.email = defaultContent.contact.email
  for (const k of ['phone', 'imo', 'link', 'linkLabel']) c.contact[k] = c.contact[k].trim()
  if (c.contact.phone && !PHONE_RE.test(c.contact.phone)) c.contact.phone = ''
  if (c.contact.imo && !PHONE_RE.test(c.contact.imo)) c.contact.imo = ''
  if (c.contact.link && !URL_RE.test(c.contact.link)) c.contact.link = ''
  c.contact.linkLabel = c.contact.linkLabel.slice(0, 60)
  for (const l of LANGS) for (const f of c[l].features.items) if (!ICONS[f.icon]) f.icon = 'bolt'
  return c
}
