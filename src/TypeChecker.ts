import * as fs from "fs";
import report from "./errorReport";
import * as parser from "@babel/parser";
import * as t from "@babel/types";
import TypeVisitor from "./TypeVisitor";
import SymbolTable from "./symbolTable";

interface BabelSyntaxError extends SyntaxError {
  loc: {
    column: number;
    line: number;
  };
}

export default class TypeChecker {
  private filenames: string[];
  private visitors: Map<string, TypeVisitor>;

  constructor(filenames: string[]) {
    this.filenames = filenames;
    this.visitors = new Map();
  }

  public typeCheck() {
    this.filenames
      .map((filename, _idx, _arry) => {
        try {
          return [fs.readFileSync(filename, "utf8"), filename];
        } catch (e) {
          report.addError("could not read file", filename);
          return null;
        }
      })
      .filter((file, _idx, _arry) => {
        return file !== null;
      })
      .map((file, _idx, _arry) => {
        const [content, filename] = file as [string, string];
        try {
          const parsed = parser.parse(content, {
            attachComment: false,
            errorRecovery: true,
            sourceType: "unambiguous",
            sourceFilename: filename,
            ranges: true,
          });
          parsed.errors.forEach((e) => {
            const cast = e as unknown as BabelSyntaxError;
            report.addError(
              `failed to parse: ${cast.message.replace(
                /\([0-9]+:[0-9]+\)$/,
                "",
              )}`,
              filename,
              cast.loc.line,
              cast.loc.column,
            );
          });
          if (parsed.errors.length > 0) {
            return null;
          } else {
            return parsed;
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            const cast = e as BabelSyntaxError;
            report.addError(
              `failed to parse: ${cast.message.replace(
                /\([0-9]+:[0-9]+\)$/,
                "",
              )}`,
              filename,
              cast.loc.line,
              cast.loc.column,
            );
          }
          return null;
        }
      })
      .filter((file, _idx, _arry) => {
        return file !== null;
      })
      .forEach((file, _idx, _arry) => {
        const filename = this.filenames[_idx] as string;
        this.visitors.set(filename, new TypeVisitor(filename));

        this.visitors.get(filename)?.visitProgram(file as unknown as t.File);
        // TODO: traverse the AST and save error reports to a global structure as you go
      });
  }

  // For testing
  public getSymbolTable(filename: string): SymbolTable | undefined {
    return this.visitors.get(filename)?.getSymbolTable();
  }
}
