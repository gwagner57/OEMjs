import { bUSINESSoBJECT } from "../src/bUSINESSoBJECT";

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
describe("Basic Issues", () => {
  let b1 = new Book({isbn: "123456789X", title:"Hello world", year: 2022});

  test("Check initial Book information", () => {
    expect(b1.id).toBe("123456789X");
    expect(b1.title).toBe("Hello world");
    expect(b1.year).toBe(2022);
  })

  test("Change Book values", () => {
    b1.title = "New title";
    expect(b1.title).toBe("New title");
    b1.year = 2018;
    expect(b1.year).toBe(2018);
  });

  const p1 = new Publisher({name:"Springer", address:"Berlin, Germany"});
  const b4 = new Book({isbn: "123456789X", title:"Hello world", year: 2022, publisher: p1});
  const b5 = new Book({isbn: "123456789X", title:"Hello world", year: 2022, publisher:"Springer"});
  test("Value assignement", () => {
    expect(b4.publisher.name).toBe("Springer");
    expect(b5.publisher.name).toBe("Springer");

  });
});

describe("Validation", () => {
  test("Valid data", () => {
    let b1 = new Book({isbn: "123456789X", title: "Hello world", year: 2022});
    expect(b1.id).toBe("123456789X");
  });

  test("Flawed ISBN", () => {
    expect(() => new Book({isbn: "123456789", title: "Hello world", year: 2022})).toThrowError("");
  });

  test("Missing value for ISBN", () => {
    expect(() => new Book({title: "Hello world", year: 2022})).toThrowError("");
  });

  test("Wrong year", () => {
    expect(() => new Book({isbn: "123456789X", title: "Hello world", year: 1222})).toThrowError("");
  });

  test("Deactivate Validation", () => {
    bUSINESSoBJECT.areConstraintsToBeChecked = false;
    let b1 = new Book({isbn: "123456789X", title: "Hello world", year: 22});
    expect(b1.isbn).expect("123456789X");
  });
});