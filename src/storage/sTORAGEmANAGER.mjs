/**
 * @fileOverview  The library class sTORAGEmANAGER.
 * @author Gerd Wagner
 * @copyright Copyright 2015-2022 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
import bUSINESSoBJECT from "../bUSINESSoBJECT.mjs";

/**
 * Library class providing storage management methods for a number of predefined
 * storage adapters
 *
 * @class
 */
class sTORAGEmANAGER {
  constructor( storageAdapter) {
    if (typeof storageAdapter !== 'object' ||
        typeof storageAdapter.name !== "string" ||
        !(["LocalStorage","IndexedDB"].includes( storageAdapter.name))) {
      throw new ConstraintViolation("Invalid storage adapter name!");
    } else if (!storageAdapter.dbName) {
      throw new ConstraintViolation("Storage adapter: missing DB name!");
    } else {
      this.adapter = storageAdapter;
      // if "LocalStorage", create a main memory DB
      if (storageAdapter.name === "LocalStorage") {
        for (const className of Object.keys( bUSINESSoBJECT.classes)) {
          const Class = bUSINESSoBJECT.classes[className];
          if (Class.instances) {
            sTORAGEmANAGER.adapters["LocalStorage"].retrieveLocalStorageTable( Class);
          }
        }
      }
    }
    // copy storage adapter to the corresponding adapter's storage management method library
    sTORAGEmANAGER.adapters[this.adapter.name].currentAdapter = storageAdapter;
  }
  createEmptyDb( classes) {
    const adapterName = this.adapter.name,
          dbName = this.adapter.dbName;
    return new Promise( function (resolve) {
      if (!Array.isArray( classes) || classes.length === 0) {
        classes = [];
        for (const className of Object.keys( bUSINESSoBJECT.classes)) {
          const Class = bUSINESSoBJECT.classes[className];
          // collect all non-abstract classes that are not datatype classes
          if (!Class.isAbstract && !Class.isComplexDatatype) {
            classes.push( Class);
          }
        }
      }
      sTORAGEmANAGER.adapters[adapterName].createEmptyDb( dbName, classes)
          .then( resolve);
    });
  }
  /**
   * Generic method for creating and "persisting" a new model object
   * @method
   * @param {object} Class  The business object class concerned
   * @param {object} rec  A record or record list
   */
  add( Class, rec) {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName,
        createLog = this.createLog,
        checkConstraints = this.validateBeforeSave,
        records=[], validRecords=[];
    if (typeof rec === "object" && !Array.isArray(rec)) {
      records = [rec];
    } else if (Array.isArray(rec) && rec.every( function (r) {
      return typeof r === "object" && !Array.isArray(r)})) {
      records = rec;
    } else throw Error("2nd argument of 'add' must be a record or record list!");
    // create auto-IDs if required
    if (Class.properties.id && Class.properties.id.range === "AutoIdNumber") {
      records.forEach( function (r) {
        if (!r.id) {  // do not overwrite assigned ID values
          if (typeof Class.getAutoId === "function") r.id = Class.getAutoId();
          else if (Class.idCounter !== undefined) r.id = ++Class.idCounter;
        }
      })
    }
    // check constraints before save if required
    if (checkConstraints) {
      records.forEach( function (r) {
        var newObj=null;
        if (r instanceof Class) {
          validRecords.push( r);
        } else {
          try {newObj = new Class( r);}  // check constraints
          catch (e) {
            if (e instanceof ConstraintViolation) {
              console.log( e.constructor.name +": "+ e.message);
            } else console.log( e);
          }
          if (newObj) validRecords.push( newObj);
        }
      });
      records = validRecords;
    }
    return new Promise( function (resolve) {
      sTORAGEmANAGER.adapters[adapterName].add( dbName, Class, records).then( function () {
        if (createLog) console.log( records.length +" "+ Class.name +"(s) added.");
        if (typeof resolve === "function") resolve();
      }).catch( function (error) {
        console.log( error.name +": "+ error.message);
      });
    });
  };
  /**
   * Generic method for loading/retrieving a model object
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   */
  retrieve( Class, id) {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName;
    return new Promise( function (resolve) {
      sTORAGEmANAGER.adapters[adapterName].retrieve( dbName, Class, id)
          .then( function (obj) {
            if (!obj) {
              obj = null;
              console.log("There is no " + Class.name + " with ID value " + id + " in the database!");
            }
            resolve( obj);
          });
    });
  }
  /**
   * Generic method for loading all table rows and converting them
   * to model objects
   *
   * @method
   * @param {object} Class  The business object class concerned
   */
  retrieveAll( Class) {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName,
        createLog = this.createLog,
        validateAfterRetrieve = this.validateAfterRetrieve;
    return new Promise( function (resolve) {
      sTORAGEmANAGER.adapters[adapterName].retrieveAll( dbName, Class)
          .then( function (records) {
            var i=0, newObj=null;
            if (createLog) {
              console.log( records.length +" "+ Class.name +" records retrieved.")
            }
            if (validateAfterRetrieve) {
              for (i=0; i < records.length; i++) {
                try {
                  newObj = new Class( records[i]);
                } catch (e) {
                  if (e instanceof ConstraintViolation) {
                    console.log( e.constructor.name +": "+ e.message);
                  } else console.log( e.name +": "+ e.message);
                }
              }
            }
            resolve( records);
          })
    });
  }
  /**
   * Generic method for updating model objects
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   * @param {object} slots  The object's update slots
   */
  update( Class, id, slots) {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName,
        currentSM = this;
    return new Promise( function (resolve) {
      var objectBeforeUpdate = null, properties = Class.properties,
          updatedProperties=[], noConstraintViolated = true,
          updSlots = util.cloneObject( slots);
      // first check if object exists
      currentSM.retrieve( Class, id).then( function (objToUpdate) {
        if (objToUpdate) {
          if (typeof objToUpdate === "object" && objToUpdate.constructor !== Class) {
            // if the retrieved objToUpdate is not of type Class, check integrity constraints
            objToUpdate = Class.createObjectFromRecord( objToUpdate);
            if (!objToUpdate) return;  // constraint violation
          }
          objectBeforeUpdate = util.cloneObject( objToUpdate);
          try {
            Object.keys( slots).forEach( function (prop) {
              var oldVal = objToUpdate[prop],
                  newVal = slots[prop],
                  propDecl = properties[prop];
              if (prop !== "id") {
                if (propDecl.maxCard === undefined || propDecl.maxCard === 1) {  // single-valued
                  if (Number.isInteger( oldVal) && newVal !== "") {
                    newVal = parseInt( newVal);
                  } else if (typeof oldVal === "number" && newVal !== "") {
                    newVal = parseFloat( newVal);
                  } else if (oldVal===undefined && newVal==="") {
                    newVal = undefined;
                  }
                  if (newVal !== oldVal) {
                    updatedProperties.push( prop);
                    objToUpdate.set( prop, newVal);  // also checking constraints
                  } else {
                    delete updSlots[prop];
                  }
                } else {   // multi-valued
                  if (oldVal.length !== newVal.length ||
                      oldVal.some( function (vi,i) { return (vi !== newVal[i]);})) {
                    objToUpdate.set(prop, newVal);
                    updatedProperties.push(prop);
                  } else {
                    delete updSlots[prop];
                  }
                }
              }
            });
          } catch (e) {
            console.log( e.constructor.name +": "+ e.message);
            noConstraintViolated = false;
            // restore object to its state before updating
            objToUpdate = objectBeforeUpdate;
          }
          if (noConstraintViolated) {
            if (updatedProperties.length > 0) {
              sTORAGEmANAGER.adapters[adapterName].update( dbName, Class, id, slots, updSlots)
                  .then( function () {
                    console.log("Properties "+ updatedProperties.toString() +
                        " of "+ Class.name +" "+ id +" updated.");
                    if (typeof resolve === "function") resolve();
                  });
            } else {
              console.log("No property value changed for "+ Class.name +" "+ id +"!");
            }
          }
        }
      });
    });
  }
  /**
   * Generic method for deleting model objects
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   */
  destroy( Class, id) {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName,
        currentSM = this;
    return new Promise( function (resolve) {
      currentSM.retrieve( Class, id).then( function (record) {
        if (record) {
          sTORAGEmANAGER.adapters[adapterName].destroy( dbName, Class, id)
              .then( function () {
                console.log( Class.name +" "+ id +" deleted.");
                if (typeof resolve === "function") resolve();
              });
        } else {
          console.log("There is no "+ Class.name +" with ID value "+ id +" in the database!");
        }
      });
    });
  }
  /**
   * Generic method for clearing the DB table, or object store, of a cLASS
   * @method
   */
  clearTable( Class) {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName;
    return new Promise( function (resolve) {
      sTORAGEmANAGER.adapters[adapterName].clearTable( dbName, Class)
          .then( resolve);
    });
  }
  /**
   * Generic method for clearing the DB of an app
   * @method
   */
  clearDB() {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName;
    return new Promise( function (resolve) {
      if ((typeof confirm === "function" &&
          confirm("Do you really want to delete all data?")) ||
          typeof confirm !== "function") {
        sTORAGEmANAGER.adapters[adapterName].clearDB( dbName)
            .then( resolve);
      }
    });
  }
  /**
   * Generic method for storing unsaved data on page unload
   * @method
   */
  saveOnUnload() {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName;
    sTORAGEmANAGER.adapters[adapterName].saveOnUnload( dbName);
  }
}

