# DocGuard AI frontend

This React and Vite app calls the backend API for repository ingestion, PDF
uploads, repository analysis, pull request analysis, and backend health.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- The DocGuard backend on port 3000, unless the proxy target is changed

## Local development

Start the backend from the repository root in a separate terminal:

```sh
export OLLAMA_MODEL='your-installed-model'
npm start
```

The backend does not load `.env` files automatically. Configure Ollama in the
backend process. Then start the frontend from this directory:

```sh
npm ci
cp .env.example .env
npm run dev
```

Vite defaults to `http://localhost:5173`. The frontend uses the same-origin
`/api` path, and Vite proxies those requests to `http://127.0.0.1:3000` during
development. Set `DOCGUARD_API_PROXY_TARGET` before starting Vite if the backend
uses another address. For a separately hosted production API, set
`VITE_API_URL` at build time and configure the backend's
`CORS_ALLOWED_ORIGINS` allowlist.

The **Repositories** page analyzes the current repository snapshot; its model
output is labeled as unverified suggestions. The **Check a pull request** page
compares changed source with documentation at the PR head revision. It shows
deterministic findings separately from unverified model suggestions and lists
files that could not be analyzed.

## Validation

```sh
npm run lint
npm run build
```
