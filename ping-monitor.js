const fs = require('fs');
const path = require('path');
const ping = require('net-ping');
const csvWriter = require('csv-write-stream');
const { DelayStatistics } = require('./utils/statistics');
const { ConsoleApplication } = require('./utils/console');

const SUCCESS = 'Success';

class PingMonitor extends ConsoleApplication {
    constructor(target, options) {
        super();
        this._target = target || '1.1.1.1';
        this._options = options;

        this._lastResponse = 'NA';

        this._sent = 0;
        this._delay = new DelayStatistics(200, 8);

        this._statuses = {};

        this._session = null;

        this._filename = '';
        this._writer = null;
        this._stream = null;

        if (this._options.save) {
            this._filename = path.join('.', 'results', `ping-monitor-${this._target}-${Date.now()}.csv`);
        }

        // Task interval handler
        this._taskLoop = null;

        // Render interval handler
        this._renderLoop = null;
    }

    /**
     * Starts ping monitor.
     */
    start() {
        this._printSettings();
        this._initWriter();
        this._initSession();

        // Starts ping cycle.
        this._pingTarget();
        this._taskLoop = setInterval(() => this._pingTarget(), this._options.interval);

        // Starts rendering cycle.
        this._renderLoop = setInterval(() => this._render(), this._spf);
    }

    stop() {
        if (this._taskLoop) clearInterval(this._taskLoop);
        if (this._renderLoop) clearInterval(this._renderLoop);
        if (this._writer) this._writer.end();
        if (this._session) this._session.close();
    }

    /**
     * Prints settings.
     */
    _printSettings() {
        this._print('');

        if (this._options.verbose) {
            this._print(`Options: ${JSON.stringify(this._options)}`);
        }

        if (this._options.save) {
            this._print(`Results will be saved to "${this._filename}".`);
        }

        this._print('');
        this._print('Session Log:');
    }

    /**
     * Initializes CSV writer.
     */
    _initWriter() {
        if (!this._options.save) return;

        const dir = path.join('.', 'results');

        try {
            fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        } catch (err) {
            if (err.code === 'ENOENT') {
                fs.mkdirSync(dir);
            } else {
                this._print('Can not save results due to error: ' + err.message)
                this._options.save = false;
            }
        }

        if (!this._options.save) return;

        this._writer = csvWriter({ headers: ["Sent", "Received", "Ping", "Status", "Message"] });
        this._stream = fs.createWriteStream(this._filename);
        this._writer.pipe(this._stream);
        this._writer.on('finish', () => {
            this._print('All writes are now complete.');
        });
    }

    /**
     * Initializes ping session.
     */
    _initSession() {
        this._session = ping.createSession({ timeout: this._options.timeout, retries: 0 });
        this._clear();
        this._log('New session was created');

        this._session.on('error', (error) => {
            this._clear();

            if (error) {
                this._log(`(Error) ${error.message}`);
            } else {
                this._log('(Error) Unknown socket error');
            }

            this._session.close();
        });

        this._session.on('close', () => {
            this._clear();
            this._log('Session was closed');
        });
    }

    /**
     * Pings target ip.
     */
    _pingTarget() {
        this._session.pingHost(this._target, (error, _target, sent, received) => {
            const ping = received - sent;
            const status = error ? error.constructor.name : 'Success';
            const message = error ? error.message.trim() : 'Done';
            this._lastResponse = `${status} - ${message} - ${ping}ms`;
            this._updateStatistics(status, ping);

            if (this._options.save) {
                this._writer.write([sent.toISOString(), received.toISOString(), ping + 'ms', status, message]);
            }
        });
    }

    /**
     * Prepares console output.
     * @returns {string} - console output
     */
    _prepareOutput() {
        let prefix = this._printSpinner();

        if (this._options.verbose) {
            prefix += ` ${this._printDebugInfo()}`;
        }

        return `\n${prefix} Ping Monitor for ${this._target}\nLast Response: ${this._lastResponse}\n${this._printStatistics()}`;
    }

    /**
     * Updates ping statistics.
     * @param {string} status - status text
     * @param {number} ping - ping in milliseconds
     */
    _updateStatistics(status, ping) {
        this._sent++;

        this._statuses[status] = (this._statuses[status] || 0) + 1;

        if (status === SUCCESS) {
            this._delay.update(ping);
        }
    }

    /**
     * Prints ping statistics.
     * @returns {string} - statistics text
     */
    _printStatistics() {
        const ping = `Ping: ${this._delay.text}`;
        const sent = `Number of requests: ${this._sent}`;
        const n = this._sent.toFixed(0).length;
        const responses = `Responses:\n` + Object.keys(this._statuses).map(key => this._printStatus(key, n)).join('');

        if (this._options.histogram) {
            const hist = `${this._delay.histogram.print()}`;
            return `\n${ping}\n${hist}\n\n${sent}\n${responses}`;
        } else {
            return `\n${ping}\n\n${sent}\n${responses}`;
        }
    }

    /**
     * Prints status.
     * @param {string} key - status key
     * @param {number} n - padding
     * @returns {string} - status text
     */
    _printStatus(key, n) {
        const percent = (this._statuses[key] / this._sent * 100).toFixed(1);
        return ` - ${key.padEnd(28, ' ')}: ${(this._statuses[key]).toString().padStart(n, ' ')} (${(percent).toString().padStart(5, ' ')}%)\n`
    }
}

module.exports = PingMonitor;
