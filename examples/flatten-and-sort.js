/**
 * Flatten a list of lists (arrays) and return the result
 */

    const arrays = [
        [4,5,6], [7,8,9], [1,2,3]
    ];

    let output = [];

    for (let array of arrays) {
        output += array;
    }

    output.sort();



/**
 * (Level 1 Default JS) TypeError: nums.sort is not a function (16:22)
 *
 * (Level 2) Attempted to call 'sort' on type string (16:22)
 *
 * **/
