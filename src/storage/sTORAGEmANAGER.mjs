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
import {dt} from "../datatypes.mjs";
import {NoConstraintViolation, ConstraintViolation} from "../constraint-violation-error-types.mjs";

/**
 * Library class providing storage management methods for a number of predefined
 * storage adapters
 *
 * @class
 */
class sTORAGEmANAGER {
  constructor({adapterName, dbName, createLog, validateBeforeSave}) {
    if (!(["LocalStorage","IndexedDB"].includes( adapterName))) {
      throw new Error("Invalid storage adapter name!");
    } else if (!dbName) {
      throw new Error("Missing DB name!");
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
    var recordsToAdd=[];
    if (!Class) throw new Error(`Cannot add ${JSON.stringify(rec)} without a Class argument`);
    if (typeof rec === "object" && !Array.isArray(rec)) {
      recordsToAdd = [this.adapter.obj2rec( rec, Class)];
    } else if (Array.isArray(rec) && rec.every( r => typeof r === "object" && !Array.isArray(r))) {
      recordsToAdd = rec.map( r => this.adapter.obj2rec( r, Class));
    } else throw new Error("2nd argument of 'add' must be a record or record list! Invalid value: "+
                           JSON.stringify(rec));
    //console.log("recordsToAdd: ", JSON.stringify( recordsToAdd));
    const idAttr = Class.idAttribute;
    // create auto-IDs if required
    if (Class.properties[idAttr].range === "AutoIdNumber") {
      for (const r of recordsToAdd) {
        if (!r[idAttr]) {  // do not overwrite assigned ID values
          if (typeof Class.getAutoId === "function") r[idAttr] = Class.getAutoId();
          else if (Class.idCounter !== undefined) r[idAttr] = ++Class.idCounter;
        }
      }
    }
    // check constraints before save if required
    if (this.validateBeforeSave) {
      for (let i=0; i < recordsToAdd.length; i++) {
        const r = recordsToAdd[i];
        let newObj=null;
        try {
          newObj = new Class( r);  // check constraints
        } catch (e) {
          if (e instanceof ConstraintViolation) {
            console.log( e.constructor.name +": "+ e.message);
          } else console.log( e);
          // remove record from the records to add
          recordsToAdd.splice( i, 1);
        }
      }
    }
    try {
      await this.adapter.add( this.dbName, Class, recordsToAdd);
      if (this.createLog) console.log(`${recordsToAdd.length} ${Class.name}(s) added.`);
    } catch (error) {
      console.log(`${error.name}: ${error.message}`);
    }
  };
  /**
   * Generic method for retrieving a record from secondary storage and
   * convert it to a corresponding typed object that is returned
   * @method
   * @param {object} Class  The business object class concerned
   * @param {string|number} id  The object ID value
   */
  async retrieve( Class, id) {
    var obj=null;
    const checkRefInt = dt.checkReferentialIntegrity;
    dt.checkReferentialIntegrity = false;  // disable referential integrity checking
    try {
      const rec = await this.adapter.retrieve( this.dbName, Class, id);
      if (!rec) {
        console.error(`There is no ${Class.name} with ID value ${id} in the database!`);
      } else {
        // retrieve all associated records
        for (const refProp of Class.referenceProperties) {
          const refPropDef = Class.properties[refProp],
                AssociatedClass = dt.classes[refPropDef.range];
          let idRefs=[];
          if (AssociatedClass === Class) continue;
          if (refPropDef.maxCard && refPropDef.maxCard > 1) idRefs = rec[refProp];
          else  idRefs = [rec[refProp]];
          for (const idRef of idRefs) {
            AssociatedClass.instances[idRef] = await this.retrieve( AssociatedClass, idRef);
          }
        }
        // create entity/object from record
        obj = this.adapter.rec2obj( rec, Class);
        if (this.createLog) console.log(`${Class.name} with ${Class.idAttribute} ${id} retrieved.`);
      }
    } catch (error) {
      console.error(`${error.constructor.name}: ${error.message}`);
    }
    dt.checkReferentialIntegrity = checkRefInt;  // restore previous setting
    return obj;
  }
  /**
   * Generic method for retrieving all records of a DB table corresponding
   * to a Class and convert them to instances of that Class, which are then
   * stored in Class.instances (an "entity table"). Also retrieves all
   * records from all associated tables.
   * TODO: retrieve only those records (from associated tables) that are referenced
   * by these instances.
   *
   * @method
   * @param {object} Class  The business object class concerned
   */
  async retrieveAll( Class) {
    var entityTable = {};
    const checkRefInt = dt.checkReferentialIntegrity;
    dt.checkReferentialIntegrity = false;  // disable referential integrity checking
    try {
      const entityRecords = await this.adapter.retrieveAll( this.dbName, Class);
      //console.log("Entity records: ", JSON.stringify(entityRecords));
      if (this.createLog) console.log( entityRecords.length +" "+ Class.name +" records retrieved.");
      // retrieve all records from all associated tables
      for (const refProp of Class.referenceProperties) {
        const AssociatedClass = dt.classes[Class.properties[refProp].range];
        if (AssociatedClass !== Class) await this.retrieveAll( AssociatedClass);
      }
      // create entities from records
      for (const entityRec of entityRecords) {
        const id = entityRec[Class.idAttribute],
              entity = this.adapter.rec2obj( entityRec, Class);
        entityTable[id] = entity;
      }
    } catch (error) {
      console.log(`${error.constructor.name}: ${error.message}`);
    }
    dt.checkReferentialIntegrity = checkRefInt;  // restore previous setting
    Class.instances = entityTable;
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
    // convert special values to storage representation (e.g., objRefs -> idRefs)
    const updRec = this.adapter.obj2rec( slots, Class);
    // check if an object record with this ID exists and its values have been changed
    const objectBeforeUpdate = await this.retrieve( Class, id),
          recordBeforeUpdate = this.adapter.obj2rec( objectBeforeUpdate, Class);
    if (objectBeforeUpdate) {
      for (const prop of Object.keys( updRec)) {
        const oldVal = recordBeforeUpdate[prop],
              propDef = Class.properties[prop];
        let newVal = updRec[prop];
        if (prop !== Class.idAttribute) {
          if (propDef.maxCard === undefined || propDef.maxCard === 1) {  // single-valued
            if (newVal !== oldVal) {
              const validationResults = dt.check( prop, propDef, newVal);
              if (!(validationResults[0] instanceof NoConstraintViolation)) {
                //TODO: support multiple errors
                const constraintViolation = validationResults[0];
                console.error( constraintViolation.constructor.name +": "+ constraintViolation.message);
                noConstraintViolated = false;
              } else {
                updatedProperties.push( prop);
              }
            } else {  // no update required
              delete updRec[prop];
            }
          } else {  // multi-valued
            if (oldVal.length !== newVal.length ||
                oldVal.some( (vi,i) => vi !== newVal[i])) {
              const validationResults = dt.check( prop, propDef, newVal);
              if (!(validationResults[0] instanceof NoConstraintViolation)) {
                //TODO: support multiple errors
                const constraintViolation = validationResults[0];
                console.error( constraintViolation.constructor.name +": "+ constraintViolation.message);
                noConstraintViolated = false;
              } else {  // NoConstraintViolation
                updatedProperties.push( prop);
              }
            } else {  // no update required
              delete updRec[prop];
            }
          }
        }
      }
      if (noConstraintViolated) {
        if (updatedProperties.length > 0) {
          try {
            this.adapter.update( this.dbName, Class, id, updRec);
            // update in-memory object
            if (id in Class.instances) {
              for (const p of Object.keys( slots)) {
                Class.instances[id][p] = slots[p];
              }
            }
            console.log(`Properties ${updatedProperties.toString()} of ${Class.name} ${id} updated.`);
          } catch (error) {
            console.log(`${error.name}: ${error.message}`);
          }
        } else {
          console.log(`No property value changed for ${Class.name} ${id}!`);
        }
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
    const dbName = this.dbName;
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
  obj2rec: function (slots, Class) {
  //------------------------------------------------
    let rec={}, valuesToConvert=[], convertedValues=[];
    for (let p of Object.keys( slots)) {
      // remove underscore prefix from internal property name
      if (p.charAt(0) === "_") p = p.slice(1);
      const val = slots[p],
            propDecl = Class.properties[p],
            range = propDecl.range;
      // create a list of values to convert
      if (propDecl.maxCard && propDecl.maxCard > 1) {
        if (range in dt.classes) { // object reference(s)
          if (Array.isArray( val)) {
            valuesToConvert = [...val];  // clone;
          } else {  // val is a map from ID refs to obj refs
            valuesToConvert = Object.values( val);
          }
        } else if (Array.isArray( val)) {
          valuesToConvert = [...val];  // clone;
        } else console.error("Invalid collection in obj2rec:", JSON.stringify(val));
      } else {  // maxCard=1
        valuesToConvert = [val];
      }
      if (dt.supportedDatatypes.includes( range)) {
        convertedValues = valuesToConvert;
      } else if (range in dt.classes) { // object reference(s)
        // get ID attribute of referenced class
        const idAttr = dt.classes[range].idAttribute;
        /*
        for (const v of valuesToConvert) {
          let convVal;
          if (typeof v === "object") convVal = v["_"+idAttr];
          else convVal = v;
          convertedValues.push( convVal)
        }
        */
        convertedValues = valuesToConvert.map( v => typeof v === "object" ? v["_"+idAttr] : v);
        //console.log("valuesToConvert: ", JSON.stringify( valuesToConvert));
        //console.log("convertedValues: ", JSON.stringify( convertedValues));
        /*
      } else if (range === "Date") {
        valuesToConvert[i] = dt.dataTypes["Date"].val2str( v);
         */
      }
      if (!propDecl.maxCard || propDecl.maxCard <= 1) {
        rec[p] = convertedValues[0];
      } else {
        rec[p] = convertedValues;
      }
    }
    return rec;
  },
  //------------------------------------------------
  rec2obj: function (rec, Class) {
  //------------------------------------------------
    let obj = null;
    try {
      obj = new Class( rec);
    } catch (e) {
      console.error( `${e.constructor.name}: ${e.message}`);
      return null;
    }
    // convert ID references to internal object references
    for (const refProp of Class.referenceProperties) {
      const propDef = Class.properties[refProp],
            AssociatedClass = dt.classes[propDef.range];
      let idRefs=[], objRefs=[];
      if (!Array.isArray(obj[refProp])) {  // single-valued reference property
        if (obj[refProp] !== undefined) idRefs = [obj[refProp]];
      } else {  // multi-valued reference property (stored as list of ID references)
        idRefs = obj[refProp];
      }
      for (const idRef of idRefs) {
        const associatedEntity = AssociatedClass.instances[idRef];
        if (associatedEntity) {
          objRefs.push( associatedEntity);
        } else {
          console.error(`The ID reference ${idRef} of ${Class.name} ${obj[Class.idAttribute]} `+
              `does not reference an existing ${AssociatedClass.name} entity`);
          return null;
        }
      }
      if (!propDef.maxCard || propDef.maxCard === 1) {
        obj[refProp] = objRefs[0];
      } else {  // multi-valued reference property
        const assObjMap = {};  // create a map of associated objects
        for (const object of objRefs) {
          const assObjId = object[AssociatedClass.idAttribute];
          assObjMap[assObjId] = object;
        }
        obj[refProp] = assObjMap;  // a map of associated objects
      }
    }
    return obj;
  },
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
    const record = await db.get( tableName, id);
    // update the properties concerned
    for (const propName of Object.keys( slots)) {
      record[propName] = slots[propName];
    }
    // save updated object
    db.put( tableName, record);
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
