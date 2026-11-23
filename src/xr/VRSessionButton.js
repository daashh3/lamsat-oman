import { VRButton } from 'three/addons/webxr/VRButton.js';

/**
 * Use Three.js' actual VRButton while sharing the app's AR/VR lifecycle.
 *
 * r181's built-in onclick does not catch a rejected requestSession promise.
 * A capture handler owns explicit clicks so permission denial reaches the UI.
 * The renderer adapter still supports VRButton's browser-offered sessions and
 * delegates renderer.xr.setSession to XRManager exactly once.
 */
export function createVRSessionButton({
  xrManager,
  onGesture = () => {},
  onBeforeEnter = () => {},
  onError = () => {},
}) {
  let disposed = false;
  let supportKnown = false;
  let supported = false;

  const rendererAdapter = {
    xr: {
      async setSession(session) {
        try {
          if (disposed) throw new Error('VR button has been disposed.');
          onBeforeEnter();
          await xrManager.adoptSession(session, 'immersive-vr', {
            endOnFailure: false,
          });
          // Native VRButton writes its English label after the adapter resolves.
          setTimeout(refresh, 0);
        } catch (error) {
          if (!disposed) onError(error);
          // Let VRButton finish assigning its private currentSession before an
          // end event. Ending earlier triggers a null dereference in r181.
          setTimeout(() => session.end().catch(() => {}), 0);
        }
      },
    },
  };

  const element = VRButton.createButton(
    rendererAdapter,
    xrManager.sessionOptions('immersive-vr'),
  );
  element.classList.add('vr-button');
  element.dataset.xrMode = 'immersive-vr';
  element.setAttribute('aria-label', 'الدخول إلى الواقع الافتراضي');

  function refresh() {
    if (disposed) return;
    const inVR = xrManager.active && xrManager.mode === 'immersive-vr';
    const busy = xrManager.entering || (xrManager.active && !inVR);
    const disabled = !supportKnown || !supported || busy;
    element.disabled = disabled;
    element.setAttribute('aria-disabled', String(disabled));
    element.setAttribute('aria-pressed', String(inVR));
    element.textContent = inVR
      ? 'الخروج من VR'
      : busy
        ? 'جلسة غامرة قيد التشغيل…'
        : !supportKnown
          ? 'جارٍ فحص VR…'
          : supported
            ? 'الدخول إلى VR'
            : 'VR غير مدعوم';
    element.title = supported
      ? 'واقع افتراضي كامل — حرّك رأسك للنظر حولك'
      : xrManager.vrSupport.reason;
    // The app's right-hand menu owns positioning, instead of VRButton's default
    // bottom-center overlay that would cover the exhibit or chapter controls.
    Object.assign(element.style, {
      position: 'static',
      left: 'auto',
      bottom: 'auto',
      width: '100%',
      display: '',
      font: 'inherit',
      opacity: disabled ? '.55' : '1',
      cursor: disabled ? 'default' : 'pointer',
    });
    if (element.tagName === 'A') {
      element.removeAttribute('href');
      element.setAttribute('role', 'button');
      element.tabIndex = disabled ? -1 : 0;
    }
  }

  async function click(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (disposed || !supported || xrManager.entering) return;
    if (xrManager.active && xrManager.mode !== 'immersive-vr') return;
    // Invoke synchronously, before any await, to preserve browser audio activation.
    onGesture();
    try {
      if (xrManager.active) await xrManager.exit();
      else {
        if (onBeforeEnter() === false) return;
        await xrManager.enterVR();
      }
    } catch (error) {
      onError(error);
    } finally {
      refresh();
    }
  }

  element.addEventListener('click', click, true);
  xrManager.addEventListener('sessionchange', refresh);
  refresh();
  const ready = xrManager.checkVRSupport().then((result) => {
    supportKnown = true;
    supported = result.supported;
    refresh();
    return result;
  });

  return {
    element,
    ready,
    refresh,
    dispose() {
      disposed = true;
      element.removeEventListener('click', click, true);
      xrManager.removeEventListener('sessionchange', refresh);
      element.remove();
    },
  };
}
