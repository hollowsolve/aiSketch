// @diagram-inspector
import { store } from '../state'
import { getSelectedNodeId, selectNode, applyAndRelayout } from './editing'
import type { DiagramNode, DiagramNodeType, DiagramLinkType, DiagramGroupType } from './types'

const NODE_TYPES: DiagramNodeType[] = [
  'service', 'database', 'queue', 'cache', 'gateway',
  'client', 'storage', 'function', 'external', 'custom',
]

// @diagram-inspector-init
export function initInspector() {
  store.subscribe(renderInspector)
}
// @diagram-inspector-init-end

// @diagram-inspector-render
function renderInspector() {
  const panel = document.getElementById('diagram-inspector')
  const content = document.getElementById('inspector-content')
  if (!panel || !content) return

  const { mode, diagram } = store.get()
  panel.style.display = mode === 'diagram' ? '' : 'none'

  if (mode !== 'diagram' || !diagram.graph) {
    content.innerHTML = '<div class="inspector-empty">Select a node to inspect</div>'
    return
  }

  const selectedId = getSelectedNodeId()
  if (!selectedId) {
    content.innerHTML = '<div class="inspector-empty">Select a node to inspect</div>'
    return
  }

  const node = diagram.graph.nodes.find(n => n.id === selectedId)
  if (!node) {
    content.innerHTML = '<div class="inspector-empty">Node not found</div>'
    return
  }

  const groups = diagram.graph.groups

  content.innerHTML = `
    <div class="inspector-field">
      <label class="inspector-label">ID</label>
      <span class="inspector-value">${node.id}</span>
    </div>
    <div class="inspector-field">
      <label class="inspector-label">Type</label>
      <select class="inspector-select" id="insp-type">
        ${NODE_TYPES.map(t => `<option value="${t}" ${t === node.type ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="inspector-field">
      <label class="inspector-label">Label</label>
      <input class="inspector-input" id="insp-label" value="${escapeAttr(node.label)}" />
    </div>
    <div class="inspector-field">
      <label class="inspector-label">Description</label>
      <input class="inspector-input" id="insp-desc" value="${escapeAttr(node.description || '')}" />
    </div>
    <div class="inspector-field">
      <label class="inspector-label">Group</label>
      <select class="inspector-select" id="insp-group">
        <option value="">(none)</option>
        ${groups.map(g => `<option value="${g.id}" ${g.id === node.group ? 'selected' : ''}>${g.label}</option>`).join('')}
      </select>
    </div>
    <div class="inspector-field">
      <label class="inspector-label">Tags</label>
      <input class="inspector-input" id="insp-tags" value="${escapeAttr((node.tags || []).join(', '))}" placeholder="tag1, tag2" />
    </div>
    <div class="inspector-actions">
      <button class="inspector-delete-btn" id="insp-delete">Delete Node</button>
    </div>
  `

  bindInspectorEvents(node)
}
// @diagram-inspector-render-end

// @diagram-inspector-events
function bindInspectorEvents(node: DiagramNode) {
  const typeEl = document.getElementById('insp-type') as HTMLSelectElement
  const labelEl = document.getElementById('insp-label') as HTMLInputElement
  const descEl = document.getElementById('insp-desc') as HTMLInputElement
  const groupEl = document.getElementById('insp-group') as HTMLSelectElement
  const tagsEl = document.getElementById('insp-tags') as HTMLInputElement
  const deleteEl = document.getElementById('insp-delete') as HTMLButtonElement

  typeEl?.addEventListener('change', () => {
    applyAndRelayout([{ op: 'updateNode', id: node.id, changes: { type: typeEl.value as DiagramNodeType } }])
  })

  labelEl?.addEventListener('change', () => {
    applyAndRelayout([{ op: 'updateNode', id: node.id, changes: { label: labelEl.value } }])
  })

  descEl?.addEventListener('change', () => {
    applyAndRelayout([{ op: 'updateNode', id: node.id, changes: { description: descEl.value || undefined } }])
  })

  groupEl?.addEventListener('change', () => {
    applyAndRelayout([{ op: 'updateNode', id: node.id, changes: { group: groupEl.value || undefined } }])
  })

  tagsEl?.addEventListener('change', () => {
    const tags = tagsEl.value.split(',').map(t => t.trim()).filter(Boolean)
    applyAndRelayout([{ op: 'updateNode', id: node.id, changes: { tags: tags.length ? tags : undefined } }])
  })

  deleteEl?.addEventListener('click', () => {
    applyAndRelayout([{ op: 'removeNode', id: node.id }])
    selectNode(null)
  })
}
// @diagram-inspector-events-end

// @diagram-inspector-utils
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
// @diagram-inspector-utils-end
// @diagram-inspector-end
