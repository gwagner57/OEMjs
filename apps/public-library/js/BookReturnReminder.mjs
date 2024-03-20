import {bUSINESSoBJECT} from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";

/**
 * Business object type BookReturnReminder
 * @class
 */
class BookReturnReminder extends bUSINESSoBJECT {
  constructor ({id, dueDate, borrower, bookCopies}) {
    super( id);
    this.dueDate = dueDate;
    this.borrower = borrower;
    this.bookCopies = bookCopies;
  }
}
BookReturnReminder.properties = {
  "id": {range:"AutoIdNumber", label:"ID", isIdAttribute: true},
  "dueDate": {range:"Date", label:"Due date"},
  "borrower": {range:"Person", label:"Borrower"},
  "bookCopies": {range:"BookCopy", label:"Borrowed book copies", minCard: 1, maxCard: Infinity}
}
//BookReturnReminder.displayAttribute = "title";  // used in toShortString()
// collect classes in a map
dt.classes["BookReturnReminder"] = BookReturnReminder;

export default BookReturnReminder;