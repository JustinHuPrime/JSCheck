let id = 503;

let res;

if (id % 2 == 0) {
  res = (id % 1082).toString();
} else if (id % 3 == 0) {
  res = (id % 775).toString();
} else if (id % 5 == 0) {
  res = (id % 308).toString();
}

const hash = res.concat("307");
console.log(hash);

/**
 * (Level 1 Default JS) TypeError: Cannot read property 'concat' of undefined (13:18)
 *
 * (Level 2) TypeError: Attempted to call 'concat' on undefined (13:18)
 *
 *
 **/
