import {
  Call,
  DeclareFunction,
  DeclareRow,
  Expr,
  Literal,
  Macro,
  Name,
  Node,
  Insert,
  Query,
  Value,
  Return,
  Script,
  FromExpr,
  TypeName,
} from './AST';
import { CodeGenerator } from './CodeGenerator';
import { CompilerException, LocalSymbolClashException } from './Exceptions';

export type MacroProgram = (...args: any[]) => string;

/**
 * The zero location, used for builtin types and names.
 */
export const LOCATION_ZERO =  {
  start: { offset: 0, column: 0, line: 0 },
  end: { offset: 0, column: 0, line: 0 },
};

/**
 * Default, unknown type.
 */
export const UnknownType: TypeName = {
  pointer: false,
  type: 'typename',
  location: LOCATION_ZERO,
  name: {
    value: 'unknown',
    location: LOCATION_ZERO,
    type: 'name'
  }
};

/**
 * Factory function for builtin local symbols.
 */
export function builtin(name: string): Local {
  return {
    type: UnknownType,
    alias: name,
    def: {
      type: 'name',
      value: name,
      location: LOCATION_ZERO
    }
  }
}

const defaultSymbols = [
  ['print', builtin('printf')],
  ['alloc', builtin('alloc')],
  ['malloc', builtin('malloc')],
  ['calloc', builtin('calloc')],
] as const;
const defaultTypeNames = [
  ['float', 'float'],
  ['int', 'int'],
  ['double', 'double'],
  ['void', 'void'],
] as const;
const defaultMacros = [
  [
    'sum',
    function (...args) {
      return '(' + args.map(e => this.compile(e)).join(' + ') + ')';
    },
  ],
  [
    'sub',
    function (...args) {
      return '(' + args.map(e => this.compile(e)).join(' - ') + ')';
    },
  ],
  [
    'mul',
    function (...args) {
      return '(' + args.map(e => this.compile(e)).join(' * ') + ')';
    },
  ],
  [
    'div',
    function (...args) {
      return '(' + args.map(e => this.compile(e)).join(' / ') + ')';
    },
  ],
  [
    'point',
    function (...args) {
      return args.map(e => '&' + this.compile(e)).join(', ');
    },
  ],
] as const;

export type GeneratorConstructor = {new(c:Compiler): CodeGenerator};

/**
 * Local symbol declaration, stores the type, including the
 * unknown type if not know.
 */
export interface Local {
  alias: string;
  def: Name;
  type: TypeName;
}

/**
 * A simple compiler walker that accepts an abstract code
 * generation target.
 */
export default class Compiler {
  /**
   * Creates the default compiler object.
   */
  static create(ctor: GeneratorConstructor): Compiler {
    const compiler = new Compiler(ctor);
    for (const [k, v] of defaultSymbols) {
      compiler.locals.set(k, v);
    }
    for (const [k, v] of defaultMacros) {
      compiler.macros.set(k, v);
    }
    for (const [k, v] of defaultTypeNames) {
      compiler.types.set(k, v);
    }
    return compiler;
  }

  private readonly generator: CodeGenerator;

  constructor(
    private readonly Generator: GeneratorConstructor,
    private readonly parent?: Compiler
  ) {
    this.generator = new Generator(this);
  }

  /**
   * Creates a child context from this compiler.
   */
  createLocal() {
    return new Compiler(this.Generator, this);
  }

  /**
   * @returns True if parent present, false otherwise.
   */
  hasParent() {
    return this.parent != null;
  }

  /**
   * A map containing compiled macros.
   */
  readonly macros = new Map<string, MacroProgram>();

  /**
   * A map containing local symbols for variables and
   * functions.
   */
  readonly locals = new Map<string, Local>();

  /**
   * A map containing local type names.
   */
  readonly types = new Map<string, string>();

  countLocals(): number {
    return this.locals.size + (this.parent?.countLocals() ?? 0);
  }

  countTypes(): number {
    return this.types.size + (this.parent?.countTypes() ?? 0);
  }

  countMacros(): number {
    return this.macros.size + (this.parent?.countMacros() ?? 0);
  }

  /**
   * Registers a new local symbol, if it exists it will
   * throw an exception.
   */
  registerLocal(def: Name, type: TypeName) {
    const name = def.value;
    if (this.locals.has(name)) {
      throw new LocalSymbolClashException(
        `Symbol ${name} is already declared`,
        def
      );
    }
    this.locals.set(name, {
      alias: this.generator.translateSymbol(def),
      def,
      type
    });
  }

  /**
   * Registers a new type, if it exists it will throw an
   * exception.
   */
   registerType(def: TypeName) {
    const name = def.name.value;
    if (this.types.has(name)) {
      throw new LocalSymbolClashException(
        `Type ${name} is already declared`,
        def
      );
    }
    this.types.set(name, this.generator.translateType(def));
  }

