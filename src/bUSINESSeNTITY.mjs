import {NoConstraintViolation, MandatoryValueConstraintViolation} from "./constraint-violation-error-types.mjs";
import {dt, lISTtYPE, rECORDtYPE} from "./datatypes.mjs";
import eNUMERATION from "./eNUMERATION.mjs";

class bUSINESSeNTITY {
  constructor( id) {
    const Class = this.constructor,
          idAttr = Class.idAttribute;
    if (id) this[idAttr] = id;
    else if (Class.properties[idAttr].range === "AutoIdNumber") {
      if (typeof Class.getAutoId === "function") {
        this[idAttr] = Class.getAutoId();
      } else if (Class.idCounter !== undefined) {
        this[idAttr] = ++Class.idCounter;
      } else {
        this[idAttr] = Class.idCounter = 1001;
      }
    } else {
      throw new MandatoryValueConstraintViolation(
          `A value for ${Class.name}::${Class.idAttribute} is required!`)
    }
    for (const p of Object.keys( Class.properties)) {
      const propDef = Class.properties[p];
      if ("initialValue" in propDef) {
        if (typeof propDef.initialValue === "function") {
          const f = propDef.initialValue;
          if (f.length === 0) this[p] = f();
          else this[p] = f.call( this);
        } else {
          this[p] = propDef.initialValue;
        }
      }
    }
    // store instances for non-abstract classes
    // if (!Class.isAbstract) Class.instances[this[idAttr]] = this;
  }
  static setup( Class) {
    function checkIfIdAttribute() {

    }
    const propDefs = Class.properties || {};  // property definitions
    // initialize the Class.instances map
    if (!Class.isAbstract) Class.instances = {};
    const admissibleRanges = [...dt.supportedDatatypes, ...Object.keys( dt.classes),
      ...Object.values( eNUMERATION)];
    // pre-process all property definitions
    Class.referenceProperties = Object.keys( propDefs).filter( p =>
        propDefs[p].range in dt.classes && !("inverseOf" in propDefs[p]));
    Class.inverseReferenceProperties = Object.keys( propDefs).filter( p =>
        propDefs[p].range in dt.classes && "inverseOf" in propDefs[p]);
    for (const p of Object.keys( propDefs)) {
      const propDef = propDefs[p],
            range = propDef.range;
      // check if property definition includes a valid range declaration
      if (!range) throw new Error(`No range defined for property ${p} of class ${Class.name}`);
      else if (!(admissibleRanges.includes( range) ||
          range instanceof lISTtYPE || range instanceof rECORDtYPE))
        throw new Error(`Non-admissible range ${range} defined for property ${p} of class ${Class.name}`);
      // establish standard ID attribute
      if (propDef.isIdAttribute) Class.idAttribute = p;
      // construct implicit setters and getters
      Object.defineProperty( Class.prototype, p, {
        get() { return this["_"+p]; },
        set( val) {
          if (dt.checkConstraints) {
            const validationResults = dt.check( p, propDef, val);
            if (validationResults[0] instanceof NoConstraintViolation) {
              this["_"+p] = validationResults[0].checkedValue;
            } else {
              //TODO: support multiple errors
              throw validationResults[0];
            }
          } else this["_"+p] = val;
        },
        enumerable: true
      });
    }
  }
}

export default bUSINESSeNTITY;
