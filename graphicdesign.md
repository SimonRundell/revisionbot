# RevisionBot — Steampunk UI Overhaul & WCAG 2.1 AA Remediation

**Status:** In progress. Phases 0–2 implemented (branding rename, design tokens, antd theming, nav/app-shell reskin and landmarks). Phases 3–8 not yet started.
**Audience:** A Claude Agent executing this overhaul. Written as direct instructions to that agent.
**Owner context:** Exeter College, Faculty of Cybersecurity and Digital Technologies (renamed from "Dept of ITDD" — all references across `index.html`, `src/cmFloatAd.jsx`, and this document have been updated; `data/sample_students.csv` and `backups/*.sql` were left alone as they are sample/backup data, not branding). App: React 18 + Vite, Ant Design (antd) v5 component library, FontAwesome icons, Tiptap rich text editor. No CSS framework (no Tailwind, no CSS modules) — styling lives almost entirely in one global file, `src/App.css` (~5,400 lines).

**Resolved decisions (were open questions in §8, now settled):**
1. **Antd scope:** keep antd everywhere; theme it fully via `ConfigProvider` (dark algorithm + custom token overrides referencing the CSS custom properties in `src/styles/tokens.css`, wired in `src/main.jsx`). The earlier instruction to remove/replace all antd components was reviewed and reverted — full removal would mean re-implementing Table/Modal/Tree/Form/Upload/DatePicker's accessible interaction behavior (focus trapping, keyboard nav, validation announcements) by hand, which is a large regression-risk undertaking directly counter to the WCAG goals of this project. Theming achieves the same visual goal (no antd component should look like antd's default theme anywhere) without that risk.
2. **Fonts:** Google Fonts CDN (`Cinzel` for display, `Spectral` for body), loaded via `<link>` in `index.html` with `display=swap`.
3. **Light mode:** out of scope. Dark-only theme. `color-scheme: dark` is now set explicitly (see §3.9).
4. **Rollout:** incremental, phase by phase, each a reviewable increment. This document is updated as phases land.

---

## 1. Why this overhaul is needed (audit findings)

Read these before touching anything — they explain *why* each instruction below exists, not just *what* to do.

1. **`src/App.css` lines 1–19 are still Vite's default scaffold CSS**, never replaced: `color-scheme: light dark`, `font-family: Inter, system-ui, ...`, `a:hover { color: red; font-weight: bold }`. This is placeholder CSS from `npm create vite`, not a designed theme. It proves the app never had a real design pass. **Done (Phase 1):** removed and replaced with token-driven base styles.
2. **There is no shared design token system.** No CSS custom properties for color, spacing, radius, or type scale exist anywhere in the codebase (`grep -n ":root" src/App.css` returns only the scaffold block above). Every color is a hard-coded hex value repeated inconsistently across the 5,400-line file.
3. **The "steampunk" styling that does exist is cosmetic and inconsistent.** Classes named `.steampunk-menu-bar` / `.steampunk-account-bar` (App.css:427, 448) use a flat dark gray gradient (`#2d3436` → `#636e72`) with no brass, copper, rivets, or texture — it reads as generic "dark mode," not steampunk. Elsewhere (App.css:1141, 1160, 3284) buttons use an unrelated violet/teal gradient (`#667eea`/`#764ba2`, `#28a745`/`#20c997`) that is a stock "default SaaS gradient," visually unrelated to the rest of the app and to the brand art.
4. **The brand art is good but abandoned.** `docs/login-screen.png` shows a genuinely strong steampunk lockup — riveted metal letterforms, a gear, a pressure gauge, a robot mascot reading a book, on a near-black ground. None of that visual language (metallics, rivets, gauges, warm highlight on cool dark ground) made it into the component-level CSS. The UI and the brand art were designed by two different people who never spoke.
5. **No custom webfonts are loaded.** `index.html` has no `<link>` to any font service; the whole app renders in system UI fonts (Inter/Segoe/Arial fallbacks). A steampunk product with system-default typography will always read as "unfinished," regardless of color work.
6. **Ant Design is used entirely with its default theme.** No `ConfigProvider theme={{ token: {...} }}` exists anywhere in `src` (confirmed by search). This means every antd `Button`, `Input`, `Table`, `Modal`, `Tabs`, etc. renders in antd's default blue Material-ish theme and then gets fought with ad-hoc `!important`-style overrides in App.css. This is the single biggest cause of the "amateurish" look: two unrelated design systems layered on top of each other. **Fixing this at the token level, not via CSS overrides, is the highest-leverage single change in this plan. Done (Phase 1):** `ConfigProvider` wired in `src/main.jsx` with `theme.darkAlgorithm` plus steampunk token overrides (see §4.2). Antd itself is kept, not removed — see the "Resolved decisions" note at the top of this document for why.
7. **Accessibility is essentially unaddressed.** Primary navigation (`src/menu.jsx`) is a `<div className="menu">` of `<button>`s with an `active` class — no `<nav>` landmark, no `aria-label`, no `aria-current="page"` on the active tab, so a screen reader user gets no indication of which section they're in. Across the whole `src/` tree there are only 103 occurrences of `aria-*`/`role=`/`<label`/`alt=` combined across 22 files — for an app with login, registration, quiz-taking, rich-text editing, admin tables, bulk upload, and analytics charts, that is sparse. Color contrast has never been audited against the dark steampunk ground colors already in use.
8. **No reduced-motion, no documented focus-visible treatment, no color-blind-safe status indicators** have been found in App.css.

