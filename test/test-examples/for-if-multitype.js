let arr = [1,10.3,10.5,4,5,6,9];
let largest = null;

for (let x of arr) {
    if (x > largest) {
        largest = x;
    }
}

console.log("largest:", largest);
