/* global window, document */
;(function () {
  const PREFIX = 'iflow_'

  function parseData (root) {
    const el = root.querySelector('script.instruction-flow__data')
    if (!el || !el.textContent) return null
    try {
      return JSON.parse(el.textContent)
    } catch (e) {
      console.warn('instruction-flow: bad JSON', e)
      return null
    }
  }

  function paramName (flowId) {
    return PREFIX + flowId.replace(/[^a-zA-Z0-9_-]/g, '-')
  }

  function readChoicesFromUrl (flowId) {
    const u = new URL(window.location.href)
    const v = u.searchParams.get(paramName(flowId))
    if (!v) return null
    return v.split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean)
  }

  function writeChoicesToUrl (flowId, choiceIds) {
    const u = new URL(window.location.href)
    const key = paramName(flowId)
    if (!choiceIds.length) u.searchParams.delete(key)
    else u.searchParams.set(key, choiceIds.map((c) => encodeURIComponent(c)).join(','))
    window.history.replaceState({}, '', u.toString())
  }

  function replay (flow, choiceIds) {
    const path = [flow.start]
    let nodeId = flow.start
    for (const oid of choiceIds) {
      const node = flow.nodes[nodeId]
      if (!node || node.type !== 'choice') break
      const opt = node.options.find((o) => o.id === oid)
      if (!opt) break
      path.push(opt.next)
      nodeId = opt.next
    }
    return { path, nodeId }
  }

  function truncateChoicesForNode (flow, choices, curId) {
    if (curId === flow.start) return []
    let nid = flow.start
    const out = []
    for (let depth = 0; depth < choices.length; depth++) {
      const node = flow.nodes[nid]
      if (!node || node.type !== 'choice') break
      const opt = node.options.find((o) => o.id === choices[depth])
      if (!opt) break
      out.push(choices[depth])
      nid = opt.next
      if (nid === curId) return out
    }
    return out
  }

  function breadcrumbText (flow, path) {
    return path.map((id) => (flow.nodes[id] && flow.nodes[id].title) || id).join(' → ')
  }

  function findSection (root, nodeId) {
    return Array.from(root.querySelectorAll('.instruction-flow__node')).find(
      (el) => el.getAttribute('data-node') === nodeId
    )
  }

  function showOnly (root, nodeId) {
    root.querySelectorAll('.instruction-flow__node').forEach((el) => {
      el.hidden = el.getAttribute('data-node') !== nodeId
    })
    const cur = findSection(root, nodeId)
    if (cur) {
      const focusTarget = cur.querySelector('.instruction-flow__choices button, .instruction-flow__body')
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus({ preventScroll: true })
      }
    }
  }

  function mount (root) {
    if (root.dataset.iflowMounted) return
    root.dataset.iflowMounted = '1'

    const flow = parseData(root)
    if (!flow) return

    const flowId = root.getAttribute('data-flow-id') || 'flow'
    const backBtn = root.querySelector('.instruction-flow__back')
    const resetBtn = root.querySelector('.instruction-flow__reset')
    const printBtn = root.querySelector('.instruction-flow__expand-print')
    const crumb = root.querySelector('.instruction-flow__breadcrumb')

    let choices = readChoicesFromUrl(flowId) || []
    let path
    let nodeId

    function render () {
      const r = replay(flow, choices)
      path = r.path
      nodeId = r.nodeId
      showOnly(root, nodeId)
      if (crumb) crumb.textContent = breadcrumbText(flow, path)
      if (backBtn) backBtn.hidden = choices.length === 0
      writeChoicesToUrl(flowId, choices)
    }

    root.querySelectorAll('.instruction-flow__choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-next')
        const oid = btn.getAttribute('data-option')
        const cur = btn.closest('.instruction-flow__node')
        const curId = cur && cur.getAttribute('data-node')
        if (!next || !oid || !curId) return
        choices = truncateChoicesForNode(flow, choices, curId)
        choices.push(oid)
        render()
      })
    })

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        choices.pop()
        render()
      })
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        choices = []
        render()
      })
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        root.classList.add('instruction-flow--print-all')
        root.querySelectorAll('.instruction-flow__node').forEach((el) => {
          el.hidden = false
        })
        window.print()
        root.classList.remove('instruction-flow--print-all')
        render()
      })
    }

    render()
  }

  function boot () {
    document.querySelectorAll('.instruction-flow').forEach(mount)
  }

  window.IFlow = { boot, mount }
})()
