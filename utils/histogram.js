class Histogram {
    constructor(min, max, k, labels) {
        // the number of values
        this._n = 0;

        // the number of bins
        this._k = k !== undefined ? k : 10;

        // minimum value (expectation)
        this._min = min !== undefined ? min : 0;

        // maximum value (expectation)
        this._max = max !== undefined ? max : 100;

        // bin width
        this._width = (this._max - this._min) / this._k;

        // frequencies
        this._frequencies = Array(this._k + 1).fill(0);

        // bins labels
        this._labels = [];

        if (labels && labels.length === (this._k + 1)) {
            this._labels = labels;
        } else {
            this._labels.push(`(-∞,${this._min})`);

            for (let i = 0; i < this._k - 1; i++) {
                const curr = this._min + i * this._width;
                const next = this._min + (i + 1) * this._width;
                this._labels.push(`[${curr},${next})`);
            }

            this._labels.push(`[${this._max},+∞)`);
        }
    }

    update(value) {
        this._n++;
        let i = Math.floor((value - this._min) / this._width);

        if (i < 0) {
            i = 0;
        } else if (i >= this._k) {
            i = this._k;
        } else {
            i = i + 1;
        }

        this._frequencies[i]++;
    }

    print() {
        const maxLabel = Math.max(
            6,
            this._labels.reduce((max, i) => (Math.max(max, i.length)), 0),
            this._frequencies.reduce((max, i) => (Math.max(max, i.toFixed(0).length + 1)), 0)
        );

        return ''
            + '┌' + this._labels.map(_ => '─'.repeat(maxLabel)).join('┬') + '┐\n'
            + '│' + this._frequencies.map(i => i.toFixed(0).padStart(maxLabel - 1, ' ')).join(' │') + ' │\n'
            + '│' + this._frequencies.map(i => (this._n ? i / this._n * 100 : 0).toFixed(1).padStart(maxLabel - 1, ' ') + '%').join('│') + '│\n'
            + '│' + this._labels.map(i => (i).padStart(maxLabel, ' ')).join('│') + '│\n'
            + '└' + this._labels.map(_ => '─'.repeat(maxLabel)).join('┴') + '┘';
    }

    get options() {
        return {
            k: this._k,
            min: this._min,
            max: this._max,
            width: this._width,
        };
    }

    get count() {
        return this._n;
    }

    get frequencies() {
        return this._frequencies;
    }

    get labels() {
        return this._labels;
    }
}


module.exports.Histogram = Histogram;
