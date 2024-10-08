const ping = require('net-ping');
const { GeneralMonitor } = require('./monitor');

/**
 * PingMonitor class
 *
 * Events: start, stop, error, close, update, period
 */
class PingMonitor extends GeneralMonitor {
  /**
   * Creates ping monitor.
   * @param {string} [target] - target ip address
   * @param {object} [options] - monitor options
   */
  constructor(target, options) {
    super(options);

    // target ip address
    this._target = target || '1.1.1.1';

    // session instance
    this._session = null;

    this.on('start', () => {
      this._session = this._createSession();
    });

    this.on('stop', () => {
      if (this._session) {
        this._session.close();
        this._session = null;
      }
    });
  }

  get prefix() {
    return 'ping-monitor';
  }

  get target() {
    return this._target;
  }

  /**
   * Starts ping monitor.
   */
  start() {
    super.start((cb) => this._ping(cb));
  }

  /**
   * Pings target ip address.
   * @param {import("./monitor").TaskCallback} cb - callback
   */
  _ping(cb) {
    this._session.pingHost(
      this._target,
      /**
       * Handles event.
       * @param {Error} error - error
       * @param {string} _target - target
       * @param {Date} sent - sent timestamp
       * @param {Date} received - received timestamp
       * @returns
       */
      (error, _target, sent, received) => cb(error, sent, received)
    );
  }

  /**
   * Creates session instance.
   */
  _createSession() {
    const options = {
      networkProtocol: ping.NetworkProtocol.IPv4,
      packetSize: 32,
      retries: 0,
      timeout: this._options.timeout,
      ttl: 128,
    };

    const session = ping.createSession(options);

    session.on(
      'error',
      /**
       * Handles error.
       * @param {Error} error - error
       */
      (error) => {
        this.emit('error', error || new Error('Unknown socket error'));
        this._session.close();
      }
    );

    session.on('close', () => {
      this.emit('close');
    });

    return session;
  }
}

module.exports.PingMonitor = PingMonitor;
