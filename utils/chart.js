const chart = require('asciichart');
const { Statistics } = require('./statistics');

/**
 * Prepares test chart.
 * @param {Statistics} stat - statistics
 */
function prepare(stat) {
    const n = Math.min(stat.values.length, process.stdout.columns - 7);
    const options = getChartOptions();
    
    if (options.height < 3) {
        return ' Not enough space for chart!';
    }

    if (stat.count < 2) {
        return ' Waiting for data...';
    }

    return chart.plot([stat.values.slice(-n), Array(n).fill(stat.mean)], options);
}

/**
 * Prepares chart options
 * @returns {object} - chart options
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
    return Math.min(24, process.stdout.rows - 8 - 5);
}

module.exports.prepare = prepare;
