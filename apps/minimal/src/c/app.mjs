/**
 * @fileOverview  Auxiliary data management procedures
 * @author Gerd Wagner
 */
import { BookCategoryEL, Book} from "../m/Book.mjs";
import sTORAGEmANAGER from "../../../../src/storage/sTORAGEmANAGER.mjs";
import bUSINESSaPP from "../../../../src/bUSINESSaPP.mjs";

const app = new bUSINESSaPP({title:"Minimal OEMjs App",
  storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"MinApp",
    createLog: true, validateBeforeSave: true})
});
app.setup();

Book.testData = [
  {isbn:"0553345842", title:"The Mind's I", year: 1982, category: BookCategoryEL.NOVEL, edition: 2},
  {isbn:"1463794762", title:"The Critique of Pure Reason", year: 2011, category: BookCategoryEL.TEXTBOOK},
  {isbn:"1928565379", title:"The Critique of Practical Reason", year: 2009, category: BookCategoryEL.TEXTBOOK},
  {isbn:"0465030793", title:"I Am A Strange Loop", year: 2000, category: BookCategoryEL.OTHER}
];

export default app;
