import bUSINESSoBJECT from "bUSINESSoBJECT.mjs";
import {dt} from "datatypes.mjs";

/**
 * @class
 */
class aPPuSER extends bUSINESSoBJECT {
  constructor ({id, appUserRoles=[], person}) {
    super( id);
    this.appUserRoles = appUserRoles;
    if (person) this.person = person;  // a user may be linked to a person
  }
}
aPPuSER.properties = {
  "id": {range:"NonEmptyString", isIdAttribute: true, label:"App user ID", min:4},
  "appUserRoles": {range:"aPPuSERrOLE", label:"App user roles", minCard: 0, maxCard: Infinity},
  "person": {range:"pERSON", label:"Person", optional: true}
}
// collect business object classes in a map
dt.classes["aPPuSER"] = aPPuSER;

export default aPPuSER;
