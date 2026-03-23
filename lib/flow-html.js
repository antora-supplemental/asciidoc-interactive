'use strict'

/**
 * Build pass-through HTML for an instruction flow from structured JSON.
 * @param {object} flow - Parsed flow document
 * @param {string} blockId - DOM id suffix from block attributes
 * @returns {string}
 */
function buildFlowHtml (flow, blockId) {
  validateFlow(flow)
  const id = sanitizeId(blockId || flow.id || 'flow')
  const jsonStr = embedJsonInScript(flow)
  const sections = renderAllNodes(flow, id)
  return [
    `<div class="instruction-flow" id="instruction-flow-${id}" data-flow-id="${escapeAttr(id)}" data-iflow-version="1">`,
    `<script type="application/json" class="instruction-flow__data">${jsonStr}</script>`,
    `<div class="instruction-flow__toolbar" role="toolbar" aria-label="Instruction flow">`,
    `<button type="button" class="instruction-flow__back" hidden>Back</button>`,
    `<button type="button" class="instruction-flow__reset">Start over</button>`,
    `<button type="button" class="instruction-flow__expand-print">Expand all for print</button>`,
    `</div>`,
    `<nav class="instruction-flow__breadcrumb" aria-live="polite" aria-atomic="true"></nav>`,
    `<div class="instruction-flow__noscript-fallback" hidden>`,
    `<p><strong>No JavaScript:</strong> full linear outline of steps is shown below.</p>`,
    `<ol class="instruction-flow__outline">${renderOutline(flow)}</ol>`,
    `</div>`,
    sections,
    `</div>`,
  ].join('')
}

function validateFlow (flow) {
  if (!flow || typeof flow !== 'object') throw new Error('instructionflow: flow must be an object')
  if (!flow.start || typeof flow.start !== 'string') throw new Error('instructionflow: missing string "start"')
  if (!flow.nodes || typeof flow.nodes !== 'object') throw new Error('instructionflow: missing object "nodes"')
  if (!flow.nodes[flow.start]) throw new Error(`instructionflow: start node "${flow.start}" not found in nodes`)
  for (const [key, node] of Object.entries(flow.nodes)) {
    if (!node || typeof node !== 'object') throw new Error(`instructionflow: invalid node "${key}"`)
    const t = node.type
    if (t !== 'choice' && t !== 'content') {
      throw new Error(`instructionflow: node "${key}" needs type "choice" or "content"`)
    }
    if (t === 'choice') {
      if (!Array.isArray(node.options) || node.options.length === 0) {
        throw new Error(`instructionflow: choice node "${key}" needs non-empty options[]`)
      }
      for (const opt of node.options) {
        if (!opt.id || !opt.next) throw new Error(`instructionflow: option in "${key}" needs id and next`)
        if (!flow.nodes[opt.next]) throw new Error(`instructionflow: next "${opt.next}" missing for option in "${key}"`)
      }
    }
    if (t === 'content' && typeof node.html !== 'string') {
      throw new Error(`instructionflow: content node "${key}" needs html string`)
    }
  }
}

function sanitizeId (s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '-')
}

function escapeAttr (s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtml (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function embedJsonInScript (obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

function renderOutline (flow) {
  const out = []
  const seen = new Set()

  function walk (nodeId) {
    if (seen.has(nodeId)) return
    seen.add(nodeId)
    const node = flow.nodes[nodeId]
    if (!node) return
    if (node.type === 'content') {
      out.push(`<li>${stripTags(node.html)}</li>`)
      return
    }
    out.push(`<li>${escapeHtml(node.title || nodeId)}<ol>`)
    for (const opt of node.options || []) {
      out.push('<li>')
      out.push(escapeHtml(opt.label || opt.id))
      walk(opt.next)
      out.push('</li>')
    }
    out.push('</ol></li>')
  }

  walk(flow.start)
  return out.join('')
}

function stripTags (html) {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function renderAllNodes (flow, blockId) {
  const parts = ['<div class="instruction-flow__nodes">']
  for (const nodeId of Object.keys(flow.nodes)) {
    parts.push(renderNode(flow, nodeId, blockId))
  }
  parts.push('</div>')
  return parts.join('')
}

function renderNode (flow, nodeId, blockId) {
  const node = flow.nodes[nodeId]
  const nid = `${blockId}__${sanitizeId(nodeId)}`
  if (node.type === 'content') {
    return [
      `<section class="instruction-flow__node instruction-flow__node--content" id="${escapeAttr(nid)}" data-node="${escapeAttr(nodeId)}" hidden>`,
      `<div class="instruction-flow__body">${node.html}</div>`,
      `</section>`,
    ].join('')
  }
  const title = node.title ? `<h4 class="instruction-flow__title">${escapeHtml(node.title)}</h4>` : ''
  const buttons = (node.options || [])
    .map((opt) => {
      const label = escapeHtml(opt.label || opt.id)
      const hint = opt.hint ? ` title="${escapeAttr(opt.hint)}"` : ''
      return `<button type="button" class="instruction-flow__choice"${hint} data-option="${escapeAttr(opt.id)}" data-next="${escapeAttr(opt.next)}">${label}</button>`
    })
    .join('')
  return [
    `<section class="instruction-flow__node instruction-flow__node--choice" id="${escapeAttr(nid)}" data-node="${escapeAttr(nodeId)}" data-flow-kind="choice" hidden>`,
    title,
    `<div class="instruction-flow__choices" role="radiogroup" aria-label="${escapeAttr(node.title || nodeId)}">`,
    buttons,
    `</div>`,
    `</section>`,
  ].join('')
}

module.exports = { buildFlowHtml, validateFlow }
