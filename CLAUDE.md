# CLAUDE.md - Shopping List App

## Project Overview

Swedish grocery shopping list web app ("Smart inköpslista för svenska matvarubutiker"). Single-page React application with Firebase backend, deployed to GitHub Pages. All UI text is in Swedish.

**Live URL:** https://christianbjornegren-prog.github.io/Shopping

## Tech Stack

- **Framework:** React 18.2 (JSX, hooks-based)
- **Build tool:** Vite 7.3
- **Styling:** Tailwind CSS 3.3 (utility-first, dark theme)
- **Icons:** Lucide React
- **Backend:** Firebase (Firestore for data, Authentication for Google OAuth)
- **Deployment:** GitHub Pages via `gh-pages` package
- **Language:** JavaScript (no TypeScript)

## Commands

```bash
npm run dev        # Start dev server (localhost:5173/Shopping/)
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
npm run deploy     # Build + deploy to GitHub Pages
```

## Project Structure

```
Shopping/
├── src/
│   ├── App.jsx          # Main (and only) component - contains all app logic
│   ├── main.jsx         # React entry point, renders <App /> into #root
│   ├── firebase.js      # Firebase init, exports auth, googleProvider, db
│   └── index.css        # Tailwind directives + custom styles
├── dist/                # Build output (committed for GitHub Pages)
├── index.html           # SPA entry point (lang="sv")
├── vite.config.js       # Vite config (base: '/Shopping/')
├── tailwind.config.js   # Tailwind config (default theme)
├── postcss.config.js    # PostCSS with Tailwind + Autoprefixer
└── package.json         # Dependencies and scripts
```

## Architecture

### Single-component SPA

All application logic lives in `src/App.jsx` (~865 lines) as a single `ShoppingListApp` component. There is no component decomposition, no router, no state management library — just React hooks (`useState`, `useEffect`).

### Data flow

1. **Authentication:** Firebase Google OAuth via `signInWithPopup`. Auth state tracked via `onAuthStateChanged` listener.
2. **Persistence:** Active shopping list syncs to Firestore at `users/{userId}/lists/active`. The list is loaded once on login and saved on every state change via `useEffect`.
3. **Local state:** Archived lists and user product history are in-memory only (not persisted to Firestore).

### Firestore document structure

```
users/{userId}/lists/active
  ├── id: number (timestamp)
  ├── status: 'prep' | 'shopping'
  ├── items: Array<{ id, name, quantity, category, checked, addedBy, addedAt }>
  ├── createdAt: ISO string
  ├── startedShoppingAt: ISO string | null
  └── updatedAt: ISO string
```

### Shopping list lifecycle

1. **Prep mode** — User adds items to the list. Items can be searched, added, deleted.
2. **Shopping mode** — User checks off items while shopping. Checked items are hidden.
3. **Complete** — List is archived (client-side only) and a new empty list is created.

### Smart product categorization

`groceryDB` (168 items) provides a static Swedish grocery database. Each entry has `name`, `category`, `aliases` (alternate spellings/plurals), and `keywords`. Product matching uses a 4-level strategy:

1. Exact name match (accent-normalized)
2. Alias match
3. Partial/substring match
4. Keyword match

The `normalize()` function handles Swedish characters (å, ä, ö) via NFD decomposition.

### Categories (in display order)

Frukt & Grönt, Mejeri, Kött & Fisk, Skafferi, Bröd & Bakelser, Fryst, Dryck, Godis & Snacks, Hushåll, Övrigt

## Environment Variables

Firebase config is loaded via Vite env vars. Create a `.env.local` file:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

These files are gitignored: `.env.development`, `.env.production`, `.env.local`

## Code Conventions

- **No linter or formatter configured** — no ESLint, no Prettier
- **No tests** — no test framework or test files exist
- **No TypeScript** — plain JavaScript with JSX
- **Tailwind for all styling** — no CSS modules, no styled-components
- **Dark theme throughout** — gray-900 background, gray-800 cards, green-500/600 accents
- **Swedish UI text** — all user-facing strings are in Swedish
- **Inconsistent indentation** — some sections use 2-space indent, some use no indent (e.g., Firestore useEffect blocks at lines 219 and 243 in App.jsx are not indented within the component)
- **Icons** — use Lucide React icon components (Search, Plus, Check, Trash2, UserPlus, ShoppingCart, X, Archive, Clock, LogOut)

## Key Patterns to Follow

- When adding grocery items to `groceryDB`, include `name` (Swedish, capitalized), `category` (from the fixed list), `aliases` (array of alternate forms), and `keywords` (array of search terms)
- Use the `normalize()` function for any text comparison involving Swedish characters
- Maintain the dark theme color scheme: `bg-gray-900` (page), `bg-gray-800` (cards), `bg-gray-700` (inputs), `text-green-500` (accents), `bg-green-600` (primary buttons)
- State updates use functional form: `setActiveList(prev => ({ ...prev, ... }))`
- The Vite `base` path is `/Shopping/` — this is required for GitHub Pages deployment

## Known Limitations

- `dist/` folder appears to be committed — production builds are in the repo
- Invite functionality is stubbed out (shows alert, not implemented)
- Archived lists and user product history are not persisted to Firestore
- The entire app is a single component — no decomposition into smaller components
- No error boundaries or loading states for Firestore operations
- `onKeyPress` is used instead of `onKeyDown` (deprecated in React)
