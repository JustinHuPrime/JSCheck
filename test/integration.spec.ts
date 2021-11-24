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
  UnionType,
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
      "./test/test-examples/simple-assignment.js",
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
      "./test/test-examples/simple-assignment-with-logging.js",
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

  it("Variable declaration: unknown variable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/declaration-error-unknown-var.js",
    ]).getMap();
    assert.equal(report.getErrors().length, 1);

    assert.deepEqual(symbolTable, new Map([["x", new ErrorType()]]));
  });

  it("Reassignment: simple - single variable", () => {
    let symbolTable = typecheckFiles([
      "./test/test-examples/assignment-simple.js",
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

    console.log(report.getErrors());
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
});
