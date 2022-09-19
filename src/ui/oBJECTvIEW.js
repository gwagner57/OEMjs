/**
 * @fileOverview  This file contains the definition of the class ObjectView.
 * @author Gerd Wagner
 * @copyright Copyright 2015 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
/**
 * Class for creating (and rendering) view models based on "model objects". A view model
 * is a (logical) UI model consisting of (input and output) fields, which are typically
 * based on model properties, and user action types, defined as named JS methods that can
 * be used as event handlers for UI events.
 *
 * A view model may have a field order definition and field group definitions
 * in the constructor parameter "fields", which is processed into a "fields" map
 * of field definition records and a field order definition list "fieldOrder".
 * The constructor parameter "fields" may contain additional fields not based
 * on model object properties. When a view model is created without a "fields"
 * argument, the view fields are generated from the labeled properties of the
 * underlying model object.
 *
 * In addition to the field definition map "fields", there is a field value map
 * "fieldValues", which has a top-down databinding to corresponding model object
 * properties (via implicit setters). The underlying model object is associated
 * with a view field via the record field "moName" of the corresponding "fields"
 * definition record and the view's map "modelObjects".
 *
 * A view (or 'view model') is a logical representation of the interaction
 * elements of a UI, which typically correspond to properties and methods
 * of a model object. A view consists of (input/output) fields and of user
 * action types, such as "run", "saveSimulationState", etc.
 *
 * A view field has an I/O mode of either "I/O" (input/output) or "O". When a view
 * is rendered, its fields are rendered as HTML UI elements in the following way:
 *
 * 1) ordinary fields as form fields (HTML input/output elements),
 * 2) Boolean fields as HTML checkbox-typed input elements,
 * 3) enumeration and reference fields as choice widgets (radio button groups or
 *    checkbox groups, HTML select elements or other selection list widgets)
 *
 * or as any HTML element that allows for text content, or as special UI widgets
 * (such as calendar date selection widgets or color pickers). User action
 * types are exposed in the form of HTML buttons or other actionable (e.g.
 * clickable) HTML elements.
 *
 * A view's UI with its view-field-based input/output elements and widgets
 * is rendered by invoking the render method on the view. UI fields/widgets are
 * subsequently synchronized with view field values and model object property values
 * by means of a top-down data binding mechanism: value changes of UI fields are
 * propagated to corresponding view fields (typically in a change event listener)
 * and then to model object properties in the setter of the fields.<fld>.value property.
 * TODO: implement this two-step data binding mechanism
 *
 * A user action type is a named JS function where the name indicates the
 * intended meaning of the user action (such as "saveSimulationState"). It
 * binds a UI event type, such as clicking on a button, to a view method as
 * its "event handler".

 * TODO: bottom-up data binding from model object properties to view fields:
 * When a view field is bound to a model object property, its value is updated
 * whenever the corresponding property value of the model object is updated.
 *
 * TODO: Support multiple model objects when using field definitions instead of names
 *
 * A view can be rendered in two different ways:
 * - (normally) By creating all required DOM elements (form elements with controls), and
 *    appending them to the child elements of the body element, if the document
 *    does not contain suitable form elements.
 * - By accessing existing form elements and controls, just setting/updating their
 *    contents (and dynamic parts)
 *
 * Notice that slots.fields is an array of property names or view field definitions
 * while this.fields is a map of view field definitions.
 *
 * Example invocation:

 // create a view based on a single model object
 var view = new oBJECTvIEW({
      modelObject: sim.scenario,
	  // create a horizontal field group
      fields: [["simulationEndTime", "stepDuration", "visualize", "createLog"]],
      userActions: {
        "run": function () {...}
	  }
  })
 // render the view and store its databinding
 view.dataBinding = view.render();

 // create a view based on multiple model objects
 var view = new oBJECTvIEW({
     modelObjects: {"scenario":sim.scenario, "model":sim.model},
	   // create a horizontal field group
     fields: [["scenario.simulationEndTime", "model.timeUnit", "scenario.stepDuration", ...]],
     userActions: {
        "run": function () {...}
	   }
 })
 +
 * @constructor
 * @this {oBJECTvIEW}
 * @param {{modelObject: Object, fields: Array, methods: Map?}}
 *        slots  The view definition slots
 */
