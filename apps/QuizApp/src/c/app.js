/**
 * @fileOverview  App-level controller code
 * @author Gerd Wagner
 */
// main namespace and subnamespace definitions
var qz = {
    m: {},
    v: { quizzes:{}, questions:{}},
    c: { quizzes:{}, questions:{}}
};
qz.c.app = {
  name: "Quiz",
  validateOnInput: false,
  initialize: function() {
    qz.c.quizzes.manage.initialize();
  },
  loadAppData: function () {
    var t1=null, t2=null, t3=null, t4=null, t5=null, t6=null, t7=null, t8=null, t9=null, t10=null,
        q1=null, q2=null,
        newObj=null;

    /**************************
     Create Question Categories
     **************************/
    newObj = new qz.QuestionCategory({name:"HTML"});
    newObj = new qz.QuestionCategory({name:"CSS"});
    newObj = new qz.QuestionCategory({name:"JavaScript"});

    /**************************
     Create Question
     **************************/
    try {
      t1 = new qz.TextItem({textItemNo: 1, language: qz.IsoLanguageCodeEL.DE, text:"Welche der folgenden Bild-Dateiformate " +
        "verwenden einen verlustfreien Kompressions-Algorithmus?"});
    } catch (e) {
      if (e instanceof ConstraintViolation) {
        console.log( e.constructor.name +": "+ e.message);
      } else console.log( e);
    }
    try {
      q1 = new qz.Question({ type: qz.QuestionTypeEL.MULTIPLE_CHOICE, hasManyCorrectAnswers: true, category:"HTML",
        questionText:"Which of the following image file formats use a lossless compression algorithm?", questionTextItemNo: 1,
        answerOptions: [ {answerText:"TIFF", isCorrect: true},
          {answerText:"PNG", isCorrect: true},
          {answerText:"JPEG", isCorrect: false},
          {answerText:"GIF", isCorrect: false}
        ]
      });
    } catch (e) {
      if (e instanceof ConstraintViolation) {
        console.log( e.constructor.name +": "+ e.message);
      } else console.log( e);
    }
    if (q1) console.log("Question "+ q1.id +" created.");

    /*************************
     Create Question
     *************************/
    try {
      t1 = new qz.TextItem({textItemNo: 2, language: qz.IsoLanguageCodeEL.DE, text:"Was wird durch das &lt;ol>-Element ausgezeichnet?"});
      t2 = new qz.TextItem({textItemNo: 3, language: qz.IsoLanguageCodeEL.DE, text:"<p>Eine offene Liste, wie</p>" +
        "<ul style='list-style-type:circle'><li>bla</li><li>blabla</li><li>...</li></ul>"});
      t3 = new qz.TextItem({textItemNo: 4, language: qz.IsoLanguageCodeEL.DE, text:"<p>Eine Spiegelstrichliste, wie</p>" +
        "<ul style='list-style-type:&quot;- &quot;'><li>bla</li><li>blabla</li><li>...</li></ul>"});
      t4 = new qz.TextItem({textItemNo: 5, language: qz.IsoLanguageCodeEL.DE, text:"<p>Eine einfache Liste, wie</p>" +
        "<p>bla, blabla, blablabla, ...</p>"});
      t5 = new qz.TextItem({textItemNo: 6, language: qz.IsoLanguageCodeEL.DE, text:"<p>Eine numerierte Aufzählungsliste, wie</p>" +
        "<ol><li>bla</li><li>blabla</li><li>...</li></ol>"});
    } catch (e) {
      if (e instanceof ConstraintViolation) {
        console.log( e.constructor.name +": "+ e.message);
      } else console.log( e);
    }
    try {
      q2 = new qz.Question({ type: qz.QuestionTypeEL.MULTIPLE_CHOICE, hasManyCorrectAnswers: false, category:"HTML",
        questionText:"What does the &lt;ol> element mark up?", questionTextItemNo: 2,
        answerOptions: [
          {answerText: "<p>An enumerated list, like</p><ol><li>bla</li><li>blabla</li><li>...</li></ol>",
              answerTextItemNo: 6, isCorrect: true},
          {answerText: "<p>An open list, like</p><ul style='list-style-type:circle'><li>bla</li><li>blabla</li><li>...</li></ul>",
              answerTextItemNo: 3, isCorrect: false},
          {answerText: "<p>An itemized list, like</p><ul style='list-style-type:&quot;- &quot;'><li>bla</li><li>blabla</li><li>...</li></ul>",
              answerTextItemNo: 4, isCorrect: false},
          {answerText: "<p>An ordinary (basic) list, like</p><p>bla, blabla, blabla, ...</p>",
              answerTextItemNo: 5, isCorrect: false}
        ]
      });
    } catch (e) {
      if (e instanceof ConstraintViolation) {
        console.log( e.constructor.name +": "+ e.message);
      } else console.log( e);
    }
    if (q2) console.log("Question "+ q2.id +" created.");

    /*************************
     Create Quiz
     *************************/
    t1 = new qz.TextItem({textItemNo: 7, language: qz.IsoLanguageCodeEL.DE, text: "Teste Deine HTML-Kenntnisse"});
    newObj = new qz.Quiz({title: "Test Your Knowledge of HTML", titleTextItemNo: 7, questions: [q1, q2]});
  }
};
