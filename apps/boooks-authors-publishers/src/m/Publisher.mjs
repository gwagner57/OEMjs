/**
 * Model class Publisher
 * @class
 */
import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";

class Publisher extends bUSINESSoBJECT {
  constructor ({name, address}) {
    super( name);
    this.address = address;
  }
}
Publisher.properties = {
  "name": {range:"NonEmptyString", isIdAttribute: true, label:"Name", min: 2, max: 20},
  "address": {range:"NonEmptyString", label:"Address", min: 5, max: 50}
}
Publisher.attributesToDisplayInLists = ["name","address"];
Publisher.setup();

export default Publisher;
