/**
 * @fileOverview  Auxiliary data management procedures
 * @author Gerd Wagner
 */
import { BookCategoryEL, LanguageEL, PublicationFormEL, Book} from "./Book.mjs";
import sTORAGEmANAGER from "../../../src/storage/sTORAGEmANAGER.mjs";
import bUSINESSaPP from "../../../src/bUSINESSaPP.mjs";

const app = new bUSINESSaPP({title:"OEMjs Enumeration App",
  storageManager: new sTORAGEmANAGER({adapterName:"IndexedDB", dbName:"EnumApp",
    createLog: true, validateBeforeSave: true})
});
app.setup();

Book.testData = [
  {isbn: "006251587X", title: "Weaving the Web", category: BookCategoryEL.NOVEL,
   originalLanguage: LanguageEL.EN, otherLanguages: [LanguageEL.DE, LanguageEL.FR, LanguageEL.ES],
   publicationForms: [PublicationFormEL.EPUB, PublicationFormEL.PDF]
  },
  {isbn: "0465026567", title: "Gödel, Escher, Bach", category: BookCategoryEL.OTHER,
   originalLanguage: LanguageEL.DE, otherLanguages: [LanguageEL.EN, LanguageEL.FR],
   publicationForms: [PublicationFormEL.PDF]
  },
  {isbn: "0465030793", title: "I Am A Strange Loop", category: BookCategoryEL.TEXTBOOK,
    originalLanguage: LanguageEL.EN, otherLanguages: [],
    publicationForms: [PublicationFormEL.EPUB]
  }
];

export default app;