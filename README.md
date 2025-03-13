<p align="center">
  <img width="120" height="120" src="apps/site/static/favicon.svg" alt="Logo">
</p>

<h1 align="center"><b>Sauced</b></h1>
<p align="center">A hot sauce rating app.</p>

<p align="center">
  <img src="assets/site-preview.png" alt="Sauced Site Preview" width="100%" style="max-width: 1024px">
</p>

## Getting Started

Install dependencies:

```bash
pnpm i
```

Copy the `.env.example` files to `.env` and set the environment variables:

```bash
cp .env.example .env
```

## Development

Start the database using [Docker](https://www.docker.com/) with the following command:

```bash
pnpm docker:up
```

Run the scraper with the following command:
More information about scrapers can be found in the [scrapers README](./packages/scraper/README.md).

```bash
pnpm scrapers scrape <scraper-name>
```

Start the site with the following command:

```bash
pnpm site dev
```
