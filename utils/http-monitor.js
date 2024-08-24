const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const { exit } = require('node:process');
const { GeneralMonitor } = require('./monitor');

/**
 * The options of http monitor.
 * @typedef {object} HttpMonitorOptions
 * @property {string} configFile - Path to request config file.
 * @property {number} threshold - Maximum task execution time in milliseconds.
 * @property {number} timeout - Maximum task execution time in milliseconds.
 * @property {number} interval - Interval between tests in milliseconds.
 * @property {number} period - Period to aggregate statistics in minutes.
 */

class RequestTimedOutError extends Error {
  constructor() {
    super('Request timed out');
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

const DEFAULT_TARGET = 'https://network-tools.herokuapp.com/time';

/**
 * HttpMonitor class
 *
 * Events: start, stop, error, close, update, period
 */
class HttpMonitor extends GeneralMonitor {
  /** @type {string} */
  _requestTarget;
  /** @type {https.RequestOptions} */
  _requestOptions;
  /** @type {unknown} */
  _requestData;

  /**
   * Creates ping monitor.
   * @param {string} [target] - target url
   * @param {Partial<HttpMonitorOptions>} [options] - monitor options
   */
  constructor(target, options) {
    super(options);

    this._prefix = 'http-monitor';

    /** @type {Partial<HttpMonitorOptions>} */
    this._options = { ...super.options };

    const config = this._parseRequestConfig(target, options?.configFile);
    this._requestTarget = config.requestTarget;
    this._requestOptions = config.requestOptions;
    this._requestData = config.requestData;

    // http client
    const isSSL = this._requestTarget.includes('https');
    this._client = isSSL ? https : http;

    this.on('start', () => {});

    this.on('stop', () => {});
  }

  get target() {
    return this._requestTarget;
  }

  /**
   * Starts ping monitor.
   */
  start() {
    super.start((cb) => this._load(cb));
  }

  /**
   * Sends request.
   * @param {Function} cb - callback
   */
  _load(cb) {
    const sent = new Date();
    let wasCalled = false;

    /**
     * Next function.
     * @param {Error | null} err - error
     * @param {Date} sent - sent timestamp
     * @param {Date} received - received timestamp
     */
    const next = (err, sent, received) => {
      if (!wasCalled) {
        wasCalled = true;
        cb(err, sent, received);
      }
    };

    setTimeout(() => {
      next(new RequestTimedOutError(), sent, new Date());
    }, this._options.timeout);

    /**
     * Handle response callback.
     * @param {http.IncomingMessage} res - response
     */
    const onResponseCallback = (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];

      let error;
      // Any 2xx status code signals a successful response but
      // here we're only checking for 200.
      if (statusCode === 301) {
        console.log('Redirect', res.headers.location);
        exit(0);
      } else if (statusCode !== 200) {
        error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
      } else if (!contentType || !(contentType.indexOf('application/json') > -1 || contentType !== 'text/html')) {
        error = new Error(`Invalid content-type.\nExpected application/json or text/html but received ${contentType}`);
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
    };

    /**
     * Handle error callback.
     * @param {Error} error - error
     */
    const onErrorCallback = (error) => {
      next(error, sent, new Date());
    };

    const req = this._client
      .request(this._requestTarget, this._requestOptions, onResponseCallback)
      .on('error', onErrorCallback);
    if (this._requestData) req.write(this._requestData);
    req.end();
  }

  /**
   * Parses request configuration.
   * @param {string | undefined} target - request target url
   * @param {string | undefined} configPath - path to config file
   * @returns {{ requestTarget: string, requestOptions: https.RequestOptions, requestData?: unknown }}
   */
  _parseRequestConfig(target, configPath) {
    /** @type {https.RequestOptions} */
    const requestOptions = {
      method: 'get',
    };

    if (!configPath) {
      if (!target) {
        console.log('Use default target');
        return { requestTarget: DEFAULT_TARGET, requestOptions };
      } else {
        return { requestTarget: target, requestOptions };
      }
    }

    try {
      const configFile = fs.readFileSync(configPath);
      const config = JSON.parse(configFile.toString());

      const requestTarget = this._parseTarget(config.target, target);

      if (config.keepAlive) {
        const isSSL = requestTarget.includes('https');
        const keepAliveAgent = isSSL ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });
        requestOptions.agent = keepAliveAgent;
      }

      if (config.method) requestOptions.method = config.method;
      if (config.headers) requestOptions.headers = config.headers;

      const requestData = config.data;

      return { requestTarget, requestOptions, requestData };
    } catch (error) {
      throw new Error(`Failed to read request config file "${configPath}".`);
    }
  }

  /**
   * Parses request target.
   * @param {string | undefined} configTarget - target from config file
   * @param {string | undefined} argumentTarget -target from cli arguments
   * @returns {string} request target
   */
  _parseTarget(configTarget, argumentTarget) {
    if (configTarget && argumentTarget) {
      console.log('Use target from config file');
    } else if (!configTarget && !argumentTarget) {
      console.log('Use default target');
    }
    return configTarget || argumentTarget || DEFAULT_TARGET;
  }
}

module.exports.HttpMonitor = HttpMonitor;
