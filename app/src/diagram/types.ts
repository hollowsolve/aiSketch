// @diagram-types

// @diagram-types-node
export type DiagramNodeType =
  | 'service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'gateway'
  | 'client'
  | 'storage'
  | 'function'
  | 'external'
  | 'custom'

export interface DiagramNode {
  id: string
  type: DiagramNodeType
  label: string
  description?: string
  tags?: string[]
  group?: string
  icon?: string
}
// @diagram-types-node-end

// @diagram-types-link
export type DiagramLinkType =
  | 'sync'
  | 'async'
  | 'data'
  | 'event'
  | 'dependency'

export interface DiagramLink {
  id: string
  from: string
  to: string
  type: DiagramLinkType
  label?: string
}
// @diagram-types-link-end

// @diagram-types-group
export type DiagramGroupType =
  | 'boundary'
  | 'vpc'
  | 'team'
  | 'zone'
  | 'region'

export interface DiagramGroup {
  id: string
  type: DiagramGroupType
  label: string
  color?: string
}
// @diagram-types-group-end

// @diagram-types-graph
export interface DiagramGraph {
  name: string
  nodes: DiagramNode[]
  links: DiagramLink[]
  groups: DiagramGroup[]
}
// @diagram-types-graph-end

// @diagram-types-delta
export type DeltaOp =
  | { op: 'addNode'; node: DiagramNode }
  | { op: 'removeNode'; id: string }
  | { op: 'updateNode'; id: string; changes: Partial<Omit<DiagramNode, 'id'>> }
  | { op: 'addLink'; link: DiagramLink }
  | { op: 'removeLink'; id: string }
  | { op: 'updateLink'; id: string; changes: Partial<Omit<DiagramLink, 'id'>> }
  | { op: 'addGroup'; group: DiagramGroup }
  | { op: 'removeGroup'; id: string }
  | { op: 'updateGroup'; id: string; changes: Partial<Omit<DiagramGroup, 'id'>> }
// @diagram-types-delta-end

// @diagram-types-layout
export interface LayoutNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  node: DiagramNode
}

export interface LayoutLink {
  id: string
  points: [number, number][]
  link: DiagramLink
}

export interface LayoutGroup {
  id: string
  x: number
  y: number
  width: number
  height: number
  group: DiagramGroup
}

export interface LayoutResult {
  nodes: LayoutNode[]
  links: LayoutLink[]
  groups: LayoutGroup[]
  width: number
  height: number
}
// @diagram-types-layout-end

// @diagram-types-position-overrides
export type PositionOverrides = Map<string, { x: number; y: number }>
// @diagram-types-position-overrides-end
// @diagram-types-end
