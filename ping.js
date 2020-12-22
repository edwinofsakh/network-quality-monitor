const ping = require('net-ping');
const fs = require('fs');
const clear = require('clear');
const csvWriter = require('csv-write-stream');

class PingLogger {
    constructor(target, interval, options) {
        this.target = target;
        this.interval = interval;
        this.options = options;

        this.filename = 'ping-log-' + this.target + '-' + Date.now() + '.csv';
        this.stats = new PingStatistics();
        this.writer = csvWriter({ headers: ["Sent", "Received", "Ping", "Status"] });
        this.stream = fs.createWriteStream(this.filename);
        this.writer.pipe(this.stream);

        this.writer.on('finish', () => {
            console.log('All writes are now complete.');
        });

        this.intervalId = null;
    }

    start() {
        this.restart();

        this.ping();

        this.intervalId = setInterval(() => this.ping(), interval);
    }

    restart () {
        this.session = ping.createSession(options);
        console.log('Session created.');

        this.session.on('error', (error) => {
            console.error('Session error:', error);
            this.session.close();
        });

        this.session.on('close', () => {
            console.log('Session closed.');
            this.restart();
        });
    }

    ping() {
        this.session.pingHost(this.target, (error, _target, sent, received) => {
            const ping = received - sent;
            const status = error ? error.message.trim() : 'Success';
            this.writer.write([sent.toISOString(), received.toISOString(), ping + 'ms', status]);
            this.stats.update(status, ping);
        });
    }

    finish() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.writer.end();
    }
}

class PingStatistics {
    constructor() {
        this.total = 0;
        this.success = 0;
        this.failed = 0;
        this.min = MAX_PING;
        this.max = 0;

        this.avg = new MovingAverageCalculator();
    }

    update(status, ping) {
        this.total++;

        if (status !== 'Success') {
            this.failed++;
        } else {
            this.success++;
            this.min = Math.min(this.min, ping);
            this.max = Math.max(this.max, ping);
            this.avg.update(ping);
        }

        this.print(status, ping);
    }

    print(status, ping) {
        clear();
        const sentStat = `Total:${this.total}, Success:${this.success}, Failed:${this.failed}`;
        const pingStat = `Min:${this.min}ms, Avg:${Math.round(this.avg.mean)}ms, Max:${this.max}ms, Current:${ping}ms`;
        console.log(`${sentStat} - ${pingStat} - ${status}`);
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

if (process.argv.length < 4) {
    console.log('usage: node ping <target> <interval>');
    process.exit(-1);
}

const MAX_PING = 2000;

const target = process.argv[2];
let interval = process.argv[3];

if (!isValidTarget(target)) {
    console.log(`invalid target: ${target}`);
    process.exit(-1);
}

if (!isValidInterval(interval)) {
    console.log(`invalid interval: ${interval}`);
    process.exit(-1);
} else {
    interval = parseInt(interval, 10);
}

const options = {
    retries: 0,
    timeout: 2000
};

const logger = new PingLogger(target, options);
logger.start();

function exitHandler(options, exitCode) {
    logger.finish();

    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

function isValidTarget(target) {
    return target.indexOf('.') !== -1;
}

function isValidInterval(interval) {
    try {
        const i = parseInt(interval, 10);
        return i > 0;
    } catch (e) {
        return false;
    }
}
