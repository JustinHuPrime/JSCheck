let x = 3;

if (true) {
  x = "something";
  if (false) {
    x = false;
  } else {
    x = [2,3]
  }
}

let y = 5;
let z = true;

if (true) {
  y = "string";
} else {
  z = "buzz";
}

let a;
if (true) {
  a = "never";
} else if (true) {
  a = 6;
} else if (false) {
  z = "something;"
}

let b;
if (true) {
  if (false) {
    b = 7;
  }

  if (false) {
    b = "";
  }
} else {
  b = true;
}