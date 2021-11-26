let result;
for (let x in [1, "two", 3, true]) {
    result = x;  // This'll just be a number
}
console.log("last result was:", result);
