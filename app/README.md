# Password Manager

Vue + Vite frontend with an Express + PostgreSQL API for storing credentials.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

Copy `.env.example` to `.env` and update values.

Set in `.env`:
- `DATABASE_URL` to your PostgreSQL connection string
- `CREDENTIALS_ENCRYPTION_KEY` to a base64-encoded 32-byte key

Generate a key with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

### Run Frontend + API in Development

```sh
npm run dev:full
```

This starts:
- Vite frontend on `http://localhost:5173`
- API server on `http://localhost:3001`

### Frontend Only (Optional)

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Start Production Server

```sh
npm run start
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Railway Deployment

1. Create a Railway project and add a PostgreSQL service.
2. In your app service variables, set:
  - `DATABASE_URL` (use Railway Postgres reference variable)
  - `CREDENTIALS_ENCRYPTION_KEY` (generate once and keep it stable)
  - `NODE_ENV=production`
3. Railway commands:
  - Build command: `npm run build`
  - Start command: `npm run start`

When deployed, the Express server serves both the API (`/api/*`) and the built frontend (`dist/`).
