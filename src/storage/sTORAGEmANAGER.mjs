/**
 * @fileOverview  The library class sTORAGEmANAGER.
 * @author Gerd Wagner
 * @copyright Copyright 2015-2022 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
import util from "../../lib/util.mjs";
import bUSINESSoBJECT from "../bUSINESSoBJECT.mjs";
import { openDB, deleteDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';
//import { openDB, deleteDB } from "../../lib/idb7-1.mjs";
import dt from "../datatypes.mjs";
import {NoConstraintViolation} from "../constraint-violation-error-types.mjs";

/**
 * Library class providing storage management methods for a number of predefined
 * storage adapters
 *
 * @class
 */
class sTORAGEmANAGER {
  constructor({adapterName, dbName, createLog, validateBeforeSave}) {
    if (!(["LocalStorage","IndexedDB"].includes( adapterName))) {
      throw new ConstraintViolation("Invalid storage adapter name!");
    } else if (!dbName) {
      throw new ConstraintViolation("Missing DB name!");
    } else {
      this.adapterName = adapterName;
      this.dbName = dbName;
      this.createLog = createLog;
      this.validateBeforeSave = validateBeforeSave;
      this.adapter = sTORAGEmANAGER.adapters[adapterName];
      // if "LocalStorage", create a main memory DB
      if (this.adapterName === "LocalStorage") {
        for (const className of Object.keys( dt.classes)) {
          const Class = dt.classes[className];
          if (Class.instances) {
            sTORAGEmANAGER.adapters["LocalStorage"].retrieveLocalStorageTable( Class);
          }
        }
      }
    }
  }
  /**
   * Generic method for creating an empty database (with a set of empty tables)
   * @method
   * @param {Array} classes  The business object classes to be persisted
   */
  async createEmptyDb( classes) {
    try {
      await this.adapter.createEmptyDb( this.dbName, classes);
      if (this.createLog) console.log(`Database ${this.dbName} with empty tables created`);
    } catch (error) {
      console.log( error.name +": "+ error.message);
    }
  }
  /**
   * Generic method for deleting a database
   * @method
   * @param {string} dbName  The business object classes to be persisted
   */
  async deleteDatabase( dbName) {
    try {
      dbName = dbName || this.dbName;
      await this.adapter.deleteDatabase( dbName);
      if (this.createLog) console.log(`Database ${dbName} deleted`);
    } catch (error) {
      console.log( error.name +": "+ error.message);
    }
  }
  /**
   * Generic method for "persisting" a list of object records
   * @method
   * @param {object} Class  The business object class concerned
   * @param {object} rec  A record or record list
   */
  async add( Class, rec) {
    var records=[];
    if (typeof rec === "object" && !Array.isArray(rec)) {
      records = [rec];
    } else if (Array.isArray(rec) && rec.every( function (r) {
      return typeof r === "object" && !Array.isArray(r)})) {
      records = rec;
    } else throw new Error("2nd argument of 'add' must be a record or record list!");
    if (!Class) throw new Error(`Cannot add ${JSON.stringify(rec)} without a Class argument`);
    const idAttr = Class.idAttribute || "id";
    // create auto-IDs if required
    if (Class.properties[idAttr].range === "AutoIdNumber") {
      for (const r of records) {
        if (!r[idAttr]) {  // do not overwrite assigned ID values
          if (typeof Class.getAutoId === "function") r[idAttr] = Class.getAutoId();
          else if (Class.idCounter !== undefined) r[idAttr] = ++Class.idCounter;
        }
      }
    }
    // check constraints before save if required
    if (this.validateBeforeSave) {
      for (let i=0; i < records.length; i++) {
        const r = records[i];
        let newObj=null;
        try {
          newObj = new Class( r);  // check constraints
        } catch (e) {
          if (e instanceof ConstraintViolation) {
            console.log( e.constructor.name +": "+ e.message);
          } else console.log( e);
          // remove record from the records to add
          records.splice( i, 1);
        }
      }
    }
    try {
      await this.adapter.add( this.dbName, Class, records);
      if (this.createLog) console.log(`${records.length} ${Class.name}(s) added.`);
    } catch (error) {
      console.log(`${error.name}: ${error.message}`);
    }
  };
  /**
   * Generic method for retrieving a record
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   */
  async retrieve( Class, id) {
    var rec=null;
    try {
      rec = await this.adapter.retrieve( this.dbName, Class, id);
      if (this.createLog) console.log(`Book with ISBN ${id} retrieved.`);
    } catch (error) {
      console.log(`${error.name}: ${error.message}`);
      if (!rec) {
        console.log(`There is no ${Class.name} with ID value ${id} in the database!`);
      }
    }
    return rec;
  }
  /**
   * Generic method for retrieving all records
   *
   * @method
   * @param {object} Class  The business object class concerned
   */
  async retrieveAll( Class) {
    var records = null;
    try {
      records = await this.adapter.retrieveAll( this.dbName, Class);
      if (this.createLog) console.log( records.length +" "+ Class.name +" records retrieved.");
      if (this.validateAfterRetrieve) {
        for (let i=0; i < records.length; i++) {
          try {
            let newObj = new Class( records[i]);
          } catch (e) {
            if (e instanceof ConstraintViolation) {
              console.log( e.constructor.name +": "+ e.message);
            } else console.log( e.name +": "+ e.message);
          }
        }
      }
    } catch (error) {
      console.log(`${error.name}: ${error.message}`);
    }
    return records;
  }
  /**
   * Generic method for updating model objects
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   * @param {object} slots  The object's update slots
   */
  async update( Class, id, slots) {
    var updatedProperties=[], noConstraintViolated = true;
    const properties = Class.properties,
          updSlots = {...slots};  // clone
    // first check if an object record with this ID exists
    let objToUpdate = await this.retrieve( Class, id);
    if (objToUpdate) {
      const objectBeforeUpdate = {...objToUpdate};  // clone
      for (const prop of Object.keys( slots)) {
        const oldVal = objToUpdate[prop],
              propDecl = properties[prop];
        let newVal = slots[prop];
        if (prop !== Class.idAttribute) {
          if (propDecl.maxCard === undefined || propDecl.maxCard === 1) {  // single-valued
            if (Number.isInteger( oldVal) && newVal !== "") {
              newVal = parseInt( newVal);
            } else if (typeof oldVal === "number" && newVal !== "") {
              newVal = parseFloat( newVal);
            } else if (oldVal===undefined && newVal==="") {
              newVal = undefined;
            }
            if (newVal !== oldVal) {
              const validationResults = dt.check( prop, propDecl, newVal);
              if (!(validationResults[0] instanceof NoConstraintViolation)) {
                //TODO: support multiple errors
                const constraintViolation = validationResults[0];
                console.log( constraintViolation.constructor.name +": "+ constraintViolation.message);
                noConstraintViolated = false;
                // restore object to its state before updating
                objToUpdate = objectBeforeUpdate;
              } else {
                updatedProperties.push( prop);
              }
            } else {
              delete updSlots[prop];  // no update required
            }
          } else {   // multi-valued
            if (oldVal.length !== newVal.length ||
                oldVal.some( function (vi,i) { return (vi !== newVal[i]);})) {
              const validationResults = dt.check( prop, propDecl, newVal);
              if (!(validationResults[0] instanceof NoConstraintViolation)) {
                //TODO: support multiple errors
                const constraintViolation = validationResults[0];
                console.log( constraintViolation.constructor.name +": "+ constraintViolation.message);
                noConstraintViolated = false;
                // restore object to its state before updating
                objToUpdate = objectBeforeUpdate;
              } else {
                delete updSlots[prop];  // no update required
              }
            }
          }
        }
      }
      if (noConstraintViolated) {
        if (updatedProperties.length > 0) {
          try {
            this.adapter.update( this.dbName, Class, id, updSlots);
            if (id in Class.instances) {
              for (const p of Object.keys( updSlots)) {
                Class.instances[id][p] = updSlots[p];
              }
            }
            console.log(`Properties ${updatedProperties.toString()} of ${Class.name} ${id} updated.`);
          } catch (error) {
            console.log(`${error.name}: ${error.message}`);
          }
        }
      } else {
        console.log(`No property value changed for ${Class.name} ${id}!`);
      }
    }
  }
  /**
   * Generic method for deleting model objects
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   */
  destroy( Class, id) {
    const dbName = this.adapter.dbName;
    let currentSM = this;
    return new Promise( function (resolve) {
      currentSM.retrieve( Class, id).then( function (record) {
        if (record) {
          currentSM.adapter.destroy( dbName, Class, id)
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
  async clearTable( Class) {
    await this.adapter.clearTable( this.dbName, Class);
  }
  /**
   * Generic method for clearing a DB (clearing all of its tables)
   * @method
   */
  async clearDB() {
    if ((typeof confirm === "function" &&
        confirm("Do you really want to delete all data?")) ||
        typeof confirm !== "function") {
      await this.adapter.clearDB( this.dbName);
    }
  }
  /**
   * Generic method for storing unsaved data on page unload
   * @method
   */
  saveOnUnload() {
    var adapterName = this.adapter.name,
        dbName = this.adapter.dbName;
    this.adapter.saveOnUnload( dbName);
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
  createEmptyDb: function (dbName, modelClasses) {  // nothing to do
  //-----------------------------------------------------------------
  },
  //------------------------------------------------
  add: function (dbName, Class, records) {  // does not access localStorage
  //------------------------------------------------
    const idAttr = Class.idAttribute ?? "id";
    const recordsCopy = [...records];
    for (const rec of recordsCopy) {
      const newObj = new Class( rec);
      Class.instances[newObj[idAttr]] = newObj;
    }
  },
  //------------------------------------------------
  retrieve: function (dbName, Class, id) {  // does not access localStorage
  //------------------------------------------------
    return Class.instances[id];
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
      for (const className of Object.keys( dt.classes)) {
        const Class = dt.classes[className];
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
    for (const className of Object.keys( dt.classes)) {
      const Class = dt.classes[className];
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

sTORAGEmANAGER.adapters["IndexedDB"] = {
  //------------------------------------------------
  createEmptyDb: async function (dbName, modelClasses) {
  //------------------------------------------------
    return await openDB( dbName, 1, {
      upgrade(db) {
        for (const mc of modelClasses) {
          const tn = mc.tableName || util.class2TableName( mc.name);
          if (!db.objectStoreNames.contains( tn)) {
            db.createObjectStore( tn, {keyPath: mc.idAttribute || "id"});
          }
        }
      }
    });
  },
  //------------------------------------------------
  deleteDatabase: async function (dbName) {
  //------------------------------------------------
    await deleteDB( dbName, {
      blocked() {
        console.log(`Database ${dbName} can only be deleted after open connections are being closed.`)
      },
    });
  },
  //------------------------------------------------
  add: async function (dbName, Class, records) {
  //------------------------------------------------
    const db = await openDB( dbName);
    const tableName = Class.tableName || util.class2TableName( Class.name);
    // create a transaction involving only the table with the provided name
    const tx = db.transaction( tableName, "readwrite");
    // create a list of add invocation expressions
    const addInvocationExpressions = records.map( r => tx.store.add( r));
    // invoke all of them in parallel and wait for their completion
    await Promise.all( addInvocationExpressions);
    // wait for the completion of the transaction tx
    await tx.done;
  },
  //------------------------------------------------
  retrieve: async function (dbName, Class, id) {
  //------------------------------------------------
    const db = await openDB( dbName);
    const tableName = Class.tableName || util.class2TableName( Class.name);
    return db.get( tableName, id);
  },
  //------------------------------------------------
  retrieveAll: async function (dbName, Class) {
  //------------------------------------------------
    const db = await openDB( dbName);
    const tableName = Class.tableName || util.class2TableName( Class.name);
    return db.getAll( tableName);
  },
  //------------------------------------------------
  update: async function (dbName, Class, id, slots) {
  //------------------------------------------------
    const db = await openDB( dbName);
    const tableName = Class.tableName || util.class2TableName( Class.name);
    const obj = await db.get( tableName, id);
    // update the properties concerned
    for (const propName of Object.keys( slots)) {
      obj[propName] = slots[propName];
    }
    // save updated object
    db.put( tableName, obj);
  },
  //------------------------------------------------
  destroy: async function (dbName, Class, id) {
  //------------------------------------------------
    const db = await openDB( dbName);
    const tableName = Class.tableName || util.class2TableName( Class.name);
    // slots[Class.idAttribute] = id;
    db.delete( tableName, id);
  },
  //------------------------------------------------
  clearTable: async function (dbName, Class) {
  //------------------------------------------------
    const db = await openDB( dbName);
    const tableName = Class.tableName || util.class2TableName( Class.name);
    await db.clear( tableName);
  },
  //------------------------------------------------
  clearDB: async function (dbName) {
  //------------------------------------------------
    const db = await openDB( dbName);
    // create a transaction involving all tables of the database
    const tx = db.transaction( db.objectStoreNames, "readwrite");
    // create a list of clear invocation expressions
    const clearInvocationExpressions =
        Array.from( db.objectStoreNames, osName => tx.objectStore( osName).clear());
    // invoke all of them in parallel and wait for their completion
    await Promise.all( clearInvocationExpressions);
    // wait for the completion of the transaction tx
    await tx.done;
  }
};

export default sTORAGEmANAGER;
