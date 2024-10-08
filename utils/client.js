const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-write-stream');
const logUpdate = require('log-update');
const utils = require('./index');
const chart = require('./chart');
const { GeneralMonitor } = require('./monitor');

const SPINNER = ['-', '\\', '|', '/'];

/**
 * ConsoleClient options
 * @typedef {object} ConsoleClientOptions
 * @property {boolean} testing - testing flag
 */

/**
 * ConsoleClient class
 */
class ConsoleClient {
  /**
   * @param {Partial<ConsoleClientOptions>} options - client options
   */
  constructor(options) {
    // Current spinner frame
    this._frame = 0;

    // Seconds per frame
    this._spf = 250;

    // Rendering time
    this._rendering = 0;

    // Test mode
    this._testing = options.testing !== undefined ? options.testing : false;
  }

  /**
   * Trims line to console width.
   * @param {string} line - original line
   * @return {string} - trimmed line
   */
  _trimLine(line) {
    const n = process.stdout.columns;
    return line.length >= n ? line.substring(0, n - 1) + '░' : line;
  }

  /**
   * Returns console-width line.
   * @returns {string} - horizontal rule
   */
  _printHorizontalRule() {
    return '═'.repeat(process.stdout.columns);
  }

  /**
   * Returns spinner.
   * @returns {string} - spinner
   */
  _printSpinner() {
    return SPINNER[this._frame];
  }

  /**
   * Returns debug information: rendering time, fps and console size.
   * @returns {string} - debug information
   */
  _printDebugInfo() {
    return `${this._printRenderingTime()} ${this._printFPS()} ${this._printConsoleSize()} ${this._printMemoryUsage()}`;
  }

  /**
   * Returns fps.
   * @returns {string} - fps
   */
  _printFPS() {
    return `[${(1000 / this._spf).toFixed(0).padStart(2, ' ')}fps]`;
  }

  /**
   * Returns rendering time.
   * @returns {string} - rendering time in milliseconds
   */
  _printRenderingTime() {
    return `[${this._rendering.toFixed(0).padStart(3, ' ')}ms]`;
  }

  /**
   * Returns console size.
   * @returns {string} - width x height
   */
  _printConsoleSize() {
    return `[${process.stdout.columns}x${process.stdout.rows}]`;
  }

  /**
   * Returns memory usage.
   * @returns {string} - memory usage
   */
  _printMemoryUsage() {
    return `[${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1).padStart(5)}Mb]`;
  }

  /**
   * Logs message with timestamp.
   * @param {string} msg - message
   */
  _log(msg) {
    this._print(` ${new Date().toISOString()}: ${msg}`);
  }

  /**
   * Prints message.
   * @param {string} msg - message
   */
  _print(msg) {
    if (!this._testing) {
      logUpdate.clear();
      console.log(msg);
    }
  }

  /**
   * Clears log update.
   */
  _clear() {
    logUpdate.clear();
  }

  /**
   * Prints table.
   * @param {number[]} sizes - width of columns
   * @param {string} space - space symbol
   * @param {string} joint - join symbol
   * @param {string} line - new line symbol
   * @param {string[][]} table  - 2d array of strings
   * @returns {string} - text
   */
  _printTable(sizes, space, joint, line, table) {
    return table
      .map((row, i) => {
        return row
          .map((col, j) => {
            return j === 0 ? col.padEnd(sizes[0], space) : col.padStart(sizes[j], space);
          })
          .join(joint);
      })
      .join(line);
  }

  /**
   * Prepares updated console output.
   * @abstract
   * @returns {string} - text
   */
  _prepareOutput() {
    return 'Loading...';
  }

  /**
   * Renders console output.
   */
  _render() {
    const start = Date.now();

    this._frame = Math.floor(start / this._spf) % SPINNER.length;

    if (!this._testing) {
      logUpdate(this._prepareOutput());
    }
    const end = Date.now();
    this._rendering = end - start;
  }

  /**
   * Prints padded number.
   * @param {number} value - value
   * @param {number} precision - precision
   * @param {number} size - size
   * @returns {string} - text
   */
  _printNumber(value, precision, size) {
    return value.toFixed(precision).padStart(size, ' ');
  }

