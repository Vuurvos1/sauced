# Scrapers

Every store in `stores.js` serves its whole catalogue as JSON, so a store is
configuration rather than code. Two adapters cover both platforms:

| Adapter               | Platform    | Endpoint                        | Page size |
| --------------------- | ----------- | ------------------------------- | --------- |
| `adapters/shopify.js` | Shopify     | `/products.json`                | 250       |
| `adapters/woo.js`     | WooCommerce | `/wp-json/wc/store/v1/products` | 100       |

Both are built on `adapters/catalogue.js`, which handles pagination, caching and
the request delay. One request returns a whole page of products, so the catalogue
is read during `getSauceUrls` and `scrapeSauce` is a lookup — the `SauceScraper`
interface is unchanged, but a 900-product store costs ~4 requests instead of 900.

## Running a scraper

```bash
pnpm scrapers scrape trex

# every store in stores.js, in one run
pnpm scrapers scrape all

# example with flags
pnpm scrapers scrape trex --noCache --dbInsert
```

`all` runs every store before it fails, so one broken adapter does not hide the
state of the others; it exits non-zero listing whichever stores failed.

### Flags

- `--noCache`: Re-fetch all products
- `--dbInsert`: Insert the products into the database
- `--dev`: Limit to 12 random products

## Adding a store

Check which platform it runs on:

```bash
curl -sL "https://example.com/products.json?limit=1"                  # Shopify
curl -sL "https://example.com/wp-json/wc/store/v1/products?per_page=1" # WooCommerce
```

Then add an entry to the matching array in `stores.js`:

```js
{
  key: 'examplestore',        // CLI name and cache directory
  name: 'Example Store',      // must stay stable, `stores.name` is upserted on
  url: 'https://example.com'
}
```

### Options

| Option              | Applies to | Purpose                                                                         |
| ------------------- | ---------- | ------------------------------------------------------------------------------- |
| `description`       | both       | Store blurb shown on the site                                                   |
| `exclude`           | both       | Extra name patterns to skip, on top of the bundle filter                        |
| `houseBrand`        | both       | Maker to use when the feed reports none. Defaults to `name`                     |
| `stripFromName`     | both       | Removes a brand suffix baked into the product title                             |
| `maxPages`          | both       | Page cap. Default 40                                                            |
| `requestDelayMs`    | both       | Pause after each live request. Default 500                                      |
| `collection`        | Shopify    | Collection handle, to narrow a general store to its sauces                      |
| `excludeVendors`    | Shopify    | Drop vendors that aren't sauce, e.g. snacks or kitchenware                      |
| `includeCategories` | Woo        | Category slugs to keep                                                          |
| `brandTaxonomy`     | Woo        | Attribute holding the brand, e.g. `pa_merk-hot-sauce`. Auto-detected when unset |

Bundles, gift sets, subscriptions and merch are filtered for every store by
`utils/filter.js`. Anything more specific — a shop that also sells chutney or
chocolate — belongs in that store's `exclude` or `includeCategories`.

## Caching

Responses are cached under `./cache/<key>/`, keyed by request URL. Cached runs do
not sleep between pages, so re-running against the cache is instant. `--noCache`
clears the store's directory first.

## Testing

```bash
pnpm --filter @app/scraper test
```

The adapter tests seed the cache with fixtures, so they never hit the network.

## TODO

- [ ] Populate the `makers` table from the `maker` each adapter returns
- [ ] Stores that need bespoke scrapers: BigCommerce, JTL, Shopware, Gambio, Wix
