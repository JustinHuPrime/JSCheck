import * as t from "@babel/types";
import SymbolTable, {
  AnyType,
  ArrayType,
  BooleanType,
  ErrorType,
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
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
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
      case "IfStatement":
        this.visitIfStatement(node);
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
      case "MemberExpression":
        // Reference to an array index or object property
        return this.visitMemberExpression(node);
      default:
        console.debug(
          `visitExpression: node of type ${node.type} not supported, returning Any.`,
        );
        console.debug(node);
        return new AnyType();
    }
  }

  public getVariableType(variableName: string, node: t.Node): Type {
    let type = this.symbolTable.getVar(variableName);
    if (type == null) {
      report.addError(
        `Reference to unknown variable ${variableName}`,
        this.filename,
        node.loc?.start.line,
        node.loc?.start.column,
      );
      return new ErrorType(); // proceed on errors
    }
    return type;
  }

  public setVariableType(variableName: string, newType: Type) {
    this.symbolTable.setVar(variableName, newType);
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

  private visitArrayExpression(node: t.ArrayExpression) {
    if (node.elements == null) {
      return new ArrayType(new AnyType());
    } else {
      let elementTypes: Type[] = [];
      for (let element of node.elements) {
        if (element === null) {
          throw new Error("I don't think this is possible");
        } else if (t.isSpreadElement(element)) {
          elementTypes.push(this.visitArraySpreadElement(element));
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

  private visitArraySpreadElement(node: t.SpreadElement): Type {
    let type: Type = this.visitExpression(node.argument);
    if (!type.isIterable()) {
      report.addError(
        `The spread operator can only operate on iterable types, instead was given ${type}`,
        this.filename,
        node.loc?.start.line,
        node.loc?.start.column,
      );
      return new ErrorType();
    } else {
      return type.getSpreadType();
    }
  }

  // TODO: Uncomment code when visit object is implemented
  // private visitObjectSpreadElement(node: t.SpreadElement): Type {
  //   const type: Type = this.visitExpression(node.argument);
  //
  //   if (!type.isIterable() && !(type instanceof ObjectType)) {
  //     report.addError(
  //       `The spread operator can only operate on iterable types, instead was given ${type}`,
  //       this.filename,
  //       node.loc?.start.line,
  //       node.loc?.start.column,
  //     );
  //     return new ErrorType();
  //   } else {
  //     return type.getSpreadType();
  //   }
  // }

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

  private visitIfStatement(node: t.IfStatement) {
    let testType = this.visitExpression(node.test);
    if (!this.containsBoolean(testType)) {
      report.addError(
        `If condition does not produce a boolean, instead produces ${testType}`,
        "",
        node.test.loc?.start.line,
        node.test.loc?.start.column,
      );
    }
    let initialEnv = this.symbolTable;
    let trueEnv = new SymbolTable(initialEnv);
    this.symbolTable = trueEnv;
    this.visitStatement(node.consequent);
    console.log(`True env:`);
    if (t.isStatement(node.alternate)) {
      this.symbolTable = new SymbolTable(initialEnv);
      this.visitStatement(node.alternate);
      trueEnv.merge(this.symbolTable);
      initialEnv.replace(trueEnv);
    } else {
      initialEnv = trueEnv.mergeUp();
    }
    this.symbolTable = initialEnv;
  }

  private containsBoolean(testType: Type) {
    return testType.type.indexOf(new BooleanType().type) != -1;
  }
}
