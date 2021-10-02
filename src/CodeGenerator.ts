import {
  Call,
  DeclareFunction,
  DeclareRow,
  NumberLiteral,
  Insert,
  Value,
  Return,
  Script,
  StringLiteral,
  FromExpr,
  TypeName,
  Name
} from './AST';
import Compiler from './Compiler';

/**
 * Abstract interface to produce code from an AST node.
 */
export abstract class CodeGenerator {
  constructor(readonly compiler: Compiler) {}
  public abstract functionDeclare(node: DeclareFunction, local: Compiler): string;
  public abstract rowDeclare(node: DeclareRow): string;
  public abstract value(node: Value): string;
  public abstract call(node: Call): string;
  public abstract insert(node: Insert): string;
  public abstract return(node: Return): string;
  public abstract stringLiteral(node: StringLiteral): string;
  public abstract numberLiteral(node: NumberLiteral): string;
  public abstract script(node: Script): string;
  public abstract translateSymbol(from: Name): string;
  public abstract translateType(from: TypeName): string;
  public abstract fromExpr(from: FromExpr): string;
}
