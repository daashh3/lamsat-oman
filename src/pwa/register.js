/** Production only. A new version waits until open app windows/VR sessions close. */
export async function registerOfflineApp() {
  if (!import.meta.env.PROD || !globalThis.isSecureContext || !navigator.serviceWorker)
    return null;
  const scope = new URL(import.meta.env.BASE_URL, document.baseURI);
  try {
    return await navigator.serviceWorker.register(new URL('sw.js', scope), {
      scope: scope.pathname,
      updateViaCache: 'none',
    });
  } catch (error) {
    // Network/storage restrictions must not prevent the online WebXR experience.
    console.warn('Offline app registration unavailable:', error.message);
    return null;
  }
}
