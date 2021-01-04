const chart = require('asciichart');

const DEFAULT_VALUES_SIZE = 100;
const DEFAULT_N_CHANNELS = 10;

class Statistic {
    constructor(min, max) {
        this._count = 0;
        this._mean = 0;
        this._min = max;
        this._max = min;

        this._values = [];

        const n = DEFAULT_N_CHANNELS;
        const step = Math.floor((max - min) / n);
        const bins = [];
        for (let i = 0; i < n; i++) {
            bins.push(min + (i + 1) * step);
        }

        this._dist = {
            n: n,
            step: step,
            min: min,
            max: min + step * n,
            channels: Array(DEFAULT_N_CHANNELS).fill(0),
            bins: bins
        }
    }

    update(newValue) {
        this._values.push(newValue);
        if (this._values.length > DEFAULT_VALUES_SIZE) {
            this._values.shift();
        }

        this._count++

        this._mean = this._mean + (newValue - this._mean) / this._count;

        this._min = Math.min(newValue, this._min);
        this._max = Math.max(newValue, this._max);

        const i = Math.floor((newValue - this._dist.min) / this._dist.step);
        if (i < 0) i = 0;
        if (i >= this._dist.n) i = this._dist.n;
        this._dist.channels[i]++;
    }

    get count() {
        return this._count;
    }

    get mean() {
        this.validate('Mean');
        return this._mean;
    }

    get min() {
        this.validate('Min');
        return this._min;
    }

    get max() {
        this.validate('Max');
        return this._max;
    }

    get values() {
        return this._values;
    }

    get dist() {
        this.validate('Dist');
        return this._dist.channels.map(i => (i / this._count * 100).toFixed(1).padStart(6, ' ') + '%').join('') + '\n'
            + this._dist.bins.map(i => (i.toFixed(0).padStart(7, ' '))).join('');
    }

    validate(name) {
        if (this._count == 0) {
            throw new Error(name + ' is undefined')
        }
    }
}

class DelayStatistic extends Statistic {
    constructor(max) {
        super(0, max);
    }

    get text() {
        return `min ${this.min.toFixed(0).padStart(4, ' ')}ms, avg ${this.mean.toFixed(0).padStart(4, ' ')}ms, max ${this.max.toFixed(0).padStart(4, ' ')}ms`;
    }

    get chart() {
        const n = Math.min(this.values.length, process.stdout.columns - 7);
        const options = this._getChartOptions();
        if (this._count && options.height > 1) {
            return chart.plot([this.values.slice(-n), Array(n).fill(this.mean)], options);
        } else {
            return '---';
        }
    }

    _getChartOptions() {
        const padding = '     ';

        return {
            padding: padding,
            height: this._getChartHeight(),
            format: (x, _i) => (padding + x.toFixed(0)).slice(-padding.length),
            colors: [chart.green, chart.default]
        };
    }

    _getChartHeight() {
        return Math.min(24, process.stdout.rows - 8 - 2);
    }
}

module.exports.Statistic = Statistic;
module.exports.DelayStatistic = DelayStatistic;
