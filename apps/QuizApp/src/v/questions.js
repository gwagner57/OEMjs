/**
 * @fileOverview  Contains various view functions for managing quizzes
 * @author Gerd Wagner
 */
qz.v.questions.manage = {
  /**
   * Set up the quiz data management UI
   */
  setupUserInterface: function () {
    window.addEventListener("beforeunload", qz.view.quizzes.manage.exit);
    qz.view.quizzes.manage.refreshUI();
  },
  /**
   * exit the Manage Quizs UI page
   */
  exit: function () {
    Quiz.saveAll();
  },
  /**
   * refresh the Manage Quizs UI
   */
  refreshUI: function () {
    // show the manage quiz UI and hide the other UIs
    document.getElementById("Quiz-M").style.display = "block";
    document.getElementById("Quiz-R").style.display = "none";
    document.getElementById("Quiz-C").style.display = "none";
    document.getElementById("Quiz-U").style.display = "none";
    document.getElementById("Quiz-D").style.display = "none";
  }
};
/**********************************************
 * Use case List Quizs
 **********************************************/
qz.v.questions.list = {
  setupUserInterface: function () {
    var tableBodyEl = document.querySelector(
        "section#Quiz-R>table>tbody");
    var i=0, row=null, quiz=null, listEl=null,
        keys = Object.keys( Quiz.instances);
    tableBodyEl.innerHTML = "";  // drop old contents
    for (i=0; i < keys.length; i++) {
      quiz = Quiz.instances[keys[i]];
      row = tableBodyEl.insertRow(-1);
      row.insertCell(-1).textContent = quiz.isbn;
      row.insertCell(-1).textContent = quiz.title;
      row.insertCell(-1).textContent = quiz.year;
      // create list of authors
      listEl = util.createListFromMap( quiz.authors, "name");
      row.insertCell(-1).appendChild( listEl);
      row.insertCell(-1).textContent =
          quiz.publisher ? quiz.publisher.name : "";
    }
    document.getElementById("Quiz-M").style.display = "none";
    document.getElementById("Quiz-R").style.display = "block";
  }
};
/**********************************************
 * Use case Create Quiz
 **********************************************/
qz.v.quizzes.create = {
  /**
   * initialize the quizzes.create form
   */
  setupUserInterface: function () {
    var formEl = document.querySelector("section#Quiz-C > form"),
        authorsSelectEl = formEl.selectAuthors,
        publisherSelectEl = formEl.selectPublisher,
        submitButton = formEl.commit;
    // add event listeners for responsive validation
    formEl.isbn.addEventListener("input", function () {
      formEl.isbn.setCustomValidity(
          Quiz.checkIsbnAsId( formEl.isbn.value).message);
    });
    /* MISSING CODE: add event listeners for responsive validation
	   on new user input with Quiz.checkTitle and Quiz.checkYear
    */
    // set up the authors selection list (or association list widget)
    util.fillSelectWithOptions( authorsSelectEl, Author.instances, "authorId",
        {displayProp:"name"});
    // set up the publisher selection list
    util.fillSelectWithOptions( publisherSelectEl, Publisher.instances, "name");
    // define event handler for submitButton click events
    submitButton.addEventListener("click", this.handleSubmitButtonClickEvent);
    // define event handler for neutralizing the submit event
    formEl.addEventListener( 'submit', function (e) {
      e.preventDefault();
      formEl.reset();
    });
    // replace the Quiz-M form with the createQuiz form
    document.getElementById("Quiz-M").style.display = "none";
    document.getElementById("Quiz-C").style.display = "block";
    formEl.reset();
  },
  handleSubmitButtonClickEvent: function () {
    var i=0, formEl = document.querySelector("section#Quiz-C > form"),
        selectedAuthorsOptions = formEl.selectAuthors.selectedOptions;
    var slots = {
      isbn: formEl.isbn.value,
      title: formEl.title.value,
      year: formEl.year.value,
      authorsIdRef: [],
      publisherIdRef: formEl.selectPublisher.value
    };
    // check all input fields and show error messages
    formEl.isbn.setCustomValidity( Quiz.checkIsbnAsId( slots.isbn).message);
    /*MISSING CODE: do the same with Quiz.checkTitle and Quiz.checkYear */
    // save the input data only if all of the form fields are valid
    if (formEl.checkValidity()) {
      // construct the list of author ID references from the association list
      for (i=0; i < selectedAuthorsOptions.length; i++) {
        slots.authorsIdRef.push( selectedAuthorsOptions[i].value);
      }
      // alternative code using array.map
      /*
      slots.authorsIdRef = selectedAuthorsOptions.map( function (optionEl) {
        return optionEl.value;
      });
      */
      Quiz.add( slots);
    }
  }
};
/**********************************************
 * Use case Update Quiz
 **********************************************/
