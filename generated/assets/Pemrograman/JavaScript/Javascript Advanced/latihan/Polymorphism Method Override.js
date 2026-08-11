/**
 * TODO:
 * Buatlah sistem class kendaraan menggunakan konsep polymorphism.
 *
 * Ketentuan:
 * 1. Buat class induk bernama Vehicle.
 * 2. Class Vehicle memiliki constructor dengan properti:
 *      - name
 *
 * 3. Class Vehicle memiliki method bernama move()
 *      yang menampilkan teks:
 *      "<name> sedang bergerak"
 *
 * 4. Buat 3 class turunan dari Vehicle:
 *      - Car
 *      - Boat
 *      - Airplane
 *
 * 5. Setiap class turunan HARUS override method move()
 *      dengan perilaku berbeda:
 *
 *      Car → "<name> melaju di jalan"
 *      Boat → "<name> berlayar di laut"
 *      Airplane → "<name> terbang di udara"
 *
 * 6. Buat array berisi object:
 *      - Car
 *      - Boat
 *      - Airplane
 *
 * 7. Loop array tersebut dan panggil method move()
 *
 * Tujuan latihan:
 * memahami polymorphism dimana method yang sama
 * menghasilkan perilaku berbeda tergantung objectnya.
 */


class vehicle {
    constructor(name) {
        this.name = name;
    }

    move(){
        console.log(this.name + " sedang bergerak");
    }
}

class Car extends vehicle {
    move(){
        console.log(this.name + " melaju di jalan");
    }

    makeSound(){
        console.log(this.name + " Brummm")
    }
}

class Boat extends vehicle {
    move(){
        console.log(this.name + " berlayar di laut");
    }

    makeSound(){
        console.log(this.name + " Whooooosh")
    }
}

class Airplane extends vehicle {
    move(){
        console.log(this.name + " terbang di udara");
    }

    makeSound(){
        console.log(this.name + " Ngggggg")
    }
}


const car = new Car("Avanza");
const boat = new Boat("Titanic");
const airplane = new Airplane("Boeing 737");
const vehicles = [car, boat, airplane];

for (const vehicle of vehicles) {
  vehicle.move();
  vehicle.makeSound();
}


/**
 * Tugas Tambahan
 * Tambah method baru bernama makeSound().
 * Car → "Brummm"
 * Boat → "Whoooosh"
 * Airplane → "Ngggggg"
 */