let result;
for (let x of [1, "two", [3,2,1]]) {
    result = x;
}
result.sort(); // this will fail because result has a mixed type
console.log("last result was:", result);
