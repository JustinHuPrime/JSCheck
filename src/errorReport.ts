class Error {
  public message: string;
  public filename: string;
  public line: number | null;
  public column: number | null;

  constructor(
    message: string,
    filename: string,
    line: number | null,
    column: number | null,
  ) {
    this.message = message;
    this.filename = filename;
    this.line = line;
    this.column = column;
  }

  public toString() {
    if (this.line !== null && this.column !== null) {
      return `${this.filename}:${this.line}:${this.column}: error: ${this.message}`;
    } else {
      return `${this.filename}: error: ${this.message}`;
    }
  }

  public static compare(a: Error, b: Error) {
    if (a.filename < b.filename) {
      return -1;
    } else if (a.filename > b.filename) {
      return 1;
    } else {
      if (a.line === null && b.line === null) {
        return 0;
      } else if (a.line === null || a.column === null) {
        return -1;
      } else if (b.line === null || b.column === null) {
        return 1;
      } else {
        if (a.line < b.line) {
          return -1;
        } else if (a.line > b.line) {
          return 1;
        } else {
          if (a.column < b.column) {
            return -1;
          } else if (a.column > b.column) {
            return 1;
          } else {
            return 0;
          }
        }
      }
    }
  }
}

class ErrorReport {
  private errors: Error[];

  public constructor() {
    this.errors = [];
  }

  public addError(
    message: string,
    filename: string,
    line: number | null = null,
    column: number | null = null,
  ): void {
    this.errors.push(new Error(message, filename, line, column));
  }

  public printErrors(): void {
    this.errors.sort(Error.compare);
    for (const error of this.errors) {
      console.error(error.toString());
    }
  }

  public isEmpty(): boolean {
    return this.errors.length === 0;
  }
}

const report = new ErrorReport();
export default report;
