import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import eNUMERATION from "../../../src/eNUMERATION.mjs";
import {dt} from "../../../src/datatypes.mjs";

const BookCopyStatusEL = new eNUMERATION("BookCopyStatusEL", ["available","lended"]);

/**
 * Object type BookCopy
 * @class
 */
class BookCopy extends bUSINESSoBJECT {
  constructor ({id, book, status}) {
    super( id);
    this.book = book;
    this.status = status;
  }
}
BookCopy.properties = {
  "id": {range:"AutoIdNumber", isIdAttribute: true, label:"Book copy ID"},
  "book": {range:"Book", label:"Book"},
  "status": {range: BookCopyStatusEL, label:"Status"}
}
BookCopy.displayAttribute = "book.title";  // used in toShortString()

// collect BO classes in a map
dt.classes["BookCopy"] = BookCopy;

export {BookCopy, BookCopyStatusEL};