import bUSINESSeVENT from "../../../../src/bUSINESSeVENT.mjs";
import bUSINESSaCTIVITY from "../../../../src/bUSINESSaCTIVITY.mjs"

class BookPickupNotification extends bUSINESSeVENT {
  constructor({ id, date, duration }) {
    super({ id: id, date: date, duration: duration });
  }
}

class BookReturn extends bUSINESSaCTIVITY {
  constructor({ id, date }) {
    super({ id: id, occTime: date });
  }
}

class BookLending extends bUSINESSaCTIVITY {
  constructor({ id, date }) {
    super({ id: id, occTime: date });
  }
}

BookReturn.setup();
BookLending.setup();
BookPickupNotification.setup();


export { BookPickupNotification, BookReturn, BookLending };