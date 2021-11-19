import report from "../src/errorReport";
import TypeChecker from "../src/TypeChecker";
import assert = require("assert");
import SymbolTable, {
  ArrayType,
  BooleanType,
  ErrorType,
  NumberType,
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
      "./test/test-examples/lists.js",
    ]).getMap();
    assert.equal(report.isEmpty(), true, "Expected error report to be empty");

    let unionType = UnionType.asNeeded([new StringType(), new NumberType()]);
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
      symbolTable,
      new Map([
        ["x", UnionType.asNeeded([new NumberType(), new StringType()])],
        [
          "y",
          UnionType.asNeeded([
            new BooleanType(),
            new NumberType(),
            new StringType(),
          ]),
        ],
      ]),
    );
  });

  it("Union test", () => {
    assert.deepEqual(UnionType.asNeeded([new StringType()]), new StringType());
    assert.deepEqual(
      UnionType.asNeeded([
        new StringType(),
        UnionType.asNeeded([new StringType(), new NumberType()]),
      ]),
      UnionType.asNeeded([new StringType(), new NumberType()]),
    );
  });
});
