/**
 * Object type Book 
 * @class
 */
import eNUMERATION from "../../../src/eNUMERATION.mjs";
import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";

const BookCategoryEL = new eNUMERATION("BookCategoryEL", ["novel","biography","textbook","other"]);
const LanguageEL = new eNUMERATION("LanguageEL", {"en":"English","de":"German","fr":"French","es":"Spanish",
"it":"Italian","pt":"Portugese","gr":"Greek","pl":"Polish"});
const PublicationFormEL = new eNUMERATION("PublicationFormEL", ["hardcover","paperback","ePub","PDF"]);

class Book extends bUSINESSoBJECT {
  constructor ({isbn, title, category, originalLanguage, otherLanguages, publicationForms}) {
    super( isbn);
    this.title = title;
    this.category = category;
    this.publicationForms = publicationForms;
    this.originalLanguage = originalLanguage;
    this.otherLanguages = otherLanguages;
  }
}
Book.properties = {
  "isbn": {range:"String", isIdAttribute: true, label:"ISBN", fieldSize: 12, pattern:/\b\d{9}(\d|X)\b/,
    patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
  "title": {range:"NonEmptyString", label:"Title", fieldSize: 25, min: 2, max: 50},
  "category": {range: BookCategoryEL, label:"Category"},
  "publicationForms": {range: PublicationFormEL, label:"Publication forms", minCard: 1, maxCard: Infinity},
  "originalLanguage": {range: LanguageEL, label:"Original language"},
  "otherLanguages": {range: LanguageEL, label:"Other languages", maxCard: Infinity}
}
Book.displayAttribute = "title";

// collect BO classes in a map
dt.classes["Book"] = Book;

export { BookCategoryEL, LanguageEL, PublicationFormEL, Book};