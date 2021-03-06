import { logVerbose } from "./utils";

export type TypeMap = { [key: string]: Type };

export default class SymbolTable {
  private localMapping: Map<string, Type>; // declared within this scope
  private parentModifiedMapping: Map<string, Type>; // declared in a parent scope but modified
  private parentScope: SymbolTable | null;

  constructor(parentScope: SymbolTable | null = null) {
    this.localMapping = new Map();
    this.parentModifiedMapping = new Map();
    this.parentScope = parentScope;
  }

  // just for testing
  getMap() {
    return this.localMapping;
  }

  getParentScope() {
    return this.parentScope;
  }

  public getVariableType(variableName: string): Type {
    if (this.localMapping.has(variableName)) {
      return this.localMapping.get(variableName) as Type;
    } else if (this.parentModifiedMapping.has(variableName)) {
      return this.parentModifiedMapping.get(variableName) as Type;
    } else if (this.parentScope != null) {
      return this.parentScope.getVariableType(variableName);
    }
    throw new Error("Variable not declared.");
  }

  public setVariableType(variableName: string, newType: Type) {
    if (this.localMapping.has(variableName)) {
      this.localMapping.set(variableName, newType);
    } else if (this.isDeclared(variableName)) {
      this.parentModifiedMapping.set(variableName, newType);
    } else {
      throw new Error("Variable not declared.");
    }
  }

  private isDeclared(variableName: string): boolean {
    if (this.localMapping.has(variableName)) {
      return true;
    } else {
      if (this.parentScope == null) {
        return false;
      }
      return this.parentScope.isDeclared(variableName);
    }
  }

  public declareVariableType(variableName: string, newType: Type) {
    this.localMapping.set(variableName, newType);
  }

  private addVariableType(variableName: string, newType: Type) {
    if (this.localMapping.has(variableName)) {
      let oldType = this.localMapping.get(variableName) as Type;
      this.localMapping.set(
        variableName,
        UnionType.asNeeded([newType, oldType]),
      );
    } else {
      this.parentScope?.addVariableType(variableName, newType);
    }
  }

  public mergeVariableType(variableName: string, newType: Type) {
    if (this.localMapping.has(variableName)) {
      let oldType = this.localMapping.get(variableName) as Type;
      this.localMapping.set(
        variableName,
        UnionType.asNeeded([newType, oldType]),
      );
    } else if (this.parentModifiedMapping.has(variableName)) {
      let oldType = this.parentModifiedMapping.get(variableName) as Type;
      this.parentModifiedMapping.set(
        variableName,
        UnionType.asNeeded([newType, oldType]),
      );
    } else {
      this.parentModifiedMapping.set(variableName, newType);
    }
  }

  // Everything in the modified mapping overwrite the local mapping/modified mapping of parent
  public overwriteUpOne() {
    if (this.parentScope != null) {
      this.parentModifiedMapping.forEach((value, key) => {
        this.parentScope?.setVariableType(key, value);
      });
    }
  }

  public mergeUpToDecl() {
    if (this.parentScope != null) {
      this.parentModifiedMapping.forEach((value, key) => {
        this.parentScope?.addVariableType(key, value);
      });
    }
  }

  public overwriteForBothModified(other: SymbolTable) {
    this.parentModifiedMapping.forEach((value, key) => {
      if (other.parentModifiedMapping.has(key)) {
        let newType = UnionType.asNeeded([
          value,
          other.parentModifiedMapping.get(key)!,
        ]);
        this.parentScope?.setVariableType(key, newType);
        other.parentModifiedMapping.delete(key);
        this.parentModifiedMapping.delete(key);
      }
    });
  }

  public mergeUpOne() {
    this.parentModifiedMapping.forEach((value, key) => {
      this.parentScope?.mergeVariableType(key, value);
    });
  }
}

// types
export abstract class Type {
  type = this.constructor.name; // used to determine deep equality
  public abstract toString(): string;

  public abstract isIterable(): boolean;

  public getSpreadType(): Type {
    throw new Error(`${this} isn't iterable`);
  }

  public abstract toPrimitive(): Type;

  public abstract alwaysFalse(): boolean;

