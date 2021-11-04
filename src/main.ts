import * as fs from "fs";
import report from "./errorReport";
import * as parser from "@babel/parser";

interface BabelSyntaxError extends SyntaxError {
  loc: {
    column: number;
    line: number;
  };
}

// get list of files from command line
const filenames = process.argv.slice(2);
if (filenames.length === 0) {
  console.error("No files specified");
  process.exit(1);
}

// read and parse the files
const files = filenames
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
          `failed to parse: ${cast.message.replace(/\([0-9]+:[0-9]+\)$/, "")}`,
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
          `failed to parse: ${cast.message.replace(/\([0-9]+:[0-9]+\)$/, "")}`,
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
  });

// TODO: traverse the AST and save error reports to a global structure as you go

report.printErrors();
if (report.isEmpty()) {
  process.exit(0);
} else {
  process.exit(1);
}
