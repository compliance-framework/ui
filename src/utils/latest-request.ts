/**
 * Guards against a stale async result overwriting a newer one.
 *
 * The trap this exists for: a fetch that is fired-and-forgotten from a watcher, or
 * re-issued when the user retargets a long-lived dialog, writes its result on completion
 * with no check that it is still the request anyone is waiting for. Two in flight, and
 * whichever *lands* last wins — regardless of which was *issued* last. The failure is
 * silent: the older answer looks like a real one, and a rejected earlier request landing
 * after a successful newer one flips an error flag over data that loaded fine.
 *
 * Usage — take a token before the first await, and check it before EVERY write, in both
 * the success and the failure path:
 *
 *   const gate = latestRequest();
 *   async function load() {
 *     const token = gate.begin();
 *     try {
 *       const data = await fetch();
 *       if (gate.isStale(token)) return;   // a newer load already answered
 *       state.value = data;
 *     } catch {
 *       if (gate.isStale(token)) return;   // don't fail a load nobody is waiting on
 *       error.value = true;
 *     }
 *   }
 *
 * Checking only the success path is the common half-fix: it still lets a superseded
 * rejection report failure for a request whose replacement succeeded.
 */
export function latestRequest() {
  let current = 0;
  return {
    /** Claim the newest token; every earlier one is now stale. */
    begin(): number {
      return ++current;
    },
    /** True when a newer request has begun since this token was taken. */
    isStale(token: number): boolean {
      return token !== current;
    },
  };
}
