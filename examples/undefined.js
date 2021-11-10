function get(id) {
  if (id % 2 == 0) {
    return `${id % 1082}`;
  }
}

if (require.main === module) {
  let h1 = get(500);

  h1 = h1.concat("hash");

  let h2 = get(501);
  h2 = h2.concat("hash");
}

/**
 * (Level 1 Default JS) TypeError: Cannot read property 'concat' of undefined (13:11)
 *
 * (Level 2) TypeError: Attempted to call 'concat' on undefined (13:11)
 *
 * (Level 3) TypeError: Attempted to call 'concat' on undefined (13:11)
 * did you mean to call 'concat' on a string instead?
 *
 * (Level 4) TypeError: Attempted to call 'concat' on undefined (13:11)
 * did you mean to call 'concat' on a string instead?
 * Warning: 'get' could return undefined at line 12
 *
 **/
