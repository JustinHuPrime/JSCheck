let strings = ["cool","static","analyzer"];
let lenSum = 0;
for (let i=0; i<strings.length; i++) {
    lenSum = lenSum + strings[i].length;
}
console.log(lenSum); // 4