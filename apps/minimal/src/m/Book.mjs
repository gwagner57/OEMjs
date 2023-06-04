/**
 * Object type Book 
 * @class
 */
import eNUMERATION from "../../../../src/eNUMERATION.mjs";
import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../../src/datatypes.mjs";

const BookCategoryEL = new eNUMERATION("BookCategoryEL", ["novel","biography","textbook","other"]);

class Book extends bUSINESSoBJECT {
  constructor ({isbn, title, year, category, edition}) {
    super( isbn);
    this.title = title;
    this.year = year;
    this.category = category;
    if (edition) this.edition = edition;
  }
}
Book.properties = {
  "isbn": {range:"String", isIdAttribute: true, label:"ISBN", pattern:/\b\d{9}(\d|X)\b/,
    patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
  "title": {range:"NonEmptyString", label:"Title", min: 2, max: 50},
  "year": {range:"Integer", label:"Year", min: 1459, max: () => (new Date()).getFullYear() + 1},
  "category": {range: BookCategoryEL, label:"Category"},
  "edition": {range:"PositiveInteger", label:"Edition", optional: true}
}
Book.displayAttribute = "title";  // used in toShortString()
//Book.attributesToDisplayInLists = ["isbn","title","year"];

// collect BO classes in a map
dt.classes["Book"] = Book;

export { BookCategoryEL, Book};