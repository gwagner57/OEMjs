import { dt, rECORD, lIST } from "../datatypes.mjs";
import bUSINESSoBJECT from "../bUSINESSoBJECT.mjs";
import { MandatoryValueConstraintViolation } from "../constraint-violation-error-types.mjs";


class RadioButtonChoiceWidget extends HTMLFieldSetElement {
    constructor(record, { legend, disabled } = {}) {
        super();
        this.htmlLegend = legend;
        this.disabled = disabled;
        // Handle a lIST or Array property
        if (!("instances" in record) || Object.keys(record.instances).length === 0) {
            throw new Error(`No instances defined for class ${record.name}`);
        }
        this.record = record;
    }

    createFieldsetAttributes() {
        if (this.disabled) {
            this.setAttribute("disabled", true);
        }
    }

    createInputAndLabel() {
        // creates input and label nodes for each element
        let innerHTML = "";
        Object.keys(this.record.instances).forEach(oid => {
            const elem = this.record.instances[oid];
            let idKey = elem.idAttribute || oid;
            let nameId = idKey + "_" + elem.name;
            innerHTML += `<input type="radio" id="${nameId}" value="${elem.name}" />
                    <label for="${nameId}">${elem.name}</label>`;
        });
        return innerHTML;
    }

    connectedCallback() {
        this.createFieldsetAttributes();
        this.setAttribute("data-bind", this.htmlLegend);
        let legend_element = `<legend>${this.htmlLegend}</legend>`
        this.innerHTML = `${legend_element}${this.createInputAndLabel()}`
        this.addEventListener("change", e => console.log("Change event", e));
        this.addEventListener("click", e => {
            if (e.originalTarget.nodeName === "INPUT") {
                let checked = e.originalTarget.checked;
                if (checked === true) {
                    // TODO checked is always true
                    // e.originalTarget.checked = false;
                }
            }
        });
    }
    disconnectedCallback() {
        this.removeEventListener("change");
        this.removeEventListener("click");
    }
}

customElements.define("radio-button-choice", RadioButtonChoiceWidget, { extends: "fieldset" });

export default RadioButtonChoiceWidget;