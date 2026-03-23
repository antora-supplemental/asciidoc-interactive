'use strict'

const Asciidoctor = require('@asciidoctor/core')
const A = Asciidoctor()
const registry = A.Extensions.create()
require('./instruction-flow-extension.js').register(registry, {})

const src = `[instructionflow#demo]
====
{
  // JSON5: comments and trailing commas allowed
  id: "demo",
  start: "os",
  nodes: {
    os: {
      type: "choice",
      title: "Choose OS",
      options: [
        { id: "linux", label: "Linux", hint: "Debian/Ubuntu/Fedora", next: "pm" },
        { id: "win", label: "Windows", next: "pm" },
      ],
    },
    pm: {
      type: "choice",
      title: "Package manager",
      options: [{ id: "npm", label: "npm", next: "done" }],
    },
    done: {
      type: "content",
      html: "<p>Run <code>npm i -g @antora/cli</code></p>",
    },
  },
}
====
`

const html = A.convert(src, { extension_registry: registry })
if (!html.includes('instruction-flow') || !html.includes('Choose OS')) {
  console.error('FAIL: expected flow markup')
  process.exit(1)
}
console.log('smoke-convert: ok')
