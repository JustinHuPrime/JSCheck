declare global {
  var verbose: boolean;
}

export function logVerbose(...data: any[]) {
  if (globalThis.verbose) {
    console.log(...data);
  }
}
