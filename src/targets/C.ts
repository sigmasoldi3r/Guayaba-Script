import {
  DeclareFunction,
  Call,
  Insert,
  Return,
  StringLiteral,
  NumberLiteral,
  Script,
  Value,
  DeclareRow,
  FromExpr,
  TypeName,
  Name,
} from '../AST';
import { CodeGenerator } from '../CodeGenerator';
import Compiler from '../Compiler';

/**
 * Default, plain old C code generator.
 */
export default class C extends CodeGenerator {
  fromExpr(node: FromExpr): string {
    if (node.names.length === 1) {
      return this.compiler.compile(node.names[0])
    }
    node.names.reverse();
    let last = this.compiler.getLocal(node.names[0].value, node.names[0]);
    return node.names.slice(1).reduce((prev, curr, i) => {
      const acc = last.type.pointer ? '->' : '.';
      return `${prev}${acc}${this.translateSymbol(curr)}`;
    }, last.alias);
  }
  rowDeclare(node: DeclareRow): string {
    const columns = node.types.map(
      (t, i) => this.compiler.getType(t.name.value, t) + ` _${i}`
    );
    const name = this.compiler.getType(node.name.name.value, node.name);
    return `struct ${name} { ${columns.join('; ')} } typedef ${name}`;
  }
  functionDeclare(node: DeclareFunction, local: Compiler): string {
    const type = this.compiler.getType(node.rType?.name?.value ?? 'void', node.rType ?? node);
    const name = this.compiler.getLocal(node.name.value, node.name);
    const args = node.args ?? [];
    const list = node.body instanceof Array ? node.body : [node.body];
    const body = list
      .map(e => local.compile(e))
      .filter(Boolean)
      .map(e => '  ' + e + ';')
      .join('\n');
    const argList = args.map((type, i) => {
      const typeName = local.getType(type.name.value, type);
      const t = this.translateType({ ...type, name: { ...type.name, value: typeName } })
      const varName = local.getLocal(`$${i + 1}`, type.name).alias;
      return `${t} ${varName}`;
    });
    return `${type} ${name.alias}(${argList.join(', ')}) {
${body}
}`;
  }
  call(node: Call): string {
    const name = this.compiler.compile(node.target);
    const args = node.args.map(e => this.compiler.compile(e));
    return `${name}(${args.join(', ')})`;
  }
  value(node: Value): string {
    const type = this.compiler.getType(node.target.name.value, node.target);
    const names = node.names.map(n => this.compiler.getLocal(n.value, n).alias);
    return `${type} ${names.join(', ')}`;
  }
  insert(node: Insert): string {
    const target = this.compiler.compile(node.target);
    const expr = this.compiler.compile(node.expr);
    return `${target} = ${expr}`;
  }
  return(node: Return): string {
    const expr = this.compiler.compile(node.expr);
    return `return ${expr}`;
  }
  stringLiteral(node: StringLiteral): string {
    return `"${node.value}"`;
  }
  numberLiteral(node: NumberLiteral): string {
    return node.value;
  }
  script(node: Script): string {
    return `#include <stdio.h>

${node.body
  .map(e => this.compiler.compile(e))
  .filter(Boolean)
  .map(e => e + ';')
  .join('\n')}
    `;
  }
  translateSymbol({ value }: Name): string {
    if (value.match(/[$+*\/\\?!º'-]/)) {
      return `_var${this.compiler.countLocals()}_`;
    }
    return value;
  }
  translateType(type: TypeName): string {
    const { name, pointer } = type;
    const p = pointer ? '*' : ''
    if (name.value.match(/[$+*\/\\?!º'-]/)) {
      return `_type${this.compiler.countTypes()}_${p}`;
    }
    return name.value + p;
  }
}
