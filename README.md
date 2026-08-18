# DEADZONE

An endless auto-aim zombie survivor. Your rifle fires itself — anything inside the scan ring dies. Your only job is to keep moving.

Harvest the green cores they drop, level up, pick a mutation, repeat. There is no last wave, only the one that finally gets you.

**Play: https://rafialaydrus.github.io/deadzone/**

Installable as a PWA and **fully playable offline** — once loaded, it needs no signal at all.

## Install on your phone

1. Open the link above in Safari (iOS) or Chrome (Android).
2. **iOS:** Share → *Add to Home Screen*. **Android:** menu → *Install app*.
3. Launch it from the home screen icon — it opens full-screen with no browser chrome, and works in airplane mode.

## Controls

**Touch**
- Drag anywhere — a stick appears under your thumb and follows it
- Tap **DASH**, or tap with a second finger anywhere, to blink (brief invulnerability)
- Tap **❚❚** top-right to pause

**Keyboard**
- `W A S D` / arrow keys — move
- `Space` — dash
- `1` `2` `3` — pick upgrade · `R` — reroll
- `P` / `Esc` — pause · `Enter` — redeploy after death

## How it works

Everything is one self-contained file — no build step, no dependencies, no external requests. Vanilla canvas and JS: hand-rolled physics, a spatial hash grid for collision, particle FX, and 38 stacking upgrades across four rarity tiers.

| File | Purpose |
| --- | --- |
| `index.html` | The entire game — markup, styles, and engine |
| `sw.js` | Service worker; precaches the shell for offline play |
| `manifest.webmanifest` | PWA metadata (icons, colours, standalone display) |
| `icons/` | Generated app icons |
| `tools/make-icons.js` | Regenerates the icons (dependency-free PNG encoder) |
| `serve.js` | Local dev server, for testing only |

The camera scales itself so every device sees roughly the same amount of world, and pulls back further as your scan range grows — so the engagement ring always stays on screen.

## Local development

```bash
node serve.js
```

Then open http://localhost:8777. To test on a phone on the same network, use your machine's LAN IP.

Service workers need `http://localhost` or HTTPS — opening `index.html` over `file://` works, but skips the offline layer.

After changing any precached file, bump `CACHE` in `sw.js` or clients keep serving the old copy.
