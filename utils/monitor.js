
const EventEmitter = require('events').EventEmitter;
const { DelayStatistics } = require('./statistics');

const SUCCESS = 'Success';

/**
 * @callback taskCallback
 * @param {Error} err - error
 * @param {Date} start - start time
 * @param {Date} end - end time
 */

/**
 * @callback taskFunction
 * @param {taskCallback} cb - callback
 */

/**
 * The options of monitor.
 * @typedef {object} MonitorOptions
 * @property {number} threshold - Maximum task execution time in milliseconds.
 * @property {number} timeout - Maximum task execution time in milliseconds.
 * @property {number} interval - Interval between tests in milliseconds.
 * @property {number} period - Period to aggregate statistics in minutes.
 */

/**
 * This class helps you keep track of the execution time of task.
 * 
 * Events: start, stop, error, update, period
 */
class GeneralMonitor extends EventEmitter {
    /**
     * 
     * @param {MonitorOptions} options - monitor options
     */
    constructor(options) {
        super();

        // monitor options
        this._options = Object.assign({threshold: 500, timeout: 2000, interval: 2000, period: 15}, options || {});

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
        return this._last;
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
     * 
     * @param {taskFunction} task - task to execute
     */
    start(task) {
        if (!this._running) {
            this._running = true;
            this.emit('start');
            this._execute(task);
            this._taskInterval = setInterval(() => this._execute(task), this._options.interval);
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
     * @param {taskFunction} task - task callback
     */
    _execute(task) {
        this._executing = true;
        task((error, start, end) => {
            this._executing = false;
            const time = end - start;
            let status = error ? error.constructor.name : 'Success';
            const message = error ? error.message.trim() : 'Done';

            if (status === 'Error') {
                status = 'UnexpectedError';
            }

            this._updateStatistics(start, time, status, message);
        });
    }

    /**
     * Updates ping statistics.
     * @param {Date} start - request sent date
     * @param {number} time - execution time in milliseconds
     * @param {string} status - response status
     * @param {string} message - response message
     */
    _updateStatistics(start, time, status, message) {
        // Update overall statistics
        this._overall.sent++;

        if (status === SUCCESS) {
            this._overall.received++;
            this._overall.stats.update(time);
        } else {
            this._overall.lost++;
            this._overall.errors[status] = (this._overall.errors[status] || 0) + 1;
        }

        // Update recent statistics
        const now = Date.now();
        this._last = {start, time, status, message};
        this._buffer.push(this._last);
        this._buffer = this._buffer.filter(item => item.start >= (now - this._options.period * 60000));

        let delays = [];
        this._recent.sent = 0;
        this._recent.received = 0;
        this._recent.lost = 0;
        this._recent.errors = {};

        this._buffer.forEach(item => {
            this._recent.sent++;
            if (item.status === SUCCESS) {
                this._recent.received++;
                delays.push(item.time);
            } else {
                this._recent.lost++;
                this._recent.errors[item.status] = (this._recent.errors[item.status] || 0) + 1;
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
