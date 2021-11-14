import * as t from "@babel/types";
import SymbolTable, {
  AnyType, ArrayType, BooleanType,
  NullType,
  NumberType,
  StringType, Type, UndefinedType, UnionType,
} from "./symbolTable";
import report from "./errorReport";


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
      case "ExpressionStatement":
        this.visitExpression(node.expression);
        break;
      case "BlockStatement":
        node.body.forEach((stmt) => this.visitStatement(stmt));
        break;
      default:
        console.debug(`visitStatement: node of type ${node.type} not supported, skipping.`);
        break;
    }
  }

  visitExpression(node: t.Expression): Type {
    console.log(`visit: seeing a ${node.type}`);
    switch (node.type) {
      case "NullLiteral": return new NullType;
      case "StringLiteral": return new StringType;
      case "BooleanLiteral": return new BooleanType;
      case "NumericLiteral":
      case "BigIntLiteral":
      case "DecimalLiteral":
        return new NumberType;
      case "ArrayExpression":
        return this.visitArrayExpression(node);
      default:
        console.debug(`visitExpression: node of type ${node.type} not supported, returning Any.`);
        return new AnyType();
    }
  }

  private visitVariableDeclaration(node: t.VariableDeclaration) {
    for (let declaration of node.declarations) {
      this.visitVariableDeclarator(declaration);
    }
  }
  private visitVariableDeclarator(node: t.VariableDeclarator) {
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

  private visitArrayExpression(node: t.ArrayExpression) {
    if (node.elements == null) {
      return new ArrayType(new AnyType());
    } else {
      let elementTypes: Set<Type> = new Set<Type>();
      for (let element of node.elements) {
        if (element === null) {
          throw new Error("I don't think this is possible");
        } else if (t.isSpreadElement(element)) {
          elementTypes.add(this.visitSpreadElement(element));
        } else {
          elementTypes.add(this.visitExpression(element));
        }
      }
      if (elementTypes.has(new AnyType())) {
        return new ArrayType(new AnyType());
      }
      let types = Array.from(elementTypes);
      if (types.length === 1) {
        return new ArrayType(types[0] as Type);
      } else {
        return new ArrayType(new UnionType(types));
      }
    }
  }

  private visitSpreadElement(node: t.SpreadElement): Type {
    let type: Type = this.visitExpression(node.argument);
    if (!type.isIterable()) {
      // TODO: Figure out filename
      report.addError(`The spread operator can only operate on iterable types, instead was given ${type}`, "", node.loc?.start.line, node.loc?.start.column);
      // TODO: Figure out appropriate type to continue with
      return new AnyType(); // continue for further error reporting
    } else {
      return type.getSpreadType();
    }
  }

}
