import {
  Group,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  SphereGeometry,
  Quaternion,
  Vector3,
} from 'three';

const UP = new Vector3(0, 1, 0);
const validPose = (p) =>
  p?.position &&
  p?.orientation &&
  [
    p.position.x,
    p.position.y,
    p.position.z,
    p.orientation.x,
    p.orientation.y,
    p.orientation.z,
    p.orientation.w,
  ].every(Number.isFinite) &&
  p.orientation.x ** 2 +
    p.orientation.y ** 2 +
    p.orientation.z ** 2 +
    p.orientation.w ** 2 >
    1e-9;

/** Ground translation/yaw only. WebXR retains ownership of tracked camera poses. */
export class Locomotion {
  constructor({ scene, camera, onStatus = () => {} }) {
    Object.assign(this, { scene, camera, onStatus });
    this.rig = new Group();
    this.rig.name = 'Tracked VR player rig';
    scene.add(this.rig);
    this.avatar = this.createAvatar();
    scene.add(this.avatar);
    this.avatar.visible = false;
    this.translation = new Vector3();
    this.rotation = new Quaternion();
    this.head = new Vector3();
    this.headRotation = new Quaternion();
    this.forward = new Vector3(0, 0, -1);
    this.right = new Vector3(1, 0, 0);
    this.scratch = new Vector3();
    this.chase = new Vector3();
    this.velocity = new Vector3();
    this.yaw = 0;
    this.active = false;
    this.enabled = true;
    this.thirdPerson = false;
    this.hasPose = false;
    this.turnLatched = false;
    this.mustCenter = false;
    this.walked = 0;
    this.parents = [];
  }
  createAvatar() {
    const avatar = new Group();
    avatar.name = 'Third-person player';
    const cloth = new MeshStandardMaterial({ color: 0x86b4a3, roughness: 0.9 });
    const trim = new MeshStandardMaterial({ color: 0xe0c398, roughness: 0.8 });
    const add = (geometry, material, x, y, z) => {
      const part = new Mesh(geometry, material);
      part.position.set(x, y, z);
      avatar.add(part);
    };
    add(new CylinderGeometry(0.15, 0.18, 0.58, 12), cloth, 0, 0.87, 0);
    add(new SphereGeometry(0.12, 12, 8), trim, 0, 1.32, 0);
    for (const side of [-1, 1]) {
      add(
        new CylinderGeometry(0.065, 0.06, 0.54, 8),
        cloth,
        side * 0.09,
        0.3,
        0,
      );
      add(
        new CylinderGeometry(0.045, 0.045, 0.48, 8),
        cloth,
        side * 0.22,
        0.88,
        0,
      );
    }
    return avatar;
  }
  start(handObjects = []) {
    this.stop();
    this.active = true;
    this.enabled = true;
    this.parents = [this.camera, ...handObjects].map((object) => ({
      object,
      parent: object.parent,
    }));
    for (const { object } of this.parents) this.rig.add(object);
    this.camera.position.set(0, 0, 0);
    this.camera.quaternion.identity();
    this.camera.scale.setScalar(1);
    this.reset();
    this.notify();
  }
  stop() {
    for (const { object, parent } of this.parents) {
      if (parent) parent.add(object);
      else this.rig.remove(object);
    }
    this.parents = [];
    this.active = false;
    this.reset();
  }
  reset() {
    this.translation.set(0, 0, 0);
    this.rotation.identity();
    this.velocity.set(0, 0, 0);
    this.chase.set(0, 0, 0);
    this.yaw = 0;
    this.thirdPerson = false;
    this.hasPose = false;
    this.turnLatched = false;
    this.mustCenter = true;
    this.walked = 0;
    this.syncRig();
    this.avatar.visible = false;
  }
  notify() {
    this.onStatus({
      kind: 'locomotion',
      thirdPerson: this.thirdPerson,
      enabled: this.active && this.enabled,
    });
  }
  setEnabled(enabled) {
    enabled = !!enabled;
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.suspend();
    this.notify();
  }
  suspend() {
    this.velocity.set(0, 0, 0);
    this.mustCenter = true;
    this.turnLatched = true;
  }
  syncRig() {
    this.rotation.setFromAxisAngle(UP, this.yaw);
    this.rig.quaternion.copy(this.rotation);
    this.rig.position
      .copy(this.chase)
      .applyQuaternion(this.rotation)
      .add(this.translation);
    this.rig.updateMatrixWorld(true);
  }
  worldPosition(position, target = new Vector3()) {
    return target
      .copy(position)
      .applyQuaternion(this.rotation)
      .add(this.rig.position);
  }
  worldQuaternion(quaternion, target = new Quaternion()) {
    return target.copy(quaternion).premultiply(this.rotation).normalize();
  }
  worldPose(pose) {
    return {
      position: this.worldPosition(pose.position),
      orientation: this.worldQuaternion(pose.orientation),
    };
  }
  heading() {
    this.forward
      .set(0, 0, -1)
      .applyQuaternion(this.headRotation)
      .applyQuaternion(this.rotation);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 0.01)
      this.forward.set(0, 0, -1).applyQuaternion(this.rotation);
    else this.forward.normalize();
    this.right.crossVectors(this.forward, UP).normalize();
  }
  setThirdPerson(enabled) {
    if (!this.active || !this.enabled || !this.hasPose) return false;
    enabled = !!enabled;
    if (enabled === this.thirdPerson) return true;
    this.thirdPerson = enabled;
    if (enabled) {
      const forward = new Vector3(0, 0, -1).applyQuaternion(this.headRotation);
      forward.y = 0;
      if (forward.lengthSq() < 0.01) forward.set(0, 0, -1);
      else forward.normalize();
      // Deliberate shoulder view: no forced lookAt, pitch, bob or continuous orbit.
      this.chase
        .copy(forward)
        .multiplyScalar(-1.15)
        .addScaledVector(new Vector3().crossVectors(forward, UP), 0.38);
    } else this.chase.set(0, 0, 0);
    this.suspend();
    this.syncRig();
    this.updateAvatar();
    this.notify();
    return true;
  }
  turnStep(direction) {
    if (
      !this.active ||
      !this.enabled ||
      !this.hasPose ||
      ![-1, 1].includes(direction)
    )
      return false;
    // Snap turns rotate around the actual eyes, including the third-person offset.
    const body = this.worldPosition(this.head, this.scratch);
    this.yaw -= (direction * Math.PI) / 6;
    this.rotation.setFromAxisAngle(UP, this.yaw);
    this.translation
      .copy(body)
      .sub(
        new Vector3()
          .copy(this.head)
          .add(this.chase)
          .applyQuaternion(this.rotation),
      );
    this.translation.y = 0;
    this.velocity.set(0, 0, 0);
    this.syncRig();
    this.updateAvatar();
    this.onStatus({ kind: 'locomotion-turn', direction });
    return true;
  }
  moveStep(direction) {
    if (!this.active || !this.enabled || !this.hasPose) return false;
    const map = {
      forward: [0, 1],
      backward: [0, -1],
      left: [-1, 0],
      right: [1, 0],
    };
    if (!map[direction]) return false;
    this.heading();
    const [side, forward] = map[direction];
    this.translation
      .addScaledVector(this.forward, forward * 0.25)
      .addScaledVector(this.right, side * 0.25);
    this.syncRig();
    this.updateAvatar();
    this.onStatus({ kind: 'locomotion-step' });
    return true;
  }
  readSticks(sources) {
    let x = 0,
      y = 0,
      turn = 0;
    for (const source of sources || []) {
      if (source.hand || source.gamepad?.connected === false) continue;
      const axes = source.gamepad?.axes;
      if (!axes || axes.length < 2) continue;
      // Quest xr-standard axes 0/1 are reserved touchpad; thumbstick is 2/3.
      const start = axes.length >= 4 ? 2 : 0;
      const sx = Number.isFinite(axes[start])
        ? Math.max(-1, Math.min(1, axes[start]))
        : 0;
      const sy = Number.isFinite(axes[start + 1])
        ? Math.max(-1, Math.min(1, axes[start + 1]))
        : 0;
      if (source.handedness === 'left') {
        x = sx;
        y = sy;
      }
      if (source.handedness === 'right') turn = sx;
    }
    return { x, y, turn };
  }
  update(pose, sources, dt, inputTracked = true) {
    if (!this.active) return;
    if (!validPose(pose) || !Number.isFinite(dt) || dt <= 0) {
      this.suspend();
      this.hasPose = false;
      this.avatar.visible = false;
      return;
    }
    this.head.copy(pose.position);
    this.headRotation.copy(pose.orientation).normalize();
    this.hasPose = true;
    if (!inputTracked) {
      this.suspend();
      this.updateAvatar();
      return;
    }
    const stick = this.readSticks(sources);
    if (
      this.mustCenter &&
      Math.hypot(stick.x, stick.y) < 0.2 &&
      Math.abs(stick.turn) < 0.2
    ) {
      this.mustCenter = false;
      this.turnLatched = false;
    }
    if (!this.enabled || this.mustCenter) {
      this.updateAvatar();
      return;
    }
    if (Math.abs(stick.turn) < 0.25) this.turnLatched = false;
    if (Math.abs(stick.turn) > 0.7 && !this.turnLatched) {
      this.turnStep(Math.sign(stick.turn));
      this.turnLatched = true;
    }
    const magnitude = Math.hypot(stick.x, stick.y),
      step = Math.min(dt, 0.05);
    if (magnitude > 0.2) {
      this.heading();
      const amount = Math.min(1, (magnitude - 0.2) / 0.8);
      const desired = this.scratch
        .copy(this.right)
        .multiplyScalar(stick.x / magnitude)
        .addScaledVector(this.forward, -stick.y / magnitude)
        .multiplyScalar(0.8 * amount);
      this.velocity.lerp(desired, Math.min(1, step * 12));
      this.translation.addScaledVector(this.velocity, step);
      this.walked += this.velocity.length() * step;
      if (this.walked >= 0.38) {
        this.walked %= 0.38;
        this.onStatus({ kind: 'locomotion-step' });
      }
      this.syncRig();
    } else this.velocity.set(0, 0, 0);
    this.updateAvatar();
  }
  updateAvatar() {
    this.avatar.visible = this.active && this.thirdPerson && this.hasPose;
    if (!this.avatar.visible) return;
    const height = Math.max(
      0.85,
      Math.min(1.8, this.head.y > 0.4 ? this.head.y : 1.5),
    );
    this.avatar.position
      .copy(this.head)
      .applyQuaternion(this.rotation)
      .add(this.translation);
    this.avatar.position.y -= height;
    this.avatar.scale.setScalar(height / 1.45);
    this.heading();
    this.avatar.rotation.y = Math.atan2(-this.forward.x, -this.forward.z);
    this.avatar.updateMatrixWorld(true);
  }
  dispose() {
    this.stop();
    this.rig.removeFromParent();
    this.avatar.removeFromParent();
    const materials = new Set();
    this.avatar.traverse((object) => {
      object.geometry?.dispose();
      if (object.material) materials.add(object.material);
    });
    for (const material of materials) material.dispose();
  }
}
export default Locomotion;
