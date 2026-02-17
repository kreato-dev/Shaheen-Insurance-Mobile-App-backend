const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};
// cover note number generator (M/TD/TH/TI/TS-YYYYMMDD-PROPOSAL_ID)
const generateCoverNoteId = (type, packageCode, proposalId) => {
  const d = new Date();
  const dateStr = d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');

  let prefix = '';
  if (type === 'MOTOR') {
    prefix = 'M';
  } else {
    let sub = 'I';
    const p = String(packageCode || '').toUpperCase();
    if (p.includes('DOMESTIC')) sub = 'D';
    else if (p.includes('HAJJ') || p.includes('UMRAH')) sub = 'H';
    else if (p.includes('STUDENT')) sub = 'S';
    else if (p.includes('INTERNATIONAL')) sub = 'I';
    prefix = 'T' + sub;
  }
  return `${prefix}-${dateStr}-${proposalId}`;
};

const createMotorCoverNoteHtml = (data) => {
  const {
    proposalId,
    personalDetails = {},
    vehicleDetails = {},
    pricing = {},
    lifecycle = {}
  } = data;

  const coverNoteNo = generateCoverNoteId('MOTOR', null, proposalId);
  const issueDate = formatDate(new Date());
  // Default validity 1 year from start date, or today if not set
  const startDate = lifecycle.insuranceStartDate ? new Date(lifecycle.insuranceStartDate) : new Date();
  const validFrom = formatDate(startDate);

  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  const validTo = formatDate(endDate);

  const insuredName = personalDetails.name || '-';
  const insuredAddress = personalDetails.address || '-';

  const regNo = vehicleDetails.registrationNumber || 'APPLIED';
  const regProvince = vehicleDetails.registrationProvince || '';
  const fullReg = regProvince ? `${regNo} (${regProvince})` : regNo;

  const fullModel = `${vehicleDetails.submakeName || ''} ${vehicleDetails.variantName || ''}`.trim();
  const vehicleValue = pricing.sumInsured || 0;

  const bd = pricing.breakdown || {};
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 20px; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          .title { font-size: 18px; text-decoration: underline; margin-bottom: 5px; }
          .row { display: flex; margin-bottom: 6px; }
          .label { width: 180px; font-weight: bold; }
          .value { flex: 1; }
          .divider { border-bottom: 1px solid #000; margin: 15px 0; }
          .vehicle-grid { width: 100%; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 15px 0; padding: 10px 0; border-collapse: collapse; }
          .vehicle-grid td { padding: 6px; vertical-align: top; }
          .premium-table { width: 100%; border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; margin-top: 10px; }
          .premium-table td { padding: 8px; }
          .amount-col { text-align: right; }
          .footer-text { font-size: 11px; margin-top: 20px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Motor Cover Note</div>
          <div>(Schedule)</div>
        </div>

        <div class="row"><span class="label">Cover Note No.</span> <span class="value">: ${coverNoteNo}</span></div>
        <div class="row"><span class="label">Business Class</span> <span class="value">: PRIVATE CAR (COMPREHENSIVE)</span></div>
        <div class="row"><span class="label">Insured Name</span> <span class="value">: ${insuredName}</span></div>
        <div class="row"><span class="label">Address</span> <span class="value">: ${insuredAddress}</span></div>
        <div class="row"><span class="label">Issue Date</span> <span class="value">: ${issueDate}</span></div>
        <div class="row"><span class="label">Validity</span> <span class="value">: This Covernote is valid for 7 days only from the insurance/renewal date and stands automatically cancelled unless converted into policy on reciept.</span></div>
        <div class="row"><span class="label">Period of Insurance</span> <span class="value">: From ${validFrom} To ${validTo}</span></div>
        
        <div class="divider"></div>
        
        <table class="vehicle-grid">
          <tr>
            <td width="20%"><strong>Reg No</strong></td>
            <td width="30%">: ${fullReg}</td>
            <td width="20%"><strong>Type of Body</strong></td>
            <td width="30%">: ${vehicleDetails.bodyTypeName || '-'}</td>
          </tr>
          <tr>
            <td><strong>Engine No</strong></td>
            <td>: ${vehicleDetails.engineNumber || '-'}</td>
            <td><strong>Cubic Capacity</strong></td>
            <td>: ${vehicleDetails.engineCc || '-'} CC</td>
          </tr>
           <tr>
            <td><strong>Chassis No</strong></td>
            <td>: ${vehicleDetails.chassisNumber || '-'}</td>
            <td><strong>Make/Year</strong></td>
            <td>: ${vehicleDetails.makeName || '-'} / ${vehicleDetails.modelYear || '-'}</td>
          </tr>
          <tr>
            <td><strong>Model/Variant</strong></td>
            <td>: ${fullModel}</td>
             <td><strong>Seating</strong></td>
            <td>: ${vehicleDetails.seatingCapacity || '-'}</td>
          </tr>
           <tr>
            <td><strong>Color</strong></td>
            <td>: ${vehicleDetails.colour || '-'}</td>
            <td><strong>Value Rs.</strong></td>
            <td>: ${Number(vehicleValue).toLocaleString()}</td>
          </tr>
        </table>
        
        <div class="row">
            <span class="label">Sum Insured</span>
            <span class="value">: Rs. ${Number(vehicleValue).toLocaleString()}</span>
        </div>

        <table class="premium-table">
          <tr>
            <td>Gross Premium</td>
            <td class="amount-col">Rs.</td>
            <td class="amount-col">${fmt(bd.grossPremium)}</td>
          </tr>
          <!--
          //commented part: detailed premium breakdown
          <tr>
            <td>Admin Surcharge (5%)</td>
            <td class="amount-col">Rs.</td>
            <td class="amount-col">${fmt(bd.adminSurcharge)}</td>
          </tr>
          <tr>
            <td>Sub Total</td>
            <td class="amount-col">Rs.</td>
            <td class="amount-col">${fmt(bd.subTotal)}</td>
          </tr>
          <tr>
            <td>Sales Tax</td>
            <td class="amount-col">Rs.</td>
            <td class="amount-col">${fmt(bd.salesTax)}</td>
          </tr>
          <tr>
            <td>Federal Insurance Fee (1%)</td>
            <td class="amount-col">Rs.</td>
            <td class="amount-col">${fmt(bd.federalInsuranceFee)}</td>
          </tr>
          <tr>
            <td>Stamp Duty</td>
            <td class="amount-col">Rs.</td>
            <td class="amount-col">${fmt(bd.stampDuty)}</td>
          </tr>
          -->
          <tr style="border-top: 2px solid #000;">
            <td><strong>Total Premium</strong></td>
            <td class="amount-col"><strong>Rs.</strong></td>
            <td class="amount-col"><strong>${fmt(pricing.premium)}</strong></td>
          </tr>
        </table>

        <div class="footer-text">
          <strong>Subject to the following clauses, endorsements & warranties.</strong><br/>

          PREMIUM PAYMENT ENDORSEMENT, SUBJECT TO 50% DEPRECIATION ON TYRES/ALLOY RIMS/BATTERY/AIRBAGS/ELECTRONIC ACCESSORIES, DEPRECIATION CLAUSE ATTACHED, IMPORTANT NOTICE, TOI, MARKET VALUE CLAUSE, KARACHI JURISDICTION CLAUSE.<br/>
          DAMAGES BEFORE INSPECTION.<br/>

          <strong>
            The insured described in the Schedule below having proposed for insurance in respect of Motor Vehicle(s) described in the Schedule below.
            The risk is hereby held covered in terms of the Company's usual form of policy applicable there to (subject to any special conditions or restrictions which may be mentioned overleaf)
            for the period between dates specified in this schedule unless the cover be terminated by the Company by notice in writing in which case the insurance will thereupon cease and a proportionate part of the annual premium otherwise payable for such insurance will be charged for the time the company has been on risk.
          </strong><br/>

          NO COVERAGE FOR VEHICLE(S) USED FOR CARRYING EQUIPMENTS/GOODS/ITEMS FOR NATO FORCES/WAR OR TERRORISM.<br/>

          <strong>
            IN WITNESS whereof the undersigned acting on behalf of and with the authority of the Company has hereto set his hand at Main Branch HO ${issueDate}
          </strong><br/><br/>

          <strong>Warranties :</strong><br/>
          Warranted that the insurer will not be liable for any damages found at the time of inspection nor accept any claim lodged or intimated relating to the same.
        </div>

        <div style="margin-top: 50px; text-align: right;">
          <strong>For and On behalf of Shaheen Insurance Company Limited</strong>
        </div>

        <!-- Cover Note No at the very bottom, centered -->
        <div style="margin-top: 40px; text-align: center; font-weight: bold;">
          COVER NOTE No.: ${coverNoteNo}
        </div>
      </body>
    </html>
  `;
};

const createTravelCoverNoteHtml = (data) => {
  const {
    proposalId,
    applicantInfo = {},
    tripDetails = {},
    beneficiary = {},
    pricing = {},
    destinations = [],
    familyMembers = [],
    insuranceType
  } = data;

  const coverNoteNo = generateCoverNoteId('TRAVEL', tripDetails.packageCode, proposalId);
  const issueDate = formatDate(new Date());
  const insuredName = `${applicantInfo.firstName || ''} ${applicantInfo.lastName || ''}`.trim();
  const insuredAddress = `${applicantInfo.address || ''}${applicantInfo.cityName ? ', ' + applicantInfo.cityName : ''}`;

  const passport = applicantInfo.passportNumber || '-';
  const cnic = applicantInfo.cnic || '-';
  const mobile = applicantInfo.mobile || '-';
  const dob = formatDate(applicantInfo.dob);

  const planName = `${tripDetails.packageCode || ''} - ${tripDetails.productPlan || ''}`;
  const coverage = tripDetails.coverageType || '-';

  const validFrom = formatDate(tripDetails.startDate);
  const validTo = formatDate(tripDetails.endDate);
  const tenure = tripDetails.tenureDays ? `${tripDetails.tenureDays} Days` : '-';
  const purpose = tripDetails.PurposeOfVisit || '-';

  const destinationList = destinations.map(d => d.name).join(', ') || 'Worldwide';

  const benName = beneficiary.beneficiaryName || '-';
  const benRel = beneficiary.beneficiaryRelation || '-';

  let familyHtml = '';
  if (familyMembers && familyMembers.length > 0) {
    const rows = familyMembers.map(m => `
      <tr>
        <td>${m.firstName} ${m.lastName}</td>
        <td>${m.relation}</td>
        <td>${formatDate(m.dob)}</td>
        <td>${m.passportNumber || m.cnic || '-'}</td>
      </tr>
    `).join('');

    familyHtml = `
      <div style="margin-top: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px;">Insured Family Members</div>
      <table class="info-grid" style="margin-top: 5px;">
        <tr style="background-color: #eee;">
          <td><strong>Name</strong></td>
          <td><strong>Relation</strong></td>
          <td><strong>DOB</strong></td>
          <td><strong>Passport/CNIC</strong></td>
        </tr>
        ${rows}
      </table>
    `;
  }

  const premium = Number(pricing.finalPremium || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let termsHtml = '';
  const pCode = (tripDetails.packageCode || '').toUpperCase();

  if (pCode.includes('DOMESTIC')) {
    termsHtml = `
      <strong>Terms & Conditions (Domestic Plan):</strong>
      <ul style="margin: 5px 0 10px 20px; padding-left: 10px;">
        <li>Maximum age limit: 60 years</li>
      </ul>
    `;
  } else if (pCode.includes('INTERNATIONAL')) {
    termsHtml = `
      <strong>Terms & Conditions (International Plan):</strong>
      <ul style="margin: 5px 0 10px 20px; padding-left: 10px;">
        <li>Subjectivities are as follows:
          <ul style="margin: 5px 0 5px 20px; padding-left: 10px;">
             <li>PCR Test within 72 hours prior to travelling</li>
             <li>Pricing on individual basis</li>
             <li>Max 1 policy per person</li>
             <li>Excluded Countries: Andorra, Argentina, Aruba, Bahrain, Brazil, Costa Rica, Czechia, France, French Polynesia, Guam, Israel, Kuwait, Maldives, Montenegro, Occupied Palestinian</li>
          </ul>
        </li>
        <li>1) Quarantine Expenses would be only covered for non-mandatory quarantine. I.e. compulsory quarantine upon arrival is NOT covered. Furthermore, the non-mandatory quarantine would be covered subject to a confirmed Covid-19 infection.</li>
        <li>2) Covid test Expenses would be only covered for non-mandatory tests. I.e. compulsory tests upon arrival is NOT covered. Furthermore, the non-mandatory tests would be covered subject to a confirmed Covid-19 infection.</li>
        <li>3) Trip Interruption/Cancellation covered during the trip only.</li>
        <li>Person age between 66 - 70 years, Extra Premium 100%</li>
        <li>Person age between 71 - 75 years, Extra Premium 150%</li>
        <li>Person age between 76 - 80 years, Extra Premium 200%</li>
        <li>Maximum duration of coverage is 90 days per trip for multi-trip policy</li>
        <li>50% of accidental death and permanent total disability limit for the spouse and 25% of the same for children</li>
        <li>**EEL - Each and every loss</li>
        <li>(****) Cover is max available for 3 months</li>
      </ul>
    `;
  } else if (pCode.includes('HAJJ') || pCode.includes('UMRAH') || pCode.includes('ZIARAT')) {
    termsHtml = `
      <strong>Terms & Conditions (Hajj, Umrah and Ziarat Plan):</strong>
      <ul style="margin: 5px 0 10px 20px; padding-left: 10px;">
        <li>*In case of natural death only</li>
        <li>Subject to limits as per condition of the policy</li>
        <li>*Maximum age limit is 69</li>
      </ul>
    `;
  } else if (pCode.includes('STUDENT')) {
    termsHtml = `
      <strong>Terms & Conditions (Student Guard Plan):</strong>
      <ul style="margin: 5px 0 10px 20px; padding-left: 10px;">
        <li>Maximum age limit is 65</li>
      </ul>
    `;
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 20px; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          .title { font-size: 18px; text-decoration: underline; margin-bottom: 5px; }
          .row { display: flex; margin-bottom: 6px; }
          .label { width: 180px; font-weight: bold; }
          .value { flex: 1; }
          .divider { border-bottom: 1px solid #000; margin: 15px 0; }
          .info-grid { width: 100%; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 15px 0; padding: 10px 0; border-collapse: collapse; }
          .info-grid td { padding: 6px; vertical-align: top; }
          .premium-table { width: 100%; border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; margin-top: 10px; }
          .premium-table td { padding: 8px; }
          .amount-col { text-align: right; }
          .footer-text { font-size: 11px; margin-top: 20px; line-height: 1.4; }
          .footer-text ul li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Travel Insurance Cover Note</div>
          <div>(Schedule)</div>
        </div>

        <div class="row"><span class="label">Cover Note No.</span> <span class="value">: ${coverNoteNo}</span></div>
        <div class="row"><span class="label">Business Class</span> <span class="value">: TRAVEL INSURANCE</span></div>
        <div class="row"><span class="label">Insured Name</span> <span class="value">: ${insuredName}</span></div>
        <div class="row"><span class="label">Address</span> <span class="value">: ${insuredAddress}</span></div>
        <div class="row"><span class="label">Issue Date</span> <span class="value">: ${issueDate}</span></div>
        <div class="row"><span class="label">Validity</span> <span class="value">: This Covernote is valid for 7 days only from the insurance/renewal date and stands automatically cancelled unless converted into policy on reciept.</span></div>
        <div class="row"><span class="label">Period of Insurance</span> <span class="value">: From ${validFrom} To ${validTo} (${tenure})</span></div>
        
        <div class="divider"></div>
        
        <table class="info-grid">
          <tr>
            <td width="20%"><strong>Passport No</strong></td>
            <td width="30%">: ${passport}</td>
            <td width="20%"><strong>CNIC</strong></td>
            <td width="30%">: ${cnic}</td>
          </tr>
          <tr>
            <td><strong>Mobile</strong></td>
            <td>: ${mobile}</td>
            <td><strong>Date of Birth</strong></td>
            <td>: ${dob}</td>
          </tr>
          <tr>
            <td><strong>Insurance Type</strong></td>
            <td>: ${insuranceType || '-'}</td>
            <td><strong>Purpose</strong></td>
            <td>: ${purpose}</td>
          </tr>
          <tr>
            <td><strong>Plan</strong></td>
            <td>: ${planName}</td>
            <td><strong>Coverage</strong></td>
            <td>: ${coverage}</td>
          </tr>
           <tr>
            <td><strong>Destinations</strong></td>
            <td colspan="3">: ${destinationList}</td>
          </tr>
          <tr>
            <td><strong>Beneficiary</strong></td>
            <td>: ${benName}</td>
             <td><strong>Relation</strong></td>
            <td>: ${benRel}</td>
          </tr>
        </table>
        
        ${familyHtml}
        
        <table class="premium-table">
          <tr style="border-top: 2px solid #000;">
            <td><strong>Total Premium</strong></td>
            <td class="amount-col"><strong>PKR</strong></td>
            <td class="amount-col"><strong>${premium}</strong></td>
          </tr>
        </table>

        <div class="footer-text">
            ${termsHtml}
            <strong>Subject to the following clauses, endorsements & warranties:</strong><br/>
            This Cover Note is issued subject to the terms and conditions of the standard Travel Insurance Policy.<br/>
            Please read your policy document carefully for full details of coverage, exclusions, and conditions.<br/><br/>

            <strong>Declaration:</strong><br/>
            I hereby declare and affirm that the information provided in the application form is true to the best of my knowledge and I am in sound health. I am neither travelling against the advice of my medical practitioner nor am I travelling with the purpose of making a claim under this policy. All terms & conditions as well as the exclusions are available at the Shaheen Insurance LTD website: http://www.shaheeninsuranceltd.com.pk and http://etravel.shaheeninsuranceltd.pk<br/><br/>

            I hereby read and accepted the policy wording.<br/><br/>

            <strong>24 x 7 Emergency NO</strong><br/>
            In case of emergency, the insured shall immediately contact the Emergency No with necessary details. The contact of Emergency No are:<br/>
            MidEast Assistance International S.A.L<br/>
            24 Hours Hotline: Tel 00961 4 548 648<br/><br/>

            The policy shall be null and void and no benefits shall be payable in the event of untrue or incorrect statements, misrepresentation, mis-disclosure of any material particular in the application/proposal form, statement declaration and/or any other connected documents. The policy shall be deemed to be issued as an electronic document. Any print out of the same is for purposes of record and reference only.<br/><br/>

            <strong>
              IN WITNESS whereof the undersigned acting on behalf of and with the authority of the Company has hereto set his hand at Main Branch HO ${issueDate}
            </strong>
        </div>
        
        <div style="margin-top: 50px; text-align: right;">
            <strong>For and On behalf of Shaheen Insurance Company Limited</strong>
        </div>

        <div style="margin-top: 40px; text-align: center; font-weight: bold;">
          COVER NOTE No.: ${coverNoteNo}
        </div>
      </body>
    </html>
  `;
};

module.exports = { createMotorCoverNoteHtml, createTravelCoverNoteHtml };