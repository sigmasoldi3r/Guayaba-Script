const peg = require('peggy')
const fs = require('fs')

class CompilerError extends Error {}

class Compiler {
  /** @param {Compiler|null} parent */
  constructor(parent = null) {
    this.parent = parent
  }
  static create() {
    const compiler = new Compiler()
    compiler.symbols = new Map([
      ['print', 'printf'],
      ['alloc', 'alloc'],
      ['malloc', 'malloc'],
      ['calloc', 'calloc'],
    ])
    compiler.typeNames = new Map([
      ['float', 'float'],
      ['int', 'int'],
      ['double', 'double'],
      ['void', 'void'],
    ])
    compiler.macros = new Map([
      ['sum', function(...args) { return '(' + args.map(e => this.compileExpr(e)).join(' + ') + ')' }],
      ['sub', function(...args) { return '(' + args.map(e => this.compileExpr(e)).join(' - ') + ')' }],
      ['mul', function(...args) { return '(' + args.map(e => this.compileExpr(e)).join(' * ') + ')' }],
      ['div', function(...args) { return '(' + args.map(e => this.compileExpr(e)).join(' / ') + ')' }],
    ])
    return compiler
  }
  child() {
    return new Compiler(this)
  }
  symbols = new Map()
  countSymbols() {
    const s = this.symbols.size
    if (this.parent != null) {
      return s + this.parent.countSymbols()
    }
    return s
  }
  registerSymbol({ value }) {
    if (this.symbols.has(value)) {
      throw new CompilerError(`The identifier ${value} is already defined.`)
    }
    this.symbols.set(value, `_var${this.countSymbols()}_`)
  }
  expandName({ value }) {
    if (this.symbols.has(value)) {
      return this.symbols.get(value)
    }
    if (this.parent != null) {
      return this.parent.expandName({ value })
    }
    return null
  }
  typeNames = new Map()
  registerType({ name, generic }) {
    if (this.typeNames.has(value)) {
      throw new CompilerError(`The type ${value} is already declared.`)
    }
    this.typeNames.set(name, `${name.value.replace(/[^A-Z_0-9]/g, '_')}_t${this.typeNames.size}`)
  }
  expandType({ name }) {
    if (this.typeNames.has(name.value)) {
      return this.typeNames.get(name.value)
    }
    if (this.parent != null) {
      return this.parent.expandType({ name })
    }
    return null
  }
  compileLiteral({ kind, value }) {
    if (kind === 'string') {
      return `"${value}"`
    }
    return value
  }
  compileExpr(expr) {
    switch (expr.type) {
      case 'macro':
        return this.compileMacro(expr)
      case 'query':
        return this.compileQuery(expr)
      case 'literal':
        return this.compileLiteral(expr)
      case 'name':
        return this.expandName(expr)
    }
    throw new CompilerError(`Unexpected "${expr.type}" expression type found.`)
  }
  expandNameList(names) {
    return names.map(n => this.expandName(n)).join(', ')
  }
  compileExprList(expr) {
    return expr.map(a => this.compileExpr(a)).join(', ')
  }
  /** @type {Map<string, function>} */
  macros = new Map()
  compileMacro({ name, src }) {
    try {
      const func = eval(src)
      this.macros.set(name.value, func)
    } catch (err) {
      throw new CompilerError(`Cannot compile macro "${name}": ${err}`)
    }
  }
  isMacro({ value }) {
    if (this.macros.has(value)) {
      return true
    }
    if (this.parent != null) {
      return this.parent.isMacro({ value })
    }
    return false
  }
  expandMacro({ value }, args, ctx = this) {
    if (this.macros.has(value)) {
      return this.macros.get(value).call(ctx, ...args)
    }
    if (this.parent != null) {
      return this.parent.expandMacro({ value }, args, this)
    }
    return null
  }
  compileCALL({ target, args }) {
    if (this.isMacro(target)) {
      return this.expandMacro(target, args)
    }
    return `${this.expandName(target)}(${this.compileExprList(args)})`
  }
  compilePUT({ expr, target }) {
    return `${this.expandName(target)} = ${this.compileExpr(expr)}`
  }
  compileRESERVE({ target, names }) {
    for (const name of names) {
      this.registerSymbol(name)
    }
    return `${this.expandType(target)} ${this.expandNameList(names)}`
  }
  declarations = new Map()
  compileRETURN({ expr }) {
    return 'return ' + this.compileExpr(expr)
  }
  compileDECLARE({ name, args, rType, body }) {
    if (rType == null) {
      rType = { value: 'void' }
    }
    if (name.value === 'main') {
      this.symbols.set('main', 'main')
    } else {
      this.registerSymbol(name)
    }
    if (!(body instanceof Array)) {
      body = [body]
    }
    const child = this.child()
    if (args == null) {
      args = []
    }
    args.forEach((_, i) =>{
      child.registerSymbol({
        value: `$${i+1}`
      })
    })
    return `${this.expandType(rType)} ${this.expandName(name)}(${
      args.map((type, i) => 
        `${child.expandType(type)} ${child.expandName({ value: `$${i+1}` })}`
      ).join(', ')
    }) {
${
      body.map(e => child.compileExpr(e)).filter(Boolean).map(e => '  ' + e + ';').join('\n')
}
}`
  }
  compileQuery(query) {
    /** @type {function} */
    const f = this[`compile${query.kind}`]
    if (f == undefined) {
      throw new CompilerError(`Attempting to compile an unknown query type of "${query.kind}"!`)
    }
    return f.call(this, query)
  }
  compileProgram(ast) {
    if (ast.type !== 'program') {
      throw new CompilerError(`Attempting to parse a "${ast.type}" node as a program!`)
    }
    ast.body.forEach(e => {
      if (e.type === 'query' && (e.kind !== 'DECLARE' && e.kind !== 'RESERVE')) {
        throw new CompilerError(`Only declarations might appear as top level statements! Found ${e.kind}`)
      }
    })
    return `#include <stdio.h>

${ast.body.map(e => this.compileExpr(e)).filter(Boolean).map(e => e + ';').join('\n')}
`
  }
}

const fromDisk = _ => fs.readFileSync(_[0]).toString()

const parser = peg.generate(fromDisk`grammar.pegjs`)

const ast = parser.parse(fromDisk`example.guava`)

const c = Compiler.create()

fs.writeFileSync('example.c', c.compileProgram(ast))
