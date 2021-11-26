import * as t from "@babel/types";
import SymbolTable, {
  AnyType,
  ArrayType,
  BooleanType,
  ErrorType,
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
        this.visitBlockStatement(node);
        break;
      case "IfStatement":
        this.visitIfStatement(node);
        break;
      case "ForOfStatement":
      case "ForInStatement":
        this.visitForInOfStatement(node);
        break;
      case "ForStatement":
        this.visitForStatement(node);
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
      case "BinaryExpression":
        return this.visitBinaryExpression(node);
      case "SequenceExpression":
        return this.visitSequenceExpression(node);
      case "LogicalExpression":
        return this.visitLogicalExpression(node);
      case "UnaryExpression":
        return this.visitUnaryExpression(node);
      case "ConditionalExpression":
        return this.visitConditionalExpression(node);
      case "CallExpression":
        return this.visitCallExpression(node);
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
    try {
      if (global.hasOwnProperty(variableName)) {
        // This is a JS global (e.g. "console")
        return new AnyType();
      }
      return this.symbolTable.getVariableType(variableName);
    } catch (e) {
      report.addError(
        `Reference to unknown variable ${variableName}`,
        this.filename,
        node.loc?.start.line,
        node.loc?.start.column,
      );
      return new ErrorType();
    }
  }

  public setVariableType(variableName: string, newType: Type, node: t.Node) {
    try {
      this.symbolTable.setVariableType(variableName, newType);
    } catch (e) {
      report.addError(
        `Variable assignment to an undeclared variable named ${variableName}`,
        this.filename,
        node.loc?.start.line,
        node.loc?.start.column,
      );
    }
  }

  private declareVariableType(variableName: string, newType: Type) {
    this.symbolTable.declareVariableType(variableName, newType);
  }

  // Assignments to existing vars, e.g. `x = 5;`
  private visitAssignmentExpression(node: t.AssignmentExpression): Type {
    switch (node.operator) {
      case "=":
        let rhsType = this.visitExpression(node.right);
        if (t.isIdentifier(node.left)) {
          // Setting a variable
          this.setVariableType(node.left.name, rhsType, node);
          return rhsType;
        } else if (t.isMemberExpression(node.left)) {
          // Assignment to array or object member:
          // We ONLY handle numeric assignments to arrays, and static property assignments to objects
          // Dynamic property assignments in the form `obj[fieldName]` are NOT supported as the field name can vary at runtime
          // We assume that all assignments to arrays are in range - i.e. ignoring potentially undefined elements added in between
          let lhsType = this.visitExpression(node.left.object);
          let indexType = null; // Only used for arrays
          let propertyName; // Only used for objects
          if (!t.isExpression(node.left.property)) {
            break;
          }
          propertyName = this.getObjectPropertyName(node.left.property);
          let lhsIsVariable = t.isIdentifier(node.left.object);

          if (lhsIsVariable) {
            // if the LHS is a variable, update its type
            if (lhsType instanceof ArrayType) {
              indexType = this.visitExpression(node.left.property);
              if (indexType instanceof NumberType) {
                // Extend the array type in-place to support circular types
                lhsType.extend([rhsType], true);
              } else {
                break;
              }
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
          return rhsType;
        }
    }
    console.warn(
      `visitAssignmentExpression: assignments of type ${node.operator} are not yet supported`,
    );
    return new AnyType();
  }

  private visitVariableDeclaration(node: t.VariableDeclaration) {
    if (node.kind === "var") {
      // TODO: care about global vars (only in blocks, not in functions, but when undeclared too)
      console.warn(
        "we might not treat the scope for var correctly within blocks",
      );
    }
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
    this.declareVariableType(node.id.name, foundType);
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

  private getObjectPropertyName(node: t.Expression) {
    if (t.isIdentifier(node)) {
      // Key is a static name, accessed as in the style `obj.x`
      return node.name;
    } else if (t.isLiteral(node) && "value" in node) {
      // If it's a computed name, we only handle cases when they are literals
      // (coerce them into a string if they have a value, and fail otherwise)
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
    let propertyType = null; // for arrays
    let propertyName; // for objects
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
    } else if (propertyName) {
      // General property references, including object properties and builtins of other types
      return objectType.getPropertyType(propertyName) ?? new UndefinedType();
    }

    console.warn(
      `visitMemberExpression: unsupported property access (${propertyType} on ${objectType})`,
    );
    console.debug(node);
    return new UndefinedType();
  }

  public visitCallExpression(node: t.CallExpression): Type {
    let argumentTypes = [];
    for (let argument of node.arguments) {
      if (t.isExpression(argument)) {
        argumentTypes.push(this.visitExpression(argument));
      } else {
        console.warn(
          `visitCallExpression: unknown argument type ${argument.type}`,
        );
        argumentTypes.push(new AnyType());
      }
    }
    if (
      t.isMemberExpression(node.callee) &&
      t.isExpression(node.callee.property)
    ) {
      let objectType = this.visitExpression(node.callee.object);
      let propertyName = this.getObjectPropertyName(node.callee.property);
      if (propertyName == null) {
        // Can this actually happen??
        report.addError(
          `Bad property name ${propertyName} in instance method call`,
          this.filename,
          node.loc?.start.line,
          node.loc?.start.column,
        );
        return new ErrorType();
      }
      let methodReturnType = objectType.getMethodReturnType(
        propertyName,
        argumentTypes,
      );
      if (methodReturnType == null) {
        report.addError(
          `Method ${propertyName} does not exist on type ${objectType}`,
          this.filename,
          node.loc?.start.line,
          node.loc?.start.column,
        );
        return new ErrorType();
      }
      return methodReturnType;
    } else {
      console.warn(
        `visitCallExpression: only instance methods for primitive types are supported so far`,
      );
      return new AnyType();
    }
  }

  private visitBlockStatement(node: t.BlockStatement) {
    this.symbolTable = new SymbolTable(this.symbolTable);
    node.body.forEach((stmt) => this.visitStatement(stmt));
    if (this.symbolTable.getParentScope() == null) {
      throw new Error("Mismatched scope");
    }
    this.symbolTable.overwriteUpOne();
    this.symbolTable = this.symbolTable.getParentScope() as SymbolTable;
  }

  private visitIfStatement(node: t.IfStatement) {
    this.visitExpression(node.test); // visit in case there is some side effect but with type coercion this can be anything
    let initialEnv = this.symbolTable;
    let trueEnv = new SymbolTable(initialEnv);
    this.symbolTable = trueEnv;
    this.visitStatement(node.consequent);
    if (t.isStatement(node.alternate)) {
      this.symbolTable = new SymbolTable(initialEnv);
      this.visitStatement(node.alternate);
      trueEnv.overwriteForBothModified(this.symbolTable);
      trueEnv.mergeUpOne();
      this.symbolTable.mergeUpOne();
    } else {
      trueEnv.mergeUpToDecl();
    }
    this.symbolTable = initialEnv;
  }

  private visitForInOfStatement(node: t.ForInStatement | t.ForOfStatement) {
    let initialEnv = this.symbolTable;
    this.symbolTable = new SymbolTable(initialEnv);

    if (t.isDeclareVariable(node.left)) {
      this.visitVariableDeclaration(node.left);
    } else if (t.isExpression(node.left)) {
      this.visitExpression(node.left);
    } else {
      throw new Error("Reached impossible state according to documentation");
    }
    let iterType = this.visitExpression(node.right);
    if (t.isForOfStatement(node) && !this.isArrayOrObject(iterType)) {
      report.addError(
        `For Of loops must iterate over arrays or objects, instead given ${iterType}`,
        this.filename,
        node.right.loc?.start.line,
        node.right.loc?.start.column,
      );
    } else if (t.isForInStatement(node) && !this.isStringOrArray(iterType)) {
      report.addError(
        `For In loops must iterate over arrays or strings, instead given ${iterType}`,
        this.filename,
        node.right.loc?.start.line,
        node.right.loc?.start.column,
      );
    }

    this.visitStatement(node.body);

    this.symbolTable.mergeUpOne();
    this.symbolTable = initialEnv;
  }

  private visitForStatement(node: t.ForStatement) {
    let initialEnv = this.symbolTable;
    this.symbolTable = new SymbolTable(initialEnv);

    if (t.isDeclareVariable(node.init)) {
      this.visitVariableDeclaration(node.init);
    } else if (t.isExpression(node.init)) {
      this.visitExpression(node.init);
    }
    if (t.isExpression(node.test)) {
      this.visitExpression(node.test);
    }
    if (t.isExpression(node.update)) {
      this.visitExpression(node.update);
    }
    this.visitStatement(node.body);

    this.symbolTable.mergeUpOne();
    this.symbolTable = initialEnv;
  }

  private isArrayOrObject(iterType: Type): boolean {
    if (iterType instanceof UnionType) {
      return (
        iterType.types.filter((type) => this.isArrayOrObject(type)).length != 0
      );
    }
    return (
      iterType instanceof ArrayType ||
      iterType instanceof ObjectType ||
      iterType instanceof AnyType
    );
  }

  private isStringOrArray(iterType: Type): boolean {
    if (iterType instanceof UnionType) {
      return (
        iterType.types.filter((type) => this.isStringOrArray(type)).length != 0
      );
    }
    return (
      iterType instanceof ArrayType ||
      iterType instanceof StringType ||
      iterType instanceof AnyType
    );
  }
}
