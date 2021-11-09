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
