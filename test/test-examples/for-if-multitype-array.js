let arr = [1,10,4,5,6,9];
let result = [];

for (let x of arr) {
    if (x > 5) {
        result.push("larger");
    } else {
        result.push(x);
    }
}
console.log("result:", result);
