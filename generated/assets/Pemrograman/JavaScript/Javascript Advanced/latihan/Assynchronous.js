function runProgram() {
  console.log("Start");

  const time = 1000;

  setTimeout(() => {
    console.log("Async Done");
  }, time);
  // TODO: Buat proses asynchronous yang menampilkan "Async Done"
  // setelah 1 detik tanpa menghentikan eksekusi program

  console.log("Process");

  console.log("End");
}

runProgram();