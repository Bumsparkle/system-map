# System Map — Build Spec

A canvas-based tool for diagramming how a company's apps, systems, data, and money fit together. Like draw.io / Figma but purpose-built for company architecture, with typed flows and layered views.

---

## 0. Project ground rules for Claude Code

- **Stack is fixed.** Don't substitute. If a library on this list doesn't exist or breaks, ask.
- **Don't ship a stock shadcn demo.** Theme tokens, type, and node design are spec'd in §10. Use them.
- **MVP scope is §11.** Anything in "Later" is out of scope unless I explicitly ask.
- **TypeScript strict mode on, no `any`.** Use `unknown` + narrowing.
- **Commit per phase** in §12 so I can review increments.
- **No backend auth in MVP** — single hardcoded user, but design the DB schema so adding auth later is a migration, not a rewrite.

---

## 1. What it is

A web app where you drag nodes from a left palette onto a canvas to map out:

- The SaaS apps a company uses (Slack, Notion, Stripe, etc.)
- Internal systems (in-house tools, databases)
- External entities (customers, vendors, partners)
- Data sources and sinks
- Cash sources and sinks

…and you connect them with **typed flows** (data, cash, API, manual, event).

A diagram has multiple **layers** (e.g. "Infrastructure", "Finance", "Customer-facing"), each containing nodes/edges. You toggle layer visibility independently.

A diagram also has multiple **views** — saved filter presets, e.g. "High-level overview" hides the integration layer and groups apps by function; "Detailed integrations" shows every API edge.

Clicking any node opens a right-side inspector with editable metadata and free-form notes.

---

## 2. Stack

### Frontend
- **React 18** + **Vite** + **TypeScript** (strict)
- **React Flow (xyflow) v12** — canvas, node/edge primitives
- **shadcn/ui** + **Tailwind CSS v4** — UI primitives
- **Zustand** — global state (React Flow uses it under the hood; align with that)
- **TanStack Query** — server state, caching, optimistic updates
- **React Router v6** — routing
- **Lucide React** — icons
- **react-hotkeys-hook** — keyboard shortcuts
- **nanoid** — client-side ID generation

### Backend
- **Node.js 20+** + **Fastify** + **TypeScript**
- **Drizzle ORM** + **Postgres** (use `postgres-js` driver)
- **Zod** — request validation, shared schemas with frontend
- **Pino** — logging (Fastify default)

### Tooling
- **pnpm** — package manager
- **Turborepo** — monorepo (apps/web, apps/api, packages/shared)
- **Biome** — lint + format (faster than ESLint+Prettier, less config)
- **Docker Compose** — local Postgres only, not the app

### Why these (so you don't sub them):
- React Flow v12 has the cleanest custom-node API and best perf for >100 node graphs.
- Drizzle over Prisma: lighter, no codegen step, type inference is excellent.
- Fastify over Express: faster, native schema validation, better TS.
- Biome over ESLint+Prettier: one tool, way faster.

---

## 3. Repo layout

```
system-map/
├── apps/
│   ├── web/                    # React app
│   │   ├── src/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── api/                    # Fastify server
│       ├── src/
│       ├── drizzle.config.ts
│       └── package.json
├── packages/
│   └── shared/                 # Shared Zod schemas + types
│       ├── src/
│       │   ├── schemas.ts
│       │   └── index.ts
│       └── package.json
├── docker-compose.yml          # Postgres only
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
└── README.md
```

---

## 4. Data model

All entities use `nanoid()` string IDs (not UUIDs — shorter, URL-friendly).

### Tables (Drizzle schema)

