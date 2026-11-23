/**
 * No interoperable mouth-open WebXR API is assumed on Quest 3/3S Browser.
 * Cooking uses tracked hand fanning. This adapter states capability honestly and
 * intentionally never requests camera, microphone or an invented XR feature.
 */
export class FaceTrackingAdapter {
  get supported() { return false; }
  get mode() { return 'hand-fanning'; }
  get reason() { return 'لا تتوفر واجهة فم موثّقة لهذا المتصفح؛ حرّك يدك لتأجيج النار.'; }
  status() { return { supported: this.supported, mode: this.mode, reason: this.reason }; }
}

export default FaceTrackingAdapter;
