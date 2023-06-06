/**
 * @fileOverview  Auxiliary data management procedures
 * @author Gerd Wagner
 */
import Book from "../m/Book.mjs";
import sTORAGEmANAGER from "../../../../src/storage/sTORAGEmANAGER.mjs";
import bUSINESSaPP from "../../../../src/bUSINESSaPP.mjs";

const app = new bUSINESSaPP({title:"Minimal OEMjs App",
  storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"MinApp",
    createLog: true, validateBeforeSave: true})
});
app.setup();

Book.testData = [
  {isbn:"0553345842", title:"The Mind's I", year: 1982, edition: 2, purchaseDate:"2012-05-25"},
  {isbn:"1463794762", title:"The Critique of Pure Reason", year: 2011, purchaseDate:"2018-11-12"},
  {isbn:"1928565379", title:"The Critique of Practical Reason", year: 2009, purchaseDate:"2017-02-02"},
  {isbn:"0465030793", title:"I Am A Strange Loop", year: 2000, purchaseDate:"2020-03-31"}
];

export default app;
