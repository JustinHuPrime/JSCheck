import traverse from "@babel/traverse";
import * as t from "@babel/types";

export default function voidVisitor(ast: t.Node): void {
  traverse(ast, {
    Identifier: (name) => {
      console.log(name.node.name);
    },
  });
}
