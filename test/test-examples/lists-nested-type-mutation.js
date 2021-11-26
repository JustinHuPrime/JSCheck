// This starts as Array[Union[String|Array[String|Number]]]
let lst1 = ["foo", "bar", "baz", ["abc", 555]];
// This starts as Array[Array[Union[String|Array[String|Number]]]]
let lst2 = [lst1]

// lst1 becomes Array[Union[String|Array[String|Number]|Number]]
// lst2 becomes Array[Array[Union[String|Array[String|Number]|Number]]]
lst1.push(1)
