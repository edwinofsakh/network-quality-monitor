const { Histogram } = require('./histogram');

/**
 * Statistics class
 */
class Statistics {
    /**
     * 
     * @param {number} min - expected minimum value
     * @param {number} max - expected maximum value
     * @param {number} bins - number of bins
     * @param {string[]} labels - labels
     * @param {number} size - size of buffer for recent values
     */
    constructor(min, max, bins, labels, size) {
        // Overall statistics
        this._count = 0;
        this._mean = 0;
        this._min = Number.POSITIVE_INFINITY;
        this._max = Number.NEGATIVE_INFINITY;

        // ???
        this._recent = { size: size || 100, values: [] };

        // Overall histogram
        this._histogram = new Histogram(min, max, bins, labels);
    }

    /**
     * 
     * @param {number} value - new value
     */
    update(value) {
        this._recent.values.push(value);
        if (this._recent.values.length > this._recent.size) {
            this._recent.values.shift();
        }

        this._count++;

        this._mean = this._mean + (value - this._mean) / this._count;

        this._min = Math.min(value, this._min);
        this._max = Math.max(value, this._max);

        this._histogram.update(value);
    }

    get count() {
        return this._count;
    }

    get text() {
        return `min ${this.min}, avg ${this.mean}, max ${this.max}`;
    }

    get mean() {
        return this._count == 0 ? 0 : this._mean;
    }
    
    get min() {
        return this._count == 0 ? 0 : this._min;
    }

    get mdn() {
        return this._histogram.percentile(50);
    }

    get avg() {
        return Math.round(this.mean);
    }

    get p90() {
        return this._histogram.percentile(90);
    }

    get p95() {
        return this._histogram.percentile(95);
    }

    get p99() {
        return this._histogram.percentile(99);
    }
    get max() {
        return this._count == 0 ? 0 : this._max;
    }

    get values() {
        return this._recent.values;
    }

    get histogram() {
        return this._histogram;
    }

    static percentile(values, p) {
        const n = values.length;
        if (n === 0) {
            return 0;
        } else {
            if (p <= 0) {
                return values[0];
            } else if (p >= 100) {
                return values[n - 1];
            } else {
                return values[Math.ceil(p * n / 100) - 1];
            }
        }
    }
    
    static stats(values) {
        values.sort((a, b) => a - b);
        const n = values.length;

        return {
            min: Statistics.percentile(values, 0),
            mdn: Statistics.percentile(values, 50),
            avg: n ? Math.round(values.reduce((avg, value) => (avg + value), 0) / n) : 0,
            p90: Statistics.percentile(values, 90),
            p95: Statistics.percentile(values, 95),
            p99: Statistics.percentile(values, 99),
            max: Statistics.percentile(values, 100),
        };
    }

    toJSON() {
        return {
            min: this.min,
            mdn: this.mdn,
            avg: this.avg,
            p90: this.p90,
            p95: this.p95,
            p99: this.p99,
            max: this.max
        };
      }
}

/**
 * DelayStatistics class
 */
class DelayStatistics extends Statistics {
    /**
     * 
     * @param {number} max - expected maximum value
     * @param {number} bins - number of bins
     * @param {string[]} labels - labels
     */
    constructor(max, bins, labels) {
        super(0, max, bins, labels);
    }

    get text() {
        return `min ${this.min.toFixed(0)}ms, avg ${this.mean.toFixed(0)}ms, max ${this.max.toFixed(0)}ms`;
    }
}

module.exports.Statistics = Statistics;
module.exports.DelayStatistics = DelayStatistics;
