# TODO

Grouped by urgency: **Bugs** are wrong today, **Now** unblocks other work,
**Next** is the meaningful feature backlog, **Someday** is parked.

---

## Bugs

- [ ] **`created_at` is rewritten on every update.** `hotSauces.createdAt` has a
      `.$onUpdate()` (`packages/db/schema/sauce.js:51-54`). Every scraper run touches
      existing rows, so "newest first" on `/` and `/sauces` is really "most recently
      scraped". Drop `$onUpdate` from `createdAt`.
- [x] **Missing profiles return 500 instead of 404.** `error(404)` is thrown inside a
      `try` whose `catch` swallows it and re-throws `error(500)`
      (`apps/site/src/routes/profile/[slug]/+page.server.ts:16-77`).
- [ ] **Flagged reviews stay flagged forever.** The review upsert's
      `onConflictDoUpdate` sets `review`/`rating` but not `flagged`
      (`apps/site/src/routes/sauces/[slug]/+page.server.ts:153-160`), so the freshly
      computed value is discarded on edit.
- [ ] **Store URLs use raw names.** `/stores/${store.name}` is unencoded
      (`Header.svelte:108`) and the lookup matches on `stores.name`. Any store with a
      space, `&` or `/` breaks. Add a `slug` column like `hotSauces` has.
- [ ] **Unvalidated IDs reach Postgres.** `data.get('id')` goes straight into a `uuid`
      comparison in the review / wishlist / removeCheckIn actions; a malformed value is
      a driver throw, not a 400.
- [x] **Failed sauce writes are swallowed and the run still exits 0.** The update is
      wrapped in a `try`/`catch` that only logs (`packages/scraper/index.js:105`). A
      full 27-store run lost 5 sauces to `hot_sauces_slug_unique` and still exited 0,
      so CI goes green while dropping data.
- [x] **A scraper that finds nothing also exits 0.** Nothing asserts a non-empty
      result, which is how heatsupply and heatonist sat broken behind a green
      pipeline. Fail the run, or at least the store, on 0 sauces.
- [x] **288 slugs end in a stray hyphen** (6.7%). `slugifyName` strips emoji but
      leaves the separator that became one: `Melinda's - Black Truffle Hot Sauce 🍯`
      → `melindas-black-truffle-hot-sauce-`. Trim leading/trailing hyphens.
- [x] **`Deduped N` logs the wrong number.** `packages/scraper/index.js:63` prints
      `data.length - existingSauces.length`, which is the count of _new_ sauces. For
      heathotsauce it read "Deduped 773" when 43 were deduped.
- [ ] **`url` columns are `varchar(256)`.** Shopify product URLs with query params
      exceed this and the scraper insert throws. Use `text`.

---

## Now

### Generic scraper adapters (unblocks every store below)

Every candidate store runs on **Shopify** or **WooCommerce**, and both expose a public
JSON product API. No HTML parsing is needed for any of them.

Shipped in #28. 27 stores registered, all verified live: 5424 products, no failures.

- [x] Write `shopifyScraper(config)` — reads `/products.json?limit=250&page=N`.
- [x] Write `wooScraper(config)` — reads `/wp-json/wc/store/v1/products?per_page=100`.
- [x] Reduce `scrapers.js` to a config list (`stores.js`, 16 Shopify + 11 Woo).
- [x] Port `heatsupply` to the Woo adapter — the HTML scraper had been returning 0
      since its category URL started 404ing.
- [x] Revive the `chilisausbe` stub — 124 products via the Woo adapter.
- [x] Add a category/keyword filter (`utils/filter.js`) — but see **Catalogue data
      quality** below, it is English-only and ~600 non-sauce rows still get through.
- [x] Add pagination limits + a politeness delay, and keep the existing cache layer.
- [x] `scrape all` runs every store; CI drives it from the registry.

### CI

- [ ] **No CI runs lint, `svelte-check`, build or tests** — only `migrate.yml` and
      `scrape.yml` exist. A PR workflow running `turbo lint build` + vitest + Playwright
      is the single highest-value addition to this repo.
- [ ] Replace the `1 + 2 === 3` placeholder in `src/index.test.ts`. Real unit targets:
      `lib/server/search.ts`, `lib/validation`, `utils/name.ts`, `scraper/utils/format.js`.
- [ ] Playwright covers login only — add review submission, wishlist toggle, search and
      pagination.
- [ ] Wire `lint` / `test` turbo tasks for `packages/db` and `packages/scraper`.

---

## Stores

Confirmed live, with platform and catalogue size measured directly.

### Shopify — `/products.json`

