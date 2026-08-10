// For
const score = 90;

if (score > 90) {
  console.log('Selamat, Anda mendapatkan nilai A!');
} else if (score > 80) {
  console.log('Selamat, Anda lulus ujian!');
} else {
  console.log('Maaf, Anda belum lulus ujian.');
}

// Switch
switch (score) {
    case (30):
        console.log("anda harus mengulang");
        break;

    case (50):
        console.log("anda harus remedial");
        break;

    case (70):
        console.log("Nilai anda dibawah rata rata");
        break;

    case (90):
        console.log("Anda lulus mata kuliah ini")
        break;

    case (100):
        console.log("Nilai anda di atas rata rata, dan akan mendapatkan reward dari kampus");
        break;

    default:
        console.log("masukan nilai yang benar")
        break;
}