```ts
// companies (workspaces — one user can have many)
companies {
  id: text PK
  name: text NOT NULL
  slug: text UNIQUE NOT NULL
  created_at: timestamp
  updated_at: timestamp
}

// diagrams (a map belongs to a company)
diagrams {
  id: text PK
  company_id: text FK → companies.id
  name: text NOT NULL
  description: text
  created_at: timestamp
  updated_at: timestamp
}

// layers (each diagram has 1+ layers; nodes/edges live on one)
layers {
  id: text PK
  diagram_id: text FK → diagrams.id
  name: text NOT NULL
  color: text NOT NULL  // hex, for layer indicator
  order: integer NOT NULL
  visible: boolean DEFAULT true  // user toggle, persisted
}

// nodes
nodes {
  id: text PK
  diagram_id: text FK → diagrams.id
  layer_id: text FK → layers.id
  type: text NOT NULL  // 'app' | 'system' | 'data_source' | 'external_entity' | 'cash' | 'group' | 'custom'
  position_x: real NOT NULL
  position_y: real NOT NULL
  width: real
  height: real
  data: jsonb NOT NULL  // { label, description, iconUrl, category, fields: Record<string, string>, color? }
  created_at: timestamp
  updated_at: timestamp
}

// edges
edges {
  id: text PK
  diagram_id: text FK → diagrams.id
  source_node_id: text FK → nodes.id
  target_node_id: text FK → nodes.id
  source_handle: text   // 'top' | 'right' | 'bottom' | 'left'
  target_handle: text
  flow_type: text NOT NULL  // 'data' | 'cash' | 'api' | 'manual' | 'event' | 'custom'
  label: text
  data: jsonb  // { direction: 'one_way' | 'two_way', frequency?, volume?, notes? }
}

// views (saved filter presets)
views {
  id: text PK
  diagram_id: text FK → diagrams.id
  name: text NOT NULL
  filter: jsonb NOT NULL  // { layerIds: string[], flowTypes: string[], nodeTypes: string[], groupBy?: 'category' | 'layer' }
  is_default: boolean DEFAULT false
}
```

### Shared types (`packages/shared/src/schemas.ts`)

Define Zod schemas for every entity. Export inferred TS types. Both apps import from `@system-map/shared`. **Do not duplicate types across frontend/backend.**

---

## 5. Node types (built-in)

Each type has its own React component in `apps/web/src/components/canvas/nodes/`. All extend a common `BaseNode` for consistent styling.

| Type | Use | Distinct visual |
|---|---|---|
| `app` | A SaaS app (Slack, Stripe) | Logo + name, soft shadow, rounded-md |
| `system` | Internal tool or service | Mono-spaced label, slightly squared corners |
| `data_source` | DB, CSV feed, API | Cylinder accent on left edge |
| `external_entity` | Customer, vendor, partner | Dashed border |
| `cash` | Revenue or expense source | Subtle green (rev) or red (cost) edge accent, £ symbol |
| `group` | Container for nodes (department/function) | Translucent background, expandable, accepts children |
| `custom` | Free-form | User picks color, icon, label |

**MVP scope:** ship all 7 types but custom is the fallback when others don't fit. Don't try to be exhaustive — these cover ~95% of mapping needs.

### Node data shape (in `nodes.data` jsonb)

```ts
type NodeData = {
  label: string
  description?: string
  iconUrl?: string         // for app nodes, fetched from logo.dev or user-provided
  category?: string        // 'communication' | 'finance' | 'crm' | ... (free string)
  fields: Record<string, string>  // user-defined key/value pairs shown in inspector
  color?: string           // override accent for custom nodes
}
```

---

## 6. Edge / flow types

| Type | Stroke | Animation | Default arrow |
|---|---|---|---|
| `data` | Solid, 2px, slate-500 | None | → |
| `cash` | Solid, 2.5px, emerald-600 | None | → |
| `api` | Solid, 2px, indigo-500 | Animated dashes | ⇄ if two-way |
| `manual` | Dashed 4-4, 2px, amber-600 | None | → |
| `event` | Dotted, 2px, fuchsia-500 | Animated dashes | → |
| `custom` | User picks | User picks | User picks |

Edges render via custom React Flow edge components. Style is from CSS variables (see §10), not hardcoded — so the palette can swap.

Right-clicking an edge opens a context menu to change flow type, label, direction.

---

## 7. Layers vs Views — make sure to get this right

These are **two different concepts** and easy to conflate. Implement them as separate features.