  /**
   * Prints percentage.
   * @param {number} value - frequency
   * @param {number} total - total number
   * @param {number} precision - precision
   * @returns {string} - text
   */
  _printPercent(value, total, precision) {
    return ((value / total) * 100).toFixed(precision).padStart(4 + precision, ' ');
  }
}

class MonitorWriter {
  /**
   * @param {string} prefix - prefix
   * @param {string[]} headers - headers
   */
  constructor(prefix, headers) {
    this._headers = headers;
    this._dir = path.join('.', 'results');
    this._filename = path.join('.', 'results', `${prefix}-${Date.now()}.csv`);
    this._writer = null;
    this._stream = null;
  }

  get filename() {
    return this._filename;
  }

  init() {
    let failed = false;
    try {
      fs.accessSync(this._dir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      if (err && typeof err == 'object' && 'code' in err && err.code === 'ENOENT') {
        fs.mkdirSync(this._dir);
      } else {
        failed = true;
      }
    }

    if (!failed) {
      this._writer = csvWriter({ headers: this._headers });
      this._stream = fs.createWriteStream(this._filename);
      this._writer.pipe(this._stream);
    }
  }

  /**
   * Writes values.
   * @param {unknown[]} values
   */
  write(values) {
    if (this._writer) {
      this._writer.write(values);
    }
  }

  /**
   * Ends writing.
   */
  end() {
    if (this._writer) {
      this._writer.end();
    }
  }
}

/**
 * MonitorClient options
 * @typedef {object} MonitorClientOptions
 * @property {boolean} save - save data
 * @property {boolean} chart - show chart
 * @property {boolean} verbose - verbose flag 
 * @property {boolean} testing - testing flag
 */

/**
 * MonitorClient class
 */
class MonitorClient extends ConsoleClient {
  /**
   * @param {GeneralMonitor} monitor - monitor instance
   * @param {Partial<MonitorClientOptions>} options - client options
   */
  constructor(monitor, options) {
    super(options);

    this._options = options;
    this._monitor = monitor;
    this._sending = false;

    this._monitor.on('error', (err) => {
      this._log(`(Error) ${err.message}`);
    });

    this._monitor.on('start', () => {
      if (this._writer) this._writer.init();
      this._printSettings();

      // Starts rendering cycle.
      this._renderLoop = setInterval(() => (this._sending ? '' : this._render()), this._spf);
    });

    this._monitor.on('stop', () => {
      if (this._renderLoop) clearInterval(this._renderLoop);
      if (this._writer) this._writer.end();
    });

    this._monitor.on('update', () => {
      this._render();
    });

    this._monitor.on('period', () => {
      this._onPeriod();
      this._render();
    });

    this._periodLabel = `Last ${utils.getNumberText(this._monitor.options.period, 'min', 'mins')}`;

    const headers = ['Date', 'Sent', 'Lost', 'Min', 'Mdn', 'Avg', '90%', '95%', '99%', 'Max'];
    this._writer = this._options.save ? new MonitorWriter(this._monitor.prefix, headers) : null;
  }

  /**
   * Starts client.
   */
  start() {
    this._monitor.start(() => {});
  }

  /**
   * Prints settings.
   */
  _printSettings() {
    const opt = this._monitor.options;

    this._print('');
    this._print(`${this._monitor.constructor.name} for ${this._monitor.target}`);
    this._print(`Interval=${opt.interval}ms, Timeout=${opt.timeout}ms, Period=${opt.period}m`);
    if (this._writer) {
      this._print(`Results: ${this._writer.filename}`);
    }
    this._print(`Log:`);
    this._log(`Started`);
  }

  /**
   * Prepares console output.
   */
  _onPeriod() {
    const r = this._monitor.recent;
    if (!r.stats) return;

    const mdn = Math.floor(r.stats.mdn ?? 0);
    const p90 = Math.floor(r.stats.p90 ?? 0);
    this._log(
      `Packets sent ${r.sent} (${((r.lost / r.sent) * 100).toFixed(1)}% loss), Latency mdn = ${mdn}ms, 90% = ${p90}ms`
    );

    if (this._writer) {
      const values = [r.stats.min, r.stats.mdn, r.stats.avg, r.stats.p90, r.stats.p95, r.stats.p99, r.stats.max].map(
        (i) => i.toFixed(1)
      );
      this._writer.write([new Date().toISOString(), r.sent, r.lost].concat(values));
    }
  }

