'use strict'

const test = require('node:test')
const assert = require('node:assert')
const Asciidoctor = require('@asciidoctor/core')
const { register, buildBootHtml } = require('../lib/instruction-flow-extension.js')

function convert () {
  const A = Asciidoctor()
  const registry = A.Extensions.create()
  register(registry, {})
  return A.convert(
    '[instructionflow#t]\n====\n{ id: "t", start: "a", nodes: { a: { type: "content", html: "<p>x</p>" } } }\n====\n',
    { extension_registry: registry }
  )
}

test('runtime is inert; boot is an onload handler (survives SoftNav DOMParser swap)', () => {
  const html = convert()
  // A bare executable <script> never runs after SoftNav swaps the article in.
  const scripts = html.match(/<script[^>]*>/g) || []
  for (const s of scripts) assert.match(s, /type="(text\/plain|application\/json)"/, `executable script found: ${s}`)
  assert.match(html, /<img class="instruction-flow__boot"[^>]* onload="[^"]*IFlow\.boot\(\)/)
})

test('handler attribute is valid HTML (no raw double quotes)', () => {
  const html = buildBootHtml('window.IFlow = {}')
  const m = html.match(/onload="([^"]*)"/)
  assert.ok(m, 'onload attribute parses')
  assert.ok(m[1].includes('IFlow.boot()'))
})

test('runtime cannot close its own script tag', () => {
  const html = buildBootHtml('var s = "</script>"')
  assert.strictEqual((html.match(/<\/script>/g) || []).length, 1)
})
