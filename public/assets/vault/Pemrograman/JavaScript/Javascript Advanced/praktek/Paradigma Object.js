class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    eat(){
        console.log(`${this.name} is eating`);
    }
}

const person1 = new Person('alice', 25);
const person2 = new Person('bob', 30);

console.log(person1.name); // Output: Alice
console.log(person2.name); // Output: Bob

person1.eat();
person2.eat();