import {dt} from "./datatypes.mjs";
import bUSINESSeNTITY from "./bUSINESSeNTITY.mjs";

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

class bUSINESSoBJECT extends bUSINESSeNTITY {
  constructor( id) {
    super( id);
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
    if ("displayAttribute" in Class && (idAttr !== "name" || Class.displayAttribute !== "name")) {
      str += " : "+ this.getValueOfPathExpression( Class.displayAttribute);
    }
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
   * To be invoked for each BO class definition
  ***************************************************/
  static setup() {
    /*
    * FOR LATER: support (1) union types,
    */
    const Class = this,
          propDefs = Class.properties || {};  // property definitions
    // invoke the business entity class setup procedure
    super.setup( Class);
    if (!Class.idAttribute) {
      if ("id" in propDefs) Class.idAttribute = "id";
      else throw new Error(`No standard ID attribute defined for class ${Class.name}`);
    }
    if (!Class.displayAttribute) {
      if ("name" in Class.properties) Class.displayAttribute = "name";
    }
  }
}
class cOUNTER extends bUSINESSoBJECT {
  constructor ({className, autoIdCounter=1}) {
    super( className);
    this.autoIdCounter = autoIdCounter;
  }
}
cOUNTER.properties = {
  "className": {range:"NonEmptyString", isIdAttribute: true, label:"Class name"},
  "autoIdCounter": {range:"PositiveInteger", label:"Auto ID counter"}
}
// necessary since "setup" is not invoked for cOUNTER
cOUNTER.idAttribute = "className";

export { bUSINESSoBJECT, cOUNTER};
