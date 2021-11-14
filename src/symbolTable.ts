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
}

// base types
export class NumberType extends Type {
  public toString = (): string => { return "number"};
}

export class StringType extends Type {
  public toString = (): string => { return "string"};
}

export class BooleanType extends Type {
  public toString = (): string => { return "boolean"};
}

export class VoidType extends Type {
  public toString = (): string => { return "void"};
}

export class UndefinedType extends Type {
  public toString = (): string => { return "undefined"};
}

export class NullType extends Type {
  public toString = (): string => { return "null"};
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
}

export class ArrayType extends Type {
  public elementTypes: Type[];
  public toString = (): string => {
    return `array with types: ${this.elementTypes}`;
  };

  constructor(elementTypes: Type[]) {
    super();
    this.elementTypes = elementTypes;
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
}

// computed types
export class UnionType extends Type {
  public types: Type[];
  public toString = (): string => {
    return `one of the following types ${this.types}`;
  };

  constructor(types: Type[]) {
    super();
    this.types = types;
  }
}

export class AnyType extends Type {
  public toString = (): string => {
    return "any type";
  };
}