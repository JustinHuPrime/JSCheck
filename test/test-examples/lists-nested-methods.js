let lst1 = ["foo", "bar", "baz", ["abc", 555]];
let lst2 = [lst1, 1, "foo", 3]

let x = lst1.slice(3)
let y = lst2[0].slice(3)  // error!
