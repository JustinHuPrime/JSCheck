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
export abstract class Type {}

// base types
export class NumberType extends Type {}

export class StringType extends Type {}

export class BooleanType extends Type {}

export class VoidType extends Type {}

export class UndefinedType extends Type {}

export class NullType extends Type {}

// compound types
export class ObjectType extends Type {
  public fields: [string | number, Type][] = [];

  constructor(fields: [string | number, Type][]) {
    super();
    this.fields = fields;
  }
}

export class ArrayType extends Type {
  public elementTypes: Type[];

  constructor(elementTypes: Type[]) {
    super();
    this.elementTypes = elementTypes;
  }
}

export class FunctionType extends Type {
  public params: Type[];
  public returnType: Type;

  constructor(params: Type[], returnType: Type) {
    super();
    this.params = params;
    this.returnType = returnType;
  }
}

// computed types
export class UnionType extends Type {
  public types: Type[];

  constructor(types: Type[]) {
    super();
    this.types = types;
  }
}

export class AnyType extends Type {}
