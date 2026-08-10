/**
 * TODO:
 * Diberikan object berikut:
 * 
 * const user = {
 *   name: "Yanda",
 *   age: 21,
 *   isAdmin: false
 * }
 *
 * Lakukan hal berikut:
 * 1. Tambahkan property baru bernama email.
 * 2. Ubah age menjadi age + 1.
 * 3. Jika isAdmin bernilai false, tampilkan "User biasa".
 * 4. Jika true tampilkan "Admin".
 * 5. Tampilkan seluruh object setelah dimodifikasi.
 */

const user = {
    name: "Yanda",
    age: 21,
    isAdmin: true
  }
user.email = "yanda@email.com";
user.age += 1;

console.log(user)

if (user.isAdmin === false) {
    console.log("User Biasa")
} else {
    console.log("Admin")
}