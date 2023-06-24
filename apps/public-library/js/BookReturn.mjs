import bUSINESSaCTIVITY from "../../../src/bUSINESSaCTIVITY.mjs";
import {BookCopyStatusEL} from "./BookCopy.mjs";

/**
 * Business activity type BookLending
 * @class
 */
class BookReturn extends bUSINESSaCTIVITY {
  constructor ({returner, bookCopies}) {
    super();
    this.returner = returner;
    this.bookCopies = bookCopies;
  }
  onActivityEnd() {
    for (const bc of this.bookCopies) {
      bc.status = BookCopyStatusEL.AVAILABLE;
    }
  }
}
BookReturn.properties = {
  "returner": {range:"Person", label:"Returner"},
  "bookCopies": {range:"BookCopy", label:"Returned book copies", minCard: 1, maxCard: Infinity,
                 selectionRangeFilter: bc => bc.status === BookCopyStatusEL.LENDED}
}
// menu item text and UI title
BookReturn.activityPhrase = "Take back books";

// collect classes in a map
bUSINESSaCTIVITY.classes["BookReturn"] = BookReturn;

export default BookReturn;