/**
 * @fileOverview  The "datatypes" library
 * @author Gerd Wagner
 * @copyright Copyright 2022-2023 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 *
 * TODO: + take care of proper Date conversions in IndexedDB objSlots2recSlots and rec2obj
 * + check ID constraints in CREATE view and storageManager.add
 * +
 */
import eNUMERATION from "./eNUMERATION.mjs";
import { NoConstraintViolation,
  MandatoryValueConstraintViolation, RangeConstraintViolation,
  StringLengthConstraintViolation, IntervalConstraintViolation,
  PatternConstraintViolation, CardinalityConstraintViolation, UniquenessConstraintViolation,
  ReferentialIntegrityConstraintViolation, FrozenValueConstraintViolation }
  from "./constraint-violation-error-types.mjs";

// define the equality operation for certain types of JS objects
Date.prototype.isEqualTo = function (date2) {
  return this.getTime() === date2.getTime()
};
Array.prototype.isEqualTo = function (a2) {
  return (this.length === a2.length) &&
      this.every( (el,i) => el===a2[i]);
};

const dt = {
  classes: {},
  checkReferentialIntegrity: true,  // flag for disabling referential integrity checking
  defaultDecimalPlaces: 2,
  maxLevelOfComplexDatatypeNesting: 3,
  // define lists of datatype names
  stringTypes: ["String","NonEmptyString","Identifier","Email","URL","PhoneNumber","Text"],
  integerTypes: ["Integer","PositiveInteger","NonNegativeInteger","AutoIdNumber","Year"],
  decimalTypes: ["Number","Decimal","Percent","ClosedUnitInterval","OpenUnitInterval"],
  otherPrimitiveTypes: ["Boolean","Date","DateTime"],
  primitiveReferenceTypes: ["Date","DateTime"],  // values are special JS objects
  JSONCollectionDataTypes: ["JSON-Array","JSON-Object"],  // JSON arrays and objects
  patterns: {
    ID: /^([a-zA-Z0-9][a-zA-Z0-9_\-]+[a-zA-Z0-9])$/,
    // defined in WHATWG HTML5 specification
    EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    // proposed by Diego Perini (https://gist.github.com/729294)
    URL: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
    INT_PHONE_NO: /^\+(?:[0-9] ?){6,14}[0-9]$/
  },
  round( x, decimalPlaces=dt.defaultDecimalPlaces) {
    const roundingFactor = Math.pow(10, decimalPlaces);
    return Math.round((x + Number.EPSILON) * roundingFactor) / roundingFactor;
  },
  isStringType(T) {return dt.stringTypes.includes(T);},
  isIntegerType(T) {return dt.integerTypes.includes(T) ||
      (typeof eNUMERATION === "function" && (T instanceof eNUMERATION || T in eNUMERATION));},
  isDecimalType(T) {return dt.decimalTypes.includes(T);},
  isNumberType(T) {return dt.numericTypes.includes(T);},
  isIntegerString(x) {
    return typeof(x) === "string" && x.search(/^-?[0-9]+$/) === 0;
  },
  isDateString(v) {
    return typeof v === "string" &&
        /\d{4}-(0\d|1[0-2])-([0-2]\d|3[0-1])/.test(v) && !isNaN(Date.parse(v));
  },
  isDateTimeString(v) {
    return typeof(v) === "string" && v.search(/^-?[0-9]+$/) === 0;
  },
  /**
   * Determines the implicit datatype of a value.
   * @param {*} value
   * @return {string}
   */
  determineDatatype( value) {
    var dataType="";
    if (typeof value === "string") {
      dataType = "String";
    } else if (Number.isInteger(value)) {
      if (1800<=value && value<2100) dataType = "Year";
      else dataType = "Integer";
    } else if (typeof value === "number") {
      dataType = "Decimal";
    } else if (Array.isArray( value)) {
      dataType = "JSON-Array";
    } else if (typeof value === "object" && Object.keys( value).length > 0) {
      dataType = "JSON-Object";
    }
    return dataType;
  },
  /**
   * Converts a string to a value according to a prescribed datatype.
   * The return value is undefined, if the string does not comply with the datatype.
   * @param {string} valStr - the string to be converted
   * @param {string} type - one of: Integer, Year, Decimal, List, Record, ...
   * @return {*}
   */
  parseValueString( valStr, type) {
    var value=[], valueStringsToParse=[];
    if (!dt.isStringType( type) && valStr.includes(", ")) {  // a list/collection value
      valueStringsToParse = valStr.split(", ");
    } else {
      valueStringsToParse = [valStr];
    }
    if (dt.isStringType( type)) {
      for (const str of valueStringsToParse) {
        if (!dt.dataTypes[type].condition( str)) {
          value = undefined;
          console.error(`The string value ${str} is not of type ${type}`);
          break;
        } else {
          value.push( str);
        }
      }
    } else if (dt.isIntegerType( type)) {
      for (const str of valueStringsToParse) {
        if (isNaN( parseInt( str)) || !dt.dataTypes[type].stringCondition( str)) {
          value = undefined;
          console.error(`The value string ${str} does not conform to the type ${type}`);
          break;
        } else {
          value.push( parseInt( str));
        }
      }
    } else if (dt.isDecimalType( type)) {
      for (const str of valueStringsToParse) {
        if (isNaN( parseFloat( str)) || !dt.dataTypes[type].stringCondition( str)) {
          value = undefined;
          console.error(`The value string ${str} does not conform to the type ${type}`);
          break;
        } else {
          value.push( parseFloat( str));
        }
      }
    } else {
      switch (type) {
      case "Date":
      case "DateTime":
        for (const str of valueStringsToParse) {
          if (isNaN( Date.parse( str))) {
            value = undefined;
            console.error(`The value string ${str} does not conform to the type ${type}`);
            break;
          } else {
            value.push( Date.parse( str));
          }
        }
        break;
      case "Boolean":
        for (const str of valueStringsToParse) {
          if (!["true","yes","false","no"].includes( str)) {
            value = undefined;
            console.error(`The value string ${str} does not conform to the type ${type}`);
            break;
          } else {
            value.push(["true","yes"].includes( str));
          }
        }
        break;
      case "JSON-Array":
      case "JSON-Object":
        for (const str of valueStringsToParse) {
          let val;
          try {
            val = JSON.parse( str);
          } catch (error) {
            value = undefined;
            console.error(`The value string ${str} does not conform to the type ${type}`);
            break;
          }
          if (val) value.push( val);
        }
        break;
      default:
        if (type in dt.classes) {
          for (const str of valueStringsToParse) {  // should be an ID
            const obj = dt.classes[type].instances[str];
            if (!obj) {
              value = undefined;
              console.error(`The value string ${str} does not represent an ID of an instance of the class ${type}`);
              break;
            } else {
              value.push( obj.id);  // convert to object IDs
            }
          }
        } else if (type in dt.dataTypes && "str2val" in dt.dataTypes[type] &&
            dt.isOfType( value, type)) {
          value = dt.dataTypes[type].str2val( valStr);
        } else {
          value = undefined;
        }
      }
    }
    if (value && value.length === 1) {  // single value
      value = value[0];
    }
    return value;
  },
  /**
   * Converts a value to a string according to an explicitly provided (or implicit) datatype.
   * The return value is undefined, if the string does not comply with the datatype.
   * @param {string} value - the value to be stringified
   * @param {string} type - one of: Integer, Year, Decimal, List, Record
   * @param {number} decimalPlaces
   * @return {string}
   */
  stringifyValue( value, type, decimalPlaces=dt.defaultDecimalPlaces) {
    let string="", valuesToStringify=[];
    if (!type) type = dt.determineDatatype( value);
    // make sure value is an array
    if (!Array.isArray( value)) {
      if (type in dt.classes && typeof value === "object" &&
          Object.keys(value).every( id => value[id] instanceof dt.classes[type])) {
        // value is an entity table (a map from IDs to objects of a certain type)
        valuesToStringify = Object.keys( value);
      } else {
        valuesToStringify = [value];
      }
    } else {
      valuesToStringify = value;
    }
    if (type in dt.dataTypes) {
      if (dt.isDecimalType( type)) {
        string = valuesToStringify.map( v => dt.round( v, decimalPlaces)).join(", ");
      } else {
        string = valuesToStringify.map( v => dt.isOfType( v, type) && "val2str" in dt.dataTypes[type] ?
            dt.dataTypes[type].val2str( v) : String(v)).join(", ");
      }
    } else if (type instanceof eNUMERATION) {
      string = valuesToStringify.map( v => type.labels[v-1]).join(", ");
    } else if (type in dt.classes) {
      const Class = dt.classes[type];
      let displayAttr="";
      if ("name" in Class.properties) displayAttr = "name";
      else displayAttr = Class.idAttribute;
      string = valuesToStringify.map( v => v instanceof Class ? v[displayAttr] : v).join(", ");
    } else if (type === "JSON-Array" || type === "JSON-Object") {
      string = valuesToStringify.map( v => JSON.stringify( v)).join(", ");
    }
    return string;
  },
  /*** from https://stackoverflow.com/questions/5646279/get-object-class-from-string-name-in-javascript/53199720
   *** works only for classes in the global namespace
   */
  getClassByName( name){
    var Class=null;
    if (name.match(/^[a-zA-Z0-9_]+$/)) {
      // proceed only if the name is a single word string
      Class = eval( name);
    } else {  // not a name
      throw new Error("getClass requires a single word string as argument!");
    }
    return Class;
    // Alternative solution: Class = this[name];
  },
  registerModelClasses( listOfClassNames) {  // Make classes accessible via their name
    for (const className of listOfClassNames) {
      dt.classes[className] = dt.getClassByName( className);
    }
  },
  // https://stackoverflow.com/questions/526559/testing-if-something-is-a-class-in-javascript
  isClass( C) {
    return typeof C === "function" && C.prototype !== undefined;
  },
  isSubclassOf( C, D) {
    return C.prototype instanceof D
  },
  /********************************************************************
   Assuming that in the case of a simple entity table, the first entity record
   defines the attributes/structure of the table, check if all records include
   these attributes. Otherwise, for an entity table with attribute declarations,
   check if all records satisfy the declarations.
   ********************************************************************/
  checkEntityTable( entityRecords, columnDeclarations) {
    if (!(entityRecords instanceof Object) ||
        Object.keys( entityRecords).length === 0) {
      return new Error(`Invalid entity records: ${entityRecords}`);
    }
    const entityIDs = Object.keys( entityRecords);
    let attributeNames=[], constrVio=[];
    if (columnDeclarations) {
      attributeNames = Object.keys( columnDeclarations);
    } else {
      const firstEntityRecord = entityRecords[entityIDs[0]];
      attributeNames = Object.keys( firstEntityRecord);
    }
    for (const id of entityIDs) {
      const record = entityRecords[id],
      recFields = Object.keys( record);
      for (const attr of attributeNames) {
        if (!recFields.includes( attr)) {
          constrVio.push( new Error(`The attribute ${attr} is missing in record with ID ${id}.`));
          return constrVio;
        }
        if (columnDeclarations) {
          const val = record[attr],
                range = columnDeclarations[attr].range;
          if (!range) {
            constrVio.push( new Error(`The attribute declaration of ${attr} does not declare the range of the attribute!`));
          } else if (!dt.supportedDatatypes.includes( range)  && !(range in dt.classes)) {
            constrVio.push( new Error(`The range ${range} is not a supported datatype or class! ${JSON.stringify(dt.classes)}`));
          }
          constrVio.push( ...dt.check( attr, columnDeclarations[attr], val));
          if (constrVio[constrVio.length-1] instanceof NoConstraintViolation) {
            constrVio.length -= 1;  // drop
          }
        }
      }
    }
    return constrVio;
  },
  dataTypes: {
    "String": {phrase:"a string",
        condition: value => typeof value === "string"},
    "Text": {phrase:"a text",
      condition: value => typeof value === "string"},
    "NonEmptyString": {phrase:"a non-empty string",
        condition: value => typeof value === "string" && value.trim() !== ""},
    "Email": {phrase:"an email address",
        condition: v => typeof v === "string" && v.trim() !== "" && dt.patterns.EMAIL.test( v)},
    "URL": {phrase:"a URL",
        condition: v => typeof v === "string" && v.trim() !== "" && dt.patterns.URL.test( v)},
    "PhoneNumber": {phrase:"an international phone number",
        condition: v => typeof v === "string" && v.trim() !== "" && dt.patterns.INT_PHONE_NO.test( v)},
    "Identifier": {phrase:"an identifier",  // an alphanumeric/"-"/"_" string
        condition: v => typeof v === "string" && v.trim() !== "" && dt.patterns.ID.test( v)},
    "Integer": {phrase:"an integer",
        stringCondition: valStr => dt.isIntegerString( valStr),
        condition: value => Number.isInteger( value)},
    "NonNegativeInteger": {phrase:"a non-negative integer",
        stringCondition: valStr => dt.isIntegerString( valStr) && parseInt( valStr) >= 0,
        condition: value => Number.isInteger(value) && value >= 0},
    "PositiveInteger": {phrase:"a positive integer",
        stringCondition: valStr => dt.isIntegerString( valStr) && parseInt( valStr) > 0,
        condition: value => Number.isInteger(value) && value > 0},
    "AutoIdNumber": {phrase:"a positive integer as required for an auto-ID",
        stringCondition: valStr => dt.isIntegerString( valStr) && parseInt( valStr) > 0,
        condition: value => Number.isInteger(value) && value > 0},
    "Year": {phrase:"a year number (between 1000 and 9999)",
        stringCondition: valStr => dt.isIntegerString( valStr) &&
            parseInt( valStr) >= 1000 && parseInt( valStr) <= 9999,
        condition: value => Number.isInteger(value) && value >= 1000 && value <= 9999},
    "Number": {phrase:"a number",
        stringCondition: valStr => !isNaN( parseFloat( valStr)) &&
            String( parseFloat( valStr)) === valStr,
        condition: value => typeof value === "number"},
    "Decimal": {phrase:"a decimal number",
        stringCondition: valStr => String( parseFloat( valStr)) === valStr,
        condition: value => typeof value === "number"},
    "Percent": {phrase:"a percentage number",
        stringCondition: valStr => String( parseFloat( valStr)) === valStr,
        condition: value => typeof value === "number"},
    "Probability": {phrase:"a probability number in [0,1]",
        stringCondition: valStr => String( parseFloat( valStr)) === valStr &&
            parseFloat( valStr) <= 1,
        condition: value => typeof value === "number" && value>=0 && value<=1},
    "ClosedUnitInterval": {phrase:"a number in the closed unit interval [0,1]",
        condition: value => typeof value === "number" && value>=0 && value<=1},
    "OpenUnitInterval": {phrase:"a number in the open unit interval (0,1)",
        condition: value => typeof value === "number" && value>0 && value<1},
    "Date": {phrase:"an ISO date string (or a JS Date value)",
        condition: value => value instanceof Date || dt.isDateString(value),
        str2val: s => new Date(s),
        val2str: d => d.toISOString().substring(0,10)},
    "DateTime": {phrase:"an ISO date-time string (or a JS Date value)",
        condition: value => value instanceof Date,
        str2val: s => new Date(s),
        val2str: d => d.toISOString()},
    "Boolean": {phrase:"a Boolean value (true/'yes' or false/'no')",
        condition: value => typeof value === "boolean",
        str2val: s => ["true","yes"].includes(s) ? true :
            (["false","no"].includes(s) ? false : undefined),
        val2str: value => value === true ? "yes" : "no"}
  },
  getDefaultValue( Type) {
    if (dt.isIntegerType( Type)) return 0;
    else if (dt.isDecimalType( Type)) return 0.0;
    else if (Type === "Boolean") return false;
    else if (Type === "Date") return new Date(0);
    else return "";
  },
  isOfType( value, Type) {
    const cond = dt.dataTypes[Type]?.condition;
    return cond !== undefined && cond( value);
  },
  range2JsDataType( range) {
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
      } else if (typeof range === "string" && dt.classes[range]) {
        jsDataType = "string";  // for the standard ID (TODO: can also be "number")
      } else if (typeof range === "object") {  // a.g. Array or Object
        jsDataType = "object";
      }
    }
    return jsDataType;
  },
  /**
   * Generic method for checking the cardinality constraints defined in attribute declarations.

   * optional: true if property is single-valued and optional (false by default)
   * minCard/maxCard: minimum/maximum cardinality of a multi-valued property
   *     By default, maxCard is 1, implying that the property is single-valued, in which
   *     case minCard is meaningless/ignored. maxCard may be Infinity.
   *
   * @method
   * @author Gerd Wagner
   * @param {string} attr  The attribute for which a value is to be checked.
   * @param {object} attrDef  The attribute's declaration.
   * @param val  The value to be checked.
   * @return {object}  The constraint violation object.
   */
  checkCardinality( attr, attrDef, val) {
    var range = attrDef.range,
        constrVio=[], valuesToCheck=[];
    const maxCard = attrDef.maxCard || 1,  // by default, an attribute is single-valued
          // by default, an attribute is mandatory
          minCard = attrDef.minCard !== "undefined" ? attrDef.minCard : (attrDef.optional ? 0 : 1);
    // check Mandatory Value Constraint
    if (val === undefined || val === "") {
      if (attrDef.optional || attrDef.minCard===0 || "inverseOf" in attrDef) constrVio.push(new NoConstraintViolation());
      else constrVio.push(new MandatoryValueConstraintViolation(
          `A value for ${attr} is required!`));
    }
    if (maxCard > 1) { // (a multi-valued attribute can be array- or map-valued)
      if (typeof val === "object" && range in dt.classes) {  // entity table/map
        valuesToCheck = Object.keys( val);
      } else if (Array.isArray( val)) {
        valuesToCheck = val;
      } else {
        constrVio.push( new RangeConstraintViolation(
            `The value ${val} does not represent a collection value for attribute ${attr}.`));
      }
      // check minimum cardinality constraint
      if (minCard > 0 && valuesToCheck.length < minCard) {
        constrVio.push( new CardinalityConstraintViolation(
          `A set of ${minCard} or more values is required for ${attr}.`));
        console.error(`A set of ${minCard} or more values is required for ${attr}. Invalid value: ${JSON.stringify(val)}`);
      }
      // check maximum cardinality constraint
      if (valuesToCheck.length > maxCard) {
        constrVio.push( new CardinalityConstraintViolation("A collection value for "+
            attr +" must not have more than "+ maxCard +" members!"));
      }
    }
    if (constrVio.length === 0) {
      // return de-serialized value available in validationResult.checkedValue
      constrVio.push( new NoConstraintViolation( maxCard === 1 ? valuesToCheck[0] : valuesToCheck));
    }
    return constrVio;
  },
  /**
   * Generic method for checking the integrity constraints defined in attribute declarations.
   * The values to be checked are first parsed if provided as strings.
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
   * @param {string} attr  The attribute for which a value is to be checked.
   * @param {object} attrDef  The attribute's declaration.
   * @param val  The value to be checked.
   * @return {object}  The constraint violation object.
   */
  check( attr, attrDef, val) {
    var range = attrDef.range,
        constrVio=[], valuesToCheck=[];
    const maxCard = attrDef.maxCard || 1,  // by default, an attribute is single-valued
        // by default, an attribute is mandatory
        minCard = attrDef.minCard !== "undefined" ? attrDef.minCard : (attrDef.optional ? 0 : 1),
        min = typeof attrDef.min === "function" ? attrDef.min() : attrDef.min,
        max = typeof attrDef.max === "function" ? attrDef.max() : attrDef.max,
        msg = attrDef.patternMessage || "",
        pattern = attrDef.pattern;
    // check Mandatory Value Constraint
    if (val === undefined || val === "") {
      if (attrDef.optional || "inverseOf" in attrDef) constrVio.push( new NoConstraintViolation());
      else constrVio.push( new MandatoryValueConstraintViolation(
            `A value for ${attr} is required!`));
      return constrVio;
    }
    if (maxCard === 1) {  // single-valued property
      valuesToCheck = [val];
      /*
      if (range === "JSON-Array" && Array.isArray(val)) {
        valuesToCheck = [[...val]];
      } else if (range === "JSON-Object" && typeof val === "object") {
        valuesToCheck = [{...val}];
      } else {
        valuesToCheck = [val];
      }
      */
    } else {  // multi-valued property (value can be an array or a map)
      if (Array.isArray( val) ) {
        if (range in dt.classes) valuesToCheck = [...val];  // clone
        else valuesToCheck = val;
        /*
        if (range === "JSON-Array" && val.every( el => Array.isArray(el))) {
          valuesToCheck = val.map( a => [...a]);
        } else if (range === "JSON-Object" && val.every( el => typeof el === "object")) {
          valuesToCheck = val.map( o => ({...o}));
        } else {
          valuesToCheck = val;
        }
        */
      } else if (typeof val === "object" && range in dt.classes) {  // entity table/map
        if (!attrDef.isOrdered) valuesToCheck = Object.values( val);
        else constrVio.push( new RangeConstraintViolation(
              `The ordered-collection-valued attribute ${attr} must not have a map value like ${val}.`));
      } else {
        constrVio.push( new RangeConstraintViolation(
            `The value ${val} does not represent a collection value for attribute ${attr}.`));
      }
    }
    /***************************************************************
     ***  Convert value strings to values  *************************
     ***************************************************************/
    if (dt.isIntegerType( range)) {  // convert integer strings to integers
      valuesToCheck.forEach( function (v,i) {
        if (typeof v === "string") valuesToCheck[i] = parseInt( v);
      });
    } else if (dt.isDecimalType( range)) {  // convert decimal strings to decimal numbers
      valuesToCheck.forEach( function (v,i) {
        if (typeof v === "string") valuesToCheck[i] = parseFloat( v);
      });
    } else {
      switch (range) {
      case "Boolean":  // convert 'yes'/'no' strings to Boolean true/false
        valuesToCheck.forEach( function (v,i) {
          if (typeof v === "string") {
            if (["true","yes"].includes(v)) valuesToCheck[i] = true;
            else if (["no","false"].includes(v)) valuesToCheck[i] = false;
          }
        });
        break;
      case "Date":  // convert ISO date string to JS Date value
        valuesToCheck.forEach(function (v, i) {
          if (dt.isDateString(v)) valuesToCheck[i] = new Date(v);
        });
        break;
      case "DateTime":  // convert ISO date-time string to JS Date value
        valuesToCheck.forEach(function (v, i) {
          if (typeof v === "string" && !isNaN(Date.parse(v))) valuesToCheck[i] = new Date(v);
        });
        break;
      }
    }
    /********************************************************************
     ***  Check range constraints  **************************************
     ********************************************************************/
    if (range in dt.dataTypes) {
      for (const v of valuesToCheck) {
        if (!dt.dataTypes[range].condition( v)) {
          constrVio.push( new RangeConstraintViolation(
              `The value ${v} of attribute ${attr} is not ${dt.dataTypes[range].phrase}!`));
        }
      }
    } else {
      if (range instanceof eNUMERATION || typeof range === "string" && range in eNUMERATION) {
        if (typeof range === "string") range = eNUMERATION[range];
        for (const v of valuesToCheck) {
          if (!Number.isInteger(v) || v < 1 || v > range.MAX) {
            constrVio.push( new RangeConstraintViolation(
                `The value ${v} is not an admissible enumeration integer for ${attr}`));
          }
        }
      } else if (range instanceof lISTtYPE) {
        for (const v of val) {
          if (typeof range.itemType === "string" && !isOfType( v, range.itemType) ||
              !(range.itemType instanceof lISTtYPE || range.itemType instanceof rECORDtYPE)) {
            constrVio.push( new RangeConstraintViolation(
                `The ${attr} value ${v} is not of type ${range.itemType}`));
          }           
          // Check rECORD properties of lIST
          if (range.itemType instanceof rECORDtYPE) {
            let fieldType = range.itemType.fieldTypes;
            Object.entries(v).forEach(([key,value])=> {
              let fieldDef = fieldType[key];
              if (fieldDef && fieldDef in dt.dataTypes) {
                if (!dt.dataTypes[fieldDef].condition(value)) {
                  constrVio.push( new RangeConstraintViolation(`rECORD value ${value} from ${key} wrong.`));
                }
              }
            });
          } else if (range.itemType instanceof lISTtYPE) {
            if (range.itemType.itemType instanceof lISTtYPE) {
              if (range.itemType.itemType.itemType instanceof lISTtYPE){
                // Reached max level of nested complex data types
                constrVio.push(new RangeConstraintViolation(`Max level of complex data types reached!`));
              }
            }
          }
        }
      } else if (Array.isArray( range)) {  // *** Ad-hoc enumeration ***
        for (const v of valuesToCheck) {
          if (range.indexOf(v) === -1) {
            constrVio.push( new RangeConstraintViolation(
                `The ${attr} value ${v} is not in ad-hoc enumeration ${range.toString()}`));
          }
        }
      } else if (range in dt.classes) {
        const RangeClass = dt.classes[range];  // a bUSINESSoBJECT class
        valuesToCheck.forEach( function (v, i) {
          if (typeof v === "object") {
            if (!(v instanceof RangeClass)) {
              constrVio.push( new ReferentialIntegrityConstraintViolation(
                  `The object ${JSON.stringify(v)} referenced by attribute ${attr} is not from its range ${range}`));
            }
          } else {
            if (v in RangeClass.instances) {  // convert IdRef to object reference
              valuesToCheck[i] = RangeClass.instances[v];
            } else {
              valuesToCheck[i] = v;  // temporarily store ID reference
              if (dt.checkReferentialIntegrity && !(v in RangeClass.instances)) {
                constrVio.push( new ReferentialIntegrityConstraintViolation(
                    `The value ${v} of attribute "${attr}" is not an ID of any ${range} object!`));
              }
            }
          }
        });
/*
      } else if (RangeClass.isComplexDatatype && typeof v === "object") {
            v = Object.assign({}, v);  // use a clone
            // v is a record that must comply with the complex datatype
            const recFldNames = Object.keys(v);
            const propDefs = RangeClass.properties;
            // test if all mandatory properties occur in v and if all fields of v are properties
            if (Object.keys( propDefs).every( function (p) {return !!propDefs[p].optional || p in v;}) &&
                recFldNames.every( function (fld) {return !!propDefs[fld];})) {
              recFldNames.forEach( function (p) {
                var validationResult = dt.check( p, propDefs[p], v[p]);
                if (validationResult instanceof NoConstraintViolation) {
                  v[p] = validationResult.checkedValue;
                } else {
                  throw validationResult;
                }
              })
            } else {
              constrVio.push( new RangeConstraintViolation("The value of " + attr +
                  " must be an instance of "+ range +" or a compatible record!"+
                  JSON.stringify(v) + " is not admissible!"));
            }
 */
      } else if (typeof range === "string" && range.includes("|")) {
        // range is a union type
        valuesToCheck.forEach( function (v, i) {
          const rangeTypes = range.split("|");
          if (typeof v === "object") {
            if (!rangeTypes.some( rc => v instanceof dt.classes[rc])) {
              constrVio.push( new ReferentialIntegrityConstraintViolation("The object " + JSON.stringify(v) +
                  " is not an instance of any class from " + range + "!"));
            } else {
              v = valuesToCheck[i] = v.id;  // convert to IdRef
            }
          } else if (Number.isInteger(v)) {
            if (dt.checkReferentialIntegrity) {
              if (!dt.classes[range].instances[String(v)]) {
                constrVio.push( new ReferentialIntegrityConstraintViolation(
                    `The value ${v} of attribute "${attr}" is not an ID of any ${range} object!`));
              }
            }
          } else if (typeof v === "string") {
            if (!isNaN( parseInt(v))) v = valuesToCheck[i] = parseInt(v);
          } else {
            constrVio.push( new RangeConstraintViolation(
                `The value (${v}) of attribute "${attr}" is neither an integer nor a string!`));
          }
        });
      } else if (typeof range === "object" && range.dataType !== undefined) {
        // OLD format for collection datatypes
        for (const v of valuesToCheck) {
          if (typeof v !== "object") {
            constrVio.push( new RangeConstraintViolation("The value of " + attr +
                " must be an object! " + JSON.stringify(v) + " is not admissible!"));
          }
          switch (range.dataType) {
            case "Array":
              if (!Array.isArray(v)) {
                constrVio.push( new RangeConstraintViolation("The value of " + attr +
                    " must be an array! " + JSON.stringify(v) + " is not admissible!"));
                break;
              }
              if (v.length !== range.size) {
                constrVio.push( new RangeConstraintViolation("The value of " + attr +
                    " must be an array of length " + range.size + "! " + JSON.stringify(v) + " is not admissible!"));
                break;
              }
              for (let i = 0; i < v.length; i++) {
                if (!dt.isOfType(v[i], range.itemType)) {
                  constrVio.push( new RangeConstraintViolation("The items of " + attr +
                      " must be of type " + range.itemType + "! " + JSON.stringify(v) +
                      " is not admissible!"));
                }
              }
              break;
            case "ArrayList":
              if (!Array.isArray(v)) {
                constrVio.push( new RangeConstraintViolation("The value of " + attr +
                    " must be an array! " + JSON.stringify(v) + " is not admissible!"));
                break;
              }
              for (let i = 0; i < v.length; i++) {
                if (!dt.isOfType(v[i], range.itemType)) {
                  constrVio.push( new RangeConstraintViolation("The items of " + attr +
                      " must be of type " + range.itemType + "! " + JSON.stringify(v) +
                      " is not admissible!"));
                }
              }
              break;
          }
        }
      } else if (range === Object) {  // is this a useful joker?
        for (const v of valuesToCheck) {
          if (!(v instanceof Object)) {
            constrVio.push( new RangeConstraintViolation("The value of " + attr +
                " must be a JS object! " + JSON.stringify(v) + " is not admissible!"));
          }
        }
      }
    }
    // return constraint violations found in range constraint checks
    if (constrVio.length > 0) return constrVio;

    /********************************************************
     ***  Check constraints that apply to several ranges  ***
     ********************************************************/
    if (range === "String" || range === "NonEmptyString") {
      for (const v of valuesToCheck) {
        if (min !== undefined && v.length < min) {
          constrVio.push( new StringLengthConstraintViolation("The length of "+
              attr + " must not be smaller than "+ min));
        } else if (max !== undefined && v.length > max) {
          constrVio.push( new StringLengthConstraintViolation("The length of "+
              attr + " must not be greater than "+ max));
        } else if (pattern !== undefined && !pattern.test( v)) {
          constrVio.push( new PatternConstraintViolation( msg || v +
              "does not comply with the pattern defined for "+ attr));
        }
      }
    }
    // check Interval Constraints
    if (dt.isNumberType( range)) {
      for (const v of valuesToCheck) {
        if (min !== undefined && v < min) {
          constrVio.push( new IntervalConstraintViolation(
              `${attr} must be greater than ${min-1}`));
        } else if (max !== undefined && v > max) {
          constrVio.push( new IntervalConstraintViolation(
              `${attr} must be smaller than ${max+1}`));
        }
      }
    }
    /********************************************************
     ***  Check cardinality constraints  *********************
     ********************************************************/
    if (maxCard > 1) { // (a multi-valued attribute can be array- or map-valued)
      // check minimum cardinality constraint
      if (minCard > 0 && valuesToCheck.length < minCard) {
        constrVio.push( new CardinalityConstraintViolation(
            `A set of ${minCard} or more values is required for ${attr}. Invalid value: ${JSON.stringify(val)}`));
      }
      // check maximum cardinality constraint
      if (valuesToCheck.length > maxCard) {
        constrVio.push( new CardinalityConstraintViolation("A collection value for "+
            attr +" must not have more than "+ maxCard +" members!"));
      }
    }
    if (constrVio.length === 0) {
      // return de-serialized value available in validationResult.checkedValue
      constrVio.push( new NoConstraintViolation( maxCard === 1 ? valuesToCheck[0] : valuesToCheck));
    }
    return constrVio;
  }
}
dt.numericTypes = dt.integerTypes.concat( dt.decimalTypes);
dt.primitiveDatatypes = [...dt.stringTypes, ...dt.numericTypes, ...dt.otherPrimitiveTypes];
dt.supportedDatatypes = [...dt.primitiveDatatypes, ...dt.JSONCollectionDataTypes];

