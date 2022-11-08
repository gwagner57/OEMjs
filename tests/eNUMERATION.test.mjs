import eNUMERATION from "./../src/eNUMERATION.mjs";
import { expect } from "chai";

describe("eNUMERATION tests", () => {
  describe("check errors", () => {
    it("constructor error - enum name", () => {
      expect(() => new eNUMERATION(123, [])).to.throw(Error, 'The first constructor argument of an enumeration must be a string!');
    });

    it("constuctor error - non string array", () => {
      expect(() => new eNUMERATION("myEnum", [1, 2, 3])).to.throw(Error, 'A list of enumeration labels as the second constructor argument must be an array of strings!');
    });

    it("constructor error - argument object not strings", () => {
      expect(() => new eNUMERATION("myEnum", { "first": "1", secound: 2 })).to.throw(Error, 'All values of a code list map must be strings!');
    });

    const fun = function () { };

    it("constructor error - Invalid arguments", () => {
      expect(() => new eNUMERATION("myEnum", fun)).to.throw(Error, 'Invalid Enumeration constructor argument: ' + fun);
    });
  });

  describe("check object creation", () => {
    let myEnum = new eNUMERATION("myEnum", ["first", "second", "third"]);

    it("Check size of new eNUMERATION", () => {
      expect(myEnum.MAX).to.equal(3);
    });
    it("First label name", () => {
      expect(myEnum.labels[0]).to.equal("first");
      expect(myEnum.labels[1]).to.equal("second");
      expect(myEnum.labels[2]).to.equal("third");
      expect(myEnum.labels[3]).to.be.undefined;
    })
  });

  describe("Testing eNUMERATION methods", () => {
    let myEnum = new eNUMERATION("myEnum", ["first", "second", "third"]);

    it("Valid index", () => {
      expect(myEnum.isValidEnumLitOrIndex(2)).to.be.true;
      expect(myEnum.isValidEnumLitOrIndex(3)).to.be.false;
      expect(myEnum.isValidEnumLitOrIndex(-1)).to.be.false;
    });

    it("Index to Name", () => {
      expect(myEnum.enumIndexesToNames([1])).to.equal("first");
      expect(myEnum.enumIndexesToNames([2, 3])).to.be.equal("second, third");
      expect(myEnum.enumIndexesToNames([2, 3, 4, 5])).to.be.equal("second, third");
      expect(myEnum.enumIndexesToNames([-3, -2])).to.be.empty;
    });

    it("Error index to name", () => {
      expect(() => myEnum.enumIndexesToNames(undefined).to.throw(Error, "The argument must be an Array!"));
    });
  });
});