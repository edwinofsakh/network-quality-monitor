/**
 * Returns number with correct form.
 * @param {number} number - number
 * @param {string} singular - singular form
 * @param {string} plural - plural form
 */
function getNumberText(number, singular, plural) {
  if (number <= 0) {
    return `no ${plural}`;
  }
  if (number === 1) {
    return `1 ${singular}`;
  } else {
    return `${number} ${plural}`;
  }
}

module.exports.getNumberText = getNumberText;
