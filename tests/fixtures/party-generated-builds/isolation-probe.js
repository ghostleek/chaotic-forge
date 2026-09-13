// Authored, finite adversarial fixture. This is not model-generated gameplay.
// Executed only by tests/integration/party-generation.isolation.mjs.
void (async () => {
  const violations = new Set();
  let finishViolationCheck;
  const observedRestrictions = new Promise((resolve) => {
    finishViolationCheck = resolve;
  });
  document.addEventListener('securitypolicyviolation', (event) => {
    violations.add(event.effectiveDirective);
    if (violations.has('connect-src') && violations.has('frame-src')) {
      finishViolationCheck();
    }
  });

  const throwsSecurityError = (operation) => {
    try {
      operation();
      return false;
    } catch (error) {
      return error.name === 'SecurityError';
    }
  };
  const results = {
    parentDomDenied: throwsSecurityError(
      () => parent.document.body.textContent,
    ),
    parentCookieDenied: throwsSecurityError(() => parent.document.cookie),
    parentStorageDenied: throwsSecurityError(() =>
      parent.localStorage.getItem('sentinel'),
    ),
    ownCookieDenied: throwsSecurityError(() => document.cookie),
    ownStorageDenied: throwsSecurityError(() =>
      localStorage.getItem('sentinel'),
    ),
    topNavigationDenied: throwsSecurityError(() => {
      top.location.href = 'https://forge-escape.invalid/top';
    }),
    popupDenied:
      window.open('https://forge-escape.invalid/popup', '_blank') === null,
    fetchDenied: false,
    geolocationDenied: false,
  };

  try {
    await fetch('https://forge-escape.invalid/fetch');
  } catch (error) {
    results.fetchDenied = error.name === 'TypeError';
  }
  const nested = document.createElement('iframe');
  nested.src = 'https://forge-escape.invalid/nested-frame';
  document.body.append(nested);
  const permission = await navigator.permissions.query({ name: 'geolocation' });
  results.geolocationDenied = permission.state === 'denied';

  let timeout;
  await Promise.race([
    observedRestrictions,
    new Promise((resolve) => {
      timeout = setTimeout(resolve, 2_000);
    }),
  ]);
  clearTimeout(timeout);
  parent.postMessage(
    {
      type: 'pc09a-isolation-probe/v1',
      results,
      violations: [...violations].sort((left, right) =>
        left.localeCompare(right),
      ),
    },
    'https://forge-parent.invalid',
  );
})();