/* globals oBJECTvIEW */
var oBJECTvIEW = function (slots) {
  var properties={},
      multipleModelObjects = slots.modelObjects && slots.modelObjects instanceof Object;
  // check oBJECTvIEW definition constraints
  if (!(slots.modelObject && (slots.modelObject instanceof Object)) &&
      !multipleModelObjects) {
    throw ViewConstraintViolation("Creating an object view requires a (set of) model object(s)!");
  }
  if (multipleModelObjects) {
    if (!slots.fields) {
      throw ViewConstraintViolation(
          "A view def with multiple model objects requires field definitions!");
    }
    if (!slots.fields.every( function (fGrp) {
        // turn single field into singleton field group
        if (!Array.isArray(fGrp)) fGrp = [fGrp];
        return fGrp.every( function (f) {
            return typeof f === "string" && f.indexOf(".") > -1;});
        })) {
      throw ViewConstraintViolation("Field definitions based on multiple model objects " +
          "need to be two-part strings with a dot as separator!");
    }
  }
  // check if i18n translation function is defined
  if (typeof i18n !== "object" || !i18n.t) {
    // define dummy function
    i18n = {t: function (txt) {return txt;}}
  }
  if (multipleModelObjects) {
    this.modelObjects = slots.modelObjects;
  } else {
    this.modelObject = slots.modelObject;
    // store the modelObject also in the modelObjects map
    this.modelObjects = {};
    this.modelObjects[slots.modelObject.objectName] = slots.modelObject;
  }
  this.heading = slots.heading;
  // Process the "slots.fields" array (or the properties map) into a "fields" map
  // of view field declarations and a field order definition array "fieldOrder"
  this.fields = {};
  this.fieldValues = {};
  this.fieldOrder = [];
  if (slots.suppressNoValueFields === undefined) this.suppressNoValueFields = true;  // default
  else this.suppressNoValueFields = slots.suppressNoValueFields;
  if (slots.fields) {
    slots.fields.forEach( function (el) {
      var j=0, fld, fldGrp=[], fldOrdEl=[], moName="", mo=null, pos=0;
      // turn single field into singleton field group
      if (!Array.isArray( el)) fldGrp = [el];
      else fldGrp = el;        // field group
      for (j=0; j < fldGrp.length; j++) {
        fld = fldGrp[j];
        if (typeof fld === "string") {  // name of property-induced field
          if (multipleModelObjects) {  // two-part field name
            pos = fld.indexOf(".");
            moName = fld.substring( 0, pos);
            mo = this.modelObjects[moName];
            fld = fld.substring( pos+1);  // proper field name
          } else {
            mo = this.modelObject;
          }
          properties = mo.properties;
          if (!properties[fld]) {
            throw new ViewConstraintViolation(
                "View field "+ fld +" does not correspond to a model property!");
          }
          if (this.suppressNoValueFields && mo[fld] === undefined) continue;
          // else
          this.fields[fld] = util.cloneRecord( properties[fld]);
          // in case range is a JS constructor function or object
          if (typeof properties[fld].range !== "string") {
            if (cLASS[properties[fld].range.Name]) {
              this.fields[fld].range = properties[fld].range.Name;
            } else {
              this.fields[fld].range = properties[fld].range;
            }
          }
          this.fields[fld].moName = mo.objectName;
          this.fields[fld].inputOutputMode = "I/O";
          this.fields[fld].label = i18n.t( this.fields[fld].label);
          if (this.fields[fld].hint) {
            this.fields[fld].hint = i18n.t( this.fields[fld].hint);
          }
          fldOrdEl.push( fld);
        } else if (typeof fld === "object") {  // field definition
          properties = this.modelObject.properties;
          this.fields[fld.name] = {
            moName: this.modelObject.objectName,
            label: i18n.t( fld.label || properties[fld.name].label),
            hint: i18n.t( fld.hint || properties[fld.name].hint),
            range: fld.range || properties[fld.name].range,
            inputOutputMode: fld.inputOutputMode
          };
          fldOrdEl.push( fld.name);
          if (fldGrp.derivationFunction) {
            this.fields[fld.name].derivationFunction = fld.derivationFunction;
          }
          if (fld.optional) this.fields[fld.name].optional = true;
        } else {  // neither property field nor defined field
          throw new ViewConstraintViolation(
              "Neither property field nor defined field: "+ fld);
        }
      }
      if (fldGrp.length === 1) this.fieldOrder.push( fldOrdEl[0]);
      else this.fieldOrder.push( fldOrdEl);
    }, this);
  } else {  // no view field definitions provided in constructor slots
    properties = this.modelObject.properties;
    // create view fields from labeled model properties
    Object.keys( properties).forEach( function (prop) {
      if (properties[prop].label &&
          (!this.suppressNoValueFields ||
           this.modelObject[prop] !== undefined ||
           properties[prop].dependsOn  !== undefined)) {
        this.fieldOrder.push( prop);
        this.fields[prop] = util.cloneRecord( properties[prop]);
        this.fields[prop].inputOutputMode = "I/O";
        this.fields[prop].label = i18n.t( this.fields[prop].label);
        if (this.fields[prop].hint) {
          this.fields[prop].hint = i18n.t( this.fields[prop].hint);
        }
      }
    }, this);
  }
  this.maxNmrOfEnumLitForChoiceButtonRendering =
      slots.maxNmrOfEnumLitForChoiceButtonRendering || 7;
  this.methods = slots.methods || {};
  this.userActions = slots.userActions || {};
  //this.fieldGroupSeparator = slots.fieldGroupSeparator || ", ";
  /**
   * Generic setter for view fields
   * this = view object
   * @method
   * @author Gerd Wagner
   * TODO: what about derived view fields?
   */
  this.methods.set = function (f,v) {
    var el=null, elems=null, i=0,
        mo = this.modelObjects[this.fields[f].moName],
        properties = mo.properties,
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
        uiEl.value = cLASS.getValueAsString( mo, f, v);
      } else {
        v.forEach( function (el,i) {
          var ds = cLASS.getValueAsString( mo, f, el);
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
        if (v.indexOf( parseInt( el.value)) > -1) el.checked = true;
        else el.checked = false;
      }
    } else if (uiEl.tagName === "SELECT" && uiEl.multiple !== "multiple") {
      uiEl.selectedIndex = v;
    } else {
      uiEl.setAttribute("data-value", v);
    }
  };
};
/**
 * Render the HTML form DOM of a model object's view model
 * this = view model object
 * @author Gerd Wagner
 * @method
 * @return {object} dataBinding
 */
