const { Histogram } = require('./histogram');

class Statistics {
    constructor(min, max, bins, labels, size) {
        // Overall statistics
        this._count = 0;
        this._mean = 0;
        this._min = Number.POSITIVE_INFINITY;
        this._max = Number.NEGATIVE_INFINITY;

        this._overall = {};
        this._recent = { size: size || 100, values: [] };

        // Overall histogram
        this._histogram = new Histogram(min, max, bins, labels);
    }

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

    get max() {
        return this._count == 0 ? 0 : this._max;
    }

    get values() {
        return this._recent.values;
    }

    get histogram() {
        return this._histogram;
    }
}

class DelayStatistics extends Statistics {
    constructor(max, k, labels) {
        super(0, max, k, labels);
    }

    get text() {
        return `min ${this.min.toFixed(0)}ms, avg ${this.mean.toFixed(0)}ms, max ${this.max.toFixed(0)}ms`;
    }
}

module.exports.Statistics = Statistics;
module.exports.DelayStatistics = DelayStatistics;