| Store                         | Region | Products | Status             |
| ----------------------------- | ------ | -------- | ------------------ |
| t-rexhotsauce.com             | NL     | 5        | done               |
| scovello.nl                   | NL     | 93       | disabled (NL copy) |
| sausmetpit.nl                 | NL     | 60       | disabled (NL copy) |
| shop.raijmakersheetmakers.com | NL     | 7        | disabled (NL copy) |
| redhotfoods.de                | DE     | 170      |                    |
| heathotsauce.com              | US     | 898      |                    |
| pepperpalace.com              | US     | 201      |                    |
| torchbearersauces.com         | US     | 164      |                    |
| somelikeithot.shop            | UK     | 414      |                    |
| southdevonchillifarm.co.uk    | UK     | 421      |                    |
| onestopchillishop.com         | UK     | 291      |                    |
| condimaniac.com               | UK     | 89       |                    |
| sauceshop.co                  | UK     | 59       |                    |
| pipshotsauce.co.uk            | UK     | 18       |                    |
| sweetpepper.fr                | FR     | 409      | disabled           |

### WooCommerce — `/wp-json/wc/store/v1/products`

| Store                  | Region | Products | Status                        |
| ---------------------- | ------ | -------- | ----------------------------- |
| heatsupply.nl          | NL     | 360      | done (HTML — port to adapter) |
| chilisaus.be           | BE     | 130      | stub — revive                 |
| dekkerpepper.nl        | NL     | 81       | disabled (NL copy)            |
| chardys.nl             | NL     | 12       | also a maker                  |
| hotta.eu               | EU     | 25       |                               |
| hotsauceemporium.co.uk | UK     | 906      |                               |
| flowercityflavor.com   | US     | 524      | disabled (images 403)         |
| hotsaucedepot.com      | US     | 122      |                               |
| justchillies.co.uk     | UK     | 74       | Wiltshire Chilli Farm         |
| shop.chilirezept.de    | DE     | 117      | disabled (DE copy)            |
| maisonpiquante.com     | FR     | 295      | disabled                      |

### Needs bespoke work — lower priority

- [ ] hotsauce.com (US) and hotsauceplanet.com (US) — BigCommerce, no open JSON API.
- [ ] chili-saucen.com, pfefferhaus.de (DE) — JTL Shop.
- [ ] die-chili-manufaktur.de, chili-shop24.de (DE) — Shopware.
- [ ] mexicantears.de (DE) — Gambio.
- [ ] schaerfegradmanufaktur.de (DE), lazyscientistsauces.co.uk (UK) — Wix / Ecwid.
- [ ] pepperworldhotshop.com (403), sauce-piquante.fr (426), crazybastard.de,
      fireland-foods.de — blocked or unreachable from CI; re-check later.

### Unverified — from the original list

- [ ] De Vergulde Tong — no live shop found, needs a URL.
- [ ] Antillean Coast — no live shop found, needs a URL.
- [ ] Spice It Up — no live shop found, needs a URL.
- [ ] hotrot-hotsauces — no live shop found, needs a URL.
- [ ] heatawards.eu — an awards site, not a shop. Better modelled as an
      "award winner" flag on sauces than as a scraper.

---

## Makers / brands

`packages/scraper/makers.js` still holds a hand-written list of 4 that nothing
imports — dead, and safe to delete. The registry is derived from the feeds now.

- [x] Populate `makers` from the scrape. Shopify gives `vendor` per product;
      Heatsupply's Woo exposes a `pa_merk-hot-sauce` attribute with 34 brands.
      **405 canonical makers** over the 25 enabled stores, built in one pass in
      `dedup.js` before anything is resolved.
- [x] Set `makerId` on `hotSauces` during insert.
- [x] **Normalise brand names on ingest** — `canonicalMakerName` folds the trade,
      corporate and possessive suffixes, so `Heartbeat Hot Sauce Co.`,
      `Queen Majesty Hot Sauce`, `TorchBearer`, `Mic's Chilli Sauce`,
      `Clark + Hopkins`, `Marie Sharp's` and `White Whale Sauces` all land on their
      short form. 454 raw brand strings fold to 405.
      Not folded, because an extra word sits before the suffix: `Bravado` /
      `Bravado Spice Co.`, `Seed Ranch` / `Seed Ranch Flavor Co.`, `Secret Aardvark`
      / `Secret Aardvark Trading Co`, `Pepper North` / `Pepper North Artisan Foods`,
      `Butterfly Bakery` / `Butterfly Bakery of Vermont`, `Onima` / `Onima Pantry`.
      17 such pairs; a descriptor list would fix them and needs measuring first.
