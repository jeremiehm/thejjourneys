# Analytics (Google Analytics 4)

## Measurement ID

`G-HBT5X50BZ1`

Loaded via `@next/third-parties` (`GoogleAnalytics`) **only after** the visitor accepts cookies (opt-in / RGPD Consent Mode v2).

## Consent

- Banner: `components/cookie-consent-banner.tsx` (Accept / Refuse)
- Choice persisted in `localStorage` under `dot-cookie-consent` (`granted` | `denied`)
- Default Consent Mode: `analytics_storage` / ad-related storage = `denied` until Accept
- Refusing still allows browsing; GA scripts are never mounted

## Custom events

### `affiliate_click`

Sent by `AffiliateLink` (`components/affiliate-link.tsx`) on click.

| Parameter       | Description                                      |
|-----------------|--------------------------------------------------|
| `provider`      | Partner / offer name (e.g. ALDI Mobile, Airalo) |
| `url`           | Destination URL                                  |
| `article_path`  | Current path from `usePathname()`                |

Affiliate blocks in articles use this component (`rel="noopener noreferrer sponsored"`).

### `outbound_click`

Sent by `useOutboundLinkTracking` / `OutboundLinkTracker` for any other outbound link click (skips `rel=sponsored` so affiliates are not double-counted).

| Parameter    | Description                         |
|--------------|-------------------------------------|
| `url`        | Destination URL                     |
| `link_text`  | Anchor text (trimmed, max 120)      |
| `page_path`  | Current path from `usePathname()`   |

## Native GA4 reports (no extra code)

Country, sessions, average engagement time, etc. live in the GA4 UI:

- **Reports → Demographics** (country, language, …)
- **Reports → Engagement** (sessions, views, average engagement time, …)

## Search / indexing

- `app/robots.ts` allows public routes and disallows `/admin/`
- Root metadata sets `robots: { index: true, follow: true }`
- Article pages do **not** set `noindex`
