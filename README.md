# JSCheck

CPSC 410 Project 2: Annotation-less JavaScript Type Checker

## Installation and Usage

This project uses Node.js 14.x. To build it, check out the source and run:

```
npm install
npm run build
```

Then you can run the type checker:

```
npm start -- <path to .js file>
```

This checker will attempt to identify ReferenceError and TypeError cases that may occur in the program.

Multiple files can be given on the command line, but the checker will currently treat them all as separate files.
