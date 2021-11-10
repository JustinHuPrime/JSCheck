function dbl(number) {
  return number * 2;
}

if (require.main === module) {
  let nums = [12, 23, 40, undefined, 64, undefined, 881];

  let res = [];

  nums.forEach((num, idx) => { res[idx] = dbl(num) });
}

/**
 * (Level 1 Default JS) <No error>
 *
 * (Level 2) Warning: Multiplication on non-numerical type on line 2
 *
 * (Level 3) Warning: Multiplication on non-numerical type on line 2
 * Attempted to call '*' on type undefined, expected number (2:3)
 *
 */
