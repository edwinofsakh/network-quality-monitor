
const logUpdate = require('log-update');

const SPINNER = ['-', '\\', '|', '/'];

class ConsoleApplication {
    constructor(spf) {
        // Current spinner frame
        this._frame = 0;
        
        // Seconds per frame
        this._spf = spf || 250;

        // Rendering time
        this._rendering = 0;
    }

    /**
     * Trims line to console width.
     * @param {string} line - original line
     * @return {string} - trimmed line
     */
    _trimLine(line) {
        const n = process.stdout.columns;
        return line.length >= n ? (line.substring(0, n - 1) + "░") : line;
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
        return `${this._printRenderingTime()} ${this._printFPS()} ${this._printConsoleSize()}`;
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
     * Logs message with timestamp.
     * @param {string} msg - message
     */
    _log(msg) {
        console.log(` ${(new Date()).toISOString()}: ${msg}`);
    }
    
    /**
     * Print message.
     * @param {string} msg - message
     */
    _print(msg) {
        console.log(msg);
    }

    /**
     * Clears log update.
     * @param {string} msg - message
     */
    _clear() {
        logUpdate.clear();
    }

    /**
     * Prepares updated console output.
     * @abstract
     */
    _prepareOutput() {
        return 'Loading...';
    }

    /**
     * Renders console output.
     */
    _render() {
        const start = Date.now();
        this._frame = ++this._frame % SPINNER.length;
        logUpdate(this._prepareOutput());
        const end = Date.now();
        this._rendering = end - start;
    }
}

module.exports.ConsoleApplication = ConsoleApplication;
