function fibonacci(n) {
  let a = 0;
  let b = 1;
  const result = [];
  for (let i = 0; i <= n; i++) {
    result.push(a);
    [a, b] = [b, a + b];
  }
  return result;
}

// Jangan hapus kode di bawah ini!
export default fibonacci;