 /**
 * @fileOverview  A library of DOM element creation methods and 
 * other DOM manipulation methods.
 * 
 * @author Gerd Wagner
 */

const dom = {
  /**
   * Create an element
   *
   * @param {string} elemType
   * @param {object} slots
   * @return {object}
   */
  createElement: function (elemType, slots) {
    var el = document.createElement( elemType);
    if (slots) {
      if (slots.id) el.id = slots.id;
      if (slots.classValues) el.className = slots.classValues;
      if (slots.title) el.title = slots.title;
      if (slots.content) el.innerHTML = slots.content;
      if (slots.borderColor) el.style.borderColor = slots.borderColor;
    }
    return el;
  },
   /**
    * Create a time element from a Date object
    *
    * @param {object} d
    * @return {object}
    */
   createTime: function (d) {
     var tEl = document.createElement("time");
     tEl.textContent = d.toLocaleDateString();
     tEl.setAttribute("datetime", d.toISOString());
     return tEl;
   },
   /**
    * Create an img element
    * 
    * @param {string} id
    * @param {string} classValues
    * @param {object} content
    * @return {object}
    */
    createImg: function (slots) {
      var el = document.createElement("img");
      el.src = slots.src;
      if (slots.id) el.id = slots.id;
      if (slots.classValues) el.className = slots.classValues;
      return el;
    },
  /**
   * Create an option element
   * 
   * @param {object} content
   * @return {object}
   */
  createOption: function (slots) {
    var el = document.createElement("option");
    if (slots.text) el.textContent = slots.text;
    if (slots.value !== undefined) el.value = slots.value;
    return el;
  },
  /**
   * Create a button element
   * 
   * @param {string} id
   * @param {string} classValues
   * @param {object} content
   * @return {object}
   */
  createButton: function (slots) {
    var el = document.createElement("button");
    if (!slots.type) el.type = "button";
    else el.type = slots.type;
    if (slots.id) el.id = slots.id;
    if (slots.name) el.name = slots.name;
    if (slots.classValues) el.className = slots.classValues;
    if (slots.title) el.title = slots.title;
    if (slots.handler) el.addEventListener( 'click', slots.handler);
    if (slots.content) el.innerHTML = slots.content;
    else el.textContent = slots.label || slots.name;
    return el;
  },
   /**
    * Create a menu item (button) element
    *
    * @param {string} id
    * @param {string} classValues
    * @param {object} content
    * @return {object}
    */
   createMenuItem: function (slots) {
     var liEl = document.createElement("li"),
         buttonEl = document.createElement("button");
     buttonEl.type = "button";
     if (slots.id) liEl.id = slots.id;
     if (slots.classValues) liEl.className = slots.classValues;
     if (slots.content) buttonEl.innerHTML = slots.content;
     liEl.appendChild( buttonEl);
     return liEl;
   },
  /**
   * Create a labeled output field
   * 
   * @param {{labelText: string, name: string?, value: string?}}
   *        slots  The view definition slots.
   * @return {object}
   */
  createLabeledOutputField: function (slots) {
    var outpEl = document.createElement("output"),
        lblEl = document.createElement("label");
    if (slots.name) outpEl.name = slots.name;
    if (slots.value !== undefined) outpEl.value = slots.value;
    lblEl.textContent = slots.labelText;
    lblEl.appendChild( outpEl);
    return lblEl;
  },
  /**
   * Create a labeled input field
   *
   * @param  slots  The view definition slots.
   * @return {object}
   */
  createLabeledInputField: function (slots) {
    var inpEl = document.createElement("input"),
        lblEl = document.createElement("label");
    if (slots.name) inpEl.name = slots.name;
    if (slots.type) inpEl.type = slots.type;
    if (slots.id) inpEl.id = slots.id;
    else inpEl.type = "text";
    if (slots.value !== undefined) inpEl.value = slots.value;
    if (slots.disabled) inpEl.disabled = "disabled";
    lblEl.textContent = slots.labelText;
    lblEl.appendChild( inpEl);
    return lblEl;
  },
  /**
  * Create a radio button or checkbox element
  *
  * @return {object}
  */
  createLabeledChoiceControl: function (t,n,v,lblTxt) {
    var ctrlEl = document.createElement("input"),
        lblEl = document.createElement("label");
    ctrlEl.type = t;
    ctrlEl.name = n;
    ctrlEl.value = v;
    lblEl.appendChild( ctrlEl);
    lblEl.appendChild( !lblTxt.includes("</") ?
        document.createTextNode( lblTxt) :
        dom.createElement("div", {content: lblTxt})
    );
    return lblEl;
  },
  /**
  * Create a labeled select element
  *
  * @return {object}
  */
  createLabeledSelect: function (slots) {
    var selEl = document.createElement("select"),
        lblEl = document.createElement("label");
    if (slots.name) selEl.name = slots.name;
    if (slots.index !== undefined) selEl.index = slots.index;
    lblEl.textContent = slots.labelText;
    lblEl.appendChild( selEl);
    return lblEl;
  },
   /**
    * Create option elements from a list of text items (or a map of
    * value/text pairs) and insert them into a selection list element
    *
    * @param {object} selEl  A select(ion list) element
    * @param {object} options  A list of strings, or a map of value/text pairs
    * @param {object} selection?  A list of already selected option values
    */
   fillSelectWithOptions: function (selEl, options, selection) {
     selEl.innerHTML = "";
     if (!selEl.multiple) {
       selEl.add( dom.createOption({text:" --- ", value:""}), null);
     }
     if (Array.isArray( options)) {
       for (const optionText of options) {
         const optEl = dom.createOption({text: optionText, value: optionText});
         if (selEl.multiple) {
           if (selection && selection.includes( optionText)) {
             // flag the option element with this value as selected
             optEl.selected = true;
           }
         }
         selEl.add( optEl, null);
       }
     } else if (typeof options === "object") {
       for (const [v,t] of Object.entries( options)) {
         const optEl = dom.createOption({text: t, value: v});
         if (selEl.multiple) {
           if (selection && selection.includes( v)) {
             // flag the option element with this value as selected
             optEl.selected = true;
           }
         }
         selEl.add( optEl, null);
       }
     }
   },
   /**
    * Create option elements from a map of ID values to entity objects/records
    * and insert them into a selection list element
    *
    * @param {object} selEl  A select(ion list) element
    * @param {object} entityMap  A map of entity IDs to entity records
    * @param {object} optPar  A record of optional parameters
    */
   fillSelectWithOptionsFromEntityMap: function (selEl, entityMap, optPar) {
     var i=0, keys=[], obj={}, optEl=null, txt="";
     selEl.innerHTML = "";
     if (!optPar || !optPar.noVoidOption) {
       selEl.add( dom.createOption({value:"", text:"---"}), null);
     }
     keys = Object.keys( entityMap);
     for (i=0; i < keys.length; i++) {
       obj = entityMap[keys[i]];
       if (optPar && optPar.displayProp) txt = obj[optPar.displayProp];
       else txt = obj.id;
       optEl = dom.createOption({ value: obj.id, text: txt });
       // if invoked with a selection argument, flag the selected options
       if (selEl.multiple && optPar && optPar.selection &&
           optPar.selection[keys[i]]) {
         // flag the option element with this value as selected
         optEl.selected = true;
       }
       selEl.add( optEl, null);
     }
   },
   /**
    * Create option elements from a map of objects
    * and insert them into a selection list element
    *
    * @param {object} selEl  A select(ion list) element
    * @param {object} entityTable  A map of objects
    * @param {string} idAttr  The standard identifier property
    * @param {string} displayAttrib?  An optional property supplying the text
    *                 to be displayed for each object
    */
   fillSelectWithOptionsFromEntityTable: function (selEl, entityTable,
                                                   idAttr, displayAttrib) {
     selEl.innerHTML = "";
     selEl.appendChild( dom.createOption({text:" --- ", value:""}));
     for (const entityId of Object.keys( entityTable)) {
       const obj = entityTable[entityId];
       let  txt = obj[idAttr];
       if (displayAttrib) txt += " : "+ obj.getValueOfPathExpression( displayAttrib);
       selEl.add( dom.createOption({text: txt, value: obj[idAttr]}), null);
     }
   },
   /**
    * Create back button
    *
    * @param  {object} slots  The view definition slots.
    * @return {object}  container element object with button child element
    */
   createBackButton: function (slots) {
     var backButtonEl = document.createElement("button"),
         containerEl = document.createElement("div");
     backButtonEl.type = "button";
     backButtonEl.name = "backButton";
     if (slots && slots.label) backButtonEl.textContent = slots.label;
     else backButtonEl.textContent = "Back to menu";
     if (slots) {
       if (slots.classValues) containerEl.className = slots.classValues;
       if (slots.handler) backButtonEl.addEventListener( 'click', slots.handler);
     }
     containerEl.appendChild( backButtonEl);
     return containerEl;
   },
   /**
    * Create submit button and back/cancel button
    *
    * @param  {object} slots  The view definition slots.
    * @return {object}  container element object with button child elements
    */
   createCommitAndBackButtons: function (slots) {
     var submitButtonEl = document.createElement("button"),
         backButtonEl = document.createElement("button"),
         containerEl = document.createElement("div");
     if (slots && slots.label) submitButtonEl.textContent = slots.label;
     else submitButtonEl.textContent = "Submit";
     submitButtonEl.type = "submit";
     submitButtonEl.name = "submitButton";
     backButtonEl.textContent = "Back to menu";
     backButtonEl.type = "button";
     backButtonEl.name = "backButton";
     if (slots && slots.classValues) containerEl.className = slots.classValues;
     containerEl.appendChild( submitButtonEl);
     containerEl.appendChild( backButtonEl);
     return containerEl;
   },
   /**
    * Create table element with thead and tbody
    *
    * @param {string} classValues
    * @return {object}  tbody element object
    */
   createTable: function (slots) {
     var el=null;
     const tableEl = document.createElement("table");
     if (slots?.classValues) tableEl.className = slots.classValues;
     el = document.createElement("thead");
     tableEl.appendChild( el);
     el = document.createElement("tbody");
     tableEl.appendChild( el);
     return tableEl;
   }
};
export default dom;