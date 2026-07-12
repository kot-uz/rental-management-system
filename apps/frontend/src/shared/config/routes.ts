export const APP_BASE = '/app';

/** Builds an absolute in-app path: appPath('/leases/1') → '/app/leases/1' */
export const appPath = (path = '') => `${APP_BASE}${path}`;