oBJECTvIEW.maxCardButtonGroup = 7;
oBJECTvIEW.prototype.render = function (objViewParentEl) {
  var fields = this.fields,  // fields map
      fieldOrder = this.fieldOrder,  // field order array
      mObject = this.modelObject,  // model object
      mObjects = this.modelObjects,  // model objects
      // a map for storing the bindings of UI elems to view fields
      dataBinding = {},
      userActions = this.userActions,
      validateOnInput = true,
      uiElemType = "form", parentEl=null,
      maxELforButton = 7,
      uiContainerEl=null, footerEl=null, i=0;
  /* ==================================================================== */
  /**
   * Create a labeled text field. When validation is not performed on input
   * it is performed on blur in the case of "Create" for catching mandatory
   * value constraint violations, and on change in the case of "Update".
   * @method
   */
  function createLabeledTextField( fld) {
    var fldEl = null, lblEl = document.createElement("label"),
        fDef = fields[fld];   // field definition
    if (fDef.inputOutputMode === "O") {
      fldEl = document.createElement("output");
    } else {
      fldEl = document.createElement("input");
      fldEl.type = "text";
      if (validateOnInput) {
        fldEl.addEventListener("input", function () {
          fldEl.setCustomValidity( cLASS.check( fld, fDef, fldEl.value).message);
        });
      } else {
        fldEl.addEventListener("blur", function () {
          fldEl.setCustomValidity( cLASS.check( fld, fDef, fldEl.value).message);
        });
      }
      fldEl.addEventListener("change", function () {
        var v = fldEl.value;
        if (!validateOnInput) {
          fldEl.setCustomValidity( cLASS.check( fld, fDef, v).message);
        }
        // UI element to model property data binding (top-down)
        if (fldEl.validity.valid) mObjects[fDef.moName][fld] = v;
      });
    }
    // store data binding assignment of UI element to view field
    dataBinding[fld] = fldEl;
    // render text input element
    fldEl.name = fld;
    fldEl.value = typeof mObject[fld] === "object" ? JSON.stringify( mObject[fld]) : mObject[fld] || "";
    fldEl.size = 7;
    if (fields[fld].hint) lblEl.title = fields[fld].hint;
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
        fDef = fields[fld];   // field declaration
    if (fields[fld].inputOutputMode === "O") {
      fldEl = document.createElement("output");
    } else {
      fldEl = document.createElement("input");
      fldEl.type = "checkbox";
      fldEl.addEventListener("change", function () {
        mObjects[fDef.moName][fld] = fldEl.checked;  // UI element to model property data binding
      });
    }
    // store data binding assignment of UI element to view field
    dataBinding[fld] = fldEl;
    fldEl.name = fld;
    fldEl.checked = mObject[fld];
    lblEl.textContent = fields[fld].label;
    if (fields[fld].hint) lblEl.title = fields[fld].hint;
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
    // store data binding of UI element
    dataBinding[fld] = containerEl;
    // if maxCard is defined, use checkboxes
    if (fields[fld].maxCard) {
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
      if (btnType === "radio" && mObject[fld] === j+1) {
        el.firstElementChild.checked = true;  // el is a label element
      }
      containerEl.appendChild( el);
      el.firstElementChild.addEventListener("click", function (e) {
        // UI element to model property data binding (top-down)
        var btnEl = e.target, i=0,
            val = parseInt( btnEl.value);
        if (btnType === "radio") {
          if (val !== mObject[fld]) {
            mObject[fld] = val;
          } else if (fields[fld].optional) {
            // turn off radio button
            btnEl.checked = false;
            mObject[fld] = undefined;
          }
        } else {  // checkbox
          i = mObject[fld].indexOf( val);
          if (i > -1) {  // delete from value list
            mObject[fld].splice(i, 1);
          } else {  // add to value list
            mObject[fld].push( val);
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
    var choiceItems = [],
        selEl = document.createElement("select"),
        lblEl = document.createElement("label"),
        range  = fields[fld].range;
    lblEl.textContent = fields[fld].label;
    lblEl.appendChild( selEl);
    selEl.setAttribute("data-bind", fld);
    // store data binding assignment of UI element to view field
    dataBinding[fld] = selEl;
    // if maxCard is defined, make a multi-selection list
    if (fields[fld].maxCard) selEl.multiple = "multiple";
    if (range instanceof eNUMERATION) {
      choiceItems = range.labels;
    } else if (Array.isArray(range)) {  // range is an ad-hoc enumeration
      choiceItems = range;
    } else {  // range is an entity type
      choiceItems = Object.keys( range.instances);
    }
    dom.fillSelectWithOptionsFromArrayList( selEl, choiceItems);
    selEl.addEventListener("change", function () {
      // UI element to model property data binding (top-down)
      if (selEl.value !== "") {
        if (oBJECTvIEW.isIntegerType( range)) {
          mObject[fld] = parseInt( selEl.value);
          // increment by 1 for enumerations
          if (range instanceof eNUMERATION) mObject[fld]++;
        } else if (fields[fld].range === "Date") {
          mObject[fld] = new Date( selEl.value);
        } else {
          mObject[fld] = selEl.value;
        }
      }
    });
    return lblEl;
  }
  /**
   * Create UI elements for view fields
   * depends on: fieldOrder
   * @method
   */
  function createUiElemsForVmFields() {
    //============= Inner Function ==============================
    function createUiElemForVmField (containerEl, fld) {
      var fDef = fields[fld],
          range = fDef.range,
          isEnum = range instanceof eNUMERATION,
          isArr = Array.isArray( range);
      // convert cLASS Name to cLASS object
      if (typeof range === "string" && cLASS[range]) range = cLASS[range];
      // retrieve model object for views based on multiple model objects
      if (mObjects) mObject = mObjects[fDef.moName];
      if (isEnum || isArr) {  // (ad-hoc) enumeration
        if (isEnum && range.MAX <= maxELforButton ||
            isArr && range.length <= maxELforButton) {
          containerEl = createChoiceButtonGroup( fld);
          if (!containerEl.className) containerEl.className = "choice";
        } else {
          if (!containerEl.className) containerEl.className = "select";
          containerEl.appendChild( createSelectionList( fld));
        }
      } else if (range && range.constructor === cLASS && range.isComplexDatatype) {
        if (fDef.maxCard && fDef.maxCard > 1) {
          if (!containerEl.className) containerEl.className = "RecordTableWidget";
          containerEl.appendChild( oBJECTvIEW.createRecordTableWidget(
              {type: range, records: mObject[fld], tableTitle: fDef.label}));
        }
      } else if (range === "Boolean") {
        if (!containerEl.className) containerEl.className = "yes-no-field";
        containerEl.appendChild( createLabeledYesNoField( fld));
      } else {  // string/numeric property field
        if (!containerEl.className) containerEl.className = "I-O-field";
        containerEl.appendChild( createLabeledTextField( fld));
      }
      if (fDef.dependsOn) {
        if (mObject[fDef.dependsOn]) containerEl.style.display = "block";
        else containerEl.style.display = "none";
        dataBinding[fDef.dependsOn].addEventListener("change", function () {
          // toggle CSS style.display of containerEl
          containerEl.style.display = (containerEl.style.display === "none") ? "block" : "none";
        });
      }
    }
    //=========================================================
    fieldOrder.forEach( function (fldOrdEl) {
      var containerEl = document.createElement("div");
      if (!Array.isArray( fldOrdEl)) {  // single field
        createUiElemForVmField( containerEl, fldOrdEl);
      } else {  // field group
        containerEl.className = "field-group";
        fldOrdEl.forEach( function (fld) {
          createUiElemForVmField( containerEl, fld);
        });
      }
      uiContainerEl.appendChild( containerEl);
    });
  }
  /**
   * Create UI elements (like buttons) for all user actions of the view
   * depends on: fieldOrder
   * @method
   */
  function createUiElemsForUserActions( parentEl) {
    var containerEl = dom.createElement("div", {
      classValues:"action-group"
    });
    Object.keys( userActions).forEach( function (usrAct) {
      var renderActBtn = typeof userActions[usrAct].showCondition !== "function" ||
          userActions[usrAct].showCondition();
      if (renderActBtn) {
        containerEl.appendChild( dom.createButton({
          name: usrAct,
          label: userActions[usrAct].label || util.capitalizeFirstChar( usrAct),
          title: userActions[usrAct].hint,
          handler: userActions[usrAct]
        }));
        parentEl.appendChild( containerEl);
      }
    });
  }
  /* ==================================================================== */
  /* MAIN CODE of render                                                  */
  /* ==================================================================== */
  // check if objView is descendant of a "form" element
  parentEl = objViewParentEl;
  while (parentEl && parentEl.tagName !== "BODY") {
    if (parentEl.tagName === "FORM") {
      uiElemType = "div";
      break;
    } else {
      parentEl = parentEl.parentElement;
    }
  }
  uiContainerEl = dom.createElement(
    uiElemType,
    {id: this.modelObject ?
         this.modelObject.objectName : Object.keys( this.modelObjects)[0],
     classValues:"oBJECTvIEW"}
   );
  if (this.heading) {
    uiContainerEl.appendChild( dom.createElement("h2", {content:this.heading}));
  }
  // store the object view's DOM element
  this.domElem = uiContainerEl;
  if (!objViewParentEl) objViewParentEl = document.querySelector("#uiContainerEl");
  if (!objViewParentEl) {
    objViewParentEl = document.body;
    footerEl = document.querySelector("html>body>footer");
    if (footerEl) {
      document.body.insertBefore( uiContainerEl, footerEl);
    } else {
      document.body.appendChild( uiContainerEl);
    }
  } else objViewParentEl.appendChild( uiContainerEl);
  if (uiContainerEl.tagName === "FORM") {  // reset custom validity
    for (i=0; i < uiContainerEl.elements.length; i++) {
      uiContainerEl.elements[i].setCustomValidity("");
    }
    uiContainerEl.reset();
  }
  // create DOM elements for all UI/view fields
  createUiElemsForVmFields();
  // create DOM elements (like buttons) for all user actions of the UI/view model
  createUiElemsForUserActions( uiContainerEl);
  return dataBinding;  // a map of field names to corresponding DOM elements 
};
/**
 * Set up a tabular UI for defining/editing entity records of a given
 * entity type or data records of a given complex datatype
 * @author Gerd Wagner
 * @method
 * @param slots.type  a cLASS
 * @param slots.records?  a collection (array list or map) of records
 * @return {object}  the created DOM element object
 */
oBJECTvIEW.createRecordTableWidget = function (slots) {
  var tableEl = dom.createElement("table", {classValues: "RecTbl"});
  var headerRowEl=null, cell=null, rowIdx=0, obj=null, rowEl=null, N=0,
      rowObjects=[], colProperties=[],  colHeadings=[], colTypes=[],
      maxNmrOfRows = slots.maxNmrOfRows || 13,  // default is 13
      tBody = document.createElement("tBody"),
      Class=null, propDefs=null, tableTitle = "",
      keys=[], records=null, nmrOfRecords=0, p="";
  if (!slots.type) {
    throw Error("No type provided when calling 'createRecordTableWidget'!")
  }
  // convert cLASS name to cLASS object reference
  if (typeof slots.type === "string" && cLASS[slots.type]) {
    Class = cLASS[slots.type];
  } else if (slots.type.constructor === cLASS) {
    Class = slots.type;
  } else {
    throw Error("No cLASS type provided when calling 'createRecordTableWidget'!")
  }
  propDefs = Class.properties;
  tableEl.appendChild( tBody);
  tableTitle = i18n.t( slots.tableTitle || Class.label || Class.Name);
  if (!Class.isComplexDatatype) {
    if (slots.editableProperties) colProperties = slots.editableProperties;
    records = slots.records || Class.instances;
    keys = Object.keys( records);
    nmrOfRecords = keys.length;
  } else if (Array.isArray( slots.records)) {
    records = slots.records || [];
    nmrOfRecords = records.length;
  } else if (typeof slots.records === "object") { // a map
    records = slots.records || {};
    keys = Object.keys( records);
    nmrOfRecords = keys.length;
  }
  if (propDefs.id) {
    if (propDefs.name) colHeadings[0] = "ID/Name";
    else colHeadings[0] = "ID";
  } else if (propDefs.name) {
    colHeadings[0] = "Name";
  }
  // loop over all property definitions (including inherited ones)
  for (p in propDefs) {
    if (p !== "id" && p !== "name" && propDefs[p].label) {
      colProperties.push( p);
      colHeadings.push( i18n.t( propDefs[p].label));
      colTypes.push( propDefs[p].range);
    }
  }
  // store properties displayed in table  TODO: currently not used...
  tableEl.setAttribute("data-properties", colProperties.join(" "));
  // create table heading
  tableEl.appendChild( document.createElement("thead"));
  // create row for table name
  headerRowEl = tableEl.tHead.insertRow();
  cell = headerRowEl.insertCell();
  cell.textContent = tableTitle;
  cell.colSpan = colHeadings.length;
  // create row for column names
  headerRowEl = tableEl.tHead.insertRow();
  // create table column headings
  colHeadings.forEach( function (cH) {
    var c = headerRowEl.insertCell();
    c.textContent = cH;
  });
  // create table rows
  N = Math.min( nmrOfRecords, maxNmrOfRows);
  for (rowIdx=0; rowIdx < N; rowIdx++) {
    obj = keys.length>0 ? records[keys[rowIdx]] : records[rowIdx];
    rowEl = tBody.insertRow();
    // create object row
    rowObjects[rowIdx] = obj;
    if (obj.id) {
      rowEl.insertCell().textContent = obj.name ? obj.id +" / "+ obj.name : obj.id;
    } else if (obj.name) {
      rowEl.insertCell().textContent = obj.name;
    }
    // create property value cells
    colProperties.forEach( function (p) {
      var c=null;
      c = rowEl.insertCell();
      //c.textContent = cLASS.convertPropValToStr( Class, p, obj[p]);
      c.textContent = obj.getValueAsString( p);
      // save value for being able to restore it
      c.setAttribute("data-oldVal", c.textContent);
      if (!propDefs || !propDefs[p].stringified) {
        c.setAttribute("contenteditable","true");
        c.title = "Click to edit!";
      }
      c.addEventListener("blur", function (e) {
        var tdEl = e.target,
            val = tdEl.textContent,
            colNo = tdEl.cellIndex - 1, // skip first column (name/ID)
            rowNo = tdEl.parentElement.rowIndex - 2,  // rowIndex includes 2 tHead rows
            prop = colProperties[colNo],
            constrVio = cLASS.check( prop, propDefs[prop], val);
        if (constrVio.message) {
          alert( constrVio.message);
          tdEl.textContent = tdEl.getAttribute("data-oldVal");
        } else {
          val = constrVio.checkedValue;
          // update corresponding object slot
          rowObjects[rowNo][prop] = val;
          tdEl.setAttribute("data-oldVal", tdEl.textContent);
        }
      });
    });
  }
  // create an overflow indication row
  if (nmrOfRecords > maxNmrOfRows) {
    rowEl = tBody.insertRow();
    if (obj.id) rowEl.insertCell().textContent = "...";
    Object.keys( propDefs).forEach( function (p) {
      var c=null;
      if (colProperties.includes( p)) {
        c = rowEl.insertCell();
        c.textContent = "...";
      }
    });
  }
  // create an AddRow button
  //oBJECTvIEW.createUiElemsForUserActions( popTableEl, this.userActions);
  return tableEl;
};
/**
 * Create UI elements (like buttons) for all user actions of the view
 * depends on: fieldOrder
 * @method
 */
oBJECTvIEW.createUiElemsForUserActions = function (userActions) {
  var containerEl = dom.createElement("div", {
    classValues:"action-group"
  });
  Object.keys( userActions).forEach( function (usrAct) {
    containerEl.appendChild( dom.createButton({
      name: usrAct,
      label: userActions[usrAct].label || util.capitalizeFirstChar( usrAct),
      handler: userActions[usrAct]
    }));
  });
  return containerEl;
};
/**
 * Render an HTML form based on a view model (an abstract UI definition)
 *
 * The viewModel.fieldValues map holds the name-value slots of fields that
 * have been changed in the UI.
 *
 * @author Gerd Wagner
 * @method
 */
oBJECTvIEW.createUiFromViewModel = function (viewModel) {
  var outFields = viewModel.outputFields || {},  // map of field definitions
      inFields = viewModel.inputFields || {},  // map of field definitions
      fields = {},
      // list of field names or field name lists
      fieldOrder = viewModel.fieldOrder ||
          Object.keys( outFields).concat( Object.keys( inFields)),
      fieldValues = viewModel.fieldValues,
      userActions = viewModel.userActions || {},
      // a map for storing the bindings of view fields to UI elems/widgets
      dataBinding = {},
      validateOnInput = viewModel.validateOnInput || true,
      fldGrpSep = viewModel.fieldGroupSeparator,
      uiContainerEl=null;
  /* ==================================================================== */
  /**
   * Create a labeled text field. When validation is not performed on input
   * it is performed on blur in the case of "Create" for catching mandatory
   * value constraint violations, and on change in the case of "Update".
   * @method
   */
  function createLabeledTextField( fld) {
    var fldEl = null, lblEl = document.createElement("label"),
        fldDef = fields[fld],   // field declaration
        range = fldDef.range;
    if (fldDef.inputOutputMode === "O") {
      fldEl = document.createElement("output");
    } else {
      fldEl = document.createElement("input");
      if (cLASS.isIntegerType( range) || cLASS.isDecimalType( range)) {
        fldEl.type = "number";
        if (cLASS.isDecimalType( range)) {
          if (!isNaN( parseInt( fldDef.decimalPlaces))) {
            fldEl.step = "0." + "000000000".substring( 0, fldDef.decimalPlaces-1) + "1";
          } else fldEl.step = "0.01";  // default
        }
      } else fldEl.type = "text";
      if (validateOnInput) {
        fldEl.addEventListener("input", function () {
          fldEl.setCustomValidity( cLASS.check( fld, fldDef, fldEl.value).message);
        });
      } else {
        fldEl.addEventListener("blur", function () {
          fldEl.setCustomValidity( cLASS.check( fld, fldDef, fldEl.value).message);
        });
      }
      fldEl.addEventListener("change", function () {
        var v = fldEl.value, validationResult = {};
        if (typeof fldDef.str2val === "function") v = fldDef.str2val(v);
        validationResult = cLASS.check( fld, fldDef, v);
        if (!validateOnInput) fldEl.setCustomValidity( validationResult.message);
        // UI element to view model property data binding (top-down)
        if (fldEl.validity.valid) fieldValues[fld] = validationResult.checkedValue;
      });
    }
    // store data binding assignment of UI element to view field
    dataBinding[fld] = fldEl;
    // render text input element
    fldEl.name = fld;
    if (typeof fldDef.value === "function") {
      fldEl.value = fldDef.value();
    } else if (typeof fldDef.val2str === "function") {
      fldEl.value = fldDef.val2str( fldDef.value);
    } else if (typeof fldDef.value === "object") {
      fldEl.value = JSON.stringify( fldDef.value);
    } else {
      fldEl.value = fieldValues[fld] || fldDef.value || fldDef.initialValue || "";
    }
    fldEl.size = fldDef.inputFieldSize || 7;
    if (fldDef.hint) lblEl.title = fldDef.hint;
    lblEl.textContent = fldDef.label;
    lblEl.appendChild( fldEl);
    return lblEl;
  }
  /**
   * Create a labeled Yes/No field.
   * @method
   */
  function createLabeledYesNoField( fld) {
    var fldEl = null, lblEl = document.createElement("label");
    if (fields[fld].inputOutputMode === "O") {
      fldEl = document.createElement("output");
    } else {
      fldEl = document.createElement("input");
      fldEl.type = "checkbox";
      fldEl.addEventListener("change", function () {
        fieldValues[fld] = fldEl.checked;  // UI element to view model property data binding
      });
    }
    // store data binding assignment of UI element to view field
    dataBinding[fld] = fldEl;
    fldEl.name = fld;
    fldEl.checked = fieldValues[fld];
    lblEl.textContent = fields[fld].label;
    if (fields[fld].hint) lblEl.title = fields[fld].hint;
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
        range = fields[fld].range,
        val = fieldValues[fld] || fields[fld].initialValue;
    el = document.createElement("legend");
    el.textContent = fields[fld].label;
    containerEl = document.createElement("fieldset");
    containerEl.appendChild( el);
    containerEl.setAttribute("data-bind", fld);
    // store data binding of UI element
    dataBinding[fld] = containerEl;
    // if maxCard is defined, use checkboxes
    if (fields[fld].maxCard) {
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
      if (btnType === "radio" && val === j+1) {
        el.firstElementChild.checked = true;  // el is a label element
      }
      containerEl.appendChild( el);
      el.firstElementChild.addEventListener("click", function (e) {
        // data binding of UI element to model property (top-down)
        var btnEl = e.target, i=0,
            val = parseInt( btnEl.value);
        if (btnType === "radio") {
          if (val !== fieldValues[fld]) {
            fieldValues[fld] = val;
          } else if (fields[fld].optional) {
            // turn off radio button
            btnEl.checked = false;
            fieldValues[fld] = undefined;
          }
        } else {  // checkbox
          i = fieldValues[fld].indexOf( val);
          if (i > -1) {  // delete from value list
            fieldValues[fld].splice(i, 1);
          } else {  // add to value list
            fieldValues[fld].push( val);
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
    var choiceItems = [],
        selEl = document.createElement("select"),
        lblEl = document.createElement("label"),
        range  = fields[fld].range;
    lblEl.textContent = fields[fld].label;
    lblEl.appendChild( selEl);
    selEl.setAttribute("data-bind", fld);
    // store data binding assignment of UI element to view field
    dataBinding[fld] = selEl;
    // if maxCard is defined, make a multi-selection list
    if (fields[fld].maxCard) selEl.multiple = "multiple";
    if (range instanceof eNUMERATION) {
      choiceItems = range.labels;
    } else if (Array.isArray(range)) {  // range is an ad-hoc enumeration
      choiceItems = range;
    } else {  // range is an entity type
      choiceItems = Object.keys( range.instances);
    }
    dom.fillSelectWithOptionsFromArrayList( selEl, choiceItems);
    selEl.addEventListener("change", function () {
      // UI element to model property data binding (top-down)
      if (selEl.value !== "") {
        if (oBJECTvIEW.isIntegerType( range)) {
          fieldValues[fld] = parseInt( selEl.value);
          // increment by 1 for enumerations
          if (range instanceof eNUMERATION) fieldValues[fld]++;
        } else if (fields[fld].range === "Date") {
          fieldValues[fld] = new Date( selEl.value);
        } else {
          fieldValues[fld] = selEl.value;
        }
      }
    });
    return lblEl;
  }
  /**
   * Create UI elements for view fields
   * depends on: fieldOrder
   * @method
   */
  function createUiElemsForVmFields() {
    //============= Inner Function ==============================
    function createUiElemForVmField (containerEl, fld) {
      var range = fields[fld].range,
          isEnum = range instanceof eNUMERATION,
          isArr = Array.isArray( range);
      if (isEnum || isArr) {  // (ad-hoc) enumeration
        if (isEnum && range.MAX <= oBJECTvIEW.maxCardButtonGroup ||
            isArr && range.length <= oBJECTvIEW.maxCardButtonGroup) {
          containerEl.appendChild( createChoiceButtonGroup( fld));
          if (!containerEl.className) containerEl.className = "choice";
        } else {
          if (!containerEl.className) containerEl.className = "select";
          containerEl.appendChild( createSelectionList( fld));
        }
      } else if (range === "Boolean") {
        if (!containerEl.className) containerEl.className = "yes-no-field";
        containerEl.appendChild( createLabeledYesNoField( fld));
      } else {  // string/numeric property field
        if (!containerEl.className) containerEl.className = "I-O-field";
        containerEl.appendChild( createLabeledTextField( fld));
      }
      if (fields[fld].dependsOn) {
        if (fieldValues[fields[fld].dependsOn]) containerEl.style.display = "block";
        else containerEl.style.display = "none";
        dataBinding[fields[fld].dependsOn].addEventListener("change", function () {
          // toggle CSS style.display of containerEl
          containerEl.style.display = (containerEl.style.display === "none") ? "block" : "none";
        });
      }
    }
    //=========================================================
    fieldOrder.forEach( function (fldOrdEl) {
      var containerEl = document.createElement("div");
      if (!Array.isArray( fldOrdEl)) {  // single field
        createUiElemForVmField( containerEl, fldOrdEl);
      } else {  // field group
        containerEl.className = "field-group";
        fldOrdEl.forEach( function (fld) {
          createUiElemForVmField( containerEl, fld);
        });
      }
      uiContainerEl.appendChild( containerEl);
    });
  }
  /**
   * Create UI elements (like buttons) for all user actions of the view
   * depends on: fieldOrder
   * @method
   */
  function createUiElemsForUserActions( parentEl) {
    var containerEl = dom.createElement("div", {
      classValues:"action-group"
    });
    Object.keys( userActions).forEach( function (usrAct) {
      containerEl.appendChild( dom.createButton({
        name: usrAct,
        label: userActions[usrAct].label || util.capitalizeFirstChar( usrAct),
        handler: userActions[usrAct]
      }));
      parentEl.appendChild( containerEl);
    });
  }
  /* ====================================================================
     M A I N
     ==================================================================== */
  if (!fieldValues) fieldValues = viewModel.fieldValues = {};
  Object.keys( outFields).forEach( function (fld) {
    outFields[fld].inputOutputMode = "O";
  });
  fields = util.mergeObjects( outFields, inFields);
  uiContainerEl = dom.createElement("form");
  if (viewModel.formID) uiContainerEl.id = viewModel.formID;
  if (viewModel.title) {
    uiContainerEl.appendChild( dom.createElement("h1", {content:viewModel.title}));
  }
  // store the view model's DOM element
  viewModel.domElem = uiContainerEl;
  /*
  // reset custom validity
  for (i=0; i < uiContainerEl.elements.length; i++) {
    uiContainerEl.elements[i].setCustomValidity("");
  }
  uiContainerEl.reset();
  */
  // create UI elements for all view fields
  createUiElemsForVmFields();
  // create actionable UI elements (like buttons) for all user actions of the view model
  createUiElemsForUserActions( uiContainerEl);
  // store the view model's data binding (map field names to corresponding DOM elements)
  viewModel.dataBinding = dataBinding;
  return uiContainerEl;
};

