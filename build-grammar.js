/*
  Builds grammar.
*/
const peg = require('peggy')
const fs = require('fs')

const grammar = fs.readFileSync('grammar.pegjs').toString()

const parser = peg.generate(grammar, {
  output: 'source',
  format: 'commonjs'
})
fs.writeFileSync('parser.js', parser)