qz.v.quizzes.update = {
  /**
   * Initialize the update quizzes UI/form. Notice that the Association List
   * Widget for associated authors is left empty initially.
   * It is only set up on quiz selection
   */
  setupUserInterface: function () {
    var formEl = document.querySelector("section#Quiz-U > form"),
        quizSelectEl = formEl.selectQuiz,
        publisherSelectEl = formEl.selectPublisher,
        submitButton = formEl.commit;
    // set up the quiz selection list
    util.fillSelectWithOptions( quizSelectEl, Quiz.instances,
        "isbn", {displayProp:"title"});
    quizSelectEl.addEventListener("change", this.handleQuizSelectChangeEvent);
    /* MISSING CODE: add event listeners for responsive validation
	   on new user input with Quiz.checkTitle and Quiz.checkYear
    */
    // set up the associated publisher selection list
    util.fillSelectWithOptions( publisherSelectEl, Publisher.instances, "name");
    // define event handler for submitButton click events
    submitButton.addEventListener("click", this.handleSubmitButtonClickEvent);
    // define event handler for neutralizing the submit event and reseting the form
    formEl.addEventListener( 'submit', function (e) {
      var authorsSelWidget = document.querySelector(
          "section#Quiz-U > form .MultiSelectionWidget");
      e.preventDefault();
      authorsSelWidget.innerHTML = "";
      formEl.reset();
    });
    document.getElementById("Quiz-M").style.display = "none";
    document.getElementById("Quiz-U").style.display = "block";
    formEl.reset();
  },
  /**
   * handle quiz selection events: when a quiz is selected,
   * populate the form with the data of the selected quiz
   */
  handleQuizSelectChangeEvent: function () {
    var formEl = document.querySelector("section#Quiz-U > form"),
        authorsSelWidget = formEl.querySelector(".MultiSelectionWidget"),
        key = formEl.selectQuiz.value,
        quiz=null;
    if (key !== "") {
      quiz = Quiz.instances[key];
      formEl.isbn.value = quiz.isbn;
      formEl.title.value = quiz.title;
      formEl.year.value = quiz.year;
      // set up the associated authors selection widget
      util.createMultiSelectionWidget( authorsSelWidget, quiz.authors,
          Author.instances, "authorId", "name");
      // assign associated publisher to index of select element
      formEl.selectPublisher.selectedIndex =
          (quiz.publisher) ? quiz.publisher.index : 0;
    } else {
      formEl.reset();
      formEl.selectPublisher.selectedIndex = 0;
    }
  },
  /**
   * handle form submission events
   */
  handleSubmitButtonClickEvent: function () {
    var assocAuthorListItemEl=null, authorsIdRefToRemove=[],
        authorsIdRefToAdd=[], i=0,
        formEl = document.querySelector("section#Quiz-U > form"),
        authorsSelWidget = formEl.querySelector(".MultiSelectionWidget"),
        authorsAssocListEl = authorsSelWidget.firstElementChild;
    var slots = { isbn: formEl.isbn.value,
      title: formEl.title.value,
      year: formEl.year.value,
      publisherIdRef: formEl.selectPublisher.value
    };
    // check all input fields and show error messages
    /*MISSING CODE:  Quiz.checkIsbn, Quiz.checkTitle and Quiz.checkYear
     *               have not been defined
    formEl.isbn.setCustomValidity( Quiz.checkIsbn( slots.isbn).message);
    formEl.title.setCustomValidity( Quiz.checkTitle( slots.title).message);
    formEl.year.setCustomValidity( Quiz.checkYear( slots.year).message);
    */
    // commit the update only if all of the form fields values are valid
    if (formEl.checkValidity()) {
      // construct authorsIdRef-ToAdd/ToRemove lists from the association list
      for (i=0; i < authorsAssocListEl.children.length; i++) {
        assocAuthorListItemEl = authorsAssocListEl.children[i];
        if (assocAuthorListItemEl.classList.contains("removed")) {
          authorsIdRefToRemove.push( assocAuthorListItemEl.getAttribute("data-value"));
        }
        if (assocAuthorListItemEl.classList.contains("added")) {
          authorsIdRefToAdd.push( assocAuthorListItemEl.getAttribute("data-value"));
        }
      }
      // if the add/remove list is non-empty create a corresponding slot
      if (authorsIdRefToRemove.length > 0) {
        slots.authorsIdRefToRemove = authorsIdRefToRemove;
      }
      if (authorsIdRefToAdd.length > 0) {
        slots.authorsIdRefToAdd = authorsIdRefToAdd;
      }
      Quiz.update( slots);
    }
  }
};
/**********************************************
 * Use case Delete Quiz
 **********************************************/
qz.v.quizzes.destroy = {
  /**
   * initialize the quizzes.destroy form
   */
  setupUserInterface: function () {
    var formEl = document.querySelector("section#Quiz-D > form");
    var quizSelectEl = formEl.selectQuiz;
    var deleteButton = formEl.commit;
    // set up the quiz selection list
    util.fillSelectWithOptions( quizSelectEl, Quiz.instances, "isbn", {displayProp:"title"});
    deleteButton.addEventListener("click", function () {
      var formEl = document.querySelector("section#Quiz-D > form");
      Quiz.destroy( formEl.selectQuiz.value);
      // remove deleted quiz from select options
      formEl.selectQuiz.remove( formEl.selectQuiz.selectedIndex);
      formEl.reset();
    });
    document.getElementById("Quiz-M").style.display = "none";
    document.getElementById("Quiz-D").style.display = "block";
    formEl.reset();
  }
};