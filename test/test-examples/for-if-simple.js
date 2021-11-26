let arr = [1,4,5,6,9];
let evens = [];
let odds = [];

for (let x of arr) {
    if (x % 2 == 0) {
        evens.push(x);
    } else {
        odds.push(x);
    }
}
console.log("evens:", evens);
console.log("odds:", odds);
