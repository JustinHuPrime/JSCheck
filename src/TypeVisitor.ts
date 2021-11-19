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
      case "BigIntLiteral":
      case "DecimalLiteral":
        return new NumberType();
      case "ArrayExpression":
        return this.visitArrayExpression(node);
      case "ObjectExpression":
        return this.visitObjectExpression(node);
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
          let indexType = null; // Only used for arrays
          let propertyName; // Only used for objects
          if (t.isExpression(node.left.property)) {
            indexType = this.visitExpression(node.left.property);
            propertyName = this.getObjectPropertyName(node.left.property);
          }
          let lhsIsVariable = t.isIdentifier(node.left.object);

          if (lhsIsVariable) {
            if (
              lhsType instanceof ArrayType &&
              indexType instanceof NumberType
            ) {
              // if the LHS is a variable, update its type
              let newListType = new ArrayType(
                UnionType.asNeeded([lhsType.elementType, rhsType]),
              );
              this.setVariableType(
                (node.left.object as t.Identifier).name,
                newListType,
              );
            } else if (lhsType instanceof ObjectType && propertyName) {
              lhsType.fields[propertyName] = rhsType;
            } else {
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

  private getObjectPropertyName(node: t.Expression) {
    if (t.isIdentifier(node)) {
      // Key is a static name, accessed as in the style `obj.x`
      return node.name;
    } else if (t.isLiteral(node) && "value" in node) {
      // If it's a computed name, we only handle cases when they are literals
      // (coerse them into a string if they have a value, and fail otherwise)
      return node.value.toString();
    } else {
      console.warn(
        `getObjectPropertyName: unsupported object property name (${node})`,
      );
      return undefined;
    }
  }

  private visitObjectExpression(node: t.ObjectExpression): Type {
    let fields: { [key: string]: Type } = {};
    for (let property of node.properties) {
      if (t.isObjectProperty(property) && t.isExpression(property.value)) {
        // we don't support object methods
        let propertyName = this.getObjectPropertyName(property.key);
        if (propertyName) {
          fields[propertyName] = this.visitExpression(property.value);
        }
      }
      // TODO: spread expressions
    }
    return new ObjectType(fields);
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
    let propertyType = null; // for arrays
    let propertyName; // for object
    if (t.isExpression(node.property)) {
      if (node.computed) {
        // Identifiers can be used for static object accesses (`obj.x`) or variable references in a computed property
        // We only want to visit the property as an expression in the latter case, because `x` might not be a variable
        // in scope
        propertyType = this.visitExpression(node.property);
      }
      propertyName = this.getObjectPropertyName(node.property);
    }

    if (objectType instanceof ArrayType && propertyType instanceof NumberType) {
      return objectType.elementType; // Array index (numbers only; associative arrays are not supported)
    } else if (
      objectType instanceof StringType &&
      propertyType instanceof NumberType
    ) {
      return objectType; // String index. TODO: Add a test for this
    } else if (objectType instanceof ObjectType && propertyName) {
      let propertyValueType = objectType.fields[propertyName];
      return propertyValueType || new UndefinedType();
    }

    console.warn(
      `visitMemberExpression: unsupported property access (${propertyType} on ${objectType})`,
    );
    console.debug(node);
    return new UndefinedType();
  }
}
