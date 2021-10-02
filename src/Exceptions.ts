import { Node } from "./AST";

export class CompilerException extends Error {
  constructor(message: string, public readonly origin: Node) {
    super(`${message} at line ${origin.location?.start?.line ?? '?'}, column ${origin.location?.start?.column ?? '?'}`);
  }
}

export class LocalSymbolClashException extends CompilerException {}
