import bUSINESSoBJECT from "./bUSINESSoBJECT";

/**
 * An event may be instantaneous or it may have a non-zero duration.
 */
class bUSINESSeVENT {
  constructor({id, occTime, startTime, duration, node}) {
    if (id) this.id = id;
    else this.id = this.constructor.idCounter++;
    if (typeof occTime === "number") {
      this.occTime = occTime;
    } else if (typeof startTime === "number") {  // an activity
      this.startTime = startTime;
      if (duration) {
        this.duration = duration;
        this.occTime = startTime + duration;
      }
    }
  }
  // overwrite/improve the standard toString method
  toString() {
    const Class = this.constructor,
          eventTypeName = Class.name,
          decPl = 2;
    var slotListStr="", i=0, evtStr="", valStr="";
    for (const prop of Object.keys( this)) {
      const propDecl = Class.properties[prop],
          propLabel = propDecl?.shortLabel || propDecl?.label || prop,
          val = this[prop];
      if (propLabel && val !== undefined) {
        if (val instanceof oBJECT) valStr = String( val.id);
        else valStr = JSON.stringify( val);
        slotListStr += (i>0 ? ", " : "") + propLabel +": "+ valStr;
        i = i+1;
      }
    }
    if (slotListStr) evtStr = `${eventTypeName}{ ${slotListStr}}`;
    else evtStr = eventTypeName;
    evtStr = `${evtStr}@${math.round(this.occTime,decPl)}`;
    return evtStr;
  }
}

export default bUSINESSeVENT;
