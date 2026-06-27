import { AppNode } from '@/components/canvas/nodes/AppNode'
import { CashNode } from '@/components/canvas/nodes/CashNode'
import { CategoryGroupNode } from '@/components/canvas/nodes/CategoryGroupNode'
import { CustomNode } from '@/components/canvas/nodes/CustomNode'
import { DataSourceNode } from '@/components/canvas/nodes/DataSourceNode'
import { ExternalEntityNode } from '@/components/canvas/nodes/ExternalEntityNode'
import { GroupNode } from '@/components/canvas/nodes/GroupNode'
import { InternalEntityNode } from '@/components/canvas/nodes/InternalEntityNode'
import { SystemNode } from '@/components/canvas/nodes/SystemNode'
import type { SMNode } from '@/lib/flow'
import type { NodeType } from '@system-map/shared'
import type { NodeProps, NodeTypes } from '@xyflow/react'
import {
  AppWindow,
  Database,
  Group,
  PoundSterling,
  Server,
  Shapes,
  Users,
  UsersRound,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type NodeTypeMeta = {
  type: NodeType
  label: string
  hint: string
  category: string
  icon: ComponentType<{ className?: string }>
}

type NodeRegistryEntry = {
  meta: NodeTypeMeta
  component: ComponentType<NodeProps<SMNode>>
}

// Default label given to a freshly dropped node, before the user renames it.
export const NODE_DEFAULT_LABEL: Record<NodeType, string> = {
  app: 'New app',
  system: 'New service',
  data_source: 'New data source',
  external_entity: 'New entity',
  internal_entity: 'New team',
  cash: 'New cash flow',
  group: 'New group',
  custom: 'New node',
}

// Human-readable name for each node type (shown in the inspector header).
export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  app: 'App',
  system: 'System',
  data_source: 'Data source',
  external_entity: 'External entity',
  internal_entity: 'Internal team',
  cash: 'Cash',
  group: 'Group',
  custom: 'Custom',
}

// Only types with a registered component appear on the canvas + palette.
// Phase 6 adds data_source / external_entity / cash / group here.
export const nodeRegistry = {
  app: {
    component: AppNode,
    meta: {
      type: 'app',
      label: 'App',
      hint: 'A SaaS app (Slack, Stripe…)',
      category: 'Building blocks',
      icon: AppWindow,
    },
  },
  system: {
    component: SystemNode,
    meta: {
      type: 'system',
      label: 'System',
      hint: 'Internal tool or service',
      category: 'Building blocks',
      icon: Server,
    },
  },
  data_source: {
    component: DataSourceNode,
    meta: {
      type: 'data_source',
      label: 'Data source',
      hint: 'DB, CSV feed, API',
      category: 'Data',
      icon: Database,
    },
  },
  external_entity: {
    component: ExternalEntityNode,
    meta: {
      type: 'external_entity',
      label: 'External entity',
      hint: 'Customer, vendor, partner',
      category: 'People & orgs',
      icon: Users,
    },
  },
  internal_entity: {
    component: InternalEntityNode,
    meta: {
      type: 'internal_entity',
      label: 'Internal team',
      hint: 'Team, department, role',
      category: 'People & orgs',
      icon: UsersRound,
    },
  },
  cash: {
    component: CashNode,
    meta: {
      type: 'cash',
      label: 'Cash',
      hint: 'Revenue or expense',
      category: 'Money',
      icon: PoundSterling,
    },
  },
  group: {
    component: GroupNode,
    meta: {
      type: 'group',
      label: 'Group',
      hint: 'Container for related nodes',
      category: 'Layout',
      icon: Group,
    },
  },
  custom: {
    component: CustomNode,
    meta: {
      type: 'custom',
      label: 'Custom',
      hint: 'Free-form node',
      category: 'Other',
      icon: Shapes,
    },
  },
} satisfies Partial<Record<NodeType, NodeRegistryEntry>>

export const nodeTypes: NodeTypes = {
  ...(Object.fromEntries(
    Object.entries(nodeRegistry).map(([type, entry]) => [type, entry.component]),
  ) as NodeTypes),
  // Display-only container used by the groupBy:'category' view (spec §7).
  categoryGroup: CategoryGroupNode,
}

export const paletteMetas: NodeTypeMeta[] = Object.values(nodeRegistry).map((e) => e.meta)
