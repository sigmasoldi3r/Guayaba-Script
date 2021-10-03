/*
  Abstract syntax tree definitions
*/

export interface CodeOffset {
  offset: number;
  line: number;
  column: number;
}

export interface Node<T extends string = string> {
  type: T;
  location: {
    source?: any;
    start: CodeOffset;
    end: CodeOffset;
  }
}

export interface Script extends Node<'program'> {
  body: (Query | Macro)[];
}

export interface Macro extends Node<'macro'> {
  name: Name;
  src: string;
}

export interface Pragma extends Node<'pragma'> {}

export type Query
  = Value
  | Select
  | Insert
  | Call
  | DeclareFunction
  | DeclareRow
  | Return

export interface QueryType<T extends string = string> extends Node<'query'> {
  kind: T;
}

export type Expr
  = Query
  | Literal
  | Name

export interface Value extends QueryType<'VALUE'> {
  target: TypeName;
  names: Name[];
}

export interface Select extends QueryType<'SELECT'> {}

export interface Insert extends QueryType<'INSERT'> {
  expr: Expr;
  target: FromExpr;
}

export interface Call extends QueryType<'CALL'> {
  target: FromExpr;
  args: Expr[];
}

export interface DeclareFunction extends QueryType<'FUNCTION'> {
  args?: TypeName[];
  rType?: TypeName;
  body: Expr | Query[];
  name: Name;
}

export interface DeclareRow extends QueryType<'ROW'> {
  types: TypeName[];
  name: TypeName;
}

export interface Return extends QueryType<'RETURN'> {
  expr: Expr;
}

// Terminals
export interface Name extends Node<'name'> {
  value: string;
  escaped?: true;
}

export interface FromExpr extends Node<'from'> {
  segments: {
    name: Name;
    mode?: 'in' | 'from';
  }[];
}

export interface TypeName extends Node<'typename'> {
  name: Name;
  pointer: boolean;
  generic?: TypeName[];
}

export interface LiteralType<T extends string = string> extends Node<'literal'> {
  kind: T;
}

export type Literal = StringLiteral | NumberLiteral

export interface StringLiteral extends LiteralType<'string'> {
  value: string;
}

export interface NumberLiteral extends LiteralType<'number'> {
  value: string;
}
