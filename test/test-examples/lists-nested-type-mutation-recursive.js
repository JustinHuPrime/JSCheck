// This starts as Array[String]
let lst1 = ["foo", "bar"];
// This starts as Array[Array[String]]
let lst2 = [lst1]

// This makes lst1 a circular array, which our code surprisingly handles???
lst1[2] = lst2[0]
