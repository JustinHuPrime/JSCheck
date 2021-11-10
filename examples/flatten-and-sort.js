/**
 * Flatten a list of lists (arrays) and return the result
 */
function flatten(arrays) {
    let result = [];
    for (let array of arrays) {
        result += array;
    }
    return result;
}

if (require.main === module) {
    let nums = flatten([
        [4,5,6], [7,8,9], [1,2,3]
    ]);
    console.log(nums.sort());
}

/**
 * (Level 1 Default JS) TypeError: nums.sort is not a function (16:22)
 *
 * (Level 2) Attempted to call 'sort' on type string (16:22)
 *
 * (Level 3) Attempted to call 'sort' on a string,
 * did you mean to call 'sort' on a list instead? (16:22)
 *
 * (Level 4) Attempted to call 'sort' on a string,
 * did you mean to call 'sort' on a list instead? (16:22)
 * Warning: Addition on list on line 7
 * Attempted to call '+=' on type object, expected string or number (7:16)
 *
 * **/