export default class SymbolTable {
  private mapping: Map<string, Type>;
  private parentScope: SymbolTable | null;

  constructor(parentScope: SymbolTable | null = null) {
    this.mapping = new Map();
    this.parentScope = parentScope;
  }
}

// types
export abstract class Type {}

// base types
export class Number extends Type {}

export class String extends Type {}

export class Boolean extends Type {}

export class Void extends Type {}

export class Undefined extends Type {}

export class Null extends Type {}

// compound types
export class Object extends Type {
  public fields: [string | number, Type][] = [];

  constructor(fields: [string | number, Type][]) {
    super();
    this.fields = fields;
  }
}

export class Array extends Type {
  public elementTypes: Type[];

  constructor(elementTypes: Type[]) {
    super();
    this.elementTypes = elementTypes;
  }
}

export class Function extends Type {
  public params: Type[];
  public returnType: Type;

  constructor(params: Type[], returnType: Type) {
    super();
    this.params = params;
    this.returnType = returnType;
  }
}

// computed types
export class Union extends Type {
  public types: Type[];

  constructor(types: Type[]) {
    super();
    this.types = types;
  }
}

export class Any extends Type {}
