import { Quaternion, Vector3, MathUtils } from 'three';

const smoothstep = (value) => value * value * (3 - 2 * value);
const PHASES = ['lifting', 'tilting', 'pouring', 'untilting', 'returning'];

/**
 * Moves only geometry around the pot's bottom pivot. The chapter still checks
 * the transformed spout, pouring angle and fill time before awarding progress.
 */
export class DallahPourAnimator {
  constructor(
    pivot,
    {
      spout,
      cupPosition = new Vector3(0.25, 0.1, 0.08),
      tiltAngle = Math.PI / 3,
      spoutClearance = 0.16,
      durations = {},
    } = {},
  ) {
    if (!pivot?.isObject3D || !spout?.isObject3D)
      throw new TypeError('Dallah pivot and spout are required.');
    this.pivot = pivot;
    this.spout = spout;
    this.cupPosition = cupPosition.clone();
    this.tiltAngle = MathUtils.clamp(tiltAngle, 0.6, 1.45);
    this.spoutClearance = MathUtils.clamp(spoutClearance, 0.08, 0.23);
    this.durations = {
      lifting: 0.7,
      tilting: 0.8,
      pouring: 3.2,
      untilting: 0.8,
      returning: 0.7,
      ...durations,
    };
    for (const phase of PHASES)
      if (
        !Number.isFinite(this.durations[phase]) ||
        this.durations[phase] <= 0
      ) {
        throw new RangeError(`Invalid ${phase} duration.`);
      }
    this.homePosition = pivot.position.clone();
    this.homeQuaternion = pivot.quaternion.clone();
    this.startPosition = this.homePosition.clone();
    this.startQuaternion = this.homeQuaternion.clone();
    this.liftedPosition = new Vector3();
    this.targetPosition = new Vector3();
    this.spoutOffset = new Vector3();
    this.tiltedQuaternion = new Quaternion();
    this.localSpout = new Vector3();
    this.returnPosition = new Vector3();
    this.returnQuaternion = new Quaternion();
    this.phase = 'idle';
    this.elapsed = 0;
    this.phaseIndex = -1;
  }
  get active() {
    return this.phase !== 'idle';
  }
  get isPouring() {
    return this.phase === 'pouring';
  }

  /** Cup mouth coordinates must be in the pivot parent's local space. */
  setCupPosition(position) {
    if (!position?.isVector3 || !position.toArray().every(Number.isFinite))
      return false;
    this.cupPosition.copy(position);
    this.targetPosition.copy(position);
    this.targetPosition.y += this.spoutClearance;
    this.targetPosition.sub(this.spoutOffset);
    return true;
  }

  start({ cupPosition = this.cupPosition, manualStop = false } = {}) {
    if (this.active) return false;
    if (
      !cupPosition?.isVector3 ||
      !cupPosition.toArray().every(Number.isFinite)
    )
      return false;
    this.cupPosition.copy(cupPosition);
    this.startPosition.copy(this.pivot.position);
    this.startQuaternion.copy(this.pivot.quaternion);
    this.pivot.updateWorldMatrix(true, true);
    this.localSpout.copy(
      this.pivot.worldToLocal(this.spout.getWorldPosition(new Vector3())),
    );
    this.tiltedQuaternion
      .copy(this.homeQuaternion)
      .multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          -this.tiltAngle,
        ),
      );
    this.spoutOffset
      .copy(this.localSpout)
      .multiply(this.pivot.scale)
      .applyQuaternion(this.tiltedQuaternion);
    this.setCupPosition(cupPosition);
    this.liftedPosition.copy(this.targetPosition);
    this.phaseIndex = 0;
    this.manualStop = manualStop;
    this.returnPosition.copy(this.liftedPosition);
    this.returnQuaternion.copy(this.tiltedQuaternion);
    this.phase = PHASES[0];
    this.elapsed = 0;
    return true;
  }

  /** The challenge holds its tilt until the player stops; return without a snap. */
  stop() {
    if (!this.active || ['untilting', 'returning'].includes(this.phase))
      return false;
    this.returnPosition.copy(this.pivot.position);
    this.returnQuaternion.copy(this.pivot.quaternion);
    this.phaseIndex = 3;
    this.phase = 'untilting';
    this.elapsed = 0;
    return true;
  }

  applyPose(amount) {
    const t = smoothstep(MathUtils.clamp(amount, 0, 1));
    if (this.phase === 'lifting') {
      this.pivot.position.lerpVectors(
        this.startPosition,
        this.liftedPosition,
        t,
      );
      this.pivot.quaternion.slerpQuaternions(
        this.startQuaternion,
        this.homeQuaternion,
        t,
      );
    } else if (this.phase === 'tilting') {
      this.pivot.position.copy(this.liftedPosition);
      this.pivot.quaternion.slerpQuaternions(
        this.homeQuaternion,
        this.tiltedQuaternion,
        t,
      );
    } else if (this.phase === 'pouring') {
      this.pivot.position.copy(this.liftedPosition);
      this.pivot.quaternion.copy(this.tiltedQuaternion);
    } else if (this.phase === 'untilting') {
      this.pivot.position.copy(this.returnPosition);
      this.pivot.quaternion.slerpQuaternions(
        this.returnQuaternion,
        this.homeQuaternion,
        t,
      );
    } else if (this.phase === 'returning') {
      this.pivot.position.lerpVectors(
        this.returnPosition,
        this.homePosition,
        t,
      );
      this.pivot.quaternion.copy(this.homeQuaternion);
    }
    this.pivot.updateMatrixWorld(true);
  }

  update(dt) {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    // A moving held cup changes the destination, never the pot's pivot. Smooth
    // pursuit avoids teleporting a heavy vessel when controller poses jitter.
    if (['lifting', 'tilting', 'pouring'].includes(this.phase))
      this.liftedPosition.lerp(this.targetPosition, 1 - Math.exp(-12 * dt));
    // Consume boundaries exactly; 30 Hz and 72 Hz follow the same timeline.
    while (dt > 0 && this.active) {
      if (this.phase === 'pouring' && this.manualStop) {
        this.applyPose(1);
        return;
      }
      const duration = this.durations[this.phase],
        step = Math.min(dt, duration - this.elapsed);
      this.elapsed += step;
      dt -= step;
      this.applyPose(this.elapsed / duration);
      if (this.elapsed + 1e-9 >= duration) {
        if (this.phase === 'pouring') {
          this.returnPosition.copy(this.pivot.position);
          this.returnQuaternion.copy(this.pivot.quaternion);
        }
        this.phaseIndex++;
        this.elapsed = 0;
        this.phase = PHASES[this.phaseIndex] || 'idle';
        if (!this.active) {
          // Restore the exact stored transform; do not retain interpolation drift.
          this.pivot.position.copy(this.homePosition);
          this.pivot.quaternion.copy(this.homeQuaternion);
          this.pivot.updateMatrixWorld(true);
        }
      }
    }
  }

  cancel({ restore = true } = {}) {
    this.phase = 'idle';
    this.phaseIndex = -1;
    this.elapsed = 0;
    if (restore) {
      this.pivot.position.copy(this.homePosition);
      this.pivot.quaternion.copy(this.homeQuaternion);
      this.pivot.updateMatrixWorld(true);
    }
  }
}
export default DallahPourAnimator;