/*
 * Collection types are defined as instances of lISTtYPE or rECORDtYPE specifying
 * their item type. They can be nested.
 * Example:
 const PhoneNumbers = new lISTtYPE( new rECORDtYPE({type:"String", number:"Integer"}))
 Person.properties = {
  "name": {range:"String", isIdAttribute: true, label:"Name"},
  "phoneNumbers": {range: PhoneNumbers, label:"Phone numbers"}
 }
 Person.instances["Gerd"] = new Person({
        name: "Gerd",
        phoneNumbers: [{type:"home", number:834567},
                       {type:"mobile", number:132934565},
                       {type:"business", number:8889912}]
      });
 */
/**
 * A list type is defined by an itemType, which may be a (primitive) supported datatype
 * or a record type or a list type.
 * @class
 */
class lISTtYPE {
  constructor (itemType) {
    if (!dt.supportedDatatypes.includes( itemType) &&
        !(itemType instanceof lISTtYPE || itemType instanceof rECORDtYPE)) {
      const fldTypeName = typeof itemType === "string" ? itemType : itemType.name;
      throw new Error(`${fldTypeName} is not a supported datatype!`);
    }
    this.itemType = itemType;
  }
}
/**
 * A map type is defined by an item type, which may be a (primitive) supported datatype
 * or a record type or a list type.
 * @class
 */
