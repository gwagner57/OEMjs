import bUSINESSoBJECT from "./../src/bUSINESSoBJECT.mjs";
import { expect } from "chai";

/**
 * Define needed Classes
 */
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
  constructor({ isbn, title, year, publisher, edition }) {
    super(isbn);
    this.title = title;
    this.year = year;
    if (publisher) this.publisher = publisher;
    if (edition) this.edition = edition;
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
  "edition": { range: "PositiveInteger", optional: true }
}
Book.setup();

/**
 * Test cases
 */
describe("bUSINESSoBJECT tests", () => {
  describe("Basic Issues", () => {
    let b1 = new Book({ isbn: "123456789X", title: "Hello world", year: 2022 });

    it("Check initial Book information", () => {
      expect(b1.id).to.be.equal("123456789X");
      expect(b1.title).to.be.equal("Hello world");
      expect(b1.year).to.be.equal(2022);
    })

    it("Change Book values", () => {
      b1.title = "New title";
      expect(b1.title).to.be.equal("New title");
      b1.year = 2018;
      expect(b1.year).to.be.equal(2018);
    });

    const p1 = new Publisher({ name: "Springer", address: "Berlin, Germany" });
    const b4 = new Book({ isbn: "123456789X", title: "Hello world", year: 2022, publisher: p1 });
    const b5 = new Book({ isbn: "123456789X", title: "Hello world", year: 2022, publisher: "Springer" });
    it("Value assignement", () => {
      expect(b4.publisher.name).to.be.equal("Springer");
      expect(b5.publisher.name).to.be.equal("Springer");

    });
  });

  describe("Validation", () => {
    it("Valid data", () => {
      let b1 = new Book({ isbn: "123456789X", title: "Hello world", year: 2022 });
      expect(b1.id).to.be.equal("123456789X");
    });

    it("Flawed ISBN", () => {
      expect(() => new Book({ isbn: "123456789", title: "Hello world", year: 2022 })).to.throw(Error, "");
    });

    it("Missing value for ISBN", () => {
      expect(() => new Book({ title: "Hello world", year: 2022 })).to.throw(Error, "");
    });

    it("Wrong year", () => {
      expect(() => new Book({ isbn: "123456789X", title: "Hello world", year: 1222 })).to.throw(Error, "");
    });

    it("Deactivate Validation", () => {
      bUSINESSoBJECT.areConstraintsToBeChecked = false;
      let b1 = new Book({ isbn: "123456789X", title: "Hello world", year: 22 });
      expect(b1.isbn).to.be.equal("123456789X");
    });
  });
});