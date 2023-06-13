/**
 * Model class Author 
 * @class
 */
import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";

class Author extends bUSINESSoBJECT {
  constructor ({authorId, name}) {
    super( authorId);
    this.name = name;
  }
}
Author.properties = {
  "authorId": {range:"NonNegativeInteger", isIdAttribute: true, label:"Author ID"},
  "name": {range:"NonEmptyString", min: 2, max: 20, label:"Name"}
}
// register class
dt.classes["Author"] = Author;

export default Author;