The combination of (2), (6) and (7) is why this plan treats **design tokens + antd theming + accessibility** as the load-bearing foundation, done *before* any cosmetic steampunk decoration. Decoration on top of untokenized, unthemed, inaccessible markup will just produce a prettier version of the same problem.

---

## 2. Design direction

### 2.1 Visual language
Victorian industrial / airship-engineer steampunk, matching the tone already set by `docs/login-screen.png` and the mascot art in `public/images/`:

- **Grounds:** near-black gunmetal / dark walnut, not pure black (`#0d0d0e`–`#1a1714` range), so brass and copper have something to glow against.
- **Metals:** brass, aged copper, bronze, with highlight/shadow pairs so elements read as embossed metal, not flat fills. Reserve true gold/yellow for one accent only (primary CTA) — overuse flattens the hierarchy.
- **Secondary accent:** oxidised copper/teal-green (verdigris) for secondary actions, links, and success states — this is the classic steampunk counterpoint to brass and keeps the palette from being monochrome bronze.
- **Paper/parchment tone** for content surfaces that hold body text (cards, modals, question panels) — warm off-white, not stark white, to stay in the Victorian register and to make light-on-dark body text unnecessary (better for contrast and reading fatigue).
- **Texture, used sparingly:** subtle riveted-panel borders, brushed-metal gradients, a faint paper-grain background-image on content surfaces. No busy tiled textures behind body text — texture lives in chrome (headers, panel borders, button faces), never behind paragraphs, per the accessibility rules in §3.
- **Iconography:** gears, rivets, pressure gauges, pipes, goggles — used as decorative accents (corner ornaments, section dividers, loading indicators) and as functional icons via FontAwesome where an icon conveys meaning (already a dependency — no new icon library needed).
- **Motion:** small mechanical details (a gear that nudges a few degrees on hover, a gauge needle that eases in) rather than generic fades. All motion must respect `prefers-reduced-motion` (see §3.6).

### 2.2 Typography
Two-font system, not three — a display face everywhere will hurt readability and will fail WCAG's "visual presentation" guidance for body text:

