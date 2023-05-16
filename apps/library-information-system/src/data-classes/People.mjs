import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";

class People extends bUSINESSoBJECT {
  constructor({ id, name, birthDate }) {
    super(id);
    this.name = name;
    if (birthDate) this.birthDate = birthDate;
  }
}
People.properties = {
  "id": { range: "NonNegativeInteger", isIdAttribute: true, label: "ID" },
  "name": { range: "NonEmptyString", min: 1, max: 100, label: "Name" },
  "birthDate": { range: "Date", optional: true, label: "Birthday" }
}
People.setup();

export default People;