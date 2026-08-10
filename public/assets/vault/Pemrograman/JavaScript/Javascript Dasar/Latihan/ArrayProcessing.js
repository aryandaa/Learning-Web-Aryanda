/**
 * TODO:
 * Diberikan array berikut:
 * const numbers = [12, 5, 8, 130, 44, 2, 99];
 *
 * Buat program yang:
 * 1. Menyimpan semua angka yang lebih besar dari 10 ke array baru.
 * 2. Menghitung jumlah total dari angka tersebut.
 * 3. Menampilkan:
 *    - array baru
 *    - total jumlahnya
 */

const numbers = [12, 5, 8, 130, 44, 2, 99];
let result = [];
let total = 0


for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > 10) {
        result.push(numbers[i]);
    }
}

for (const n of result){
    total += n;
}

console.log(result);
console.log(total);