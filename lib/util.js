/*******************************************************************************
 * @fileOverview A collection of utilities: methods, objects, etc used all over the code.
 * @author Mircea Diaconescu
 * @copyright Copyright © 2014 Gerd Wagner, Mircea Diaconescu et al,
 *            Chair of Internet Technology, Brandenburg University of Technology, Germany.
 * @date July 08, 2014, 11:04:23
 * @license The MIT License (MIT)
 ******************************************************************************/
var util = {};  //typeof util === undefined ? {} : util;

/**
 * Serialize a Date object as an ISO date string
 * @return  YYYY-MM-DD
 */
util.createIsoDateString = function (d) {
  return d.toISOString().substring(0,10);
};
/**
 * Return the next year value (e.g. if now is 2013 the function will return 2014)
 * @return {number}  the integer representing the next year value
 */
util.nextYear = function () {
  var date = new Date();
  return (date.getFullYear() + 1);
};
/**
 * Capitalize the first character of a string
 * @param {string} str
 * @return {string}
 */
util.capitalizeFirstChar = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
/**
 * Copy all own (property and method) slots of a number of untyped objects
 * to a new untyped object.
 * @author Gerd Wagner
 * @return {object}  The merge result.
 */
util.mergeObjects = function () {
  var i = 0, k = 0, n = arguments.length, m = 0,
      foundArrayArg = false,
      foundObjectArg = false,
      arg = null, mergedResult,
      keys=[], key="";
  for (i = 0; i < n; i++) {
    arg = arguments[i];
    if (arg === undefined) {
      continue;
    }
    if (Array.isArray( arg)) {
      if (!foundObjectArg) {
        mergedResult = mergedResult ? mergedResult : [];
        foundArrayArg = true;
        mergedResult = mergedResult.concat( arg);
      } else {
        throw "util.mergeObjects: incompatible objects were found! Trying to merge "+
              "an Array with an Object! Expected Array arguments only!";
      }
    } else if (typeof arg === 'object') {
      if (!foundArrayArg) {
        mergedResult = mergedResult ? mergedResult : {};
        foundObjectArg = true;
        keys = Object.keys( arg);
        m = keys.length;
        for (k = 0; k < m; k++) {
          key = keys[k];
          mergedResult[key] = arg[key];
        }
      } else {
        throw "util.mergeObjects: incompatible objects were found! Trying to merge "+
              "an Object with an Array! Expected Object arguments only!";
      }
    } else {
      throw "util.mergeObjects: only arguments of type Array or Object are allowed, but '" +
             typeof arguments[i] + "' type was found for argument number " + i;
    }
  }
  return mergedResult;
};
/**********************************************
 * Name conversions
 **********************************************/
// Example 1: EnglishTeacher => english_teachers
// Example 2: eXPERIMENTdEF => EXPERIMENT_DEFS
util.class2TableName = function (className) {
  var tableName="";
  if (className.charAt(0) === className.charAt(0).toUpperCase()) { // starts with upper case
    if (className.charAt( className.length-1) === "y") {
      tableName = util.camelToLowerCase( className.slice( 0, className.length-1)) + "ies";
    } else {
      tableName = util.camelToLowerCase( className) + "s";
    }
    return tableName;
  } else { // inverse camel case (starts with lower case)
    if (className.charAt( className.length-1) === "Y") {
      tableName = util.invCamelToUppercase( className.slice( 0, className.length-1)) + "IES";
    } else {
      tableName = util.invCamelToUppercase( className) + "S";
    }
    return tableName;
  }
};
// Example: books => Book
util.table2ClassName = function (tableName) {
  var result = util.lowercaseToCamel( tableName);
  result = result.charAt( 0).toUpperCase() + result.slice( 1);
  // if there is an 's' at the end, drop it
  if (result.charAt( result.length - 1) === 's') {
    result = result.slice( 0, result.length - 1);
  }
  /*
  if (!util.JsIdentifierPattern.test( result)) {
    throw Error("util.camelToLowerCase: the provided 'identifier' (" + result +
        ") is not a valid JS identifier!");
  }
  */
  return result;
};
// Example: dateOfBirth => date_of_birth
util.property2ColumnName = function (propertyName) {
  return util.camelToLowerCase( propertyName);
};
// Example: date_of_birth => dateOfBirth
util.column2PropertyName = function (columnName) {
  return util.lowercaseToCamel( columnName);
};
util.camelToLowerCase = function (identifier) {
  var result = '';
  // if the first is a A-Z char, replace it with its lower case equivalent
  identifier = identifier.charAt( 0).toLowerCase() + identifier.slice( 1);
  // replace upper case letter with '_' followed by the lower case equivalent leter
  result = identifier.replace( /([A-Z])/g, function( $1) {
    return "_" + $1.toLowerCase();
  });
  return result;
};
util.invCamelToUppercase = function (name) {
  var result = '';
  // if the first is a a-z, replace it with corresponding upper case
  name = name.charAt(0).toUpperCase() + name.slice( 1);
  // replace lower case letter with '_' followed by the corresponding upper case
  result = name.replace( /([a-z])/g, function( $1) {
    return "_" + $1.toUpperCase();
  });
  return result;
};
util.lowercaseToCamel = function (identifier) {
  var result = '';
  // replace upper case letter with '_' followed by the lower case equivalent letter
  result = identifier.replace( /(\_[a-z])/g, function ($1) {
    return $1.toUpperCase().replace( '_', '');
  });
  return result;
};