- [x] **Filter product noise by the shop's own category.** `isExcludedCategory`
      (`utils/filter.js`) reads Shopify's `product_type` and Woo's category slugs and
      names, splitting them into _form_ (gift, bundle, merch, freebie, catering —
      a sauce-sounding name cannot overrule these) and _type_ (snack, seasoning,
      jam, paste, pickle, chocolate, cheese — where a name saying "sauce" wins).
      This is what the names alone could never do: `OKTOBERFEST` is a seasoning,
      `GARLIC & CHIVE` is cheese, `CHIPOTLE & ORANGE` is chocolate. Per-store
      `excludeCategories` layers on top and overrides everything.
      WooCommerce also reports `type: bundle | grouped | subscription | gift-card`
      outright — 39 products, 3 of which no name pattern caught.
- [ ] **Filter vendor noise** — `Gift Set`, `Heat`, `Pepper Palace Warehouse`,
      `www.SomeLikeItHot.Shop` are not makers, and `Heinz` / `Hellmann's` / `Develey`
      are not hot sauce.
- [ ] Handle house brands (store == maker): Heatsupply, Scovello, Saus Met Pit,
      Red Hot Foods DE, One Stop Chilli Shop, Condimaniac.
- [ ] Shopify's default placeholder vendor (`Mijn winkel` on Raijmakers) must fall back
      to the store's house brand.
- [ ] Build `/makers/[slug]` and `/makers/[slug]/sauces` — both are currently stubs
      returning `{}`.
- [ ] `/api/v1/search` hardcodes `makers: []` despite the trigram index on
      `makers.name` already existing. Wire it up.

### Dutch / Belgian makers

Confirmed stocked on Heatsupply: **HotZeg** (3 products), El Jefe, Feroz, Fruitslagers,
Nondedju, Nomie, Piko Peppers, Raijmakers Heetmakers, White Whale, Wild Sauce Co,
Nick's Hatsas, Fil, Olfs Hot Spize. Plus **Chardy's Hot Stuff** (chardys.nl, also a
shop), Brussels Ketjep (BE), Ketjep, Chimac (BE), Dekker Pepper, La Lia.

### International makers seen across the feeds

Adoboloco, Angry Goat Pepper Co, American Stockyard, Arthur Wayne, Barnacle Foods,
Benito's, Big Red's, Black Mamba, Bourbon Country, Bravado Spice Co, Burns & McCoy,
Butterfly Bakery of Vermont, CaJohns, Calder's Kitchen, Char Man, Chile Lengua de Fuego,
Chilli Alchemist, Chilli Hills, Chilli Mash Company, Cholula, Clark & Hopkins,
Coleman's Pepper Farm, Coqhot, Crazy Bastard, Da Bomb, Dawson's, Devildog, Dirty Dick's,
Dorset Chilli Shop, Down To Ferment, El Chilerito, El Yucateco, Elijah's Xtreme, Fat Cat,
Formosa, Funky's, Ghost Scream, Golden West, Good Heat, Haffs, Halogi, Heartbeat,
Heartbreaking Dawns, Hell's Kitchen, Hellfire, Hellicious, High Desert Sauce Co,
High River Sauces, Hopt Sauce, Horseshoe Brand, Hot Ones, Hot Winter, Irazu, Jersey
Barnfire, J's Small Batch, Karma Sauce, Kinder's, La Pimenterie, La Sarita,
La Sauce Piqu'Hans, Loba Sauces, Lucky Dog, Mad Dog, Maison Martin, Maître Délice,
Marie Sharp's, Mark's, Marshall's Haute Sauce, Mastari, Me And My Hot Sauce, Melinda's,
Mikey V's, Old Bay, Pain Is Good, Pat & Pinky's, Paulman Acre, Pepper North, PexPeppers,
PuckerButt Pepper Co, Queen Majesty, Rascal Tastebuddies, Rising Smoke Sauceworks,
Roni B's Kitchen, Salsa Huichol, Sauce Leopard, Sauce Up NYC, Seafire Gourmet,
Secret Aardvark, Seed Ranch Flavor Co, Small Axe Peppers, Smokin' Dragon, Spicy Rye's,
Spicy Virgin, Stanky Sauce, Swedish Pepper, Tabasco, Tajín, Tamazula, Tapatio,
The Spicy Shark, Torchbearer, Trouble & Spice, TRUFF, Valentina, Volcanic Peppers,
Walker & Sons, Woolf's Kitchen, Yellowbird, Yo Mama's Foods.

---

## Catalogue data quality

**Done in the cleanup pass.** Full 27-store rescrape after the fixes:

