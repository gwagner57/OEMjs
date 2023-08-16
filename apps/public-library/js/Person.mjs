import bUSINESSoBJECT from "../../../src/bUSINESSoBJECT.mjs";
import {dt} from "../../../src/datatypes.mjs";
import eNUMERATION from "../../../src/eNUMERATION.mjs";

const PersonRoleEL = new eNUMERATION("PersonRoleEL", ["library user","app user"]);

/**
 * Model class Person
 * @class
 */
class Person extends bUSINESSoBJECT {
  constructor ({id, name, birthDate, biography, roles=[], libraryUserId, address}) {
    super( id);
    this.name = name;
    this.birthDate = birthDate;
    if (biography) this.biography = biography;
    this.roles = roles;
    if (libraryUserId) this.libraryUserId = libraryUserId;
    if (address) this.address = address;
  }
}
Person.properties = {
  "id": {range:"AutoIdNumber", isIdAttribute: true, label:"Person ID"},
  "name": {range:"NonEmptyString", min: 2, max: 20, label:"Name"},
  "birthDate": {range:"Date", label:"Date of birth"},
  "biography": {range:"Text", label:"Biography", optional: true},
  "roles": {range: PersonRoleEL, label:"Roles", minCard: 0, maxCard: Infinity},
  "libraryUserId": {range:"PositiveInteger", label:"Library user ID", isUnique: true, optional: true},
  "address": {range:"NonEmptyString", min: 10, max: 50, label:"Address", optional: true},
}
// collect business object classes in a map
dt.classes["Person"] = Person;

export default Person;
