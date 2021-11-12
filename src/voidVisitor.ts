import * as t from "@babel/types";
import SymbolTable, {
  AnyType,
  NullType,
  NumberType,
  StringType,
} from "./symbolTable";

export default class VoidVisitor {
  private symbolTable: SymbolTable;
  constructor() {
    this.symbolTable = new SymbolTable();
  }

  getSymbolTable() {
    return this.symbolTable;
  }

  // Entrypoint
  visit(node: t.Node) {
    console.log(`visit: seeing a ${node.type}`);
    switch (node.type) {
      case "File":
        node.program.body.forEach((stmt) => this.visit(stmt));
        return;
      case "VariableDeclaration":
        this.visitVariableDeclaration(node);
        break;
      default:
        break;
    }
  }

  visitVariableDeclaration(node: t.VariableDeclaration) {
    for (let declaration of node.declarations) {
      this.visitVariableDeclarator(declaration);
    }
  }
  visitVariableDeclarator(node: t.VariableDeclarator) {
    if (!t.isIdentifier(node.id)) {
      // FIXME: better exception
      throw new Error("Only single variable declarations are supported");
    }

    let foundType = new AnyType();
    console.log(`node.init is ${node.init?.type}`);
    if (node.init == null) {
      foundType = new NullType();
    } else if (t.isNumericLiteral(node.init)) {
      foundType = new NumberType();
    } else if (t.isStringLiteral(node.init)) {
      foundType = new StringType();
    } else {
      // FIXME: lots of other cases, we'll have to decide which ones we care about!
    }
    let mapping = this.symbolTable.getMap();
    mapping.set(node.id.name, foundType);
  }
}
