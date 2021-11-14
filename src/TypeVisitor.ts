import * as t from "@babel/types";
import SymbolTable, {
  AnyType, BooleanType,
  NullType,
  NumberType,
  StringType, Type, UndefinedType,
} from "./symbolTable";

export default class TypeVisitor {
  private symbolTable: SymbolTable;
  constructor() {
    this.symbolTable = new SymbolTable();
  }

  getSymbolTable() {
    return this.symbolTable;
  }

  // Entrypoint
  visitProgram(node: t.Node): void {
    if (node.type === "File") {
      node.program.body.forEach((stmt) => this.visitStatement(stmt));
      return;
    } else {
      throw new Error("Must provide a valid file to visit.");
    }
  }

  visitStatement(node: t.Statement): void {
    console.log(`visit: seeing a ${node.type}`);
    switch (node.type) {
      case "VariableDeclaration":
        this.visitVariableDeclaration(node);
        break;
      default:
        console.debug(`visitStatement: node of type ${node.type} not supported, skipping.`);
        break;
    }
  }

  visitExpression(node: t.Expression): Type {
    console.log(`visit: seeing a ${node.type}`);
    switch (node.type) {
      case "NullLiteral": return NullType;
      case "StringLiteral": return StringType;
      case "BooleanLiteral": return BooleanType;
      case "NumericLiteral":
      case "BigIntLiteral":
      case "DecimalLiteral":
        return NumberType;
      default:
        console.debug(`visitExpression: node of type ${node.type} not supported, returning Any.`);
        return AnyType;
    }
  }

  visitVariableDeclaration(node: t.VariableDeclaration) {
    for (let declaration of node.declarations) {
      this.visitVariableDeclarator(declaration);
    }
  }
  visitVariableDeclarator(node: t.VariableDeclarator) {
    if (!t.isIdentifier(node.id)) {
      throw new Error("Pattern matching variable declarations are not supported.");
    }

    let foundType;
    console.log(`node.init is ${node.init?.type}`);
    if (node.init == null) {
      foundType = new UndefinedType();
    } else {
      foundType = this.visitExpression(node.init);
    }
    let mapping = this.symbolTable.getMap();
    mapping.set(node.id.name, foundType);
  }
}
