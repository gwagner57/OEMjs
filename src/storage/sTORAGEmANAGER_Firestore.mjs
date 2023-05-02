import { initializeApp } from "../../lib/firebase-app.js";
import { getFirestore, addDoc, deleteDoc, collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc } from "../../lib/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "../../lib/firebase-auth.js";

/**
 * @fileOverview  Storage management methods for the "Firestore" adapter
 * @author Benji Miethke
 * @copyright Copyright 2023, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */
class sTORAGEmANAGER_Firestore {
  // Firebase Application Object
  #fireApp = null;
  #db = null;
  #store = {};
  #firestoreConfig = null;
  #username = null;
  #user_pass = null;
  #credentials = null;
  #collections = new Set();

  /**
   * 
   * @param {*} dbName 
   * @param {*} createLog 
   * @param {*} validateBeforeSave 
   */
  constructor({ dbName, configPath = "firestore_config.json", createLog, validateBeforeSave }) {
    this.dbName = dbName;
    this.createLog = createLog;
    this.validateBeforeSave = validateBeforeSave;
    if (!configPath) {
      console.error("configpath isn't defined!")
    }
    let rootUrl = new URL(window.location.href);
    this.configPath = new URL("/" + configPath, rootUrl.origin);
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
  #readFirestoreConfig(config) {
    // const config = readFileSync(this.configPath);
    let firestoreConfig = null;
    if (config) {
      firestoreConfig = JSON.parse(config);
    } if (this.configPath) {
      firestoreConfig = JSON.parse(config);
    }
    else {
      throw new Error("Firestore config file not found at: ", this.configPath);
    }
    return firestoreConfig;
  }

  /**
   * Initialize Firebase application with needed parameters
   * 
   */
  async #init() {
    try {
      let response = await fetch(this.configPath);
      let data = await response.json();
      this.#username = data.username;
      this.#user_pass = data.user_pass;
      // remove data not needed in Firestore
      delete data["username"];
      delete data["user_pass"];
      this.#firestoreConfig = data;
      console.log("Firestore config: ", data);
      this.#fireApp = initializeApp(data);
      this.#db = getFirestore(this.#fireApp);
    } catch (error) {
      console.error("Error on init()", error);
    }
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
    this.#authenticate(this.#username, this.#user_pass);
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

  async add(dbName, Class, record) {
    try {
      let docRefs = []
      if (Array.isArray(record)) {
        record.forEach(async item => {
          const collClass = collection(this.#db, Class.name);
          const docRef = doc(collClass, item[item.constructor.idAttribute]);
          await setDoc(docRef, item.toRecord());
          docRefs.push(docRef);
          this.#collections.add(Class.name);
        });
      } else {
        const collClass = collection(this.#db, Class.name);
        const docRef = doc(collClass, item[item.constructor.idAttribute]);
        await setDoc(docRef, record.toRecord());
        docRefs.push(docRef);
        this.#collections.add(Class.name);
      }
      return docRefs;
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  async retrieve(dbName, Class, id) {
    try {
      const docRef = doc(this.#db, Class.name, id);
      const docData = await getDoc(docRef);
      if (docData.exists()) {
        console.log("Data: ", docData.data());
        return docData.data();
      } else {
        console.error(`Document from ${Class.name} with ID ${id} doesn't exist`)
      }
    } catch (error) {
      console.error(`Error retreiving data from ${Class.name} with ID ${id}`)
    }
  }

  async retrieveAll(dbName, Class) {
    try {
      const ref = doc(this.#db, Class.name);
      const doc = await getDocs(ref);
      let docs = doc.docs;
      return docs.map(item => item.data());
    } catch (error) {
      console.error(`Error handling retreiveAll from table ${Class.name}`)
    }
  }

  async update(dbName, Class, id, slots) {
    // Get data first
    try {
      const currentItem = this.retrieve(dbName, Class, id);
      if (currentItem) {
        const docRef = doc(this.#db, Class.name, id);
        return await updateDoc(docRef, slots.toRecord());
      } else {
        console.error(`Can't update item ${Class.name} with ID ${id}, item not found in storage!`);
      }
    } catch (error) {
      console.error(`Error during update of ${Class.name} with ID ${id}`);
    }
  }

  async destroy(dbName, Class, id) {
    return await deleteDoc(doc(this.#db, dbName, Class.name, id));
  }

  async clearTable(dbName, Class) {
    try {
      const allData = this.retrieveAll(dbName, Class);
      if (allData) {
        await Promise.all(allData.map(item => {
          this.destroy(dbName, Class, item.id);
        }))
      }
    } catch (error) {
      console.error(`Error clearing table ${Class.name}`);
    }
  }

  async clearDB(dbName) {
    this.#collections.forEach(async item => {
      await deleteDoc(doc(this.#db, dbName, item));
    })
    
  }
}

export default sTORAGEmANAGER_Firestore;