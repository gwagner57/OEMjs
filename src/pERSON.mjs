import bUSINESSoBJECT from "bUSINESSoBJECT.mjs";
import {dt} from "datatypes.mjs";

/**
 * Model class Person
 * @class
 */
class pERSON extends bUSINESSoBJECT {
  constructor ({id, name, birthDate, biography, address}) {
    super( id);
    this.name = name;
    this.birthDate = birthDate;
    if (biography) this.biography = biography;
    if (address) this.address = address;
  }
}
pERSON.properties = {
  "id": {range:"AutoIdNumber", isIdAttribute: true, label:"Person ID"},
  "name": {range:"NonEmptyString", min: 2, max: 20, label:"Name"},
  "birthDate": {range:"Date", label:"Date of birth"},
  "biography": {range:"Text", label:"Biography", optional: true},
  "address": {range:"NonEmptyString", min: 10, max: 50, label:"Address", optional: true},
}
// collect business object classes in a map
dt.classes["pERSON"] = pERSON;

export default pERSON;