sTORAGEmANAGER.adapters = {};


/*****************************************************************************
 * Storage management methods for the "LocalStorage" adapter
 * Only in the case of "LocalStorage", due to its non-concurrent architecture,
 * the entire data is loaded into a kind of main memory DB, which is saved
 * back to LocalStorage on page unload.
 ****************************************************************************/
sTORAGEmANAGER.adapters["LocalStorage"] = {
  //-----------------------------------------------------------------
  createEmptyDb: function (dbName, modelClasses) {
  //-----------------------------------------------------------------
    // nothing to do
    return new Promise( function (resolve) {
      resolve();
    });
  },
  //------------------------------------------------
  add: function (dbName, Class, records) {  // does not access localStorage
  //------------------------------------------------
    var recordsCopy = JSON.parse( JSON.stringify( records));
    return new Promise( function (resolve) {
      var newObj=null;
      if (!Array.isArray( recordsCopy)) {  // single record insertion
        recordsCopy = [recordsCopy];
      }
      recordsCopy.forEach( function (rec) {
        newObj = new Class( rec);
        Class.instances[newObj.id] = newObj;
      })
      resolve( newObj);
    });
  },
  //------------------------------------------------
  retrieve: function (dbName, Class, id) {  // does not access localStorage
  //------------------------------------------------
    return new Promise( function (resolve) {
      resolve( Class.instances[id]);
    });
  },
  //-------------------------------------------------------------
  // *** A LocalStorage-specific, and not an interface method ***
  //-------------------------------------------------------------
  retrieveLocalStorageTable: function (Class) {
  //-------------------------------------------------------------
    var key="", keys=[], i=0,
        tableString="", table={},
        tableName = util.class2TableName( Class.name);
    try {
      if (localStorage[tableName]) {
        tableString = localStorage[tableName];
      }
    } catch (e) {
      console.log( "Error when reading from Local Storage\n" + e);
    }
    if (tableString) {
      table = JSON.parse( tableString);
      keys = Object.keys( table);
      console.log( keys.length + " " + Class.name + " records loaded.");
      for (i=0; i < keys.length; i++) {
        key = keys[i];
        Class.instances[key] = Class.createObjectFromRecord( table[key]);
      }
    }
  },
  //------------------------------------------------
  retrieveAll: function (dbName, Class) {
    //------------------------------------------------
    var  currentSM = this;
    return new Promise( function (resolve) {
      var records=[];
      /* OLD
      function retrieveAll (mc) {
        var key = "", keys = [], i = 0,
            tableString = "", table={},
            tableName = util.class2TableName( mc.Name);
        // do no retrieve the same class population twice
        if (Object.keys( mc.instances).length > 0) return;
        // first retrieve the population of the classes that are ranges of reference properties
        Object.keys( mc.properties).forEach( function (p) {
          var range = mc.properties[p].range;
          if (range instanceof cLASS) retrieveAll( range);
        });
        currentSM.retrieveTable( mc);      }
      retrieveAll( mc);
      */
      // convert entity map mc.instances to an array list
      records = Object.keys( Class.instances).map( function (key) {return Class.instances[key];});
      resolve( records);
    });
  },
  //------------------------------------------------
  update: function (dbName, Class, id, slots) {  // does not access localStorage
  //------------------------------------------------
    return new Promise( function (resolve) {
      // in-memory object has already been updated in the generic update
      /*
      Object.keys( slots).forEach( function (prop) {
        obj = mc.instances[id];
        obj[prop] = slots[prop];
      });
      */
      resolve();
    });
  },
  //------------------------------------------------
  destroy: function (dbName, Class, id) {  // does not access localStorage
  //------------------------------------------------
    return new Promise( function (resolve) {
      delete Class.instances[id];
      resolve();
    });
  },
  //------------------------------------------------
  clearTable: function (dbName, Class) {
  //------------------------------------------------
    return new Promise( function (resolve) {
      var tableName = Class.tableName || util.class2TableName( Class.name);
      Class.instances = {};
      try {
        localStorage[tableName] = JSON.stringify({});
        console.log("Table "+ tableName +" cleared.");
      } catch (e) {
        console.log("Error when writing to Local Storage\n" + e);
      }
      resolve();
    });
  },
  //------------------------------------------------
  clearDB: function () {
  //------------------------------------------------
    return new Promise( function (resolve) {
      for (const className of Object.keys( bUSINESSoBJECT.classes)) {
        const Class = bUSINESSoBJECT.classes[className];
        var tableName="";
        if (!Class.isComplexDatatype && Object.keys( Class.instances).length > 0) {
          Class.instances = {};
          tableName = Class.tableName || util.class2TableName( Class.name);
          try {
            localStorage[tableName] = JSON.stringify({});
          } catch (e) {
            console.log("Error when writing to Local Storage\n" + e);
          }
        }
      }
      resolve();
    });
  },
  //------------------------------------------------
  saveOnUnload: function () {
  //------------------------------------------------
    for (const className of Object.keys( bUSINESSoBJECT.classes)) {
      const Class = bUSINESSoBJECT.classes[className];
      var id="", table={}, obj=null, i=0,
          keys=[], tableName="";
      if (Class.instances) {
        keys = Object.keys( Class.instances)
        tableName = util.class2TableName( Class.name);
        for (i=0; i < keys.length; i++) {
          id = keys[i];
          obj = Class.instances[id];
          table[id] = obj.toRecord();
        }
        try {
          localStorage[tableName] = JSON.stringify( table);
          console.log( keys.length +" "+ Class.name +" records saved.");
        } catch (e) {
          console.log("Error when writing to Local Storage\n" + e);
        }
      }
    }
  }
}

export default sTORAGEmANAGER;
