const ping = require('net-ping');
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const logUpdate = require('log-update');

const SUCCESS = 'Success';
const MAX_PING = 60000;
const FRAMES = ['-', '\\', '|', '/'];

class PingLogger {
    constructor(target, options) {
        if (!target) {
            throw Error('Target is undefined');
        }

        if (!this._isValidTarget(target)) {
            throw Error(`Invalid target: ${target}`);
        }

        this.frame = 0;
        this.target = target;
        this.options = options;

        this.last = 'NA';
        this.stats = new PingStatistics();

        if (this.options.save) {
            this.filename = 'ping-log-' + this.target + '-' + Date.now() + '.csv';
            this.writer = csvWriter({ headers: ["Sent", "Received", "Ping", "Status", "Message"] });
            this.stream = fs.createWriteStream(this.filename);
            this.writer.pipe(this.stream);
            this.writer.on('finish', () => {
                console.log('All writes are now complete.');
            });    
        } else {
            this.filename = '';
            this.writer = null;
            this.stream = null;
        }
    }

    start() {
        this._printSettings();
        this._initialize();
        this._pingHost();

        setInterval(() => this._pingHost(), this.options.interval);
        setInterval(() => {
            this.frame = ++this.frame % FRAMES.length;
            this._printStatus()
        }, 100);
    }

    _isValidTarget(target) {
        return target.indexOf('.') !== -1;
    }

    _getSessionOptions() {
        let options = {
            timeout: this.options.timeout,
            retries: 0,
        };

        return options;
    }

    _initialize() {
        this.session = ping.createSession(this._getSessionOptions());
        logUpdate.clear();
        console.log(`${(new Date()).toISOString()}: New session (${this.session.sessionId}) was created`);

        this.session.on('error', (error) => {
            logUpdate.clear();
            
            if (error) {
                console.log(`${(new Date()).toISOString()}: ${error.message}`);
            } else {
                console.log(`${(new Date()).toISOString()}: Unknown socket error`);
            }
            
            this.session.close();
        });

        this.session.on('close', () => {
            logUpdate.clear();
            console.log(`${(new Date()).toISOString()}: Session (${this.session.sessionId}) was closed`);
        });
    }

    _pingHost() {
        this.session.pingHost(this.target, (error, _target, sent, received) => {
            const ping = received - sent;
            const status = error ? error.constructor.name : 'Success';
            const message = error ? error.message.trim() : 'Done';
            this.last = `${status} - ${message} - ${ping}ms`;
            this.stats.update(status, ping);
            this._printStatus();

            if (this.options.save) {
                this.writer.write([sent.toISOString(), received.toISOString(), ping + 'ms', status, message]);
            }
        });
    }

    _printSettings() {
        console.log('');
        
        console.log(`Monitor ping to ${this.target}.`);
        console.log(`Options: ${JSON.stringify(this.options)}`);
        
        if (this.options.save) {
            console.log(`Results will be saved to "${this.filename}" file.`);
        }
        
        console.log('');
    }

    _printStatus() {
        logUpdate(`\n${FRAMES[this.frame]} Monitoring\nLast Response: ${this.last}\n${this.stats.print()}`);
    }
}

class PingStatistics {
    constructor() {
        this.sent = 0;

        this.min = MAX_PING;
        this.max = 0;
        this.avg = new MovingAverageCalculator();

        this.status = {
            'Success': 0,
            'RequestTimedOutError': 0,
            'DestinationUnreachableError': 0,
            'PacketTooBigError': 0,
            'ParameterProblemError': 0,
            'RedirectReceivedError': 0,
            'SourceQuenchError': 0,
            'TimeExceededError': 0,
        }
    }

    update(status, ping) {
        this.sent++;

        if (status === SUCCESS) {
            this.status[status]++;

            this.min = Math.min(this.min, ping);
            this.max = Math.max(this.max, ping);
            this.avg.update(ping);
        } else {
            if (!this.status[status]) {
                this.status[status] = 0;
            }
            
            this.status[status]++;
        }      
    }

    print() {
        const ping = `Ping: min ${this.min}ms, avg ${this.avg.count ? Math.round(this.avg.mean): 'NA'}ms, max ${this.max}ms`;
        const sent = `Number of requests: ${this.sent}`
        const n = this.sent.toFixed(0).length;
        const responses = `Responses:\n` + Object.keys(this.status).map((key) => this._formatStatus(key, n)).join('');
        return `\n${ping}\n\n${sent}\n${responses}`;
    }

    _formatStatus(key, n) {
        const percent = (this.status[key]/this.sent*100).toFixed(0);
        return ` - ${key.padEnd(28, ' ')}: ${(this.status[key]).toString().padStart(n, ' ')} (${(percent).toString().padStart(3, ' ')}%)\n`
    }
}

class MovingAverageCalculator {
    constructor() {
        this.count = 0
        this._mean = 0
    }

    update(newValue) {
        this.count++

        const differential = (newValue - this._mean) / this.count

        const newMean = this._mean + differential

        this._mean = newMean
    }

    get mean() {
        this.validate()
        return this._mean
    }

    validate() {
        if (this.count == 0) {
            throw new Error('Mean is undefined')
        }
    }
}

module.exports = PingLogger;
