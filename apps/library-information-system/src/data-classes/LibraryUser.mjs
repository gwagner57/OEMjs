import People from "./People.mjs";
import Fee from "./Fee.mjs";

class LibraryUser extends People {
  constructor({ userId, name, birthDate, address, fee }) {
    super({ id: userId, name: name, birthDate: birthDate });
    this.address = address;
    if (fee) this.fee = fee;
  }
}

LibraryUser.properties = {
  "userId": { range: "Integer", optional: false, label: "User ID" },
  "name": { range: "NonEmptyString", optional: false, label: "Name" },
  "address": { range: "NonEmptyString", optional: false, label: "Address", min: 3, max: 100 },
  "fee": { range: "Fee", optional: true, label: "Fee", min: 1, max: 1 },
}
LibraryUser.setup();

export default LibraryUser;
