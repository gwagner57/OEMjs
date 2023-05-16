import bUSINESSoBJECT from "../../../../src/bUSINESSoBJECT.mjs";

class Fee extends bUSINESSoBJECT {
  constructor({ id, amount }) {
    super({ id });
    this.amount = amount;
  }
}

Fee.properties = {
  "id": { range: "Integer", idAttribute: true, label: "ID" },
  "amount": { range: "Integer", optional: false, min: 0 }
}

Fee.setup();

export default Fee;