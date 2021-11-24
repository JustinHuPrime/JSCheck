const lst = [1.23, 4.56, "foobar"];
const num = 5;
const str = "hello world";
const either = lst[-1]; // number|string

var good_1 = num.toFixed();
var good_2 = lst.slice(1);
var good_3 = str.slice(2);
var bad_1  = str.toFixed(); // error
var bad_2  = num.slice(1); // error
var bad_3  = either.slice(1); // error
