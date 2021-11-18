let lst = [1,2,3];
lst[3] = 4;

let x = lst[0]; // static analysis: x is a number

lst[9] = "foo"; // implicitly adds undefined (but we ignore those)

let y = null;
y = lst[1]; // static analysis: y is a number or a string
