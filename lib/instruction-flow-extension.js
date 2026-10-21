'use strict'

const fs = require('fs')
const path = require('path')
const JSON5 = require('json5')
const { buildFlowHtml } = require('./flow-html')

const clientJsPath = path.join(__dirname, '../supplemental_ui/js/instruction-flow.js')
const clientCssPath = path.join(__dirname, '../supplemental_ui/css/instruction-flow.css')
let cachedClientJs
let cachedClientCss
function getClientJs () {
  if (!cachedClientJs) cachedClientJs = fs.readFileSync(clientJsPath, 'utf8')
  return cachedClientJs
}
function getClientCss () {
  if (!cachedClientCss) cachedClientCss = fs.readFileSync(clientCssPath, 'utf8')
  return cachedClientCss
}

// 1x1 transparent GIF. Its onload handler is the boot trigger (see buildBootHtml).
const BOOT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// Runs when the pixel loads. Installs the runtime once (via a script element
// created at runtime, which always executes) and mounts every flow on the page.
const BOOT_HANDLER =
  "var r=this.previousElementSibling;" +
  "if(!window.IFlow&&r){var s=document.createElement('script');s.text=r.textContent;document.head.appendChild(s)}" +
  "if(window.IFlow)window.IFlow.boot()"

/**
 * Client runtime + boot trigger.
 *
 * A plain inline `<script>` does not survive SoftNav: SoftNav fetches the next
 * page, parses it with DOMParser and swaps the article into the live DOM, and
 * scripts from a parsed document never execute. That left the demo blank
 * (every node `hidden`, `window.IFlow` undefined) after in-site navigation.
 *
 * So the runtime ships inert (`type="text/plain"`) and a tiny image with an
 * `onload` handler starts it. Inline event handlers do fire on swapped-in
 * nodes, and also fire on a normal page load.
 */
function buildBootHtml (clientJs) {
  return (
    '<script type="text/plain" class="instruction-flow__runtime">\n' +
    clientJs.replace(/<\/script/gi, '<\\/script') +
    '\n</script>' +
    '<img class="instruction-flow__boot" src="' + BOOT_PIXEL + '" alt="" width="1" height="1" hidden aria-hidden="true" onload="' +
    BOOT_HANDLER.replace(/"/g, '&quot;') +
    '">'
  )
}
module.exports.buildBootHtml = buildBootHtml
/**
 * Scoped Asciidoctor extension for Antora: `[instructionflow]` example blocks with JSON5 flow definitions.
 *
 * @param {import('@asciidoctor/core').Extensions/Registry} registry
 * @param {object} _context - Antora context (file, contentCatalog, config)
 */
module.exports.register = function (registry, _context) {
  registry.block(function () {
    const self = this
    self.named('instructionflow')
    self.onContext('example')
    self.process(function (parent, reader, attributes) {
      const raw = reader.getLines().join('\n').trim()
      let data
      try {
        data = JSON5.parse(raw)
      } catch (e) {
        throw new Error(`instructionflow: invalid JSON5 — ${e.message}`)
      }
      const blockId = attributes.id || data.id || 'flow'
      const body = '<style>\n' + getClientCss() + '\n</style>\n' + buildFlowHtml(data, blockId)
      const boot = buildBootHtml(getClientJs())
      return self.createBlock(parent, 'pass', body + boot)
    })
  })
}
