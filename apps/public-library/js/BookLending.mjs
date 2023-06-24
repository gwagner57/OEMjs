import bUSINESSaCTIVITY from "../../../src/bUSINESSaCTIVITY.mjs";
import {BookCopy, BookCopyStatusEL} from "./BookCopy.mjs";
import app from "./app.mjs";

/**
 * Business activity type BookLending
 * @class
 */
class BookLending extends bUSINESSaCTIVITY {
  constructor ({borrower, bookCopies}) {
    super();
    this.borrower = borrower;
    this.bookCopies = bookCopies;
  }
  onActivityEnd() {
    try {
      for (const bc of Object.values( this.bookCopies)) {
        bc.status = BookCopyStatusEL.LENDED;
        app.storageManager.update( BookCopy, bc.id, {status: bc.status});
      }
    } catch (e) {
      console.error( e);
    }
  }
}
BookLending.properties = {
  "borrower": {range:"Person", label:"Borrower"},
  "bookCopies": {range:"BookCopy", label:"Lended book copies", minCard: 1, maxCard: Infinity,
                 selectionRangeFilter: bc => bc.status === BookCopyStatusEL.AVAILABLE}
}
// menu item text and UI title
BookLending.activityPhrase = "Lend books";

// collect classes in a map
bUSINESSaCTIVITY.classes["BookLending"] = BookLending;

export default BookLending;