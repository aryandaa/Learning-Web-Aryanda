/**
 * TODO:
 * Buat sistem karakter game menggunakan Object Composition (bukan class).
 *
 * Gunakan nama object dan function berikut:
 *
 * Ability Functions:
 * - canWalk
 * - canAttack
 * - canHeal
 *
 * Factory Function:
 * - createCharacter(name, abilities)
 *
 * Ketentuan:
 *
 * 1. Buat ability function bernama canWalk(character)
 *    Method yang dihasilkan:
 *    walk() → "<name> sedang berjalan"
 *
 * 2. Buat ability function bernama canAttack(character)
 *    Method yang dihasilkan:
 *    attack() → "<name> menyerang musuh"
 *
 * 3. Buat ability function bernama canHeal(character)
 *    Method yang dihasilkan:
 *    heal() → "<name> menyembuhkan diri"
 *
 * 4. Buat factory function createCharacter(name, abilities)
 *    yang:
 *    - membuat object bernama character
 *    - memiliki property name
 *    - menggabungkan ability menggunakan Object.assign()
 *
 * 5. Buat object berikut menggunakan createCharacter:
 *
 *    warrior
 *    abilities:
 *    - canWalk
 *    - canAttack
 *
 *    priest
 *    abilities:
 *    - canWalk
 *    - canHeal
 *
 *    paladin
 *    abilities:
 *    - canWalk
 *    - canAttack
 *    - canHeal
 *
 * 6. Simpan semua karakter ke dalam array bernama characters.
 *
 * 7. Jalankan testing berikut:
 *
 * warrior.walk()
 * warrior.attack()
 *
 * priest.walk()
 * priest.heal()
 *
 * paladin.walk()
 * paladin.attack()
 * paladin.heal()
 */

class Character {
    constructor(name) {
        this.name = name;
    }
}

function canWalk(character) {
    return {
        walk(){
            console.log(`${character.name} sedang berjalan`);
        }
    }
}

function canAttack(character){
    return {
        attack(){
            console.log(`${character.name} menyerang musuh`);
        }
    }
}

function canHeal(character) {
    return {
        heal(){
            console.log(`${character.name} menyembuhkan diri`);
            
        }
    }
    
}

function createCharacter(name, abilities){
    const character = new Character(name)
    for (const ability of abilities){
        Object.assign(character, ability(character))
    }
    return character;
}

const warrior = createCharacter("Diluc", [
    canWalk,
    canAttack
]);

const priest = createCharacter("Barbara", [
    canWalk,
    canHeal
]);

const paladin = createCharacter("Jean", [
    canWalk,
    canAttack,
    canHeal
]);

warrior.walk()
warrior.attack()

priest.walk()
priest.heal()

paladin.walk()
paladin.attack()
paladin.heal()