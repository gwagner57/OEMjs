/**
 * Object type Book 
 * @class
 */
import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";

class Book extends bUSINESSoBJECT {
  constructor ({isbn, title, year, edition, purchaseDate, recordCreatedOn=new Date(), isReserved=false}) {
    super( isbn);
    this.title = title;
    this.year = year;
    if (edition) this.edition = edition;
    this.purchaseDate = purchaseDate;
    this.recordCreatedOn = recordCreatedOn;
    this.isReserved = isReserved;
  }
}
Book.properties = {
  "isbn": {range:"String", isIdAttribute: true, label:"ISBN", pattern:/\b\d{9}(\d|X)\b/,
    patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
  "title": {range:"NonEmptyString", label:"Title", min: 2, max: 50, fieldSize: 25},
  "year": {range:"Integer", label:"Year", min: 1459, max: () => (new Date()).getFullYear() + 1},
  "edition": {range:"PositiveInteger", label:"Edition", optional: true},
  "purchaseDate": {range:"Date", label:"Purchase date", widget:"browser-date-picker"},
  "recordCreatedOn": {range:"DateTime", label:"Record created on", fieldSize: 25},
  "isReserved": {range: "Boolean", label:"Is reserved"}
}
Book.displayAttribute = "title";  // used in toShortString()
//Book.attributesToDisplayInLists = ["isbn","title","year"];

// collect BO classes in a map
dt.classes["Book"] = Book;

export default Book;