# DESIGN.md: Seev Workspace — Firecrawl-inspired

## Source

- Visual references: two authenticated Firecrawl dashboard screenshots supplied by the product owner.
- Public reference: https://firecrawl.dev/app (redirects to sign-in when unauthenticated).
- Capture date: 2026-08-12.
- Evidence: Firecrawl branding extraction, public sign-in capture, and the supplied dashboard screenshots.

## Reference Screenshots

![Firecrawl dashboard overview](/tmp/codex-clipboard-92eee4c6-f4e8-4835-8f34-710811cbe5d8.png)

![Firecrawl search workspace](/tmp/codex-clipboard-59c224a4-1b01-4982-aa69-77fcfeaaa4a7.png)

Use these screenshots for density, borders, grid junctions, navigation hierarchy, and panel composition. Do not copy Firecrawl branding, copy, dark theme, or constrained content width.

## Design Summary

Seev is a dense, light-mode research workspace. It borrows Firecrawl's technical grid, compact controls, hairline borders, and modular panels while preserving Seev's green accent and Vietnamese product voice. Content fills the available viewport; large decorative margins and isolated floating cards are avoided.

## Design Tokens

### Colors

- Canvas: `#fcfcfb`
- Surface: `#ffffff`
- Surface muted: `#f6f7f6`
- Ink: `#27272a`
- Muted ink: `#71717a`
- Hairline: `#e4e4e7`
- Strong hairline: `#d4d4d8`
- Seev primary: `#16825d`
- Seev primary hover: `#106c4d`
- Seev tint: `#eaf7f1`
- Destructive: `#dc2626`

### Typography

- Primary: Geist Variable, system sans fallback.
- Page title: 20–24px, 600 weight, tight tracking.
- Section title: 15–18px, 600 weight.
- Body/control: 13–14px.
- Metadata/labels: 11–12px; uppercase only for navigation group labels.

### Spacing And Layout

- Base unit: 4px.
- Desktop sidebar: 224px expanded, 52px collapsed.
- Topbar: 52px.
- Content: full available width; no global `max-width`.
- Standard page padding: 16px desktop, 12px compact/mobile.
- Panel padding: 16–20px.
- Standard radius: 8px; small controls 6px; pills only for statuses/tags.
- Shadows are exceptional. Hierarchy comes from borders, tint, and layout.
- Grid junctions use short crossing strokes at section boundaries.

## Components

- Sidebar: quiet white surface, slim border, compact icon rows, green-tinted active state.
- Topbar: full-width bordered strip with sidebar trigger, current workspace context, notifications, and account menu.
- Page header: a bordered band with eyebrow, title, optional description, and actions.
- Grid panel: square-ish bordered surface with reusable junction marks; can be divided into cells without nested floating cards.
- Controls: 36px high, 6–8px radius, visible border, white background.
- Primary button: green, compact, 8px radius. Secondary button: white with hairline border.
- Cards/lists: dense, border-separated rows; hover changes background and border, not large elevation.
- Empty states: embedded in the surrounding grid, not a detached oversized card.

## Page Patterns

- Dashboard: page header band, compact workflow shortcuts, then operational context/help.
- Research new: two-column mode selector; selected mode becomes a structured form panel with labeled cells.
- CV library: filter band followed by a responsive dense document grid.
- Research history: all filters live in one control band; sessions render as border-separated records.
- Detail/research results: preserve the full-width split layout and use the same panels, borders, and density.
- Mobile: sidebar becomes a sheet, grids stack, border junctions remain subtle, actions wrap without horizontal overflow.

## Content Style

- Direct Vietnamese labels, short operational descriptions, no marketing prose inside the workspace.
- Prefer concrete action labels: “Research mới”, “Tải CV lên”, “Xem kết quả”.
- Status and metadata stay visually secondary.

## Agent Build Instructions

1. Consume semantic CSS variables and shared primitives; do not introduce page-specific color/radius values.
2. Use `page-shell`, `page-band`, `grid-panel`, `control-band`, and `grid-cell` as the common composition vocabulary.
3. Keep all authenticated pages fluid-width.
4. Use green only for primary actions, active navigation, progress, and positive states.
5. Do not add dark mode, orange Firecrawl branding, large floating rounded cards, or global max-width containers.
6. Prefer dividers and grid cells over nested cards.

## Rerun Inputs

```yaml
workflow: firecrawl-website-design-clone
source_url: https://firecrawl.dev/app
target_stack: React 19, TypeScript, Tailwind CSS 4, Base UI
output: DESIGN.md + implementation
```
