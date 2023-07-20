import bUSINESSeVENT from "./bUSINESSeVENT.mjs"
import {dt, lISTtYPE, rECORDtYPE} from "./datatypes.mjs";
import eNUMERATION from "./eNUMERATION.mjs";

/**
 *  Activities are composite events that have some duration and typically depend on
 *  resources. They are composed of an activity start and an activity end event.
 *
 *  Activities often depend on resources. The actor(s) that (jointly) perform(s) an
 *  activity, called performer(s), are (a) special resource(s). Since a
 *  resource-constrained activity can only be started when all required resources are
 *  available, it may first have to be enqueued as a task (= planned activity).
 *
 *  For any resource of an activity, its utilization by that activity during a certain
 *  time period can be recorded and can be included in certain app statistics.
 */
class bUSINESSaCTIVITY extends bUSINESSeVENT {
  constructor({id, occTime, startTime = Date.now(), duration}={}) {
    super({id, occTime, startTime, duration});
  }
  /***************************************************
   * To be invoked for each activity class definition
   ***************************************************/
  static setup() {
    const Class = this,
          propDefs = Class.properties || {};  // property definitions
    super.setup( Class);
    /*
    // initialize the Class.instances map
    if (!Class.isAbstract) Class.instances = {};
    const admissibleRanges = [...dt.supportedDatatypes, ...Object.keys( dt.classes),
      ...Object.values( eNUMERATION)];
    // pre-process all property definitions
    Class.referenceProperties = Object.keys( propDefs).filter( p =>
        propDefs[p].range in dt.classes && !("inverseOf" in propDefs[p]));
    Class.inverseReferenceProperties = Object.keys( propDefs).filter( p =>
        propDefs[p].range in dt.classes && "inverseOf" in propDefs[p]);
    for (const p of Object.keys( propDefs)) {
      const propDef = propDefs[p],
            range = propDef.range;
      // check if property definition includes a valid range declaration
      if (!range) throw new Error(`No range defined for property ${p} of class ${Class.name}`);
      else if (!(admissibleRanges.includes( range) ||
               range instanceof lISTtYPE || range instanceof rECORDtYPE))
        throw new Error(`Non-admissible range defined for property ${p} of class ${Class.name}`);
      // establish standard ID attribute
      if (propDef.isIdAttribute) Class.idAttribute = p;
      // construct implicit setters and getters
      Object.defineProperty( Class.prototype, p, {
        get() { return this["_"+p]; },
        set( val) { this["_"+p] = val; },
        enumerable: true
      });
    }
    */
    if (!Class.idAttribute) {
      Class.properties["id"] = {range:"AutoIdNumber"};
      Class.idAttribute = "id";
    }
  }
}
bUSINESSaCTIVITY.classes = {};

export default bUSINESSaCTIVITY;
