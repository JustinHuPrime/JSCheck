let result;
for (let x of [1, "two", [3,2,1]]) {
    x.sort(); // this will fail because x has a mixed type
    result = x;
}
console.log("last result was:", result);
