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
  public fields: { [key: string]: Type };
  public toString() {
    return `object with fields: ${this.fields}`;
  }

  constructor(fields: { [key: string]: Type }) {
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
