function calculateDiscount(price, discountPercent) {
  if (typeof price !== 'number' || typeof discountPercent !== 'number') {
    throw new Error('Invalid arguments');
  }
  return price - (price * (discountPercent / 100));
}

function calculateTax(price, taxRate = 0.08) {
  return price * taxRate;
}

module.exports = {
  calculateDiscount,
  calculateTax,
};
