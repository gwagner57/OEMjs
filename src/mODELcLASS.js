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
// define lists of datatype names
mODELcLASS.integerTypes = ["Integer","PositiveInteger","NonNegativeInteger","AutoIdNumber"];
mODELcLASS.decimalTypes = ["Number","Decimal","Percent","ClosedUnitInterval","OpenUnitInterval"];
mODELcLASS.numericTypes = mODELcLASS.integerTypes.concat( mODELcLASS.decimalTypes);
/**
  * Determine if a type is an integer type.
  * @method
  * @author Gerd Wagner
  * @param {string|eNUMERATION} T  The type to be checked.
  * @return {boolean}
  */
mODELcLASS.isIntegerType = function (T) {
  return mODELcLASS.integerTypes.includes(T) || T instanceof eNUMERATION;
};
/**
  * Determine if a type is a decimal type.
  * @method
  * @author Gerd Wagner
  * @param {string} T  The type to be checked.
  * @return {boolean}
  */
 mODELcLASS.isDecimalType = function (T) {
   return mODELcLASS.decimalTypes.includes(T);
 };
 /**
  * Constants
  */
 mODELcLASS.patterns = {
   ID: /^([a-zA-Z0-9][a-zA-Z0-9_\-]+[a-zA-Z0-9])$/,
   // defined in WHATWG HTML5 specification
   EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
   // proposed by Diego Perini (https://gist.github.com/729294)
   URL: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
   INT_PHONE_NO: /^\+(?:[0-9] ?){6,14}[0-9]$/
 };
 /**
  * Generic method for checking the integrity constraints defined in property declarations.
  * The values to be checked are first parsed/deserialized if provided as strings.
  * Copied from the cOMPLEXtYPE class of oNTOjs
  *
  * min/max: numeric (or string length) minimum/maximum
  * optional: true if property is single-valued and optional (false by default)
  * range: String|NonEmptyString|Integer|...
  * pattern: a regular expression to be matched
  * minCard/maxCard: minimum/maximum cardinality of a multi-valued property
  *     By default, maxCard is 1, implying that the property is single-valued, in which
  *     case minCard is meaningless/ignored. maxCard may be Infinity.
  *
  * @method
  * @author Gerd Wagner
  * @param {string} fld  The property for which a value is to be checked.
  * @param {object} decl  The property's declaration.
  * @param {string|number|boolean|object} val  The value to be checked.
  * @param optParams.checkRefInt  Check referential integrity
  * @return {ConstraintViolation}  The constraint violation object.
  */
 mODELcLASS.check = function (fld, decl, val, optParams) {
   var constrVio=null, valuesToCheck=[],
       msg = decl.patternMessage || "",
       minCard = decl.minCard !== "undefined" ? decl.minCard : decl.optional?0:1,  // by default, a property is mandatory
       maxCard = decl.maxCard || 1,  // by default, a property is single-valued
       min = decl.min, max = decl.max,
       range = decl.range,
       pattern = decl.pattern;
   // check Mandatory Value Constraint
   if (val === undefined || val === "") {
     if (decl.optional) return new NoConstraintViolation();
     else {
       return new MandatoryValueConstraintViolation(
           "A value for "+ fld +" is required!");
     }
   }
   if (maxCard === 1) {  // single-valued property
     valuesToCheck = [val];
   } else {  // multi-valued properties can be array-valued or map-valued
     if (Array.isArray( val) ) {
       valuesToCheck = val;
     } else if (typeof range === "string" && mODELcLASS[range]) {
       if (!decl.isOrdered) {
         valuesToCheck = Object.keys( val).map( function (id) {
           return val[id];
         });
       } else {
         return new RangeConstraintViolation("Values for the ordered property "+ fld +
             " must be arrays, and not maps!");
       }
     } else {
       return new RangeConstraintViolation("Values for "+ fld +
           " must be arrays or maps of IDs to mODELcLASS instances!");
     }
   }
   // convert integer strings to integers
   if (mODELcLASS.isIntegerType( range)) {
     valuesToCheck.forEach( function (v,i) {
       if (typeof v === "string") valuesToCheck[i] = parseInt( v);
     });
   }
   // convert decimal strings to decimal numbers
   if (mODELcLASS.isDecimalType( range)) {
     valuesToCheck.forEach( function (v,i) {
       if (typeof v === "string") valuesToCheck[i] = parseFloat( v);
     });
   }
   /*********************************************************************
    ***  Convert value strings to values and check range constraints ****
    ********************************************************************/
   switch (range) {
     case "String":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "string") {
           constrVio = new RangeConstraintViolation("Values for "+ fld +
               " must be strings!");
         }
       });
       break;
     case "NonEmptyString":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "string" || v.trim() === "") {
           constrVio = new RangeConstraintViolation("Values for "+ fld +
               " must be non-empty strings!");
         }
       });
       break;
     case "Identifier":  // add regexp test
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "string" || v.trim() === "" || !mODELcLASS.patterns.ID.test( v)) {
           constrVio = new RangeConstraintViolation("Values for "+ fld +
               " must be valid identifiers/names!");
         }
       });
       break;
     case "Email":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "string" || !mODELcLASS.patterns.EMAIL.test( v)) {
           constrVio = new RangeConstraintViolation("Values for "+ fld +
               " must be valid email addresses!");
         }
       });
       break;
     case "URL":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "string" || !mODELcLASS.patterns.URL.test( v)) {
           constrVio = new RangeConstraintViolation("Values for "+ fld +
               " must be valid URLs!");
         }
       });
       break;
     case "PhoneNumber":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "string" || !mODELcLASS.patterns.INT_PHONE_NO.test( v)) {
           constrVio = new RangeConstraintViolation("Values for "+ fld +
               " must be valid international phone numbers!");
         }
       });
       break;
     case "Integer":
       valuesToCheck.forEach( function (v) {
         if (!Number.isInteger(v)) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be an integer!");
         }
       });
       break;
     case "NonNegativeInteger":
       valuesToCheck.forEach( function (v) {
         if (!Number.isInteger(v) || v < 0) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a non-negative integer!");
         }
       });
       break;
     case "AutoIdNumber":
       if (valuesToCheck.length === 1) {
         if (!Number.isInteger( valuesToCheck[0]) || valuesToCheck[0] < 1) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a positive integer!");
         }
       } else {
         constrVio = new RangeConstraintViolation("The value of "+ fld +
             " must not be a collection like "+ valuesToCheck);
       }
       break;
     case "PositiveInteger":
       valuesToCheck.forEach( function (v) {
         if (!Number.isInteger(v) || v < 1) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a positive integer!");
         }
       });
       break;
     case "Number":
     case "Decimal":
     case "Percent":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "number") {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a (decimal) number!");
         }
       });
       break;
     case "ClosedUnitInterval":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "number") {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a (decimal) number!");
         } else if (v<0 || v>1) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a number in [0,1]!");
         }
       });
       break;
     case "OpenUnitInterval":
       valuesToCheck.forEach( function (v) {
         if (typeof v !== "number") {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a (decimal) number!");
         } else if (v<=0 || v>=1) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be a number in (0,1)!");
         }
       });
       break;
     case "Boolean":
       valuesToCheck.forEach( function (v,i) {
         if (typeof v === "string") {
           if (["true","yes"].includes(v)) valuesToCheck[i] = true;
           else if (["no","false"].includes(v)) valuesToCheck[i] = false;
           else constrVio = new RangeConstraintViolation("The value of "+ fld +
                 " must be either 'true'/'yes' or 'false'/'no'!");
         } else if (typeof v !== "boolean") {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be either 'true' or 'false'!");
         }
       });
       break;
     case "Date":
       valuesToCheck.forEach( function (v,i) {
         if (typeof v === "string" &&
             /\d{4}-(0\d|1[0-2])-([0-2]\d|3[0-1])/.test(v) && !isNaN( Date.parse(v))) {
           valuesToCheck[i] = new Date(v);
         } else if (!(v instanceof Date)) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be either a Date value or an ISO date string. "+
               v +" is not admissible!");
         }
       });
       break;
     case "DateTime":
       valuesToCheck.forEach( function (v,i) {
         if (typeof v === "string" && !isNaN( Date.parse(v))) {
           valuesToCheck[i] = new Date(v);
         } else if (!(v instanceof Date)) {
           constrVio = new RangeConstraintViolation("The value of "+ fld +
               " must be either a Date value or an ISO date-time string. "+
               v +" is not admissible!");
         }
       });
       break;
     default:
       if (range instanceof eNUMERATION || typeof range === "string" && eNUMERATION[range]) {
         if (typeof range === "string") range = eNUMERATION[range];
         valuesToCheck.forEach( function (v) {
           if (!Number.isInteger( v) || v < 1 || v > range.MAX) {
             constrVio = new RangeConstraintViolation("The value "+ v +
                 " is not an admissible enumeration integer for "+ fld);
           }
         });
       } else if (Array.isArray( range)) {
         // *** Ad-hoc enumeration ***
         valuesToCheck.forEach( function (v) {
           if (range.indexOf(v) === -1) {
             constrVio = new RangeConstraintViolation("The "+ fld +" value "+ v +
                 " is not in value list "+ range.toString());
           }
         });
       } else if (typeof range === "string" && mODELcLASS[range]) {
         valuesToCheck.forEach( function (v, i) {
           var recFldNames=[], propDefs={};
           if (!mODELcLASS[range].isComplexDatatype && !(v instanceof mODELcLASS[range])) {
             // convert IdRef to object reference
             if (mODELcLASS[range].instances[String(v)]) {
               v = valuesToCheck[i] = mODELcLASS[range].instances[String(v)];
             } else if (optParams && optParams.checkRefInt) {
               constrVio = new ReferentialIntegrityConstraintViolation("The value " + v +
                   " of property '"+ fld +"' is not an ID of any " + range + " object!");
             }
           } else if (mODELcLASS[range].isComplexDatatype && typeof v === "object") {
             v = Object.assign({}, v);  // use a clone
             // v is a record that must comply with the complex datatype
             recFldNames = Object.keys(v);
             propDefs = mODELcLASS[range].properties;
             // test if all mandatory properties occur in v and if all fields of v are properties
             if (Object.keys( propDefs).every( function (p) {return !!propDefs[p].optional || p in v;}) &&
                 recFldNames.every( function (fld) {return !!propDefs[fld];})) {
               recFldNames.forEach( function (p) {
                 var validationResult = mODELcLASS.check( p, propDefs[p], v[p]);
                 if (validationResult instanceof NoConstraintViolation) {
                   v[p] = validationResult.checkedValue;
                 } else {
                   throw validationResult;
                 }
               })
             } else {
               constrVio = new RangeConstraintViolation("The value of " + fld +
                   " must be an instance of "+ range +" or a compatible record!"+
                   JSON.stringify(v) + " is not admissible!");
             }
/* DROP
           } else {  // v may be a (numeric or string) ID ref
             if (typeof v === "string") {
               if (!isNaN( parseInt(v))) v = valuesToCheck[i] = parseInt(v);
             } else if (!Number.isInteger(v)) {
               constrVio = new RangeConstraintViolation("The value (" + JSON.stringify(v) +
                   ") of property '" +fld + "' is neither an integer nor a string!");
             }
*/
           }
         });
       } else if (typeof range === "string" && range.includes("|")) {
         valuesToCheck.forEach( function (v, i) {
           var rangeTypes=[];
           rangeTypes = range.split("|");
           if (typeof v === "object") {
             if (!rangeTypes.some( function (rc) {
               return v instanceof mODELcLASS[rc];
             })) {
               constrVio = new ReferentialIntegrityConstraintViolation("The object " + JSON.stringify(v) +
                   " is not an instance of any class from " + range + "!");
             } else {
               v = valuesToCheck[i] = v.id;  // convert to IdRef
             }
           } else if (Number.isInteger(v)) {
             if (optParams && optParams.checkRefInt) {
               if (!mODELcLASS[range].instances[String(v)]) {
                 constrVio = new ReferentialIntegrityConstraintViolation("The value " + v +
                     " of property '"+ fld +"' is not an ID of any " + range + " object!");
               }
             }
           } else if (typeof v === "string") {
             if (!isNaN( parseInt(v))) v = valuesToCheck[i] = parseInt(v);
           } else {
             constrVio = new RangeConstraintViolation("The value (" + v + ") of property '" +
                 fld + "' is neither an integer nor a string!");
           }
         });
       } else if (typeof range === "object" && range.dataType !== undefined) {
         // the range is a (collection) datatype declaration record
         valuesToCheck.forEach( function (v) {
           var i = 0;
           if (typeof v !== "object") {
             constrVio = new RangeConstraintViolation("The value of " + fld +
                 " must be an object! " + JSON.stringify(v) + " is not admissible!");
           }
           switch (range.dataType) {
           case "Array":
             if (!Array.isArray(v)) {
               constrVio = new RangeConstraintViolation("The value of " + fld +
                   " must be an array! " + JSON.stringify(v) + " is not admissible!");
               break;
             }
             if (v.length !== range.size) {
               constrVio = new RangeConstraintViolation("The value of " + fld +
                   " must be an array of length " + range.size + "! " + JSON.stringify(v) + " is not admissible!");
               break;
             }
             for (i = 0; i < v.length; i++) {
               if (!mODELcLASS.isOfType(v[i], range.itemType)) {
                 constrVio = new RangeConstraintViolation("The items of " + fld +
                     " must be of type " + range.itemType + "! " + JSON.stringify(v) +
                     " is not admissible!");
               }
             }
             break;
           case "ArrayList":
             if (!Array.isArray(v)) {
               constrVio = new RangeConstraintViolation("The value of " + fld +
                   " must be an array! " + JSON.stringify(v) + " is not admissible!");
               break;
             }
             for (i = 0; i < v.length; i++) {
               if (!mODELcLASS.isOfType(v[i], range.itemType)) {
                 constrVio = new RangeConstraintViolation("The items of " + fld +
                     " must be of type " + range.itemType + "! " + JSON.stringify(v) +
                     " is not admissible!");
               }
             }
             break;
           }
         });
       } else if (range === Object) {
         valuesToCheck.forEach(function (v) {
           if (!(v instanceof Object)) {
             constrVio = new RangeConstraintViolation("The value of " + fld +
                 " must be a JS object! " + JSON.stringify(v) + " is not admissible!");
           }
         });
       }
   }
   // return constraint violation found in range switch
   if (constrVio) return constrVio;

   /********************************************************
    ***  Check constraints that apply to several ranges  ***
    ********************************************************/
   if (range === "String" || range === "NonEmptyString") {
     valuesToCheck.forEach( function (v) {
       if (min !== undefined && v.length < min) {
         constrVio = new StringLengthConstraintViolation("The length of "+
             fld + " must not be smaller than "+ min);
       } else if (max !== undefined && v.length > max) {
         constrVio = new StringLengthConstraintViolation("The length of "+
             fld + " must not be greater than "+ max);
       } else if (pattern !== undefined && !pattern.test( v)) {
         constrVio = new PatternConstraintViolation( msg || v +
             "does not comply with the pattern defined for "+ fld);
       }
     });
   }
   // check Interval Constraints
   if (mODELcLASS.range2JsDataType( range) === "number") {
     valuesToCheck.forEach( function (v) {
       if (min !== undefined && v < min) {
         constrVio = new IntervalConstraintViolation( fld +
             " must be greater than "+ min);
       } else if (max !== undefined && v > max) {
         constrVio = new IntervalConstraintViolation( fld +
             " must be smaller than "+ max);
       }
     });
   }
   if (constrVio) return constrVio;

   /********************************************************
    ***  Check cardinality constraints  *********************
    ********************************************************/
   if (maxCard > 1) { // (a multi-valued property can be array- or map-valued)
     // check minimum cardinality constraint
     if (minCard > 0 && valuesToCheck.length < minCard) {
       return new CardinalityConstraintViolation("A collection of at least "+
           minCard +" values is required for "+ fld);
     }
     // check maximum cardinality constraint
     if (valuesToCheck.length > maxCard) {
       return new CardinalityConstraintViolation("A collection value for "+
           fld +" must not have more than "+ maxCard +" members!");
     }
   }
   // return deserialized value available in validationResult.checkedValue
   return new NoConstraintViolation( maxCard === 1 ? valuesToCheck[0] : valuesToCheck);
 };
 /**
  * Map range datatype to JS datatype.
  * @method
  * @author Gerd Wagner
  * @return {string}
  */
 mODELcLASS.range2JsDataType = function ( range) {
   var jsDataType="";
   switch (range) {
     case "String":
     case "NonEmptyString":
     case "Email":
     case "URL":
     case "PhoneNumber":
     case "Date":
       jsDataType = "string";
       break;
     case "Integer":
     case "NonNegativeInteger":
     case "PositiveInteger":
     case "Number":
     case "AutoIdNumber":
     case "Decimal":
     case "Percent":
     case "ClosedUnitInterval":
     case "OpenUnitInterval":
       jsDataType = "number";
       break;
     case "Boolean":
       jsDataType = "boolean";
       break;
     default:
       if (range instanceof eNUMERATION) {
         jsDataType = "number";
       } else if (typeof range === "string" && mODELcLASS[range]) {
         jsDataType = "string";  // for the standard ID (TODO: can also be "number")
       } else if (typeof range === "object") {  // a.g. Array or Object
         jsDataType = "object";
       }
   }
   return jsDataType;
 };
 /**
  * Check if a value is of some type.
  * @method
  * @author Gerd Wagner
  * @return {boolean}
  */
 mODELcLASS.isOfType = function ( v, Type) {
   switch (Type) {
     case "String": return (typeof v === "string");
     case "NonEmptyString": return (typeof v === "string" && v.trim() !== "");
     case "Integer": return Number.isInteger(v);
     case "NonNegativeInteger": return (Number.isInteger(v) && v >= 0);
     case "PositiveInteger": return (Number.isInteger(v) && v > 0);
     case "Decimal": return (typeof v === "number");
     case "ClosedUnitInterval":
       return (typeof v === "number" && v>=0 && v<=1);
     case "OpenUnitInterval":
       return (typeof v === "number" && v>0 && v<1);
     default: return true;
   }
 };

 /********************************************************
  ***  Collection datatypes  *****************************
  ********************************************************/
