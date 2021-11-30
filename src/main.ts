import report from "./errorReport";
import TypeChecker from "./TypeChecker";

import { ArgumentParser } from "argparse";

const parser = new ArgumentParser({
  description: "Static type analysis for JavaScript",
});

parser.add_argument("-v", "--verbose", {
  help: "Enables more verbose logging",
  action: "store_true",
});
parser.add_argument("-s", "--show-symbols", {
  help: "Display symbol table on exit",
  action: "store_true",
});
parser.add_argument("files", {
  help: ".js files to check",
  // require one or more files
  nargs: "+",
});

const args = parser.parse_args();
globalThis.verbose = args.verbose;

let typeChecker = new TypeChecker(args.files);
typeChecker.typeCheck();

report.printErrors();
if (args.show_symbols) {
  for (let filename of args.files) {
    console.log(`${filename}:`, typeChecker.getSymbolTable(filename));
  }
}
if (report.isEmpty()) {
  process.exit(0);
} else {
  process.exit(1);
}
