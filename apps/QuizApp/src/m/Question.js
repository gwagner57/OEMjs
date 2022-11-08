/**
 * Enumeration
 * @enum
 */
qz.QuestionTypeEL = new eNUMERATION("QuestionTypeEL",["multiple-choice", "short-answer", "number", "gap-fill"]);

/**
 * Object type
 * @class
 */
qz.Question = new cLASS({
  Name: "Question",
  properties: {
    "id": {range:"AutoIdNumber", label:"Question ID"},
    "type": {range: "QuestionTypeEL"},
    "questionText": {range:"NonEmptyString"},
    "questionTextItemNo": {range:"PositiveInteger", optional: true},
    "category": {range: "QuestionCategory", optional: true},
    "hasManyCorrectAnswers": {range:"Boolean", optional: true},  // default: false
    "answerOptions": {range: "AnswerOption", maxCard: Infinity, minCard: 2, optional: true}
  }
});
qz.Question.idCounter = 0;