|                                                      | before | after |
| ---------------------------------------------------- | ------ | ----- |
| sauces                                               | 4278   | 3254  |
| bundles left                                         | 77     | 0     |
| plants / seeds                                       | 249    | 0     |
| powders / rubs                                       | 182    | 0     |
| sizes in names                                       | 740    | 0     |
| promotional copy                                     | 67     | 4     |
| slugs with a stray hyphen                            | 288    | 0     |
| French descriptions with an English source available | 83     | 4     |
| shipping / fee SKUs                                  | 1      | 0     |

Then the makers pass, on top of that:

|                      | before | after |
| -------------------- | ------ | ----- |
| sauces               | 3254   | 2860  |
| makers               | 0      | 450   |
| sauces with no maker | 3254   | 0     |

Measured first, because the obvious design was wrong: bucketing dedup by maker
gives _3868_ distinct sauces against 3178 for plain name matching — worse, because
545 brand strings are only 450 real brands. Stripping the maker from the name and
keeping the comparison flat was the variant that won.

The 4 remaining promo names are deliberate: `F*ck, That's Delicious` and
`Bumblef**ked Hot Sauce` are real product names, and the patterns are
conservative enough to leave them alone.

Still open below.

Measured on the first full 27-store run: **4278 sauces, 5004 store links**. Roughly
**600 rows (14%) are not a single bottle of sauce**.

- [x] **Scope South Devon Chilli Farm to its `sauces` collection — one line, ~400
      rows of junk gone.** It is a chilli farm with a sauce line, not a sauce shop:
      28 collections including `chilli-seeds`, `plants-seedlings`,
      `growing-equipment`, `chocolate`, `alcohol`, `private-tours` and `vouchers`.
      We ingest the whole farm shop — `Propagator`, `Chilli & Pepper Focus Plant
Food`, `Fresh Facing Heaven Chillies`, six separate habanero seed listings.
      Measured against the live API:

      | | products |
                                                                                  | --- | --- |
                                                                                  | whole catalogue (scraped today) | 421 |
                                                                                  | `collections/sauces` | 25 |
                                                                                  | non-sauce left in that collection | 0 |
                                                                                  | real sauces lost by scoping | 0 |

                                                                                  Verified the last row directly: 20 titles in the full catalogue contain
                                                                                  "sauce" and all 20 are already inside the collection. So
                                                                                  `collection: 'sauces'` in `stores.js` is safe. This single entry accounts for
                                                                                  most of the 249 plants/seeds rows and 51 of the 52 pre-order rows.

- [ ] **Remaining plants and seeds elsewhere — ~50 rows** once South Devon is scoped
      (One Stop Chilli Shop, Heat Hot Sauce Shop). Small enough for the shared
      `filter.js` pattern rather than per-store config.
- [ ] **Audit the other 26 stores for the same problem.** South Devon was 94% noise
      and nobody noticed until the catalogue was queried. Worth checking which other
      stores expose a sauce-only collection, especially the two largest —
      Heat Hot Sauce Shop (782 rows) and Hot Sauce Emporium (649).
- [x] **Serving sizes in 740 names (17%).** `Melinda's Chipotle Hot Sauce 148ml`,
      `Slap Ya Mama Original Blend, 8oz`. Spread across 12+ stores (91% of Hot Sauce
      Depot, 88% of One Stop Chilli Shop), so it needs a shared strip, not per-store
      config. Mostly cosmetic + slug quality — it only merges 56 names into 27,
      because `isSimilarName` already catches most size variants. It does remove the
      `hot_sauces_slug_unique` collisions listed under Bugs.
- [x] **`utils/filter.js` is English-only**, which is why the non-English stores leak
      bundles: `Coffret 5 Sauces Da'Bomb`, `6er Set Sriracha … 6 x 200ml`,
      `Adventskalender mit 24 unterschiedlichen Chili Saucen`. Add FR/DE/NL bundle
      vocabulary plus two language-agnostic patterns, `case of` and `\d+\s*x\s*\d+`,
      which catch ~140 rows regardless of language (72 are wholesale cases).
- [x] **Powders, rubs and seasonings — 182 rows.** Needs a product decision: is
      `Queen Majesty Ancho Habanero Hot Sauce Powder` a sauce? One pattern either way.
