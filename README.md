# Ausbildung Motivation Letters

Full-stack application that scrapes Ausbildung job listings, generates tailored motivation letters with Google Gemini, and provides a React dashboard. The project now ships as a single deployable server: Express serves the REST API _and_ the pre-built React app.

## Project layout

```
backend/  # Express + Prisma API, Puppeteer scraper, static hosting for the built frontend
front/    # Vite + React UI source code
```

Runtime artefacts (`backend/public`, upload caches, logs, etc.) are now ignored from source control. Fresh deployments are ready to run on empty directories.

## Environment variables

Copy `backend/.env.example` to `backend/.env` and set the values that apply to your deployment:

- `DATABASE_URL` – SQLite connection string (defaults to `file:./dev.db`).
- `PORT` / `HOST` – network binding for the API server.
- `CLIENT_ORIGIN` – comma separated list of allowed browser origins (defaults to `http://localhost:5173,http://localhost:8080`).
- `GEMINI_API_KEY`, `GEMINI_MODEL` – Google Gemini access for letter generation.
- `JWT_SECRET` – secret used to sign authentication tokens.
- Optional SMTP values if you plan to send emails directly from the server.

> When running on a platform such as Render, Railway, Fly.io, etc. configure these variables in the provider dashboard instead of committing a `.env` file.

## Local development

Install dependencies for both apps, then run the dev servers in parallel:

```bash
npm install
npm run dev
```

The Express API now runs on `http://localhost:8080` while the Vite dev server serves the UI on `http://localhost:5173` and proxies any `/api/*` requests to Express.

### Deploying the frontend separately (e.g. Netlify)

If you deploy the React UI on a static host, run the Netlify-specific build so assets land in `front/dist`:

```bash
npm --prefix front run build:netlify
```

The build script sets `BUILD_TARGET=netlify`, which makes Vite emit the bundle into `front/dist` while keeping the default behaviour (building into `backend/public`) for single-server deployments.

## Production build & single-server hosting

1. Build the React frontend straight into `backend/public`:
   ```bash
   npm run build
   ```
2. Start the Express server (which now serves the static build):
   ```bash
   npm start
   ```

During deployment you can use `npm run start:prod` to bundle these two steps in a single command.

## What changed in this refactor

- Removed large binary artefacts (generated PDFs, uploaded CVs, logs, temporary files) from the repository and replaced them with clean, empty directories.
- Standardised on npm with a root-level `package.json`, shared scripts, and a `concurrently` powered `npm run dev` workflow.
- Added Vite build output targeting `backend/public`, allowing Express to serve the compiled UI without a separate frontend host.
- Introduced environment management via `backend/.env.example` and tightened `.gitignore` so secrets and runtime files stay out of version control.
- Added static asset fallbacks and configurable CORS in `app.js`, plus dynamic host/port binding for deployment flexibility.

With these changes the project is ready to deploy as a single Node.js application while keeping the working tree slim and production friendly.
