/**
 * @fileOverview  Auxiliary data management procedures
 * @author Gerd Wagner
 */
import Author from "../m/Author.mjs";
import Publisher from "../m/Publisher.mjs";
import Book from "../m/Book.mjs";
import sTORAGEmANAGER from "../../../../src/storage/sTORAGEmANAGER.mjs";
import vIEW from "../../../../src/ui/vIEW.mjs";
import {dt} from "../../../../src/datatypes.mjs";

const app = {
  title: "OEMjs Association App",
  storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"AssApp",
                  createLog: true, validateBeforeSave: true}),
  validateOnInput: false,
  createTestData: async function () {
    try {
      Publisher.instances["Bantam Books"] = new Publisher({name:"Bantam Books", address:"New York, USA"});
      Publisher.instances["Basic Books"] = new Publisher({name:"Basic Books", address:"New York, USA"});
      Author.instances["1"] = new Author({authorId: 1, name:"Daniel Dennett"});
      Author.instances["2"] = new Author({authorId: 2, name:"Douglas Hofstadter"});
      Author.instances["3"] = new Author({authorId: 3, name:"Immanuel Kant"});
      Book.instances["0553345842"] = new Book({isbn:"0553345842",
          title:"The Mind's I", year: 1982, authors:[1,2], publisher:"Bantam Books"
      });
      Book.instances["1463794762"] = new Book({isbn:"1463794762",
          title:"The Critique of Pure Reason",year: 2011, authors:[3]
      });
      Book.instances["1928565379"] = new Book({isbn: "1928565379",
        title: "The Critique of Practical Reason", year: 2009, authors:[3]
      });
      Book.instances["0465030793"] = new Book({isbn: "0465030793",
        title: "I Am A Strange Loop", year: 2000, authors:[2], publisher:"Basic Books"
      });
      await app.storageManager.createEmptyDb([Publisher,Author,Book]);
      await app.storageManager.add( Publisher, Object.values( Publisher.instances).map( p => p.toRecord()));
      await app.storageManager.add( Author, Object.values( Author.instances).map( a => a.toRecord()));
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
// Create and store CRUD views
app.crudViews = {};
for (const className of Object.keys( dt.classes)) {
  app.crudViews[className] = {};
  const modelClass = dt.classes[className];
  for (const crudCode of ["R","C","U","D"]) {
    app.crudViews[className][crudCode] = new vIEW({modelClass: modelClass, viewType: crudCode});
  }
}

export default app;
