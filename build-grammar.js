/*
  Builds grammar.
*/
const peg = require('peggy')
const tspegjs = require('ts-pegjs')
const fs = require('fs')

const grammar = fs.readFileSync('grammar.pegjs').toString()

const parser = peg.generate(grammar, {
  output: 'source',
  format: 'commonjs',
  plugins: [tspegjs],
  tspegjs: {
    customHeader: ``
  }
})
fs.writeFileSync('src/Parser.ts', parser)
