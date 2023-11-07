import bUSINESSoBJECT from "bUSINESSoBJECT.mjs";
import {dt} from "datatypes.mjs";

/**
 * @class
 */
class aPPuSERrOLE extends bUSINESSoBJECT {
  constructor ({name, description}) {
    super( name);
    this.name = name;
    this.description = description;
  }
}
aPPuSERrOLE.properties = {
  "name": {range:"NonEmptyString", isIdAttribute: true, label:"Name"},
  "description": {range:"NonEmptyString", label:"Description"}
}
// collect business object classes in a map
dt.classes["aPPuSERrOLE"] = aPPuSERrOLE;

export default aPPuSERrOLE;
