// src/integrations/coreMock.js

/**
 * Very dumb mock of Shaheen's legacy core.
 * In real life this would be HTTP calls with axios/fetch.
 */

function fakeDelay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate some fake policies based on CNIC so it's deterministic-ish.
 */
async function fetchPoliciesFromCoreMock({ cnic }) {
  await fakeDelay();

  const suffix = cnic ? cnic.slice(-4).replace(/\D/g, '') || '0000' : '0000';

  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);

  const formatDate = (d) =>
    d.toISOString().slice(0, 10); // YYYY-MM-DD

  return [
    {
      policyNo: `MTR-${suffix}`,
      product: 'Motor Comprehensive',
      expiryDate: formatDate(nextYear),
      status: 'Active',
      pdfUrl: 'https://example.com/policies/mock-motor.pdf',
    },
    {
      policyNo: `TRV-${suffix}`,
      product: 'Travel Worldwide',
      expiryDate: formatDate(nextYear),
      status: 'Active',
      pdfUrl: 'https://example.com/policies/mock-travel.pdf',
    },
  ];
}

/**
 * Generate some fake claims for a user based on CNIC.
 */
async function fetchClaimsFromCoreMock({ cnic }) {
  await fakeDelay();

  const suffix = cnic ? cnic.slice(-3).replace(/\D/g, '') || '000' : '000';

  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  const formatDate = (d) =>
    d.toISOString().slice(0, 10); // YYYY-MM-DD

  return [
    {
      claimNo: `CLM-${suffix}-01`,
      policyNo: `MTR-${suffix}`,
      status: 'Approved',
      incidentDate: formatDate(lastMonth),
    },
    {
      claimNo: `CLM-${suffix}-02`,
      policyNo: `TRV-${suffix}`,
      status: 'Pending',
      incidentDate: formatDate(today),
    },
  ];
}

module.exports = {
  fetchPoliciesFromCoreMock,
  fetchClaimsFromCoreMock,
};
