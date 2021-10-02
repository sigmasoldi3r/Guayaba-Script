import * as Parser from './Parser';
import * as fs from 'fs';
import Compiler from './Compiler';
import C from './targets/C';
import { Call, DeclareFunction, Return, Script } from './AST';

/**
 * Main class.
 */
export default class Main {
  static main() {
    const ast: Script = Parser.parse(
      fs.readFileSync('examples/hello.guava').toString()
    );
    const compiler = Compiler.create(C);
    const result = compiler.compile(ast);
    fs.writeFileSync('examples/hello.c', result);
  }
}
Main.main();
