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
 * TypeError: Cannot read property 'concat' of undefined
 * Attempted to call 'concat' on undefined on line 13, expected 'string'
 **/