  public abstract alwaysTrue(): boolean;

  protected getMethodReturnTypeMap(_inputArgTypes: Type[]): TypeMap {
    return {};
  }

  // Returns the type of calling the given object / property method,
  // or null if the method name does not exist
  // This does not the check types of input values yet
  public getMethodReturnType(
    methodName: string,
    inputArgTypes: Type[],
  ): Type | null {
    let methodMap = this.getMethodReturnTypeMap(inputArgTypes);
    return methodMap[methodName] || null;
  }
  // Returns the type of calling the given instance property
  // or null if the property does not exist
  public getPropertyType(_propertyName: string): Type | null {
    return null;
  }
}

// base types
export class NumberType extends Type {
  public toString() {
    return "NumberType";
  }

  public isIterable(): boolean {
    return false;
  }

  public toPrimitive(): Type {
    return new NumberType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return false;
  }

  override getMethodReturnTypeMap(_inputArgTypes: Type[]): TypeMap {
    return {
      toExponential: new StringType(),
      toFixed: new StringType(),
      toLocaleString: new StringType(),
      toPrecision: new StringType(),
      toString: new StringType(),
      valueOf: this,
    };
  }
}

export class StringType extends Type {
  public toString() {
    return "StringType";
  }

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return this;
  }

  public toPrimitive(): Type {
    return new StringType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return false;
  }

  override getMethodReturnTypeMap(_inputArgTypes: Type[]): TypeMap {
    return {
      at: new StringType(),
      charAt: new StringType(),
      charCodeAt: new NumberType(),
      codePointAt: new NumberType(),
      concat: new StringType(),
      includes: new BooleanType(),
      endsWith: new BooleanType(),
      indexOf: new NumberType(),
      lastIndexOf: new NumberType(),
      localeCompare: new NumberType(),
      match: UnionType.asNeeded([
        new ArrayType(new StringType()),
        new NullType(),
      ]),
      matchAll: new AnyType(), // XXX: iterable types not supported
      normalize: new StringType(),
      padEnd: new StringType(),
      padStart: new StringType(),
      replace: new StringType(),
      replaceAll: new StringType(),
      search: UnionType.asNeeded([new StringType(), new NumberType()]),
      slice: new StringType(),
      split: new StringType(),
      startsWith: new StringType(),
      substring: new StringType(),
      toLocaleLowerCase: new StringType(),
      toLocaleUpperCase: new StringType(),
      toLowerCase: new StringType(),
      toUpperCase: new StringType(),
      toString: new StringType(),
      trim: new StringType(),
      trimStart: new StringType(),
      trimEnd: new StringType(),
      valueOf: this,
    };
  }

  override getPropertyType(propertyName: string): Type | null {
    let typeMap: TypeMap = {
      length: new NumberType(),
    };
    return typeMap[propertyName] ?? null;
  }
}

export class BooleanType extends Type {
  public toString() {
    return "BooleanType";
  }

  public isIterable(): boolean {
    return false;
  }

  public toPrimitive(): Type {
    return new BooleanType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return false;
  }

  override getMethodReturnTypeMap(_inputArgTypes: Type[]): TypeMap {
    return {
      toString: new StringType(),
      valueOf: this,
    };
  }
}

export class UndefinedType extends Type {
  public toString() {
    return "UndefinedType";
  }

  public isIterable(): boolean {
    return false;
  }

  public toPrimitive(): Type {
    return new UndefinedType();
  }
  public alwaysFalse(): boolean {
    return true;
  }
  public alwaysTrue(): boolean {
    return false;
  }
}

export class NullType extends Type {
  public toString() {
    return "NullType";
  }

  public isIterable(): boolean {
    return false;
  }

  public toPrimitive(): Type {
    return new NullType();
  }
  public alwaysFalse(): boolean {
    return true;
  }
  public alwaysTrue(): boolean {
    return false;
  }
}

// compound types
export class ObjectType extends Type {
  public fields: TypeMap;
  public toString() {
    return `ObjectType[${this.fields}]`;
  }

