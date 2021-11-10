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
function fizzBuzzList(inputs) {
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
    return outputs;
}

/**
 * Count the amount of times "buzz" appears in the fizzBuzzList result for inputs,
 * including as either part of "Buzz" or "Fizzbuzz"
 */
function countBuzz(inputs) {
    let lst = fizzBuzzList(inputs);
    let result = 0;
    for (let value of lst) {
        if (value.match(/buzz/i)) {
            result += 1;
        }
    }
    return result;
}

if (require.main === module) {
    console.log(countBuzz([...Array(20).keys()]));
}

/**
 * (Level 1 Default JS) TypeError: value.match is not a function (35:19)
 *
 * (Level 2) TypeError: Attempted to call 'match' on type object (35:19)
 *
 * (Level 3) TypeError: Attempted to call 'match' on a list,
 * did you mean to call 'match' on a string instead? (35:19)
 *
 * (Level 4) TypeError: Attempted to call 'match' on a list,
 * did you mean to call 'match' on a string instead? (35:19)
 * Warning: 'fizzBuzzList' returns conflicting types: string[] or any[]
 *
 * **/