//***** NOT USED IN cLASSjs ************************
/**
 * Verifies if a value represents an integer or integer string
 * @param {string} x
 * @return {boolean}
 */
util.isIntegerString = function (x) {
  return typeof(x) === "string" && x.search(/^-?[0-9]+$/) == 0;
};
/**
 * Extract the data record part of an object. The extracted property values
 * are either primitive data values, Date objects, or arrays of primitive
 * data values.
 * @param {object} obj
 */
util.createRecordFromObject = function (obj) {
  var record={}, p="", val;
  for (p in obj) {
    val = obj[p];
    if (obj.hasOwnProperty(p) && (typeof(val) === "string" ||
            typeof(val) === "number" || typeof(val) === "boolean" ||
            val instanceof Date ||
            Array.isArray( val) &&  // array list of data values
            !val.some( function (el) {
              return typeof(el) === "object";
            })
        )) {
      if (val instanceof Date) record[p] = val.toISOString();
      else if (Array.isArray( val)) record[p] = val.slice(0);
      else record[p] = val;
    }
  }
  return record;
};
// create an alias for cloning records
util.cloneRecord = util.createRecordFromObject;

/**
 * Create a "deep" clone of a JS object at the level of own properties/slots
 * @param o  the object to be cloned
 * @return {object}
 */
util.cloneObject = function (o) {
  var clone = Array.isArray(o) ? [] : {};
  Object.keys(o).forEach( function (key) {
    clone[key] = (typeof o[key] === "object") ? util.cloneObject(o[key]) : o[key];
  });
  return clone;
};
/**
 * Copy all own (property and method) slots of a number of (untyped) objects
 * to a new (untyped) object.
 * @author Gerd Wagner
 * @return {object}  The merge result.
 *
util.mergeObjects = function () {
  var i=0, k=0, obj=null, mergeObj={}, keys=[], key="";
  for (i=0; i < arguments.length; i++) {
    obj = arguments[i];
    if (obj && typeof obj === "object") {
      keys = Object.keys( obj);
      for (k=0; k < keys.length; k++) {
        key = keys[k];
        mergeObj[key] = obj[key];
      }
    }
  }
  return mergeObj;
};
 */
/**
 * Swap two elements of an array
 * using the ES6 method Object.assign for creating a shallow clone of an object
 * @param a  the array
 * @param i  the first index
 * @param i  the 2nd index
 */
util.swapArrayElements = function (a,i,j) {
  var tempStore = (typeof a[i] === "object") ? Object.assign( {}, a[i]) : a[i];
  a[i] = (typeof a[j] === "object") ? Object.assign( {}, a[j]) : a[j];
  a[j] = tempStore;
};
/**
 * Shuffles array in place using the Fisher-Yates shuffle algorithm
 * @param {Array} a - An array of items to be shuffled
 */
util.shuffleArray = function (a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor( Math.random() * (i + 1) );
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
};
/**
 * Compute the Cartesian Product of an array of arrays
 * From https://stackoverflow.com/a/36234242/2795909
 * @param {Array} arr - An array of arrays of values to be combined
 */
