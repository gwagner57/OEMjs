/**
 * @fileOverview  Import classes and framework code modules, create the app object and define test data
 * @author Gerd Wagner
 */
// import Business Object classes
import Author from "./Author.mjs";
import Publisher from "./Publisher.mjs";
import Book from "./Book.mjs";
// import framework code files
import sTORAGEmANAGER from "../../../src/storage/sTORAGEmANAGER.mjs";
import bUSINESSaPP from "../../../src/bUSINESSaPP.mjs";

const app = new bUSINESSaPP({title:"OEMjs Association App",
            storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"AssApp",
                createLog: true, validateBeforeSave: true})
});
app.setup();

Publisher.testData = [{name:"Bantam Books", address:"New York, USA"},
    {name:"Basic Books", address:"New York, USA"}];
Author.testData = [{authorId: 1, name:"Daniel Dennett"},
  {authorId: 2, name:"Douglas Hofstadter"}, {authorId: 3, name:"Immanuel Kant"}];
Book.testData = [
  {isbn:"0553345842", title:"The Mind's I", year: 1982, authors:[1,2], publisher:"Bantam Books"},
  {isbn:"1463794762", title:"The Critique of Pure Reason",year: 2011, authors:[3]},
  {isbn: "1928565379", title: "The Critique of Practical Reason", year: 2009, authors:[3]},
  {isbn: "0465030793", title: "I Am A Strange Loop", year: 2000, authors:[2], publisher:"Basic Books"}
];

export default app;
