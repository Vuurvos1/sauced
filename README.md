<p align="center">
  <img width="120" height="120" src="apps/site/static/favicon.svg" alt="Logo">
</p>

<h1 align="center"><b>Sauced</b></h1>
<p align="center">A hot sauce rating app.</p>

<p align="center">
  <img src="assets/site-preview.png" alt="Sauced Site Preview" width="100%" style="max-width: 1024px">
</p>

## Getting Started

Requires Node 24+ and pnpm (the version is pinned in `package.json`).

Install dependencies:

```bash
pnpm i
```

Copy each `.env.example` to `.env` and set the environment variables:

```bash
cp apps/site/.env.example apps/site/.env
cp packages/db/.env.example packages/db/.env
cp packages/scraper/.env.example packages/scraper/.env
```

The site needs at least `DATABASE_URL` and `BETTER_AUTH_SECRET` (generate one with
`openssl rand -base64 32`). Environment variables are declared in
[`apps/site/src/env.ts`](./apps/site/src/env.ts); add new ones there or they won't be
available to the app.

## Development

Start the databases using [Docker](https://www.docker.com/) with the following command.
This starts the dev database on port 5433 and the test database on port 5434:

```bash
pnpm docker:up
```

Apply the database migrations:

```bash
pnpm db migrate
```

See the [db README](./packages/db/README.md) for details on generating new migrations after schema changes.

Seed the database by running a scraper with the following command.
More information about scrapers can be found in the [scrapers README](./packages/scraper/README.md).

```bash
pnpm scrapers scrape <scraper-name>
```

Start the site with the following command:

```bash
pnpm site dev
```

## Testing

Unit tests use [Vitest](https://vitest.dev/):

```bash
pnpm site test:unit
pnpm scrapers test
```

End-to-end tests use [Playwright](https://playwright.dev/) against the test database. They
read `apps/site/.env.test`, which is committed and already points at it. The command
starts the test database, applies the migrations and seeds a test user and sauce:

```bash
pnpm --filter @app/site exec playwright install chromium # first run only
pnpm site test:integration
```

Type-check, lint and format:

```bash
pnpm site check
pnpm lint
pnpm format
```
