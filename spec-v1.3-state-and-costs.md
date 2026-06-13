# System Map — Current/Future State + Costs (v1.3)

Follow-on spec. Adds the two features the consultant cared about most: current/future state toggle on one diagram, and cost data on nodes with layer rollups.

Stack, design tokens, and conventions from earlier specs still apply. TS strict, no `any`, commit per phase, ask before substituting.

---

## 0. The pitch this enables

The consultant drops in the client's current stack, then duplicates each node into its future-state form (or marks it for removal, replacement, etc.). A toggle in the toolbar switches the canvas between "Current state," "Future state," and "Delta" (which highlights what's changing).

Every node has a monthly cost. Layer totals compute automatically. The bottom-right shows current spend → future spend with the delta.

When the partner sees this, they're seeing the exact artifact they produce in every TOM engagement — alive on one canvas instead of split across 30 PowerPoint slides.

---

## 1. Architecture decision: one diagram, per-node state

Both states live on the same diagram. Each node has a `lifecycle` field that says what's happening to it. The view toggle filters/styles based on lifecycle.

This is harder to build than two separate diagrams, but it's the right call because:
- The *delta* is the consulting value (what's changing, why)
- No duplication — the client's stack is one source of truth
- Adding a third state later (e.g. "Wave 2") is just another lifecycle value

---

## 2. Data model changes

### 2.1 Node lifecycle

Add to `nodes.data` jsonb (no schema migration needed):

```ts
type NodeLifecycle =
  | 'existing'       // in current state, stays in future state (default)
  | 'new'            // not in current state, added in future state
  | 'retiring'       // in current state, removed in future state
  | 'replacing'      // current state node being replaced by a 'new' node
  | 'modifying'      // stays in both, but changes significantly

type NodeData = {
  // ...existing fields
  lifecycle: NodeLifecycle  // default 'existing'
  replacedByNodeId?: string  // if lifecycle is 'replacing', points to the 'new' node
  lifecycleNotes?: string    // free-text consultant rationale
}
```

The `replacedByNodeId` link lets us draw a visual connection between a retiring node and its replacement in the Delta view.

### 2.2 Cost fields

Add to `nodes.data`:

```ts
type NodeCost = {
  monthlyAmount: number      // in pence/cents to avoid float issues
  currency: 'GBP' | 'USD' | 'EUR'  // default GBP for Oxbow
  basis?: string             // 'per seat' | 'flat' | 'usage' | 'estimated' — free text
  notes?: string             // e.g. "12 seats @ £20/mo, projected to grow"
  confidence: 'known' | 'estimated' | 'unknown'  // affects visual weight
}

type NodeData = {
  // ...existing fields
  cost?: NodeCost  // optional — not every node has a cost
}
```

Store as pence/cents (integer) not pounds (float). Format on display. This is a 5-minute decision that saves you a day of currency bugs later.

### 2.3 Edge lifecycle (lightweight)

Edges also get a lifecycle, but simpler:

```ts
type EdgeLifecycle = 'existing' | 'new' | 'retiring'
```

This lets the Delta view show "this integration is being added" or "this manual handoff is being automated away."

---

## 3. The view toggle

Add a segmented control to the top toolbar, between the diagram title and the layer panel. Three options:

```
[ Current ] [ Future ] [ Delta ]
```

Width: ~280px. Uses shadcn `ToggleGroup` but styled tighter than default (see §10 of original spec — reduce padding ~15%).

### 3.1 Current state view

Shows:
- Nodes with lifecycle `existing`, `retiring`, `replacing`, `modifying`
- Hides nodes with lifecycle `new`
- All visible nodes render normally (no special styling)
- Edges follow same rule based on connected nodes + edge lifecycle

This is "what the client has today."

### 3.2 Future state view

Shows:
- Nodes with lifecycle `existing`, `new`, `modifying`
- Hides nodes with lifecycle `retiring`, `replacing`
- All visible nodes render normally

This is "what the client will have after the transformation."

### 3.3 Delta view

Shows *everything*, but styled to communicate change at a glance:

| Lifecycle | Visual treatment |
|---|---|
| `existing` | Standard, 60% opacity (de-emphasised — it's the constant) |
| `new` | Green left-edge accent (`--color-flow-cash` already in tokens), small "NEW" pill top-right |
| `retiring` | Red left-edge accent (`--color-status-retiring: #B91C1C`), small "RETIRING" pill, content slightly faded |
| `replacing` | Red accent, "REPLACING →" pill that links to the replacement node |
| `modifying` | Amber left-edge accent (`--color-flow-manual` already in tokens), small "MODIFYING" pill |

In Delta view, when a `replacing` node has a `replacedByNodeId`, draw a dashed grey arrow between them with label "replaces." This is a special edge that only exists in Delta view, not stored in the DB.

Pills are small (text-xs, rounded-sm, 4px x 2px padding). Don't make them shout — this is for consultants, not a marketing site.

### 3.4 Default view & persistence

- New diagrams open in Current view
- The active view persists per-user per-diagram (localStorage)
- URL query param `?state=current|future|delta` overrides for shareable links

---

## 4. Inspector: lifecycle controls

In NodeInspector, add a "Lifecycle" section between "Vendor" and "Appearance":

- Segmented control: `Existing` / `New` / `Retiring` / `Replacing` / `Modifying`
- When `Replacing` selected: a vendor-search-style picker appears: "Replaced by…" — picks another node from the diagram with lifecycle `new`
- Free-text notes field: "Why is this changing?" — small textarea, max 500 chars

When the consultant sets a node to `replacing`, prompt them: "Add the replacement node?" → clicking opens the palette with a hint. Don't force them; just nudge.

---

## 5. Cost data

### 5.1 Inspector: cost section

In NodeInspector, add a "Cost" section between "Lifecycle" and "Appearance":

- Amount: number input, right-aligned, with currency selector to its left (default GBP £)
- Basis: text input with placeholder "e.g. 12 seats @ £20/mo"
- Confidence: 3-button segmented control (Known / Estimated / Unknown)
- Notes: optional textarea

If no cost is set, show a single "Add cost" button instead. Don't clutter the inspector for nodes that won't have costs (external entities, customers, etc.).

### 5.2 Node face: cost display

Add a small cost line at the bottom of the node, below the existing content:

- Format: `£500/mo` (compact, Geist Mono 11px, `--color-ink-muted`)
- Confidence indicator: if `estimated`, prefix with `~` (e.g. `~£500/mo`). If `unknown`, show `£?/mo`.
- Hide entirely if no cost is set — don't show "£0" or "—" (visual noise)

### 5.3 Cost rollups: the totals bar

Add a fixed bar at the bottom-right of the canvas (above the React Flow watermark, doesn't overlap zoom controls bottom-left). Behaviour depends on active view:

**Current view:**
```
Current spend: £14,200 / mo
```

**Future view:**
```
Future spend: £18,600 / mo
```

**Delta view:**
```
Current: £14,200 / mo  →  Future: £18,600 / mo   +£4,400 (+31%)
```

The delta number is colored: green if savings, amber if increase. Use `--color-flow-cash` and `--color-flow-manual` from existing tokens (don't add new ones).

### 5.4 Per-layer cost rollup

In the layer panel (top-right dropdown), each layer row gets a small cost line:

```
Finance stack       £4,200/mo  [eye icon] [color dot]
Customer-facing     £8,000/mo  [eye icon] [color dot]
```

Shows total for visible nodes in that layer, in the active view. Recompute when nodes change.

### 5.5 Currency handling

For MVP:
- One currency per diagram (set on diagram creation, default GBP)
- All node costs must use the diagram's currency (UI enforces this)
- Don't build multi-currency conversion. If a node's vendor invoices in USD, the consultant converts before entering. Note it in the basis field.

This is the right call for the demo. Multi-currency is a half-day rabbit hole you don't need.

### 5.6 Cost calculations: edge cases

- Nodes with `confidence: 'unknown'` are excluded from totals but counted separately
- Show: `£14,200/mo (+ 3 nodes uncosted)` if any are unknown
- Hidden layers (visibility off) excluded from totals
- Nodes filtered out by current view (e.g. `new` nodes in Current view) excluded
- External entities and customer nodes typically have no cost — that's fine, just excluded

---

## 6. Demo diagram updates

Update "Project Atlantic" (the pre-built demo from spec-v1.2 §6) to use lifecycle:

**Current state** (`existing` + `retiring`):
- Legacy Sapiens core (mark `retiring`, cost £4k/mo)
- Excel-based pricing (mark `retiring`, cost £200/mo Microsoft 365)
- Existing claims handlers' manual process (mark `existing`)
- Salesforce broker portal (`existing`, £2k/mo)
- Snowflake data warehouse (`existing`, £1.5k/mo) — they got this right already
- Total: realistic for a mid-size Lloyd's syndicate

**Future state** (`new` + `modifying`):
- hyperexponential (mark `new`, replaces Excel pricing, £8k/mo)
- Send underwriter workbench (`new`, £6k/mo)
- Shift Technology for fraud (`new`, £3k/mo)
- Sapiens being replaced by Guidewire (`new`, set Sapiens `replacing` → Guidewire `new`, Guidewire at £12k/mo)
- Salesforce stays (`existing`)
- Snowflake stays (`modifying` — being expanded, notes: "scaling for new data sources")

This creates the most demo-effective Delta view: clear retirements, clear additions, one obvious replacement chain, and a cost increase that the partner can immediately interpret ("yes, modernisation costs more upfront — typical for our engagements").

Adjust numbers so the totals are clean for the demo. Round numbers feel curated; £14,247.93 looks like a bug.

---

## 7. What we're NOT building

Explicitly out of scope for this iteration (the consultant didn't prioritise these):

- **Recommendations as structured field** — leave it as the free-text `lifecycleNotes` for now. Don't add a separate "recommendation type" enum. If they ask for it later, easy to add.
- **Capacity / utilisation (#2 from their reply)** — skipping per your call. Worth flagging back to them: "Skipped utilisation for now because it needs either API access or a survey to populate — happy to discuss approaches when we meet."
- **FTE / resources at each node (#4 from their reply)** — skipping. Same data-shape as cost (number on a node, sum per layer) so trivial to add later if it matters.
- **Multi-currency / conversion** — single currency per diagram
- **Cost over time / projections** — single monthly figure, no trends or charts
- **Phase / wave breakdown** — could add later (`phase: 'wave-1' | 'wave-2'` on lifecycle-`new` nodes) but not for this demo
- **Cost comparison reports / export** — Delta totals on screen is enough for the demo

---

## 8. Phasing

Commit per phase.

**Phase 1 — Data model & view toggle** (~half day)
- Lifecycle fields on nodes + edges (jsonb additions)
- Top toolbar view toggle (Current / Future / Delta)
- Filtering logic for Current and Future views
- Test: switching toggle hides/shows correct nodes

**Phase 2 — Delta view styling** (~half day)
- Lifecycle visual treatments (accents, pills, opacity)
- "Replaced by" dashed arrow rendering in Delta view
- Status colour token: `--color-status-retiring`
- Test: Delta view clearly communicates what's changing

**Phase 3 — Inspector lifecycle controls** (~2 hours)
- Lifecycle segmented control
- Replacement node picker (reuse vendor-search component shape)
- Lifecycle notes field

**Phase 4 — Cost data model & inspector** (~2 hours)
- Cost fields on nodes
- Cost section in inspector
- Currency formatting helpers (use `Intl.NumberFormat`)

**Phase 5 — Cost display & rollups** (~half day)
- Cost line on node face
- Totals bar bottom-right with view-aware totals
- Per-layer cost in layer panel
- Uncosted-node count
- Test: numbers add up correctly across view switches

**Phase 6 — Demo diagram update** (~half day)
- Update Project Atlantic with full lifecycle + cost data
- Verify all three views read well
- Verify totals look clean (round-ish numbers)

Total: ~2.5 days.

---

## 9. Acceptance check before the demo

1. Open Project Atlantic → defaults to Current view → see Sapiens, Excel pricing, etc. with their costs
2. Bottom-right shows "Current spend: £X / mo" matching the visible nodes
3. Click Future → Sapiens and Excel disappear, hyperexponential/Send/Guidewire appear, total updates
4. Click Delta → everything visible, retiring nodes have red accent + "RETIRING" pill, new nodes green + "NEW" pill, Sapiens has dashed arrow pointing to Guidewire labelled "replaces"
5. Bottom-right in Delta shows "Current → Future: +£X (+Y%)" with the delta in amber
6. Click any node → inspector shows Lifecycle + Cost sections in addition to existing vendor info
7. Change Sapiens lifecycle from `replacing` to `existing` → diagram updates immediately, totals recompute
8. Toggle off a layer → that layer's cost contribution removed from totals
9. Set a node's confidence to `unknown` → its cost stops counting in total, "+1 node uncosted" appears
10. Refresh the page → view state persists (Delta is still Delta), all data intact
11. Costs display with `~` prefix for estimated, `?` for unknown, clean integer GBP for known

If all 11 pass, the demo holds up for what the consultant asked for.

---

## 10. The "for the conversation" notes

When demoing, two framings to use:

**On the toggle:** "This is one diagram with state per node, not two diagrams. The delta is computed — so when you adjust the future state, the cost impact updates live. That means the deliverable stays accurate when scope changes mid-engagement."

**On costs:** "Costs roll up per layer and across the whole stack. Right now we're using the consultant-entered values — the production version could pull from your finance system or contract repository so the numbers stay current after the engagement ends."

That second one is the next-engagement upsell, baked in. Same pattern as the Magellan one: build the architecture in a way that makes the upgrade conversation easy.

---

## 11. What to tell the consultant in your reply

Before building, reply to them with something like:

> Brilliant — going to build (1) one-diagram current/future toggle with a Delta view that highlights what's changing, and (3) costs on nodes with layer rollups and a current→future spend comparison.
>
> Skipping (2) utilisation for now — happy to discuss when we meet, since it depends a lot on data access. Skipping (4) FTE for this iteration but it's the same shape as cost so trivial to add later.
>
> Worth a 30 min call before I finalise? Want to make sure I'm building toward what would actually be useful in a real engagement.

That last paragraph is the important one. Convert engagement into a meeting. The build is throwaway if there's no path to a commercial conversation.
