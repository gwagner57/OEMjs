import People from "./People.mjs";

class Author extends People {
  constructor({ authorId, name, birthDate, bibliography }) {
    super(authorId);
    this.name = name;
    if (birthDate) this.birthDate = birthDate;
    if (bibliography) this.bibliography = bibliography;
  }
}
Author.properties = {
  "bibliography": { range: "lIST", optional: true, label: "Bibliography"}
}
Author.setup();

export default Author;