  constructor(fields: TypeMap) {
    super();
    this.fields = fields;
  }

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return UnionType.asNeeded(Object.values(this.fields));
  }

  public toPrimitive(): Type {
    return new StringType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return true;
  }

  override getMethodReturnTypeMap(_inputArgTypes: Type[]): TypeMap {
    return {
      // I'm ignoring the __ methods for now
      // FIXME: add support for object methods (custom types)
      hasOwnProperty: new BooleanType(),
      isPrototypeOf: new BooleanType(),
      propertyIsEnumerable: new BooleanType(),
      toLocaleString: new StringType(),
      toString: new StringType(),
      valueOf: this,
    };
  }
  override getPropertyType(propertyName: string): Type | null {
    let builtinProperties: TypeMap = {
      constructor: new AnyType(),
    };
    return this.fields[propertyName] ?? builtinProperties[propertyName] ?? null;
  }
}

export class ArrayType extends Type {
  public elementType: Type;
  public toString() {
    return `ArrayType[${this.elementType}]`;
  }

  constructor(elementType: Type) {
    super();
    this.elementType = elementType;
  }

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return this.elementType;
  }

  public toPrimitive(): Type {
    return new StringType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return true;
  }

  // Return an array type including the current + new types
  public extend(newTypes: Type[], inPlace?: boolean): ArrayType {
    let newElemType = UnionType.asNeeded([this.elementType, ...newTypes]);
    if (inPlace) {
      this.elementType = newElemType;
    }
    return new ArrayType(newElemType);
  }

  override getMethodReturnTypeMap(inputArgTypes: Type[]): TypeMap {
    let inputArrayType = new AnyType();
    if (inputArgTypes[0] instanceof ArrayType) {
      inputArrayType = inputArgTypes[0].elementType;
    }
    return {
      at: this.elementType,
      concat: this.extend([inputArrayType]),
      entries: new AnyType(), // XXX: no support for iterable types yet
      every: new BooleanType(),
      fill: this.extend([inputArgTypes[0] ?? new AnyType()]),
      filter: this,
      find: UnionType.asNeeded([new UndefinedType(), this.elementType]),
      findIndex: new NumberType(),

      // XXX: skipping flat and flatMap as their types are quite complicated
      flat: new ArrayType(new AnyType()),
      flatMap: new ArrayType(new AnyType()),

      forEach: new UndefinedType(),
      includes: new BooleanType(),
      indexOf: new NumberType(),
      join: new StringType(),
      keys: new AnyType(), // XXX: no support for iterable types yet
      lastIndexOf: new NumberType(),

      // XXX: this is a stub because we don't support type checking functions yet
      map: new ArrayType(new AnyType()),

      pop: this.elementType,
      push: new NumberType(), // side effects

      // XXX: this is a stub because we don't support type checking functions yet
      reduce: new AnyType(),
      reduceRight: new AnyType(),

      reverse: this,
      shift: this.elementType,
      slice: this,
      some: new BooleanType(),
      sort: this,
      splice: this.extend([inputArgTypes[2] ?? new AnyType()]),
      toLocaleString: new StringType(),
      toString: new StringType(),
      unshift: new NumberType(), // side effects
      valueOf: this,
      values: new AnyType(), // XXX: no support for iterable types yet
    };
  }
  override getMethodReturnType(
    methodName: string,
    inputArgTypes: Type[],
  ): Type | null {
    let result = super.getMethodReturnType(methodName, inputArgTypes);
    if (["push", "unshift"].includes(methodName) && inputArgTypes) {
      // These functions modify the array type as a side effect
      logVerbose(
        `ArrayType.getMethodReturnType: extending array type with ${inputArgTypes}`,
      );
      this.elementType = this.extend(inputArgTypes).elementType;
    }
    return result;
  }

  override getPropertyType(propertyName: string): Type | null {
    let typeMap: TypeMap = {
      length: new NumberType(),
    };
    return typeMap[propertyName] ?? null;
  }
}

export class FunctionType extends Type {
  public params: Type[];
  public returnType: Type;
  public toString() {
    return `FunctionType[${this.params} => ${this.returnType}]`;
  }

