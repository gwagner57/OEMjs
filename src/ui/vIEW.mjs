/**
 * @fileOverview  This file contains the definition of the meta-class vIEW.
 * @author Gerd Wagner
 * @copyright Copyright 2015-2023 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
import {dt} from "../datatypes.mjs";
import eNUMERATION from "../eNUMERATION.mjs";
import bUSINESSoBJECT from "../bUSINESSoBJECT.mjs";
import dom from "../../lib/dom.mjs";
import SelectReferenceWidget from "./SelectReferenceWidget.mjs";
import {NoConstraintViolation} from "../constraint-violation-error-types.mjs";

/**
 * Class for creating "views" (or view models), typically based on model classes,
 * with fields (typically bound to model class properties) and methods (typically
 * implementing user actions and possibly bound to model class methods).
 *
 * A view is a logical representation of the interaction elements of a UI, which
 * in most cases correspond to properties and methods of a model class. It
 * consists of fields and of user action types, which are either pre-defined
 * (like "back", "createRecord", "setViewModelObject", updateRecord" and
 * "deleteRecord") or developer-defined.
 *
 * A view has a "field order" defining the order of fields and field groups,
 * such that each of them is rendered horizontally in a row.
 *
 * The constructor parameter "fields" may contain additional fields not based
 * on model properties. When a view is created without a "fields" argument,
 * the view fields are generated from the labeled properties of the underlying 
 * model class(es).
 * 
 * CRUD views are special views with an underlying "modelClass" and a
 * "viewType" identified by one of the characters "C", "R", "U" and "D".
 *
 * A view field has an I/O mode of either "I/O" (input/output) or "O".
 * When a view is rendered, its fields are rendered as UI elements in the
 * following way:
 * 
 * 1) numeric or text fields as HTML input/output elements,
 * 2) Boolean fields as HTML checkbox elements,
 * 2) Date fields either as HTML input/output elements with ISO date strings,
 *    or as calendar date selection widgets,
 * 3) enumeration fields as choice widgets (radio button groups,
 *    checkbox groups, or HTML select elements)
 * 4) reference fields as HTML select elements or multi-select widgets, which
 *    are HTML custom elements,
 * 5) complex value fields as special widgets (implemented as HTML custom elements)
 *
 * User actions are by default exposed in the form of HTML buttons. In principle,
 * they might also be exposed as other actionable (e.g. clickable) HTML elements.
 * 
 * The UI (DOM structure) of a view is rendered by the view.render method once
 * at app startup time, while its input/output fields are filled by the 
 * vIEW.refreshUI method at runtime.
 * 
 * A user action type is a named JS function where the name indicates the intended 
 * meaning of the user action (such as "save"). It binds a UI event type, such as
 * clicking on a button, to a view method as its "event handler".
 *
 * TODO: When a view field is bound to a model class property and the view is
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
class vIEW {
  constructor({modelClass, modelClasses, fields, methods, validateOnInput,
                fieldGroupSeparator, viewType}) {
    if (modelClass) {
      if (Object.getPrototypeOf( modelClass) !== bUSINESSoBJECT) {
        throw new Error("A view class must be bound to one or more model classes!");
      }
      this.modelClass = modelClass;
      const propDecl = this.modelClass.properties;
      /* process the "fields" array into a "fields" map of field definition records
       * and a field order definition array "fieldOrder" 
       */
      this.fields = {};
      this.fieldOrder = [];
      this.fldValues = {};
      if (fields) {  // fields is an array while this.fields is a map
        for (const el of fields) {
          var elList = [], fieldNames = [];
          if (!Array.isArray(el)) elList = [el];  // single field
          else elList = el;  // field group
          // elList is a list of property field names or field definitions
          // fieldNames is a corresponding list of field names
          for (const fld of elList) {
            if (typeof fld === "string") {  // property field
              if (!propDecl[fld]) {
                throw new Error(
                    `Property view field ${fld} does not correspond to a model property!`);
              }  // else
              this.fields[fld] = {
                label: propDecl[fld].label,
                range: propDecl[fld].range,
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
              throw new Error(`Neither property field nor defined field: ${fld}`);
            }
          }
          if (elList.length === 1) this.fieldOrder.push(fieldNames[0]);
          else this.fieldOrder.push(fieldNames);
        }
      } else {  // no view fields provided in construction slots
        // create view field definitions from definitions of labeled model properties
        for (const prop of Object.keys(propDecl)) {
          if (propDecl[prop].label) {
            this.fields[prop] = propDecl[prop];
            this.fields[prop]["inputOutputMode"] = "I/O";
          }
        }
        if (Object.keys(this.fields).length === 0) {
          throw new Error(`No labeled properties defined for ${modelClass.name}`);
        }
        this.fieldOrder = [...Object.keys(this.fields)];
      }
    } else {  //TODO: views based on multiple model classes
      this.modelClasses = modelClasses;
    }
    this.maxNmrOfEnumLitForChoiceButtonRendering = 7;
    this.validateOnInput = validateOnInput ?? true;
    this.methods = methods ?? {};
    this.fieldGroupSeparator = fieldGroupSeparator || ", ";
    if (viewType) this.viewType = viewType;  // e.g., CRUD views
    this.dataBinding = {};
  }
  /**
   * Render the DOM structure of a view
   * this = view object
   * @method 
   * @author Gerd Wagner
   */
  render({modelObject, showAllFields}={}) {
    var uiContainerEl=null, formEl=null,
        columns=[], slots = {},
        el=null, selectEl=null, rowEl=null,
        inbetween="", suffix="";
    const view = this,
          mc = this.modelClass,
          propDecl = mc.properties,
          fields = this.fields,  // field definition map
          viewType = this.viewType,
          fieldOrder = this.fieldOrder,  // field order array
          // a map for storing the bindings of UI elems to view fields
          dataBinding = this.dataBinding,
          validateOnInput = this.validateOnInput,
          displayAttribs = mc.attributesToDisplayInLists,
          stdIdRange = mc.properties[mc.idAttribute].range,
          maxNmrOfChoiceButtons = this.maxNmrOfEnumLitForChoiceButtonRendering;
    /* ==================================================================== */
    /**
     * Create a labeled input field. When validation is not performed on input
     * it is performed on blur in the case of "Create" for catching mandatory
     * value constraint violations, and on change in the case of "Update". 
     * depends on: fields, modelClass, viewMode, view
     * @method 
     */
    function createLabeledField( fld) {
      var fldEl = null;
      const lblEl = document.createElement("label");

      function validateFieldValue () {
        const constrVio = dt.check( fld, fields[fld], fldEl.value);
        let msg = "";
        if (constrVio.length === 1 && constrVio[0] instanceof NoConstraintViolation) {
          // update view model field value by assigning the converted range-conform value
          view.fldValues[fld] = constrVio[0].checkedValue;
        } else {
          msg = constrVio[0].message;
        }
        fldEl.setCustomValidity( msg);
      }

      if (fields[fld].inputOutputMode === "O" ||
          (viewType === "U" && propDecl[fld]?.isIdAttribute) || viewType === "D") {
        fldEl = document.createElement("output");
        fldEl.style.width = `${fields[fld].fieldSize || 7}em`;
      } else {
        fldEl = document.createElement("input");
        fldEl.type = "text";
        fldEl.size = fields[fld].fieldSize || 7;
        if (validateOnInput) {
          fldEl.addEventListener("input", validateFieldValue);
        } else if (viewType === "C") {
          // add event listener for loosing focus
          fldEl.addEventListener("blur", validateFieldValue);
        } else {  // !validateOnInput && viewType === "U"
          fldEl.addEventListener("change", validateFieldValue);
        }
      }
      // store data binding assignment of UI element to view model field
      dataBinding[fld] = fldEl;
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
      var fldEl = null;
      const lblEl = document.createElement("label");
      if (fields[fld].inputOutputMode === "O") {
        fldEl = document.createElement("output");
      } else {
        fldEl = document.createElement("input");
        fldEl.type = "checkbox";
      }
      // store data binding assignment of UI element to view field
      dataBinding[fld] = fldEl;
      fldEl.name = fld;
      fldEl.checked = modelObject[fld];
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
      var btnType="", containerEl=null, el=null, choiceItems=[],
          range = fields[fld].range;
      el = document.createElement("legend");
      el.textContent = fields[fld].label;
      containerEl = document.createElement("fieldset");
      containerEl.appendChild( el);
      containerEl.setAttribute("data-bind", fld);
      // store data binding assignment of UI element to view field
      dataBinding[fld] = containerEl;
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
      for (let j=0; j < choiceItems.length; j++) {
        // button values = 1..n
        el = dom.createLabeledChoiceControl( btnType, fld, j+1, choiceItems[j]);
        containerEl.appendChild( el);
        el.firstElementChild.addEventListener("click", function (e) {
          // update view model field value
          var btnEl = e.target, i=0,
              val = parseInt( btnEl.value);
          if (btnType === "radio") {
            if (val !== view.fldValues[fld]) {
              view.fldValues[fld] = val;
            } else if (fields[fld].optional) {
              // turn off radio button
              btnEl.checked = false;
              view.fldValues[fld] = undefined;
            }
          } else {  // checkbox
            i = view.fldValues[fld].indexOf( val);
            if (i > -1) {  // delete from value list 
              view.fldValues[fld].splice(i, 1);
            } else {  // add to value list 
              view.fldValues[fld].push( val);
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
      dataBinding[fld] = selEl;
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
        // update view model field value
        if (selEl.value !== "") {
          if (dt.isIntegerType( range)) {
            view.fldValues[fld] = parseInt( selEl.value);
            // increment by 1 for enumerations
            if (range instanceof eNUMERATION) view.fldValues[fld]++;
          } else if (props[fld].range === "Date") {
            view.fldValues[fld] = selEl.valueAsDate;  // new Date( selEl.value)
          } else {
            view.fldValues[fld] = selEl.value;
          }
        }
      });
      return lblEl;
    }
    /**
     * Create UI elements for view fields
     * @method
     */
    function createUiElemsForViewFields() {
      for (const fldOrdEl of fieldOrder) {
        var containerEl = document.createElement("div");
        var fieldNames=[];
        if (!Array.isArray( fldOrdEl)) {  // single field
          fieldNames = [fldOrdEl];
        } else {  // field group
          containerEl.className = "field-group";
          fieldNames = fldOrdEl;
        }
        for (const fld of fieldNames) {
          const range = fields[fld].range;
          if (range instanceof eNUMERATION) {  // enumeration field
            if (viewType === "D") {
              containerEl.className = "I-O-field";
              containerEl.appendChild( createLabeledField( fld));
            } else {
              if (range.MAX <= maxNmrOfChoiceButtons) {
                containerEl = createChoiceButtonGroup( fld);
              } else {
                containerEl.className = "select";
                containerEl.appendChild( createSelectionList( fld));
              }
            }
          } else if (range === "Boolean") {
            containerEl.appendChild( createLabeledYesNoField( fld));
          } else if ((typeof range === "string" && range in dt.classes ||
                     range.constructor === bUSINESSoBJECT) && !fields[fld].maxCard) {
            // A field with a reference (functional association) to a bUSINESSoBJECT class
            const Class = typeof range === "string" ? dt.classes[range] : range,
                  selEl = new SelectReferenceWidget( fld, Class, view),
                  labelEl = document.createElement("label");
            labelEl.textContent = fields[fld].label;
            labelEl.appendChild( selEl);
            containerEl.className = "select";
            containerEl.appendChild( labelEl);
            // store data binding assignment of UI element to view model field
            dataBinding[fld] = selEl;
          } else {  // string/numeric property field
            containerEl.className = "I-O-field";
            containerEl.appendChild( createLabeledField( fld));
          }
        }
        formEl.appendChild( containerEl);
      }
    }
    /* ==================================================================== */
    if (modelObject) this.modelObject = modelObject;
    this.showAllFields = showAllFields;
    // initialize view field values
    for (const f of Object.keys( this.fields)) {
      const val = modelObject ? modelObject[f] : undefined;
      if (modelObject && val !== undefined) {
        if (!Array.isArray(val)) {
          this.fldValues[f] = dt.stringifyValue( val, fields[f].range);
        } else this.fldValues[f] = val.slice();  // create a copy of the array
      } else if (fields[f]?.maxCard && fields[f]?.maxCard > 1) {
        this.fldValues[f] = [];
      } else this.fldValues[f] = "";
    }
    uiContainerEl = document.querySelector(`section#${mc.name}-${this.viewType}`);
    if (!uiContainerEl) {
      const entityTypeName = mc.name.toLowerCase();
      inbetween = this.viewType !== "R" ?
          ("aeiou".includes( entityTypeName.charAt(0)) ? " an ":" a ") : " ";
      suffix = this.viewType === "R" ? "s" : "";
      uiContainerEl = dom.createElement("section", {
        id: mc.name +"-"+ this.viewType,
        classValues:"UI",
        content:`<h2>${vIEW.crudVerbs[this.viewType]} ${inbetween} ${entityTypeName} record${suffix}</h2>`
      });
      const mainEl = document.querySelector("html>body>main"),
            footerEl = document.querySelector("html>body>footer");
      if (mainEl) {
        mainEl.appendChild( uiContainerEl);
      } else if (footerEl) {
        document.body.insertBefore( uiContainerEl, footerEl);
      } else {
        document.body.appendChild( uiContainerEl);
      }
 	  } 
    if (this.viewType !== "R") {
      formEl = uiContainerEl.querySelector("form");
      if (!formEl) formEl = dom.createElement("form");
      uiContainerEl.appendChild( formEl);
      // neutralize the submit event
      formEl.addEventListener( 'submit', function (e) { 
        e.preventDefault();
        formEl.reset();
      });
    }
    switch (this.viewType) {
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
        columns = [...displayAttribs];  // clone
        if (columns[0] !== mc.idAttribute) {
          // add standardIdAttr at beginning of displayAttribs
          columns.unshift( mc.idAttribute);
        }
      }
      rowEl = tblEl.tHead.insertRow(-1);
      for (const col of columns) {
        const cellEl = rowEl.insertCell(-1);
        if (typeof col === "string") {  // property field
          if (!fields[col]) console.log("col = "+col+" "+JSON.stringify(fields));
          cellEl.textContent = fields[col].label;
          cellEl.setAttribute("data-bind", col);
        } else if (Array.isArray( col)) {  // field group
          let colHead = fields[col[0]].label;
          let fldList = col[0];
          for (let i=1; i < col.length; i++) {
            colHead += this.fieldGroupSeparator + fields[col[i]].label;
            fldList += " " + col[i];
          }
          cellEl.textContent = colHead;
          cellEl.setAttribute("data-bind", col);
        }
      }
      uiContainerEl.appendChild( dom.createBackButton({
        label:"Back to CRUD menu",
        classValues: "button",
        handler: this.userActions["back"]  // map UI event to logical action
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
      formEl["submitButton"].addEventListener("click", function () {
        var slots = {};
        for (const f of Object.keys( fields)) {
          if (fields[f].inputOutputMode === "I/O") {
            if (fields[f].optional && view.fldValues[f] || !fields[f].optional) {
              // perform validation on save
              const range = fields[f].range;
              let msg="";
              slots[f] = view.fldValues[f];
              if (!(range instanceof eNUMERATION) && !(range in dt.classes)) {
                const constrVio = dt.check( f, fields[f], slots[f]);
                if (constrVio.length === 1 && constrVio[0] instanceof NoConstraintViolation) {
                  slots[f] = constrVio[0].checkedValue;
                } else {
                  msg = constrVio[0].message;
                }
                formEl[f].setCustomValidity( msg);
              } else if (range instanceof eNUMERATION) {
                /* Either a field set with child input elements, or
                   a select element with attribute data-bind="property-name".
                   Since browsers do not render validation of fieldset, we have to use
                   the first input element instead, and call its setCustomValidity
                */
                const elem = formEl.querySelector(`[data-bind=${f}] input:first-of-type`) ||
                                 formEl.querySelector(`select[data-bind=${f}]`);
                const constrVio = dt.check( f, fields[f], slots[f]);
                if (constrVio.length === 1 && constrVio[0] instanceof NoConstraintViolation) {
                  slots[f] = constrVio[0].checkedValue;
                } else {
                  msg = constrVio[0].message;
                }
                elem.setCustomValidity( msg);
              }
            }
          }
        }
        if (formEl.checkValidity())  {
          view.userActions["createRecord"]( slots);
          // clear view fields, otherwise they are sent again even if the form is empty!
          for (const fName in slots) view.fldValues[fName] = undefined;
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
      el = document.createElement("div");  // div element
      el.appendChild( dom.createLabeledSelect( slots));
      formEl.appendChild( el);
      selectEl = formEl[slots.name];
      // when an entity is selected, populate the form with its data
      selectEl.addEventListener("change", function () {
        const formFields = formEl.elements;
        var id = selectEl.value;
        // reset form fields
        formEl.reset();
        // reset custom validity
        for (let i=0; i < formFields.length; i++) {
          formFields[i].setCustomValidity("");
        }
        if (id) {  // parse id if integer value
          if (dt.isIntegerType( stdIdRange)) id = parseInt( id);
          // map UI event to a user action defined by the view
          view.userActions["setViewModelObject"](id);
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
      formEl["submitButton"].addEventListener("click", function () {
        const idProp = mc.idAttribute;
        var slots={},
            id = formEl[idProp].value;
        for (const f of Object.keys( fields)) {
          if (fields[f].inputOutputMode === "I/O" && f !== idProp) {
            if (fields[f].optional && view.fldValues[f] || !fields[f].optional) {
              if (Array.isArray( view.fldValues[f])) {
                slots[f] = [...view.fldValues[f]];  // clone
              } else slots[f] = view.fldValues[f];
              // check constraints for non-select fields
              if (!(fields[f].range instanceof eNUMERATION) &&
                  !(fields[f].range in dt.classes)) {
                const constrVio = dt.check( f, fields[f], slots[f]);
                let msg = "";
                if (constrVio.length === 1 && constrVio[0] instanceof NoConstraintViolation) {
                  // assign the converted range-conform value
                  slots[f] = constrVio[0].checkedValue;
                } else {
                  msg = constrVio[0].message;
                }
                formEl[f].setCustomValidity( msg);
              }
            } else {  // optional and no form field value
              slots[f] = undefined;  // map empty string to undefined
            }
          }
        }
        if (formEl.checkValidity()) {
          if (dt.isIntegerType( stdIdRange)) id = parseInt( id);
          // map UI event to a user action defined by the view
          view.userActions["updateRecord"]( id, slots);
          // clear values
          for (const fName in slots) view.fldValues[fName] = undefined;
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
        el = dom.createLabeledSelect( slots);  // div element
        selectEl = el.querySelector('select');
        formEl.appendChild( el);        
        // when an object is selected, populate the form with its data
        selectEl.addEventListener("change", function () {
          var id = selectEl.value;
          if (id) {
            if (dt.isIntegerType( stdIdRange)) id = parseInt( id);
            // map UI event to a user action defined by the view
            view.userActions["setViewModelObject"](id);
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
      formEl["submitButton"].addEventListener("click", function () {
        var id = formEl[mc.idAttribute].value;
        if (dt.isIntegerType( stdIdRange)) id = parseInt( id);
        // map UI event to a user action defined by the view
        view.userActions["deleteRecord"](id);
        if (selectEl && id) {
          selectEl.remove( selectEl.selectedIndex);
        }
      });
      break;
    }
    if (this.viewType !== "R" && this.userActions) {
      // handle back button click events
      formEl["backButton"].addEventListener("click", this.userActions["back"]);
    }
 	  //TODO: only for local storage???
/*
    window.addEventListener("beforeunload", function () {
        modelClass.saveAll(); 
    });
*/
  }
  /**
   * Generic setter for view fields, takes also care of bottom-up data-binding
   * (from view field to corresponding UI widget)
   * this = view object
   * @method 
   * @author Gerd Wagner
   * TODO: support derived and dependent view fields
   */
  setViewField( f, v) {
    var el=null, elems=null;
    const fldDef = this.fields[f],
          uiEl = this.dataBinding[f];
    if (v === undefined) {
      if (fldDef?.maxCard) v = [];
      this.fldValues[f] = v;
      return;
    }
    // assign view field
    if (Array.isArray(v)) this.fldValues[f] = [...v];  // clone
    else this.fldValues[f] = v;
    // bottom-up data-binding: set the value of UI widgets (DOM elements)
    if (uiEl.tagName === "INPUT" || uiEl.tagName === "OUTPUT") {
      uiEl.value = dt.stringifyValue( v, fldDef.range);
    } else if (uiEl.tagName === "FIELDSET" &&
               uiEl.classList.contains("radio-button-group")) {
      elems = uiEl.querySelectorAll("input[type='radio']");
      for (let i=0; i < elems.length; i++) {
        el = elems[i];
        if (el.value === String(v)) el.checked = true;
      }
    } else if (uiEl.tagName === "FIELDSET" && 
        uiEl.classList.contains("checkbox-group")) {
      elems = uiEl.querySelectorAll("input[type='checkbox']");
      for (let i=0; i < elems.length; i++) {
        el = elems[i];
        el.checked = v.indexOf(parseInt(el.value)) > -1;
      }
    } else if (uiEl.tagName === "SELECT" && uiEl.multiple !== "multiple") {
      for (const option of uiEl.options) {
        if (option.value === v) uiEl.selectedIndex = option.index;
      }
/*
    } else if (uiEl instanceof SelectMultipleReferencesWidget) {
      for (const option of uiEl.options) {
        if (option.value === v) ...;
      }
*/
    } else {
      uiEl.setAttribute("data-value", v);
    }
  }
  /**
   * Set the view's model object and sync the corresponding UI fields
   * this = view object
   * @method 
   * @author Gerd Wagner
   * @param {string} id  the object's standard ID value
   */
  setModelObject( id) {
    this.modelObject = this.modelClass.instances[id];
    for (const propName of Object.keys( this.modelClass.properties)) {
      // assign view field value if the view has a field based on the model property
      if (propName in this.fields) this.setViewField( propName, this.modelObject[propName]);
    }
  }

  static setupUI( app) {
    function setupStartUI() {
      var uiContainerEl = document.querySelector("#AppStart"),
          mainEl = document.querySelector("html>body>main"),
          footerEl = document.querySelector("html>body>footer"),
          menuEl = document.querySelector("menu.start-menu");
      if (!uiContainerEl) {
        uiContainerEl = dom.createElement("section", {classValues:"UI", id:"AppStart",
            content:"<p>This app supports the following operations:</p>"});
        if (mainEl) {
          mainEl.appendChild( uiContainerEl);
        } else if (footerEl) {
          document.body.insertBefore( uiContainerEl, footerEl);
        } else {
          document.body.appendChild( uiContainerEl);
        }
      }
      if (!menuEl) {
        menuEl = dom.createElement("menu", {classValues:"start-menu"});
        uiContainerEl.appendChild( menuEl);
      }
      for (const className of Object.keys( dt.classes)) {
        if (!menuEl.querySelector("li#"+ className)) {
          const liEl = dom.createElement("li", {id: className});
          menuEl.appendChild( liEl);
          const btnEl = dom.createElement("button", {
            content:"Manage "+ className.toLowerCase() +" data"
          });
          liEl.appendChild( btnEl);
        }
      }
      if (app.createTestData) {
        if (!menuEl.querySelector("li#createTestData")) {
          const liEl = dom.createElement("li", {id:"createTestData"});
          menuEl.appendChild( liEl);
          const btnEl = dom.createElement("button", {
            content:"Create test data"
          });
          liEl.appendChild( btnEl);
        }
      }
      if (!menuEl.querySelector("li#clearDatabase")) {
        const liEl = dom.createElement("li", {id:"clearDatabase"});
        menuEl.appendChild( liEl);
        const btnEl = dom.createElement("button", {
          content:"Clear database"
        });
        liEl.appendChild( btnEl);
      }
      menuEl.addEventListener( "click", function (e) {
        var selectedMenuItemEl=null;
        if (e.target.tagName === "LI") {
          selectedMenuItemEl = e.target;
        } else if (e.target.parentElement.tagName === "LI") {
          selectedMenuItemEl = e.target.parentElement;
        } else return;
        const menuOption = selectedMenuItemEl.id;
        switch (menuOption) {
          case "createTestData":
            app.createTestData();
            break;
          case "clearDatabase":
            if (app.clearDatabase) {
              app.clearDatabase();
            } else {
              Object.keys( dt.classes).forEach( function (className) {
                app.storageManager.clearData( dt.classes[className]);
              });
            }
            break;
          default:  // a model class has been selected
            const className = selectedMenuItemEl.id;
            vIEW.refreshUI( app, className +"-M");
        }
      });
    }
    function setupManageDataUI( className) {
      var manageUiEl = document.querySelector("section.UI#"+ className +"-M"),
          mainEl = document.querySelector("html>body>main"),
          footerEl = document.querySelector("html>body>footer"),
          menuEl=null, liEl=null;
      if (!manageUiEl) {
        manageUiEl = dom.createElement("section", { classValues:"UI",
          id: className +"-M",
          content:"<h2>Manage "+ className.toLowerCase() +" data</h2>"
        });
        if (mainEl) {
          mainEl.appendChild( manageUiEl);
        } else if (footerEl) {
          document.body.insertBefore( manageUiEl, footerEl);
        } else {
          document.body.appendChild( manageUiEl);
        }
      }
      menuEl = manageUiEl.querySelector("menu");
      if (!menuEl) {
        menuEl = document.createElement("menu");
        menuEl.className = "manage-data-menu";
        manageUiEl.appendChild( menuEl);
      }
      for (const crudCode of ["R","C","U","D"]) {
        var inbetween = (crudCode !== "R") ? " a " : " ",
            suffix = (crudCode === "R") ? "s" : "";
        liEl = dom.createMenuItem({
          id: className +"-"+ crudCode ,
          content: vIEW.crudVerbs[crudCode] + inbetween +
              className.toLowerCase() +" record"+ suffix
        });
        menuEl.appendChild( liEl);
      }
      menuEl.addEventListener( "click", function (e) {
        var selectedMenuItemEl=null;
        if (e.target.tagName === "LI") {
          selectedMenuItemEl = e.target;
        } else if (e.target.parentElement.tagName === "LI") {
          selectedMenuItemEl = e.target.parentElement;
        } else return;
        const sepPos = selectedMenuItemEl.id.indexOf('-');
        const className = selectedMenuItemEl.id.substr( 0, sepPos);
        const crudCode = selectedMenuItemEl.id.substr( sepPos+1);
        vIEW.refreshUI( app, className +"-"+ crudCode);
      });
      manageUiEl.appendChild( dom.createBackButton({
          label:"Back to main menu",
          handler: function () { vIEW.refreshUI( app, "AppStart");}
      }));
    }
    setupStartUI();
    for (const className of Object.keys( dt.classes)) {
      const modelClass = dt.classes[className];
      // set up the CRUD menu UI page
      setupManageDataUI( className);
      for (const crudCode of ["R","C","U","D"]) {
        const view = app.crudViews[className][crudCode];
        switch (crudCode) {
        case "R":  //================ RETRIEVE ==========================
          view.userActions = {
            "back": function () { vIEW.refreshUI( app, className +"-M");}
          };
          break;
        case "C":  //================ CREATE ============================
          view.userActions = {
            "createRecord": function (record) {
               console.log("createRecord: "+JSON.stringify(record));
               app.storageManager.add( modelClass, record);},
            "back": function () { vIEW.refreshUI( app, className +"-M");}
          };
          break;
        case "U":  //================ UPDATE ============================
          view.userActions = {
            "setViewModelObject": function (id) {  // ON object selection
               app.crudViews[className]["U"].setModelObject( id);},
            "updateRecord": function (id, slots) {
               console.log("updateRecord: "+JSON.stringify(slots));
               app.storageManager.update( modelClass, id, slots);},
            "back": function () { vIEW.refreshUI( app, className +"-M");}
          };
          break;
        case "D":  //================ DELETE ============================
          view.userActions = {
            "setViewModelObject": function (id) {  // ON object selection
               app.crudViews[className]["D"].setModelObject( id);},
            "deleteRecord": function (id) {
               app.storageManager.destroy( modelClass, id);},
            "back": function () { vIEW.refreshUI( app, className +"-M");}
          };
          break;
        }
        // render view
        view.render();
      }
    }
    vIEW.refreshUI( app, "AppStart");
  }
  static async refreshUI( app, userInterfaceId) {
    var selectEl=null, formEl=null, uiPages = vIEW.uiPages;
    const sepPos = userInterfaceId.indexOf('-'),
          className = userInterfaceId.substr( 0, sepPos),
          operationCode = userInterfaceId.substr( sepPos+1),
          modelClass = dt.classes[className];
    // store the UI elements in a cache variable
    if (!uiPages) uiPages = document.querySelectorAll("section.UI");
    for (let i=0; i < uiPages.length; i++) {
      if (uiPages[i].id === userInterfaceId) {
        uiPages[i].style.display = "block";
      } else {
        uiPages[i].style.display = "none";
      }
    }
    switch (operationCode) {
      case "M":
        break;
      case "R":
        await app.storageManager.retrieveAll( modelClass);
        //console.log("Entity table: ", JSON.stringify(modelClass.instances));
        vIEW.fillTable( className);
        break;
      case "U":
      case "D":
        formEl = document.querySelector(`section#${className}-${operationCode} > form`);
        formEl.reset();
        selectEl = formEl["select"+ className];
        await app.storageManager.retrieveAll( modelClass);
        for (const refProp of modelClass.referenceProperties) {
          // refresh the options of the corresponding selection list
          const view = app.crudViews[className][operationCode],
                selRefEl = view.dataBinding[refProp];  // a select-reference element
          if (selRefEl instanceof SelectReferenceWidget) selRefEl.refreshOptions();
        }
        dom.fillSelectWithOptionsFromEntityTable( selectEl,
            modelClass.instances,
            modelClass.idAttribute);
        break;
    }
  }
  static fillTable( className) {
    const mc = dt.classes[className],
          tblEl = document.querySelector(`section#${className}-R>table`);
    if (!tblEl) {
      console.error(`No table found in UI section ${className}-R!`);
      return;
    }
    if (!(tblEl.tBodies[0] && tblEl.tHead && tblEl.tHead.rows[0])) {
      console.error(`Table in UI section ${className}-R does not have the required structure!`);
      return;
    }
    tblEl.tBodies[0].innerHTML = "";
    const columns = tblEl.tHead.rows[0].cells;
    for (const entityId of Object.keys( mc.instances)) {
      const obj = mc.instances[entityId],
            rowEl = tblEl.tBodies[0].insertRow(-1);
      // create cell content for each column
      for (const col of columns) {
        var cellContent="", properties=[];
        const dataBinding = col.getAttribute("data-bind");
        if (!dataBinding) {
          console.error(`A column in the table in the ${className}-R UI page does not have any data binding!`);
          return;
        }
        if (dataBinding.indexOf(" ") === -1) {  // single field column
          properties = [dataBinding];
        } else {  // field group column
          properties = dataBinding.split(" ");
        }
        const propSep = col.getAttribute("data-separator") || ", ";
        properties.forEach( function (prop, k) {
          var cont;
          const propDef = mc.properties[prop],
                range = propDef.range;
          if (obj[prop] === undefined) return;
          if (range === "Date") {
            cont = dom.createTime( obj[prop]).outerHTML;
          } else {
            cont = dt.stringifyValue( obj[prop], range, propDef.displayDecimalPlaces);
          }
          if (k===0) cellContent = cont;
          else cellContent += propSep + cont;
        });
        rowEl.insertCell(-1).innerHTML = cellContent;
      }
      //TODO add edit and delete buttons
    }
  }
}
vIEW.crudVerbs = {'R':'Retrieve/List', 'C':'Create', 'U':'Update', 'D':'Delete'};

export default vIEW;
