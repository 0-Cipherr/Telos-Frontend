# TELOS — interface template

A complete visual replacement for `Home.tsx` in the TELOS charcoal / electric-lime
direction. It was built as a **separate template** so none of the existing
components, styles, routes, providers, or contract code were changed.

## Preview it

```bash
cd telos
npm run dev
```

Open **http://localhost:5173/template.html**

That page renders the template in preview mode (no Privy App ID required). The
existing `/` page is untouched and still renders your current design.

## Swap it in (2-line change, when you are ready)

The template accepts the **same props** as `Home.tsx`.

```diff
// src/App.tsx
-import Home from './Home';
+import Home from './design/TelosTemplate';
```

```diff
// src/main.tsx
-import Home from './Home';
+import Home from './design/TelosTemplate';
```

Nothing else changes. `PrivyProvider`, `usePrivy`, login/logout handlers, routes,
environment variables, and the existing `Home.tsx` all stay intact.

To roll back, restore those two imports. To remove the template entirely, delete
`src/design/` and `template.html` — no existing file depends on them.

## Files

```
src/design/
  TelosTemplate.tsx        page composition, same props as Home.tsx
  telos.css                scoped design system (everything under .telos)
  data.ts                  sample vaults + theses + formatting helpers
  types.ts                 Vault / Thesis / TemplateProps types
  preview.tsx              standalone preview entry (no Privy)
  components/
    Navbar.tsx             desktop + mobile nav, wallet states
    Hero.tsx               headline, CTAs, 3-step indicator
    MarketTerminal.tsx     static market snapshot + custom SVG chart
    Marketplace.tsx        search, type/network/risk filters, empty state
    VaultCard.tsx          ID, network, APY, TVL, risk, fee, sparkline
    VaultDetails.tsx       keyboard-accessible vault file modal
    ThesisBoard.tsx        research cards + frontend-only proposal form
    YieldCalculator.tsx    amount / APY / fee → gross, fees, net
    VaultBuilder.tsx       config → review → (disabled) deploy
    NetworkSection.tsx     architecture diagram, steps, contracts, stack
    Faq.tsx                existing FAQ content
    ClosingBand.tsx        end-of-index CTA
    Footer.tsx             links, status, risk disclaimer
    SectionHead.tsx        shared section header
    Sparkline.tsx          SVG chart
    Field.tsx              labelled field + select primitives
    TemplateMark.tsx       lime T-mark (your Logo.tsx is unchanged)
```

## What is preserved

- Existing `Home.tsx`, `index.css`, `App.tsx`, `main.tsx` — untouched.
- Privy wallet connection: the template only calls the `login` / `logout`
  functions passed in. It does not create a new provider or store keys.
- The same sample vault set, fees, creators, chains, strategies, FAQ copy, and
  architecture content as the current page.
- Same anchor-based navigation model (no new router).
- No new dependencies. React + your existing setup only.

## Honest states

This is a visual template, so it does **not** pretend to be wired to the chain:

- Vault detail deposit/withdraw buttons are disabled and labelled
  “NOT CONNECTED”. No transaction is simulated.
- Vault deployment always ends at a disabled “WIRING REQUIRED” state. The
  existing `VaultFactory` flow is not replaced.
- The thesis proposal form is explicitly a preview. Submitting shows
  “not saved” and no backend endpoint is contacted.
- Market figures are labelled as sample/static data. No fake live feed labels.
- Docs and GitHub links are shown as `SOON` because those resources do not exist
  in the repository.

## Wiring real data later

`src/design/data.ts` exports `VAULTS`. Replace it with the response from
`TelosAPI.allVaults()` / `VaultRegistry`, keeping this shape:

```ts
type Vault = {
  id: string;
  name: string;
  asset: string;
  chain: "Base" | "Arbitrum";
  kind: "ready" | "custom";
  proto?: string;
  strategy: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  apy: number;   // percentage points
  tvl: number;   // USD
  fee: number;   // percentage points
  creator: string;
  history: number[];
  summary: string;
};
```

`id`, `strategy` and `risk` are display additions used by the new cards. The
registry can either supply them or the template can derive them.

## Verification

- `tsc --noEmit --strict` on all template files: passes.
- Production build of `template.html` (Vite): passes.
- Rendered at 1440 px and 390 px in headless Firefox; also verified with the
  existing `src/index.css` loaded to catch global-style clashes.

`npm run build` still reports the four pre-existing unused-function errors in
`src/custom-contexts/registry/RegistryContext.tsx`. That file was not touched.
Remove those unused helpers (or export/use them) when you want the whole project
build to pass.

## Fonts

`telos.css` imports IBM Plex Mono and Space Grotesk from Google Fonts. If you
prefer local fonts or want to avoid the network request, delete the `@import`
line and add the font files to your project.
