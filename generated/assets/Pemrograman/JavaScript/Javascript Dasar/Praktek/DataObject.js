const user = {
    name: "Aryanda",
    age: 20,
    tb: 56.2,
}

const product = {
    name: "Dimsum mentai",
    harga: 5000,
    varian: "sambal mentai"
}

console.log(user.name, "membeli", product.name, "varian", product.varian,"dengan harga: ", product.harga)

// Mengubah value object:
product.harga = 1000
console.log(product.harga)

// Menghapus Properti Object
delete user.age
console.log(user) // age dari user akan hilang.