- [x] **The maker is baked into the sauce name**, differently per store, so the same
      product lands twice: `HotZeg Adixxion Hot Sauce` (Heatsupply) and
      `Hot Zeg - Adixion 🥭` (Sweet Pepper) are one sauce in two rows. Names should
      be the sauce alone, with the brand in `makers` — which also gives the maker
      pages a reason to exist.
      **Measured caveat:** extracting the maker does _not_ fix that duplicate.
      `isSimilarName('Adixxion', 'Adixion')` is false — fuzzysort's 0.6 threshold
      rejects a one-letter difference on a short name, the same shape of problem as
      the pg_trgm threshold in `apps/site/src/lib/server/search.ts`. Shorter names
      make dedup _more_ sensitive to typos, not less, so the threshold needs
      revisiting alongside this or the duplicates simply change shape.
      (`HotZeg Mazoshista Hot Sauce` does dedupe correctly — both stores spell it
      identically, and it is one row linked to two stores.)
- [x] **Search must keep matching on the maker** once it moves out of the name, or
      searching "hotzeg" stops finding anything. `sauceMatchesQuery`
      (`apps/site/src/lib/server/search.ts`) currently covers name + description;
      it needs the joined `makers.name` too. The index is already in place —
      `makers_name_trgm_idx` is accent-folded as of migration 0005.
- [x] **Maison Piquante appends a French translation to every name** —
      `Blistered Shishito & Garlic Hot Sauce Angry Goat Pepper Co – Ail` (267 rows).
      A `stripFromName` case, and it currently defeats cross-store dedup.
- [x] **Heatsupply and Hotta serve English, the adapter takes the default.** Both
      honour `?lang=en` on the Store API, verified live: heatsupply returns Dutch
      by default (`Dit is Dé Sambal van Perry de Man…`) and English with the
      parameter (`Here it is: De Sambal by Perry de Man!…`). **203 of heatsupply's
      307 rows currently hold Dutch descriptions.** Hotta is Estonian by default.
      Add a `lang` option to the Woo config and set it for those two.
      Checked and _not_ fixable this way — chilisaus.be, dekkerpepper, chilirezept
      and maisonpiquante return identical content with or without the parameter,
      so their single-language content is a genuine limitation, not a missed flag.
- [x] **Spice mixes, pastes and Asian condiments.** `Nomie Veggie Curry Kruidenmix`
      and three more Nomie mixes; 31 rows match ketjap / kecap / sojasaus / vissaus
      / miso. None are hot sauce.
- [x] **Sambals — 11 rows.** Settled by the guarded `NOT_POURABLE_PATTERNS`
      (`puree|pastes?`) plus the shared category blocklist: a paste is dropped, and
      `Pain Is Good Sambal Hot Sauce` survives because the name says "sauce".
- [x] **The merch pattern misses `longsleeve`** — `De Sambal Longsleeve – Per de Man`
      is a garment in the catalogue. `utils/filter.js` covers `t-shirt`, `hoodie` and
      `sweater` but not this or `trui` (3 rows).
- [x] **`pakket` is missing from the bundle vocabulary** —
      `Perry de Man Sambal & Kookboek Pakket` bundles a sauce with a cookbook.
      Part of the multilingual filter item above.
- [x] **Promotional copy baked into names — 67 rows.** Real examples:
      `Blonde Beard's Dojo Asian Wing Sauce – *REDUCED*  **LAST CHANCE TO BUY**`,
      `Set of 3 Fatalii Seedlings - Buy Now!`, `PexPeppers BeeBOMB Jalapeno – *REDUCED*`.
      Counts: 27 names carry an asterisk-wrapped marker, 48 start with a bare `*`
      (a Psycho Juice store convention), 16 end in `- Buy Now!`. Strip these in the
      shared name cleaner alongside sizes; none of it is part of the product name.
      Careful with `(Limited Edition)` — often genuinely part of the name, unlike
      `**LAST CHANCE TO BUY**`.
- [x] **Pre-order markers in names — 52 rows, and 51 are plants.**
      `Aji Mango 1 Litre Pot Plant (Pre Order)`. Scoping South Devon Chilli Farm
      removes nearly all of them as a side effect. The single non-plant is
      `Dekker Pepper Spicy Spirit … [PRE-ORDER]`, a chilli spirit — also not a sauce.
      So `(Pre Order)` needs stripping from names, but as a category it is almost
      entirely a symptom of the plants problem rather than its own issue. Handling
      pre-order as an availability _state_ belongs with **Stock tracking** below.
- [x] **Coasters, mugs and clothing — 7 rows.** `houseware` (coaster, mug, glass,
      opener, apron) and clothing both slip past the merch pattern. Small, but the
      pattern list is the same one that misses `longsleeve`.
