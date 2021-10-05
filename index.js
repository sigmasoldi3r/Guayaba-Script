/*
  Main module
*/
const fs = require('fs')
const parser = require('./parser')

function compile(from, to) {
  const src = fs.readFileSync(from).toString()
  const out = parser.parse(src)
  fs.writeFileSync(to, out)
}

compile('examples/hello.guava', 'example.c')
compile('examples/arduino_blink.guava', 'arduino_blink.c')
