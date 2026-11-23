import test from 'node:test';
import assert from 'node:assert/strict';
import { PinchDetector, CircularGesture, FanGesture, GestureDetector } from '../xr/GestureDetector.js';
import { insideCylinder, insideBox, pointSegmentDistance } from '../utils/InteractionUtils.js';

test('pinch hysteresis distinguishes start, hold, release and tracking-loss cancel', () => {
  const pinch = new PinchDetector(), a = [0, 0, 0];
  assert.equal(pinch.update(a, [.02, 0, 0]).phase, 'start');
  assert.equal(pinch.update(a, [.03, 0, 0]).phase, 'hold');
  assert.equal(pinch.update(a, [.041, 0, 0]).phase, 'release');
  assert.equal(pinch.update(a, [.03, 0, 0]).phase, 'none');
  pinch.update(a, [.02, 0, 0]); assert.equal(pinch.update(null, null).phase, 'cancel'); assert.equal(pinch.active, false);
});
test('circle accumulation crosses the ±π boundary without jumping', () => {
  const gesture = new CircularGesture();
  for (let n = 0; n < 150; n++) gesture.update(Math.atan2(Math.sin(n * .06), Math.cos(n * .06)), .12, .016);
  assert.ok(gesture.travel > 7); assert.ok(gesture.travel < 9);
});
test('stirring rejects teleports, off-rim movement, nonfinite data, and delayed samples', () => {
  const gesture = new CircularGesture(); gesture.update(0, .1, .016);
  assert.equal(gesture.update(Math.PI, .1, .016), 0);
  for (const sample of [[1, .001, .016], [1, .8, .016], [NaN, .1, .016], [1, .1, 2]]) assert.equal(gesture.update(...sample), 0);
  assert.equal(gesture.travel, 0);
});
test('alternating small wiggles do not count as a circular stir', () => {
  const gesture = new CircularGesture(); for (let n = 0; n < 500; n++) gesture.update(n % 2 ? .1 : 0, .12, .02); assert.equal(gesture.travel, 0);
});
test('tracking interruption preserves completed circular travel without connecting a gap', () => {
  const gesture = new CircularGesture(); for (let n = 0; n < 100; n++) gesture.update(n * .08, .12, .02);
  const before = gesture.travel; gesture.interrupt(); assert.equal(gesture.update(-2, .12, .02), 0); assert.equal(gesture.travel, before);
});
test('fanning requires alternating broad timed strokes rather than jitter', () => {
  const gesture = new FanGesture();
  for (let n = 0; n < 20; n++) gesture.update([.002 * (n % 2), .1, .2], n * .02);
  assert.equal(gesture.strokes, 0); gesture.reset(); gesture.update([-.1, .1, .2], 0);
  for (let n = 1; n <= 6; n++) assert.equal(gesture.update([n % 2 ? .1 : -.1, .1, .2], n * .2), true);
  assert.equal(gesture.strokes, 6);
});
test('fanning rejects duplicate timestamps and discontinuous input', () => {
  const gesture = new FanGesture(); gesture.update([-.1, .1, .2], 0);
  assert.equal(gesture.update([.1, .1, .2], 0), false); assert.equal(gesture.update([-.1, .1, .2], 4), false); assert.equal(gesture.strokes, 0);
});
test('two hands produce bounded height and radius controls; one missing hand does not', () => {
  const shape = GestureDetector.handShape([-.1, .4, 0], [.1, .4, 0]); assert.ok(shape.height > .18); assert.equal(shape.width, 1);
  assert.equal(GestureDetector.handShape(null, [.1, .4, 0]), null);
});
test('drop zones reject object-center false positives above, beside, and below the bowl', () => {
  const zone = { center: [0, .47, 0], radius: .1, above: .12, below: .03 };
  assert.equal(insideCylinder([0, .5, .04], zone), true);
  for (const point of [[.11, .5, 0], [0, .2, 0], [0, .7, 0], [NaN, .5, 0]]) assert.equal(insideCylinder(point, zone), false);
  assert.equal(insideBox([0, 0, 0], { center: [0, 0, 0], halfSize: [.1, .1, .1] }), true);
  assert.equal(pointSegmentDistance([.5, .2, 0], [0, 0, 0], [1, 0, 0]), .2);
});
