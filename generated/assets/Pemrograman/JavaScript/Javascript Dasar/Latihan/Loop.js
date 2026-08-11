/**
 * TODO:
 * Buatlah program untuk menampilkan angka dari 1 sampai 50 dengan ketentuan:
 * 1. Jika angka habis dibagi 3 tampilkan "Fizz".
 * 2. Jika angka habis dibagi 5 tampilkan "Buzz".
 * 3. Jika angka habis dibagi 3 dan 5 tampilkan "FizzBuzz".
 * 4. Jika tidak memenuhi kondisi di atas tampilkan angkanya sendiri.
 * 5. Gunakan perulangan (loop).
 */


for (let i = 1; i <= 50; i++) {

    if (i % 3 === 0 && i % 5 === 0) {
        console.log("FizzBuzz");

    } else if (i % 3 === 0) {
        console.log("Fizz");

    } else if (i % 5 === 0) {
        console.log("Buzz");

    } else {
        console.log(i);
    }

}

