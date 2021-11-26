let a = {foo: "bar", ...[1,2,3]}; // we ignore the array spread
let b = {foo: "bar", ...11111111111}; // error
