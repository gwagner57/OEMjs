
/*Test IsoLanguageCodeEL*/
console.log(IsoLanguageCodeEL.codeList["EN"]);


/*Text TextItem*/
let textItem = new TextItem({
  id: 1,
  language: IsoLanguageCodeEL.codeList["EN"],
  text: "How old are you?"
});
let textItem1 = new TextItem({
  id: 2,
  language: IsoLanguageCodeEL.codeList["FR"],
  text: "Quel âge avez-vous?"
});
console.log(textItem);

/*Test AnswerOption*/

let answer = new AnswerOption({
  answerTextItem: textItem,
  isCorrect: false
})

let answer1 = new AnswerOption({
  answerTextItem: textItem1,
  isCorrect: false
})

console.log(answer);

/*Test QuestionTypeEL*/
console.log(QuestionTypeEL.labels[0]);


/*Test QuestionCategory*/
let qC = new QuestionCategory({
  name: "Personal Infos",
  description: "Description1"
})

console.log(qC);


/*Test Questions*/
console.log("haha");
let q = new Question({
      id: 1,
      type: QuestionTypeEL.labels[0],
      questionTextItem: "How old are you?",
      hasManyCorrectAnswers: false,
      answerOptions: [answer, answer1]
    }),
    q1 = new Question({
      id: 2,
      type: QuestionTypeEL.labels[3],
      questionTextItem: "How are you?",
      hasManyCorrectAnswers: false,
      answerOptions: [answer1, answer]
    });
let questions = [q,q1];
console.log(questions);


/*Test Quiz*/

let quiz = new Quiz({
  id: 1,
  titleTextItem: "Personal infos",
  questions: questions
})