  /**
   * Fetches the macro by name, if exists either in this
   * context or in the parent context.
   * Result is null if no macro exists.
   * @param name The target macro name
   */
  getMacro(name: string): MacroProgram | null {
    if (this.macros.has(name)) {
      return this.macros.get(name);
    }
    if (this.parent != null) {
      return this.parent.getMacro(name);
    }
    return null;
  }

  /**
   * Fetches the local symbol by name, if exists either in
   * this context or in the parent context.
   * Result is null if no local symbol exists.
   * @param name The target local symbol name
   */
  getLocal(name: string, origin: Node, enforce = true): Local | null {
    if (this.locals.has(name)) {
      return this.locals.get(name);
    }
    if (this.parent != null) {
      return this.parent.getLocal(name, origin, enforce);
    }
    if (enforce) {
      throw new CompilerException(`Symbol ${name} not found`, origin);
    }
    return null;
  }

  /**
   * Fetches the type by name, if exists either in this
   * context or in the parent context.
   * Result is null if no type exists.
   * @param name The target type name
   */
  getType(name: string, origin: Node, enforce = true): string | null {
    if (this.types.has(name)) {
      return this.types.get(name);
    }
    if (this.parent != null) {
      return this.parent.getType(name, origin, enforce);
    }
    if (enforce) {
      throw new CompilerException(`Unknown type ${name}`, origin);
    }
    return null;
  }

  /**
   * Compiles the call type query.
   */
  compileCall(query: Call): string {
    const macro = this.getMacro(query.target.names[0].value);
    if (macro != null) {
      // Expand the macro if found.
      try {
        return macro.call(this, ...query.args);
      } catch (e) {
        throw new CompilerException(`Macro "${query.target.names[0].value}" evaluation failed: ${e}`, query);
      }
    }
    // generate a call if not.
    return this.generator.call(query);
  }

  /**
   * Compiles the declaration type query.
   */
  compileFunction(query: DeclareFunction): string {
    this.registerLocal(query.name, UnknownType);
    const local = this.createLocal();
    const args = query.args ?? [];
    args.forEach((node, i) => {
      local.registerLocal({
        location: node.location, type: 'name', value: `$${i + 1}`
      }, node);
    });
    return this.generator.functionDeclare(query, local);
  }

  /**
   * Compiles a PUT query.
   */
  compileInsert(query: Insert): string {
    return this.generator.insert(query);
  }

  /**
   * Compiles a return type query.
   */
  compileReturn(query: Return): string {
    return this.generator.return(query);
  }

  /**
   * Compiles a variable reservation query.
   */
  compileValue(query: Value): string {
    for (const name of query.names) {
      this.registerLocal(name, query.target);
    }
    return this.generator.value(query);
  }

  /**
   * Compiles a row record declaration.
   */
  compileRow(node: DeclareRow): string {
    this.registerType(node.name);
    return this.generator.rowDeclare(node);
  }

  /**
   * Compiles any valid query statement.
   */
  compileQuery(query: Query): string {
    switch (query.kind) {
      case 'CALL':
        return this.compileCall(query);
      case 'FUNCTION':
        return this.compileFunction(query);
      case 'ROW':
        return this.compileRow(query);
      case 'INSERT':
        return this.compileInsert(query);
      case 'RETURN':
        return this.compileReturn(query);
      case 'VALUE':
        return this.compileValue(query);
    }
    throw new CompilerException(`Query ${query.kind} not supported`, query);
  }

  compileLiteral(node: Literal): string {
    if (node.kind === 'string') {
      return this.generator.stringLiteral(node);
    } else {
      return this.generator.numberLiteral(node);
    }
  }

  compileMacro(node: Macro): null {
    try {
      this.macros.set(node.name.value, eval(node.src));
    } catch (err) {
      throw new CompilerException(
        `Cannot compile macro ${node.name.value}: ${err}`,
        node
      );
    }
    return null;
  }

  compileFrom(node: FromExpr): string {
    return this.generator.fromExpr(node);
  }

  /**
   * Attempts to compile any kind of node.
   */
  compile(node: Node): string | null {
    switch (node.type) {
      case 'program':
        return this.generator.script(node as Script);
      case 'query':
        return this.compileQuery(node as Query);
      case 'literal':
        return this.compileLiteral(node as Literal);
      case 'macro':
        return this.compileMacro(node as Macro);
      case 'name':
        return this.getLocal((node as Name).value, node)?.alias;
      case 'from':
        return this.compileFrom(node as FromExpr);
    }
    throw new Error(
      `Unexpected type ${node.type} found at line ${node.location.start.line}, column ${node.location.start.column}`
    );
  }
}
