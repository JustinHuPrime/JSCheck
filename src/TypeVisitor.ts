import * as t from "@babel/types";
import SymbolTable, {
  AnyType,
  ArrayType,
  BooleanType,
  NullType,
  NumberType,
  StringType,
  Type,
  UndefinedType,
  UnionType,
} from "./symbolTable";
import report from "./errorReport";

export default class TypeVisitor {
  private symbolTable: SymbolTable;
  constructor() {
    this.symbolTable = new SymbolTable();
  }

  // For debugging
  public getSymbolTable() {
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
        console.debug(
          `visitStatement: node of type ${node.type} not supported, skipping.`,
        );
        break;
    }
  }

  visitExpression(node: t.Expression): Type {
    console.log(`visit: seeing a ${node.type}`);
    switch (node.type) {
      case "NullLiteral":
        return new NullType();
      case "StringLiteral":
        return new StringType();
      case "BooleanLiteral":
        return new BooleanType();
      case "NumericLiteral":
      case "BigIntLiteral":
      case "DecimalLiteral":
        return new NumberType();
      case "ArrayExpression":
        return this.visitArrayExpression(node);
      case "AssignmentExpression":
        // assignments to existing vars, like `x = 5;`
        return this.visitAssignmentExpression(node);
      case "Identifier":
        // Reference to a variable
        return this.getVariableType(node.name, node);
      default:
        console.debug(
          `visitExpression: node of type ${node.type} not supported, returning Any.`,
        );
        console.debug(node);
        return new AnyType();
    }
  }

  public getVariableType(variableName: string, node: t.Node): Type {
    let mapping = this.symbolTable.getMap();
    let type = mapping.get(variableName);
    if (type == null) {
      report.addError(
        `Reference to unknown variable ${variableName}`,
        // TODO: missing filename
        "",
        node.loc?.start.line,
        node.loc?.start.column,
      );
      return new AnyType(); // proceed on errors
    }
    return type;
  }

  public setVariableType(variableName: string, newType: Type) {
    let mapping = this.symbolTable.getMap();
    return mapping.set(variableName, newType);
  }

  // Assignments to existing vars, e.g. `x = 5;`
  private visitAssignmentExpression(node: t.AssignmentExpression): Type {
    switch (node.operator) {
      case "=":
        let rhsType = this.visitExpression(node.right);
        if (t.isIdentifier(node.left)) {
          // Setting a variable
          this.setVariableType(node.left.name, rhsType);
        }
        return rhsType;
      default:
        console.warn(
          `visitAssignmentExpression: assignments of type ${node.operator} are not yet supported`,
        );
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
      throw new Error(
        "Pattern matching variable declarations are not supported.",
      );
    }

    let foundType;
    if (node.init == null) {
      foundType = new UndefinedType();
    } else {
      foundType = this.visitExpression(node.init);
    }
    this.setVariableType(node.id.name, foundType);
  }

  private visitArrayExpression(node: t.ArrayExpression) {
    if (node.elements == null) {
      return new ArrayType(new AnyType());
    } else {
      let elementTypes: Type[] = [];
      for (let element of node.elements) {
        if (element === null) {
          throw new Error("I don't think this is possible");
        } else if (t.isSpreadElement(element)) {
          elementTypes.push(this.visitSpreadElement(element));
        } else {
          elementTypes.push(this.visitExpression(element));
        }
      }
      if (
        elementTypes.some((value) => {
          return value.toString() === new AnyType().toString();
        })
      ) {
        return new ArrayType(new AnyType());
      }
      elementTypes = elementTypes.filter((value, index, arry) => {
        return (
          arry.findIndex((value2) => {
            return value2.toString() === value.toString();
          }) === index
        );
      });
      return new ArrayType(UnionType.asNeeded(elementTypes));
    }
  }

  private visitSpreadElement(node: t.SpreadElement): Type {
    let type: Type = this.visitExpression(node.argument);
    if (!type.isIterable()) {
      // TODO: Figure out filename
      report.addError(
        `The spread operator can only operate on iterable types, instead was given ${type}`,
        "",
        node.loc?.start.line,
        node.loc?.start.column,
      );
      // TODO: Figure out appropriate type to continue with
      return new AnyType(); // continue for further error reporting
    } else {
      return type.getSpreadType();
    }
  }
}
