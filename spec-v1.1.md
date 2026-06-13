# System Map — Polish Pass (v1.1)

Follow-on spec for the existing app. Stack and design tokens from the original spec still apply.

Same ground rules: TS strict, no `any`, commit per phase, ask before substituting libraries.

---

## Priority order

The first three deliver the most usability per hour of work. Do them in this order, commit at the end of each, and check in before moving past Phase 3.

1. **Export** — PNG, SVG, JSON
2. **Auto-layout** — one-click tidy
3. **Focus mode** — connection highlighting on hover/selection
4. Command palette (Cmd+K)
5. Per-node customization
6. Smart edge routing
7. Presentation mode
8. Minor wins (URL deep-link, stats, orphan detection)

---

## 1. Export

Add an "Export" dropdown to the top toolbar (between the view selector and the layer panel). Three options:

### PNG export
- Use `html-to-image` (lighter and more reliable than `dom-to-image` or `html2canvas` for React Flow).
- Capture the React Flow viewport node, NOT the whole window.
- Render at 2× pixel ratio for retina sharpness.
- Temporarily hide React Flow controls, minimap, and the watermark wrapper before capture; restore after.
- Compute the bounding box of all visible nodes and pad 64px on each side — don't capture the whole infinite canvas.
- Add a 32px white margin around the rendered image.
- Filename: `{diagram-slug}-{YYYY-MM-DD}.png`

### SVG export
- React Flow has a built-in approach: get all visible nodes/edges, render them into a fresh SVG with inline styles (CSS variables must be resolved to actual hex values — `getComputedStyle` on the root and substitute).
- Same bounding-box + 64px pad logic as PNG.
- Output should open cleanly in Figma and Illustrator. Test this — it's the #1 failure point. Common issues: web fonts not embedded (embed Geist as base64 in a `<style>` block inside the SVG), `foreignObject` elements (avoid — re-render node labels as plain `<text>` elements).
- Filename: `{diagram-slug}-{YYYY-MM-DD}.svg`

### JSON export
- The full diagram state: `{ diagram, layers, nodes, edges, views }`.
- Include a `version: "1.0"` field at the root so future imports can migrate.
- Pretty-print with 2-space indent.
- Filename: `{diagram-slug}-{YYYY-MM-DD}.json`

### UI
- Dropdown menu (shadcn `DropdownMenu`), trigger is a button labelled "Export" with a `Download` icon.
- Each option shows the format name + a tiny muted description ("Raster image" / "Vector image" / "Backup file").
- On click, generate the file client-side, trigger download, show a toast on success.

### Don't (yet)
- PDF export — adds 200KB+ of deps (jspdf or pdf-lib), wait until asked.
- Server-side rendering for exports — overkill, client-side is fine.

---

## 2. Auto-layout

Add a "Tidy" button to the zoom controls cluster (bottom-left). Icon: `Sparkles` or `LayoutGrid` from lucide.

