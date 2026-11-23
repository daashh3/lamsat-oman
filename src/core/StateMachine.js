export const STATES = Object.freeze(['BOOT', 'COMPATIBILITY_CHECK', 'READY', 'XR_ENTERING', 'PLACEMENT', 'GATE', 'FRANKINCENSE', 'DHOW', 'POTTERY', 'HALWA', 'COFFEE', 'FINALE', 'RESETTING', 'ERROR']);

const TRANSITIONS = {
  BOOT: ['COMPATIBILITY_CHECK', 'ERROR'], COMPATIBILITY_CHECK: ['READY', 'ERROR'],
  READY: ['XR_ENTERING', 'GATE', 'RESETTING', 'ERROR'], XR_ENTERING: ['PLACEMENT', 'READY', 'RESETTING', 'ERROR'],
  PLACEMENT: ['GATE', 'READY', 'RESETTING', 'ERROR'], GATE: ['FRANKINCENSE', 'RESETTING', 'ERROR'],
  FRANKINCENSE: ['DHOW', 'RESETTING', 'ERROR'], DHOW: ['POTTERY', 'RESETTING', 'ERROR'],
  POTTERY: ['HALWA', 'RESETTING', 'ERROR'], HALWA: ['COFFEE', 'RESETTING', 'ERROR'],
  COFFEE: ['FINALE', 'RESETTING', 'ERROR'], FINALE: ['RESETTING', 'ERROR'],
  RESETTING: ['READY', 'ERROR'], ERROR: ['RESETTING'],
};

/** Deliberately has no unrestricted setState or production chapter-skip API. */
export class StateMachine {
  constructor(initialState = 'BOOT', onTransition = () => {}) {
    if (!STATES.includes(initialState)) throw new Error(`Unknown initial state: ${initialState}`);
    this.state = initialState; this.onTransition = onTransition;
  }
  canTransition(next) { return TRANSITIONS[this.state]?.includes(next) ?? false; }
  transition(next) {
    if (next === this.state) return false;
    if (!this.canTransition(next)) throw new Error(`Invalid state transition: ${this.state} → ${next}`);
    const previous = this.state; this.state = next; this.onTransition({ previous, state: next }); return true;
  }
}
