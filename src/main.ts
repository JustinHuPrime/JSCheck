import report from "./errorReport";
import TypeChecker from "./TypeChecker";

// get list of files from command line
const filenames = process.argv.slice(2);
if (filenames.length === 0) {
  console.error("No files specified");
  process.exit(1);
}

let typeChecker = new TypeChecker(filenames);
typeChecker.typeCheck();

report.printErrors();
if (report.isEmpty()) {
  process.exit(0);
} else {
  process.exit(1);
}
