const createMotorCoverNoteHtml = (data) => {
  const {
    proposalId,
    personalDetails = {},
    vehicleDetails = {},
    pricing = {},
    lifecycle = {}
  } = data;

  const issueDate = new Date().toLocaleDateString();
  // Default validity 1 year from start date, or today if not set
  const startDate = lifecycle.insuranceStartDate ? new Date(lifecycle.insuranceStartDate) : new Date();
  const validFrom = startDate.toLocaleDateString();
  
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const validTo = endDate.toLocaleDateString();

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
          body { font-family: Courier, monospace; font-size: 12px; color: #000; padding: 20px; }
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
          .footer-text { font-size: 10px; margin-top: 20px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Motor Cover Note</div>
          <div>(Schedule)</div>
        </div>

        <div class="row"><span class="label">Cover Note No.</span> <span class="value">: ${proposalId}</span></div>
        <div class="row"><span class="label">Business Class</span> <span class="value">: PRIVATE CAR (COMPREHENSIVE)</span></div>
        <div class="row"><span class="label">Insured Name</span> <span class="value">: ${insuredName}</span></div>
        <div class="row"><span class="label">Address</span> <span class="value">: ${insuredAddress}</span></div>
        <div class="row"><span class="label">Issue Date</span> <span class="value">: ${issueDate}</span></div>
        <div class="row"><span class="label">Validity</span> <span class="value">: From ${validFrom} To ${validTo}</span></div>
        
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
          <tr style="border-top: 2px solid #000;">
            <td><strong>Net Premium</strong></td>
            <td class="amount-col"><strong>Rs.</strong></td>
            <td class="amount-col"><strong>${fmt(pricing.premium)}</strong></td>
          </tr>
        </table>

        <div class="footer-text">
            <strong>Subject to the following clauses, endorsements & warranties:</strong><br/>
            PREMIUM PAYMENT ENDORSEMENT, MARKET VALUE CLAUSE, KARACHI JURISDICTION CLAUSE.<br/><br/>
            This Cover Note is issued subject to the terms and conditions of the standard Motor Policy.
        </div>
        
        <div style="margin-top: 50px; text-align: right;">
            <strong>For and On behalf of Shaheen Insurance Company Limited</strong>
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
    pricing = {},
    destinations = []
  } = data;

  const issueDate = new Date().toLocaleDateString();
  const insuredName = `${applicantInfo.firstName || ''} ${applicantInfo.lastName || ''}`.trim();
  const passport = applicantInfo.passportNumber || applicantInfo.cnic || '-';
  
  const planName = `${tripDetails.packageCode || ''} - ${tripDetails.productPlan || ''}`;
  const validFrom = tripDetails.startDate ? new Date(tripDetails.startDate).toLocaleDateString() : '-';
  const validTo = tripDetails.endDate ? new Date(tripDetails.endDate).toLocaleDateString() : '-';
  
  const destinationList = destinations.map(d => d.name).join(', ') || 'Worldwide';
  const premium = Number(pricing.finalPremium || 0).toLocaleString();

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .title { font-size: 20px; font-weight: bold; color: #004080; }
          .row { margin-bottom: 10px; display: flex; }
          .label { width: 150px; font-weight: bold; color: #555; }
          .value { flex: 1; font-weight: 500; }
          .box { border: 1px solid #ddd; padding: 15px; margin-top: 20px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Travel Insurance Cover Note</div>
          <div>Shaheen Insurance Company Limited</div>
        </div>

        <div class="row"><span class="label">Cover Note No:</span> <span class="value">${proposalId}</span></div>
        <div class="row"><span class="label">Issue Date:</span> <span class="value">${issueDate}</span></div>
        <div class="row"><span class="label">Insured Name:</span> <span class="value">${insuredName}</span></div>
        <div class="row"><span class="label">Passport/CNIC:</span> <span class="value">${passport}</span></div>
        
        <div class="box">
          <div class="row"><span class="label">Plan:</span> <span class="value">${planName}</span></div>
          <div class="row"><span class="label">Coverage:</span> <span class="value">${tripDetails.coverageType || 'Individual'}</span></div>
          <div class="row"><span class="label">Valid From:</span> <span class="value">${validFrom}</span></div>
          <div class="row"><span class="label">Valid To:</span> <span class="value">${validTo}</span></div>
          <div class="row"><span class="label">Destinations:</span> <span class="value">${destinationList}</span></div>
        </div>

        <div class="box" style="background-color: #f9f9f9;">
          <div class="row"><span class="label">Total Premium:</span> <span class="value">PKR ${premium}</span></div>
        </div>

        <div style="margin-top: 50px; font-size: 10px; color: #777;">
          This document is computer generated and does not require a signature.
        </div>
      </body>
    </html>
  `;
};

module.exports = { createMotorCoverNoteHtml, createTravelCoverNoteHtml };