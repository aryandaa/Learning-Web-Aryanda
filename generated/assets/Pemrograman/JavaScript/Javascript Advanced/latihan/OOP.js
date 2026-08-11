/**
 * TODO:
 * Buat sebuah class bernama Rectangle.
 * 
 * Ketentuan:
 * 1. Constructor menerima parameter:
 *    - width
 *    - height
 * 
 * 2. Buat method:
 * 
 * getArea()
 * - Mengembalikan luas persegi panjang.
 * 
 * getPerimeter()
 * - Mengembalikan keliling persegi panjang.
 * 
 * isSquare()
 * - Mengembalikan true jika width dan height sama.
 * - Jika tidak sama kembalikan false.
 * 
 * 3. Buat instance dari class tersebut dan tampilkan:
 *    - luas
 *    - keliling
 *    - apakah dia persegi atau bukan
 */

class Rectangle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    getArea(){
        //Luas = Height x Width
        return(this.height * this.width);
    }

    getPerimeter(){
        // K = 2x (P x L) Atau 2P + 2L
        return 2 * (this.width + this.height);
    }

    isSquare(){
    return this.width === this.height;
    }
}

const rectangle = new Rectangle(25, 10);

console.log("Area:", rectangle.getArea());
console.log("Perimeter:", rectangle.getPerimeter());
console.log("Is Square:", rectangle.isSquare());
