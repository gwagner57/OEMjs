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
 * @copyright Copyright 2015-2022 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 * @author Gerd Wagner
 ******************************************************************************/
 import {dt, lIST, rECORD} from "./datatypes.mjs";
 import { NoConstraintViolation,
   MandatoryValueConstraintViolation, UniquenessConstraintViolation,
   ReferentialIntegrityConstraintViolation, FrozenValueConstraintViolation }
   from "./constraint-violation-error-types.mjs";
 import eNUMERATION from "./eNUMERATION.mjs";

 class bUSINESSoBJECT {
  constructor( id) {
    const Class = this.constructor,
          idAttr = Class.idAttribute ?? "id";
    if (id) this[idAttr] = id;
    else if (Class.idAttribute && !Class.properties[Class.idAttribute].autoId) {
      throw new MandatoryValueConstraintViolation(
          `A value for ${Class.idAttribute} is required!`)
    } else {  // assign auto-ID
      if (typeof Class.getAutoId === "function") {
        this[idAttr] = Class.getAutoId();
      } else if (Class.idCounter !== undefined) {
        this[idAttr] = ++Class.idCounter;
      } else {
        this[idAttr] = Class.idCounter = 1;
      }
    }
    // has an id value been passed and is the class neither a complex datatype nor abstract?
    if (id && !Class.isComplexDatatype && !Class.isAbstract) {
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
            propLabel = propDecl?.shortLabel || propDecl?.label || p;
      var valStr = "";
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
  // construct a storage serialization/representation of an instance
  toRecordFieldValue( prop) {

  }
  toRecord() {
    const obj = this, rec={};
    var valuesToConvert=[];
    for (const p of Object.keys( obj)) {
      if (p.charAt(0) === "_" && obj[p] !== undefined) {
        const val = obj[p];
        // remove underscore prefix from internal property name
        const prop = p.substr(1);
        const propDecl = obj.constructor.properties[prop];
        const range = propDecl.range;
        // create a list of values to convert
        if (propDecl.maxCard && propDecl.maxCard > 1) {
          if (val instanceof bUSINESSoBJECT) { // object reference(s)
            if (Array.isArray( val)) {
              valuesToConvert = [...val];  // clone;
            } else {  // val is a map from ID refs to obj refs
              valuesToConvert = Object.values( val);
            }
          } else if (Array.isArray( val)) {
            valuesToConvert = [...val];  // clone;
          } else console.log("Invalid non-array collection in toRecord!");
        } else {  // maxCard=1
          valuesToConvert = [val];
        }
        valuesToConvert.forEach( function (v,i) {
          // alternatively: enum literals as labels
          // if (range instanceof eNUMERATION) rec[p] = range.labels[val-1];
          if (["number","string","boolean"].includes( typeof v)) {
            valuesToConvert[i] = v;
          } else if (range === "Date") {
            valuesToConvert[i] = dt.dataTypes["Date"].val2str( v);
          } else if (v instanceof bUSINESSoBJECT) { // replace object reference with ID ref.
            // get ID attribute of referenced class
            const idAttr = v.constructor.idAttribute || "id";
            valuesToConvert[i] = v[idAttr];
          } else if (Array.isArray( v)) {  // JSON-compatible array
            valuesToConvert[i] = [...v];  // clone
          } else valuesToConvert[i] = JSON.stringify( v);
        });
        if (!propDecl.maxCard || propDecl.maxCard <= 1) {
          rec[prop] = valuesToConvert[0];
        } else {
          rec[prop] = valuesToConvert;
        }
      }
    }
    return rec;
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
     * FOR LATER: support (1) datatype ranges (such as Array), (2) union types,
     *            (3) converting IdRefs to object references, (4) assigning initial values
     *            to mandatory properties (if !pDef.optional), including the default values
     *            0, "", [] and {}
     */
     const Class = this,
           propDefs = Class.properties || {};  // property definitions
     const propsWithInitialValFunc = [];
     // initialize the Class.instances map
     if (!Class.isAbstract) Class.instances = {};
     // collect all names of BO classes in a map
     dt.classes[Class.name] = Class;
     const admissibleRanges = [...dt.supportedDatatypes, ...Object.keys( dt.classes),
         ...Object.values( eNUMERATION)];
     // pre-process all property definitions
     Class.referenceProperties = [];
     for (const p of Object.keys( propDefs)) {
       const propDef = propDefs[p],
             range = propDef.range;
       // check if property definition includes a range declaration
       if (!range) throw Error(`No range defined for property ${p} of class ${Class.name}`);
       else if (!(admissibleRanges.includes( range) ||
                  range instanceof lIST || range instanceof rECORD))
           throw Error(`Nonadmissible range defined for property ${p} of class ${Class.name}`);
       // establish standard ID attribute
       if (propDef.isIdAttribute) Class.idAttribute = p;
       // collect all reference properties
       if (range in dt.classes) Class.referenceProperties.push( p);
       // collect properties with initialValue functions
       if (typeof propDef.initialValue === "function") propsWithInitialValFunc.push( p);
       // construct implicit setters and getters
       Object.defineProperty( Class.prototype, p, {
         get() { return this["_"+p]; },
         set( val) {
           if (bUSINESSoBJECT.areConstraintsToBeChecked) {
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
bUSINESSoBJECT.areConstraintsToBeChecked = true;

export default bUSINESSoBJECT;
