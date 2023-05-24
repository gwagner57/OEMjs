/**
 * Object type Book 
 * @class
 */
import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";

class Book extends bUSINESSoBJECT {
  constructor ({isbn, title, year, publisher, authors}) {
    super( isbn);
    this.title = title;
    this.year = year;
    this.authors = authors;
    if (publisher) this.publisher = publisher;
  }
}
Book.properties = {
  "isbn": {range:"String", isIdAttribute: true, label:"ISBN", fieldSize: 12, pattern:/\b\d{9}(\d|X)\b/,
    patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
  "title": {range:"NonEmptyString", label:"Title", min: 2, max: 50, fieldSize: 50},
  "year": {range:"Integer", label:"Year", min: 1459, max: () => (new Date()).getFullYear() + 1},
  "authors": {range:"Author", minCard: 1, maxCard: Infinity, label:"Authors", fieldSize: 50},
  "publisher": {range:"Publisher", optional: true, label:"Publisher"}
}
Book.displayAttribute = "title";  // used in toShortString()
//Book.attributesToDisplayInLists = ["isbn","title","year"];  // used for restricting the RetrieveAll lists
Book.setup();

export default Book;