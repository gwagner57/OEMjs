import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";

/**
 * Object type Book
 * @class
 */
class Book extends bUSINESSoBJECT {
  constructor ({isbn, title, year, publisher, authors, reserved=false}) {
    super( isbn);
    this.title = title;
    this.year = year;
    this.authors = authors;
    if (publisher) this.publisher = publisher;
    this.reserved = reserved;
  }
}
Book.properties = {
  "isbn": {range:"String", isIdAttribute: true, label:"ISBN", fieldSize: 12, pattern:/\b\d{9}(\d|X)\b/,
    patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
  "title": {range:"NonEmptyString", label:"Title", min: 2, max: 50, fieldSize: 50},
  "year": {range:"Integer", label:"Year", min: 1459, max: () => (new Date()).getFullYear() + 1},
  "authors": {range:"Person", minCard: 1, maxCard: Infinity, label:"Authors", fieldSize: 50},
  "publisher": {range:"Publisher", optional: true, label:"Publisher"},
  "reserved": {range:"Boolean", optional: true, label:"Is reserved"},
  "bookCopies": {range:"BookCopy", inverseOf:"book", minCard: 0, maxCard: Infinity, label:"Book copies", fieldSize: 50}
}
Book.displayAttribute = "title";  // used in toShortString()
//Book.attributesToDisplayInLists = ["isbn","title","year"];  // used for restricting the RetrieveAll lists

// collect BO classes in a map
dt.classes["Book"] = Book;

export default Book;