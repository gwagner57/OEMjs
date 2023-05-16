import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";
import { lIST, rECORD } from "../../../../src/datatypes.mjs";

const Reservation = new rECORD({ userId: "Integer", isbn: "String", date: "Date" });
const Lending = new rECORD({ userId: "Integer", copyId: "Integer", date: "Date" });

class Book extends bUSINESSoBJECT {
  constructor({ isbn, title, year, publisher, authors, lendings, reservations }) {
    super(isbn);
    this.title = title;
    this.year = year;
    this.authors = authors;
    if (publisher) this.publisher = publisher;
    if (lendings) this.lendings = lendings;
    if (reservations) this.reservations = reservations;
  }
}
Book.properties = {
  "isbn": {
    range: "String", isIdAttribute: true, label: "ISBN", pattern: /\b(\d{10})|(\d{13})\b/,
    patternMessage: "ISBN 10-digit string or a 13-digit!"
  },
  "title": { range: "NonEmptyString", label: "Title", min: 3, max: 100, fieldSize: 50 },
  "publicationYear": { range: "Integer", label: "Year", min: 1000, max: () => (new Date()).getFullYear() + 1 },
  "authors": { range: "Author", minCard: 1, maxCard: Infinity, label: "Authors" },
  "publisher": { range: "Publisher", optional: true, label: "Publisher" },
  "lendings": { range: "lIST", optional: true, label: "Lendings" },
  "reservations": { range: "lIST", optional: true, label: "Reservations" }
}

const BookStatus = new eNUMERATION("BookStatus", ["available", "lended", "reserved"]);

class BookCopy extends bUSINESSoBJECT {
  constructor({ id, status, book, returns, lendings, notifications }) {
    super(id);
    this.status = status;
    this.book = book;
    if (returns) this.returns = returns;
    if (lendings) this.lendings = lendings;
    if (notifications) this.notifications = notifications;
  }
}

BookCopy.properties = {
  "id": { range: "Integer", idAttribute: true, label: "ID" },
  "status": { range: "BookStatus", optional: false, label: "Status" },
  "book": { range: "Book", optional: false, label: "Book" },
  "returns": { range: "lIST", optional: true, label: "Book returns" },
  "lendings": { range: "lIST", optional: true, label: "Book lendings" },
  "notifications": { range: "lIST", optional: true, label: "Book pickup notifications" },
}

Book.setup();
BookCopy.setup();

export default { Book, BookCopy, Reservation, Lending };