util.cartesianProduct = function (arr) {
  return arr.reduce( function (a,b) {
    return a.map( function (x) {
      return b.map( function (y) {
        return x.concat(y);
      })
    }).reduce( function (a,b) {return a.concat(b)}, [])
  }, [[]])
};
/**
 * Load a script
 * @param {Array} arr - An array of arrays of values to be combined
 */
util.loadScript = function (pathAndFilename, basePath, callback, errCallback) {
  var loadEl = document.createElement('script');
  // if a full URL is provided, the base path is ignored
  if (pathAndFilename.indexOf("://") === -1)
    pathAndFilename = basePath + pathAndFilename;
  // if no callback(s) provided, define an empty function
  callback = typeof callback === "function" ? callback : function () {};
  errCallback = typeof errCallback === "function" ? errCallback : function () {};
  loadEl.src = pathAndFilename;
  loadEl.onload = function () {
    callback(loadEl);
  };
  loadEl.onerror = function (e) {
    console.log("Failed loading file '" + pathAndFilename + "'!");
    loadEl.remove();
    errCallback(e);
  };
  document.head.appendChild( loadEl);
};
/*******************************************************************************
 * Generate a file from text
 *
 * @param {string} filename - Name of the file
 * @param {string} text - Content of the file
 ******************************************************************************/
util.generateTextFile = function (filename, text) {
  var data, aElem, url;
  data = new Blob( [text], {type: "text/plain"});
  url = window.URL.createObjectURL(data);
  aElem = document.createElement("a");
  aElem.setAttribute( "style", "display: none");
  aElem.setAttribute( "href", url);
  aElem.setAttribute( "download", filename);
  document.body.appendChild( aElem);
  aElem.click();
  window.URL.revokeObjectURL( url);
  aElem.remove();
};

/****************************************************************
 * Math Library
 ****************************************************************/
var math = {};
/**
 * Round a decimal number to decimalPlaces
 * @param {number} x - the number to round
 * @param {integer} d - decimal places
 */
math.round = function (x,d) {
  var roundingFactor = Math.pow(10, d);
  return Math.round((x + Number.EPSILON) * roundingFactor) / roundingFactor;
};
/**
 * Compute the sum of an array of numbers
 * @param {Array} data - An array of numbers
 */
math.sum = function (data) {
  function add( a, b) {return a + b;}
  return data.reduce( add, 0);
};
/**
 * Compute the arithmetic mean of an array of numbers
 * @param {Array} data - An array of numbers
 */
math.mean = function (data) {
  return math.sum( data) / data.length;
};
/**
 * Compute the standard deviation of an array of numbers
 * @param {Array} data - An array of numbers
 */
math.stdDev = function (data) {
  var m = math.mean( data);
  return Math.sqrt( data.reduce( function (acc, x) {
    return acc + Math.pow( x - m, 2);}, 0) / (data.length - 1));
};
/**
 * Compute the confidence interval of an array of numbers. Based on
 *   Efron, B. (1985). Bootstrap confidence intervals for a class of parametric
 *   problems. Biometrika, 72(1), 45-58.
 * @param {Array<number>} data - An array of numbers
 * @param {number} samples - Number of bootstrap samples (default 10000)
 * @param {number} alpha - Confidence interval to estimate [0,1] (default 0.95)
 * @returns {{lowerBound:number, upperBound:number}} Lower and upper bound of confidence interval
 */
math.confInt = function ( data, samples, alpha ) {
  var n = samples || 10000;
  var p = alpha || 0.95;
  var i, j, t;
  var mu = Array( n );
  var m = math.mean( data );
  var len = data.length;

  /* Calculate bootstrap samples */
  for ( i = 0; i < n; i += 1 ) {
    t = 0;
    for ( j = 0; j < len; j += 1 ) {
      t += data[ Math.floor( Math.random() * len ) ];
    }
    mu[ i ] = ( t / len ) - m;
  }

  /* Sort in ascending order */
  mu.sort( function ( a, b ) {
    return a - b;
  } );

  /* Return the lower and upper confidence interval */
  return {
    lowerBound: m - mu[ Math.floor( Math.min( n - 1,
      n * ( 1 - ( ( 1 - p ) / 2 ) ) ) ) ],
    upperBound: m - mu[ Math.floor( Math.max( 0, n * ( ( 1 - p ) / 2 ) ) ) ]
  };
};