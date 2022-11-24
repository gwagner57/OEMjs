import sTORAGEmANAGER from "./sTORAGEmANAGER.mjs";
import { initializeApp } from "firebase/app";
import { readFileSync } from "fs";
import { getFirestore, addDoc, deleteDoc, collection, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { clearScreenDown } from "readline";

/**
 * @fileOverview  Storage management methods for the "Firestore" adapter
 * @author ...
 * @copyright Copyright 2022 ..., Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
class sTORAGEmANAGER_Firestore extends sTORAGEmANAGER {
  // Firebase Application Object
  #fireApp = null;
  #db = null;
  #store = {};
  #firestoreConfig = null;
  #credentials = null;

  /**
   * 
   * @param {*} dbName 
   * @param {*} createLog 
   * @param {*} validateBeforeSave 
   */
  constructor({ dbName, configPath, createLog, validateBeforeSave }) {
    super({ adapterName: "Firestore", dbName: dbName, createLog: createLog, validateBeforeSave: validateBeforeSave });

    this.dbName = dbName;
    this.createLog = createLog;
    this.validateBeforeSave = validateBeforeSave;
    if (!configPath) {
      this.configPath = "../../firestore_config.json";
    } else {
      this.configPath = configPath;
    }
  }

  getDb() {
    return this.#db;
  }

  /**
   * Read Firestore configuration from provided `configPath` at 
   * instance initialization.
   * 
   * @returns Parsed JSON file containing Firestore configuration
   */
  #readFirestoreConfig() {
    const config = readFileSync(this.configPath);
    let firestoreConfig = null;
    if (config) {
      firestoreConfig = JSON.parse(config);
      this.#firestoreConfig = firestoreConfig;
    } else {
      throw new Error("Firestore config file not found at: ", this.configPath);
    }
    return firestoreConfig;
  }

  /**
   * Initialize Firebase application with needed parameters
   * 
   */
  #init() {
    const firestoreConfig = this.#readFirestoreConfig();
    this.#fireApp = initializeApp(firestoreConfig);
    this.#db = getFirestore(this.#fireApp);
  }

  /**
   * Private method, authenticate with Github account to acccess
   * Firestore database.
   * 
   */
  #authenticate(email, password) {
    let userCredentials;
    signInWithEmailAndPassword(getAuth(), email, password).then((result) => {
      // The signed-in user info.
      userCredentials = result.user;
    }).catch((error) => {
      console.log("Error Sign-In: ", error);
    });
    if (userCredentials) {
      this.#credentials = userCredentials;
    }
  }

  /**
   * Setting up all needed information for accessing the firestore database
   */
  setup() {
    this.#init();
    this.#authenticate(this.#firestoreConfig.username, this.#firestoreConfig.user_pass);
  }

  quit() {
    signOut(getAuth());
  }

  async createEmptyDb(dbName, classes) {
    // Nothing todo, collections is automatically created
    // if data is added
  }

  async deleteDatabase(dbName) {
    // Find collection and delete them
    const col = doc(this.#db, dbName);
    if (col) {
      await deleteDoc(doc(this.#db, dbName));
    } else {
      throw new Error(`dbName ${dbName} not found`);
    }
  }

  async add(dbName, record, Class) {
    try {
      const docRef = await addDoc(collection(this.#db, Class.name), record.toRecord());
      // Store all added records of a class
      if (docRef) {
        const hasName = Object.keys(this.#store).filter(name => name === Class.name);
        if (hasName.length > 0) {
          this.#store[Class.name].push(docRef.id);
        } else {
          this.#store[Class.name] = [docRef.id];
        }
        return docRef.id;
      }
      console.log("Document written with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  async retrieve(dbName, Class, id) {
    const docRef = doc(this.#db, Class.name + "/" + id);
    return await getDoc(docRef);
  }

  async retrieveAll(dbName, Class) {
    const ref = doc(this.#db, Class.name);
    return await getDoc(ref);
  }

  async update(dbName, Class, id, slots) {
    const docRef = doc(this.#db, Class.name, id);
    return await setDoc(docRef, slots);
  }

  async destroy(dbName, Class, id) {
    return await deleteDoc(doc(this.#db, dbName, Class.name, id));
  }

  async clearTable(dbName, Class) {
    const refs = this.#store[Class.name];
    if (refs) {
      refs.forEach(e => {
        this.destroy(dbName, Class, e);
      });
    }
  }

  async clearDB(dbName) {
    await deleteDoc(doc(this.#db, dbName));
  }
}


export default sTORAGEmANAGER_Firestore;

// Extend adapters
sTORAGEmANAGER.adapters["Firestore"] = {
  //------------------------------------------------
  createEmptyDb: async (dbName, modelClasses) => {
    sTORAGEmANAGER_Firestore.createEmptyDb(dbName, modelClasses);
  },
  deleteDatabase: async (dbName) => {
    sTORAGEmANAGER_Firestore.deleteDatabase(dbName);
  },
  add: async (dbName, record, Class) => {
    sTORAGEmANAGER_Firestore.add(dbName, record, Class);
  },
  retrieve: async (dbName, Class) => {
    sTORAGEmANAGER_Firestore.retrieve(dbName, Class);
  },
  retrieveAll: async (dbName, Class) => {
    sTORAGEmANAGER_Firestore.retrieveAll(dbName, Class);
  },
  update: async (dbName, Class, id, slots) => {
    sTORAGEmANAGER_Firestore.update(dbName, Class, id, slots);
  },
  destroy: async (dbName, Class, id) => {
    sTORAGEmANAGER_Firestore.destroy(dbName, Class, id);
  },
  clearTable: async (dbName, Class) => {
    sTORAGEmANAGER_Firestore.clearTable(dbName, Class);
  },
  clearDB: async (dbName) => {
    sTORAGEmANAGER_Firestore.clearDB(dbName);
  }
};