  /**
   * Prepares console output.
   * @returns {string} - console output
   */
  _prepareOutput() {
    if (!this._monitor.overall.received && !this._monitor.overall.lost) {
      return 'Waiting for response...';
    }

    const spinner = this._printSpinner();
    const debug = this._options.verbose ? ' ' + this._printDebugInfo() : '';

    const latency = this._prepareLatencyOutput();
    const packets = this._preparePacketsOutput();
    const errors = this._prepareErrorsOutput();

    const last = this._monitor.last;
    const response = last ? ` ${last.status} - ${last.time}ms` : '';
    const realtime = this._options.chart ? `\nRealtime Chart\n${chart.prepare(this._monitor.overall.stats)}` : '';
    const output = `\n${latency}\n\n${packets}\n\n${errors}\n${realtime}\n${spinner}${debug}${response}`;
    return output;
  }

  /**
   * Prepares latency statistics output.
   * @returns {string} - text
   */
  _prepareLatencyOutput() {
    const recentStats = this._monitor.recent.stats;
    const overallStats = this._monitor.overall.stats;
    if (!recentStats || !overallStats) return '';

    const width = Math.max(5, this._monitor.overall.stats.max.toFixed(0).length);
    /** @type {('min' | 'mdn'| 'avg' | 'p90' | 'p95' | 'p99' | 'max')[]} */
    const stats = ['min', 'mdn', 'avg', 'p90', 'p95', 'p99', 'max'];

    return this._printTable([18, width, width, width, width, width, width, width], ' ', ' ', '\n', [
      ['Latency (ms)', 'min', 'mdn', 'avg', '90%', '95%', '99%', 'max'],
      ['    ' + this._periodLabel, ...stats.map((i) => recentStats[i].toFixed(0))],
      ['    Overall', ...stats.map((i) => overallStats[i].toFixed(0))],
    ]);
  }

  /**
   * Prepares packets statistics output.
   * @returns {string} - text
   */
  _preparePacketsOutput() {
    const width = Math.max(
      9,
      this._monitor.recent.sent.toFixed(0).length,
      this._monitor.overall.sent.toFixed(0).length
    );

    return this._printTable([18, width, width, width, 11], ' ', ' ', '\n', [
      ['Packets', 'sent', 'received', 'lost', ''],
      ['    ' + this._periodLabel, ...this._getPacketStats(this._monitor.recent)],
      ['    Overall', ...this._getPacketStats(this._monitor.overall)],
    ]);
  }

  /**
   * Returns packets statistics.
   * @param {import("./monitor").OverallStatistics | import("./monitor").RecentStatistics} data
   * @returns {string[]} - packets statistics
   */
  _getPacketStats(data) {
    return [
      data.sent.toFixed(0),
      data.received.toFixed(0),
      data.lost.toFixed(0),
      `(${((data.lost / data.sent) * 100).toFixed(1)}% loss)`,
    ];
  }

  /**
   * Prepares errors statistics output.
   * @returns {string} - text
   */
  _prepareErrorsOutput() {
    const c = Math.max(13, this._monitor.overall.lost.toFixed(0).length);

    const results = this._monitor.overall.lost
      ? Object.keys(this._monitor.overall.errors).map((key) => {
          const recent = this._monitor.recent.errors[key] || 0;
          const overall = this._monitor.overall.errors[key] || 0;
          const recentPercent = this._monitor.recent.lost ? (recent / this._monitor.recent.lost) * 100 : 0;
          const overallPercent = this._monitor.overall.lost ? (recent / this._monitor.overall.lost) * 100 : 0;
          return [
            '    ' + key,
            `${recent.toFixed(0)} (${recentPercent.toFixed(1).padStart(5, ' ')}%)`,
            `${overall.toFixed(0)} (${overallPercent.toFixed(1).padStart(5, ' ')}%)`,
          ];
        })
      : [['', 'N/A', 'N/A']];

    return this._printTable([32, c, c], ' ', ' ', '\n', [['Errors', this._periodLabel, 'Overall']].concat(results));
  }
}

module.exports.ConsoleClient = ConsoleClient;
module.exports.MonitorClient = MonitorClient;
