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
      const boot =
        '<script>\n' +
        getClientJs() +
        '\n;(function(){function b(){if(window.IFlow&&IFlow.boot)IFlow.boot()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",b);else b()})()\n</script>'
      return self.createBlock(parent, 'pass', body + boot)
    })
  })
}
