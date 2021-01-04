const chart = require('asciichart');

const DEFAULT_VALUES_SIZE = 70;

class Statistic {
    constructor(min, max) {
        this._count = 0;
        this._mean = 0;
        this._min = max;
        this._max = min;
        this._values = [];
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
      const n = this.values.length;
      if (n) {
        return chart.plot([this.values, Array(n).fill(this.mean)], this._getChartOptions());
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
        return Math.min(40, process.stdout.rows - 8);
    }
  }
  
module.exports.Statistic = Statistic;
module.exports.DelayStatistic = DelayStatistic;
