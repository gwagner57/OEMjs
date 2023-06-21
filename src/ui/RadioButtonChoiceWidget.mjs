import dom from "../../lib/dom.mjs"
import { dt, rECORDtYPE, lISTtYPE } from "../datatypes.mjs";
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

    static get observedAttributes() {
        return ['checked', 'disabled'];
    }

    createFieldsetAttributes() {
        if (this.disabled) {
            this.setAttribute("disabled", true);
        }
    }

    createInputAndLabel() {
        // creates input and label nodes for each element
        let innerHTML = [];
        Object.keys(this.record.instances).forEach(oid => {
            const elem = this.record.instances[oid];
            let idKey = elem.idAttribute || oid;
            let nameId = idKey + "_" + elem.name;
            let slot = {};
            slot.name = elem.name;
            slot.type = 'radio';
            slot.value = elem.name
            slot.labelText = elem.name
            slot.id = nameId
            slot.labelFor = nameId
            let htmlElem = dom.createLabeledInputField(slot);
            htmlElem.addEventListener("click", e => {
                // add attribute to HTML element to store if element already be checked by user
                if (e.target.nodeName === "INPUT") {
                    let input = e.target;
                    if (input.hasAttribute("checked")) {
                        input.removeAttribute("checked");
                        input.checked = false;
                    }
                    if (input.checked === true && !input.hasAttribute("checked")) {
                        input.setAttribute("checked", true)
                    }
                }
            });

            innerHTML.push(htmlElem);
        });
        this.inputElements = innerHTML;
        return innerHTML;
    }

    connectedCallback() {
        this.createFieldsetAttributes();
        this.setAttribute("data-bind", this.htmlLegend);
        let legend = document.createElement("legend");
        legend.textContent = this.htmlLegend;
        this.appendChild(legend);
        this.createInputAndLabel().map(x => this.appendChild(x));
    }
    
    disconnectedCallback() {
        // remove EventListener from each input element
        if (this.inputElements.length > 0) {
            Array.map(item => {
                item.removeEventListener("click");
            }, this.inputElements);
        }
    }
}

customElements.define("radio-button-choice", RadioButtonChoiceWidget, { extends: "fieldset" });

export default RadioButtonChoiceWidget;