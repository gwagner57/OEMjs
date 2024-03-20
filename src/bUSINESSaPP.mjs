import {dt} from "./datatypes.mjs";
import vIEW from "./ui/vIEW.mjs";
import {cOUNTER} from "./bUSINESSoBJECT.mjs";
import bUSINESSaCTIVITY from "./bUSINESSaCTIVITY.mjs";

class bUSINESSaPP {
  constructor({title, storageManager, validateOnInput=false}) {
    this.title = title;
    this.storageManager = storageManager;
    this.validateOnInput = validateOnInput;
    this.bidirectionalAssociations = {};
    this.compositions = {};
    this.crudViews = {};
    this.activityViews = {};
    this.testData = {};
  }
  async setup() {
    // set up all business object classes and their CRUD views
    for (const Class of Object.values( dt.classes)) {
      if (Class.isAbstract || Class.isComplexDatatype) continue;
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
          if (invRefPropDef.isComponent) {
            this.compositions[SourceClassName] ??= {};
            this.compositions[SourceClassName][invRefPropDef.inverseOf] =
                {targetClassName: Class.name, componentProperty: invRefProp};
          } else {
            this.bidirectionalAssociations[SourceClassName] ??= {};
            this.bidirectionalAssociations[SourceClassName][invRefPropDef.inverseOf] =
                {targetClassName: Class.name, inverseReferenceProperty: invRefProp};
          }
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
      for (const Class of busObjClasses) {
        const propDefs = Class.properties;
        if (propDefs[Class.idAttribute].range === "AutoIdNumber") {
          this.storageManager.add( cOUNTER, {className: Class.name, autoIdCounter: Class.autoIdNoStartValue||1001});
        }
      }
      await this.createTestData();
    }
  }
  async createTestData() {
    try {
      for (const classEntry of this.testData) {
        const className = Object.keys( classEntry)[0],  // classEntry is a single-entry map
              records = classEntry[className],
              Class = dt.classes[className];
        await this.storageManager.add( Class, records);
        Class.lastRetrievalTime = 0;
      }
    } catch (e) {
      console.error(`${e.constructor.name}: ${e.message}`);
    }
  }
  async clearDatabase() {
    if (confirm( "Do you really want to delete the database table contents?")) {
      try {
        const busObjClasses = Object.values( dt.classes);
        await this.storageManager.deleteDatabaseContents( busObjClasses);
        // rebuild empty database
        await this.storageManager.openDbOrCreateEmptyDb( busObjClasses);
      } catch (e) {
        console.error(`${e.constructor.name}: ${e.message}`);
      }
    }
  }
}

export default bUSINESSaPP;