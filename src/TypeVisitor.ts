import * as t from "@babel/types";
import SymbolTable, {
  AnyType,
  ArrayType,
  BooleanType,
  NullType,
  NumberType,
  ObjectType,
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
      case "MemberExpression":
        // Reference to an array index or object property
        return this.visitMemberExpression(node);
      case "BinaryExpression":
      case "SequenceExpression":
        return this.visitBinaryExpression(node);
      case "LogicalExpression":
        return this.visitLogicalExpression(node);
      case "UnaryExpression":
        return this.visitUnaryExpression(node);
      case "ConditionalExpression":
        return this.visitConditionalExpression(node);
      default:
        console.debug(
          `visitExpression: node of type ${node.type} not supported, returning Any.`,
        );
        console.debug(node);
        return new AnyType();
    }
  }

  public visitConditionalExpression(node: t.ConditionalExpression): Type {
    const testType = this.visitExpression(node.test);
    if (testType.alwaysTrue()) {
      return this.visitExpression(node.consequent);
    } else if (testType.alwaysFalse()) {
      return this.visitExpression(node.alternate);
    } else {
      return UnionType.asNeeded([
        this.visitExpression(node.consequent),
        this.visitExpression(node.alternate),
      ]);
    }
  }

  public visitLogicalExpression(node: t.LogicalExpression): Type {
    const leftType: Type = this.visitExpression(node.left);
    switch (node.operator) {
      case "||": {
        if (leftType.alwaysFalse()) {
          return this.visitExpression(node.right);
        } else if (leftType.alwaysTrue()) {
          return leftType;
        } else {
          return UnionType.asNeeded([
            leftType,
            this.visitExpression(node.right),
          ]); // TODO: remove alwaysTrue and alwaysFalse from leftType
        }
      }
      case "&&": {
        if (leftType.alwaysTrue()) {
          return this.visitExpression(node.right);
        } else if (leftType.alwaysFalse()) {
          return leftType;
        } else {
          return UnionType.asNeeded([
            leftType,
            this.visitExpression(node.right),
          ]); // TODO: remove alwaysTrue and alwaysFalse from leftType
        }
      }
      case "??": {
        if (leftType.alwaysFalse()) {
          return this.visitExpression(node.right);
        } else {
          return UnionType.asNeeded([
            leftType,
            this.visitExpression(node.right),
          ]); // TODO: remove alwaysFalse from leftType
        }
      }
    }
  }

  public visitSequenceExpression(node: t.SequenceExpression): Type {
    let last!: Type;
    node.expressions.forEach((expr) => {
      last = this.visitExpression(expr);
    });
    return last;
  }

  public visitBinaryExpression(node: t.BinaryExpression): Type {
    // TODO: I'm assuming that types never have an exotic toPrimitive
    // TODO: also assuming that node.left is never a PrivateName (exported object with no associated exported class)
    const leftType = this.visitExpression(node.left as t.Expression);
    const rightType = this.visitExpression(node.right);
    switch (node.operator) {
      case "+": {
        const lprim = leftType.toPrimitive();
        const rprim = rightType.toPrimitive();
        if (lprim instanceof AnyType || rprim instanceof AnyType) {
          return new AnyType();
        } else if (lprim instanceof StringType || rprim instanceof StringType) {
          return new StringType();
        } else {
          return new NumberType();
        }
      }
      case "-":
      case "/":
      case "%":
      case "*":
      case "**":
      case "&":
      case "|":
      case ">>":
      case ">>>":
      case "<<":
      case "^": {
        return new NumberType();
      }
      case "==":
      case "===":
      case "!=":
      case "!==":
      case ">":
      case "<":
      case ">=":
      case "<=": {
        return new BooleanType();
      }
      case "in": {
        if (
          !(rightType instanceof ObjectType || rightType instanceof AnyType)
        ) {
          report.addError(
            `cannot use 'in' on non-object; given a ${rightType}`,
            "", // TODO: missing filename
            node.loc?.start.line,
            node.loc?.start.column,
          );
        }
        return new BooleanType();
      }
      case "instanceof": {
        if (
          !(rightType instanceof ObjectType || rightType instanceof AnyType)
        ) {
          report.addError(
            `cannot use 'instanceof' on non-object; given a ${rightType}`,
            "", // TODO: missing filename
            node.loc?.start.line,
            node.loc?.start.column,
          );
        }
        return new BooleanType();
      }
    }
  }

  public visitUnaryExpression(node: t.UnaryExpression): Type {
    this.visitExpression(node.argument);
    switch (node.operator) {
      case "void": {
        return new UndefinedType();
      }
      case "delete": {
        return new BooleanType();
      }
      case "!":
      case "+":
      case "-":
      case "~": {
        return new NumberType();
      }
      case "typeof": {
        return new StringType();
      }
      default: {
        console.log(
          `encountered unsupported UnaryExpression ${node} (operator was ${node.operator})`,
        );
        return new AnyType();
      }
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
        } else if (t.isMemberExpression(node.left)) {
          // Assignment to array or object member:
          // We ONLY handle numeric assignments to arrays, and static property assignments to objects
          // Dynamic property assignments in the form `obj[fieldName]` are NOT supported as the field name can vary at runtime
          // We assume that all assignments to arrays are in range - i.e. ignoring potentially undefined elements added in between
          let lhsType = this.visitExpression(node.left.object);
          let indexOrPropertyType = null;
          if (t.isExpression(node.left.property)) {
            indexOrPropertyType = this.visitExpression(node.left.property);
          }
          let lhsIsVariable = t.isIdentifier(node.left.object);

          if (lhsIsVariable) {
            if (
              lhsType instanceof ArrayType &&
              indexOrPropertyType instanceof NumberType
            ) {
              // if the LHS is a variable, update its type
              let newListType = new ArrayType(
                UnionType.asNeeded([lhsType.elementType, rhsType]),
              );
              this.setVariableType(
                (node.left.object as t.Identifier).name,
                newListType,
              );
            } else {
              // TODO: support objects
              console.warn(
                `visitAssignmentExpression: unsupported assignment type for node ${node}.`,
              );
            }
          }
          // Otherwise, I don't think there's anything to do? JS will accept assigning to members of anything -
          // for numbers and strings it appears to just be a noop -JL
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

  private visitArrayExpression(node: t.ArrayExpression): Type {
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

  private visitMemberExpression(node: t.MemberExpression): Type {
    let objectType = this.visitExpression(node.object);
    let propertyType = null;
    if (t.isExpression(node.property)) {
      propertyType = this.visitExpression(node.property);
    }

    if (objectType instanceof ArrayType && propertyType instanceof NumberType) {
      return objectType.elementType;
    }
    // TODO: handle objects

    console.warn(
      `visitMemberExpression: unsupported property access (${propertyType} on ${objectType})`,
    );
    console.debug(node);
    return new AnyType();
  }
}
