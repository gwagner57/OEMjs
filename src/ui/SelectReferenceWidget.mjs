import dom from "../../lib/dom.mjs";

class SelectReferenceWidget extends HTMLSelectElement {
  constructor( name, BusinessObjectClass, view) {
    super();
    this.name = name;
    this.BusinessObjectClass = BusinessObjectClass;
    if (view) this.view = view;
    // bind the syncRecordField event handler to this widget object
    this.updateViewField = this.updateViewField.bind( this);
  }
  // change event handler
  updateViewField() {
    if (this.value !== "") {
      if (this.view) this.view.fldValues[this.name] = this.value;
    }
  }
  refreshOptions() {
    const busObjClass = this.BusinessObjectClass,
          busObjects = busObjClass.instances,
          propDefs = busObjClass.properties;
    const choiceItems = {};
    for (const oid of Object.keys( busObjects)) {
      let optionText = oid;
      if (busObjClass.idAttribute !== "name") {
        optionText += " "+ busObjects[oid].name || busObjects[oid].title;
      }
      choiceItems[oid] = optionText;
    }
    dom.fillSelectWithOptions( this, choiceItems);
  }
  // use for initializing element (e.g., for setting up event listeners)
  connectedCallback() {
    this.setAttribute("data-bind", this.name);
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