### Layers (object-level)
- Every node and edge **belongs to exactly one layer** (via `layer_id` on the node; edges inherit from their source node's layer for filtering purposes, but display always).
- A diagram has 1+ layers. The default layer is auto-created on diagram creation, named "Main".
- Users can add/rename/reorder/delete layers in a layer panel (top-right dropdown).
- Each layer has a visibility toggle (eye icon). Hidden layer → its nodes and any edges originating from them are hidden.
- Each layer has a color, shown as a 4px left border indicator on its nodes.

### Views (saved filter presets)
- A view is a saved combination of `{ visible layer IDs, visible flow types, visible node types, optional groupBy }`.
- Users can save the current visibility state as a named view ("High-level", "Just data flows", "Finance only").
- Switching views applies the filter — doesn't mutate the diagram.
- One view per diagram can be marked default (loads on open).
- `groupBy: 'category'` collapses nodes of the same category into a group node visually (still backed by individual nodes — just a render trick using React Flow's `parentNode` feature).

---

## 8. Frontend structure

```
apps/web/src/
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx                  # React Flow wrapper, registers node/edge types
│   │   ├── nodes/
│   │   │   ├── BaseNode.tsx            # shared shell, layer indicator, handles
│   │   │   ├── AppNode.tsx
│   │   │   ├── SystemNode.tsx
│   │   │   ├── DataSourceNode.tsx
│   │   │   ├── ExternalEntityNode.tsx
│   │   │   ├── CashNode.tsx
│   │   │   ├── GroupNode.tsx
│   │   │   └── CustomNode.tsx
│   │   ├── edges/
│   │   │   ├── BaseEdge.tsx
│   │   │   ├── DataEdge.tsx
│   │   │   ├── CashEdge.tsx
│   │   │   ├── ApiEdge.tsx
│   │   │   ├── ManualEdge.tsx
│   │   │   └── EventEdge.tsx
│   │   ├── controls/
│   │   │   ├── ZoomControls.tsx
│   │   │   └── MiniMap.tsx
│   │   └── ContextMenu.tsx             # right-click on canvas/node/edge
│   ├── palette/                        # LEFT sidebar
│   │   ├── NodePalette.tsx
│   │   ├── PaletteCategory.tsx         # collapsible
│   │   ├── PaletteSearch.tsx
│   │   └── DraggableNodeItem.tsx
│   ├── inspector/                      # RIGHT sidebar, opens on selection
│   │   ├── Inspector.tsx               # router: shows NodeInspector / EdgeInspector / DiagramInspector
│   │   ├── NodeInspector.tsx           # label, description, custom fields, layer, delete
│   │   ├── EdgeInspector.tsx           # flow type, label, direction, notes
│   │   └── DiagramInspector.tsx        # diagram metadata when nothing selected
│   ├── toolbar/                        # TOP bar
│   │   ├── TopBar.tsx
│   │   ├── DiagramTitle.tsx            # inline-editable
│   │   ├── LayerPanel.tsx              # dropdown with layer list + toggles
│   │   ├── ViewSelector.tsx            # dropdown with views + "Save as view…"
│   │   └── SaveIndicator.tsx           # "Saved" / "Saving…" status
│   └── ui/                             # shadcn components
├── stores/
│   ├── diagramStore.ts                 # current diagram, nodes, edges (Zustand)
│   ├── uiStore.ts                      # selection, inspector open, etc.
│   └── viewStore.ts                    # active view filter
├── lib/
│   ├── api.ts                          # TanStack Query hooks, fetch wrappers
│   ├── nodeRegistry.ts                 # maps node type → component + palette config
│   ├── edgeRegistry.ts                 # maps flow type → component + style
│   ├── autoSave.ts                     # debounced save logic
│   └── utils.ts
├── hooks/
│   ├── useDiagram.ts
│   ├── useKeyboardShortcuts.ts
│   └── useAutoSave.ts
├── pages/
│   ├── DashboardPage.tsx               # list of diagrams
│   └── EditorPage.tsx                  # the canvas view
├── App.tsx
└── main.tsx
```

---

## 9. Backend structure & API

```
apps/api/src/
├── routes/
│   ├── companies.ts
│   ├── diagrams.ts
│   ├── layers.ts
│   ├── nodes.ts
│   ├── edges.ts
│   └── views.ts
├── db/
│   ├── schema.ts        # Drizzle table definitions
│   ├── client.ts        # postgres-js + Drizzle init
│   └── seed.ts          # dev seed data
├── lib/
│   └── errors.ts
├── plugins/
│   └── cors.ts
└── index.ts             # Fastify bootstrap
```

### REST endpoints (MVP)

All return JSON. All write endpoints validate body via Zod schemas from `@system-map/shared`.

```
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PATCH  /api/companies/:id
DELETE /api/companies/:id

GET    /api/companies/:id/diagrams
POST   /api/companies/:id/diagrams
GET    /api/diagrams/:id              # returns diagram + layers + nodes + edges + views (one round-trip)
PATCH  /api/diagrams/:id
DELETE /api/diagrams/:id

POST   /api/diagrams/:id/layers
PATCH  /api/layers/:id
DELETE /api/layers/:id

POST   /api/diagrams/:id/nodes        # accepts array, used for bulk save
PATCH  /api/nodes/:id
DELETE /api/nodes/:id

POST   /api/diagrams/:id/edges
PATCH  /api/edges/:id
DELETE /api/edges/:id

POST   /api/diagrams/:id/views
PATCH  /api/views/:id
DELETE /api/views/:id

POST   /api/diagrams/:id/save         # atomic bulk save: { nodes[], edges[], layers[] }
```

The bulk save endpoint is what auto-save calls. It takes the full diagram state, diffs against the DB inside a transaction, applies inserts/updates/deletes. This is simpler than tracking per-entity dirty state on the client.

---

## 10. Design system — DO NOT default-shadcn this

This is the bit I care about most. The whole point is it shouldn't look like every other AI-built app.

### Typography
- Body / UI: **Geist Sans** (via `geist` npm package)
- Monospace / labels on system nodes: **Geist Mono**
- **Do NOT use Inter.** It's the AI-default tell.

### Color tokens (Tailwind v4 `@theme`)

```css
@theme {
  /* Surfaces — warm off-white, not pure */
  --color-canvas: #FBFAF7;       /* canvas background */
  --color-surface: #FFFFFF;      /* panels, sidebars */
  --color-surface-2: #F4F2ED;    /* hover, subtle bg */
  --color-border: #E8E4DC;       /* default borders */
  --color-border-strong: #C9C3B6;

  /* Text */
  --color-ink: #1A1A1A;          /* not pure black */
  --color-ink-muted: #6B6963;
  --color-ink-subtle: #94918A;

  /* Accent — distinctive, not blue/purple */
  --color-accent: #D4471F;       /* burnt sienna */
  --color-accent-hover: #B83A18;
  --color-accent-soft: #FBE8E1;

  /* Flow colors (used by edges) */
  --color-flow-data: #475569;    /* slate-600 */
  --color-flow-cash: #047857;    /* emerald-700 */
  --color-flow-api: #4F46E5;     /* indigo-600 */
  --color-flow-manual: #B45309;  /* amber-700 */
  --color-flow-event: #A21CAF;   /* fuchsia-700 */
}
```

### Canvas background
- Solid `--color-canvas`, NOT a grid by default.
- Optional **dot grid** (24px spacing, 1px dots at `--color-border`) toggled via a button in zoom controls. Default off — cleaner look.

### Node design (the bit that screams "AI demo" if you get it wrong)
- 8px radius (not the lazy 12px+ shadcn default).
- White background, 1px solid `--color-border`.
- Soft shadow: `0 1px 2px rgba(20, 20, 20, 0.04), 0 4px 12px rgba(20, 20, 20, 0.04)`.
- Layer indicator: 3px wide colored bar on the LEFT edge (using layer.color).
- Padding: 12px 14px.
- Min width 160px, height auto.
- Selected state: 2px solid `--color-accent` outline OFFSET by 2px (use `outline`, not `border`, so layout doesn't shift).
- Hover state: shadow strengthens slightly. No scale transform.
- Handles (connection points): 8px circles, `--color-border-strong`, only show on node hover.

### Sidebars
- 280px wide.
- Left palette: `--color-surface`, right inspector: `--color-surface`.
- Top toolbar: 56px tall, `--color-surface` with 1px bottom border.
- No drop-shadows on sidebars — use 1px borders. Drop shadows on chrome = AI demo.

### Buttons / inputs (overriding shadcn defaults)
- Buttons: 6px radius, not 8. Subtle, not rounded-full.
- Primary button uses `--color-accent`.
- Inputs: 1px border `--color-border`, focus ring is 2px `--color-accent` with 2px offset.
- Reduce default shadcn padding by ~15% — it tends to feel inflated.

### Micro-interactions
- All transitions 120ms `ease-out` (not the lazy 200ms default).
- No bouncy spring animations anywhere.
- Drag preview: ghost the original node at 40% opacity while dragging.
- When dropping a node from the palette, briefly highlight it with a 600ms `--color-accent-soft` flash.

### Empty states
- Don't use lucide's `Inbox` or `FileQuestion` icons — those scream stock UI.
- Empty canvas state: small instructional text top-center ("Drag from the palette to start") in `--color-ink-subtle`, no illustration.

---

## 11. MVP scope (in order)

Phase 1 — Foundation
1. Monorepo setup (Turborepo, pnpm, Biome, tsconfig base)
2. Postgres via Docker Compose, Drizzle schema + migrations
3. Fastify server with health check + companies CRUD
4. React app skeleton with shadcn installed + custom theme tokens
5. Dashboard page listing diagrams, "New diagram" creates and routes to editor

Phase 2 — Canvas
6. React Flow canvas with pan/zoom, dot grid toggle
7. BaseNode + AppNode + SystemNode + CustomNode (3 types is enough to test the pattern)
8. Left palette with draggable items, drag-to-canvas creates node
9. Inspector right panel: shows selected node, edits label/description, deletes

Phase 3 — Connections
10. Drag from node handle to another node creates edge
11. All 5 built-in edge types + edge inspector + right-click flow type switcher

Phase 4 — Layers & Views
12. Layer panel: add/rename/delete/reorder, toggle visibility, assign node to layer
13. View selector: save current filter state as named view, switch between views
14. `groupBy: 'category'` rendering using React Flow parentNode

Phase 5 — Persistence
15. Auto-save with 800ms debounce calling bulk save endpoint
16. Save indicator in top bar
17. Optimistic updates via TanStack Query

Phase 6 — Polish
18. Keyboard shortcuts: `Cmd+D` duplicate, `Delete` remove, `Cmd+Z/Cmd+Shift+Z` undo/redo (use Zustand temporal middleware), `Space+drag` pan, `Cmd+0` fit view
19. Minimap (bottom right, toggleable)
20. Add remaining node types (DataSource, ExternalEntity, Cash, Group)
21. Polish pass against §10 design tokens

---

## 12. Commit checkpoints

Commit at the end of each phase above, with message format `phase N: <summary>`. Don't commit-bomb mid-phase — I want clean review increments.

---

## 13. Later / out of scope for MVP

Don't build these unless I explicitly ask:
- Auth / multi-user / sharing
- Real-time collaboration
- Version history / branching
- Export to PNG/SVG/PDF
- Import from CSV / JSON
- Templates / starter diagrams
- App logo auto-fetch (logo.dev integration)
- Custom node icon upload
- Comments / annotations
- Free-floating text labels on the canvas
- AI suggestions
- Public read-only links

Note where you've stubbed something for later (e.g. a `userId` column with a hardcoded value) with a `// TODO(auth):` comment so it's greppable.

---

## 14. Acceptance check before declaring done

Walk through this scenario manually and confirm each step works:

1. Create a company called "Textbook Ltd"
2. Create a diagram called "Customer journey"
3. Drag in 3 App nodes (label them Stripe, Notion, Resend), 1 External Entity (User), 1 System (Backend API)
4. Connect User → Backend API as a `data` flow
5. Connect Backend API → Stripe as an `api` flow
6. Connect Stripe → Backend API as a `cash` flow (label it "Subscription revenue")
7. Create a second layer called "Comms", assign Resend to it
8. Toggle Comms layer off — Resend disappears, toggle back on — returns
9. Save a view called "Money flow" with only the `cash` flow type visible
10. Switch to default view → all edges return
11. Refresh the page → diagram is exactly as left
12. Check Network tab during edits → see debounced `POST /api/diagrams/:id/save` requests
13. Confirm visual design matches §10 — burnt sienna accent, Geist font, off-white canvas, left-edge layer indicators on nodes

If all 13 pass: ship it.
