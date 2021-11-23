/**
 * This is a modified version of FizzBuzz, the classic interview problem
 * where given numbers [1, ..., n], you print:
 *   "fizz" if the number is divisible by 3
 *   "buzz" if the number is divisible by 5
 *   "fizzbuzz" if the number is divisible by 15
 *   the number as-is otherwise
 * In this modified version, we take in an arbitrary list of numbers as input
 * and return a list of string / number results instead of printing
 */
const inputs = [...Array(20).keys()];

let outputs = [];
if (inputs % 15 == 0) {
    outputs.push("Fizzbuzz");
}
else if (inputs % 3 === 0) {
    outputs.push("Fizz");
}
else if (inputs % 5 === 0) {
    outputs.push("Buzz");
} else {
    outputs.push(inputs);
}

let result = 0;
for (let value of lst) {
    if (value.match(/buzz/i)) {
        result += 1;
    }
}

/**
 * (Level 1 Default JS) TypeError: value.match is not a function (35:19)
 *
 * (Level 2) TypeError: Attempted to call 'match' on type Array[Array[Number]] (35:19)
 *
 * **/
