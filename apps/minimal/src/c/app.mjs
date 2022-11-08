/**
 * @fileOverview  Auxiliary data management procedures
 * @author Gerd Wagner
 */
import { BookCategoryEL, Book} from "../m/Book.mjs";
import sTORAGEmANAGER from "../../../../src/storage/sTORAGEmANAGER.mjs";

const app = {
  title: "Minimal OEMjs App",
  storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"MinApp",
                  createLog: true, validateBeforeSave: true}),
  validateOnInput: false,
  createTestData: async function () {
    try {
      Book.instances["0553345842"] = new Book({
        isbn: "0553345842",
        title: "The Mind's I",
        year: 1982,
        category: BookCategoryEL.NOVEL
      });
      Book.instances["1463794762"] = new Book({
        isbn: "1463794762",
        title: "The Critique of Pure Reason",
        year: 2011,
        category: BookCategoryEL.TEXTBOOK
      });
      Book.instances["1928565379"] = new Book({
        isbn: "1928565379",
        title: "The Critique of Practical Reason",
        year: 2009,
        category: BookCategoryEL.TEXTBOOK
      });
      Book.instances["0465030793"] = new Book({
        isbn: "0465030793",
        title: "I Am A Strange Loop",
        year: 2000,
        category: BookCategoryEL.OTHER
      });
      await app.storageManager.createEmptyDb([Book]);
      await app.storageManager.add( Book, Object.values( Book.instances).map( b => b.toRecord()));
    } catch (e) {
      console.log( `${e.constructor.name}: ${e.message}`);
    }
  },
  clearDatabase: async function () {
    if (confirm( "Do you really want to delete the entire database?")) {
      try {
        await app.storageManager.deleteDatabase();
        console.log("All data cleared.");
      } catch (e) {
        console.log( `${e.constructor.name}: ${e.message}`);
      }
    }
  }
}

export default app;
