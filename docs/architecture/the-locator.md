# The Locator — Architecture

An embeddable, interactive map tool for real-estate professionals. Lets users search any US city, zoom into its districts, and toggle overlay layers: neighborhood boundaries, school district lines, EPA Superfund sites, and population density. Designed to embed into any realtor website via an `<iframe>` snippet or a JavaScript drop-in.

---

## Deployment

The Locator is deployed as two separate artifacts that mirror the rest of the project:

| Artifact | What it is | Where it goes | How it deploys |
|---|---|---|---|
| Frontend | React build output (static HTML/CSS/JS) | GitHub Pages (`zyxwonderland.xyz/locator`) | GitHub Actions → `actions/deploy-pages` |
| API backend | Cloudflare Worker | `locator.zyxwonderland.xyz` | GitHub Actions → `wrangler-action` |

No separate server to provision, no firewall to configure, no Redis instance to manage. Cloudflare's edge handles TLS, DDoS protection, and global distribution. The same `CLOUDFLARE_API_TOKEN` used for Anonymail deploys the Locator worker.

Two GitHub repository secrets are required before the first deploy:
- `LOCATOR_MAPBOX_TOKEN` — Mapbox API token (restrict by domain in Mapbox dashboard)
- `LOCATOR_CENSUS_API_KEY` — Census API key (free at api.census.gov, no billing risk)

To create the KV namespace for caching, run once before first deploy:
```bash
cd the-locator/worker
wrangler kv:namespace create LOCATOR_CACHE
# copy the returned id into wrangler.toml → kv_namespaces[0].id
```

---

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model suits the layer-panel/map split; TS gives type safety over GeoJSON structures |
| Map engine | Mapbox GL JS | WebGL rendering — smooth zoom/pan at any scale; native GeoJSON + vector tile layer support |
| API backend | Cloudflare Worker | Same platform as Anonymail — no extra infrastructure; secrets via `wrangler secret put` |
| Cache | Cloudflare KV | Replaces Redis — TTL-based, globally distributed, zero infrastructure |
| Data: geocoding | Mapbox Geocoding API | Returns bounding box per city — used to fly the map and scope layer queries |
| Data: boundaries | US Census TIGER/Line | Authoritative shapefiles for unified school districts and neighborhood-level boundaries |
| Data: population | Census ACS 5-year estimates | Tract-level population counts and density — most reliable sub-city population source |
| Data: Superfund | EPA CERCLIS REST API | Public endpoint returning all NPL/Superfund sites with coordinates and status |
| Embed delivery | iframe + postMessage | Host sites embed via `<iframe src="locator.zyxwonderland.xyz/embed?city=...">` |

The app is written entirely in **JavaScript / TypeScript** throughout — the Worker uses vanilla JS (no npm runtime dependencies, matching the Anonymail pattern), and the React frontend compiles to static JS.

---

## Component Map

```
the-locator/
├── client/                   React + TypeScript SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.tsx        Mapbox GL JS mount + layer orchestration
│   │   │   ├── SearchBar.tsx  City / ZIP geocoding input
│   │   │   ├── LayerPanel.tsx Radio/checkbox toggles for each overlay
│   │   │   ├── InfoPanel.tsx  Click-to-inspect popup (pop, district, sites)
│   │   │   └── Legend.tsx     Color scale for population choropleth
│   │   ├── hooks/
│   │   │   ├── useGeocode.ts  Debounced search → bounding box
│   │   │   ├── useLayers.ts   Lazy-fetch GeoJSON per active layer
│   │   │   └── useEmbed.ts    postMessage bridge (receives commands, emits events)
│   │   ├── layers/
│   │   │   ├── neighborhoods.ts  Mapbox layer spec + paint properties
│   │   │   ├── schoolDistricts.ts
│   │   │   ├── superfund.ts      Point cluster layer
│   │   │   └── population.ts     Fill-color choropleth (census tracts)
│   │   └── types/
│   │       └── geojson.d.ts   Typed feature properties per layer
│   └── public/
│       └── embed-frame.html  Stripped shell used when loaded inside iframe
│
└── worker/                   Cloudflare Worker (API backend)
    ├── src/
    │   └── index.js          Single fetch handler — all routes, cache, rate limit, CORS
    ├── wrangler.toml          Worker name, KV binding, route (locator.zyxwonderland.xyz/*)
    └── package.json          wrangler + vitest dev dependencies only (no runtime deps)
```

