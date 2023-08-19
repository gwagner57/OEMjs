import dom from "../../lib/dom.mjs";

class SelectReferenceWidget extends HTMLSelectElement {
  constructor( name, RangeClass, view, selectionRangeFilter) {
    super();
    this.name = name;  // the name of the field to which the widget is bound
    this.RangeClass = RangeClass;
    if (selectionRangeFilter) this.selectionRangeFilter = selectionRangeFilter;
    if (view) this.view = view;
    // bind the syncRecordField event handler to this widget object
    this.updateViewField = this.updateViewField.bind( this);
  }
  // change event handler
  updateViewField() {
    if (this.value !== "") {
      if (this.view) this.view.fldValues[this.name] = this.value;
    } else {
      if (this.view) this.view.fldValues[this.name] = undefined;
    }
  }
  refreshOptions() {
    const objects = this.RangeClass.instances;
    const choiceItems = {};
    for (const oid of Object.keys( objects)) {
      const obj = objects[oid];
      if (typeof this.selectionRangeFilter === "function") {
        if (this.selectionRangeFilter( obj)) choiceItems[oid] = obj.toShortString();
      } else {
        choiceItems[oid] = obj.toShortString();
      }
    }
    dom.fillSelectWithOptions( this, choiceItems);
  }
  // use for initializing element (e.g., for setting up event listeners)
  connectedCallback() {
    this.className = "select-reference";
    this.refreshOptions();
    this.addEventListener("change", this.updateViewField);
  }
  disconnectedCallback() {
    // remove event listeners for cleaning up
    this.removeEventListener("change", this.updateViewField);
  }
}
customElements.define("select-reference", SelectReferenceWidget, {extends:"select"});

export default SelectReferenceWidget;