class mAPtYPE {
  constructor (itemType) {
    if (!dt.supportedDatatypes.includes( itemType) &&
        !(itemType instanceof lISTtYPE || itemType instanceof rECORDtYPE)) {
      const fldTypeName = typeof itemType === "string" ? itemType : itemType.name;
      throw new Error(`${fldTypeName} is not a supported datatype!`);
    }
    this.itemType = itemType;
  }
}
/**
 * A record type is defined by a list of pairs consisting of a field name and a field type,
 * which may be a (primitive) supported datatype or a record type or a list type.
 * @class
 */
class rECORDtYPE {
  constructor (fieldNameTypePairs) {
    for (const [fldN, fldT] of Object.entries( fieldNameTypePairs)) {
      if (fldN === "fieldTypes") throw new Error("Field name must not be 'fieldTypes'!");
      if (!dt.supportedDatatypes.includes( fldT) && !Array.isArray( fldT) &&
          !(fldT instanceof lISTtYPE || fldT instanceof rECORDtYPE)) {
        let fldTypeName="";
        if ("name" in fldT) fldTypeName = fldT.name;
        else fldTypeName = fldT;
        throw new Error(`${fldTypeName} is not a supported datatype!`);
      }
    }
    this.fieldTypes = fieldNameTypePairs;
  }
}

// A flag for disabling constraint checking
dt.checkConstraints = true;

export {dt, lISTtYPE, mAPtYPE, rECORDtYPE};