---

## Data Sources

### Neighborhoods — Census TIGER/Line + OpenStreetMap
- **Source:** `https://tigerweb.geo.census.gov/arcgis/rest/services/`
- **Geometry:** Polygon — census-designated places and census tracts used as neighborhood proxies
- **Update cadence:** Annual (decennial census / ACS release cycle)
- **Cache TTL:** 24 hours — boundaries change at most once a year
- **Fallback:** OpenStreetMap Overpass API for named neighborhood relations where Census tracts are too coarse

### School Districts — Census TIGER/Line Unified School Districts
- **Source:** `https://tigerweb.geo.census.gov/` — UNSD (Unified School District) layer
- **Geometry:** Polygon — one feature per district with GEOID, district name, state
- **Update cadence:** Annual
- **Cache TTL:** 24 hours

### Superfund Sites — EPA CERCLIS
- **Source:** `https://ofmpub.epa.gov/frs_public2/frs_rest_services.get_facilities`
- **Geometry:** Point — latitude/longitude per site
- **Attributes returned:** Site name, NPL status (listed / proposed / deleted), program affiliation
- **Update cadence:** Updated by EPA as sites are listed/remediated
- **Cache TTL:** 6 hours

### Population — Census ACS 5-Year Estimates
- **Source:** `https://api.census.gov/data/{year}/acs/acs5`
- **Variables:** `B01003_001E` (total population), `B01001_001E` (count by sex/age), tract GEOID
- **Geometry:** Joined to TIGER/Line tract polygons client-side via GEOID
- **Rendered as:** Fill-color choropleth — light to dark by population density (pop / sq km)
- **Update cadence:** Annual (new 5-year estimates released each December)
- **Cache TTL:** 24 hours

### Geocoding — Mapbox Geocoding API
- **Endpoint:** `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json`
- **Used for:** Converting city name / ZIP → bounding box + center coordinates
- **Scope:** `place,postcode` types; `country=us` filter
- **Cache TTL:** 1 hour per query string (city names resolve the same way repeatedly)

---

## Embed Integration

### iframe embed (universal)

Paste into any HTML page, WordPress custom HTML block, or Squarespace code widget:

```html
<iframe
  src="https://locator.zyxwonderland.xyz/embed?city=Chicago&layers=neighborhoods,schools&zoom=12"
  width="100%"
  height="600"
  frameborder="0"
  sandbox="allow-scripts allow-same-origin allow-forms"
  allowfullscreen>
</iframe>
```

Query parameters:

| Parameter | Values | Default |
|---|---|---|
| `city` | Any US city name or ZIP code | None (shows full US) |
| `layers` | Comma-separated: `neighborhoods`, `schools`, `superfund`, `population` | None |
| `zoom` | 1–20 | 12 when city provided |

### JavaScript snippet embed (programmatic control)

```html
<div id="the-locator" data-city="Austin, TX" data-layers="neighborhoods,schools"></div>
<script src="https://locator.zyxwonderland.xyz/embed.js" async></script>
```

**postMessage API — commands (host → embed):**

```javascript
const frame = document.getElementById('the-locator').querySelector('iframe');
frame.contentWindow.postMessage(
  { action: 'flyTo', city: 'Denver, CO' },
  'https://locator.zyxwonderland.xyz'
);
```

