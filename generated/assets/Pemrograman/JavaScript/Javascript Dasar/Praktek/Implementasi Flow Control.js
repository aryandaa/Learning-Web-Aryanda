function checkGrades(grades) {
  for (let i = 0; i < grades.length; i++) {
    if (typeof grades[i] !== 'number') {
      throw new Error('Invalid input. Please provide an array of numbers.');
    }

    const grade = grades[i];
    let predicate;

    if (grade >= 90) {
      predicate = 'A';
    } else if (grade >= 80) {
      predicate = 'B';
    } else if (grade >= 70) {
      predicate = 'C';
    } else if (grade >= 60) {
      predicate = 'D';
    } else {
      predicate = 'E';
    }

    console.log(`Grade ${i + 1}: ${grade} (${predicate})`);
  }
}

try {
  const studentGrades = [95, 85, 65, 80, 70];
  checkGrades(studentGrades);
} catch (e) {
  console.error(e);
}

/*
Pada contoh di atas, function checkGrades akan menerima input berupa array of number. Di dalamnya, perulangan akan dilakukan untuk mendapatkan masing-masing nilai di dalam array grades. Selanjutnya akan ada percabangan dengan if untuk menagani exceptions ketika grades bukanlah number.

Selanjutnya, akan ada pengecekan if bersarang untuk mengembalikan predikat dari nilai. Contohnya, ketika nilai lebih dari 90, predikat akan bernilai A. Setelah itu, nilai dan predikatnya akan ditampilkan di terminal/console.

Try-Catch digunakan untuk menangani exception ketika function checkGrades error. Di saat function checkGrades menerima argument berupa string, maka blok catch akan dibangkitkan dan menampilkan pesan error di terminal/console.
*/