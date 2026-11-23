/** Meta's packaged WebXR launch grants activation from the app-library icon.
 * Normal browser visits retain the explicit VR button and never auto-enter VR.
 * https://developers.meta.com/vr/documentation/web/pwa-webxr/
 */
export async function launchQuestApp({
  xrManager,
  ready,
  beforeEnter = () => true,
  unlockAudio = () => {},
  onError = () => {},
  environment = globalThis,
}) {
  if (
    typeof environment.getDigitalGoodsService !== 'function' ||
    !environment.navigator?.xr ||
    new URLSearchParams(environment.location?.search || '').get('launch') !==
      'quest'
  )
    return false;
  try {
    const support = await ready;
    if (
      !support?.supported ||
      xrManager.active ||
      xrManager.entering ||
      beforeEnter() === false
    )
      return false;
    unlockAudio();
    await xrManager.enterVR();
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}
