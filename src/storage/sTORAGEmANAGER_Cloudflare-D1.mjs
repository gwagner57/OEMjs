import {dt} from "../datatypes.mjs";
import eNUMERATION from "../eNUMERATION.mjs";
import util from "../../lib/util.mjs";
import sTORAGEmANAGER from "./sTORAGEmANAGER.mjs";

sTORAGEmANAGER.adapters["Cloudflare-D1"] = {
  //------------------------------------------------
  obj2rec: function (slots, Class) {
    //------------------------------------------------
    let rec={}, valuesToConvert=[], convertedValues=[];
    if ("lastRetrievalTime" in slots) delete slots.lastRetrievalTime;
    for (let p of Object.keys( slots)) {
      // remove underscore prefix from internal property name
      if (p.charAt(0) === "_") p = p.slice(1);
      const val = slots[p],
          propDef = Class.properties[p],
          range = propDef.range;
      // create a list of values to convert
      if (propDef.maxCard && propDef.maxCard > 1) {
        if (range in dt.classes) { // object reference(s)
          if (Array.isArray( val)) {
            valuesToConvert = [...val];  // clone;
          } else if (val && typeof val === "object") {  // val is a map from ID refs to obj refs
            valuesToConvert = Object.values( val);
          }
        } else if (Array.isArray( val)) {
          valuesToConvert = [...val];  // clone;
        } else console.error("Invalid collection in obj2rec:", JSON.stringify(val));
      } else {  // maxCard=1
        valuesToConvert = [val];
      }
      if (dt.supportedDatatypes.includes( range) || range instanceof eNUMERATION) {
        convertedValues = valuesToConvert;
      } else if (range in dt.classes) { // object reference(s)
        // get ID attribute of referenced class
        const idAttr = dt.classes[range].idAttribute;
        convertedValues = valuesToConvert.map( v => typeof v === "object" ? v["_"+idAttr] : v);
        //console.log("valuesToConvert: ", JSON.stringify( valuesToConvert));
        //console.log("convertedValues: ", JSON.stringify( convertedValues));
        /*
      } else if (range === "Date") {
        valuesToConvert[i] = dt.dataTypes["Date"].val2str( v);
         */
      } else {
        console.log(`The range ${range} is not yet considered in obj2rec.`);
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
    /*
    const db = await openDB( dbName);
    db.close();
    */
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
