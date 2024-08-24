const chart = require('asciichart');
const { Statistics } = require('./statistics');

/**
 * Chart options
 * @typedef {object} ChartOptions
 * @property {string} padding - padding string
 * @property {number} height - height
 * @property {(x: number, i: number) => string} format - format function
 */

/**
 * Prepares test chart.
 * @param {Statistics} stat - statistics
 */
function prepare(stat) {
  if (stat.count < 2) return ' Waiting for data...';

  const columns = process.stdout.columns ?? 0;
  const n = Math.min(stat.values.length, columns - 7);
  if (n < 0) return ' Not enough space for chart!';

  const options = getChartOptions();
  if (options.height < 3) return ' Not enough space for chart!';

  return chart.plot([stat.values.slice(-n), Array(n).fill(stat.mean)], options);
}

/**
 * Prepares chart options.
 * @returns {ChartOptions} - chart options
 */
function getChartOptions() {
  const padding = '     ';

  return {
    padding: padding,
    height: getChartHeight(),
    format: (x, _i) => (padding + x.toFixed(0)).slice(-padding.length),
  };
}

/**
 * Returns chart height.
 * @returns {number} - chart height
 */
function getChartHeight() {
  const rows = process.stdout.rows ?? 0;
  return Math.min(24, rows - 8 - 5);
}

module.exports.prepare = prepare;
