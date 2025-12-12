window.addEventListener('DOMContentLoaded', () => {
  try {
    const baseUrl = window.location.origin.replace(/\/$/, '');
    const baseUrlLabel = document.getElementById('baseUrlLabel');
    const tokenStatus = document.getElementById('tokenStatus');
    const tokenDisplay = document.getElementById('tokenDisplay');
    const responseBox = document.getElementById('responseBox');

    if (!baseUrlLabel || !tokenStatus || !tokenDisplay || !responseBox) {
      console.error('Playground: some core DOM elements are missing.');
      return;
    }

    baseUrlLabel.textContent = baseUrl;

    const tokenKey = 'shaheen_jwt';
    let authToken = localStorage.getItem(tokenKey) || '';

    function setToken(token) {
      authToken = token || '';
      if (token) {
        localStorage.setItem(tokenKey, token);
        tokenStatus.textContent = 'Set ✅';
        tokenDisplay.textContent = token;
      } else {
        localStorage.removeItem(tokenKey);
        tokenStatus.textContent = 'None';
        tokenDisplay.textContent = '';
      }
    }

    if (authToken) setToken(authToken);
    else setToken('');

    function showResponse(obj) {
      responseBox.textContent = JSON.stringify(obj, null, 2);
    }

    async function api(path, options = {}) {
      const headers = options.headers || {};
      if (authToken) {
        headers['Authorization'] = 'Bearer ' + authToken;
      }
      if (!headers['Content-Type'] && options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
      }

      const url = baseUrl + path;
      console.log('API request ->', url, options);

      let res;
      try {
        res = await fetch(url, { ...options, headers });
      } catch (err) {
        showResponse({ error: 'Network error', details: err.message });
        throw err;
      }

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { raw: await res.text() };
      }

      showResponse({ status: res.status, data });

      if (!res.ok) {
        throw new Error('Request failed: ' + res.status);
      }
      return data;
    }

    // --- Actions ----

    async function register() {
      const fullName = document.getElementById('authFullName').value || 'Test User';
      const email = document.getElementById('authEmail').value || 'test@example.com';
      const mobile = document.getElementById('authMobile').value || '03001234567';
      const password = document.getElementById('authPassword').value || 'Password123';

      const res = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, mobile, password }),
      });
      if (res.token) setToken(res.token);
    }

    async function login() {
      const mobile = document.getElementById('authMobile').value || '03001234567';
      const password = document.getElementById('authPassword').value || 'Password123';

      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ mobile, password }),
      });
      if (res.token) setToken(res.token);
    }

    async function getProfile() {
      await api('/api/user/profile', { method: 'GET' });
    }

    async function updateProfile() {
      const body = {
        fullName: 'Test User',
        email: 'test@example.com',
        address: 'Gulshan-e-Iqbal Block 5',
        cityId: 1,
        cnic: '42101-1234567-1',
        cnicExpiry: '2030-12-31',
        dob: '1995-05-10',
        nationality: 'Pakistani',
        gender: 'male',
      };
      await api('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }

    async function motorCalc() {
      const body = {
        vehicleValue: 2500000,
        year: 2020,
        tracker: true,
      };
      await api('/api/motor/calculate-premium', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    async function motorMarket() {
      const body = {
        makeId: 1,
        submakeId: 5,
        year: 2019,
      };
      await api('/api/motor/market-value', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    async function travelCalc() {
      const body = {
        packageType: 'Worldwide',
        coverageType: 'individual',
        startDate: '2025-01-10',
        endDate: '2025-01-25',
        dob: '1995-05-10',
        addOns: ['hijacking', 'luggageDelay'],
      };
      await api('/api/travel/calculate-premium', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    async function travelProposal() {
      const body = {
        tripDetails: {
          packageType: 'Student Travel',
          coverageType: 'individual',
          productPlan: 'Student-Plan-1',
          startDate: '2025-02-01',
          endDate: '2025-02-21',
          destinationIds: [1],
          addOns: ['hijacking', 'luggageDelay'],
        },
        applicantInfo: {
          firstName: 'Ali',
          lastName: 'Khan',
          address: 'Gulshan-e-Iqbal Block 5',
          cityId: 1,
          cnic: '42101-1234567-1',
          passportNumber: 'AB1234567',
          mobile: '03001234567',
          email: 'ali@example.com',
          dob: '2000-01-10',
          universityName: 'XYZ University',
        },
        beneficiary: {
          beneficiaryName: 'Danish Khan',
          beneficiaryAddress: 'North Nazimabad',
          beneficiaryCnic: '42101-7654321-1',
          beneficiaryCnicIssueDate: '2015-05-01',
          beneficiaryRelation: 'Brother',
        },
        parentInfo: {
          parentName: 'Muhammad Khan',
          parentAddress: 'North Nazimabad',
          parentCnic: '42101-1111111-1',
          parentCnicIssueDate: '2010-01-01',
          parentRelation: 'Father',
        },
      };

      await api('/api/travel/submit-proposal', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    async function getPolicies() {
      await api('/api/policies/list', { method: 'GET' });
    }

    async function getClaims() {
      await api('/api/claims/list', { method: 'GET' });
    }

    async function initiatePayment() {
      const applicationType = document.getElementById('payAppType').value;
      const applicationId = Number(document.getElementById('payAppId').value || '1');
      const amount = Number(document.getElementById('payAmount').value || '44000');
      const customerEmail =
        document.getElementById('payEmail').value || 'test@example.com';

      const res = await api('/api/payment/initiate', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          orderId: null,
          customerEmail,
          applicationType,
          applicationId,
        }),
      });

      if (res.paymentUrl) {
        window.open(res.paymentUrl, '_blank');
      }
    }

    // Attach handlers
    const click = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) {
        console.warn('Missing button:', id);
        return;
      }
      el.addEventListener('click', () => {
        fn().catch((err) => {
          console.error('Error in action', id, err);
          showResponse({ error: err.message || String(err) });
        });
      });
    };

    click('btnRegister', register);
    click('btnLogin', login);
    click('btnGetProfile', getProfile);
    click('btnUpdateProfile', updateProfile);
    click('btnMotorCalc', motorCalc);
    click('btnMotorMarket', motorMarket);
    click('btnTravelCalc', travelCalc);
    click('btnTravelProposal', travelProposal);
    click('btnPolicies', getPolicies);
    click('btnClaims', getClaims);
    click('btnPay', initiatePayment);

    console.log('Playground initialized ✅');
  } catch (err) {
    console.error('Playground init error:', err);
  }
});
