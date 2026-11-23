import { BaseChapter } from './BaseChapter.js';
import { distance3, isVector3 } from '../utils/MathUtils.js';
import {
  createEngravingPatterns,
  ENGRAVING_TOLERANCE,
} from './EngravingPatterns.js';

export class GateChapter extends BaseChapter {
  constructor(callbacks) {
    super('GATE', callbacks);
    this.shapes = createEngravingPatterns();
    this.shapeProgress = Object.fromEntries(
      this.shapes.map((shape) => [shape.id, 0]),
    );
    this.selectedShape = null;
    this.finishedShapes = new Set();
    this.stage = 'SELECT_SHAPE';
    this.lastPoint = null;
    this.instruction =
      'اختر أحد القوالب الثلاثة، ثم اضغط وتتبع المسار المضيء مباشرة';
  }
  get path() {
    return (
      this.shapes.find((shape) => shape.id === this.selectedShape)?.path || []
    );
  }
  get index() {
    return this.selectedShape ? this.shapeProgress[this.selectedShape] : 0;
  }
  input(action, { id, point } = {}) {
    if (this.completed) return false;
    if (action === 'interrupt') {
      this.interrupt();
      return false;
    }
    if (action === 'select-shape') {
      const shape = this.shapes.find((shape) => shape.id === id);
      if (!shape || this.finishedShapes.has(id) || this.selectedShape === id)
        return false;
      this.selectedShape = id;
      this.stage = 'ENGRAVE';
      this.interrupt();
      this.instruction = `قالب ${shape.label}: اضغط واسحب على المسار المضيء بإصبعك أو المؤشر`;
      this.event('shape-selected', { id });
      return true;
    }
    if (action !== 'trace' || !this.selectedShape || !isVector3(point))
      return false;
    const path = this.path,
      index = this.index;
    if (!path[index] || distance3(point, path[index]) > ENGRAVING_TOLERANCE)
      return false;
    if (this.lastPoint && distance3(point, this.lastPoint) < 0.008)
      return false;
    this.lastPoint = [...point];
    const shapeId = this.selectedShape;
    this.shapeProgress[shapeId]++;
    this.progress =
      this.shapes.reduce(
        (sum, shape) => sum + this.shapeProgress[shape.id] / shape.path.length,
        0,
      ) / this.shapes.length;
    this.event('carve', {
      id: shapeId,
      index: this.shapeProgress[shapeId],
      point: [...point],
      progress: this.progress,
    });
    if (this.shapeProgress[shapeId] === path.length) {
      this.finishedShapes.add(shapeId);
      this.selectedShape = null;
      this.interrupt();
      this.event('shape-engraved', {
        id: shapeId,
        count: this.finishedShapes.size,
      });
      if (this.finishedShapes.size === this.shapes.length) {
        this.instruction = 'اكتملت النقوش الثلاثة، وتنفتح أبواب الحكاية';
        this.finish();
      } else {
        this.stage = 'SELECT_SHAPE';
        this.instruction = 'أحسنت! اختر قالباً آخر لإكمال نقوش الباب';
      }
    }
    return true;
  }
  interrupt() {
    this.lastPoint = null;
  }
  snapshot() {
    return {
      ...super.snapshot(),
      shapes: this.shapes,
      selectedShape: this.selectedShape,
      shapeProgress: { ...this.shapeProgress },
      finishedShapes: [...this.finishedShapes],
      path: this.path,
      traceIndex: this.index,
      nextPoint: this.path[this.index] ?? null,
    };
  }
}
