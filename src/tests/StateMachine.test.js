import test from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine, STATES } from '../core/StateMachine.js';

test('all required lifecycle and chapter states are represented', () => {
  assert.deepEqual(STATES, ['BOOT', 'COMPATIBILITY_CHECK', 'READY', 'XR_ENTERING', 'PLACEMENT', 'GATE', 'FRANKINCENSE', 'DHOW', 'POTTERY', 'HALWA', 'COFFEE', 'FINALE', 'RESETTING', 'ERROR']);
});
test('only valid lifecycle transitions are accepted', () => {
  const events = [], machine = new StateMachine('BOOT', event => events.push(event));
  machine.transition('COMPATIBILITY_CHECK'); machine.transition('READY'); machine.transition('XR_ENTERING'); machine.transition('PLACEMENT'); machine.transition('GATE');
  assert.equal(machine.state, 'GATE'); assert.equal(events.length, 5);
  assert.throws(() => machine.transition('COFFEE'), /Invalid state/); assert.equal(machine.state, 'GATE');
});
test('desktop path does not require an XR session', () => {
  const machine = new StateMachine('READY'); assert.equal(machine.transition('GATE'), true); assert.equal(machine.transition('GATE'), false);
});
test('rejected XR entry can return to READY', () => {
  for (const state of ['XR_ENTERING', 'PLACEMENT']) { const machine = new StateMachine(state); machine.transition('READY'); assert.equal(machine.state, 'READY'); }
});
test('every active chapter can reset or enter a recoverable error', () => {
  for (const state of ['GATE', 'FRANKINCENSE', 'DHOW', 'POTTERY', 'HALWA', 'COFFEE', 'FINALE']) {
    const machine = new StateMachine(state); machine.transition('ERROR'); machine.transition('RESETTING'); machine.transition('READY'); assert.equal(machine.state, 'READY');
  }
});
test('an unknown initial state fails loudly', () => assert.throws(() => new StateMachine('SKIP'), /Unknown initial/));