/*
 * mODELcLASS datatypes, such as collection types, are defined in the form of
 * cOLLECTIONdATATYPE objects that specify the collection type, the
 * item type and the size of the collection.
 */
 mODELcLASS.cOLLECTIONdATATYPE = function (typeName, itemType, size, optParams) {
   this.type = typeName;
   this.itemType = itemType;
   this.size = size;
   this.optParams = optParams;
 };
 mODELcLASS.Array = function (itemType, size, optParams) {
  if (this instanceof mODELcLASS.Array) {
    // called with new, so return an array object
    this.type = "Array";
    this.itemType = itemType;
    this.size = size;
    if (optParams) {
      if (optParams.constraints) this.constraints = optParams.constraints; //TODO
      if (optParams.decimalPlaces) this.decimalPlaces = optParams.decimalPlaces;
    }
    this.array = new Array( size);
  } else {
    // called without new, return an object representing an Array datatype
    return new mODELcLASS.cOLLECTIONdATATYPE("Array",
        {itemType:itemType, size:size, optParams:optParams});
  }
 };
mODELcLASS.ArrayList = function (itemType, constraints) {
   if (constraints) {
     return {dataType:"ArrayList", itemType: itemType, constraints: constraints};
   } else return {dataType:"ArrayList", itemType: itemType};
 };
