let a = {a:1, b:2, c:3};
let last;

// This will return the keys of a
for (let x in a) {
    last = x;
    console.log(x);
}
