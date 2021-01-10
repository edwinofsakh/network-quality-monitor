const http = require('http');
const https = require('https');
const logUpdate = require('log-update');
const { DelayStatistic } = require('./utils/statistic');
const chart = require('./utils/chart');

const SPINNER = ['-', '\\', '|', '/'];
const LABELS = ['(-∞, 0.0)', '[0.0,0.2)', '[0.2,0.4)', '[0.4,0.6)', '[0.6,0.8)', '[0.8,1.0)', '[1.0,1.2)', '[1.2,1.4)', '[1.4,1.6)', '[1.6,1.8)', '[2.0, +∞)'];

/**
 * Trims line to console width.
 * @param {string} line - original line
 * @return {string} - trimmed line
 */
function trimLine(line) {
    const n = process.stdout.columns;
    return line.length >= n ? (line.substring(0, n - 1) + "░") : line;
}

class HttpMonitor {
    constructor(target, options) {
        // Target url
        this._target = target || 'https://network-tools.herokuapp.com/';

        // Options
        this._options = options;

        // Http client
        this._client = this._target.includes('https') ? https : http;

        // Response delay statistics
        this._delay = new DelayStatistic(2000, 10, LABELS);

        // Status text
        this._text = 'Loading...\n';

        // Number of sent requests
        this._sent = 0;
        
        // Number of received responses
        this._received = 0;

        // Number of failed requests
        this._failed = 0;

        // Current spinner frame
        this._frame = 0;
        
        // Seconds per frame
        this._spf = 250;

        // Rendering time as a text
        this._rending = '[...ms]';
    }

    /**
     * Starts http monitor.
     */
    start() {
        // Start target loading cycle.
        this._loadTarget();

        setInterval(() => {
            this._loadTarget();
        }, this._options.interval);

        // Start output update cycle.
        setInterval(() => {
            this._nextFrame();
            this._renderFrame();
        }, this._spf);
    }

    /**
     * Load target url and update statistics.
     */
    _loadTarget() {
        const sent = Date.now();
        this._sent++;

        this._client.get(this._target, (res) => {
            this._received++;

            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200) {
                error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
            } else if (!(contentType === 'application/json' || contentType === 'text/html')) {
                error = new Error(`Invalid content-type.\nExpected application/json or text/html but received ${contentType}`);
            }

            if (error) {
                this._failed++;
                logUpdate.clear();
                console.log(`${(new Date()).toISOString()}: (Error) ${error.message}`);
                // Consume response data to free up memory
                res.resume();
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                const finished = Date.now();
                this._delay.update((finished - sent));
                this._text = `HTTP Monitor for ${this._target}\n`;
                this._text += `Data received: ${rawData.length}\n`;
                this._text += `Sent: ${this._sent}, Received: ${this._received}, Failed: ${this._failed}\n`
                this._text += `Request time: ${this._delay.text}\n`;
                if (this._options.histogram) {
                    this._text += `${this._delay.histogram.print()}\n`;
                }
            });
        }).on('error', (error) => {
            this._failed++;
            logUpdate.clear();
            console.log(`${(new Date()).toISOString()}: (Error) ${error.message}`);
        });
    }

    /**
     * Returns console width double line.
     * @returns {string} - line
     */
    _getRule() {
        return '═'.repeat(process.stdout.columns);
    }

    /**
     * Prepare console output.
     * @returns {string} - console output
     */
    _prepareOutput() {
        let prefix = SPINNER[this._frame];

        if (this._options.verbose) {
            prefix += ` ${this._rending} [${process.stdout.columns}x${process.stdout.rows}]`;
        }

        const lines = (`${prefix} ${this._text}`).split(/\r\n|\r|\n/);

        if (this._options.chart) {
            let output = `${this._getRule()}\n${lines.map(trimLine).join('\n')}Chart\n${chart.prepare(this._delay)}\n${this._getRule()}`;
    
            if (this._options.fullscreen) {
                const n = process.stdout.rows - output.split(/\r\n|\r|\n/).length - 1;
                for (let i = 0; i < n; i++) {
                    output += '\n';
                }
            }

            return output;
        } else {
            return lines.map(trimLine).join('\n');
        }
    }

    /**
     * Updates spinner frame.
     */
    _nextFrame() {
        this._frame = ++this._frame % SPINNER.length;
    }

    /**
     * Update console output.
     */
    _renderFrame() {
        const start = Date.now();
        logUpdate(this._prepareOutput());
        const end = Date.now();
        this._rending = `[${(end - start).toFixed(0).padStart(3, ' ')}ms]`;
    }
}

module.exports = HttpMonitor;
