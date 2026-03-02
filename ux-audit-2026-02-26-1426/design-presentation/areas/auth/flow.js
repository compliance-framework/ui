export const FLOW_ORDER = [
  'UN1KO',
  'z8zIx',
  'VpI0u',
  'e9YMd',
  'p4AJp',
  'BwtLv',
  'uhcyX',
  'q9Iwa',
  '30Y5h',
  'Ykivc',
  'bVYh5',
  'WESUb',
];

export const FLOW_NOTES = {
  UN1KO: {
    section: 'Auth / Login',
    summary: 'Default sign-in surface with password and SSO entry points.',
  },
  z8zIx: {
    section: 'Auth / Login States',
    summary: 'Loading state while SSO providers are being discovered.',
  },
  VpI0u: {
    section: 'Auth / Login States',
    summary: 'Error treatment for invalid credentials or failed sign-in.',
  },
  e9YMd: {
    section: 'Auth / Login States',
    summary: 'State when SSO is configured but temporarily unavailable.',
  },
  p4AJp: {
    section: 'Auth / Login States',
    summary: 'Session-expired prompt that routes users back to sign-in.',
  },
  BwtLv: {
    section: 'Auth / Password Recovery',
    summary: 'Forgot password request form and helper guidance.',
  },
  uhcyX: {
    section: 'Auth / Password Recovery',
    summary: 'Confirmation state after reset link request is submitted.',
  },
  q9Iwa: {
    section: 'Auth / Reset Password',
    summary: 'Reset-password form with password-strength and error messaging.',
  },
  '30Y5h': {
    section: 'Auth / Reset Password States',
    summary: 'Invalid-link state when reset token is missing or expired.',
  },
  Ykivc: {
    section: 'Auth / SSO Callback',
    summary: 'Finalization loading state after external SSO redirect.',
  },
  bVYh5: {
    section: 'Auth / SSO Callback',
    summary: 'Finalization error state when SSO callback processing fails.',
  },
  WESUb: {
    section: 'Auth / Logout',
    summary: 'Sign-out confirmation dialog flow with cancel/confirm actions.',
  },
};
