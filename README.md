# Smart inköpslista

En svensk inköpslisteapp för matvarubutiker, byggd med React och Firebase.

**Live:** https://christianbjornegren-prog.github.io/Shopping/

## Funktioner

- **Google-inloggning** — logga in med ditt Google-konto
- **Autocomplete** — sök bland 168 svenska produkter med smarta matchningar
- **Smart kategorisering** — varor sorteras automatiskt i kategorier (Frukt & Grönt, Mejeri, Kött & Fisk m.fl.)
- **Shopping-läge** — bocka av varor under handlingen
- **Historik** — se tidigare genomförda listor

## Kom igång

```bash
npm install
npm run dev
```

Appen körs på http://localhost:5173/Shopping/

Kräver en `.env.local` med Firebase-konfiguration (se [CLAUDE.md](CLAUDE.md) för detaljer).

## Driftsättning

```bash
npm run deploy
```

Bygger och publicerar till GitHub Pages.

## Teknisk dokumentation

Se [CLAUDE.md](CLAUDE.md) för arkitektur, kodkonventioner och projektstruktur.
