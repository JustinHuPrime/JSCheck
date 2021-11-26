let lst = ["foo", "bar", "baz", ["abc", "def"]];
let lst2 = [lst, 1, 2, 3]

let w = lst[0];
let x = lst.length;

let y1 = w.length;      // this is allowed as arrays and strings both impl. length
let y2 = lst[0].length; // same as y1

let z = lst2[0].length; // undefined as number has no .length

console.log(x, y1, y2, z);
