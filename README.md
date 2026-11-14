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
