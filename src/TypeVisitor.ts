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
  TypeMap,
  UndefinedType,
  UnionType,
  VoidType,
} from "./symbolTable";
import report from "./errorReport";
import { logVerbose } from "./utils";

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
    logVerbose(`visit: seeing a ${node.type}`);
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
        this.visitForOfStatement(node);
        break;
      case "ForInStatement":
        this.visitForInStatement(node);
        break;
      case "ForStatement":
        this.visitForStatement(node);
        break;
      default:
        console.warn(
          `visitStatement: node of type ${node.type} not supported, skipping.`,
        );
        break;
    }
  }

  visitExpression(node: t.Expression): Type {
    logVerbose(`visit: seeing a ${node.type}`);
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
        console.warn(
          `visitExpression: node of type ${node.type} not supported, returning Any.`,
        );
        console.warn(node);
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

  private getBinaryOperationType(
    leftType: Type,
    rightType: Type,
    operator: string,
    node: t.Expression,
  ): Type {
    switch (operator) {
      case "+": {
        // TODO: I'm assuming that types never have an exotic toPrimitive
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
    console.warn(`getBinaryOperationType: Unknown operator type ${operator}`);
    return new AnyType();
  }

  public visitBinaryExpression(node: t.BinaryExpression): Type {
    if (!t.isExpression(node.left)) {
      console.warn(
        `visitBinaryExpression: Unhandled LHS in binary expression: ${node}`,
      );
      return new AnyType();
    }
    const leftType = this.visitExpression(node.left);
    const rightType = this.visitExpression(node.right);
    return this.getBinaryOperationType(
      leftType,
      rightType,
      node.operator,
      node,
    );
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
        console.warn(
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
        if (variableName === "undefined") {
          // undefined is not a literal but a global variable!!
          return new UndefinedType();
        }
        logVerbose(`Returning any type for JS global ${variableName}`);
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

  private visitAssignmentMemberExpression(
    left: t.MemberExpression,
    rhsType: Type,
    operator: string,
  ): any {
    if (operator !== "=") {
      console.warn(
        `visitAssignmentMemberExpression: assignments of type ${operator} are not yet supported`,
      );
      return rhsType;
    }
    // Assignment to array or object member:
    // We ONLY handle numeric assignments to arrays, and static property assignments to objects
    // Dynamic property assignments in the form `obj[fieldName]` are NOT supported as the field name can vary at runtime
    // We assume that all assignments to arrays are in range - i.e. ignoring potentially undefined elements added in between
    let lhsType = this.visitExpression(left.object);

    let indexType = null; // Only used for arrays
    let propertyName; // Only used for objects
    if (!t.isExpression(left.property)) {
      console.warn(
        "visitAssignmentMemberExpression: Unknown property type for LHS",
      );
      return new AnyType();
    }
    propertyName = this.getObjectPropertyName(left.property);
    let lhsIsVariable = t.isIdentifier(left.object);

    if (lhsIsVariable) {
      // if the LHS is a variable, update its type
      if (lhsType instanceof ArrayType) {
        indexType = this.visitExpression(left.property);
        if (indexType instanceof NumberType) {
          // Extend the array type in-place to support circular types
          lhsType.extend([rhsType], true);
        } else {
          console.warn(
            `visitAssignmentExpression: only numerical array indices are supported`,
          );
        }
      } else if (lhsType instanceof ObjectType && propertyName) {
        // Union types together if the object field previously had something else
        // This allows assignments to properties inside an if statement to work
        let oldRhsType = lhsType.fields[propertyName];
        if (oldRhsType) {
          lhsType.fields[propertyName] = UnionType.asNeeded([
            rhsType,
            oldRhsType,
          ]);
        } else {
          lhsType.fields[propertyName] = rhsType;
        }
      }
    }

    // Otherwise, I don't think there's anything to do? JS will accept assigning to members of anything -
    // for numbers and strings it appears to just be a noop -JL
    return rhsType;
  }

  // Assignments to existing vars, e.g. `x = 5;`
  private visitAssignmentExpression(node: t.AssignmentExpression): Type {
    let rhsType = this.visitExpression(node.right);
    switch (node.operator) {
      case "=":
        if (t.isIdentifier(node.left)) {
          // Setting a variable
          this.setVariableType(node.left.name, rhsType, node);
          return rhsType;
        } else if (t.isMemberExpression(node.left)) {
          return this.visitAssignmentMemberExpression(
            node.left,
            rhsType,
            node.operator,
          );
        } else {
          break;
        }
      case "*=":
      case "/=":
      case "%=":
      case "+=":
      case "-=":
      case "<<=":
      case ">>=":
      case ">>>=":
      case "&=":
      case "^=":
      case "|=":
      case "**=":
        let lhsType;
        // Only supported for variables
        if (t.isIdentifier(node.left)) {
          lhsType = this.getVariableType(node.left.name, node);
          let newType = this.getBinaryOperationType(
            lhsType,
            rhsType,
            node.operator.slice(0, node.operator.length - 1),
            node,
          );
          this.setVariableType(node.left.name, newType, node);
          return newType;
        } else {
          break;
        }
    }
    console.warn(
      `visitAssignmentExpression: assignments of type ${node.left.type} ${node.operator} ${node.right.type} are not yet supported`,
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
    if (node.elements == null || node.elements.length === 0) {
      logVerbose(
        `visitArrayExpression: creating any type list since it is empty`,
      );
      return new ArrayType(new VoidType());
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
        logVerbose(`visitArrayExpression: some elements are any`);
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
    let fields: TypeMap = {};
    for (let property of node.properties) {
      if (t.isObjectProperty(property) && t.isExpression(property.value)) {
        // We don't support object methods
        let propertyName = this.getObjectPropertyName(property.key);
        if (propertyName) {
          fields[propertyName] = this.visitExpression(property.value);
        }
      } else if (t.isSpreadElement(property)) {
        let argType = this.visitExpression(property.argument);
        if (argType instanceof ObjectType) {
          // Merge in the target's fields, replacing any conflicts
          fields = { ...fields, ...argType.fields };
        } else if (!argType.isIterable()) {
          report.addError(
            `Invalid spread operation: expected iterable type, got ${argType}`,
            this.filename,
            node.loc?.start.line,
            node.loc?.start.column,
          );
          return new ErrorType();
        } else {
          // For strings and arrays, spreading will dynamically create new properties mapping each
          // index to its value, so we can't statically analyze this
          console.warn(
            `visitObjectExpression: only spreading objects into other objects is supported`,
          );
        }
      }
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
    console.warn(node);
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
      logVerbose(`trueEnv mapping: `, trueEnv.getMap());
      logVerbose(`falseEnv mapping: `, this.symbolTable.getMap());
      trueEnv.mergeUpOne();
      this.symbolTable.mergeUpOne();
    } else {
      logVerbose(`trueEnv mapping: `, trueEnv.getMap());
      trueEnv.mergeUpToDecl();
    }
    logVerbose(`mapping after if merge: `, initialEnv.getMap());
    this.symbolTable = initialEnv;
  }

  private visitForStatement(node: t.ForStatement) {
    let initialEnv = this.symbolTable;
    this.symbolTable = new SymbolTable(initialEnv);

    if (t.isVariableDeclaration(node.init)) {
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

  private visitForOfStatement(node: t.ForOfStatement) {
    let initialEnv = this.symbolTable;
    this.symbolTable = new SymbolTable(initialEnv);

    let iterType = this.visitExpression(node.right);
    if (!this.isArrayOrString(iterType)) {
      report.addError(
        `For...of loops must iterate over arrays or strings, instead given ${iterType}`,
        this.filename,
        node.right.loc?.start.line,
        node.right.loc?.start.column,
      );

      this.symbolTable.mergeUpOne();
      this.symbolTable = initialEnv;
      return;
    }

    if (t.isVariableDeclaration(node.left)) {
      this.visitVariableDeclarationWithType(
        node.left,
        iterType.getSpreadType(),
      );
    } else if (t.isIdentifier(node.left)) {
      this.setVariableType(node.left.name, iterType.getSpreadType(), node.left);
    } else if (t.isExpression(node.left)) {
      this.visitExpression(node.left);
    } else {
      throw new Error("Reached impossible state according to documentation");
    }

    this.visitStatement(node.body);

    this.symbolTable.mergeUpOne();
    this.symbolTable = initialEnv;
  }

  private visitForInStatement(node: t.ForInStatement) {
    let initialEnv = this.symbolTable;
    this.symbolTable = new SymbolTable(initialEnv);

    let iterType = this.visitExpression(node.right);
    if (!iterType.isIterable()) {
      report.addError(
        `For..in loops must iterate over arrays, strings or objects, instead given ${iterType}`,
        this.filename,
        node.right.loc?.start.line,
        node.right.loc?.start.column,
      );

      this.symbolTable.mergeUpOne();
      this.symbolTable = initialEnv;
      return;
    }

    if (t.isVariableDeclaration(node.left)) {
      this.visitVariableDeclarationWithType(
        node.left,
        this.getIndexType(iterType),
      );
    } else if (t.isIdentifier(node.left)) {
      this.setVariableType(
        node.left.name,
        this.getIndexType(iterType),
        node.left,
      );
    } else if (t.isExpression(node.left)) {
      this.visitExpression(node.left);
    } else {
      throw new Error("Reached impossible state according to documentation");
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

  private isArrayOrString(iterType: Type): boolean {
    if (iterType instanceof UnionType) {
      return (
        iterType.types.filter((type) => this.isArrayOrString(type)).length != 0
      );
    }
    return (
      iterType instanceof ArrayType ||
      iterType instanceof StringType ||
      iterType instanceof AnyType
    );
  }

  private getIndexType(iterType: Type): Type {
    if (iterType instanceof ArrayType || iterType instanceof StringType) {
      return new NumberType();
    }
    if (iterType instanceof ObjectType) {
      return new StringType();
    }
    if (iterType instanceof UnionType) {
      return UnionType.asNeeded(
        iterType.types
          .filter((type) => this.isArrayOrObject(type))
          .map((type) => this.getIndexType(type)),
      );
    }
    return UnionType.asNeeded([new NumberType(), new StringType()]);
  }

  private visitVariableDeclarationWithType(
    node: t.VariableDeclaration,
    type: Type,
  ) {
    if (node.kind === "var") {
      // TODO: care about global vars (only in blocks, not in functions, but when undeclared too)
      console.warn(
        "we might not treat the scope for var correctly within blocks",
      );
    }

    for (let declaration of node.declarations) {
      if (!t.isIdentifier(declaration.id)) {
        throw new Error(
          "Pattern matching variable declarations are not supported.",
        );
      }
      this.declareVariableType(declaration.id.name, type);
    }
  }
}
