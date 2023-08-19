import bUSINESSaCTIVITY from "../../../src/bUSINESSaCTIVITY.mjs";
import {BookCopy, BookCopyStatusEL} from "./BookCopy.mjs";
import BookReturnReminder from "./BookReturnReminder.mjs";
import app from "./app.mjs";

/**
 * Business activity type BookLending
 * @class
 */
class BookLending extends bUSINESSaCTIVITY {
  constructor ({date, borrower, bookCopies}) {
    super();
    this.date = date;  // derived
    this.borrower = borrower;
    this.bookCopies = bookCopies;
  }
  onActivityEnd() {
    try {
      for (const bc of Object.values( this.bookCopies)) {
        bc.status = BookCopyStatusEL.LENDED;
        app.storageManager.update( BookCopy, bc.id, {status: bc.status});
      }
      const brr = new BookReturnReminder({
          dueDate: new Date( this.date.getTime() + app.lendingPeriod * 24 * 60 * 60 * 1000),  // days to milliseconds
          borrower: this.borrower,
          bookCopies: this.bookCopies});
      app.storageManager.add( BookReturnReminder, brr);
    } catch (e) {
      console.error(`${e.constructor.name}: ${e.message}`);
    }
  }
}
BookLending.properties = {
  "date": {range:"Date", label:"Date",
      derivationExpression: () => new Date((new Date()).toDateString())},  // truncate time
  "borrower": {range:"Person", selectionRangeFilter: p => p.roles && p.roles.includes(1), label:"Borrower"},
  "bookCopies": {range:"BookCopy", label:"Lended book copies", minCard: 1, maxCard: Infinity,
                 selectionRangeFilter: bc => bc.status === BookCopyStatusEL.AVAILABLE}
}
// menu item text and UI title
BookLending.activityPhrase = "Lend books";

// collect classes in a map
bUSINESSaCTIVITY.classes["BookLending"] = BookLending;

export default BookLending;