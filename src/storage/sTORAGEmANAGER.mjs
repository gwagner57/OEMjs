/**
 * @fileOverview  The library class sTORAGEmANAGER.
 * @author Gerd Wagner
 * @copyright Copyright 2015-2022 Gerd Wagner, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 *
 * TODO: + take care of proper Date conversions in IndexedDB objSlots2recSlots and rec2obj
 * + check ID constraints in CREATE view and storageManager.add
 * +
 */
import util from "../../lib/util.mjs";
import eNUMERATION from "../eNUMERATION.mjs";
//import {deleteDB, openDB} from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';
import { openDB, deleteDB } from "../../lib/idb7-1.mjs";
import {dt} from "../datatypes.mjs";
import {NoConstraintViolation} from "../constraint-violation-error-types.mjs";

/**
 * The sTORAGEmANAGER class provides/ storage management methods for a number of predefined
 * storage adapters
 *
 * @class
 */
class sTORAGEmANAGER {
  constructor({adapterName, dbName, createLog=true, validateBeforeSave=true, cacheExpirationTimeInSeconds=300}) {
    if (!(["LocalStorage","IndexedDB"].includes( adapterName))) {
      throw new Error("Invalid storage adapter name!");
    } else if (!dbName) {
      throw new Error("Missing DB name!");
    } else {
      this.adapterName = adapterName;
      this.dbName = dbName;
      this.createLog = createLog;
      this.validateBeforeSave = validateBeforeSave;
      // the maps Class.instances form a cache of objects retrieved from secondary storage
      this.cacheExpirationTime = cacheExpirationTimeInSeconds * 1000;  // in milliseconds
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
   * Generic method for testing if a database exists and has contents
   * @method
   * @param {Array} classes  The business object classes to be persisted
   */
  async hasDatabaseContents() {
    var result = false;
    try {
      result = await this.adapter.hasDatabaseContents( this.dbName, this.adapter.dbx);
    } catch (error) {
      console.error( error.constructor.name +": "+ error.message);
    }
    return result;
  }
  /**
   * Generic method for opening an existing DB or creating an empty DB (with a set of empty tables)
   * @method
   * @param {Array} classes  The business object classes to be persisted
   */
  async openDbOrCreateEmptyDb( classes) {
    try {
      // get DB connection
      this.adapter.dbx = await this.adapter.openDbOrCreateEmptyDb( this.dbName, classes);
      if (this.createLog) console.log(`Connection to database ${this.dbName} established.`);
    } catch (error) {
      console.log( error.constructor.name +": "+ error.message);
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
      await this.adapter.deleteDatabase( dbName, this.adapter.dbx);
      if (this.createLog) console.log(`Database ${dbName} deleted`);
    } catch (error) {
      console.error( error.constructor.name +": "+ error.message);
    }
  }
  /**
   * Generic method for "persisting" a list of object records
   * @method
   * @param {object} Class  The business object class concerned
   * @param {object} recordOrRecordList  A record, or a record list, of object attribute values
   */
  async add( Class, recordOrRecordList) {
    var recordsToAdd=[];
    if (!Class) throw new Error(`Cannot add ${JSON.stringify(recordOrRecordList)} without a Class argument`);
    if (typeof recordOrRecordList === "object" && !Array.isArray(recordOrRecordList)) {
      recordsToAdd = [this.adapter.objSlots2recSlots( recordOrRecordList, Class)];
    } else if (Array.isArray(recordOrRecordList) && recordOrRecordList.every(
        r => typeof r === "object" && !Array.isArray(r))) {
      recordsToAdd = recordOrRecordList.map( r => this.adapter.objSlots2recSlots( r, Class));
    } else throw new Error("2nd argument of 'add' must be a record or record list! Invalid value: "+
                           JSON.stringify(recordOrRecordList));
    //console.log("recordsToAdd: ", JSON.stringify( recordsToAdd));
    const idAttr = Class.idAttribute;
    // create auto-IDs if required
    if (Class.properties[idAttr].range === "AutoIdNumber") {
      for (const r of recordsToAdd) {
        if (!r[idAttr]) {  // do not overwrite assigned ID values
          if (typeof Class.getAutoId === "function") r[idAttr] = Class.getAutoId();
          else if (Class.idCounter !== undefined) r[idAttr] = ++Class.idCounter;
          else r[idAttr] = Class.idCounter = 1001;
        }
      }
    }
    // check constraints before save if required
    if (this.validateBeforeSave) {
      for (let i=0; i < recordsToAdd.length; i++) {
        const r = recordsToAdd[i];
        for (const f of Object.keys( r)) {
          const checkRefInt = dt.checkReferentialIntegrity;
          dt.checkReferentialIntegrity = false;
          const validationResults = dt.check( f, Class.properties[f], r[f]);
          dt.checkReferentialIntegrity = checkRefInt;
          if (!(validationResults[0] instanceof NoConstraintViolation)) {
            const e = validationResults[0];  //TODO: support multiple errors
            console.error( e.constructor.name +": "+ e.message);
            // remove record from the records to add
            recordsToAdd.splice( i, 1);
          }
        }
      }
    }
    try {
      await this.adapter.add( this.dbName, this.adapter.dbx, Class, recordsToAdd);
      for (const rec of recordsToAdd) {
        Class.instances[rec[Class.idAttribute]] = new Class( rec);
      }
      if (this.createLog) console.log(`${recordsToAdd.length} ${Class.name}(s) added.`);
    } catch (error) {
      switch (error.constructor.name) {
      case "NotFoundError":
        console.error(`Object store ${Class.name} not found!`);
        break;
      case "DataError":
        console.error(`Missing ID value in ${Class.name} record: ${recordsToAdd}`);
        break;
      default:
        console.error(`${error.constructor.name}: ${error.message}`);
      }
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
      const rec = await this.adapter.retrieve( this.dbName, this.adapter.dbx, Class, id);
      if (!rec) {
        console.error(`Retrieval of ${Class.name} ${id} failed!`);
      } else {
        const currentTime = (new Date()).getTime();
        // create entity/object from record
        obj = this.adapter.rec2obj( rec, Class);
        obj.lastRetrievalTime = currentTime;
        if (this.createLog) console.log(`${Class.name} ${obj.toShortString()} retrieved.`);
        // retrieve all associated records
        for (const refProp of Class.referenceProperties) {
          const refPropDef = Class.properties[refProp],
                AssociatedClass = dt.classes[refPropDef.range];
          let idRefs=[];
          if (AssociatedClass === Class ||
              (currentTime - AssociatedClass.lastRetrievalTime < this.cacheExpirationTime)) continue;
          if (refPropDef.maxCard > 1) idRefs = rec[refProp];
          else if (rec[refProp] !== undefined) idRefs = [rec[refProp]];
          for (const idRef of idRefs) {
            const lastRetrievalTime = AssociatedClass.instances[idRef]?.lastRetrievalTime ?? 0;
            if (currentTime - lastRetrievalTime > this.cacheExpirationTime) {
              console.log(`AssociatedClass: ${AssociatedClass.name},idRef: ${idRef}`);
              const associatedObject = await this.retrieve( AssociatedClass, idRef);
              if (associatedObject) {
                associatedObject.lastRetrievalTime = (new Date()).getTime();
                AssociatedClass.instances[idRef] = associatedObject;
              }
            }
          }
        }
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
  async retrieveAll( Class, alreadyRetrievedClasses=[]) {
    const checkRefInt = dt.checkReferentialIntegrity;  // store the setting
    dt.checkReferentialIntegrity = false;  // disable referential integrity checking
    Class.instances = {};  // delete current Class population
    try {
      const entityRecords = await this.adapter.retrieveAll( this.dbName, this.adapter.dbx, Class);
      alreadyRetrievedClasses.push( Class.name);
      Class.lastRetrievalTime = (new Date()).getTime();
      //console.log("Entity records: ", JSON.stringify(entityRecords));
      if (this.createLog) console.log( entityRecords.length +" "+ Class.name +" records retrieved.");
      const currentTime = (new Date()).getTime();
      // store entity records in Class.instances
      for (const entityRec of entityRecords) {
        const id = entityRec[Class.idAttribute];
        Class.instances[id] = entityRec;
      }
      // retrieve all records from all associated tables
      for (const refProp of Class.referenceProperties.concat( Class.inverseReferenceProperties)) {
        const AssociatedClass = dt.classes[Class.properties[refProp].range];
        if (!alreadyRetrievedClasses.includes( AssociatedClass.name) &&
            currentTime - AssociatedClass.lastRetrievalTime > this.cacheExpirationTime) {
          await this.retrieveAll( AssociatedClass, alreadyRetrievedClasses);
          AssociatedClass.lastRetrievalTime = (new Date()).getTime();
        }
      }
    } catch (error) {
      console.error(`${error.constructor.name}: ${error.message}`);
      dt.checkReferentialIntegrity = checkRefInt;  // restore previous setting
      return;
    }
    try {
      // create entities from records
      for (const entityRec of Object.values( Class.instances)) {
        const id = entityRec[Class.idAttribute],
              entity = this.adapter.rec2obj( entityRec, Class);
        if (entity) Class.instances[id] = entity;
      }
      // in a second pass, create virtual views of inverse reference properties
      for (const entity of Object.values( Class.instances)) {
        for (const invRefProp of Class.inverseReferenceProperties) {
          const invRefPropDef = Class.properties[invRefProp],
                InvAssociatedClass = dt.classes[invRefPropDef.range],
                refProp = invRefPropDef.inverseOf,
                refPropDef = InvAssociatedClass.properties[refProp];
          let assocEntityIDs;
          if (invRefPropDef.maxCard && invRefPropDef.maxCard > 1) entity[invRefProp] = {};
          for (const obj of Object.values( InvAssociatedClass.instances)) {
            const id = obj[InvAssociatedClass.idAttribute];
            if (!refPropDef.maxCard || refPropDef.maxCard === 1) {
              assocEntityIDs = [obj[refProp][Class.idAttribute]];
            } else {
              assocEntityIDs = Object.keys( obj[refProp]);
            }
            if (assocEntityIDs.includes( entity[Class.idAttribute])) {
              if (!invRefPropDef.maxCard || invRefPropDef.maxCard === 1) entity[invRefPropDef] = obj;
              else entity[invRefProp][id] = obj;  // create map entry
            }
          }

        }
      }
    } catch (error) {
      console.error(`${error.constructor.name}: ${error.message}`);
    }
    dt.checkReferentialIntegrity = checkRefInt;  // restore previous setting
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
    const updRec = this.adapter.objSlots2recSlots( slots, Class);
    // check if an object record with this ID exists and its values have been changed
    const objectBeforeUpdate = await this.retrieve( Class, id),
          recordBeforeUpdate = this.adapter.objSlots2recSlots( objectBeforeUpdate, Class);
    if (objectBeforeUpdate) {
      for (const prop of Object.keys( updRec)) {
        const oldVal = recordBeforeUpdate[prop],
              propDef = Class.properties[prop];
        let newVal = updRec[prop];
        if (prop === Class.idAttribute || "inverseOf" in propDef) {
          delete updRec[prop];
          continue;
        }
        if (propDef.maxCard === undefined || propDef.maxCard === 1) {  // single-valued
          if (dt.primitiveReferenceTypes.includes( propDef.range) && !newVal.isEqualTo( oldVal) ||
              !dt.primitiveReferenceTypes.includes( propDef.range) && newVal !== oldVal) {
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
          }
        }
      }
      if (noConstraintViolated) {
        if (updatedProperties.length > 0) {
          try {
            this.adapter.update( this.dbName, this.adapter.dbx, Class, id, updRec);
            // update in-memory object
            if (id in Class.instances) {
              for (const p of Object.keys( slots)) {
                Class.instances[id][p] = slots[p];
              }
            }
            const singPlurSuffix = updatedProperties.length > 1 ? "ies":"y";
            console.log(`Propert${singPlurSuffix} ${updatedProperties.toString()} of ${Class.name} ${id} updated.`);
          } catch (error) {
            console.log(`${error.constructor.name}: ${error.message}`);
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
  async destroy( Class, id) {
    const dbName = this.dbName;
    try {
      this.adapter.destroy( dbName, this.adapter.dbx, Class, id);
      delete Class.instances[id];
      console.log(`${Class.name} ${id} deleted.`);
    } catch (error) {
      console.log(`${error.constructor.name}: ${error.message}`);
    }
  }
  /**
   * Generic method for clearing the DB table, or object store, of a cLASS
   * @method
   */
  async clearTable( Class) {
    await this.adapter.clearTable( this.dbName, this.adapter.dbx, Class);
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
  openDbOrCreateEmptyDb: function (dbName, modelClasses) {  // nothing to do
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
        Class.instances[key] = new Class( table[key]);
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
  objSlots2recSlots: function (slots, Class) {
  //------------------------------------------------
    let rec={}, valuesToConvert=[], convertedValues=[];
    if ("lastRetrievalTime" in slots) delete slots.lastRetrievalTime;
    for (let p of Object.keys( slots)) {
      const val = slots[p];
      // remove underscore prefix from internal property name
      if (p.charAt(0) === "_") p = p.slice(1);
      const propDef = Class.properties[p],
            range = propDef.range;
      // create a list of values to convert
      if (propDef.maxCard > 1) {
        if (range in dt.classes) { // object reference(s)
          if (Array.isArray( val)) {
            valuesToConvert = [...val];  // clone;
          } else if (val && typeof val === "object") {  // val is a map from ID refs to obj refs
            valuesToConvert = Object.values( val);
          }
        } else if (Array.isArray( val)) {
          valuesToConvert = [...val];  // clone;
        } else console.error("Invalid collection in objSlots2recSlots:", JSON.stringify(val));
      } else {  // maxCard=1
        valuesToConvert = [val];
      }
      if (dt.supportedDatatypes.includes( range) || range instanceof eNUMERATION) {
        convertedValues = valuesToConvert;
      } else if (range in dt.classes) {  // object reference(s)
        // get ID attribute of referenced class
        const idAttr = dt.classes[range].idAttribute;
        convertedValues = valuesToConvert.map( v => typeof v === "object" ? v["_"+idAttr] : v);
        //console.log("objSlots2recSlots valuesToConvert: ", JSON.stringify( valuesToConvert));
        //console.log("objSlots2recSlots convertedValues: ", JSON.stringify( convertedValues));
        /*
      } else if (range === "Date") {
        valuesToConvert[i] = dt.dataTypes["Date"].val2str( v);
         */
      } else {
        console.log(`The range ${range} is not yet considered in objSlots2recSlots.`);
        convertedValues = valuesToConvert;
      }
      if (!propDef.maxCard || propDef.maxCard <= 1) {
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
    const obj = new Class( rec);  // may throw exception caught in calling procedure
    //console.log("rec2obj rec: ", JSON.stringify( rec));
    //console.log("rec2obj obj: ", JSON.stringify( obj));
    for (const refProp of Class.referenceProperties) {
      const propDef = Class.properties[refProp],
            val = obj[refProp],
            AssociatedClass = dt.classes[propDef.range];
      let assObjColl=[];
      if (propDef.maxCard > 1) assObjColl = val;
      else assObjColl = [val];
      for (const assObj of assObjColl) {
        if (assObj && !(assObj instanceof AssociatedClass)) {
          console.error(`The value ${JSON.stringify( assObj)} of reference property ${Class.name}::${refProp} is not an instance of ${AssociatedClass.name}.`,
              `Instead, it's an instance of ${assObj.constructor.name}`);
        }
      }
    }
    // convert ID references to internal object references
    /*
    for (const refProp of Class.referenceProperties) {
      const propDef = Class.properties[refProp],
            val = obj[refProp],
            AssociatedClass = dt.classes[propDef.range];
      let references=[], objRefs=[];
      if (!propDef.maxCard || propDef.maxCard === 1) {  // single-valued reference property
        if (val !== undefined) {
          references = [obj[refProp]];
        }
      } else {  // multi-valued reference property (stored as list of ID references)
        references = obj[refProp];
      }
      for (const ref of references) {
        if (typeof ref === "object") continue;
        // ref is an ID reference
        const associatedEntity = AssociatedClass.instances[ref];
        if (associatedEntity) {
          objRefs.push( associatedEntity);
        } else {
          console.error(`The ID reference ${ref} of ${Class.name} ${obj[Class.idAttribute]} `+
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
    */
    return obj;
  },
  //------------------------------------------------
  hasDatabaseContents: async function (dbName, dbx) {
  //------------------------------------------------
    const firstTableName = dbx.objectStoreNames[0];
    const count = await dbx.transaction([firstTableName], "readonly").objectStore( firstTableName).count();
    return count > 0;
  },
  //------------------------------------------------
  openDbOrCreateEmptyDb: async function (dbName, modelClasses) {
  //------------------------------------------------
    return await openDB( dbName, 1, {
      upgrade(db) {
        for (const mc of modelClasses) {
          const tn = mc.tableName || util.class2TableName( mc.name);
          if (!db.objectStoreNames.contains( tn)) {
            db.createObjectStore( tn, {keyPath: mc.idAttribute});
            console.log(`Object store ${tn} created.`);
          }
        }
      },
      blocked( currentVersion, blockedVersion, event) {
        console.log(`Old version ${blockedVersion} still open, so version ${currentVersion} cannot open.`);
      },
      blocking( currentVersion, blockedVersion, event) {
        console.log(`Version ${currentVersion} still open, blocking the attempt to open ${blockedVersion}.`);
      },
      terminated() {
        console.log(`Connection for database ${dbName} abnormally terminated.`);
      }
    });
  },
  //------------------------------------------------
  deleteDatabase: async function (dbName, dbx) {
  //------------------------------------------------
    dbx.close();
    await deleteDB( dbName, {
      blocked( currentVersion) {
        console.log(`Database ${dbName} can only be deleted after the open connection to version ${currentVersion} is closed.`)
      },
    });
  },
  //------------------------------------------------
  add: async function (dbName, dbx, Class, records) {
  //------------------------------------------------
    const tableName = Class.tableName || util.class2TableName( Class.name);
    // create a transaction involving only the table with the provided name
    const tx = dbx.transaction( tableName, "readwrite");
    // create a list of add invocation expressions
    const addInvocationExpressions = records.map( r => tx.store.add( r));
    // invoke all of them in parallel and wait for their completion
    await Promise.all( addInvocationExpressions);
    // wait for the completion of the transaction tx
    await tx.done;
  },
  //------------------------------------------------
  retrieve: async function (dbName, dbx, Class, id) {
  //------------------------------------------------
    const tableName = Class.tableName || util.class2TableName( Class.name);
    return dbx.get( tableName, id);
  },
  //------------------------------------------------
  retrieveAll: async function (dbName, dbx, Class) {
  //------------------------------------------------
    const tableName = Class.tableName || util.class2TableName( Class.name);
    return dbx.getAll( tableName);
  },
  //------------------------------------------------
  update: async function (dbName, dbx, Class, id, slots) {
  //------------------------------------------------
    const tableName = Class.tableName || util.class2TableName( Class.name);
    // retrieve the object/record concerned
    const record = await dbx.get( tableName, id);
    // update the properties concerned
    for (const propName of Object.keys( slots)) {
      record[propName] = slots[propName];
    }
    // save updated object/record
    dbx.put( tableName, record);
  },
  //------------------------------------------------
  destroy: async function (dbName, dbx, Class, id) {
  //------------------------------------------------
    const tableName = Class.tableName || util.class2TableName( Class.name);
    dbx.delete( tableName, id);
  },
  //------------------------------------------------
  clearTable: async function (dbName, dbx, Class) {
  //------------------------------------------------
    const tableName = Class.tableName || util.class2TableName( Class.name);
    await dbx.clear( tableName);
  },
  //------------------------------------------------
  clearDB: async function (dbName, dbx) {
  //------------------------------------------------
    // create a transaction involving all tables of the database
    const tx = dbx.transaction( dbx.objectStoreNames, "readwrite");
    // create a list of clear invocation expressions
    const clearInvocationExpressions =
        Array.from( dbx.objectStoreNames, osName => tx.objectStore( osName).clear());
    // invoke all of them in parallel and wait for their completion
    await Promise.all( clearInvocationExpressions);
    // wait for the completion of the transaction tx
    await tx.done;
  }
};

export default sTORAGEmANAGER;
