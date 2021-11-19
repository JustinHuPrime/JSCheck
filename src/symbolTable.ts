export default class SymbolTable {
  private mapping: Map<string, Type>;
  private parentScope: SymbolTable | null;

  constructor(parentScope: SymbolTable | null = null) {
    this.mapping = new Map();
    this.parentScope = parentScope;
  }

  getVar(key: string): Type | undefined {
    return this.mapping.get(key);
  }

  setVar(key: string, value: Type): void {
    this.mapping.set(key, value);
  }

  getMap() {
    // XXX: just for testing so far - we may want a neater API later
    return this.mapping;
  }

  getParentScope() {
    // XXX: just for testing so far - we may want a neater API later
    return this.parentScope;
  }

  // Does not create new definitions in this, just adds to existing
  merge(other: SymbolTable) {
    let otherMapping = other.mapping;
    this.mapping.forEach((value, key, map) => {
      if (otherMapping.has(key)) {
        let otherVal = otherMapping.get(key);
        if (!value.equal(otherVal!)) {
          map.set(key, UnionType.asNeeded([value, otherVal!]));
        }
        otherMapping.delete(key);
      }
    });
    otherMapping.forEach((value, key) => {
      this.mapping.set(key, value);
    });
  }

  replace(otherEnv: SymbolTable) {
    otherEnv.mapping.forEach((value, key) => {
      this.mapping.set(key, value);
    });
  }

  mergeUp(): SymbolTable {
    if (this.parentScope !== null) {
      this.parentScope.merge(this);
      return this.parentScope.mergeUp();
    }
    return this;
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
  public equal(other: Type): boolean {
    return this.type === other.type;
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
}

export class BooleanType extends Type {
  public toString() {
    return "boolean";
  }

  public isIterable(): boolean {
    return false;
  }
}

export class VoidType extends Type {
  public toString() {
    return "void";
  }

  public isIterable(): boolean {
    return false;
  }
}

export class UndefinedType extends Type {
  public toString() {
    return "undefined";
  }

  public isIterable(): boolean {
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
}

// compound types
export class ObjectType extends Type {
  public fields: [string | number, Type][] = [];
  public toString() {
    return `object with fields: ${this.fields}`;
  }

  constructor(fields: [string | number, Type][]) {
    super();
    this.fields = fields;
  }

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return UnionType.asNeeded(
      this.fields.map((value) => {
        return value[1];
      }),
    );
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
}

export class ErrorType extends Type {
  public toString() {
    return "error-type";
  }

  public isIterable(): boolean {
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
}
