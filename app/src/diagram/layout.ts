// @diagram-layout
import dagre from '@dagrejs/dagre'
import type { DiagramGraph, DiagramNode, DiagramNodeType, LayoutResult, LayoutNode, LayoutLink, LayoutGroup } from './types'

// @diagram-layout-sizes
const NODE_SIZES: Record<DiagramNodeType, { width: number; height: number }> = {
  service:  { width: 160, height: 60 },
  database: { width: 140, height: 70 },
  queue:    { width: 160, height: 50 },
  cache:    { width: 130, height: 50 },
  gateway:  { width: 160, height: 55 },
  client:   { width: 140, height: 55 },
  storage:  { width: 140, height: 60 },
  function: { width: 140, height: 50 },
  external: { width: 150, height: 55 },
  custom:   { width: 150, height: 55 },
}
// @diagram-layout-sizes-end

// @diagram-layout-compute
export function computeLayout(graph: DiagramGraph): LayoutResult {
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const group of graph.groups) {
    g.setNode(group.id, { label: group.label, clusterLabelPos: 'top', style: 'group' })
  }

  for (const node of graph.nodes) {
    const size = NODE_SIZES[node.type] || NODE_SIZES.custom
    g.setNode(node.id, { label: node.label, width: size.width, height: size.height })
    if (node.group && graph.groups.some(gr => gr.id === node.group)) {
      g.setParent(node.id, node.group!)
    }
  }

  for (const link of graph.links) {
    if (g.hasNode(link.from) && g.hasNode(link.to)) {
      g.setEdge(link.from, link.to, { label: link.label || '', id: link.id })
    }
  }

  dagre.layout(g)

  const nodeMap = new Map<string, DiagramNode>()
  for (const n of graph.nodes) nodeMap.set(n.id, n)

  const layoutNodes: LayoutNode[] = []
  for (const id of g.nodes()) {
    const dn = nodeMap.get(id)
    if (!dn) continue
    const n = g.node(id)
    if (!n) continue
    layoutNodes.push({
      id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      node: dn,
    })
  }

  const linkMap = new Map<string, typeof graph.links[0]>()
  for (const l of graph.links) linkMap.set(l.id, l)

  const layoutLinks: LayoutLink[] = []
  for (const e of g.edges()) {
    const edgeData = g.edge(e)
    if (!edgeData) continue
    const linkId = edgeData.id as string
    const link = linkMap.get(linkId)
    if (!link) continue
    const points: [number, number][] = (edgeData.points || []).map(
      (p: { x: number; y: number }) => [p.x, p.y] as [number, number]
    )
    layoutLinks.push({ id: linkId, points, link })
  }

  const layoutGroups: LayoutGroup[] = computeGroupBounds(graph, layoutNodes)

  const graphMeta = g.graph() as { width?: number; height?: number }
  const width = graphMeta.width || 800
  const height = graphMeta.height || 600

  return { nodes: layoutNodes, links: layoutLinks, groups: layoutGroups, width, height }
}
// @diagram-layout-compute-end

// @diagram-layout-group-bounds
export function computeGroupBoundsFromLayout(graph: DiagramGraph, layoutNodes: LayoutNode[]): LayoutGroup[] {
  return computeGroupBounds(graph, layoutNodes)
}

function computeGroupBounds(graph: DiagramGraph, layoutNodes: LayoutNode[]): LayoutGroup[] {
  const groups: LayoutGroup[] = []
  const PAD = 30
  const LABEL_PAD = 24

  for (const group of graph.groups) {
    const members = layoutNodes.filter(n => n.node.group === group.id)
    if (members.length === 0) continue

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const m of members) {
      minX = Math.min(minX, m.x - m.width / 2)
      minY = Math.min(minY, m.y - m.height / 2)
      maxX = Math.max(maxX, m.x + m.width / 2)
      maxY = Math.max(maxY, m.y + m.height / 2)
    }

    groups.push({
      id: group.id,
      x: minX - PAD,
      y: minY - PAD - LABEL_PAD,
      width: maxX - minX + PAD * 2,
      height: maxY - minY + PAD * 2 + LABEL_PAD,
      group,
    })
  }

  return groups
}
// @diagram-layout-group-bounds-end
// @diagram-layout-end
