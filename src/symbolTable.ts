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
  public abstract toString: () => string;

  public abstract isIterable(): boolean;
  public getSpreadType(): Type {
    throw new Error(`${this} isn't iterable`);
  }
}

// base types
export class NumberType extends Type {
  public toString = (): string => {
    return "number";
  };

  public isIterable(): boolean {
    return false;
  }
}

export class StringType extends Type {
  public toString = (): string => {
    return "string";
  };

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return this;
  }
}

export class BooleanType extends Type {
  public toString = (): string => {
    return "boolean";
  };

  public isIterable(): boolean {
    return false;
  }
}

export class VoidType extends Type {
  public toString = (): string => {
    return "void";
  };

  public isIterable(): boolean {
    return false;
  }
}

export class UndefinedType extends Type {
  public toString = (): string => {
    return "undefined";
  };

  public isIterable(): boolean {
    return false;
  }
}

export class NullType extends Type {
  public toString = (): string => {
    return "null";
  };

  public isIterable(): boolean {
    return false;
  }
}

// compound types
export class ObjectType extends Type {
  public fields: [string | number, Type][] = [];
  public toString = (): string => {
    return `object with fields: ${this.fields}`;
  };

  constructor(fields: [string | number, Type][]) {
    super();
    this.fields = fields;
  }

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return new UnionType(
      this.fields.map((value) => {
        return value[1];
      }),
    );
  }
}

export class ArrayType extends Type {
  public elementType: Type;
  public toString = (): string => {
    return `array of ${this.elementType}`;
  };

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
  public toString = (): string => {
    return `function with parameter types ${this.params} and return type ${this.returnType}`;
  };

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
  public toString = (): string => {
    return `one of the following types ${this.types}`;
  };

  constructor(types: Type[]) {
    super();
    this.types = [];
    for (let type of types) {
      if (type instanceof UnionType) {
        types.push(...type.types);
      } else {
        types.push(type);
      }
    }
  }

  public isIterable(): boolean {
    return this.types.filter((type) => type.isIterable()).length != 0;
  }

  public override getSpreadType(): Type {
    this.types = this.types.filter((type) => type.isIterable());
    return this;
  }
}

export class AnyType extends Type {
  public toString = (): string => {
    return "any type";
  };

  public isIterable(): boolean {
    return true;
  }

  public override getSpreadType(): Type {
    return new UnionType([
      new StringType(),
      new ArrayType(new AnyType()),
      new ObjectType([]),
    ]);
  }
}
