let person = {name: "Bob", age: 25};
let age = person.age;
person.age = 30;
person["address"] = "123 First Street";

// This will be ignored as we don't support computed properties that aren't literals
person["addressAtAge" + age] = "410 Main Street";