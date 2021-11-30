import report from "../src/errorReport";
import TypeChecker from "../src/TypeChecker";
import assert = require("assert");
import SymbolTable, {
  ArrayType,
  BooleanType,
  ErrorType,
  NullType,
  NumberType,
  ObjectType,
  StringType,
  UndefinedType,
  UnionType,
  VoidType,
} from "../src/symbolTable";

describe("Integration Tests", () => {
  beforeEach(() => {
    report.restore();
  });

  const typecheckFiles = (filenames: string[]) => {
    assert.equal(report.isEmpty(), true);
    let typechecker = new TypeChecker(filenames);
    typechecker.typeCheck();
    return typechecker.getSymbolTable(filenames[0] as string) as SymbolTable;
  };

  it("Simple assignment", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/assignment-simple.js",
    ]).getMap();
    assert.equal(
      report.isEmpty(),
      true,
      "Error report isn't empty when there should not be any errors",
    );

    assert.deepEqual(
      symbolTable,
      new Map([
        ["a", new NumberType()],
        ["b", new StringType()],
        ["c", new ArrayType(new NumberType())],
      ]),
    );
  });

  it("Simple assignment with console.log", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/assignment-simple-with-logging.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Error report should be empty");

    assert.deepEqual(
      symbolTable,
      new Map([
        ["x", new NumberType()],
        ["y", new StringType()],
      ]),
    );
  });

  it("Assignment with +=", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/assignment-plus-equals.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Error report should be empty");

    assert.deepEqual(
      symbolTable,
      new Map([
        ["x", new NumberType()],
        ["s", new StringType()],
      ]),
    );
  });

  it("Variable declaration: unknown variable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/declaration-error-unknown-var.js",
    ]).getMap();
    assert.equal(report.getErrors().length, 1);

    assert.deepEqual(symbolTable, new Map([["x", new ErrorType()]]));
  });

  it("Reassignment: simple - single variable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/assignment-reassignment.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(symbolTable, new Map([["x", new StringType()]]));
  });

  it("Reassignment: variable references and chaining", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/assignment-to-var-chain.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(
      symbolTable,
      new Map([
        ["x", new StringType()],
        ["y", new StringType()],
        ["z", new NumberType()],
      ]),
    );
  });

  it("Lists: declaration, reading/assigning items", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-index-read-assignment.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    let unionType = UnionType.asNeeded([new StringType(), new NumberType()]);
    assert.equal(symbolTable.size, 3);
    assert.deepEqual(symbolTable.get("lst"), new ArrayType(unionType));
    assert.deepEqual(symbolTable.get("x"), new NumberType());
    assert.deepEqual(symbolTable.get("y"), unionType);
  });

  it("Lists: ignore unsupported assignments", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-unsupported-assign.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(
      symbolTable,
      new Map([
        ["lst", new ArrayType(new NumberType())],
        ["x", new NumberType()],
      ]),
    );
  });

  it("Lists: empty lists are void type until values are added", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-empty-are-void-type.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 2);
    assert.deepEqual(symbolTable.get("lst1"), new ArrayType(new VoidType()));
    assert.deepEqual(symbolTable.get("lst2"), new ArrayType(new NumberType()));
  });

  it("Objects: declaration, reading, assigning with single type properties", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/objects-single-type.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 3);
    assert.deepEqual(symbolTable.get("age"), new NumberType());
    assert.deepEqual(symbolTable.get("name"), new StringType());
    assert.deepEqual(
      symbolTable.get("person"),
      new ObjectType({
        age: new NumberType(),
        name: new StringType(),
        address: new StringType(),
      }),
    );
  });

  it("Objects: property name type coalescing", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/objects-property-name-coalescing.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    let objType = new ObjectType({
      "1": new StringType(),
      two: new NumberType(),
      "3": new StringType(),
      four: new NumberType(),
    });
    assert.equal(symbolTable.size, 1);
    assert.deepEqual(symbolTable.get("obj"), objType);
  });

  it("Objects: circular/recursive structure", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/objects-circular-reference.js",
    ]).getMap();
    console.log(report.getErrors());
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    let objType = new ObjectType({
      "1": new NumberType(),
      "3": new StringType(),
    });
    objType.fields["self"] = objType;
    assert.equal(symbolTable.size, 1);
    assert.deepEqual(symbolTable.get("a"), objType);
  });

  it("Objects: spreading", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/objects-spread.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 2);
    let aType = new ObjectType({
      ID: new NumberType(),
      title: new StringType(),
    });
    let bType = new ObjectType({
      ID: new NumberType(),
      title: new StringType(),
      length: new NumberType(),
    });
    assert.deepEqual(symbolTable.get("a"), aType);
    assert.deepEqual(symbolTable.get("b"), bType);
  });

  it("Objects: spreading with duplicate property name", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/objects-spread-replace-duplicates.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 2);
    let aType = new ObjectType({
      ID: new NumberType(),
      title: new StringType(),
    });
    let bType = new ObjectType(
      // length is in particular not `string` or `string|number`
      {
        ID: new NumberType(),
        title: new StringType(),
        length: new NumberType(),
      },
    );
    assert.deepEqual(symbolTable.get("a"), aType);
    assert.deepEqual(symbolTable.get("b"), bType);
  });

  it("Objects: invalid / unsupported spreading", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/objects-spread-invalid.js",
    ]).getMap();
    assert.equal(report.getErrors().length, 1);
    assert.match(report.getErrors()[0]!.message, /Invalid spread/i);

    assert.equal(symbolTable.size, 2);
    assert.deepEqual(
      symbolTable.get("a"),
      new ObjectType({
        foo: new StringType(),
      }),
    );
    assert.deepEqual(symbolTable.get("b"), new ErrorType());
  });

  it("Lists: should spread iterables", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-supported-spread.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(
      symbolTable,
      new Map([
        ["a", new StringType()],
        ["b", new ArrayType(new StringType())],
      ]),
    );
  });

  it("Lists: should contain error when trying to spread non-iterable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-unsupported-spread.js",
    ]).getMap();

    assert.equal(report.getErrors().length, 1);

    assert.deepEqual(
      symbolTable,
      new Map([["a", new ArrayType(new ErrorType())]]),
    );
  });

  it("Instance methods on built-in types (good and bad cases)", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/instance-methods-builtin-types.js",
    ]).getMap();

    // console.log(report.getErrors());
    assert.equal(report.getErrors().length, 3, "Expected 3 errors generated");

    let unionType = UnionType.asNeeded([new StringType(), new NumberType()]);
    assert.equal(symbolTable.size, 10);

    assert.deepEqual(symbolTable.get("lst"), new ArrayType(unionType));
    assert.deepEqual(symbolTable.get("num"), new NumberType());
    assert.deepEqual(symbolTable.get("str"), new StringType());
    assert.deepEqual(symbolTable.get("either"), unionType);

    assert.deepEqual(symbolTable.get("good_1"), new StringType());
    assert.deepEqual(symbolTable.get("good_2"), new ArrayType(unionType));
    assert.deepEqual(symbolTable.get("good_3"), new StringType());

    assert.deepEqual(symbolTable.get("bad_1"), new ErrorType());
    assert.deepEqual(symbolTable.get("bad_2"), new ErrorType());
    assert.deepEqual(symbolTable.get("bad_3"), new ErrorType());
  });

  it("Lists: instance methods", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-instance-methods.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected no errors in report");

    assert.equal(symbolTable.size, 6);

    assert.deepEqual(
      symbolTable.get("someNums"),
      new ArrayType(new NumberType()),
    );
    assert.deepEqual(
      symbolTable.get("someBools"),
      new ArrayType(new BooleanType()),
    );

    assert.deepEqual(symbolTable.get("arr1"), new ArrayType(new NumberType()));
    assert.deepEqual(
      symbolTable.get("arr2"),
      new ArrayType(UnionType.asNeeded([new BooleanType(), new NumberType()])),
    );
    assert.deepEqual(symbolTable.get("b"), new BooleanType());
    assert.deepEqual(symbolTable.get("n"), new NumberType());
  });

  it("Lists: nested heterogenous lists + instance methods (good and bad cases)", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-nested-methods.js",
    ]).getMap();

    // console.log(report.getErrors());
    // console.log(symbolTable);
    assert.equal(report.getErrors().length, 1, "Expected 1 error generated");

    let lst1Type = new ArrayType(
      UnionType.asNeeded([
        new StringType(),
        new ArrayType(UnionType.asNeeded([new StringType(), new NumberType()])),
      ]),
    );
    let lst2Type = new ArrayType(
      UnionType.asNeeded([lst1Type, new NumberType(), new StringType()]),
    );
    assert.equal(symbolTable.size, 4);

    assert.deepEqual(symbolTable.get("lst1"), lst1Type);
    assert.deepEqual(symbolTable.get("lst2"), lst2Type);

    assert.deepEqual(symbolTable.get("x"), lst1Type);
    assert.deepEqual(symbolTable.get("y"), new ErrorType());
  });

  it("Lists: nested lists + instance properties (good and bad cases)", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-nested-properties.js",
    ]).getMap();

    // console.log(report.getErrors());
    // console.log(symbolTable);
    assert.equal(report.getErrors().length, 0, "Expected 0 errors generated");

    let unionType = UnionType.asNeeded([
      new StringType(),
      new ArrayType(new StringType()),
    ]);
    let lst1Type = new ArrayType(unionType);
    let lst2Type = new ArrayType(
      UnionType.asNeeded([lst1Type, new NumberType()]),
    );
    assert.equal(symbolTable.size, 7);

    assert.deepEqual(symbolTable.get("lst"), lst1Type);
    assert.deepEqual(symbolTable.get("lst2"), lst2Type);

    assert.deepEqual(symbolTable.get("w"), lst1Type.elementType);
    assert.deepEqual(symbolTable.get("x"), new NumberType());
    assert.deepEqual(symbolTable.get("y1"), new NumberType());
    assert.deepEqual(symbolTable.get("y2"), new NumberType());
    assert.deepEqual(symbolTable.get("z"), new UndefinedType());
  });

  it("Lists: nested lists + type mutation", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-nested-type-mutation.js",
    ]).getMap();

    // console.log(report.getErrors());
    console.log(symbolTable);
    assert.equal(report.getErrors().length, 0, "Expected 0 errors generated");

    let lst1Type = new ArrayType(
      UnionType.asNeeded([
        new StringType(),
        new NumberType(),
        new ArrayType(UnionType.asNeeded([new StringType(), new NumberType()])),
      ]),
    );
    let lst2Type = new ArrayType(lst1Type);
    assert.equal(symbolTable.size, 2);

    assert.deepEqual(symbolTable.get("lst1"), lst1Type);
    assert.deepEqual(symbolTable.get("lst2"), lst2Type);
  });

  it("Lists: recursive nested list + type mutation", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-nested-type-mutation-recursive.js",
    ]).getMap();

    // console.log(report.getErrors());
    console.log(symbolTable);
    assert.equal(report.getErrors().length, 0, "Expected 0 errors generated");

    let lst1Type = new ArrayType(new StringType());
    lst1Type.extend([lst1Type], true); // circular references BAYBEE
    let lst2Type = new ArrayType(lst1Type);
    assert.equal(symbolTable.size, 2);

    assert.deepEqual(symbolTable.get("lst1"), lst1Type);
    assert.deepEqual(symbolTable.get("lst2"), lst2Type);
  });

  it("Lists: instance methods with type side-effects", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/lists-methods-side-effects.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected no errors in report");

    assert.equal(symbolTable.size, 3);

    let unionType = UnionType.asNeeded([new NumberType(), new NullType()]);
    assert.deepEqual(symbolTable.get("items"), new ArrayType(unionType));
    assert.deepEqual(symbolTable.get("newlen"), new NumberType());
    assert.deepEqual(symbolTable.get("first"), unionType);
  });

  it("Block Scope: simple block scope", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/block-scope.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected no errors in report");

    assert.equal(symbolTable.size, 3);

    assert.deepEqual(symbolTable.get("a"), new NumberType());
    assert.deepEqual(symbolTable.get("b"), new StringType());
    assert.deepEqual(symbolTable.get("c"), new StringType());
  });

  it("If statement: assignment in branches", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/if-simple.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(
      symbolTable,
      new Map([
        ["x", UnionType.asNeeded([new BooleanType(), new StringType()])],
      ]),
    );
  });

  it("If statement: with no else", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/if-no-else.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(
      symbolTable.get("x"),
      UnionType.asNeeded([new NumberType(), new StringType()]),
    );
    assert.deepEqual(
      symbolTable.get("y"),
      UnionType.asNeeded([
        new BooleanType(),
        new NumberType(),
        new StringType(),
      ]),
    );
  });

  it("If statement: nested if statements", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/if-complicated.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(
      symbolTable.get("x"),
      UnionType.asNeeded([
        new ArrayType(new NumberType()),
        new BooleanType(),
        new NumberType(),
      ]),
    );
    assert.deepEqual(
      symbolTable.get("y"),
      UnionType.asNeeded([new NumberType(), new StringType()]),
    );
    assert.deepEqual(
      symbolTable.get("z"),
      UnionType.asNeeded([new BooleanType(), new StringType()]),
    );
    assert.deepEqual(
      symbolTable.get("b"),
      UnionType.asNeeded([
        new BooleanType(),
        new UndefinedType(),
        new StringType(),
        new NumberType(),
      ]),
    );
  });

  it("For loop - array access", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-loop-array.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.deepEqual(symbolTable.get("lenSum"), new NumberType());
    assert.deepEqual(
      symbolTable.get("strings"),
      new ArrayType(new StringType()),
    );
  });

  it("For loop - assigning to index variable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-loop-array.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 2);
    assert.deepEqual(symbolTable.get("lenSum"), new NumberType());
  });

  it("For loop - assigning to index variable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-loop-temp-var.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 1);
    assert.deepEqual(
      symbolTable.get("x"),
      UnionType.asNeeded([new NumberType(), new UndefinedType()]),
    );
  });

  it("For...in - loop over array indices", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-in-array.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 1);
    assert.deepEqual(
      symbolTable.get("result"),
      UnionType.asNeeded([new NumberType(), new UndefinedType()]),
    );
  });

  it("For...in - loop over object keys", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-in-object.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 2);
    assert.deepEqual(
      symbolTable.get("a"),
      new ObjectType({
        a: new NumberType(),
        b: new NumberType(),
        c: new NumberType(),
      }),
    );
    assert.deepEqual(
      symbolTable.get("last"),
      UnionType.asNeeded([new StringType(), new UndefinedType()]),
    );
  });

  it("For...in - loop over string indices", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-in-string.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 2);
    assert.deepEqual(
      symbolTable.get("last"),
      UnionType.asNeeded([new NumberType(), new UndefinedType()]),
    );
  });

  it("For...of - loop over array", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-of-array.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 1);
    assert.deepEqual(
      symbolTable.get("result"),
      UnionType.asNeeded([
        new NumberType(),
        new StringType(),
        new BooleanType(),
        new UndefinedType(),
      ]),
    );
  });

  it("For...of - loop over string", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/for-of-string.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 1);
    assert.deepEqual(
      symbolTable.get("result"),
      UnionType.asNeeded([new StringType(), new UndefinedType()]),
    );
  });

  it("For...of - error not iterable", () => {
    typecheckFiles(["./test/test-examples/for-of-error-not-iterable.js"]);
    assert.equal(
      report.getErrors().length,
      1,
      "Expected error report to contain 1 error",
    );
    assert.equal(
      report.getErrors()[0]!.message,
      "For...of loops must iterate over arrays or strings, instead given NumberType",
    );
  });

  it("For...of - error can't iterate over object", () => {
    typecheckFiles(["./test/test-examples/for-of-error-on-object.js"]);
    assert.equal(
      report.getErrors().length,
      1,
      "Expected error report to contain 1 error",
    );
    assert.equal(
      report.getErrors()[0]!.message,
      "For...of loops must iterate over arrays or strings, instead given ObjectType[[object Object]]",
    );
  });

  it("For...of - error sorting mixed type", () => {
    typecheckFiles(["./test/test-examples/for-of-error-mixedtype.js"]);
    assert.equal(
      report.getErrors().length,
      1,
      "Expected error report to contain 1 error",
    );
    assert.equal(
      report.getErrors()[0]!.message,
      "Method sort does not exist on type UnionType[ArrayType[NumberType]|NumberType|StringType|UndefinedType]",
    );
  });

  it("Binary operators - addition", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/binops-add.js",
    ]).getMap();
    assert.equal(report.getErrors().length, 0, "Expected no errors");
    assert.deepEqual(
      symbolTable.get("a"),
      UnionType.asNeeded([new NumberType()]),
    );
    assert.deepEqual(
      symbolTable.get("b"),
      UnionType.asNeeded([new StringType()]),
    );
    assert.deepEqual(
      symbolTable.get("c"),
      UnionType.asNeeded([new StringType()]),
    );
    assert.deepEqual(
      symbolTable.get("d"),
      UnionType.asNeeded([new StringType()]),
    );
  });

  it("Binary operators - arithmetic", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/binops-arithmetic.js",
    ]).getMap();
    assert.equal(report.getErrors().length, 0, "Expected no errors");
    for (let varName of ["a", "b", "c", "d", "e"]) {
      assert.deepEqual(
        symbolTable.get(varName),
        UnionType.asNeeded([new NumberType()]),
      );
    }
  });

  it("declaration with no value", () => {
    const symbolTable = typecheckFiles([
      "./test/test-examples/declaration-no-value.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 1);

    assert.deepEqual(symbolTable.get("x"), new UndefinedType());
  });

  it("assign mixed types to array", () => {
    const symbolTable = typecheckFiles([
      "./test/test-examples/if-array-element-else.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 1);

    assert.deepEqual(
      symbolTable.get("arr"),
      new ArrayType(
        UnionType.asNeeded([
          new NumberType(),
          new StringType(),
          new UndefinedType(),
        ]),
      ),
    );
  });

  it("should not throw an error when assigning if array element", () => {
    const symbolTable = typecheckFiles([
      "./test/test-examples/if-object-property-else.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 3);

    console.log(symbolTable);

    assert.deepEqual(
      symbolTable.get("person"),
      new ObjectType({
        name: new StringType(),
        age: new NumberType(),
        id: UnionType.asNeeded([
          new NullType(),
          new NumberType(),
          new StringType(),
        ]),
      }),
    );
  });

  it("should not throw an error when assigning new value to object", () => {
    const symbolTable = typecheckFiles([
      "./test/test-examples/if-object-property.js",
    ]).getMap();

    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    assert.equal(symbolTable.size, 3);

    console.log(symbolTable);

    assert.deepEqual(
      symbolTable.get("person"),
      new ObjectType({
        name: new StringType(),
        age: new NumberType(),
        id: UnionType.asNeeded([new NullType(), new NumberType()]),
      }),
    );
  });
});