  constructor(params: Type[], returnType: Type) {
    super();
    this.params = params;
    this.returnType = returnType;
  }

  public isIterable(): boolean {
    return false;
  }

  public toPrimitive(): Type {
    return new FunctionType(this.params, this.returnType);
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return true;
  }
  // TODO: define getMethodReturnTypeMap
}

// computed types
export class UnionType extends Type {
  public types: Type[];
  public toString() {
    return `UnionType[${this.types.join("|")}]`;
  }

  // Union constructor that normalizes nested unions, removes duplicates, and strips unions of 1 type
  static asNeeded(types: Type[]) {
    if (types.length === 0) {
      throw new Error("Cannot create a union type with no subtypes");
    }
    let normalizedTypes = [];
    // collapse nested unions
    for (let type of types) {
      if (type instanceof UnionType) {
        normalizedTypes.push(...type.types);
      } else if (type instanceof AnyType) {
        return type; // collapse unions containing Any
      } else if (type instanceof VoidType) {
        // Ignore it!
      } else {
        normalizedTypes.push(type);
      }
    }
    // filter repeats
    normalizedTypes = normalizedTypes.filter((value, index, arry) => {
      return (
        arry.findIndex((value2) => {
          return value2.toString() === value.toString();
        }) === index
      );
    });

    // sort, so that union equality with toString works
    normalizedTypes = normalizedTypes.sort((type1, type2) => {
      return type1.toString().localeCompare(type2.toString());
    });

    if (normalizedTypes.length === 1) {
      return normalizedTypes[0]!;
    }
    logVerbose(`UnionType.asNeeded: ${types} => ${normalizedTypes}`);
    return new UnionType(normalizedTypes);
  }

  private constructor(types: Type[]) {
    super();
    this.types = types;
  }

  public isIterable(): boolean {
    return this.types.filter((type) => type.isIterable()).length != 0;
  }

  public override getSpreadType(): Type {
    return UnionType.asNeeded(
      this.types
        .filter((type) => type.isIterable())
        .map((type) => type.getSpreadType()),
    );
  }

  public toPrimitive(): Type {
    return UnionType.asNeeded(
      this.types.map((type, _index, _array) => {
        return type.toPrimitive();
      }),
    );
  }
  public alwaysFalse(): boolean {
    return this.types.every((type) => type.alwaysFalse());
  }
  public alwaysTrue(): boolean {
    return this.types.every((type) => type.alwaysTrue());
  }

  override getMethodReturnType(
    methodName: string,
    inputArgTypes: Type[],
  ): Type | null {
    let returnTypes = [];
    for (let subType of this.types) {
      let returnType = subType.getMethodReturnType(methodName, inputArgTypes);
      if (returnType == null) {
        // One or more items in the union don't implement the requested method
        return null;
      } else {
        returnTypes.push(returnType);
      }
    }
    return UnionType.asNeeded(returnTypes);
  }

  override getPropertyType(propertyName: string): Type | null {
    let returnTypes = [];
    for (let subType of this.types) {
      let returnType = subType.getPropertyType(propertyName);
      if (returnType == null) {
        // One or more items in the union don't implement the requested property
        return null;
      } else {
        returnTypes.push(returnType);
      }
    }
    logVerbose(`${this}.getPropertyType(${propertyName}) => ${returnTypes}`);
    return UnionType.asNeeded(returnTypes);
  }
}

// Used to represent empty arrays - disappears when used inside union!
export class VoidType extends UndefinedType {
  override toString() {
    return "VoidType";
  }
}

export class ErrorType extends Type {
  public toString() {
    return "ErrorType";
  }

  public isIterable(): boolean {
    return false;
  }

  public toPrimitive(): Type {
    return new ErrorType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return false;
  }
}

export class AnyType extends Type {
  public toString() {
    return "AnyType";
  }

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return new AnyType();
  }

  public toPrimitive(): Type {
    return new AnyType();
  }
  public alwaysFalse(): boolean {
    return false;
  }
  public alwaysTrue(): boolean {
    return false;
  }
  override getMethodReturnType(
    _methodName: string,
    _inputArgTypes: Type[],
  ): Type | null {
    return this;
  }
}
