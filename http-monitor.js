const http = require('http');
const https = require('https');

const chart = require('./utils/chart');
const { DelayStatistic } = require('./utils/statistic');
const { ConsoleApplication } = require('./utils/console');

const LABELS = ['(-∞, 0.0)', '[0.0,0.2)', '[0.2,0.4)', '[0.4,0.6)', '[0.6,0.8)', '[0.8,1.0)', '[1.0,1.2)', '[1.2,1.4)', '[1.4,1.6)', '[1.6,1.8)', '[2.0, +∞)'];

class HttpMonitor extends ConsoleApplication {
    constructor(target, options) {
        super();

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
    }

    /**
     * Starts http monitor.
     */
    start() {
        // Starts target loading cycle.
        this._loadTarget();
        setInterval(() => this._loadTarget(), this._options.interval);

        // Starts rendering cycle.
        setInterval(() => this._render(), this._spf);
    }

    /**
     * Loads target url and update statistics.
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
                this._clear();
                this._log(`(Error) ${error.message}`);
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
            this._clear();
            this._log(`(Error) ${error.message}`);
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

        const lines = (`${prefix} ${this._text}`).split(/\r\n|\r|\n/);

        if (this._options.chart) {
            const hr = this._printHorizontalRule();
            let output = `${hr}\n${lines.map(i => this._trimLine(i)).join('\n')}Chart\n${chart.prepare(this._delay)}\n${hr}`;
    
            if (this._options.fullscreen) {
                const n = process.stdout.rows - output.split(/\r\n|\r|\n/).length - 1;
                for (let i = 0; i < n; i++) {
                    output += '\n';
                }
            }

            return output;
        } else {
            return lines.map(i => this._trimLine(i)).join('\n');
        }
    }
}

module.exports = HttpMonitor;
