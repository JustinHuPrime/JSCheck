let id = 503;

let res;

if (id % 2 == 0) {
  res = `${id % 1082}`;
} else if (id % 3 == 0) {
  res = `${id % 775}`
} else if (id % 5 == 0) {
  res = `${id % 308}`;
}

const hash = id.concat('307');
console.log(hash);

/**
 * (Level 1 Default JS) TypeError: Cannot read property 'concat' of undefined (13:11)
 *
 * (Level 2) TypeError: Attempted to call 'concat' on undefined (13:11)
 *
 *
 **/
