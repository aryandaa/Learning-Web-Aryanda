/**
 * TODO:
 * Buatlah program yang melakukan hal berikut:
 * 1. Buat sebuah variabel bernama age dengan nilai bebas.
 * 2. Jika age kurang dari 13 → tampilkan "Anak-anak".
 * 3. Jika age antara 13 sampai 17 → tampilkan "Remaja".
 * 4. Jika age antara 18 sampai 59 → tampilkan "Dewasa".
 * 5. Jika age 60 ke atas → tampilkan "Lansia".
 * 6. Gunakan console.log untuk menampilkan hasilnya.
 */

const age = 60;

if (age < 13) {
    console.log('Anak-Anak');
} else if (age >= 13 & age <= 17) {
    console.log('Remaja');
} else if (age >= 18 & age <= 59) {
    console.log('Dewasa')
} else {
    console.log('Lansia')
}