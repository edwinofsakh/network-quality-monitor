const http = require('http');
const https = require('https');
const { GeneralMonitor } = require('./monitor');

class RequestTimedOutError extends Error {
  constructor() {
    super('Request timed out');
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

/**
 * HttpMonitor class
 *
 * Events: start, stop, error, close, update, period
 */
class HttpMonitor extends GeneralMonitor {
  /**
   * Creates ping monitor
   * @param {string} target - target ip address
   * @param {object} options - monitor options
   */
  constructor(target, options) {
    super(options);

    // target url
    this._target = target || 'https://network-tools.herokuapp.com/time';

    // http client
    this._client = this._target.includes('https') ? https : http;

    this.on('start', () => {});

    this.on('stop', () => {});
  }

  get prefix() {
    return 'http-monitor';
  }

  get target() {
    return this._target;
  }

  /**
   * Starts ping monitor
   */
  start() {
    super.start((cb) => this._load(cb));
  }

  /**
   *
   * @param {Function} cb
   */
  _load(cb) {
    const sent = new Date();
    let wasCalled = false;

    const next = (err, sent, received) => {
      if (!wasCalled) {
        wasCalled = true;
        cb(err, sent, received);
      }
    };

    setTimeout(() => {
      next(new RequestTimedOutError(), sent, new Date());
    }, this._options.timeout);

    this._client
      .get(this._target, (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];

        let error;
        // Any 2xx status code signals a successful response but
        // here we're only checking for 200.
        if (statusCode !== 200) {
          error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
        } else if (!(contentType.indexOf('application/json') > -1 || contentType === 'text/html')) {
          error = new Error(
            `Invalid content-type.\nExpected application/json or text/html but received ${contentType}`
          );
        }

        if (error) {
          // Consume response data to free up memory
          res.resume();
          next(error, sent, new Date());
          return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          next(null, sent, new Date());
        });
      })
      .on('error', (error) => {
        next(error, sent, new Date());
      });
  }
}

module.exports.HttpMonitor = HttpMonitor;
