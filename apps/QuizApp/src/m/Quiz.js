/**
 * Object type Quiz
 * @class
 */
qz.Quiz = new cLASS({
  Name: "Quiz",
  tableName: "quizzes",  // irregular plural form
  properties: {
    "id": {range:"AutoIdNumber", label:"Quiz ID"},
    "title": {range:"NonEmptyString"},
    "titleTextItemNo": {range:"PositiveInteger", optional: true},
    "questions": {range:"Question", maxCard: Infinity, ordered: true}
  }
});
qz.Quiz.idCounter = 0;