/*
  Main module
*/
const fs = require('fs')
const parser = require('./parser')

const src = fs.readFileSync('examples/hello.guava').toString()

const out = parser.parse(src)

fs.writeFileSync('example.c', out)
