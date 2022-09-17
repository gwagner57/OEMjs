 /*******************************************************************************
 * mODELcLASS allows defining constructor-based JavaScript classes and
 * class hierarchies based on a declarative description of the form:
 *
 *   class Book extends mODELcLASS {
 *     constructor ({isbn, title, year, edition}) {
 *       this.isbn = isbn;
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
 *   var b1 = new Book({id:"123456789X", title:"Hello world", 2022});
 *   // test if direct instance
 *   if (b1.constructor.name === "Book") ...
 *   // test if instance
 *   if (b1 instanceof Book) ...
 *
 * When a model class has no standard ID attribute declared with "isIdAttribute: true", 
 * it inherits an auto-integer "id" attribute as its standard ID attribute from mODELcLASS.
 *
 * @copyright Copyright 2015-2022 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 * @author Gerd Wagner
 ******************************************************************************/
class mODELcLASS {
  constructor( id) {
    const Class = this.constructor;
    if (id) this.id = id;
    else {  // assign auto-ID
      if (typeof Class.getAutoId === "function") {
        this.id = Class.getAutoId();
      } else if (Class.idCounter !== undefined) {
        this[p] = ++Class.idCounter;
      }
    }
    // is the class neither a complex datatype nor abstract and does the object have an id slot?
    if (!classSlots.isComplexDatatype && !classSlots.isAbstract && "id" in this) {
      // add new object to the population/extension of the class
      Class.instances[String(this.id)] = this;
    }
  }
  /****************************************************
  ** overwrite and improve the standard toString method
  *****************************************************/
  toString() {
    var str1="", str2="", i=0;
    const Class = this.constructor;
    if (this.name) str1 = this.name;
    else {
      str1 = Class.shortLabel || Class.name;
      if (this.id) str1 += ":"+ this.id;
    }
    str2 = "{ ";
    Object.keys( this).forEach( function (key) {
      var propDecl = Class.properties[key],
          propLabel = propDecl ? (propDecl.shortLabel || propDecl.label) : key,
          valStr = "";
      // is the slot of a declared reference property?
      if (propDecl && typeof propDecl.range === "string" && mODELcLASS[propDecl.range]) {
        // is the property multi-valued?
        if (propDecl.maxCard && propDecl.maxCard > 1) {
          if (Array.isArray( this[key])) {
            valStr = this[key].map( function (o) {return o.id;}).toString();
          } else valStr = JSON.stringify( Object.keys( this[key]));
        } else {  // if the property is single-valued
          valStr = String( this[key].id);
        }
      } else if (typeof this[key] === "function") {
        // the slot is an instance-level method slot
        valStr = "a function";
      } else {  // the slot is an attribute slot or an undeclared reference property slot
        valStr = JSON.stringify( this[key]);
      }
      if (this[key] !== undefined && propLabel) {
        str2 += (i>0 ? ", " : "") + propLabel +": "+ valStr;
        i = i+1;
      }
    }, this);
    str2 += "}";
    if (str2 === "{ }") str2 = "";
    return str1 + str2;
  }
  // construct a storage serialization/representation of an instance
  toRecord() {
    var obj = this, rec={}, propDecl={}, valuesToConvert=[], range, val;
    Object.keys( obj).forEach( function (p) {
      if (obj[p] !== undefined) {
        val = obj[p];
        propDecl = obj.constructor.properties[p];
        range = propDecl.range;
        if (propDecl.maxCard && propDecl.maxCard > 1) {
          if (range.constructor && range.constructor === mODELcLASS) { // object reference(s)
            if (Array.isArray( val)) {
              valuesToConvert = val.slice(0);  // clone;
            } else {  // val is a map from ID refs to obj refs
              valuesToConvert = Object.values( val);
            }
          } else if (Array.isArray( val)) {
            valuesToConvert = val.slice(0);  // clone;
          } else console.log("Invalid non-array collection in toRecord!");
        } else {  // maxCard=1
          valuesToConvert = [val];
        }
        valuesToConvert.forEach( function (v,i) {
          // alternatively: enum literals as labels
          // if (range instanceof eNUMERATION) rec[p] = range.labels[val-1];
          if (["number","string","boolean"].includes( typeof(v)) || !v) {
            valuesToConvert[i] = String( v);
          } else if (range === "Date") {
            valuesToConvert[i] = util.createIsoDateString( v);
          } else if (range.constructor && range.constructor === mODELcLASS) { // object reference(s)
            valuesToConvert[i] = v.id;
          } else if (Array.isArray( v)) {  // JSON-compatible array
            valuesToConvert[i] = v.slice(0);  // clone
          } else valuesToConvert[i] = JSON.stringify( v);
        });
        if (!propDecl.maxCard || propDecl.maxCard <= 1) {
          rec[p] = valuesToConvert[0];
        } else {
          rec[p] = valuesToConvert;
        }
      }
    });
    return rec;
  }
  /***************************************************/
  // Convert property value to (form field) string.
  /***************************************************/
  getValueAsString( prop) {
    // make sure the eNUMERATION meta-class object can be checked if available
    var eNUMERATION = typeof eNUMERATION === "undefined" ? undefined : eNUMERATION;
    var propDecl = this.constructor.properties[prop],
        range = propDecl.range, val = this[prop],
        decimalPlaces = propDecl.displayDecimalPlaces || oes.defaults.displayDecimalPlaces || 2;
    var valuesToConvert=[], displayStr="", k=0,
        listSep = ", ";
    if (val === undefined || val === null) return "";
    if (propDecl.maxCard && propDecl.maxCard > 1) {
      if (Array.isArray( val)) {
        valuesToConvert = val.length>0 ? val.slice(0) : [];  // clone;
      } else if (typeof val === "object") {
        valuesToConvert = Object.keys( val);
      } else console.log("The value of a multi-valued " +
          "property like "+ prop +" must be an array or a map!");
    } else valuesToConvert = [val];
    valuesToConvert.forEach( function (v,i) {
      if (typeof propDecl.val2str === "function") {
        valuesToConvert[i] = propDecl.val2str( v);
      } else if (eNUMERATION && range instanceof eNUMERATION) {
        valuesToConvert[i] = range.labels[v-1];
      } else if (["string","boolean"].includes( typeof v) || !v) {
        valuesToConvert[i] = String( v);
      } else if (typeof v === "number") {
        if (Number.isInteger(v)) valuesToConvert[i] = String( v);
        else valuesToConvert[i] = math.round( v, decimalPlaces);
      } else if (range === "Date") {
        valuesToConvert[i] = util.createIsoDateString( v);
      } else if (Array.isArray( v)) {  // JSON-compatible array
        valuesToConvert[i] = v.slice(0);  // clone
      } else if (typeof range === "string" && mODELcLASS[range]) {
        if (typeof v === "object" && v.id !== undefined) {
          valuesToConvert[i] = v.id;
        } else {
          valuesToConvert[i] = v.toString();
          propDecl.stringified = true;
          console.log("Property "+ this.constructor.Name +"::"+ prop +" has a mODELcLASS object value without an 'id' slot!");
        }
      } else {
        valuesToConvert[i] = JSON.stringify( v);
        propDecl.stringified = true;
      }
    }, this);
    if (valuesToConvert.length === 0) displayStr = "[]";
    else {
      displayStr = valuesToConvert[0];
      if (propDecl.maxCard && propDecl.maxCard > 1) {
        displayStr = "[" + displayStr;
        for (k=1; k < valuesToConvert.length; k++) {
          displayStr += listSep + valuesToConvert[k];
        }
        displayStr = displayStr + "]";
      }
    }
    return displayStr;
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
}	

mODELcLASS.setup = function () {
  /*
  * FOR LATER: support (1) datatype ranges (such as Array), (2) union types,
  *            (3) converting IdRefs to object references, (4) assigning initial values
  *            to mandatory properties (if !pDef.optional), including the default values
  *            0, "", [] and {}
  */
  var propsWithInitialValFunc = [], missingRangeProp="";
  const Class = this.constructor,
        propDefs = Class.properties || {};  // property declarations
  // initialize the Class.instances map
  Class.instances = {};
  // check model class definition constraints
  if (!Object.keys( propDefs).every( function (p) {
      if (!propDefs[p].range) missingRangeProp = p;
      return (propDefs[p].range !== undefined);})) {
    throw `No range defined for property ${missingRangeProp} of class ${Class.name}.`;
  }
	// properties with initialValue functions
  for (const p of Object.keys( propDefs)) {
    if (typeof propDefs[p].initialValue === "function") propsWithInitialValFunc.push( p);
  }
  /* TODO: construct implicit setters and getters
   * (adding constraint checks with mODELcLASS.check( propName, propDef, val) only if
   * mODELcLASS.areConstraintsToBeChecked is true)
   */
  for (const p of Object.keys( propDefs)) {
    var pDef = propDefs[p], range = pDef.range, 
        val, rangeTypes=[], i=0, validationResult=null;
    //...  
  }
  // call the functions for initial value expressions
  for (const p of propsWithInitialValFunc) {
    var f = propDefs[p].initialValue;
    if (f.length === 0) this[p] = f();
    else this[p] = f.call( this);
  }
  /*
  if (supertypeName) {
    constr.supertypeName = supertypeName;
    superclass = mODELcLASS[supertypeName];
    // apply classical inheritance pattern for methods
    constr.prototype = Object.create( superclass.prototype);
    constr.prototype.constructor = constr;
    // merge superclass property declarations with own property declarations
    constr.properties = Object.create( superclass.properties);
   //  assign own property declarations, possibly overriding super-props                                     
    Object.keys( propDefs).forEach( function (p) {
      constr.properties[p] = propDefs[p];
    });
  } else {  // if class is root class
    constr.properties = propDefs;
    constr.prototype.set = function ( prop, val) {
      // this = object
      var validationResult = null;
      if (mODELcLASS.areConstraintsToBeChecked) {
        validationResult = mODELcLASS.check( prop, this.constructor.properties[prop], val);
        if (!(validationResult instanceof NoConstraintViolation)) throw validationResult;
        else this[prop] = validationResult.checkedValue;
      } else this[prop] = val;
    };
  }
  // store class/constructor as value associated with its name in a map
  mODELcLASS[classSlots.Name] = constr;
  // initialize the class-level instances property
  if (!classSlots.isAbstract) {
    mODELcLASS[classSlots.Name].instances = {};
  }
  */
};
// A flag for disabling constraint checking
mODELcLASS.areConstraintsToBeChecked = true;