| Action | Payload | Effect |
|---|---|---|
| `flyTo` | `{ city: string }` | Geocodes city and flies the map there |
| `setLayers` | `{ layers: string[] }` | Activates the named layers, deactivates others |
| `toggleLayer` | `{ layer: string, visible: boolean }` | Toggles one layer |

**postMessage API — events (embed → host):**

```javascript
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://locator.zyxwonderland.xyz') return;
  // e.data: { event: 'cityChanged', city: 'Denver, CO', bbox: [...] }
  //         { event: 'featureClick', layer: 'neighborhoods', properties: {...} }
});
```

| Event | Payload | Fired when |
|---|---|---|
| `cityChanged` | `{ city, bbox, center }` | Search resolves or flyTo completes |
| `featureClick` | `{ layer, properties }` | User clicks a map feature |
| `layerToggled` | `{ layer, visible }` | Layer toggle changes state |

---

## Security

### API key protection
- The Mapbox token is stored as a server-side environment variable and never sent to the browser
- All Mapbox Geocoding requests are proxied through `/api/search`
- Map tile requests from the browser use a **domain-restricted** public token (Mapbox token scopes lock it to `*.zyxwonderland.xyz`)
- The Census API key and EPA endpoints are called only server-side

### Domain allowlist (embed protection)
- `embed.js` is served with an `Origin`/`Referer` check against a registered domain list
- Unregistered domains receive a 403 — the map does not render on unlicensed hosts
- This prevents quota abuse from third-party hotlinking

### Content Security Policy
The embed frame's CSP allows only what is needed:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' blob:;
  style-src 'self' 'unsafe-inline';
  worker-src blob:;
  connect-src 'self' https://*.mapbox.com https://api.census.gov https://ofmpub.epa.gov;
  img-src 'self' data: blob: https://*.mapbox.com;
  frame-ancestors 'self' https://*.zyxwonderland.xyz [allowlisted-embed-domains];
```

`frame-ancestors` restricts which domains may embed the iframe — the list is generated from the same domain allowlist as the server-side check.

### postMessage origin pinning
The embed validates `event.origin` on every incoming message. Commands from origins not matching `https://locator.zyxwonderland.xyz` are silently dropped.

### iframe sandboxing
The embed snippet provided to realtors includes `sandbox="allow-scripts allow-same-origin allow-forms"` — this prevents the embedded frame from navigating the host page's top-level window or spawning popups.

### Input sanitization
- City search input is trimmed, length-capped at 100 characters, and stripped of URL metacharacters before being forwarded to Mapbox Geocoding
- Bounding boxes returned from geocoding are validated to fall within US bounds (`[-180, 18, -66, 72]`) before the map flies there

### Rate limiting
| Route | Limit | Window |
|---|---|---|
| `GET /api/search` | 30 requests | 60 seconds per IP |
| `GET /api/layers/*` | 60 requests | 60 seconds per IP |
| `GET /api/population` | 30 requests | 60 seconds per IP |
| All routes combined | 120 requests | 60 seconds per IP |

### No persistent user data
Search queries and map interactions are not logged or stored. No authentication is required for the read-only map. If saved locations are added in a future version, they will require explicit opt-in and OAuth authentication rather than a custom credential system.

---

## Performance Considerations

- **Vector tiles over GeoJSON** for boundary layers: pre-process TIGER/Line shapefiles to MBTiles with `tippecanoe` — reduces a 10 MB metro-area GeoJSON to under 500 KB of tiles
- **Lazy layer loading**: GeoJSON is fetched only when a layer toggle is turned on, not at startup
- **Geometry simplification**: tolerance increases at zoom < 10 (Douglas-Peucker via `turf.simplify`) — full-resolution polygons are only rendered when zoomed into a district
- **Redis cache**: prevents redundant external API calls for the same bounding box within the TTL window
- **Choropleth pre-bucketing**: population quantile breaks are computed once per bounding box and cached; the browser receives a ready-to-paint color mapping rather than raw counts
