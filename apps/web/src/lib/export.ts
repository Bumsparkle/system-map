import geistWoff2Url from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import type { Layer, SaveDiagramInput } from '@system-map/shared'
import { type Edge, type Node, getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'

const PAD = 64
const WHITE_MARGIN = 32

/* ------------------------------------------------------------------ */
/* shared helpers                                                      */
/* ------------------------------------------------------------------ */

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'diagram'
  )
}

function fileName(name: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${slugify(name)}-${date}.${ext}`
}

function triggerDownload(href: string, name: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function visibleNodes(nodes: Node[]): Node[] {
  return nodes.filter((n) => !n.hidden)
}

function nodeSize(n: Node): { width: number; height: number } {
  return {
    width: n.measured?.width ?? n.width ?? 180,
    height: n.measured?.height ?? n.height ?? 52,
  }
}

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

export type DiagramJsonExport = {
  version: '1.0'
  diagram: { id: string; companyId: string; name: string; description: string | null }
  layers: SaveDiagramInput['layers']
  nodes: SaveDiagramInput['nodes']
  edges: SaveDiagramInput['edges']
  views: SaveDiagramInput['views']
}

export function exportJson(data: DiagramJsonExport, name: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, fileName(name, 'json'))
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/* PNG (html-to-image)                                                 */
/* ------------------------------------------------------------------ */

async function addWhiteMargin(dataUrl: string, deviceMargin: number): Promise<string> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.width + deviceMargin * 2
  canvas.height = img.height + deviceMargin * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, deviceMargin, deviceMargin)
  return canvas.toDataURL('image/png')
}

export async function exportPng(nodes: Node[], name: string): Promise<void> {
  const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewportEl) throw new Error('Canvas not found')

  const visible = visibleNodes(nodes)
  if (visible.length === 0) throw new Error('Nothing to export')

  const bounds = getNodesBounds(visible)
  const width = Math.ceil(bounds.width + PAD * 2)
  const height = Math.ceil(bounds.height + PAD * 2)
  const viewport = getViewportForBounds(bounds, width, height, 0.1, 4, PAD)
  const pixelRatio = 2
  const fontEmbedCSS = await geistFontFaceCss()

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: '#fbfaf7',
    width,
    height,
    pixelRatio,
    // Provide our own font CSS so html-to-image skips scanning every stylesheet.
    fontEmbedCSS: fontEmbedCSS || undefined,
    skipFonts: fontEmbedCSS ? undefined : true,
    // Capturing the viewport already excludes controls/minimap/attribution
    // (they're siblings), but be defensive in case of nesting.
    filter: (el) => {
      const cls = (el as HTMLElement).classList
      return !cls?.contains('react-flow__minimap') && !cls?.contains('react-flow__attribution')
    },
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  })

  const framed = await addWhiteMargin(dataUrl, WHITE_MARGIN * pixelRatio)
  triggerDownload(framed, fileName(name, 'png'))
}

/* ------------------------------------------------------------------ */
/* SVG (clean native vector — no foreignObject, embedded Geist)        */
/* ------------------------------------------------------------------ */

let fontDataUrlPromise: Promise<string | null> | null = null

async function geistDataUrl(): Promise<string | null> {
  if (!fontDataUrlPromise) {
    fontDataUrlPromise = (async () => {
      try {
        const res = await fetch(geistWoff2Url)
        const buf = await res.arrayBuffer()
        let binary = ''
        const bytes = new Uint8Array(buf)
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
        return `data:font/woff2;base64,${btoa(binary)}`
      } catch {
        return null
      }
    })()
  }
  return fontDataUrlPromise
}

/** A single Geist @font-face. Used as html-to-image's fontEmbedCSS so it doesn't
 *  scan/fetch every @fontsource stylesheet (slow + can hang), and inlined into SVG. */
async function geistFontFaceCss(): Promise<string> {
  const url = await geistDataUrl()
  if (!url) return ''
  return `@font-face { font-family: 'Geist Variable'; font-weight: 100 900; font-style: normal; src: url('${url}') format('woff2'); }`
}

const FLOW_HEX: Record<string, string> = {
  data: '#475569',
  cash: '#047857',
  api: '#4f46e5',
  manual: '#b45309',
  event: '#a21caf',
  custom: '#94918a',
}

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

function handlePoint(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  side: HandleSide,
): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: pos.x + size.width / 2, y: pos.y }
    case 'bottom':
      return { x: pos.x + size.width / 2, y: pos.y + size.height }
    case 'left':
      return { x: pos.x, y: pos.y + size.height / 2 }
    default:
      return { x: pos.x + size.width, y: pos.y + size.height / 2 }
  }
}

export async function exportSvg(
  nodes: Node[],
  edges: Edge[],
  layers: Layer[],
  name: string,
): Promise<void> {
  const visible = visibleNodes(nodes)
  if (visible.length === 0) throw new Error('Nothing to export')

  const visibleIds = new Set(visible.map((n) => n.id))
  const visEdges = edges.filter(
    (e) => !e.hidden && visibleIds.has(e.source) && visibleIds.has(e.target),
  )
  const layerColor = new Map(layers.map((l) => [l.id, l.color]))
  const posById = new Map(visible.map((n) => [n.id, { pos: n.position, size: nodeSize(n) }]))

  const bounds = getNodesBounds(visible)
  const vbX = Math.floor(bounds.x - PAD)
  const vbY = Math.floor(bounds.y - PAD)
  const vbW = Math.ceil(bounds.width + PAD * 2)
  const vbH = Math.ceil(bounds.height + PAD * 2)

  // --- edges ---
  const edgeMarkers = new Set<string>()
  const edgeSvg = visEdges
    .map((e) => {
      const s = posById.get(e.source)
      const t = posById.get(e.target)
      if (!s || !t) return ''
      const sp = handlePoint(s.pos, s.size, (e.sourceHandle as HandleSide) ?? 'right')
      const tp = handlePoint(t.pos, t.size, (e.targetHandle as HandleSide) ?? 'left')
      const color = FLOW_HEX[e.type ?? 'data'] ?? FLOW_HEX.data
      edgeMarkers.add(e.type ?? 'data')
      const dx = Math.abs(tp.x - sp.x) * 0.5 + 20
      const path = `M ${sp.x} ${sp.y} C ${sp.x + dx} ${sp.y}, ${tp.x - dx} ${tp.y}, ${tp.x} ${tp.y}`
      const dash =
        e.type === 'manual'
          ? ' stroke-dasharray="4 4"'
          : e.type === 'event'
            ? ' stroke-dasharray="1.5 4.5" stroke-linecap="round"'
            : ''
      const w = e.type === 'cash' ? 2.5 : 2
      const labelText = typeof e.label === 'string' ? e.label : ''
      const mid = { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 }
      const label = labelText
        ? `<g><rect x="${mid.x - labelText.length * 3.4 - 6}" y="${mid.y - 10}" width="${labelText.length * 6.8 + 12}" height="20" rx="5" fill="#ffffff" stroke="#e8e4dc"/><text x="${mid.x}" y="${mid.y + 4}" text-anchor="middle" font-size="11" fill="#1a1a1a">${escapeXml(labelText)}</text></g>`
        : ''
      return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${w}"${dash} marker-end="url(#arrow-${e.type ?? 'data'})"/>${label}`
    })
    .join('\n')

  const markerDefs = [...edgeMarkers]
    .map((type) => {
      const color = FLOW_HEX[type] ?? FLOW_HEX.data
      return `<marker id="arrow-${type}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`
    })
    .join('\n')

  // --- nodes ---
  const nodeSvg = visible
    .map((n) => {
      const { pos, size } = { pos: n.position, size: nodeSize(n) }
      const data = n.data as { label?: string; category?: string; color?: string; layerId?: string }
      const radius = n.type === 'system' ? 5 : 8
      const dashed = n.type === 'external_entity' ? ' stroke-dasharray="4 3"' : ''
      const bar = layerColor.get(data.layerId ?? '') ?? '#e8e4dc'
      const label = escapeXml(data.label ?? '')
      const category = data.category ? escapeXml(data.category) : ''
      const mono =
        n.type === 'system' ? ` font-family="'Geist Mono Variable', ui-monospace, monospace"` : ''
      const labelY = category ? pos.y + size.height / 2 - 2 : pos.y + size.height / 2 + 4
      const catLine = category
        ? `<text x="${pos.x + 16}" y="${pos.y + size.height / 2 + 13}" font-size="11" fill="#94918a"${mono}>${category}</text>`
        : ''
      return `<g>
  <rect x="${pos.x}" y="${pos.y}" width="${size.width}" height="${size.height}" rx="${radius}" fill="#ffffff" stroke="#e8e4dc" stroke-width="1"${dashed}/>
  <rect x="${pos.x}" y="${pos.y}" width="3" height="${size.height}" rx="1.5" fill="${bar}"/>
  <text x="${pos.x + 16}" y="${labelY}" font-size="14" font-weight="500" fill="#1a1a1a"${mono}>${label}</text>
  ${catLine}
</g>`
    })
    .join('\n')

  const fontFace = await geistFontFaceCss()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">
<defs>${markerDefs}</defs>
<style>
${fontFace}
text { font-family: 'Geist Variable', ui-sans-serif, system-ui, sans-serif; }
</style>
<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#fbfaf7"/>
${edgeSvg}
${nodeSvg}
</svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, fileName(name, 'svg'))
  URL.revokeObjectURL(url)
}
