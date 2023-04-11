import bUSINESSeVENT from "./bUSINESSeVENT.mjs"

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
  constructor({id, occTime, startTime, duration}) {
    super({id, occTime, startTime, duration});
  }
}

export default bUSINESSaCTIVITY;
