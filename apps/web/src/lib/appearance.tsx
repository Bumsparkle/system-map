import type { NodeData } from '@system-map/shared'
import {
  Bot,
  Box,
  Boxes,
  Cloud,
  Code,
  Cpu,
  CreditCard,
  Database,
  Folder,
  Globe,
  HardDrive,
  Key,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Network,
  Server,
  Shield,
  ShoppingCart,
  Smartphone,
  Terminal,
  Users,
  Webhook,
  Workflow,
  Zap,
} from 'lucide-react'
import type { CSSProperties, ComponentType, ReactNode } from 'react'

export type NodeSize = 'sm' | 'md' | 'lg'

// Curated accent swatches: the §10 flow colors + a couple of neutrals. No free picker.
export const ACCENT_SWATCHES: { key: string; value: string }[] = [
  { key: 'sienna', value: '#D4471F' },
  { key: 'emerald', value: '#047857' },
  { key: 'indigo', value: '#4F46E5' },
  { key: 'amber', value: '#B45309' },
  { key: 'fuchsia', value: '#A21CAF' },
  { key: 'cyan', value: '#0891B2' },
  { key: 'slate', value: '#475569' },
  { key: 'gray', value: '#94918A' },
]

export const SIZE_MIN_WIDTH: Record<NodeSize, number> = { sm: 140, md: 160, lg: 200 }
export const SIZE_FONT_PX: Record<NodeSize, number> = { sm: 13, md: 14, lg: 16 }

export function sizeStyle(size: NodeSize | undefined): CSSProperties {
  const s = size ?? 'md'
  return { minWidth: SIZE_MIN_WIDTH[s], fontSize: SIZE_FONT_PX[s] }
}

// ~26 lucide icons offered for non-app node types.
export const LUCIDE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Box,
  Boxes,
  Bot,
  Cloud,
  Code,
  Cpu,
  CreditCard,
  Database,
  Folder,
  Globe,
  HardDrive,
  Key,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Network,
  Server,
  Shield,
  ShoppingCart,
  Smartphone,
  Terminal,
  Users,
  Webhook,
  Workflow,
  Zap,
}

// Common SaaS logos via the Simple Icons CDN (https://cdn.simpleicons.org/{slug}).
export const SIMPLE_ICON_SLUGS: string[] = [
  'stripe',
  'notion',
  'slack',
  'linear',
  'figma',
  'github',
  'gitlab',
  'vercel',
  'postgresql',
  'redis',
  'amazonwebservices',
  'googlecloud',
  'cloudflare',
  'sendgrid',
  'hubspot',
  'segment',
  'openai',
  'twilio',
  'shopify',
  'salesforce',
]

export function simpleIconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`
}

/** The custom icon for a node from its appearance, or null to use the type default. */
export function resolveNodeIcon(data: NodeData): ReactNode | null {
  const a = data.appearance
  if (a?.iconUrl) {
    return <img src={a.iconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
  }
  if (a?.iconKey) {
    const Icon = LUCIDE_ICONS[a.iconKey]
    if (Icon) return <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
  }
  return null
}
