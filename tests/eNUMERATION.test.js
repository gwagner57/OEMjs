import { eNUMERATION } from './../src/eNUMERATION';

describe("eNUMERATION check errors", () => {
  test("constructor error - enum name", () => {
    expect(() => new eNUMERATION(123, [])).toThrowError("The first constructor argument of an enumeration must be a string!");
  });

  test("constuctor error - non string array", () => {
    expect(() => new eNUMERATION("myEnum", [1, 2, 3])).toThrowError("A list of enumeration labels as the second " +
      "constructor argument must be an array of strings!");
  });

  test("constructor error - argument object not strings", () => {
    expect(() => new eNUMERATION("myEnum", { "first": "1", secound: 2 })).toThrowError("All values of a code list map must be strings!");
  });

  const fun = function () { };

  test("constructor error - Invalid arguments", () => {
    expect(() => new eNUMERATION("myEnum", fun)).toThrowError("Invalid Enumeration constructor argument: " + fun);
  });
});

describe("eNUMMERATION check object creation", () => {
  let myEnum = new eNUMERATION("myEnum", ["first", "second", "third"]);

  test("Check size of new eNUMERATION", () => {
    expect(myEnum.MAX).toBe(3);
  });
  test("First label name", () => {
    expect(myEnum.labels[0]).toBe("first");
    expect(myEnum.labels[1]).toBe("second");
    expect(myEnum.labels[2]).toBe("third");
    expect(myEnum.labels[3]).toBeUndefined();
  })
});

describe("Testing eNUMERATION methods", () => {
  let myEnum = new eNUMERATION("myEnum", ["first", "second", "third"]);

  test("Valid index", () => {
    expect(myEnum.isValidEnumLitOrIndex(2)).toBe(true);
    expect(myEnum.isValidEnumLitOrIndex(3)).toBe(false);
    expect(myEnum.isValidEnumLitOrIndex(-1)).toBe(false);
  });

  test("Index to Name", () => {
    expect(myEnum.enumIndexesToNames([1])).toBe("first");
    expect(myEnum.enumIndexesToNames([2, 3])).toBe("second, third");
    expect(myEnum.enumIndexesToNames([2, 3, 4, 5])).toBe("second, third");
    expect(myEnum.enumIndexesToNames([-3, -2])).toBe("");
  });

  test("Error index to name", () => {
    expect(() => myEnum.enumIndexesToNames(undefined).toThrowError("The argument must be an Array!"));
  });
});