- [x] **Coffee cannot be a blanket exclusion.** Real coffee is in the catalogue
      (`Medium Roast Coffee Beans | 250g | Gorilla's Coffee`, `PSYCHO COFFEE 1kg`),
      but so are coffee-_flavoured_ sauces that must survive:
      `Dawson's Coffee Date hot sauce`, `El Yucateco Habanero & Coffee`,
      `Coffee BBQ Sauce - Rich Coffee Flavor`. Match on the product noun (beans,
      ground, roast) rather than the flavour word.
      Same trap in reverse: `Coffee BBQ Sauce - Rich Coffee Flavor - Case of 12` is
      a sauce that should be dropped for being a **case of 12**, not for the coffee.
- [x] **77 bundles still get through** after the current filter:
      `Spicy Box – Coffret de 8 Produits Pimentés`,
      `Coffret Trinity 3 Sauces Queen Majesty`, `… - Case of 12`. Covered by the
      multilingual `coffret` / `case of` / `N x M` patterns above; listed separately
      because it is the largest single category still leaking.
- [ ] **28 sauces have no image**, 15 of them from Hot Sauce Emporium. Decide whether
      the grid shows a placeholder or the scraper rejects an imageless product — a
      card with no picture currently renders as a gap.
- [ ] **Merge sauces that differ only by size.** Stripping the size collapses
      **56 rows into 27 sauces** by exact name match
      (`BBQ Beast Hot Sauce 200ML` + `100ML`, `Slap Ya Mama Original Blend` in 4/8/16oz).
      Doing this properly means size stops being part of identity: either a
      `sizes`/variants table hanging off `hot_sauces`, or dropping size entirely and
      treating one bottle as one sauce. The second is much cheaper and probably right
      for a catalogue people browse rather than buy from.
- [x] **Checkout line items listed as products** — `Nouvelle Livraison
(Expédition)`, a Maison Piquante shipping fee. Covered by `FEE_PATTERNS`.
- [x] **1195 sauces (42%) list a shop as their maker.** `houseBrand` defaults to
      the store name, so any product whose feed reports no vendor is attributed to
      the retailer: Hot Sauce Emporium "makes" 485 sauces, Heat Hot Sauce Shop 65,
      Chilisaus.be 61. Some are legitimate — Torchbearer, T-Rex and Raijmakers do
      make their own — so the fix is per-store judgement, not a blanket rule:
      make the fallback opt-in and leave `maker_id` null when a shop is only a
      retailer. Exposed by populating makers; it was invisible before.
      It also blocks the last dedup wins: `Queen Majesty Scotch Bonnet & Ginger`
      is still its own row because Hot Sauce Emporium was recorded as its maker,
      so the brand never got stripped from the name.
- [ ] **`Pepper Palace Warehouse` reads oddly as a brand** (114 sauces). It is the
      vendor string Pepper Palace's own feed uses, so the attribution is right,
      but the page needs a display alias.
- [ ] **628 sauces have no maker.** Correct — their feeds name none — but the
      brand label is simply absent on those pages. Worth deciding whether to show
      nothing, or the shop as a weaker "sold by" line.
- [ ] **Classify the uncertain items with a small model instead of more regexes.**
      The keyword list is load-bearing and leaks a new category every time a
      non-English store is added: Dutch (`pakket`, `Honinglepel`, `Sokken`,
      `Gedroogde`), French (`coffret`, `mélange d'épices`, `bonbon`, `poudre`,
      `séchés`), German (`Adventskalender`, `6er Set`, `Messerblock`). Every one
      was found by eye, not by the scraper.
      A text classifier over name + description would answer "is this a bottle of
      hot sauce?" without a per-language word list, and an image classifier could
      catch what text cannot (a bottle vs a bag of crisps vs a t-shirt).
      Shape it as a _fallback_, not a replacement: keep the cheap regex tiers for
      the obvious cases and only call the model for products no rule is confident
      about, so cost scales with novelty rather than catalogue size. Cache the
      verdict per product URL — the catalogue barely changes between runs.
      Worth deciding first: a hosted API (simplest, per-item cost, needs a key in
      CI) versus a small local model run in the scrape job (no per-item cost,
      slower job, heavier install). Model options and pricing need checking
      properly before committing to either — do not pick from memory.
      Structural alternative that needs no model at all: most of these shops
      already categorise their stock, and the Woo adapter supports
      `includeCategories`. Scoping stores the way South Devon was scoped would
      make the word lists mostly redundant. Try that first — it is free.
- [ ] **The filter only ever reads the name.** A product can be junk for reasons
      that live entirely in its description, and nothing in the current design can
      see that. Found via `Jeremy Renner's … Hot Sauce - Glass Onion`, whose
      description reads "We're sorry.... this doesn't exist (yet)". Excluded
      per-store for now; a description-aware pass would generalise it. Only one
      such listing across two full catalogues checked, so it is a blind spot to
      note rather than machinery to build yet.
