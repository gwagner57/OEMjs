/**
 * @fileOverview  This file contains the definition of the meta-class vIEW.
 * @author Gerd Wagner
 * @copyright Copyright 2015 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
/**
 * Meta-class for creating view classes (based on model classes), with fields, 
 * normally bound to model class properties, and methods, typically implementing
 * user actions and possibly bound to model class methods.
 *
 * A view may have a field order definition and field group definitions 
 * in the constructor parameter "fields", which is processed into a "fields" map 
 * of field definition records and a field order definition list "fieldOrder".
 * The constructor parameter "fields" may contain additional fields not based 
 * on model properties. When a view class is created without a "fields" argument, 
 * the view fields are generated from the labeled properties of the underlying 
 * model class(es).
 * 
 * Each model class Xyz has a data management view class XyzView, which is 
 * stored in the map entry vIEW.classes["XyzView"]. Such a view class has
 * four standard instances, each of them identified by one of the characters 
 * "C", "R", "U" and "D", corresponding to the four CRUD operations.
 * 
 * A view is created (as an instance of a view class) with a specific mode 
 * (often corresponding to a CRUD operation). A view is a logical representation 
 * of the interaction elements of a data management UI, which in most cases 
 * correspond to properties and methods of a model class. It consists of fields 
 * (as defined by its view class) and of user action types, which are either 
 * pre-defined (like "back", "createRecord", "setViewModelObject", updateRecord"
 * and "deleteRecord") or developer-defined. 
 * 
 * A view field has an I/O mode of either "I/O" (input/output), "O" or "I". 
 * When a view is rendered, view fields are rendered as UI elements in the 
 * following way:
 * 
 * 1) ordinary fields as form (input/output) fields, 
 * 2) Boolean fields as HTML checkbox elements, 
 * 3) enumeration and reference fields as choice widgets (radio button groups or 
 *    checkbox groups, HTML select elements or other selection list widgets)
 *    
 * or as any HTML element that allows for text content, or to special UI widgets 
 * (such as calendar date selection widgets or color pickers). User actions are 
 * exposed in the form of HTML buttons and to other actionable (e.g. clickable) 
 * HTML elements.
 * 
 * The UI DOM structure of a view is rendered by the view.render method once 
 * at app startup time, while its input/output fields are filled by the 
 * mODELvIEW.refreshUI method at runtime.  
 * 
 * A user action type is a named JS function where the name indicates the intended 
 * meaning of the user action (such as "save"). It binds a user interface event type, such as 
 * clicking on a button, to a view method as its "event handler".

 * TODO: When a view field is bound to a model class property and its view is  
 * bound to a model object, the value of the corresponding form field is updated 
 * whenever the corresponding property value of the model object is updated.
 * View methods may be bound as handlers to an event type in a view.
 * 
 * A view can be rendered in different ways:
 * 1) By creating all required DOM elements (form elements with controls), and 
 *    appending them to the child elements of the body element, if the document
 *    does not contain suitable form elements. 
 * 2) By accessing existing form elements and controls, just setting/updating their
 *    contents (and dynamic parts)  
 * 
 * @class
 */
import dt from "../datatypes.mjs";
import bUSINESSoBJECT from "../bUSINESSoBJECT.mjs";
import dom from "../../lib/dom.mjs";


