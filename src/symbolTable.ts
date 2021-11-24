export type TypeMap = { [key: string]: Type };

export default class SymbolTable {
  private mapping: Map<string, Type>;
  private parentScope: SymbolTable | null;

  constructor(parentScope: SymbolTable | null = null) {
    this.mapping = new Map();
    this.parentScope = parentScope;
  }

  getMap() {
    // XXX: just for testing so far - we may want a neater API later
    return this.mapping;
  }

  getParentScope() {
    // XXX: just for testing so far - we may want a neater API later
    return this.parentScope;
  }
}

// types
export abstract class Type {
  type = this.toString(); // used to determine deep equality
  public abstract toString(): string;

  public abstract isIterable(): boolean;

  public getSpreadType(): Type {
    throw new Error(`${this} isn't iterable`);
  }

  public abstract toPrimitive(): Type;

  public abstract alwaysFalse(): boolean;

  public abstract alwaysTrue(): boolean;

  protected getMethodReturnTypeMap(): TypeMap {
    return {};
  }

  // Returns the type of calling the given object / property method,
  // or null if the method name does not exist
  // This does not the check types of input values yet
  public getMethodReturnType(methodName: string): Type | null {
    let methodMap = this.getMethodReturnTypeMap();
    return methodMap[methodName] || null;
  }
}

// base types
export class NumberType extends Type {
  public toString() {
    return "number";
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

  override getMethodReturnTypeMap(): TypeMap {
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
    return "string";
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

  override getMethodReturnTypeMap(): TypeMap {
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
}

export class BooleanType extends Type {
  public toString() {
    return "boolean";
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

  override getMethodReturnTypeMap(): TypeMap {
    return {
      toString: new StringType(),
      valueOf: this,
    };
  }
}

export class UndefinedType extends Type {
  public toString() {
    return "undefined";
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
    return "null";
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
    return `object with fields: ${this.fields}`;
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

  override getMethodReturnTypeMap(): TypeMap {
    return {
      // I'm ignoring the __ methods for now
      // FIXME: add support for object methods
      hasOwnProperty: new BooleanType(),
      isPrototypeOf: new BooleanType(),
      propertyIsEnumerable: new BooleanType(),
      toLocaleString: new StringType(),
      toString: new StringType(),
      valueOf: this,
    };
  }
}

export class ArrayType extends Type {
  public elementType: Type;
  public toString() {
    return `array of ${this.elementType}`;
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
  override getMethodReturnTypeMap(): TypeMap {
    return {
      at: this.elementType,
      concat: new ArrayType(new AnyType()), // XXX: no support for input argument types yet
      entries: new AnyType(), // XXX: no support for iterable types yet
      every: new BooleanType(),
      fill: new ArrayType(new AnyType()), // XXX: no support for input argument types yet
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
      map: new ArrayType(new AnyType()), // XXX: no support for input argument types yet
      pop: this.elementType,
      push: new NumberType(),
      reduce: new AnyType(),
      reduceRight: new AnyType(),
      reverse: this,
      shift: this.elementType,
      slice: this,
      some: new BooleanType(),
      sort: this,
      splice: new ArrayType(new AnyType()), // XXX: no support for input argument types yet
      toLocaleString: new StringType(),
      toString: new StringType(),
      unshift: new ArrayType(new AnyType()), // XXX: no support for input argument types yet
      valueOf: this,
      values: new AnyType(), // XXX: no support for iterable types yet
    };
  }
}

export class FunctionType extends Type {
  public params: Type[];
  public returnType: Type;
  public toString() {
    return `function with parameter types ${this.params} and return type ${this.returnType}`;
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
    return `one of the following types ${this.types}`;
  }

  // Union constructor that normalizes nested unions, removes duplicates, and strips unions of 1 type
  static asNeeded(types: Type[]) {
    console.log(`UnionType.asNeeded: got ${types}`);
    let normalizedTypes = [];
    // collapse nested unions
    for (let type of types) {
      if (type instanceof UnionType) {
        normalizedTypes.push(...type.types);
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
    this.types = this.types.filter((type) => type.isIterable());
    return this;
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
  // TODO: getMethodReturnTypeMap
  override getMethodReturnType(methodName: string): Type | null {
    let returnTypes = [];
    for (let subType of this.types) {
      let returnType = subType.getMethodReturnType(methodName);
      if (returnType == null) {
        // One or more items in the union don't implement the requested method
        return null;
      } else {
        returnTypes.push(subType);
      }
    }
    return UnionType.asNeeded(returnTypes);
  }
}

export class ErrorType extends Type {
  public toString() {
    return "error-type";
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
    return "any type";
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
}
