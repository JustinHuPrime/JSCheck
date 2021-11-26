let a = {a:1, b:2, c:3};

// This is not allowed - have to use Object.values(a)
for (let x of a) {
    console.log(x);
}
