class Histogram {
    constructor(min, max, k, labels) {
        // the number of values
        this._n = 0;

        // the number of bins
        this._k = k !== undefined ? k : 100;

        // minimum value (expectation)
        this._min = min !== undefined ? min : 0;

        // maximum value (expectation)
        this._max = max !== undefined ? max : 100;

        // bin width
        this._width = (this._max - this._min) / this._k;

        // frequencies
        this._frequencies = Array(this._k + 2).fill(0);

        // bins labels
        this._labels = [];
        this._bins = [];

        for (let i = -1; i <= this._k; i++) {
            this._bins.push(this._min + i * this._width);
        }

        if (labels && labels.length === (this._k + 1)) {
            this._labels = labels;
        } else {
            this._labels.push(`(-∞,${this._min})`);

            for (let i = 0; i < this._k; i++) {
                const curr = this._min + i * this._width;
                const next = this._min + (i + 1) * this._width;
                this._labels.push(`[${curr},${next})`);
            }

            this._labels.push(`[${this._max},+∞)`);
        }
    }

    /**
     * Updates histogram.
     * @param {number} value - new value
     */
    update(value) {
        this._n++;

        // Calculate channel index
        let i = Math.floor((value - this._min) / this._width);

        if (i < 0) {
            i = 0;
        } else if (i >= this._k) {
            i = this._k + 1;
        } else {
            i = i + 1;
        }

        this._frequencies[i]++;
    }

    /**
     * Histogram options
     */
    get options() {
        return {
            k: this._k,
            min: this._min,
            max: this._max,
            width: this._width,
        };
    }

    /**
     * Number of processed values
     */
    get count() {
        return this._n;
    }

    /**
     * Channel frequencies
     */
    get frequencies() {
        return this._frequencies;
    }

    /**
     * Channel labels
     */
    get labels() {
        return this._labels;
    }

    /**
     * Calculates an approximate percentile value based on channel frequencies.
     * @param {number} p - percentile
     */
    percentile(p) {
        if (this._n === 0) {
            return 0;
        }

        if (p <= 0) {
            return this._min;
        } else if (p >= 100) {
            return this._max;
        } else {
            let f = 0;
            return this._bins.filter((_b, i) => {
                f += (this._frequencies[i] / this._n) * 100;
                return f >= p;
            })[0];
        }
    }
}

module.exports.Histogram = Histogram;
