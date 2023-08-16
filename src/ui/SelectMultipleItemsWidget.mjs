import eNUMERATION from "../eNUMERATION.mjs";

/**
 * A Select-Multiple-Items widget contains
 * 1) a list of selected items, where each item has a delete button,
 * 2) a div containing a select element and an add button allowing to add a selected item
 *    to the selected items list
 *
 * @param {object} selection  A list for populating the list of selected items
 * @param {object} selectionRange  Either a list of alphanumeric values, an enumeration or an
 *                 entity table (map of business objects) for populating the selection list
 * @param {string} idAttr?  The standard identifier attribute of the entity table
 * @param {string} displayAttr? The attribute to be shown in (selection) lists,
 *                 possibly in addition to the idAttr
 * @param {string} minCard? The minimum cardinality of the list of selected items
 * @param {object} view?  The view, to which this widget is bound
 */
class SelectMultipleItemsWidget extends HTMLElement {
  static deleteButtonIconCharacter = "✕";
  constructor({name, selectionRange, selection,
                idAttr, displayAttr, minCard=0, selectionRangeFilter, view}) {
    super();
    this.name = name;  // the widget's name is also the name of its underlying view field
    if (selectionRange) this.selectionRange = selectionRange;
    else throw new Error(`The 'selectionRange' was not specified!`);
    if (!Array.isArray(selectionRange) && !(selectionRange instanceof eNUMERATION) &&
        !(typeof selectionRange === "object" && idAttr)) {
      throw new Error(`The 'selectionRange' ${JSON.stringify(selectionRange)} is invalid.
        If it's an entity table, it requires specifying an 'idAttr'!`);
    }
    if (selection) this.selection = selection;
    else this.selection = [];
    if (idAttr) {
      this.idAttr = idAttr;
      this.displayAttr = displayAttr || idAttr;
    }
    this.minCard = minCard;
    if (view) this.view = view;
    if (selectionRangeFilter) this.selectionRangeFilter = selectionRangeFilter;
    // define properties for storing important element references
    this.selectedItemsListEl = null;
    this.selectEl = null;
    // create shadow DOM root object and assign it to this.shadowRoot
    this.attachShadow({mode:"open"});
    // bind event handlers to "this" widget object
    this.handleSelectedItemsListButtonClickEvents =
        this.handleSelectedItemsListButtonClickEvents.bind( this);
    this.handleSelectionListAddButtonClickEvents =
        this.handleSelectionListAddButtonClickEvents.bind( this);
  }
  handleSelectedItemsListButtonClickEvents(e) {
    if (e.target.tagName === "BUTTON") {  // delete or undo button
      const btnEl = e.target,
            listItemEl = btnEl.parentElement,
            valueStr = listItemEl.getAttribute("data-value"),
            selectedItemsListEl = listItemEl.parentElement;
      let value;
      if (this.selectionRange instanceof eNUMERATION) value = parseInt( valueStr);
      else if (Array.isArray( this.selectionRange)) value = valueStr;
      else {
        const selRange = this.selectionRange,
              Class = selRange[Object.keys(selRange)[0]].constructor,
              idAttr = Class.idAttribute;
        value = selRange[valueStr][idAttr];
      }
      if (listItemEl.classList.contains("removed")) {  // undo a previous removal
        this.selection.push( value);
        listItemEl.classList.remove("removed");
        // change button text
        btnEl.textContent = SelectMultipleItemsWidget.deleteButtonIconCharacter;
      } else {  // undo a previous addition or delete an item
        if (listItemEl.classList.contains("added")) {  // undo a previous addition
          // removing a previously added item requires moving it back to the selection list
          listItemEl.parentNode.removeChild( listItemEl);
          const optionEl = document.createElement("option");
          optionEl.value = listItemEl.getAttribute("data-value");
          optionEl.text = listItemEl.firstElementChild.textContent;
          this.selectEl.add( optionEl);
        } else {  // delete an item
          if (selectedItemsListEl.children.length <= this.minCard) {
            alert(`Selection must have at least ${this.minCard} items!`);
            return;
          }
          listItemEl.classList.add("removed");
          // change button text
          btnEl.textContent = "⎌";  // Unicode "undo" character
          btnEl.title = "Undo";
        }
        // update the widget's value (this.selection)
        const foundIndex = this.selection.indexOf( value);
        if (foundIndex >= 0) this.selection.splice( foundIndex, 1);
        else console.error(`The value '${valueStr}' of the 'data-value' attribute of listItemEl NOT found in ${JSON.stringify(this.selection)}`);
      }
    }
  }
  handleSelectionListAddButtonClickEvents(e) {
    function addItemToListOfSelectedItems( listEl, value, text, classValue) {
      var el=null;
      const listItemEl = document.createElement("li");
      listItemEl.setAttribute("data-value", value);
      el = document.createElement("span");
      el.textContent = text;
      listItemEl.appendChild( el);
      listItemEl.appendChild( SelectMultipleItemsWidget.createDeleteButton());
      if (classValue) listItemEl.classList.add( classValue);
      listEl.appendChild( listItemEl);
    }
    if (e.target.tagName === "BUTTON") {  // the add button was clicked
      const addBtnEl = e.target,
            selectContainerEl = addBtnEl.parentElement,
            selectEl = selectContainerEl.firstElementChild,
            valueStr = selectEl.value;
      if (!valueStr) return;
      let value;
      if (this.selectionRange instanceof eNUMERATION) value = parseInt( valueStr);
      else if (Array.isArray( this.selectionRange)) value = valueStr;
      else {
        const selRange = this.selectionRange,
              Class = selRange[Object.keys(selRange)[0]].constructor,
              idAttr = Class.idAttribute;
        value = selRange[valueStr][idAttr];
      }
      if (this.selection.length >= this.maxCard) {
        alert(`Selection must not have more than ${this.maxCard} items!`);
        return;
      }
      addItemToListOfSelectedItems( this.selectedItemsListEl, value,
          selectEl.options[selectEl.selectedIndex].textContent, "added");
      if (this.selection.length === this.minCard-1 && this.classList.contains("invalid")) {
        // change validity state to valid
        this.errorMessageEl.textContent = "";
        this.classList.remove("invalid");
      }
      // update the widget's value (this.selection)
      this.selection.push( value);
      // remove item from selection range list
      selectEl.remove( selectEl.selectedIndex);
      selectEl.selectedIndex = 0;
    }
  }
  // use for initializing element (e.g., for setting up event listeners)
  connectedCallback() {
    const selectedItemsListEl = document.createElement("ul"),
          selectContainerEl = document.createElement("div"),
          selectEl = document.createElement("select"),
          addButtonEl = document.createElement("button"),
          errorMessageEl = document.createElement("p");
    this.shadowRoot.innerHTML =
      `<style>
      :host {
        /* outline: solid grey 1px; */
        display: inline-block;
      }
      ul {
        display: inline-block;
        min-width: 7em;
        margin: 0;
        border: 1px solid grey;
        padding: 6px;
        list-style: none;
      }
      ul > li {
        margin: 2px 0;
        width: 100%;
        clear: right;
      }
      ul > li.removed {
        color: red;
        text-decoration: line-through;
      }
      ul > li.added {
        color: green;
      }
      ul > li > button {
        font-size: 70%;
        float: right;
        margin-left: 0.5em;
       /* vertical-align: middle; */
      }
      div {
        display: inline-block;
        margin-left: 1em;
      }
      p.errorMessage {
        font-size: smaller;
        color: crimson;
        padding: 5px;
        margin: 0
      }
      </style>`;
    if (this.name) this.setAttribute("data-bind", this.name);
    // store element references
    this.selectedItemsListEl = selectedItemsListEl;
    this.selectEl = selectEl;
    this.errorMessageEl = errorMessageEl;
    this.fillSelectedItemsList();
    selectedItemsListEl.addEventListener("click", this.handleSelectedItemsListButtonClickEvents);
    this.shadowRoot.appendChild( selectedItemsListEl);
    selectContainerEl.appendChild( selectEl);
    addButtonEl.type = "button";
    addButtonEl.textContent = "add";
    selectContainerEl.appendChild( addButtonEl);
    // event handler for moving an item from the selection range list to the selected items list
    selectContainerEl.addEventListener("click", this.handleSelectionListAddButtonClickEvents);
    // create select options from selectionRange minus selection
    this.fillSelectionListWithOptions();
    this.shadowRoot.appendChild( selectContainerEl);
    errorMessageEl.className = "errorMessage";
    this.shadowRoot.appendChild( errorMessageEl);
  }
  disconnectedCallback() {
    // remove event listeners for cleaning up
    this.removeEventListener("click", this.handleSelectedItemsListButtonClickEvents);
    this.removeEventListener("click", this.handleSelectionListAddButtonClickEvents);
  }
  checkValidity() {}  //TODO: is this useful?
  fillSelectedItemsList() {
    this.selectedItemsListEl.innerHTML = "";  // delete old contents
    for (const item of this.selection) {
      let el=null, key, text;
      const listItemEl = document.createElement("li");
      if (this.selectionRange instanceof eNUMERATION) {
        text = this.selectionRange.labels[item-1];
        key = item;
      } else if (Array.isArray( this.selectionRange)) {
        key = text = item;
      } else {  // a map of bUSSINESSoBJECTs
        key = item;  // the ID of the object
        text = this.selectionRange[key].toShortString();  // defined for bUSSINESSoBJECTs
      }
      listItemEl.setAttribute("data-value", key);
      el = document.createElement("span");
      el.textContent = text;
      listItemEl.appendChild( el);
      listItemEl.appendChild( SelectMultipleItemsWidget.createDeleteButton());
      this.selectedItemsListEl.appendChild( listItemEl);
    }
  }
  fillSelectionListWithOptions() {
    var selectionItems=[], key, text, el=null;
    const selRange = this.selectionRange,
          selRangeFilter = this.selectionRangeFilter;
    // delete old contents
    this.selectEl.innerHTML = "";
    // create "no selection yet" entry
    el = document.createElement("option");
    el.value = "";
    el.text = " --- ";
    this.selectEl.add( el);
    // create option elements for selection range list
    if (Array.isArray( selRange)) {
      selectionItems = selRange;
    } else if (selRange instanceof eNUMERATION) {
      selectionItems = selRange.labels;
    } else if (typeof selRange === "object") {  // map of objects
      selectionItems = Object.values( selRange);
    } else throw Error(`Invalid selection range: ${selRange}`);
    for (let i=0; i < selectionItems.length; i++) {
      const item = selectionItems[i];
      // if there is a filter condition, skip if filter condition does not hold
      if (typeof selRangeFilter === "function" && !selRangeFilter( item)) continue;
      if (Array.isArray( selRange)) {
        if (typeof item === "object") {  // selRange is an ordered collection of object references
          key = String( item[this.idAttr]);
          text = item.toShortString();  // defined for bUSSINESSoBJECTs
        } else {
          key = text = item;
        }
      } else if (selRange instanceof eNUMERATION) {
        key = i+1;  // enum index
        text = item;
      } else {  // map of objects
        key = item[this.idAttr];
        text = item.toShortString();  // defined for bUSSINESSoBJECTs
      }
      // only add items that are not yet selected
      if (!this.selection.includes( key)) {
        el = document.createElement("option");
        el.value = key;
        el.text = text;
        this.selectEl.add( el);
      }
    }
  }
  refresh( selRange) {
    if (this.view) {
      if (selRange) this.selectionRange = selRange;
      if (this.view.viewType === "U") this.view.fldValues[this.name] = this.selection;
      else this.selection = this.view.fldValues[this.name] = [];
    }
    this.fillSelectedItemsList();
    this.fillSelectionListWithOptions();
  }
  static createDeleteButton() {
    const el = document.createElement("button");
    el.type = "button";
    el.title = "Delete entry";
    el.textContent = SelectMultipleItemsWidget.deleteButtonIconCharacter;
    return el;
  }
}
customElements.define("select-multiple-items", SelectMultipleItemsWidget);

export default SelectMultipleItemsWidget;