- [ ] **Stragglers no category filter will catch**: `PSYCHO COFFEE 1kg`,
      `Fangst Gerookte Limfjord Blauwe Mosselen` (smoked mussels), potato crisps.
- [ ] **Mayo / ketchup / mustard / BBQ — 272 rows.** Left alone deliberately; many are
      genuinely hot-sauce-adjacent (`Honey Mustard Hot Sauce`). Only act on this if
      the catalogue should be strictly sauce.
- [x] **`makers` is still empty.** Both adapters already return a `maker` per product;
      Drizzle silently drops the unknown key on insert, so `maker_id` stays null.
      Cross-store dedup of ~357 distinct vendor strings is the real work here.

---

## Stock tracking

Each scrape already visits every product page; availability is in the response and is
being thrown away. Stock is per store, not per sauce, so it belongs on
`store_hot_sauces` — the same row that already holds the product `url`.

Both APIs expose it, verified live:

| Platform    | Field                           | Note                                                                                     |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| Shopify     | `variants[].available`          | per variant — in stock if any variant is available                                       |
| WooCommerce | `is_in_stock`, `is_purchasable` | also `stock_availability.text`, e.g. "Limited stock, order soon" (HTML, needs stripping) |

- [ ] Add `inStock boolean` + `stockCheckedAt timestamp` to `storeHotSauces`
      (`packages/db/schema/sauce.js`). Nullable `inStock`, so "never checked" stays
      distinguishable from "out of stock" — the adapters that gain stock support
      later should not silently read as sold out.
- [ ] Return availability from both adapters as one normalised `inStock` on the
      product, so `index.js` stays platform-agnostic.
- [ ] **The two platforms are not equally capable, so do not model more than Shopify
      can answer.** Woo exposes `is_in_stock`, `is_on_backorder`, `low_stock_remaining`
      and `stock_availability`. Shopify's public `/products.json` exposes only
      `variants[].available` — no `inventory_policy`, no quantity — so on Shopify a
      pre-order reads as simply available and cannot be told apart from normal stock.
      A three-state `in stock / pre-order / out of stock` would therefore be accurate
      for 11 Woo stores and quietly wrong for 16 Shopify ones. Either keep the shared
      field boolean, or make the richer state explicitly nullable and only set it
      where the platform supports it.
- [ ] Write it in the existing `storeHotSauces` upsert
      (`packages/scraper/index.js`), which already runs on every scrape — this is an
      extra column on a write that happens anyway, not an extra request.
- [ ] Reflect it in the "Where to get" buttons
      (`apps/site/src/routes/sauces/[slug]/+page.svelte:137-158`). The store list is
      already joined through `storeHotSauces` in the loader, so the field comes along
      for free. Out-of-stock stores should stay visible but de-emphasised, not
      hidden — knowing a shop carries it at all is useful.
- [ ] Show staleness. `stockCheckedAt` next to the button ("checked 2 days ago")
      keeps the claim honest between runs; the `--dev` sample only touches 12 sauces
      per store, so most rows will be stale on any dev-branch run.
- [ ] Decide whether a sauce out of stock **everywhere** should drop down the
      default `/sauces` ordering. Cheap once the column exists, and it stops the
      grid leading with things nobody can buy.

---

## Next

### Schema gaps

Heatsupply's WooCommerce already exposes structured attributes for two of these:
`pa_pittigheid` (Mild / Medium Heet / Heet / Heel Heet / Extreem Heet) and
`pa_herkomst` (Nederland / Europa / Duitsland / Amerika / Canada / Midden- & Zuid-Amerika).

- [ ] Add heat level / Scoville, ingredients, flavour profile and country of origin.
      This unblocks the commented-out "Mild Child", "Pain Seeker", "Global Tongue" and
      "The Collector" achievements in `lib/server/achievements/index.ts`.
- [x] `hotSauces.name` is globally unique — two makers can't both sell a "Habanero Hot
      Sauce". Make it unique per `(makerId, name)`. Migration 0007; 67 names are now
      shared by two or more makers. The slug stays globally unique and disambiguates
      with the brand (`garlic-habanero-torchbearer`), 141 of them.
- [ ] `checkins` PK is `(userId, hotSauceId)` — one check-in per sauce ever, so no
      tasting history and no "Double Dip" achievement.
- [ ] Add price and stock to `storeHotSauces` (the original "keep track of store stock").
- [ ] Dead tables: `events` is unused; `followers` and `friends` both exist, are unused,
      and overlap.

### Performance

