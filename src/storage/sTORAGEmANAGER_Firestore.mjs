import sTORAGEmANAGER from "./sTORAGEmANAGER.mjs";
import { initializeApp } from "../../node_modules/firebase/firebase-app.js";
import { getFirestore } from "firebase/firestore/lite";
import { getAuth, signInWithPopup, GithubAuthProvider } from "../../node_modules/firebase/firebase-auth.js";

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
  #creadentials = null;

  /**
   * 
   * @param {*} dbName 
   * @param {*} createLog 
   * @param {*} validateBeforeSave 
   */
  constructor(dbName, createLog, validateBeforeSave) {
    super({ adapterName: "Firestore", dbName: dbName, createLog: createLog, validateBeforeSave: validateBeforeSave });

    this.dbName = dbName;
    this.createLog = createLog;
    this.validateBeforeSave = validateBeforeSave;
  }

  /**
   * Initialize Firebase application with needed parameters
   * 
   * @param {string} apiKey 
   */
  #init(apiKey) {
    const firestoreConfig = {
      apiKey: "AIzaSyAYW687lC2s47H-VwivJTKeyZLj-l9hPQY",
      authDomain: "oemjs-e0c77.firebaseapp.com",
      projectId: "oemjs-e0c77",
      storageBucket: "oemjs-e0c77.appspot.com",
      messagingSenderId: "1075763611585",
      appId: "1:1075763611585:web:78d6b1bd63dfe463451140"
    };

    this.#fireApp = initializeApp(firestoreConfig);
    const db = getFirestore(this.#fireApp);
  }

  /**
   * Private method, authenticate with Github account to acccess
   * Firestore database.
   * 
   */
  #authenticate() {
    const provider = new GithubAuthProvider()
    // TODO Remove 557f2b9fda77854fda108d1ae92fa3a25c13014e
    let credential;
    signInWithPopup(getAuth, provider).then((result) => {
      // This gives you a GitHub Access Token. You can use it to access the GitHub API.
      console.log("Start Github Provider");
      credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      // The signed-in user info.
      const user = result.user;
      // TODO notice user is signed in
      console.log("User is signed in: ", user);

    }).catch((error) => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      // const email = error.customData.email;
      // The AuthCredential type that was used.
      const credential = GithubAuthProvider.credentialFromError(error);
      // ...
      console.log("Github Provider error: ", error);
    });
  }

  /**
   * Setting up all needed information for accessing the firestore database
   */
  setup() {
    this.#init("randomKey");
    // this.#authenticate();
  }

}

export default sTORAGEmANAGER_Firestore;