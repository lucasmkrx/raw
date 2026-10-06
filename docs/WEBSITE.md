# Website icons

The favicon kit uses the complete original color logo on black.

## Install

Copy the contents of `assets/favicon/` into your website's public root, then add this to the document `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#000000">
```

| File | Purpose |
| --- | --- |
| `favicon.svg` | Scalable browser favicon |
| `favicon.ico` | Browser fallback with 16, 32, and 48px frames |
| `apple-touch-icon.png` | 180px Apple home-screen icon |
| `icon-192.png`, `icon-512.png` | Android/web-app icons |
| `site.webmanifest` | References the two web-app icons |

The web-app icons support both standard and maskable use. The complete logo fits within the centered safe circle with radius 40% of icon width, as described in the [MDN icon guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons). The same images serve both purposes to keep the kit small.

The manifest provides icon metadata. For an existing web app, merge its icon entries into the app's own manifest and preserve that app's name, launch URL, scope, and display settings.

## Paths and checking

If deploying under `/brand/` or another base path, prefix the HTML URLs accordingly. The manifest icon paths are relative to the manifest, so keep the files together.

Serve SVGs as `image/svg+xml`, PNGs as `image/png`, and the manifest with an appropriate manifest/JSON content type. Test over HTTP(S), then check browser tabs and home-screen previews. Favicons are cached aggressively, so clear site data or use a fresh browser profile when checking an update.

The full logo is intentionally preserved at small sizes; the tagline will not be readable at 16px. The [web.dev document-structure guide](https://web.dev/learn/html/document-structure) explains browser favicon and Apple touch icon links.
