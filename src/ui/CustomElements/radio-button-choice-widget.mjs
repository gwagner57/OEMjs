import { dt, rECORD } from "../../datatypes.mjs";
import { MandatoryValueConstraintViolation } from "../../constraint-violation-error-types.mjs";


class RadioButtonChoiceWidget extends HTMLFieldSetElement {
    constructor(recordsOrClass, { legend, disabled, validate } = {}) {
        super();
        this.htmlLegend = legend;
        this.disabled = disabled;
        this.validate = validate;
        this.props = null
        // Use as Class
        if (dt.isClass(recordsOrClass)) {
            // Handle a lIST or Array property
            if (!("instances" in recordsOrClass) || Object.keys(recordsOrClass.instances).length === 0) {
                throw new Error(`No instances defined for class ${recordsOrClass.name}`);
            }
            if ("properties" in recordsOrClass) {
                this.props = recordsOrClass.properties;
            }
            if ("displayAttributes" in EntityType) {
                this.displayAttributes = recordsOrClass.displayAttributes;
                if ("disabled" in recordsOrClass) {
                    if (!recordsOrClass.disabled.every(a => recordsOrClass.displayAttributes.includes(a))) {
                        throw new Error(`Disabled attributes do not include in desplayAttributes for ${recordsOrClass.name}`);
                    }
                }
            }
        }
        entityIDs = Object.keys(recordsOrClass);
    }

    createFieldsetAttributes() {
        let attr = "";
        if (this.disabled) {
            attr += "disabled";
        }
        return attr;
    }

    createInputAndLabel(singleRecord) {
        // todo generate unique name for input field
        if (singleRecord instanceof rECORD) {
            if (Array.isArray(singleRecord.fieldNames)) {
                let name = singleRecord.fieldNames;
                let nameId = name + name.length;
                let inputValue = singleRecord.fieldTypes;
                let checkbox = `<input type="radio" id="${nameId}" name="${name}" value="${inputValue}" />
            <label for="${nameId}">${name}</label>`
            }
        } else {
            throw new MandatoryValueConstraintViolation(`Provided record ${singleRecord} isn't type rECORD`)
        }
    }

    connectedCallback() {
        let legend_element = `<legend>${this.htmlLegend}</legend>`
        this.innerHTML = `<fieldset ${this.createFieldsetAttributes()}>${this.legend_element}${this.createInputAndLabel}</fieldset>`
    }
}

customElements.define("radio-button-choice", RadioButtonChoiceWidget, { extends: "fieldset" });