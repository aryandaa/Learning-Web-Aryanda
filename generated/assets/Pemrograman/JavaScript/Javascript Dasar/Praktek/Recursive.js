function GeneratedArray(n) {
    result = [];
    for (let counter = 0; counter <= n; counter+=1) {
        result.push(counter);
    }
    return result;
}

console.log(GeneratedArray(5))


function generateArray(n) {
  if (n < 0) {
    return [];
  }

  return [...generateArray(n - 1), n];
}

console.log(generateArray(5));