class vIEW {
  constructor({modelClass, modelClasses, fields, methods, validateOnInput}) {
    var properties = {};
    if (!(Object.getPrototypeOf( modelClass) === bUSINESSoBJECT)) {
      throw new Error(
          "A view class must be bound to one or more model classes!");
    }
    if (modelClass) {
      this.modelClass = modelClass;
      properties = this.modelClass.properties;
      // add new view class to the "classes" map
      vIEW.classes[this.modelClass.name + "View"] = this;
      // define a property for holding all instances of the view class
      this.instances = {};
      /* process the "fields" array into a "fields" map of field definition records
       * and a field order definition array "fieldOrder" 
       */
      this.fields = {};
      this.fieldOrder = [];
      if (fields) {
        // fields is an array while this.fields is a map
        for (const el of fields) {
          var elList = [], fieldNames = [];
          if (!Array.isArray(el)) elList = [el];  // single field
          else elList = el;  // field group
          // elList is an array of property field names or field definitions
          // fldList is a corresponding array of field names
          for (const fld of elList) {
            if (typeof fld === "string") {  // property field
              if (!properties[fld]) {
                throw new Error(
                    `Property view field ${fld} does not correspond to a model property!`);
              }  // else
              this.fields[fld] = {
                label: properties[fld].label,
                range: properties[fld].range,
                inputOutputMode: "I/O"
              };
              fieldNames.push(fld);
            } else if (typeof fld === "object") {  // defined field
              this.fields[fld.name] = {
                label: fld.label,
                range: fld.range,
                inputOutputMode: fld.inputOutputMode
              };
              fieldNames.push(fld.name);
              if (elList.derivationFunction) {
                this.fields[fld.name].derivationFunction = fld.derivationFunction;
              }
              if (fld.optional) this.fields[fld.name].optional = true;
            } else {  // neither property field nor defined field
              throw new Error(
                  "Neither property field nor defined field: " + fld);
            }
          }
          if (elList.length === 1) this.fieldOrder.push(fieldNames[0]);
          else this.fieldOrder.push(fieldNames);
        }
      } else {  // no view fields provided in construction slots
        // create view fields from labeled model properties
        Object.keys(properties).forEach(function (prop, i) {
          if (properties[prop].label) {
            this.fieldOrder[this.fieldOrder.length] = Object.keys(properties)[i];
            this.fields[prop] = properties[prop];
            this.fields[prop]["inputOutputMode"] = "I/O";
          }
        }, this);
      }
    } else this.modelClasses = modelClasses;  //TODO: views based on multiple model classes
    this.maxNmrOfEnumLitForChoiceButtonRendering = 7;
    this.validateOnInput = validateOnInput ?? true;
    this.methods = methods ?? {};
  }
  /**
   * Render the DOM structure of a view
   * this = view object
   * @method 
   * @author Gerd Wagner
   */
  render() {
    var mc = this.type.modelClass,
        stdIdRange = mc.properties[mc.idAttribute].range,
        viewMode = this.viewMode,
        view = this,
        userActions = this.userActions,
        displayAttribs = mc.attributesToDisplayInLists,
        fields = this.type.fields,  // fields map
        fieldOrder = this.type.fieldOrder,  // field order array
        // a map for storing the bindings of UI elems to view fields
        dataBinding = this.dataBinding, 
        validateOnInput = this.type.validateOnInput,
        fldGrpSep = this.fieldGroupSeparator,
        maxELforButton = 
            this.type.maxNmrOfEnumLitForChoiceButtonRendering,
        uiContainerEl=null, footerEl=null, formEl=null, 
        columns=[], slots = {}, keys=[], 
        el=null, selectEl=null, rowEl=null,
        inbetween="", suffix="";
    /* ==================================================================== */
    /**
     * Create a labeled input field. When validation is not performed on input
     * it is performed on blur in the case of "Create" for catching mandatory
     * value constraint violations, and on change in the case of "Update". 
     * depends on: fields, modelClass, viewMode, view
     * @method 
     */
    function createLabeledField( fld) {
      var fldEl = null, lblEl = document.createElement("label"),
          props = mc.properties;
      if (fields[fld].inputOutputMode === "O" ||
          (viewMode === "U" && props[fld] && props[fld].isStandardId) || 
          viewMode === "D") {
        fldEl = document.createElement("output");        
      } else {
        fldEl = document.createElement("input");
        fldEl.type = "text";
        if (validateOnInput) {
          fldEl.addEventListener("input", function () {
            fldEl.setCustomValidity( mc.check( fld, fldEl.value).message);
          });                         
        } else if (viewMode === "C") {
          fldEl.addEventListener("blur", function () {
            fldEl.setCustomValidity( mc.check( fld, fldEl.value).message);
          });
        }
        fldEl.addEventListener("change", function () {
          var v = fldEl.value;
          if (!validateOnInput && viewMode === "U") {
            fldEl.setCustomValidity( mc.check( fld, v).message);
          }
          // top-down data binding
          if (fldEl.validity.valid) view[fld] = v;
        });
      }
      // store data binding assignment of UI element to view field
      dataBinding[viewMode][fld] = fldEl; 
      fldEl.name = fld;
      lblEl.textContent = fields[fld].label;
      lblEl.appendChild( fldEl);
      return lblEl;
    }
    /**
     * Create a labeled Yes/No field.
     * @method
     */
    function createLabeledYesNoField( fld) {
      var fldEl = null, lblEl = document.createElement("label"),
          decl = fields[fld];   // field declaration
      if (decl.inputOutputMode === "O") {
        fldEl = document.createElement("output");
      } else {
        fldEl = document.createElement("input");
        fldEl.type = "checkbox";
      }
      // store data binding assignment of UI element to view field
      dataBinding[fld] = fldEl;
      fldEl.name = fld;
      fldEl.checked = mo[fld];
      lblEl.textContent = fields[fld].label;
      lblEl.appendChild( fldEl);
      return lblEl;
    }
    /**
     * Create a choice control group in a container element.
     * A choice control is either an HTML radio button or an HTML checkbox.
     * @method 
     */
    function createChoiceButtonGroup( fld) {
      var j=0, btnType="", containerEl=null, el=null, choiceItems=[],
          range = fields[fld].range;
      el = document.createElement("legend");
      el.textContent = fields[fld].label;
      containerEl = document.createElement("fieldset");
      containerEl.appendChild( el);
      containerEl.setAttribute("data-bind", fld);
      // store data binding assignment of UI element to view field
      dataBinding[viewMode][fld] = containerEl; 
      // if maxCard is defined, use checkboxes
      if (mc.properties[fld].maxCard) {
        btnType = "checkbox";
        containerEl.className = "checkbox-group";
      } else {
        btnType = "radio";
        containerEl.className = "radio-button-group";
      }
      if (range instanceof eNUMERATION) {
        choiceItems = range.labels;
      } else if (Array.isArray(range)) {  // range is an ad-hoc enumeration
        choiceItems = range;
      } else {  // range is an entity type
        choiceItems = Object.keys( range.instances);
      }
      for (j=0; j < choiceItems.length; j++) {
        // button values = 1..n
        el = dom.createLabeledChoiceControl( btnType, fld, j+1, choiceItems[j]);
        containerEl.appendChild( el);
        el.firstElementChild.addEventListener("click", function (e) {
         // top-down data binding by assigning view[fld]
          var btnEl = e.target, i=0,
              val = parseInt( btnEl.value);
          if (btnType === "radio") {
            if (val !== view[fld]) {
              view[fld] = val;
            } else if (fields[fld].optional) {
              // turn off radio button
              btnEl.checked = false;
              view[fld] = undefined;
            }
          } else {  // checkbox
            i = view[fld].indexOf( val);
            if (i > -1) {  // delete from value list 
              view[fld].splice(i, 1);
            } else {  // add to value list 
              view[fld].push( val);
            }
          }
        });
      }
      return containerEl;
    }
    /**
     * Create a selection list
     * @method 
     */
    function createSelectionList( fld) {
      const selEl = document.createElement("select"),
            lblEl = document.createElement("label"),
            range  = fields[fld].range;
      var choiceItems=[];
      lblEl.textContent = fields[fld].label;
      lblEl.appendChild( selEl);
      selEl.setAttribute("data-bind", fld);
      // store data binding assignment of UI element to view field
      dataBinding[viewMode][fld] = selEl; 
      // if maxCard is defined, make a multi-selection list
      if (mc.properties[fld].maxCard) selEl.multiple = "multiple";
      if (range instanceof eNUMERATION) {
        choiceItems = range.labels;
      } else if (Array.isArray(range)) {  // range is an ad-hoc enumeration
        choiceItems = range;
      } else {  // range is an entity type
        choiceItems = Object.keys( range.instances);
      }
      dom.fillSelectWithOptions( selEl, choiceItems);
      selEl.addEventListener("change", function () {
        // top-down data binding
        if (selEl.value !== "") {
          if (cOMPLEXtYPE.isIntegerType( range)) {
            view[fld] = parseInt( selEl.value);
            // increment by 1 for enumerations
            if (range instanceof eNUMERATION) view[fld]++;
          } else if (props[fld].range === "Date") {
            view[fld] = selEl.valueAsDate;  // new Date( selEl.value)
          } else {
            view[fld] = selEl.value;
          }
        }
      });
      return lblEl;
    }
    /**
     * Create UI elements for view fields
     * depends on: fieldOrder, formEl
     * invokes createLabeledInputField( fld) 
     * @method 
     */
    function createUiElemsForViewFields() {
      fieldOrder.forEach( function (fldOrdEl) {
        var range, fldList=[],
            containerEl = document.createElement("div");
        if (!Array.isArray( fldOrdEl)) {  
          // single field
          fldList = [fldOrdEl];
        } else {
          // field group
          containerEl.className = "field-group";
          fldList = fldOrdEl;
        }
        fldList.forEach( function (fld) {
          if (mc.properties[fld])  {  // property field
            range = mc.properties[fld].range;
            if (range instanceof eNUMERATION) {  // enumeration field
              if (viewMode === "D") {
                containerEl.className = "field";
                containerEl.appendChild( createLabeledField( fld));
              } else {
                if (range.MAX <= maxELforButton) {
                  containerEl = createChoiceButtonGroup( fld);
                } else {
                  containerEl.className = "select";
                  containerEl.appendChild( createSelectionList( fld));
                }
              }
            } else if (range === "Boolean") {
              containerEl.appendChild( createLabeledYesNoField( fld));
            } else {  // string/numeric property field
              containerEl.className = "field";
              containerEl.appendChild( createLabeledField( fld));
            }
          } else {  // defined field
            containerEl.className = "field";
            containerEl.appendChild( createLabeledField( fld));
          }
        });
        formEl.appendChild( containerEl);
      });
    }
    /* ==================================================================== */
    uiContainerEl = document.querySelector("html>body>section#" +  
        mc.name +"-"+ this.viewMode);
    if (!uiContainerEl) {
      inbetween = (this.viewMode !== "R") ? " a " : " ";
      suffix = (this.viewMode === "R") ? "s" : "";
      uiContainerEl = dom.createElement("section", {
        id: mc.name +"-"+ this.viewMode,
        classValues:"UI",
        content:"<h1>"+ vIEW.crudVerbs[this.viewMode] + 
            inbetween + mc.name.toLowerCase() +
            " record"+ suffix +"</h1>"
      });
      footerEl = document.querySelector("html>body>footer");
      if (footerEl) {
        document.body.insertBefore( uiContainerEl, footerEl);
      } else {
        document.body.appendChild( uiContainerEl);
      }
 	  } 
    if (this.viewMode !== "R") {
      formEl = uiContainerEl.querySelector("form");
      if (!formEl) formEl = dom.createElement("form");
      uiContainerEl.appendChild( formEl);
      // neutralize the submit event
      formEl.addEventListener( 'submit', function (e) { 
        e.preventDefault();
        formEl.reset();
      });
    }
    switch (this.viewMode) {
    case "R":  //================ RETRIEVE ALL and LIST =================
      var tblEl = document.querySelector(
          "html>body>div#"+ mc.name +"-R>table");
      if (tblEl) {
        if (tblEl.tBodies[0]) tblEl.tBodies[0].innerHTML = "";
      } else {
        tblEl = dom.createTable();
        tblEl.setAttribute("data-bind", mc.name);
        uiContainerEl.appendChild( tblEl);  // the table element
      }
      //TODO handle edit/delete button click events
      // create column headings 
      if (this.showAllFields || !displayAttribs) {
        columns = fieldOrder;
      } else {
        columns = displayAttribs.clone();
        if (columns[0] !== mc.idAttribute) {
          // add standardIdAttr at beginning of displayAttribs
          columns.unshift( mc.idAttribute);
        }
      }
      rowEl = tblEl.tHead.insertRow(-1);
      columns.forEach( function (col) {
        var i=0, colHead="", fldList="",
            cellEl = rowEl.insertCell(-1);
        if (typeof(col) === "string") {  // property field
          /* if (mc.properties[fld].range instanceof cOMPLEXdATAtYPE) */
          cellEl.textContent = fields[col].label;
          cellEl.setAttribute("data-bind", col);
        } else if (Array.isArray( col)) {  // field group
          colHead = fields[col[0]].label;
          fldList = col[0];
          for (i=1; i < col.length; i++) {
            if (typeof col[i] === "string") {  // property field
              colHead += fldGrpSep + fields[col[i]].label;
              fldList += " " + col[i];
            } else {}  //TODO: non-property-field
          }
          cellEl.textContent = colHead;
          cellEl.setAttribute("data-bind", col);
        }
      });
      uiContainerEl.appendChild( dom.createBackButton({
        label:"Back to CRUD menu",
        classValues: "button",
        handler: userActions["back"]  // map UI event to logical action
      }));
      break;
    case "C":  //================ CREATE ============================
      // create form fields for all view fields
      createUiElemsForViewFields();
      // create save and back buttons
      formEl.appendChild( dom.createCommitAndBackButtons({
          label: "Save",
          classValues: "button-group"
      }));
      // handle save button click events
      formEl.submitButton.addEventListener("click", function () {
        var slots = {}, elem, fName = '';
        Object.keys( fields).forEach( function (f) {
          if (mc.properties[f] &&
              fields[f].inputOutputMode === "I/O") {
            if (fields[f].optional && view[f] || !fields[f].optional) {
              slots[f] = view[f];
              if (!(fields[f].range instanceof eNUMERATION) &&
                  !(fields[f].range instanceof eNTITYtYPE)) {
                formEl[f].setCustomValidity( mc.check( f, slots[f]).message);
              } else if (fields[f].range instanceof eNUMERATION) {
                // browsers does not render validation of fieldset so we have to use
                // the first input element instead, and call its setCustomValidity
                elem = formEl.querySelector("[data-bind=" + f + "] input:first-of-type");
                // it wasn't a field set with child input elements, so it must be
                // a select element, with data-bind="property-name" attribute
                if (elem === null) {
                  elem = formEl.querySelector("select[data-bind=" + f + "]");
                }
                elem.setCustomValidity( mc.check( f, slots[f]).message);
              }
            }
          }
        });
        if (formEl.checkValidity())  {
          userActions["createRecord"]( slots);
          // clear view slots, otherwise they are sent again even if the form is empty!
          for (fName in slots) view[fName] = undefined;
        }
      });
      break;
    case "U":  //================ UPDATE ============================
      // create object selection field
      slots = {
          name:"select"+ mc.name,
          labelText:"Select "+ mc.name +": ",
          classValues: "select"
      };
      el = dom.createLabeledSelectField( slots);  // div element
      formEl.appendChild( el);        
      selectEl = formEl[slots.name];
      // when an entity is selected, populate the form with its data
      selectEl.addEventListener("change", function () {
        var i=0, id = selectEl.value,
            formFields = formEl.elements;
        // reset form fields
        formEl.reset();
        // reset custom validity
        for (i=0; i < formFields.length; i++) {
          formFields[i].setCustomValidity("");
        }
        // parse id if integer value
        if (id) {
          if (cOMPLEXtYPE.isIntegerType( stdIdRange)) {
            id = parseInt( id);
          }
          // map UI event to a user action defined by the view
          userActions["setViewModelObject"](id);
        }
      });
      // create form fields for all view fields
      createUiElemsForViewFields();
      // create save and back buttons
      formEl.appendChild( dom.createCommitAndBackButtons({
        label:"Save",
        classValues: "button-group"
      }));
      // handle save button click events
      formEl.submitButton.addEventListener("click", function () {
        var slots={}, fName = '',
            idProp = mc.idAttribute,
            id = formEl[idProp].value;
        Object.keys( fields).forEach( function (f) {
          if (fields[f].inputOutputMode === "I/O" && f !== idProp) {
            if (fields[f].optional && view[f] ||
                !fields[f].optional) {
              if (Array.isArray( view[f])) slots[f] = view[f].clone();  // clone array
              else slots[f] = view[f];
              // check constraints for non-select fields
              if (!(fields[f].range instanceof eNUMERATION) &&
                  !(fields[f].range instanceof eNTITYtYPE)) {
                formEl[f].setCustomValidity( 
                    mc.check( f, slots[f]).message);
              }
            } else {  // optional and no form field value
              slots[f] = undefined;  // map empty string to undefined
            }
          }
        });
        if (formEl.checkValidity()) {
          if (cOMPLEXtYPE.isIntegerType( stdIdRange)) id = parseInt( id);
          // map UI event to a user action defined by the view
          userActions["updateRecord"]( id, slots);
          // clearup old values, otherwise, values for fields of new object to update,
          // for the optional fields, are old values from other updated objects
          for (fName in slots) view[fName] = undefined;
        }
      });
      break;
    case "D":  //================ DELETE ============================
      if (!this.modelObject) {
        // create object selection field
        slots = {
            name:"select"+ mc.name,
            labelText:"Select "+ mc.name +": "
        };
        el = dom.createLabeledSelectField( slots);  // div element
        selectEl = el.querySelector('select');
        formEl.appendChild( el);        
        // when an object is selected, populate the form with its data
        selectEl.addEventListener("change", function () {
          var id = selectEl.value;
          if (id) {
            if (cOMPLEXtYPE.isIntegerType( stdIdRange)) id = parseInt( id);
            // map UI event to a user action defined by the view
            userActions["setViewModelObject"](id);
          } else {
            formEl.reset();
          }
        });
      }
      // create form fields for all view fields
      createUiElemsForViewFields();
      // create delete and back buttons
      formEl.appendChild( dom.createCommitAndBackButtons({
        label:"Delete",
        classValues: "button-group"
      }));
      // handle delete button click events
      formEl.submitButton.addEventListener("click", function () {
        var id = formEl[mc.idAttribute].value;
        if (cOMPLEXtYPE.isIntegerType( stdIdRange)) id = parseInt( id);
        // map UI event to a user action defined by the view
        userActions["deleteRecord"](id);
        if (selectEl && id) {
          selectEl.remove( selectEl.selectedIndex);
        }
      });
      break;
    }
    if (this.viewMode !== "R" && userActions) {
      // handle back button click events
      formEl.backButton.addEventListener("click", userActions["back"]);      
    }
 	  //TODO: only for local storage???
/*
    window.addEventListener("beforeunload", function () {
        modelClass.saveAll(); 
    });
*/
  }
  /**
   * Generic setter for view fields
   * this = view object
   * @method 
   * @author Gerd Wagner
   * TODO: what about derived view fields?
   */
  set( f, v) {
    var el=null, elems=null, i=0,
        mc = this.type.modelClass,
        properties = mc.properties,
        fldGrpSep = this.fieldGroupSeparator,
        range = properties[f].range,
        uiEl = this.dataBinding[this.viewMode][f];
    if (v === undefined) {
      if (properties[f] && properties[f].maxCard) v = [];
      else v = "";
      this[f] = v;
      return;
    }
    // assign view field
    if (Array.isArray(v)) this[f] = v.clone();
    else this[f] = v;
    // bottom-up data-binding: assign UI/form field
    if (uiEl.tagName === "INPUT" || uiEl.tagName === "OUTPUT") {
      if (!Array.isArray(v)) {
        uiEl.value = eNTITYtYPE.getValAsString( mc, f, v);
      } else {
        v.forEach( function (el,i) {
          var ds = eNTITYtYPE.getValAsString( mc, f, el);
          if (i===0) uiEl.value = ds;
          else uiEl.value += fldGrpSep + ds;
        });
      }
    } else if (uiEl.tagName === "FIELDSET" && 
        uiEl.classList.contains("radio-button-group")) {
      elems = uiEl.querySelectorAll("input[type='radio']");
      for (i=0; i < elems.length; i++) {
        el = elems[i];
        if (el.value === String(v)) el.checked = true;
      }
    } else if (uiEl.tagName === "FIELDSET" && 
        uiEl.classList.contains("checkbox-group")) {
      elems = uiEl.querySelectorAll("input[type='checkbox']");
      for (i=0; i < elems.length; i++) {
        el = elems[i];
        el.checked = v.indexOf(parseInt(el.value)) > -1;
      }
    } else if (uiEl.tagName === "SELECT" && uiEl.multiple !== "multiple") {
      uiEl.selectedIndex = v;
    } else {
      uiEl.setAttribute("data-value", v);
    }
  }
  /**
   * Set the view's model object
   * this = view object
   * @method 
   * @author Gerd Wagner
   * @param {string} id  the object's standard ID value
   */
  setModelObject( id) {
    const modelClass = this.type.modelClass;
    this.modelObject = modelClass.instances[id];
    Object.keys( this.modelObject).forEach( function (prop) {
      // assign value if the view has a field based on the model property
      if (this.type.fields[prop]) this.set( prop, this.modelObject[prop]);
    }, this);
  }
  /**
   * Factory method for creating new views as instances of a vIEW.
   * While a vIEW class is bound to one or more model classes,
   * a view object is bound to zero, one or more model objects.
   * @method
   * @author Gerd Wagner
   * @return {object}  A new view object.
   */
  create({viewMode, modelObject, userActions, showAllFields, fieldGroupSeparator}) {
    const properties = this.modelClass.properties;
    // add predefined property "type" for direct type of view
    const view = Object.create( this.methods, {
                 "type": {value: this, writable: false, enumerable: true}});
    // check CRUD mode parameter
    if (!viewMode) view.viewMode = "O";  //TODO: Other???
    else  if (["C","R","U","D"].indexOf( viewMode) === -1) {
      throw new Error(`Attempt to create a ${this.modelClass.name} view with an invalid viewMode argument: ${viewMode}`);
    } else view.viewMode = viewMode;
    // in case of viewMode "U" and "D"
    if (modelObject && modelObject.type !== this.modelClass) {
      throw new Error("The view's model object must be an instance of the model class of its view class!");
    }
    view.userActions = userActions;
    view.showAllFields = showAllFields;
    view.modelObject = modelObject;
    view.dataBinding = {"C":{},"R":{},"U":{},"D":{}};
    view.fieldGroupSeparator = fieldGroupSeparator || ", ";
    // initialize view fields
    for (const f of Object.keys( view.type.fields)) {
      var obj = view.modelObject,
          val = obj ? obj[f] : undefined;
      if (obj && val !== undefined) {
        if (!Array.isArray(val)) {
          view[f] = eNTITYtYPE.getValAsString( view.type.modelClass, f, val);
        }
        else view[f] = val.slice();
      } else if (properties[f] && properties[f].maxCard) {
        view[f] = [];
      } else view[f] = "";
    }
    // store view
    this.instances[view.viewMode] = view;
    return view;
  }
  static setupUI( app) {
    function setupStartUI() {
      var uiContainerEl = document.querySelector("#AppStart"),
          footerEl = document.querySelector("html>body>footer"),
          menuEl = document.querySelector("ul.menu");
      if (!uiContainerEl) {
        uiContainerEl = dom.createElement("section", {classValues:"UI", id:"AppStart",
            content:"<p>This app supports the following operations:</p>"});
        if (footerEl) {
          document.body.insertBefore( uiContainerEl, footerEl);
        } else {
          document.body.appendChild( uiContainerEl);
        }
      }
      if (!menuEl) {
        menuEl = dom.createElement("ul", {classValues:"menu"});
        uiContainerEl.appendChild( menuEl);
      }
      menuEl.addEventListener( "click", function (e) {
        var menuOption="", selectedMenuItemEl=null;
        if (e.target.tagName === "LI") {
          selectedMenuItemEl = e.target;
        } else if (e.target.parentNode.tagName === "LI") {
          selectedMenuItemEl = e.target.parentNode;
        } else return;
        menuOption = selectedMenuItemEl.id;
        switch (menuOption) {
          case "createTestData":
            app.createTestData();
            break;
          case "clearDatabase":
            if (app.clearDatabase) {
              app.clearDatabase();
            } else {
              Object.keys( bUSINESSoBJECT.classes).forEach( function (className) {
                app.storageManager.clearData( bUSINESSoBJECT.classes[className]);
              });
            }
            break;
          default:  // a model class has been selected
            const className = selectedMenuItemEl.id;
            vIEW.refreshUI( className +"-M");
        }
      });
      for (const className of Object.keys( bUSINESSoBJECT.classes)) {
        if (!menuEl.querySelector("li#"+ className)) {
          const liEl = dom.createElement("li", {
            id: className,
            content:"Manage "+ className.toLowerCase() +" data"
          });
          menuEl.appendChild( liEl);
        }
      }
      if (app.createTestData) {
        if (!menuEl.querySelector("li#createTestData")) {
          const liEl = dom.createElement("li", {
            id:"createTestData",
            content:"Create test data"
          });
          menuEl.appendChild( liEl);
        }
      }
      if (!menuEl.querySelector("li#clearDatabase")) {
        const liEl = dom.createElement("li", {
          id:"clearDatabase",
          content:"Clear database"
        });
        menuEl.appendChild( liEl);
      }
    }
    function setupManageDataUI( className) {
      var manageUiEl = document.querySelector("section.UI#"+ className +"-M"),
          footerEl = document.querySelector("html>body>footer"),
          menuEl=null, liEl=null;
      if (!manageUiEl) {
        manageUiEl = dom.createElement("section", { classValues:"UI",
          id: className +"-M",
          content:"<h1>Manage "+ className.toLowerCase() +" data</h1>"
        });
        if (footerEl) {
          document.body.insertBefore( manageUiEl, footerEl);
        } else {
          document.body.appendChild( manageUiEl);
        }
      }
      menuEl = manageUiEl.querySelector("ul.menu");
      if (!menuEl) {
        menuEl = document.createElement("ul");
        menuEl.className = "menu";
        manageUiEl.appendChild( menuEl);
      }
      ["R","C","U","D"].forEach( function (crudCode) {
        var inbetween = (crudCode !== "R") ? " a " : " ",
            suffix = (crudCode === "R") ? "s" : "";
        liEl = dom.createMenuItem({
          id: className +"-"+ crudCode ,
          content: vIEW.crudVerbs[crudCode] + inbetween +
              className.toLowerCase() +" record"+ suffix
        });
        menuEl.appendChild( liEl);
      });
      menuEl.addEventListener( "click", function (e) {
        var selectedMenuItemEl=null;
        if (e.target.tagName === "LI") {
          selectedMenuItemEl = e.target;
        } else if (e.target.parentNode.tagName === "LI") {
          selectedMenuItemEl = e.target.parentNode;
        } else return;
        const sepPos = selectedMenuItemEl.id.indexOf('-');
        const className = selectedMenuItemEl.id.substr( 0, sepPos);
        const crudCode = selectedMenuItemEl.id.substr( sepPos+1);
        vIEW.refreshUI( className +"-"+ crudCode);
      });
      manageUiEl.appendChild( dom.createBackButton({
          label:"Back to main menu",
          handler: function () { vIEW.refreshUI("AppStart");}
      }));
    }
    setupStartUI();
    for (const className of Object.keys( bUSINESSoBJECT.classes)) {
      const modelClass = bUSINESSoBJECT.classes[className];
      const ViewClass = vIEW.classes[className+"View"] ??
                          new vIEW({modelClass: modelClass});
      // set up the CRUD menu UI page
      setupManageDataUI( className);
      ["R","C","U","D"].forEach( function (crudCode) {
        var viewSlots={};
        switch (crudCode) {
          case "R":  //================ RETRIEVE ==========================
            viewSlots.userActions = {
              "back": function () { vIEW.refreshUI( className +"-M");}
            };
            break;
          case "C":  //================ CREATE ============================
            viewSlots.userActions = {
              "createRecord": function (slots) {
                  app.storageManager.add( modelClass, slots);},
              "back": function () { vIEW.refreshUI( className +"-M");}
            };
            break;
          case "U":  //================ UPDATE ============================
            viewSlots.userActions = {
              "setViewModelObject": function (id) {  // ON object selection
                  ViewClass.instances["U"].setModelObject( id);},
              "updateRecord": function (id, slots) {
                  app.storageManager.update( modelClass, id, slots);},
              "back": function () { vIEW.refreshUI( className +"-M");}
            };
            break;
          case "D":  //================ DELETE ============================
            viewSlots.userActions = {
              "setViewModelObject": function (id) {  // ON object selection
                  ViewClass.instances["D"].setModelObject( id);},
              "deleteRecord": function (id) {
                  app.storageManager.destroy( modelClass, id);},
              "back": function () { vIEW.refreshUI( className +"-M");}
            };
            break;
        }
        // create and render view
        viewSlots.viewMode = crudCode;
        ViewClass.create( viewSlots).render();
      });
    }
    vIEW.refreshUI("AppStart");
  }
  static refreshUI( userInterfaceId) {
    var i=0, selectEl=null, formEl=null, uiPages = vIEW.uiPages;
    var sepPos = userInterfaceId.indexOf('-');
    var className = userInterfaceId.substr( 0, sepPos);
    var opCode = userInterfaceId.substr( sepPos+1);
    var modelClass = bUSINESSoBJECT.classes[className];
    // store the UI elements in a cache variable
    if (!uiPages) uiPages = document.querySelectorAll("section.UI");
    for (i=0; i < uiPages.length; i++) {
      if (uiPages[i].id === userInterfaceId) {
        uiPages[i].style.display = "block";
      } else {
        uiPages[i].style.display = "none";
      }
    }
    switch (opCode) {
      case "M":
        break;
      case "R":
        app.storageManager.retrieveAll( modelClass,
            function () {vIEW.fillTable( className);});
        break;
      case "U":
        formEl = document.querySelector("section#"+ className +"-U > form");
        formEl.reset();
        selectEl = formEl["select"+ className];
        app.storageManager.retrieveAll( modelClass,
            function () {
              dom.fillSelectWithOptionsFromEntityTable( selectEl,
                  modelClass.instances,
                  modelClass.idAttribute,
                  modelClass.attributesToDisplayInLists);
            });
        break;
      case "D":
        formEl = document.querySelector("section#"+ className +"-D > form");
        formEl.reset();
        selectEl = formEl["select"+ className];
        app.storageManager.retrieveAll( modelClass,
            function () {
              dom.fillSelectWithOptionsFromEntityTable( selectEl,
                  modelClass.instances,
                  modelClass.idAttribute,
                  modelClass.attributesToDisplayInLists);
            });
        break;
    }
  }
  static fillTable( className) {
    var mc = bUSINESSoBJECT.classes[className],
        columns=[], keys=[], obj=null,
        rowEl=null, i=0, nmrOfInstances=0;
    var tblEl = document.querySelector("html>body>section#"+ className +"-R>table");
    if (!tblEl) {
      console.log("No table in "+ className +"-R user interface section found!");
      return;
    }
    if (!(tblEl.tBodies[0] && tblEl.tHead && tblEl.tHead.rows[0])) {
      console.log("Table in "+ className +"-R user interface section " +
          "does not have the required structure!");
      return;
    }
    tblEl.tBodies[0].innerHTML = "";
    columns = tblEl.tHead.rows[0].cells;
    keys = Object.keys( mc.instances);
    nmrOfInstances = keys.length;
    for (i=0; i < nmrOfInstances; i++) {
      obj = mc.instances[keys[i]];
      rowEl = tblEl.tBodies[0].insertRow(-1);
      // create cell content for each column
      Array.prototype.forEach.call( columns, function (col) {
        var cellContent="", properties=[], propSep="",
            dataBinding = col.getAttribute("data-bind");
        if (!dataBinding) {
          console.log("A column in the table in the "+ className +
              "-R UI page does not have any data binding!");
          return;
        }
        if (dataBinding.indexOf(" ") === -1) {  // single field column
          properties = [dataBinding];
        } else {  // field group column
          properties = dataBinding.split(" ");
        }
        propSep = col.getAttribute("data-separator") || ", ";
        properties.forEach( function (prop, k) {
          var cont, range = mc.properties[prop].range;
          if (obj[prop] === undefined) return;
          if (range === "Date") {
            cont = dom.createTime( obj[prop]).outerHTML;
          } else {
            cont = obj.getValAsString( prop);
          }
          if (k===0) cellContent = cont;
          else cellContent += propSep + cont;
        });
        rowEl.insertCell(-1).innerHTML = cellContent;
      });
      //TODO add edit and delete buttons
    }
  }
}
vIEW.classes = {};  // a map of all view classes defined per model class
vIEW.crudVerbs = {'R':'Retrieve/List', 'C':'Create', 'U':'Update', 'D':'Delete'};

export default vIEW;
