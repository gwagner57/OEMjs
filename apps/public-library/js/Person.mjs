import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";

/**
 * Model class Person
 * @class
 */
class Person extends bUSINESSoBJECT {
  constructor ({id, name, birthDate, biography}) {
    super( id);
    this.name = name;
    if (birthDate) this.birthDate = birthDate;
    if (biography) this.biography = biography;
  }
}
Person.properties = {
  "id": {range:"AutoIdNumber", isIdAttribute: true, label:"Person ID"},
  "name": {range:"NonEmptyString", min: 2, max: 20, label:"Name"},
  "birthDate": {range:"Date", label:"Date of birth", optional: true},
  "biography": {range:"Text", label:"Biography", optional: true},
}
// collect BO classes in a map
dt.classes["Person"] = Person;

export default Person;
