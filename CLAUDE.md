# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static site for Ágatha & Matheus's "Chá dos Noivos" (bridal shower). All UI text is pt-BR. There is no build step, package manager, tests, or linter, and the folder is not a git repository.

- `index.html`: the invitation page, a faithful reproduction of the design in `CHÁ22 (1).pdf`.
- `lista.html`: the gift list app. The invitation's "Acesse nossa lista aqui" button links to it.
- `assets/`: images cropped from the PDF's embedded 1080×4737 JPEG.

Deploy: GitHub Pages serves the `main` branch root of `GabrielLucasSousa/ch-de-cozinha` at https://gabriellucassousa.github.io/ch-de-cozinha/, so pushing to `main` publishes. The repo is public, so `*.pdf` and `*.xlsx` (the design and spreadsheet sources) are gitignored and stay local.

To run it, open `index.html` in a browser (or serve the folder with any static server, e.g. `python -m http.server`). It needs network access for Google Fonts and Tailwind.

## Invitation (`index.html`)

- The page uses absolute positioning in the PDF's pixel space. `.convite` is the container query root (max 540px wide), and `.folha` defines `--u = 100cqw / 1080`, so one `--u` equals one pixel of the original 1080px-wide art. Elements use the `.at` class with inline `--x/--y/--w` values in source pixels. To move or resize something, measure it on the PDF image and set those values; don't switch to flow layout.
- Art-heavy parts are image crops: the hero (title, Tarsila frame with date and address), the patterned section backgrounds, the script titles, the button labels, the emojis and the quote. The "Botão clicável" design notes were removed from the background crops. The cards, buttons, body text and author line are HTML. Body text uses Crimson Pro with explicit line breaks so the lines match the PDF.
- `LINK_CONFIRMACAO` in the bottom script sets the "Confirme sua presença" target. It is empty by default, so the button does nothing until it is set.
- The "Nossa Progamação" typo is baked into `assets/titulo-programacao.png`.
- To verify layout changes, take a headless Chrome screenshot (`chrome.exe --headless=new --force-device-scale-factor=2 --window-size=540,2369 --screenshot=...`) and compare it with the PDF image.

## Gift list (`lista.html`)

Everything lives in `lista.html`, in this order:

1. **Head**: Tailwind via Play CDN (`cdn.tailwindcss.com?plugins=forms,container-queries`) plus an inline `tailwind.config` with Material 3–style token names, remapped to the invitation palette: `surface*` is the cream `#e9e4e0`, `primary` is the card blue `#3b5c9f`, `laranja`/`laranja-escuro` is the button orange `#fe7501`, `tertiary` is a darker orange for readable text, and `on-surface` is the ink `#3a323f`. Spacing tokens (`margin-mobile`, `gutter-mobile`, `space-*`) and font-size tokens (`headline-sm`, `body-md`, `label-md`, …) are also defined. Use these tokens instead of raw Tailwind colors or sizes. Every font token maps to Crimson Pro, and `body { font-size-adjust: 0.5 }` keeps its small x-height legible (icons opt out). Icons are Material Symbols Outlined (`<span class="material-symbols-outlined">name</span>`).
   The page follows the invitation's look: max 540px wide, an `assets/azulejo-faixa.jpg` tile strip with the blue card and the `titulo-presentes.png` title at the top, orange pill buttons, and the Drummond quote plus a tile strip at the bottom. A bottom nav links back to `index.html`.
2. **Static markup**: fixed header, counters, search/price filter, status tabs, an empty `#catalog-grid`, and hidden modals (`#gift-modal`, `#admin-auth-modal`, `#admin-panel-modal`) plus the `#app-toast`.
3. **One inline `<script>`** at the end of the body, holding the app:
   - `initialGifts` array: the 80 items from `Chá de Panela.xlsx` (columns Item / Valor / Link). Fields: `id`, `title`, `price`, `priceFormatted`, `categoryPrice` ∈ `up-to-80 | 80-to-150 | above-150`, `status` ∈ `available | reserved`, `reservedBy`, `message`, `image` (`assets/presentes/<id 2 digits>.jpg`, 400×400 on a white background), `link` (store URL with the query string removed; shown as "Ver na loja"), `imageAlt`. If the spreadsheet changes, regenerate this array and the photos.
   - Global mutable state: `catalog`, `currentFilter`, `currentSearch`, `currentPriceFilter`, `activeModalItemId`.
   - `renderCatalog()` filters `catalog` and rebuilds `#catalog-grid` through `innerHTML` template strings, then calls `updateCounters()`. Every state change goes through a full re-render.
   - Guest flow: `openGiftModal(id)` → `confirmGiftReservation()` marks an item reserved with the giver's name and message.
   - Admin flow: `openAdminModal()` → `authenticateAdmin()` → `openAdminPanel()` / `buildAdminList()`; `reopenGift(id)` un-reserves an item; `exportCSV()` downloads the reserved items.
   - Handlers are wired through inline `onclick="..."` attributes, so these functions must stay global.

## Known quirks (prototype state)

- **Backend = Google Sheets via Apps Script**: `google-apps-script/Codigo.gs` is deployed by the user as a Web App ("Executar como: Eu", "Qualquer pessoa"). Its `/exec` URL goes in `PLANILHA_URL` in `lista.html`; while that constant is empty, reservations live only in memory (test mode). The API has a public `GET` that returns `{id, nome}` for each reservation (no messages) and a `POST` with a `text/plain` JSON body (avoids a CORS preflight) taking `acao`: `reservar` (rejects duplicates with `ja_reservado`, under `LockService`), `admin` (returns messages) and `reabrir`. The last two require `senha`, which must match the `SENHA_NOIVOS` script property. The admin password is checked server-side, so nothing is hardcoded in the page.
- **Testing the backend locally**: run `Codigo.gs` under Node with stubbed `SpreadsheetApp`/`ContentService`/`PropertiesService`/`LockService`, serve the site from the same server, and point a copy of `lista.html` at it. Guest-supplied names and messages are rendered through `escapeHtml()`; keep it that way for any new field.
- **Product photos**: Mercado Livre blocks automated access, even from a logged-in browser, so photos for its items (and some Shopee items) came from Bing Images searches for the same product. Most are from the store's own CDN, but a few may show a slightly different variant than the linked listing.
