// mengubah ke string
const number = 123;
const boolean = true;

const strNumber = String(number);
const strBoolean = boolean.toString();

console.log(strNumber); // output: "123"
console.log(strBoolean); // output: "true"

// Mengubah ke Number
const StrToNumber = '123';
const strTOFloat = '3.14';
const BooltoNumber = true;

const numFromString = Number(StrToNumber);
const floatFromString = Number(strTOFloat);
const numFromBoolean = Number(BooltoNumber);

console.log(StrToNumber); // output: 123
console.log(strTOFloat); // output: 3.14
console.log(BooltoNumber); // output: 1

const cm = '20cm';
const px = '64px';

const intFromCM = parseInt(cm);
const intFromPX = parseInt(px);

console.log(intFromCM); // output: 20
console.log(intFromPX); // output: 64

const cmf = '20.55cm';
const pxf = '64.23px';

const floatFromCM = parseFloat(cmf);
const floatFromPX = parseFloat(pxf);

console.log(floatFromCM); // output: 20.55
console.log(floatFromPX); // output: 64.23

// Mengubah ke Boolean
const stringtoBool = 'Dicoding';
const empty = null;

const boolFromNumber = Boolean(number);
const boolFromString = Boolean(stringtoBool);
const boolFromNull = Boolean(empty);

console.log(boolFromNumber); // output: true
console.log(boolFromString); // output: true
console.log(boolFromNull); // output: false