import { initializeApp } from "../../lib/firebase-app.js";
import { getFirestore, addDoc, deleteDoc, collection, doc, setDoc, getDoc, query, where, getDocs } from "../../lib/firebase-firestore.js";
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
    fetch(this.configPath).then(response => response.json()).then(data => {
      let config = data;
      this.#username = config.username;
      this.#user_pass = config.user_pass;
      // remove add data
      delete config["username"];
      delete config["user_pass"];
      this.#firestoreConfig = config;
    }).finally(this.#init())
      .catch(err => {
        console.error("Can't read config", err);
      })
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
  #init() {
    this.#fireApp = initializeApp(this.#firestoreConfig);
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
    // this.#init();
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
          // console.log("Document ID: ", item[item.constructor.idAttribute], item);
          const collClass = collection(this.#db, Class.name);
          const docRef = doc(collClass, item[item.constructor.idAttribute]);
          await setDoc(docRef, item.toRecord());
          // let ref = await addDoc(collection(this.#db, Class.name), item);
          docRefs.push(docRef);
        });
      } else {
        // const ref = await addDoc(collection(this.#db, Class.name), record);
        const collClass = collection(this.#db, Class.name);
        const docRef = doc(collClass, item[item.constructor.idAttribute]);
        await setDoc(docRef, record.toRecord());
        docRecs.push(docRef)
      }
      return docRefs;
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  async retrieve(dbName, Class, id) {
    const docRef = doc(this.#db, Class.name, id);
    return await getDoc(docRef);
  }

  async retrieveAll(dbName, Class) {
    const ref = doc(this.#db, Class.name);
    return await getDocs(ref);
  }

  async update(dbName, Class, id, slots) {
    const docRef = doc(this.#db, Class.name, id);
    return await setDoc(docRef, slots.toRecord());
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