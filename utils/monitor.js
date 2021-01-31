
const EventEmitter = require('events').EventEmitter;
const { DelayStatistics } = require('./statistics');

const SUCCESS = 'Success';

/**
 * Events: start, stop, error, update, period
 */
class GeneralMonitor extends EventEmitter {
    /**
     * 
     * @param {object} options - monitor options
     */
    constructor(options) {
        super();

        // monitor options
        this._options = Object.assign({timeout: 2000, interval: 2000, period: 15}, options || {});

        // overall statistics
        this._overall = {
            sent: 0,
            received: 0,
            lost: 0,
            stats: new DelayStatistics(this._options.timeout, 500),
            errors: {}
        }

        // statistics for last n minutes
        this._recent = {
            sent: 0,
            received: 0,
            lost: 0,
            stats: {},
            errors: {}
        };

        // buffer for recent responses
        this._buffer = [];

        // monitoring started time
        this._started = new Date();

        // period index
        this._period = Math.ceil(this._started / (this._options.period * 60000));

        // task interval handler
        this._taskInterval = null;
    }

    get last() {
        return this._buffer[this._buffer.length - 1];
    }

    get overall() {
        return this._overall;
    }

    get recent() {
        return this._recent;
    }

    get options() {
        return this._options;
    }

    /**
     * Starts monitoring.
     */
    start(cb) {
        if (!this._running) {
            this._running = true;
            this.emit('start');
            this._executeTask(cb);
            this._taskInterval = setInterval(() => this._executeTask(cb), this._options.interval);
        } else {
            this.emit('error', new Error('Monitor is already started'));
        }
    }

    /**
     * Stops monitoring.
     */
    stop() {
        if (this._running) {
            this._running = false;
            this.emit('stop');
            if (this._taskInterval) {
                clearInterval(this._taskInterval);
                this._taskInterval = null;
            }
        } else {
            this.emit('error', new Error('Monitor is already stopped'));
        }
    }

    /**
     * Executes task.
     */
    _executeTask(cb) {
        this._executing = true;
        cb((error, start, end) => {
            this._executing = false;
            const time = end - start;
            let status = error ? error.constructor.name : 'Success';
            const message = error ? error.message.trim() : 'Done';

            if (status === 'Error') {
                status = 'UnexpectedError';
            }

            this._updateStatistics(start.getTime(), time, status, message);
        });
    }

    /**
     * Updates ping statistics.
     * @param {string} sent - request sent date
     * @param {number} ping - response delay in milliseconds
     * @param {string} status - response status
     * @param {string} message - response message
     */
    _updateStatistics(sent, ping, status, message) {
        // Update overall statistics
        this._overall.sent++;

        if (status === SUCCESS) {
            this._overall.received++;
            this._overall.stats.update(ping);
        } else {
            this._overall.lost++;
            this._overall.errors[status] = (this._overall.errors[status] || 0) + 1;
        }

        // Update recent statistics
        const now = Date.now();
        this._buffer.push([sent, ping, status, message]);
        this._buffer = this._buffer.filter(item => item[0] >= (now - this._options.period * 60000));

        let delays = [];
        this._recent.sent = 0;
        this._recent.received = 0;
        this._recent.lost = 0;
        this._recent.errors = {};

        this._buffer.forEach(item => {
            this._recent.sent++;
            if (item[2] === SUCCESS) {
                this._recent.received++;
                delays.push(item[1]);
            } else {
                this._recent.lost++;
                this._recent.errors[item[2]] = (this._recent.errors[item[2]] || 0) + 1;
            }
        });

        this._recent.stats = DelayStatistics.stats(delays);

        this.emit('update');

        // Update period statistics
        if (now > this._period * this._options.period * 60000) {
            this._period++;
            this.emit('period');
        }
    }
}

module.exports.GeneralMonitor = GeneralMonitor;
