import {dt, lIST, rECORD} from "./datatypes.mjs";
import { NoConstraintViolation,
  MandatoryValueConstraintViolation, UniquenessConstraintViolation,
  ReferentialIntegrityConstraintViolation, FrozenValueConstraintViolation }
  from "./constraint-violation-error-types.mjs";
import eNUMERATION from "./eNUMERATION.mjs";

/*******************************************************************************
 * bUSINESSoBJECT allows defining constructor-based business object classes and
 * class hierarchies based on a declarative description of the form:
 *
 *   class Book extends bUSINESSoBJECT {
 *     constructor ({isbn, title, year, edition}) {
 *       super( isbn);
 *       this.title = title;
 *       this.year = year;
 *       this.edition = edition;
 *     }
 *   }
 *   Book.properties = {
 *     "isbn": {range:"NonEmptyString", isIdAttribute: true, label:"ISBN", pattern:/\b\d{9}(\d|X)\b/,
 *           patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
 *     "title": {range:"NonEmptyString", min: 2, max: 50}, 
 *     "year": {range:"Integer", min: 1459, max: util.nextYear()},
 *     "edition": {range:"PositiveInteger", optional: true}
 *   }
 *   Book.setup();  // to be invoked for every BO class
 *   var b1 = new Book({isbn:"123456789X", title:"Hello world", year: 2022});
 *   // test if direct instance
 *   if (b1.constructor.name === "Book") ...
 *   // test if instance
 *   if (b1 instanceof Book) ...
 *
 * When a model class has no standard ID attribute declared with "isIdAttribute: true", 
 * it inherits an auto-integer "id" attribute as its standard ID attribute from bUSINESSoBJECT.
 *
 * TODO: + add validation checks in "setup" (check if all attribute names in a displayAttribute
 *         path expression exist)
 *
 * @copyright Copyright 2015-2022 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 * @author Gerd Wagner
 ******************************************************************************/

class bUSINESSoBJECT {
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
    if (!Class.isAbstract) {
      // add new object to the population of the class (represented as a map) 
      Class.instances[this[idAttr]] = this;
    }
  }
  /****************************************************
  ** overwrite and improve the standard toString method
  *****************************************************/
  toString() {
    const Class = this.constructor,
          idAttr = Class.idAttribute;
    var str1="", str2="", i=0;
    if (this.name) str1 = this.name;
    else {
      str1 = Class.shortLabel || Class.name;
      if (this[idAttr]) str1 += ":"+ this[idAttr];
    }
    str2 = "{ ";
    for (const p of Object.keys( this)) {
      const propDecl = Class.properties[p],
            propLabel = propDecl?.label || p;
      let valStr = "";
      // is p a declared reference property?
      if (propDecl && typeof propDecl.range === "string" && propDecl.range in dt.classes) {
        // is the property multi-valued?
        if (propDecl.maxCard && propDecl.maxCard > 1) {
          if (Array.isArray( this[p])) {
            valStr = this[p].map( o => o[idAttr]).toString();
          } else valStr = JSON.stringify( Object.keys( this[p]));
        } else {  // if the property is single-valued
          valStr = String( this[p][idAttr]);
        }
      } else if (typeof this[p] === "function") {
        // the slot is an instance-level method slot
        valStr = "a function";
      } else {  // the slot is an attribute slot or an undeclared reference property slot
        valStr = JSON.stringify( this[p]);
      }
      if (this[p] !== undefined) {
        str2 += (i>0 ? ", " : "") + propLabel +": "+ valStr;
        i = i+1;
      }
    }
    str2 += "}";
    if (str2 === "{ }") str2 = "";
    return str1 + str2;
  }
  toShortString() {
    const Class = this.constructor,
          idAttr = Class.idAttribute,
          id = this[idAttr];
    var str = String( id);
    if (Class.displayAttribute) str += " : "+ this.getValueOfPathExpression( Class.displayAttribute);
    else if (idAttr !== "name" && "name" in this) str += " : "+ this.name;
    return str;
  }
  getValueOfPathExpression( pathExprStr) {
    const splitResult = pathExprStr.split(".");
    let value;
    switch (splitResult.length) {
      case 1: value = this[splitResult[0]]; break;
      case 2: value = this[splitResult[0]][splitResult[1]]; break;
      case 3: value = this[splitResult[0]][splitResult[1]][splitResult[2]]; break;
      default: console.error("More than 3 parts in path expression string: ", pathExprStr);
    }
    return value;
  }
  /***************************************************
   * A class-level de-serialization method
   ***************************************************/
  static createObjectFromRecord( record) {
    var obj={};
    //TODO: does this work?
    const Class = this.constructor;
    try {
      obj = new Class( record);
    } catch (e) {
      console.log( e.constructor.name + " while deserializing a "+
          Class.name +" record: " + e.message);
      obj = null;
    }
    return obj;
  }
  /***************************************************
   * To be invoked for each BO class definition
  ***************************************************/
  static setup() {
    /*
    * FOR LATER: support (1) union types, (2) assigning initial values to mandatory
    * properties (if !pDef.optional), including the default values 0, "", [] and {}
    */
    const Class = this,
          propDefs = Class.properties || {};  // property definitions
    const propsWithInitialValFunc = [];
    if (!Class.displayAttribute) {
      if ("name" in Class.properties) Class.displayAttribute = "name";
    }
    // initialize the Class.instances map
    if (!Class.isAbstract) Class.instances = {};
    const admissibleRanges = [...dt.supportedDatatypes, ...Object.keys( dt.classes),
       ...Object.values( eNUMERATION)];
    // pre-process all property definitions
    Class.referenceProperties = Object.keys( propDefs).filter( p =>
        propDefs[p].range in dt.classes && !("inverseOf" in propDefs[p]));
    Class.inverseReferenceProperties = Object.keys( propDefs).filter( p =>
        propDefs[p].range in dt.classes && "inverseOf" in propDefs[p]);
    //Class.referenceProperties = [];
    for (const p of Object.keys( propDefs)) {
      const propDef = propDefs[p],
          range = propDef.range;
      // check if property definition includes a valid range declaration
      if (!range) throw new Error(`No range defined for property ${p} of class ${Class.name}`);
      else if (!(admissibleRanges.includes( range) ||
          range instanceof lIST || range instanceof rECORD))
        throw new Error(`Non-admissible range defined for property ${p} of class ${Class.name}`);
      // establish standard ID attribute
      if (propDef.isIdAttribute) Class.idAttribute = p;
      // collect all reference properties
      //if (range in dt.classes) Class.referenceProperties.push( p);
      // collect properties with initialValue functions
      if (typeof propDef.initialValue === "function") propsWithInitialValFunc.push( p);
      // construct implicit setters and getters
      Object.defineProperty( Class.prototype, p, {
        get() { return this["_"+p]; },
        set( val) {
          if (bUSINESSoBJECT.checkConstraints) {
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
    // call the functions for initial value expressions
    for (const p of propsWithInitialValFunc) {
      const f = propDefs[p].initialValue;
      if (f.length === 0) this[p] = f();
      else this[p] = f.call( this);
    }
  }
}
// A flag for disabling constraint checking
bUSINESSoBJECT.checkConstraints = true;

export default bUSINESSoBJECT;
