import bUSINESSaCTIVITY from "../../../src/bUSINESSaCTIVITY.mjs";
import {BookCopy, BookCopyStatusEL} from "./BookCopy.mjs";
import app from "./app.mjs";

/**
 * Business activity type BookLending
 * @class
 */
class BookTakeBack extends bUSINESSaCTIVITY {
  constructor ({returner, bookCopies}) {
    super();
    this.returner = returner;
    this.bookCopies = bookCopies;
  }
  onActivityEnd() {
    for (const bc of this.bookCopies) {
      bc.status = BookCopyStatusEL.AVAILABLE;
      app.storageManager.update( BookCopy, bc.id, {status: bc.status});
    }
  }
}
BookTakeBack.properties = {
  "returner": {range:"Person", label:"Returner"},
  "bookCopies": {range:"BookCopy", label:"Returned book copies", minCard: 1, maxCard: Infinity,
                 selectionRangeFilter: bc => bc.status === BookCopyStatusEL.LENDED}
}
// menu item text and UI title
BookTakeBack.activityPhrase = "Take back books";

// collect classes in a map
bUSINESSaCTIVITY.classes["BookTakeBack"] = BookTakeBack;

export default BookTakeBack;