import { expect } from "chai";
import eNUMERATION from "../src/eNUMERATION.mjs";
import dt from "../src/datatypes.mjs";
import bUSINESSoBJECT from "../src/bUSINESSoBJECT.mjs";
import sTORAGEmANAGER from "../src/storage/sTORAGEmANAGER.mjs";


const BookCategoryEL = new eNUMERATION("BookCategoryEL", ["novel", "biography",
  "textbook", "other"]);

class Publisher extends bUSINESSoBJECT {
  constructor({ name, address }) {
    super(name);
    this.address = address;
  }
}
Publisher.properties = {
  "name": { range: "NonEmptyString", isIdAttribute: true, min: 2, max: 20 },
  "address": { range: "NonEmptyString", min: 5, max: 50 },
}
Publisher.setup();

class Book extends bUSINESSoBJECT {
  constructor({ isbn, title, year, publisher, edition, category }) {
    super(isbn);
    this.title = title;
    this.year = year;
    if (publisher) this.publisher = publisher;
    if (edition) this.edition = edition;
    if (category) this.category = category;
  }
}
Book.properties = {
  "isbn": {
    range: "NonEmptyString", isIdAttribute: true, label: "ISBN", pattern: /\b\d{9}(\d|X)\b/,
    patternMessage: "The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"
  },
  "title": { range: "NonEmptyString", min: 2, max: 50 },
  "year": { range: "Integer", min: 1459, max: () => (new Date()).getFullYear() + 1 },
  "publisher": { range: "Publisher", optional: true },
  "edition": { range: "PositiveInteger", optional: true },
  "category": { range: BookCategoryEL, optional: true }
}
Book.setup();

const storeMan = new sTORAGEmANAGER({
  adapterName: "IndexedDB", dbName: "TestSuite01",
  createLog: true, validateBeforeSave: true
});

const classes = Object.keys(dt.classes).map(className => dt.classes[className]).
  filter(c => !c.isAbstract && !c.isComplexDatatype);

// Clean up database and create empty database before running test cases
before(() => {
  storeMan.deleteDatabase();  // or storeMan.clearDB()
  storeMan.createEmptyDb(classes);
});

describe("sTORAGEmANAGER tests", () => {
  describe("IndexDB tests", () => {
    const b1 = new Book({ isbn: "1234567890", title: "A novel", year: 2022, category: BookCategoryEL.NOVEL });
    const p1 = new Publisher({ name: "Springer", address: "Berlin, Germany" });
    // a book object with a publisher object reference
    const b2 = new Book({
      isbn: "123456789X", title: "Textbook 1", year: 2021,
      category: BookCategoryEL.TEXTBOOK, publisher: p1
    });
    // a book object with a publisher ID reference
    const b3 = new Book({
      isbn: "123123123X", title: "Textbook 2", year: 2021,
      category: BookCategoryEL.TEXTBOOK, publisher: "Springer"
    });

    it("Creating DB and adding records", () => {
      expect(async () => { await storeMan.add(p1.toRecord(), Publisher) }).not.to.throw(Error);
      expect(async () => { await storeMan.add([b1.toRecord(), b2.toRecord(), b3.toRecord()], Book) }).not.to.throw(Error);
    });

    it("Retrieve a record", async () => {
      let bookRec = await storeMan.retrieve(Book, "123456789X");
      expect(JSON.stringify(bookRec)).to.be.equal(JSON.stringify(b2.toRecord()));
    });

    it("Retrieve all records", async () => {
      let bookRecords = await storeMan.retrieveAll(Book);
      const books = Object.keys(Book.instances).map(isbn => Book.instances[isbn].toRecord());

      expect(books).to.include.members([b1.toRecord(), b2.toRecord(), b3.toRecord()]);
    });
  });
});