import {dt} from "./datatypes.mjs";
import vIEW from "./ui/vIEW.mjs";
import bUSINESSaCTIVITY from "./bUSINESSaCTIVITY.mjs";

class bUSINESSaPP {
  constructor({title, storageManager, validateOnInput=false}) {
    this.title = title;
    this.storageManager = storageManager;
    this.validateOnInput = validateOnInput;
    this.bidirectionalAssociations = {};
    this.crudViews = {};
    this.activityViews = {};
  }
  async setup() {
    // set up all business object classes and their CRUD views
    for (const Class of Object.values( dt.classes)) {
      Class.setup();
      Class.lastRetrievalTime = 0;
      this.crudViews[Class.name] = {};
      for (const crudCode of ["R","C","U","D"]) {
        this.crudViews[Class.name][crudCode] = new vIEW({modelClass: Class, viewType: crudCode});
      }
    }
    for (const Class of Object.values( dt.classes)) {
      // construct bidirectionalAssociations from property definitions
      if (Class.inverseReferenceProperties.length > 0) {
        for (const invRefProp of Class.inverseReferenceProperties) {
          const invRefPropDef = Class.properties[invRefProp],
                SourceClassName = invRefPropDef.range;
          this.bidirectionalAssociations[SourceClassName] ??= {};
          this.bidirectionalAssociations[SourceClassName][invRefPropDef.inverseOf] =
              {targetClassName: Class.name, inverseReferenceProperty: invRefProp};
        }
      }
    }
    // set up all business activity classes and their views
    for (const Class of Object.values( bUSINESSaCTIVITY.classes)) {
      Class.setup();
      this.activityViews[Class.name] = new vIEW({modelClass: Class});
    }
    const busObjClasses = Object.values( dt.classes);
    await this.storageManager.openDbOrCreateEmptyDb( busObjClasses);
    if (!(await this.storageManager.hasDatabaseContents())) {
      console.log("Database is empty.");
      await this.createTestData();
    }
  }
  async createTestData() {
    try {
      const busObjClasses = Object.values( dt.classes);
      for (const Class of busObjClasses) {
        if ("testData" in Class) await this.storageManager.add( Class, Class.testData);
      }
    } catch (e) {
      console.error(`${e.constructor.name}: ${e.message}`);
    }
  }
  async clearDatabase() {
    if (confirm( "Do you really want to delete the entire database?")) {
      try {
        await this.storageManager.deleteDatabase();
        // rebuild empty database
        const busObjClasses = Object.values( dt.classes);
        await this.storageManager.openDbOrCreateEmptyDb( busObjClasses);
      } catch (e) {
        console.error(`${e.constructor.name}: ${e.message}`);
      }
    }
  }
}

export default bUSINESSaPP;