- [ ] **Move TensorFlow moderation off the request path.** `@tensorflow/tfjs-node` plus
      the toxicity model loads inline when posting a review (4-5s cold) and bloats the
      Vercel function. Background job or a hosted moderation API. Kills the
      `// TODO: fix tensorflow issues` eslint-disabled import.
- [ ] Parallelise the sauce detail load — sauce, stores and check-ins run sequentially.
- [ ] Self-host images (S3-compatible bucket). Currently hotlinked from store CDNs with
      no resizing, caching, `loading="lazy"` or dimensions, so every grid shifts layout.
      Consider `@sveltejs/enhanced-img`.
- [ ] Add cache headers — `/api/v1/search` and the public sauce/store pages are fully
      dynamic on every hit.
- [ ] `topSauces` has no minimum-ratings threshold, so one 5-star review outranks a
      well-reviewed sauce.
- [ ] Offset pagination on `/sauces` degrades as the catalogue grows; keyset is cheap
      since the sort is on `createdAt`.

### Security

- [ ] **No rate limiting** on search, login, signup or review submission. better-auth has
      a `rateLimit` option that is not enabled.
- [ ] `+layout.server.ts` ships the whole session and user object to the client,
      including email and `emailVerified`. The `// Is this a good idea?` comment answers
      itself — return a picked subset.
- [ ] No review length cap — `String(data.get('content'))` goes unbounded into `text`.
- [ ] Username update writes `db.update(user)` directly
      (`settings/+page.server.ts:36-42`); a duplicate surfaces as a raw unique-violation
      500 rather than a field error.
- [ ] Account deletion signs out before deleting, non-transactionally — a failed delete
      leaves a signed-out but live account.
- [ ] No CSP or security headers in `hooks.server.ts`.
- [ ] `sveltekit-superforms` is a dependency but every action hand-rolls `formData`
      parsing. Adopt it or drop it — the current mix is where validation gaps hide.

### SEO & accessibility

- [x] **Every page is titled "Sauced"** — the only `<svelte:head>` is in the root layout.
      No per-page titles, meta descriptions or OG/Twitter cards. Sauce detail pages are
      exactly the pages that should rank. Now a `<Meta>` component
      (`lib/components/Meta.svelte`) on every page: title, description, canonical, OG and
      Twitter cards, `noindex` on the account, auth and search-result pages.
- [x] No `+error.svelte` — users get SvelteKit's bare default.
- [x] No `robots.txt` or sitemap (trivially generated from sauce/store/maker slugs).
      Both are routes, so they follow the data: 3025 URLs today.
- [ ] No default OG image — pages without one (home, listings, makers) fall back to a
      text-only card. Needs a 1200×630 asset; `assets/site-preview.png` is a 1280×1185
      README screenshot, the wrong shape.
- [ ] No JSON-LD on sauce pages. `Product` + `AggregateRating` is what earns rating stars
      in search results, and the ratings are already there.
- [ ] Heading hierarchy: `SauceGrid` emits an `<h2>` per card and several pages have no
      `<h1>`.
- [x] Search dropdown has no keyboard navigation — no arrow keys, no Enter to select.
      Now a combobox: arrows walk the results and wrap back to the input, Enter opens the
      highlighted one (or the full results page when nothing is highlighted), Escape and Tab
      close it, and `/` or ⌘K focuses the box from anywhere.
- [ ] Improve (and index) search.
- [ ] Improve achievement icons.

### Smaller UX TODOs already in the code

- [ ] Confirm dialog before deleting a check-in (`profile/[slug]/+page.svelte:87`).
- [ ] Custom wishlist grid (`wishlist/+page.svelte:16`).
- [ ] Turn the settings success message into a toast (`settings/+page.svelte:80`).
- [ ] Error handling + shallow routing / no-JS fallback on the sauce page
      (`sauces/[slug]/+page.svelte:36,52`).

---

## Someday

- [ ] User following system with a timeline (`+page.svelte:35`).
- [ ] Dark mode.
- [ ] Design: a little more minimal / playfull / brutalist.
- [ ] PWA.
- [ ] Mobile APK.
- [ ] Save images in bucket - [ ] turn white backgrounds into pngs - [ ] image optimization - [ ] image caching - [ ] object detection?
- [ ] Prioritize naming and descriptions from sauce makers where possible
- [ ] keep track of sauce awards
- [ ] a maker can also be/have a store

---

## Repo hygiene

- [x] Finish the prettier -> oxfmt migration.
- [ ] Three SvelteKit adapters in devDependencies (vercel + two cloudflare), two
      commented out in `svelte.config.js`. Pick one.
- [ ] README doesn't mention how to run tests or that `.env.test` is required.
- [ ] No Dependabot / Renovate config.