- **Display/headings (H1, brand lockup, section titles only):** a Victorian/industrial display face such as **Cinzel** or **Pirata One** (both on Google Fonts, open license). Use at large sizes only; never set body copy, form labels, table data, or long-form question/answer text in it.
- **Body/UI text (everything else — forms, buttons, tables, nav, question content, admin screens):** a highly legible serif or humanist sans with an old-style flavor but excellent screen legibility, e.g. **Spectral** or **Vollkorn** for body copy, or **Public Sans**/**Source Sans 3** if the reviewing team wants a cleaner UI register for dense admin/analytics screens. Pick **one** body family and use it everywhere outside headings.
- Load via a `<link>` in `index.html` (Google Fonts, `display=swap`) or self-host in `public/fonts` if the college network blocks Google Fonts — check with the user before assuming either way (see Phase 0 task).
- Minimum body text size 16px; respect the existing `:root { font-size }` cascade for user zoom.

### 2.3 Component metaphors
- **Buttons:** riveted brass/copper plates with a pressed-metal highlight; a visible inset "pressed" state on `:active`.
- **Panels/cards:** riveted metal frame or parchment card, consistent corner radius (define one radius scale, stop using ad-hoc values).
- **Inputs:** brass-bordered fields on a parchment or dark-leather field background, with a clear focus ring independent of the border color (see §3.3).
- **Navigation bar:** the riveted brass rail already implied by `.steampunk-menu-bar`'s pseudo-elements (App.css:467–494) — keep that construction, just give it an actual brass/copper material instead of flat gray, and add the missing landmark/ARIA semantics.
- **Status/feedback (success, error, warning, info):** gauge-needle or pressure-valve motifs, but always paired with icon + text label, never color alone (see §3.2).

---

## 3. WCAG 2.1 AA requirements (non-negotiable constraints on §2)

Every decision in §2 is subordinate to these. If a steampunk treatment and an AA requirement conflict, AA wins and the agent should find an alternate steampunk treatment, not skip the requirement.

1. **Contrast:**
   - Normal text (<24px / <19px bold): **4.5:1** minimum against its background.
   - Large text (≥24px, or ≥19px bold): **3:1** minimum.
   - UI components and graphical objects (button borders, input borders, icons that convey state, focus indicators): **3:1** against adjacent colors.
   - Build the palette in §4 as actual token pairs that are pre-verified to these ratios (use a contrast checker — e.g. WebAIM — on every background/foreground pairing before it goes in the token file), not chosen by eye. Brass-on-dark-brass and copper-on-parchment are exactly the kind of low-contrast pairing a steampunk palette tends to produce by accident — verify, don't assume.
   - Decorative texture/gradient noise behind text must not reduce effective contrast below the above ratios at any point behind the text's bounding box.
2. **Color is never the only signal.** Status (correct/incorrect answer, saved/error, active nav item, required field) must be conveyed by icon and/or text label in addition to color.
3. **Focus indicators:** every interactive element needs a clearly visible `:focus-visible` style, minimum 3:1 contrast against both its unfocused state and the adjacent background, not suppressed anywhere (`outline: none` without a replacement is forbidden). This includes antd components, which need the replacement wired through `ConfigProvider` tokens (`colorPrimary`/`controlOutline` etc.) or explicit `:focus-visible` CSS, not just the browser default.
4. **Keyboard operability:** everything clickable (including the nav `<button>`s in `menu.jsx`, modal close controls, table row actions, bulk-upload controls) must be reachable and operable by keyboard alone, in a sensible tab order, with visible focus at each step. Modals must trap focus and return it to the triggering element on close (verify antd `Modal` defaults achieve this; don't assume).
5. **Semantics & screen readers:**
   - Add proper landmarks: `<nav aria-label="Main">` for `menu.jsx`, `<header>`, `<main>`, `<footer>` as appropriate in `App.jsx`'s layout.
   - Add `aria-current="page"` (or `"true"`) to the active nav button in `menu.jsx`, in addition to the existing `active` class.
   - All form inputs across `login.jsx`, `register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `ForcePasswordChange.jsx`, `accountManager.jsx`, admin forms in `adminManager.jsx`/`adminSubjects.jsx` need a programmatically associated `<label>` (visible, not placeholder-only) and `aria-describedby` for help/error text.
   - Error messages must be announced: use `role="alert"` / `aria-live="polite"` (or antd's built-in `message`/`notification` + form validation, confirmed to be accessible) for async feedback — AI response generation, save confirmations, bulk upload results, password reset flows.
   - Decorative steampunk art (gear dividers, corner rivets, the gauge/robot imagery) must be `aria-hidden="true"` or implemented as CSS background images, never meaningful `<img>` without `alt`. Any image that *does* convey meaning (e.g. a chart in `AnalyticsModule.jsx`) needs a real text alternative or an accessible data table equivalent.
   - Heading hierarchy must be logical and non-skipping on every screen (`StudentInterface.jsx`, `AdminDashboard.jsx`, `AnalyticsModule.jsx` are the biggest files and most likely to have ad-hoc heading levels — audit each).
6. **Motion:** wrap all non-essential animation/transition (gear rotation, hover easing, gauge needle movement) in `@media (prefers-reduced-motion: reduce)` fallbacks that remove or drastically shorten motion.
7. **Target size:** interactive controls (nav buttons, table action icons, modal close buttons) at minimum ~44×44px hit area, even where the visible icon is smaller — pad via CSS, don't shrink the touch target to match a small decorative icon.
8. **Reflow/zoom:** layout must remain usable (no loss of content/function, no two-dimensional scrolling for vertical-reading content) at 400% zoom / 320px CSS width equivalent. Check the widest screens — `AdminDashboard.jsx`, `AnalyticsModule.jsx`, and the various management tables — as these are the most likely to break.
9. **Don't rely on `color-scheme: light dark`** (currently set in App.css:11) unless the app actually supports a real light mode with its own AA-checked token set. If light mode isn't going to be designed and tested in this pass, remove that declaration or force `color-scheme: dark` so the browser doesn't apply light-mode UI chrome (scrollbars, form controls) against a theme that was only designed for dark.

Treat §3 as the acceptance test suite for §4–§7, not as a separate pass done at the end.

---

## 4. Design tokens (do this before any component work)

Create a single source of truth and derive everything else from it.

1. **New file `src/styles/tokens.css`** (or a `:root` block at the top of a rewritten `App.css` if the agent prefers to keep one file — either is fine, but it must be *one* place) defining CSS custom properties for:
   - Color: `--color-ground-primary`, `--color-ground-elevated`, `--color-surface-paper`, `--color-brass-*` (base/hover/active/border), `--color-copper-*`, `--color-verdigris-*` (secondary accent), `--color-text-primary`, `--color-text-on-paper`, `--color-text-muted`, `--color-danger`, `--color-success`, `--color-warning`, `--color-focus-ring`. Every pairing that will be used as text-on-background must be listed next to its verified contrast ratio in a code comment, e.g. `/* brass-700 on ground-primary: 5.2:1 */`.
   - Type: `--font-display`, `--font-body`, a type scale (`--text-xs` … `--text-3xl`), line-height tokens.
   - Spacing: a consistent scale (`--space-1` … `--space-8`) to replace the ad-hoc px values scattered through App.css.
   - Radius, border width, shadow/elevation tokens (metallic-appropriate shadows — warm, not default Material gray).
   - Motion: `--duration-fast/base/slow`, `--easing-mechanical`, plus the `prefers-reduced-motion` override block.
2. **Wire antd to the same tokens** via a single `<ConfigProvider theme={{ token: {...}, components: {...} }}>` wrapping the app root (in `src/App.jsx` or `src/main.jsx` — check which currently owns the top-level render). Map `colorPrimary`, `colorLink`, `colorBgContainer`, `colorBorder`, `borderRadius`, `fontFamily`, `controlHeight`, and focus/outline-related tokens from the same CSS custom properties (or a parallel JS token object kept in sync — document the single source of truth either way). This is what fixes finding #6 in §1 and must happen **before** any per-component antd override CSS is written, or the agent will end up re-creating the same override-fighting problem it's trying to remove.
3. Only after tokens + antd theme exist should `App.css` be reworked component-by-component to consume `var(--token-name)` instead of hard-coded hex values.

---

## 5. Scope — files to touch

Primary:
- `src/App.css` (rework in place; consider splitting into `tokens.css` + `layout.css` + per-area partials if 5,400 lines in one file becomes unwieldy to review — agent's judgment, but keep it discoverable, not 20 tiny files)
- `index.html` (font `<link>`, confirm `<title>`/meta still correct, add `lang` already present)
- `src/App.jsx`, `src/main.jsx` (ConfigProvider placement, landmark structure: header/main/footer)
- `src/menu.jsx` (nav semantics — small file, do this early as a template for "what good looks like")
- `src/login.jsx`, `src/register.jsx`, `src/ForgotPassword.jsx`, `src/ResetPassword.jsx`, `src/ForcePasswordChange.jsx` (auth flows — high-traffic, form-heavy, good accessibility test bed)
- `src/StudentInterface.jsx`, `src/StudentProgress.jsx` (student-facing core product)
- `src/AdminDashboard.jsx`, `src/adminManager.jsx`, `src/adminSubjects.jsx`, `src/AccessControlTree.jsx`, `src/SchoolManager.jsx`, `src/DepartmentSettings.jsx` (admin surfaces — large, data-dense, lowest visual priority but still need token+a11y pass)
- `src/AnalyticsModule.jsx` (charts — needs text alternatives, likely the hardest a11y work in the app)
- `src/accountBlock.jsx`, `src/accountManager.jsx`, `src/AvatarManager.jsx`
- `src/RichTextEditor.jsx`, `src/RichTextContent.jsx` (Tiptap toolbar needs its own accessible-button audit)
- `src/PastAnswersViewer.jsx`, `src/SelectCountry.jsx`, `src/SelectLocale.jsx`, `src/cmFloatAd.jsx`

Assets:
- `public/images/` — audit existing art (gauges, gear sprites in `G-*.png`/`GA-*.png`, logo variants) for reuse as CSS decorative backgrounds before commissioning/generating anything new. Any new decorative art should match `docs/login-screen.png`'s style (metallic riveted line art on dark ground) so the brand stays coherent.

Out of scope (do not touch unless a design change requires a prop/behavior change, and even then keep changes minimal):
- `api/**` (PHP backend)
- Data/migration files, `deploy.*`, `.htaccess`
- Business logic / data fetching in the JSX files — this is a visual + accessibility pass, not a refactor. Preserve existing component props, state shape, and behavior exactly; only change markup where new semantic elements (`<nav>`, `<label>`, `aria-*`) or restructuring are required to meet §3.

---

## 6. Execution phases

Work in this order. Each phase should be a reviewable, working increment (app still builds and runs after each phase) — do not attempt this as one giant change.

**Phase 0 — Confirm before building: DONE.**
- Font-loading: Google Fonts CDN. Light mode: out of scope (dark-only). Antd: theme in place, not removed. See "Resolved decisions" at the top of this document.

**Phase 1 — Foundation (tokens + antd theme): DONE.**
- `src/styles/tokens.css` created per §4.1 — full color/type/spacing/radius/elevation/motion token set, with contrast ratios computed and documented inline for every text/background pairing defined (verified against the WCAG relative-luminance formula; e.g. `--color-text-primary` on `--color-ground-primary` ≈ 15.6:1, `--color-text-on-paper` on `--color-surface-paper` ≈ 13.1:1, button ink `--color-text-inverse` on `--color-brass-500` ≈ 7.3:1). These are calculated pairings, not eyeballed — still subject to the Phase 7 re-verification against actual rendered output.
- `ConfigProvider` wired in `src/main.jsx` using `theme.darkAlgorithm` + token overrides that reference the same CSS custom properties via `var(--token-name)`, so plain CSS and antd draw from one source.
- Vite-scaffold remnants in `App.css` (`:root`, `a`/`a:hover`, default `button`/`input`/`select`/`textarea`) replaced with token-driven base styles: brass emboss-gradient buttons with a dark-ink text color (7.3:1), parchment-surfaced form fields with brass borders, `h1`–`h3` set in the display font, visible `:focus-visible` rings on both (amber ring on dark surfaces, dark ring on parchment surfaces — see `--color-focus-ring` / `--color-focus-ring-on-paper` in tokens.css), 44px minimum control height.
- `prefers-reduced-motion` override block added in tokens.css.
- `color-scheme: dark` set explicitly (was `light dark` with no real light-mode support).
- Branding text updated (§0 above) in `index.html` and `src/cmFloatAd.jsx`.

**Phase 2 — Navigation & app shell: DONE.**
- `menu.jsx`: root element changed from `<div className="menu">` to `<nav className="menu" aria-label="Main">`; every nav button now gets `aria-current="page"` when it represents the active view (in addition to the existing `active` class).
- `App.jsx`: `app-header` wrapper changed to a `<header>` landmark; all view content wrapped in a `<main>` landmark; the purely decorative mascot robot image (duplicate of the branded logo already shown with meaningful alt text) marked `aria-hidden="true"` with an empty `alt=""` so screen readers don't announce it twice.
- `.steampunk-menu-bar`/`.steampunk-account-bar`/`.menu button`/`.account-block button` reskinned with the brass/copper material from tokens (brass borders, warm inset/emboss shadows, gunmetal gradient ground), keeping the existing riveted-rail pseudo-element construction (App.css, originally lines 467–494) as the starting structure. The active nav item is now marked by fill + border + a leading gear glyph + `aria-current`, not by color alone.
- `.auth-card`, `.login-container`, `.link-button`, `.secondary-button`, `.session-expiry-banner` tokenized in the same pass since they sit directly adjacent to the shell and the swap was a same-file, color-only change — their markup/ARIA work (labels, `aria-describedby`, live-region wiring beyond the session banner's existing `role="status"`) is still Phase 3 scope, not done here.
- This phase is the template: contrast, focus states, and keyboard nav patterns established here (brass button component, parchment input component, dual focus-ring tokens) are meant to be reused as-is in Phases 3–6, not reinvented per screen.

**Phase 3 — Auth flows: DONE.**
- `login.jsx`, `register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `ForcePasswordChange.jsx`: every `<label>`/`<input>` pair now has a matching `htmlFor`/`id`, and password fields carry the right `autoComplete` hint (`current-password` / `new-password` / `username`).
- `role="status" aria-live="polite"` added to every `.central-overlay-spinner` loading overlay (login, forgot-password, reset-password, forced password change) so "Logging in…" / "Validating link…" / "Updating password…" are announced to screen readers, not just shown visually.
- Page-level heading hierarchy fixed: `login.jsx` gets a visually-hidden (`.sr-only`) `<h1>` naming the page (covers the login form and the nested forgot-password/register sub-views); `ResetPassword.jsx` and `ForcePasswordChange.jsx` — both rendered as standalone top-level pages, not nested under the app shell — have their heading promoted from `<h2>` to `<h1>`.
- Decorative duplicate robot image in `login.jsx` marked `aria-hidden="true"` with empty `alt=""` (the title image above it already carries the meaningful brand name).
- CSS: `.form-group`, `.form-group-button`, `.password-field`/`.password-toggle`, `.little-button`, `.link-button`, `.secondary-button`, `.auth-card`, `.login-container`, `.login-header`, `.motd`, `.central-overlay-spinner`/`.spinner-text` retokenized. Found and fixed one real contrast bug in the process: `.little-button` ("Forgot password?") was rendering as a flat `#8e8e8e` grey pill with white text — now a brass-bordered pill matching the rest of the auth chrome, at verified contrast.
- **Deliberate scope guard:** `.form-group label` was *not* given a blanket brass color, because `.form-group` is also reused inside the light (`#fefefe`) admin modals that Phase 5 hasn't touched yet — brass-on-white would have failed contrast there. The brass label color is scoped to `.auth-card .form-group label` / `.login-container .form-group label` only. Phase 5 needs to either retokenize `.modal-content` itself or keep deciding label color per-surface like this — don't lift this scoping without checking the modal background first.
- `register.jsx` is dead code (registration is disabled in the product; the only trigger is commented out in `login.jsx`) — given the minimal-risk instruction in §5, it got the same label/id treatment as the live screens, but `SelectLocale.jsx`'s internal `<select>` was not wired up with an id/`aria-labelledby` since that would mean changing a shared component's prop signature for a path nothing currently reaches.
- Verified with `npm run build` and `npm run lint` after this phase — both clean.

**Phase 4 — Core student experience: DONE.**
- `StudentInterface.jsx`, `StudentProgress.jsx`, `PastAnswersViewer.jsx`, `RichTextEditor.jsx`, `RichTextContent.jsx`.
- **Cross-cutting token sweep:** found 39 uses of the unthemed Vite-default violet `#646cff` (plus its 14 `rgba(100, 108, 255, …)` tints) spread across student, past-answers and progress styling in `App.css` — globally replaced with `var(--color-brass-500)` / its rgba equivalent. This single swap retheme's most of the app's remaining "generic SaaS" accent color in one pass; grounds (`#1a1a1a`/`#242424`/`#333`), text grays and the success/warning greens in this same CSS region were retokenized alongside it.
- **Keyboard-access bug found and fixed:** `.question-item` (StudentInterface) and `.past-response-item` (PastAnswersViewer) were `<div onClick>` cards with no `tabIndex`, no `role`, no keydown handler — completely unreachable by keyboard (WCAG 2.1.1, Level A). Both now have `role="button"`, `tabIndex={0}`, Enter/Space activation, an `aria-label`, and a visible `:focus-visible` ring.
- **Two custom modals given real dialog semantics:** the in-React "Answer Question" modal (`StudentInterface.jsx`) and "Review Past Answer" modal (`PastAnswersViewer.jsx`) now carry `role="dialog"`/`aria-modal`/`aria-labelledby`, trap Tab focus, close on Escape, focus themselves on open, and restore focus to whatever triggered them on close.
- **The AI-feedback modal** (`showAIFeedback` in `StudentInterface.jsx`) is hand-built with raw DOM (`document.createElement`/`innerHTML`) because it must outlive the answer modal's own unmount — it got the same dialog role/focus-trap/Escape/focus-restore treatment, written in vanilla JS/DOM APIs to match.
- **Canvas chart given a text alternative:** `StudentProgressChart`'s hand-drawn `<canvas>` RAG bar chart (weekly red/amber/green counts) had zero screen-reader-accessible content — canvas pixels convey nothing to AT. Added `role="img"` + `aria-label` on the canvas and a visually-hidden (`.sr-only`) data table with the same weekly red/amber/green counts, generated from the same `buildWeeklyCounts()` data the canvas draws from.
- Loading spinners across all four files now use `role="status" aria-live="polite"` with an `.sr-only` text label (previously bare `<Spin>` with no screen-reader announcement, or a visual-only spinner-text div).
- `.rich-text-blocked-msg` (the anti-paste "Pasting is not allowed" notice) now has `role="alert"` — previously a student using a screen reader who tried to paste would get no feedback that the action was blocked. Toolbar buttons gained `aria-pressed` for their toggle state (Bold/Italic/lists/etc.).
- Decorative emoji (🎲, 📎, ✕, →, ✓) wrapped in `aria-hidden="true"` spans throughout so they don't get read aloud ("game die", "paperclip"...) ahead of their text labels.
- `.btn-primary`/`.btn-secondary` — found and fixed a latent styling bug while touching this: these two classes are used on both `<button>` and `<a download>` elements (file attachment downloads), but had **zero CSS definition anywhere in the app** before this phase, so they silently relied on the bare `button` element selector for all their box styling — which an `<a>` doesn't inherit. Gave both classes complete standalone styles (padding/border/radius/focus ring) so download links render as visible, affordant buttons instead of unstyled text.
- Fixed a tiny-text bug: `.answer-modal-body`/`.question-section` had `font-size: 0.6em` (~9.6px) as their base size — below the plan's 16px minimum (§2.2) — set to `1em`; explicit child font-sizes (18px question/answer text) were unaffected.
- Teacher RAG-rating colors (red/amber/green) in `PastAnswersViewer.jsx` retokenized to `--color-danger`/`--color-warning`/`--color-success`; already paired with an explicit text label ("Needs Improvement"/"Good Progress"/"Excellent") so this was a token-consistency fix, not a new color-contrast-alone issue.
- Verified with `npm run build` (clean) and `npm run lint` after this phase.

**Phase 5 — Admin & management surfaces: DONE.**
- `AdminDashboard.jsx`, `adminManager.jsx`, `adminSubjects.jsx`, `AccessControlTree.jsx`, `SchoolManager.jsx`, `DepartmentSettings.jsx`, `accountManager.jsx`, `AvatarManager.jsx` — by far the largest phase (`adminManager.jsx` + `adminSubjects.jsx` alone are ~3,900 lines).
- **Generic modal fix instead of hand-wiring ~20 dialogs:** these admin screens share one plain `.modal`/`.modal-content`/`.close` dialog pattern, repeated in ~20 separate conditionally-rendered blocks across 3 files. Hand-adding a React focus-trap to each would have been a huge, repetitive change. Instead, added `src/utils/genericModalA11y.js` — a small DOM-observer-based module (`MutationObserver` + a document-level keydown handler), initialized once in `main.jsx`, that gives *every* `.modal` dialog in the app role="dialog"/aria-modal, an aria-label pulled from its own heading, focus-on-open, Tab-trapping, Escape-to-close, and focus restoration — without touching the ~20 call sites' render logic. Dialogs that already had bespoke React-level focus-trap code from Phase 4 (`.answer-modal` in StudentInterface/PastAnswersViewer) are untouched by this; `AdminDashboard.jsx`'s own `.answer-modal` instance (a separate component, same CSS classes) got the same bespoke treatment directly since the generic script only watches `.modal`, not `.answer-modal`.
- Every one of the ~20 `<span className="close" onClick=...>` dismiss controls (across `adminManager.jsx`, `adminSubjects.jsx`, `SchoolManager.jsx`) converted to real `<button aria-label="Close">` — spans with onClick are not keyboard-reachable at all.
- **Keyboard-trap bug found and fixed in `adminSubjects.jsx`:** the quiz-builder's question-row "click to edit" div (`.question-link`) had the same unreachable-by-keyboard issue as Phase 4's `.question-item` — fixed the same way (role="button", tabIndex, Enter/Space). Same fix applied to `AdminDashboard.jsx`'s filters-header disclosure toggle and its response-list row click targets.
- **Systemic unlabeled-form-field pattern:** both admin files (and `accountManager.jsx`) build forms as `<table><tr><td>Label text</td><td><input/></td></tr></table>` — visually a label, but with zero programmatic association, so a screen reader announces "edit text, blank" with no field name. Added `<label htmlFor>`/matching `id` pairs to every such field reached in this phase: Add/Edit User, Class management, Message Users, filter bar (`adminManager.jsx`); the Add/Edit School-Admin modal (`SchoolManager.jsx`); the account profile form (`accountManager.jsx`, now also using `<th scope="row">` for its read-only summary rows). Where the field is read-only reference info rather than a form label (e.g. Locale/Avatar rows next to a sub-component with no `id` to target), left as visual-only text — same documented limitation as `SelectLocale` in Phase 3.
- **Cross-cutting CSS retheme, found while fixing the above:** the shared `.modal-content` was still the Vite-scaffold `#fefefe` white box with black text — now dark (`--color-ground-raised`) to match the rest of the app. That single change would have broken every data **table** rendered inside a modal (tables relied on inheriting dark-on-light text from the old white modal), so `table`/`th`/`td` were deliberately redesigned as a **self-contained parchment "ledger"** (light rows, explicit dark ink text, brass rule lines) that looks correct regardless of whether it sits on the dark page or inside a dark modal — this is now a documented pattern (see inline comment in `App.css`) for Phase 6 to reuse rather than reinvent. The same inherited-dark-text trap was caught and fixed in three other spots while retheming: `.message-individual-list` (light sub-panel), `.message-body-textarea`, and `AvatarManager`'s preview caption — each would have become invisible-on-dark if left as "inherit".
- Found and fixed two more leftover stock-SaaS-gradient buttons the original `#646cff` sweep didn't catch (different hex, `#535bf2`/`#667eea`/`#764ba2`/`#0e4fdb` — Vite-default and plain Bootstrap-blue variants): `adminSubjects.jsx`'s **Random Question** button (shared CSS class also used by the student-facing practice screen from Phase 4, so that screen is now correctly on-brand too) and its Bulk-Upload-Questions button, now brass/copper and verdigris respectively.
- RAG/teacher-rating red/amber/green color coding (`AdminDashboard.jsx`, admin action-button hover states) retokenized to `--color-danger`/`--color-warning`/`--color-success`/`--color-verdigris-*` — all of it was already paired with a text label, so this was token-consistency work, not new contrast fixes.
- `aria-expanded` added to the three disclosure-toggle buttons that didn't already have it (`adminSubjects.jsx` statistics toggle; `AdminDashboard.jsx` filters header); `adminSubjects.jsx`'s own backup-data toggle already had it correctly.
- Icon-only buttons (reorder ↑/↓, delete 🗑️, avatar lightbox trigger) given `aria-label`; decorative emoji/arrows wrapped `aria-hidden`.
- Verified with `npm run build` (clean) and `npm run lint` after this phase.

**Known gap carried forward, not silently dropped:** the `<td>Label</td><td><input/></td>` unlabeled-field pattern almost certainly recurs in parts of `adminManager.jsx`/`adminSubjects.jsx` not directly touched in this pass (every modal actually opened and read was fixed, but these are ~1,900-line files each) — worth a dedicated grep-and-fix sweep (`grep -n '<td>[A-Z]' src/adminManager.jsx src/adminSubjects.jsx`) during Phase 7 QA rather than assuming this phase caught every instance.

**Not yet done:** Phases 6–8 — analytics, and the full accessibility/visual QA passes.

**Known limitation on verification:** no browser automation is available in the execution environment (no `chromium-cli`, no Playwright installed in this project, no connected browser extension), so visual rendering and the screen-reader/keyboard walkthroughs in Phase 7 have not actually been performed — only build/lint and manual code review. Treat Phases 1–3 as implemented-but-visually-unverified until someone checks them in a real browser.

**Phase 3 — Auth flows (login/register/password reset):**
- Apply tokens + antd theme to forms; add labels/`aria-describedby`/live-region error announcements per §3.5.
- These are self-contained, lower-risk screens — good place to validate the component patterns (buttons, inputs, cards) before rolling them out everywhere.

**Phase 4 — Core student experience:**
- `StudentInterface.jsx`, `StudentProgress.jsx`, `RichTextContent.jsx`/`RichTextEditor.jsx`, `PastAnswersViewer.jsx`.
- This is the highest-traffic surface for the app's actual end users (students) — prioritize correctness of contrast, focus, and status-not-color-alone here especially for right/wrong answer feedback.

**Phase 5 — Admin & management surfaces:**
- `AdminDashboard.jsx`, `adminManager.jsx`, `adminSubjects.jsx`, `AccessControlTree.jsx`, `SchoolManager.jsx`, `DepartmentSettings.jsx`, `accountManager.jsx`, `AvatarManager.jsx`.
- These are large, table/form-heavy, and lower visual priority but same accessibility bar. Reuse Phase 1–3 component patterns rather than inventing new ones per screen.

**Phase 6 — Analytics:**
- `AnalyticsModule.jsx` — hardest file (1,296 lines, charts). Needs: accessible chart alternatives (data tables or summarized text), legible-at-small-size steampunk-styled chart colors that still meet 3:1 against chart backgrounds, and keyboard/screen-reader access to any interactive chart controls (filters, date ranges).

**Phase 7 — Full accessibility QA pass:**
- Run automated checks (axe DevTools or equivalent) across every screen listed in §5 and fix findings.
- Manual keyboard-only walkthrough of every primary flow (login → take quiz → view progress; admin login → create question → view analytics).
- Manual screen reader smoke test (NVDA or VoiceOver) of: nav, login form with a validation error, one quiz question answer-and-feedback cycle, one admin table row action, one modal open/close.
- Verify 400% zoom / 320px reflow on the three widest screens (AdminDashboard, AnalyticsModule, adminSubjects table views).
- Re-verify every token contrast pairing against final rendered output, not just the token definition (gradients/overlays can shift effective contrast).

**Phase 8 — Visual QA pass:**
- Side-by-side review against `docs/login-screen.png` for brand coherence — does the shipped UI actually look like it belongs with that lockup?
- Confirm no leftover generic-SaaS-gradient remnants (App.css:1141/1160/3284-style violet/green gradients) remain anywhere.
- Confirm consistent use of the type scale, spacing scale, and radius scale — no new ad-hoc magic numbers introduced during the overhaul.

---

## 7. Acceptance criteria (definition of done)

- [ ] No hard-coded color/spacing/font values remain in component CSS outside `tokens.css` (or token-equivalent) — everything traces to a token.
- [ ] `ConfigProvider` theme is wired and antd components visually match the steampunk palette without per-component override hacks fighting antd specificity.
- [ ] Every text/background pairing in actual rendered UI meets WCAG 2.1 AA contrast (verified, not assumed).
- [ ] Every interactive element has a visible, ≥3:1 `:focus-visible` indicator.
- [ ] Full keyboard operability confirmed on every primary flow listed in Phase 7.
- [ ] Screen reader smoke test in Phase 7 passes with no missing labels, no unannounced errors, no unlabeled icon-only buttons.
- [ ] `prefers-reduced-motion` respected everywhere motion was added.
- [ ] No color-only status indicators remain.
- [ ] Build (`npm run build`) succeeds, `npm run lint` passes, app runs via `npm run dev` with no new console errors.
- [ ] Visual result is recognizably the same product as `docs/login-screen.png`'s brand language, across every screen in §5, not just the login page.

---

## 8. Open questions for the user (resolved — see "Resolved decisions" at the top)

1. ~~Font delivery~~ → Google Fonts CDN.
2. ~~Light theme in scope?~~ → No, dark-only.
3. Any existing steampunk source art (vector/PSD) beyond what's in `public/images/` and `docs/login-screen.png` that should be reused rather than redrawn? **Still open** — not asked yet; raise before Phase 6 (Analytics) if new decorative art is needed, since `public/images/` has gear sprites (`G-*.png`/`GA-*.png`) that may already cover it.
4. Any screens explicitly out of scope for this round (e.g. defer `AnalyticsModule.jsx` to a follow-up given its size)? **Still open** — not asked yet; raise before starting Phase 5/6.
