/**
 * Formatting utilities for CRM
 */

function formatCurrency(amount, currency = 'USD') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function formatDate(dateStr, includeTime = true) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('en-US', options).format(d);
  } catch (e) {
    return dateStr;
  }
}

function formatAddress(addressObj) {
  if (!addressObj) return 'No address provided';
  if (typeof addressObj === 'string') {
    try {
      addressObj = JSON.parse(addressObj);
    } catch (e) {
      return addressObj;
    }
  }

  const parts = [];
  if (addressObj.address1) parts.push(addressObj.address1);
  if (addressObj.address2) parts.push(addressObj.address2);
  
  const cityStateZip = [
    addressObj.city,
    addressObj.state || addressObj.province,
    addressObj.postalCode || addressObj.zip
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) parts.push(cityStateZip);
  if (addressObj.country) parts.push(addressObj.country);

  return parts.join('\n');
}

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

module.exports = {
  formatCurrency,
  formatDate,
  formatAddress,
  sanitizeEmail
};