mODELcLASS.Map = function (itemType, constraints) {
  if (constraints) {
    return {dataType:"Map", itemType: itemType, constraints: constraints};
  } else return {dataType:"Map", itemType: itemType};
};

mODELcLASS.RingBuffer = function (itemType, size, optParams) {
  if (this instanceof mODELcLASS.RingBuffer) {
    // called with new, so return a ring buffer object
    this.type = "RingBuffer";
    this.itemType = itemType;
    this.size = size;
    if (optParams) {
      if (optParams.constraints) this.constraints = optParams.constraints; //TODO
      if (optParams.decimalPlaces) this.decimalPlaces = optParams.decimalPlaces;
    }
    this.first = 0;  // index of first item
    this.last = -1;  // index of last item
    this.buffer = new Array( size);
  } else {
    // called without new, return an object representing a RingBuffer datatype
    return new mODELcLASS.cOLLECTIONdATATYPE("RingBuffer",
        {itemType:itemType, size:size, optParams:optParams});
  }
};
mODELcLASS.RingBuffer.prototype.nmrOfItems = function () {
  if (this.last === -1) return 0;
  else if (this.first <= this.last) return this.last - this.first + 1;
  else return this.last + this.size - this.first + 1;
};
mODELcLASS.RingBuffer.prototype.add = function (item) {
  if (this.nmrOfItems() < this.size) {
   this.last++;  // still filling the buffer
  } else {  // buffer is full, move both pointers
   this.first = (this.first+1) % this.size;
   this.last = (this.last+1) % this.size;
  }
  this.buffer[this.last] = item;
};
mODELcLASS.RingBuffer.prototype.toString = function (n) {
  var i=0, str = "[", item, roundingFactor=1,
      N = this.nmrOfItems(),
      outputLen = n ? Math.min( n, N) : N;
  if (N === 0) return " ";
  for (i=0; i < outputLen; i++) {
    item = this.buffer[(this.first+i) % this.size];
    // serialize enum values as labels
    if (this.itemType instanceof eNUMERATION) item = this.itemType.labels[item-1];
    else if (mODELcLASS.isDecimalType( this.itemType)) {
      //decimalPlaces:
      roundingFactor = Math.pow( 10, this.decimalPlaces);
      item = Math.round( item * roundingFactor) / roundingFactor;
    }
    str += item;
    if (i < outputLen-1) str += ", ";
  }
  return str + "]";
 };
// Simple Moving Average (SMA)
 mODELcLASS.RingBuffer.prototype.getSMA = function (n) {
   var N = this.nmrOfItems(), i=0, val=0, sum=0;
   if (n) N = Math.min( n, N);
   for (i=0; i < N; i++) {
     val = this.buffer[(this.first+i) % this.size];
     sum += val;
   }
   return sum / N;
 };
