import dom from "../../lib/dom.mjs";

class SelectReferenceWidget extends HTMLSelectElement {
  constructor( name, BusinessObjectClass, view) {
    super();
    this.name = name;  // the name of the field to which the widget is bound
    this.BusinessObjectClass = BusinessObjectClass;
    if (view) this.view = view;
    // bind the syncRecordField event handler to this widget object
    this.updateViewField = this.updateViewField.bind( this);
  }
  // change event handler
  updateViewField() {
    if (this.value !== "") {
      if (this.view) this.view.fldValues[this.name] = this.BusinessObjectClass.instances[this.value];
    } else {
      if (this.view) this.view.fldValues[this.name] = null;
    }
  }
  refreshOptions() {
    const BusObjClass = this.BusinessObjectClass,
          busObjects = BusObjClass.instances;
    const choiceItems = {};
    for (const oid of Object.keys( busObjects)) {
      choiceItems[oid] = busObjects[oid].toShortString();
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