### Algorithm
- Use **ELK.js** (`elkjs`) with the `layered` algorithm. Cleaner output than dagre for this use case, especially with grouped/nested nodes.
- Direction: left-to-right (`elk.direction: 'RIGHT'`).
- Node-to-node spacing: 80px horizontal, 50px vertical.
- Layer spacing (ELK's notion of layer, not our user-facing layers): 120px.
- Respect `group` parent nodes — they should contain their children.

### Behaviour
- Animate node positions to their new spots over 400ms using React Flow's built-in transitions. Set `position` for each node — RF interpolates if `animateMove` is enabled, otherwise wrap in a transition.
- If a user has manually positioned nodes, tidy overwrites — but show a small toast: "Layout applied" with an "Undo" action (uses the existing Cmd+Z stack).
- Tidy applies to **only visible nodes** (respects current view filter and layer visibility). Hidden nodes keep their stored positions.
- After tidy, fit-to-view (Cmd+0 behaviour) so the whole layout is on screen.

### Optional: per-layer tidy
- Right-click a layer in the layer panel → "Tidy this layer" — runs ELK on just that layer's nodes, leaving others alone.

---

## 3. Focus mode (connection highlighting)

When the user **hovers a node or selects one**, dim everything that isn't directly connected.

### Behaviour
- On node hover (200ms delay to avoid flicker on quick mouse-throughs):
  - Compute the set of connected nodes (1-hop: direct neighbours) and edges
  - Connected nodes: full opacity, 1.5px accent ring (subtle, not the selection outline)
  - Hovered node: standard selected styling
  - Everything else: 25% opacity
- On node click/selection: same effect but persists until deselection or click on empty canvas.
- Toggle via keyboard: `F` toggles focus mode on/off as a setting (when off, hover does nothing).
- The dim transition is 120ms ease-out (matches existing animation tokens).

### Implementation
- Don't manipulate individual node/edge React state — use a CSS class on the React Flow wrapper (`focus-mode-active`) and CSS selectors with `data-` attributes (`data-focused="true"`) on the relevant nodes/edges.
- Compute connected sets once on hover/select, store in `uiStore`, let CSS do the rendering work.

### Optional 2-hop variant
- Hold `Shift` while hovering to extend focus to 2-hop neighbours (neighbours-of-neighbours, slightly more dimmed than 1-hop).

---

## 4. Command palette (Cmd+K)

Trigger: `Cmd+K` / `Ctrl+K`. Use shadcn's `Command` component (cmdk under the hood).

### What's in it
- **Nodes**: every node by label. Selecting one selects the node and centers it (`fitView({ nodes: [n], duration: 400 })`).
- **Layers**: jump to a layer (highlights its nodes briefly via focus mode).
- **Actions**: `New node…` (opens a submenu of node types — same as the palette), `Tidy layout`, `Toggle focus mode`, `Export as PNG/SVG/JSON`, `Toggle grid`, `Toggle minimap`, `Save view as…`.
- **Views**: switch to any saved view.

### UX
- Section headers: NODES, LAYERS, ACTIONS, VIEWS.
- Recently-used items float to the top within each section (persist to localStorage, scoped per diagram).
- Keyboard nav: arrows, enter, escape. Mouse also works.

---

## 5. Per-node customization

Right now custom nodes can pick a color but built-in types are fixed. Loosen this without making everything look like a unicorn vomited on the canvas.

### Inspector additions (NodeInspector.tsx)
Add a collapsible "Appearance" section to every node type:

- **Accent color**: 8 preset swatches (the flow colors from §10 of the original spec + 2-3 neutrals) + a "default" option that uses the layer color. NOT a free color picker — too much rope.
- **Icon**: 
  - For `app` nodes: paste a logo URL OR pick from a built-in set of ~20 common SaaS logos (Stripe, Notion, Slack, Linear, Figma, etc. — use Simple Icons CDN: `https://cdn.simpleicons.org/{slug}`). Validate it's a reachable image before saving.
  - For other types: pick from ~30 lucide icons (Database, Server, Globe, Users, Building, etc.).
  - Default: type's default icon.
- **Size**: Small / Medium / Large — affects min-width and font size, not the actual content. Useful for visual hierarchy (mark important nodes Large).

### Storage
- Add to `NodeData.appearance: { accentColor?: string, iconKey?: string, iconUrl?: string, size?: 'sm' | 'md' | 'lg' }` in the existing jsonb column. No schema migration needed.

### Don't
- Don't add font controls, border styles, or custom backgrounds. The whole point of fixed types is consistency — let users break out via the `custom` node type if they need full control.

---

## 6. Smart edge routing

Currently edges go straight line / default bezier and will cross nodes when the graph gets dense.

### Behaviour
- Switch default edge type to React Flow's `smoothstep` for `data`, `api`, `event` flows (right-angled with rounded corners — reads well for system diagrams).
- Keep `bezier` for `cash` and `manual` flows (curvy lines suggest informal/people-driven flows, which is correct for those types).
- Add edge routing that avoids crossing nodes — use the `@xyflow/react` v12 edge path utilities + a small custom routing function that nudges control points to avoid node bounding boxes. If this gets gnarly, fall back to letting users manually add an intermediate waypoint via double-click on an edge.

### Edge style per-edge override
- In EdgeInspector, add a "Style" dropdown: Bezier / Smoothstep / Straight / Step. Default = flow-type default.

---

## 7. Presentation mode

A clean read-only view for showing the diagram to stakeholders. Trigger via a `Play` icon button in the top bar or `Cmd+Shift+P`.

### Behaviour
- Hide: left palette, right inspector, top bar (except a small floating exit pill top-right: "Exit presentation · Esc").
- Show: canvas full-bleed, a minimal floating toolbar bottom-center with zoom, fit, and view switcher.
- Disable: dragging nodes, creating edges, all editing. Clicks on nodes still open a read-only inspector overlay (small floating card showing description + fields, no edit controls).
- The canvas background stays the same — don't switch to dark mode or anything dramatic.

### Optional: walkthrough
- Save a sequence of "stops" (node IDs in order) as part of a view.
- In presentation mode, arrow keys advance through stops, centering and focus-mode-highlighting each.

---

## 8. Minor wins (do all of these in one phase)

### URL deep-linking
- Selecting a node updates the URL to `/diagrams/:id?node=:nodeId`.
- Loading a URL with `?node=` selects that node and centers it.
- Saved views: `?view=:viewId` applies the view.
- Use `useSearchParams` from React Router, debounce updates by 200ms.

### Diagram stats
- In `DiagramInspector` (the inspector when nothing is selected), show: node count, edge count, layer count, view count. Plus breakdown: count by node type, count by flow type.
- Small, muted text — this is reference, not a feature.

### Orphan detection
- "Find orphans" button in the diagram inspector. Highlights (using focus mode) all nodes with zero edges. Useful for cleanup.

### Inline rename
- Double-click any node to inline-edit its label without opening the inspector. Enter to commit, Escape to cancel.

### Better drag-from-palette feedback
- While dragging from palette, show a ghost of the node following the cursor (not just the default browser drag image, which looks like a tiny screenshot).
- Highlight valid drop zones (anywhere on the canvas) with a subtle accent-soft tint on the canvas background.

---

## 9. Don't do these

Explicitly out of scope for this polish pass:
- Real-time collaboration
- Comments / annotations (sticky notes etc.)
- Templates / starter diagrams (mentioned in original "Later" — still later)
- Version history
- Public share links
- Mobile / touch support
- Dark mode (later, do it properly with full token set — not a one-line CSS variable swap)

---

## 10. Acceptance check

After all 8 phases:

1. Open an existing diagram, hit Tidy → nodes rearrange cleanly, no overlaps, fit-to-view animates in
2. Hover a node → unconnected nodes dim, connections stay sharp
3. `Cmd+K` → type "billing" → it finds the billing-svc node and centers it
4. Click a node, change accent color to emerald → updates immediately, persists after refresh
5. Export as PNG → file downloads, opens in Preview, looks identical to canvas, no UI chrome
6. Export as SVG → opens in Figma, fonts render correctly, no broken elements
7. Export as JSON → file is valid, includes all entities, has version field
8. `Cmd+Shift+P` → presentation mode, palette/inspector gone, can still pan/zoom, Esc exits
9. Copy the URL while a node is selected, open in new tab → same node selected and centered
10. Empty diagram → "Find orphans" highlights nothing; busy diagram with one disconnected node → that node lights up

If all 10 pass: ship the polish pass.
