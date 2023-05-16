import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";

class Publisher extends bUSINESSoBJECT {
  constructor ({name, address}) {
    super( name);
    this.address = address;
  }
}
Publisher.properties = {
  "name": {range:"NonEmptyString", isIdAttribute: true, label:"Name", min: 3, max: 100},
  "address": {range:"NonEmptyString", label:"Address", min: 3, max: 100}
}
// Publisher.attributesToDisplayInLists = ["name","address"];
Publisher.setup();

export default Publisher;
