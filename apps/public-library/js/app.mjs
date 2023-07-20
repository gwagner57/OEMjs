/**
 * @fileOverview  Import classes and framework code modules, create the app object and define test data
 * @author Gerd Wagner
 */
// import the app's model classes (object types and activity types)
import Person from "./Person.mjs";
import Publisher from "./Publisher.mjs";
import Book from "./Book.mjs";
import {BookCopy, BookCopyStatusEL} from "./BookCopy.mjs";
import BookReturnReminder from "./BookReturnReminder.mjs";
import BookLending from "./BookLending.mjs";
import BookReturn from "./BookReturn.mjs";

// import framework code files
import sTORAGEmANAGER from "../../../src/storage/sTORAGEmANAGER.mjs";
import bUSINESSaPP from "../../../src/bUSINESSaPP.mjs";

const app = new bUSINESSaPP({title:"OEMjs Public Library App",
            storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"PublicLibrary",
                createLog: true, validateBeforeSave: true})
});
// app parameter
app.lendingPeriod = 28;  // days

app.testData = [
  {"Publisher": [{name:"Bantam Books", address:"New York, USA"},
      {name:"Basic Books", address:"New York, USA"}]},
  {"Person": [{id: 1, name:"Daniel Dennett", birthDate:"1943-03-28"},
      {id: 2, name:"Douglas Hofstadter", birthDate:"1945-02-15"},
      {id: 3, name:"Immanuel Kant", birthDate:"1724-04-22"}]},
  {"Book": [
      {isbn:"0553345842", title:"The Mind's I", year: 1982, authors:[1,2], publisher:"Bantam Books"},
      {isbn:"1463794762", title:"The Critique of Pure Reason",year: 2011, authors:[3]},
      {isbn:"1928565379", title:"The Critique of Practical Reason", year: 2009, authors:[3]},
      {isbn:"0465030793", title:"I Am A Strange Loop", year: 2000, authors:[2], publisher:"Basic Books"}
    ]},
  {"BookCopy": [
      {id:1, book:"0553345842", status: BookCopyStatusEL.AVAILABLE},
      {id:2, book:"0553345842", status: BookCopyStatusEL.AVAILABLE},
      {id:3, book:"1463794762", status: BookCopyStatusEL.AVAILABLE},
      {id:4, book:"1463794762", status: BookCopyStatusEL.AVAILABLE},
      {id:5, book:"1463794762", status: BookCopyStatusEL.AVAILABLE},
      {id:6, book:"1928565379", status: BookCopyStatusEL.AVAILABLE},
    ]}
];

app.setup();

export default app;
