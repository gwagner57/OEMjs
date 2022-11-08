/**
 * Object type AnswerOption
 * @class
 */
qz.AnswerOption = new cLASS({
  Name: "AnswerOption",
  isComplexDatatype: true,
  properties: {
    "answerText": {range:"NonEmptyString"},
    "answerTextItemNo": {range:"PositiveInteger", optional: true},
    "isCorrect": {range:"Boolean"}
  }
});
