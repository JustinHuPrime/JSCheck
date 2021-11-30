declare global {
  var verbose: boolean;
}

export function logVerbose(...data: any[]) {
  if (globalThis.verbose) {
    console.log(...data);
  }
}

export function logObjectVerbose(obj: any) {
  if (globalThis.verbose) {
    console.dir(obj, { depth: null });
  }
}
