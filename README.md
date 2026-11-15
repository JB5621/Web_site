# AS VPN saýty

## Işletmek (serwerde)

```bash
npm install
npm run build
npm start
```

- Saýt: `http://localhost:3000`
- Admin panel: `http://localhost:3000/asvpn`
- Başlangyç giriş: **admin / admin**. Hakyky serwerde paroly hökman üýtgediň:

```bash
ADMIN_USER=admin ADMIN_PASS='güýçli-parol' PORT=3000 npm start
```

nginx ýaly proksi yzynda işledilse, `TRUST_PROXY=1` goşuň (sargytlarda dogry IP görkezilýär).

## Täze sargyt bildirişi — ntfy (BotFather-siz)

Müşderi "Satyn al" basanda telefonyňyza bildiriş gelýär. Hasap açmak gerek däl.

1. Telefona **ntfy** programmasyny gurnaň (Google Play / App Store / F-Droid).
2. Uzyn, kyn tapylýan **topic** ady oýlap tapyň (mysal: `asvpn-k7Qm29xLp4Tz`). Bu ady bilýän islendik adam bildirişleri okap biler, şonuň üçin ony gizlin saklaň.
   Tötänleýin at almak: `node -e "console.log('asvpn-' + require('crypto').randomBytes(9).toString('base64url'))"`
3. Programmada **+** → şol topic adyna ýazylyň.
4. Serweri şeýle işlediň:

```bash
NTFY_TOPIC='asvpn-k7Qm29xLp4Tz' ADMIN_PASS='güýçli-parol' npm start
```

Serwer açylanda konsolda `ntfy bildirişi: açyk` ýazylmaly. Bildirişler `ntfy.sh` serweriniň üsti bilen geçýär. Öz ntfy serweriňiz bar bolsa, `NTFY_SERVER=https://...` goşuň.

## Täze sargyt bildirişi (Telegram)

Müşderi "Satyn al" basanda telefonyňyza Telegram habary gelýär.

1. Telegramda [@BotFather](https://t.me/BotFather) → `/newbot` → bot dörediň we **token** alyň.
2. Öz botuňyza islendik habar ýazyň (mysal: `/start`).
3. Brauzerde açyň: `https://api.telegram.org/bot<TOKEN>/getUpdates` — jogapdaky `"chat":{"id": ...}` sizin **chat ID**.
4. Bulary taslamanyň kökündäki `.env` faýlyna ýazyň (`TG_BOT_TOKEN=...`, `TG_CHAT_ID=...`) — serwer ony özi okaýar, faýl git-e düşmeýär. Ýa-da buýrukda beriň:

```bash
TG_BOT_TOKEN='123456:ABC...' TG_CHAT_ID='123456789' ADMIN_PASS='güýçli-parol' npm start
```

Serwer açylanda konsolda `Telegram bildirişi: açyk` ýazylmaly.

## Ösdürmek (lokal)

Iki terminal açyň:

```bash
npm start      # API serweri (3000 port)
npm run dev    # Vite, /api soraglary 3000-e iberilýär
```

## Maglumatlar

- Admin panelde üýtgedilen mazmun: `server/data/content.json`
- Sargytlar: `server/data/orders.json`
- Başlangyç mazmun: `src/content.js`

`server/data/` papkasynyň ätiýaçlyk nusgasyny wagtal-wagtal alyň.
