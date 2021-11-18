let lst = [1,2,3];
lst["test"] = "test";  // ignored
let x = lst[1]; // static analysis: x is a number
