// For = Perulangan Biasa
for (let i = 0; i < 5; i++) {
  console.log(`Angka ke-${i} adalah ${i}`);
}

// For In = Untuk Object
const person = { name: 'Fulan', origin: 'Bandung', birthYear: 2024 };

for (const property in person) {
  console.log(`${property} bernilai ${person[property]}`);
}

// For Of = Lebih simple dari for in
const names = ['Bebek', 'Ayam', 'Telor', 'Tempe'];

for (const item of names) {
  console.log(item);
}

// While
let i = 0;

while (i < 5) {
  console.log(`Angka ke-${i} adalah ${i}.`);
  i++;
}
