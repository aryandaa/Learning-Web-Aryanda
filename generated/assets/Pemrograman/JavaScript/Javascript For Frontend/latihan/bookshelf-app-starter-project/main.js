const STORAGE_KEY = "BOOKSHELF_APPS";
let books = [];

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    books = JSON.parse(data);
  }
}

document.getElementById("bookForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const title = document.getElementById("bookFormTitle").value;
  const author = document.getElementById("bookFormAuthor").value;
  const year = document.getElementById("bookFormYear").value;
  const isComplete = document.getElementById("bookFormIsComplete").checked;

  const newBook = {
    id: new Date().getTime(),
    title,
    author,
    year: Number(year),
    isComplete
  };

  books.push(newBook);
  saveData();
  renderBooks();

  this.reset();
});

function renderBooks(filteredBooks = null) {
  const incompleteList = document.getElementById("incompleteBookList");
  const completeList = document.getElementById("completeBookList");

  incompleteList.innerHTML = "";
  completeList.innerHTML = "";

  const data = filteredBooks || books;

  data.forEach(book => {
    const bookElement = createBookElement(book);

    if (book.isComplete) {
      completeList.appendChild(bookElement);
    } else {
      incompleteList.appendChild(bookElement);
    }
  });
}

function createBookElement(book) {
  const container = document.createElement("div");
  container.setAttribute("data-bookid", book.id);
  container.setAttribute("data-testid", "bookItem");

  const title = document.createElement("h3");
  title.setAttribute("data-testid", "bookItemTitle");
  title.innerText = book.title;

  const author = document.createElement("p");
  author.setAttribute("data-testid", "bookItemAuthor");
  author.innerText = "Penulis: " + book.author;

  const year = document.createElement("p");
  year.setAttribute("data-testid", "bookItemYear");
  year.innerText = "Tahun: " + book.year;

  const btnContainer = document.createElement("div");

  const toggleBtn = document.createElement("button");
  toggleBtn.setAttribute("data-testid", "bookItemIsCompleteButton");
  toggleBtn.innerText = book.isComplete
    ? "Belum selesai dibaca"
    : "Selesai dibaca";

  toggleBtn.addEventListener("click", () => {
    toggleBook(book.id);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.setAttribute("data-testid", "bookItemDeleteButton");
  deleteBtn.innerText = "Hapus Buku";

  deleteBtn.addEventListener("click", () => {
    deleteBook(book.id);
  });

  const editBtn = document.createElement("button");
  editBtn.setAttribute("data-testid", "bookItemEditButton");
  editBtn.innerText = "Edit Buku";

  editBtn.addEventListener("click", () => {
    editBook(book.id);
  });

  btnContainer.append(toggleBtn, deleteBtn, editBtn);
  container.append(title, author, year, btnContainer);

  return container;
}

function toggleBook(id) {
  const book = books.find(b => b.id === id);
  book.isComplete = !book.isComplete;

  saveData();
  renderBooks();
}

function deleteBook(id) {
  books = books.filter(book => book.id !== id);

  saveData();
  renderBooks();
}

function editBook(id) {
  const book = books.find(b => b.id === id);

  const newTitle = prompt("Edit Judul", book.title);
  const newAuthor = prompt("Edit Penulis", book.author);
  const newYear = prompt("Edit Tahun", book.year);

  if (newTitle && newAuthor && newYear) {
    book.title = newTitle;
    book.author = newAuthor;
    book.year = Number(newYear);

    saveData();
    renderBooks();
  }
}

document.getElementById("searchBook").addEventListener("submit", function (e) {
  e.preventDefault();

  const keyword = document
    .getElementById("searchBookTitle")
    .value.toLowerCase();

  const filtered = books.filter(book =>
    book.title.toLowerCase().includes(keyword)
  );

  renderBooks(filtered);
});

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  renderBooks();
});