import {dt} from "../datatypes.mjs";
import eNUMERATION from "../eNUMERATION.mjs";

// *************** Multi-Selection Widget ****************************************
/**
 * A Multi-Selection widget contains
 * 1) a list of selected items, where each item has a delete button,
 * 2) a div containing a select element and an add button allowing to add a selected item
 *    to the selected items list
 *
 * @param {object} selection  An item list or entity table (map of objects)
 *                 for populating the list of selected items
 * @param {object} selectionRange  An item list, enumeration or entity table (map of objects)
 *                 for populating the selection list
 * @param {string} idAttr?  The standard identifier attribute of the entity table
 * @param {string} displayAttr? The attribute to be shown in the selection list
 * @param {string} minCard? The minimum cardinality of the list of selected objects
 */
class SelectMultipleItemsWidget extends HTMLElement {
  static deleteButtonIconCharacter = "✕";
  constructor({name, selectionRange, selection, idAttr, displayAttr, minCard=0, view}) {
    super();
    // assign attributes
    this.name = name;
    if (selectionRange) this.selectionRange = selectionRange;
    else throw new Error(`The 'selectionRange' was not specified!`);
    if (!Array.isArray(selectionRange) && !(selectionRange instanceof eNUMERATION) && !idAttr) {
      throw new Error(`A class population as 'selectionRange' requires specifying an 'idAttr'!`);
    }
    if (selection) this.selection = selection;
    else if (Array.isArray(selectionRange) || selectionRange instanceof eNUMERATION) {
      this.selection = [];
    } else {  // map of objects
      this.selection = {};
    }
    if (idAttr) {
      this.idAttr = idAttr;
      this.displayAttr = displayAttr || idAttr;
    }
    this.minCard = minCard;
    if (view) this.view = view;
    // create shadow DOM root object and assign it to this.shadowRoot
    this.attachShadow({ mode: 'open' });
    // bind event handlers to "this" widget object
    this.handleSelectedItemsListButtonClickEvents = this.handleSelectedItemsListButtonClickEvents.bind( this);
    this.handleSelectionListAddButtonClickEvents = this.handleSelectionListAddButtonClickEvents.bind( this);
  }
  handleSelectedItemsListButtonClickEvents(e) {
    if (e.target.tagName === "BUTTON") {  // delete/undo button
      const btnEl = e.target,
            listItemEl = btnEl.parentElement,
            selectedItemsListEl = listItemEl.parentElement,
            selectEl = selectedItemsListEl.parentElement.lastElementChild.firstElementChild;
      if (selectedItemsListEl.children.length <= this.minCard) {
        alert(`Selection must have at least ${this.minCard} items!`);
        return;
      }
      if (listItemEl.classList.contains("removed")) {  // Add again
        // undoing a previous removal
        listItemEl.classList.remove("removed");
        // change button text
        btnEl.textContent = SelectMultipleItemsWidget.deleteButtonIconCharacter;
      } else if (listItemEl.classList.contains("added")) {  // Delete
        const keyValueString = listItemEl.getAttribute("data-value"),
              keyValue = dt.parseValueString( keyValueString);
        if (Array.isArray( this.selection)) {
          const foundIndex = this.selection.indexOf( keyValue);
          if (foundIndex >= 0) this.selection.splice( foundIndex, 1);
          else console.log(
            `data-value attribute value '${keyValueString}' of listItemEl NOT found in ${JSON.stringify(this.selection)}`);
        } else {
          delete this.selection[keyValueString];
        }
        // removing a previously added item means moving it back to the selection range
        listItemEl.parentNode.removeChild( listItemEl);
        const optionEl = document.createElement("option");
        optionEl.value = listItemEl.getAttribute("data-value");
        optionEl.text = listItemEl.firstElementChild.textContent;
        selectEl.add( optionEl);
      } else {
        // removing an ordinary item
        listItemEl.classList.add("removed");
        // change button text
        btnEl.textContent = "undo";
      }
    }
  }
  handleSelectionListAddButtonClickEvents(e) {
    function addItemToListOfSelectedItems( listEl, stdId, humanReadableId, classValue) {
      var el=null;
      const listItemEl = document.createElement("li");
      listItemEl.setAttribute("data-value", stdId);
      listItemEl.appendChild( SelectMultipleItemsWidget.createDeleteButton());
      el = document.createElement("span");
      el.textContent = humanReadableId;
      listItemEl.appendChild( el);
      if (classValue) listItemEl.classList.add( classValue);
      listEl.appendChild( listItemEl);
    }
    if (e.target.tagName === "BUTTON") {  // the add button was clicked
      const addBtnEl = e.target,
            selectContainerEl = addBtnEl.parentElement,
            selectEl = selectContainerEl.firstElementChild;
      if (selectEl.value) {
        addItemToListOfSelectedItems( this.selectedItemsListEl, selectEl.value,
            selectEl.options[selectEl.selectedIndex].textContent, "added");
        // update the widget's value (this.selection)
        if (Array.isArray( this.selection)) {
          this.selection.push( dt.parseValueString( selectEl.value));
        } else {
          this.selection[selectEl.value] = this.selectionRange[selectEl.value];
        }
        selectEl.remove( selectEl.selectedIndex);
        selectEl.selectedIndex = 0;
      }
    }
  }
  // use for initializing element (e.g., for setting up event listeners)
  connectedCallback() {
    const selectedItemsListEl = document.createElement("ul"),
          selectContainerEl = document.createElement("div"),
          selectEl = document.createElement("select"),
          addButtonEl = document.createElement("button"),
          self = this;
    this.shadowRoot.innerHTML =
      `<style>
      ul {
        border: 1px solid black;
        padding: 6px;
        list-style: none;
      }
      ul li {
        margin: 2px 0;
      }
      ul li button {
        margin-right: 1em;
        font-size: 70%;
      }    
      </style>`;
    if (this.name) this.setAttribute("data-bind", this.name);
    // store element references
    this.selectedItemsListEl = selectedItemsListEl;
    this.selectEl = selectEl;
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
  }
  disconnectedCallback() {
    // remove event listeners for cleaning up
    this.removeEventListener("click", this.handleSelectedItemsListButtonClickEvents);
    this.removeEventListener("click", this.handleSelectionListAddButtonClickEvents);
  }
  fillSelectedItemsList() {
    var selectedItems = [];
    this.selectedItemsListEl.innerHTML = "";  // delete old contents
    if (Array.isArray( this.selection)) selectedItems = this.selection;
    else selectedItems = Object.keys( this.selection);
    for (const item of selectedItems) {
      let el=null, key, text;
      const listItemEl = document.createElement("li");
      if (Array.isArray( this.selection)) {
        if (typeof item === "object") {
          key = item[this.idAttr];
          text = item[this.displayAttr];
        } else {
          key = text = item;
        }
      } else {
        key = item[this.idAttr];
        text = item[this.displayAttr];
      }
      listItemEl.setAttribute("data-value", key);
      listItemEl.appendChild( SelectMultipleItemsWidget.createDeleteButton());
      el = document.createElement("span");
      el.textContent = text;
      listItemEl.appendChild( el);
      this.selectedItemsListEl.appendChild( listItemEl);
    }
  }
  fillSelectionListWithOptions() {
    var selectionItems=[], key, text, alreadySelected=false, el=null;
    const selRange = this.selectionRange;
    // delete old contents
    this.selectEl.innerHTML = "";
    // create "no selection yet" entry
    el = document.createElement("option");
    el.value = "";
    el.text = " --- ";
    this.selectEl.add( el);
    // create option elements for range selection list
    if (Array.isArray( selRange)) selectionItems = selRange;
    else if (selRange instanceof eNUMERATION) {
      selectionItems = selRange.enumLitNames;
    } else {  // map of objects
      selectionItems = Object.values( selRange);
    }
    for (let i=0; i < selectionItems.length; i++) {
      const item = selectionItems[i];
      if (Array.isArray( selRange)) {
        key = text = item;
        alreadySelected = this.selection.includes( key);
      } else if (selRange instanceof eNUMERATION) {
        key = i;
        alreadySelected = this.selection.includes( key);
        if ("codeList" in selRange) text = `${selRange.codeList[item]} (${item})`;
        else text = item;
      } else {  // map of objects
        key = item[this.idAttr];
        text = item[this.displayAttr];
        alreadySelected = key in this.selection;
      }
      // only add items that are not yet selected
      if (!alreadySelected) {
        el = document.createElement("option");
        el.value = key;
        el.text = text;
        this.selectEl.add( el);
      }
    }
  }
  refresh() {
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