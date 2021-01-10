const fs = require('fs');
const path = require('path');
const ping = require('net-ping');
const csvWriter = require('csv-write-stream');
const logUpdate = require('log-update');
const { DelayStatistic } = require('./utils/statistic');

const SUCCESS = 'Success';
const FRAMES = ['-', '\\', '|', '/'];

class PingMonitor {
    constructor(target, options) {
        this._target = target || '1.1.1.1';
        this._options = options;

        this._last = 'NA';

        this._sent = 0;
        this._delay = new DelayStatistic(200, 8);

        this._statuses = {
            'Success': 0,
            'RequestTimedOutError': 0,
            'DestinationUnreachableError': 0,
            'PacketTooBigError': 0,
            'ParameterProblemError': 0,
            'RedirectReceivedError': 0,
            'SourceQuenchError': 0,
            'TimeExceededError': 0,
        }
        
        this._filename = '';
        this._writer = null;
        this._stream = null;

        if (this._options.save) {
            this._filename = path.join('.', 'results', `ping-monitor-${this._target}-${Date.now()}.csv`);
        }

        this._frame = 0;
        this._spf = 250;
        this._rendering = '[...ms]';
    }

    start() {
        this._printSettings();
        this._openLogFile();
        this._initialize();
        this._pingHost();

        setInterval(() => this._pingHost(), this._options.interval);
        setInterval(() => {
            this._frame = ++this._frame % FRAMES.length;
            this._printStatus();
        }, this._spf);
    }

    _openLogFile() {
        if (!this._options.save) return;

        const dir = path.join('.', 'results');

        try {
            fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        } catch (err) {
            if (err.code === 'ENOENT') {
                fs.mkdirSync(dir);
            } else {
                console.log('Can not save results due to error: ' + err.message)
                this._options.save = false;
            }
        }

        if (!this._options.save) return;

        this._writer = csvWriter({ headers: ["Sent", "Received", "Ping", "Status", "Message"] });
        this._stream = fs.createWriteStream(this._filename);
        this._writer.pipe(this._stream);
        this._writer.on('finish', () => {
            console.log('All writes are now complete.');
        });
    }

    _getSessionOptions() {
        let options = {
            timeout: this._options.timeout,
            retries: 0,
        };

        return options;
    }

    _initialize() {
        this.session = ping.createSession(this._getSessionOptions());
        logUpdate.clear();
        console.log(`${(new Date()).toISOString()}: New session was created`);

        this.session.on('error', (error) => {
            logUpdate.clear();

            if (error) {
                console.log(`${(new Date()).toISOString()}: (Error) ${error.message}`);
            } else {
                console.log(`${(new Date()).toISOString()}: (Error) Unknown socket error`);
            }

            this.session.close();
        });

        this.session.on('close', () => {
            logUpdate.clear();
            console.log(`${(new Date()).toISOString()}: Session was closed`);
        });
    }

    _pingHost() {
        this.session.pingHost(this._target, (error, _target, sent, received) => {
            const ping = received - sent;
            const status = error ? error.constructor.name : 'Success';
            const message = error ? error.message.trim() : 'Done';
            this._last = `${status} - ${message} - ${ping}ms`;
            this._update(status, ping);

            if (this._options.save) {
                this._writer.write([sent.toISOString(), received.toISOString(), ping + 'ms', status, message]);
            }
        });
    }

    _printSettings() {
        console.log('');

        if (this._options.verbose) {
            console.log(`Options: ${JSON.stringify(this._options)}`);
        }

        if (this._options.save) {
            console.log(`Results will be saved to "${this._filename}".`);
        }

        console.log('');
        console.log('Session Log:');
    }

    _printStatus() {
        const start = Date.now();
        let prefix = FRAMES[this._frame];

        if (this._options.verbose) {
            prefix += ` ${this._rendering}`;
        }

        logUpdate(`\n${prefix} Ping Monitor for ${this._target}\nLast Response: ${this._last}\n${this._print()}`);
        const end = Date.now();
        this._rendering = `[${(end - start).toFixed(0).padStart(3, ' ')}ms]`;
    }

    _update(status, ping) {
        this._sent++;

        if (status === SUCCESS) {
            this._statuses[status]++;
            this._delay.update(ping);
        } else {
            if (!this._statuses[status]) {
                this._statuses[status] = 0;
            }
            this._statuses[status]++;
        }
    }

    _print() {
        const ping = `Ping: ${this._delay.text}`;
        const sent = `Number of requests: ${this._sent}`;
        const n = this._sent.toFixed(0).length;
        const responses = `Responses:\n` + Object.keys(this._statuses).map((key) => this._formatStatus(key, n)).join('');

        if (this._options.histogram) {
            const hist = `${this._delay.histogram.print()}`;
            return `\n${ping}\n${hist}\n\n${sent}\n${responses}`;
        } else {
            return `\n${ping}\n\n${sent}\n${responses}`;
        }
    }

    _formatStatus(key, n) {
        const percent = (this._statuses[key] / this._sent * 100).toFixed(1);
        return ` - ${key.padEnd(28, ' ')}: ${(this._statuses[key]).toString().padStart(n, ' ')} (${(percent).toString().padStart(5, ' ')}%)\n`
    }
}

module.exports = PingMonitor;
