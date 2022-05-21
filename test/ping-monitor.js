const expect = require('chai').expect;
const sinon = require('sinon');
const { PingMonitor } = require('../utils/ping-monitor');

describe('PingMonitor', () => {
  describe('constructor', () => {
    it('should support default settings', () => {
      const monitor = new PingMonitor();
      expect(monitor.target).to.be.equal('1.1.1.1');
      expect(monitor.options.timeout).to.be.equal(2000);
      expect(monitor.options.interval).to.be.equal(2000);
      expect(monitor.options.period).to.be.equal(15);
    });

    it('should support custom settings', () => {
      const monitor = new PingMonitor('8.8.8.8', {
        timeout: 1000,
        interval: 3000,
        period: 5,
      });
      expect(monitor.target).to.be.equal('8.8.8.8');
      expect(monitor.options.timeout).to.be.equal(1000);
      expect(monitor.options.interval).to.be.equal(3000);
      expect(monitor.options.period).to.be.equal(5);
    });
  });

  describe('start', () => {
    it('should emit start event', () => {
      const onStart = sinon.spy();
      const monitor = new PingMonitor();
      monitor.on('start', onStart);
      monitor.start();
      expect(onStart.calledOnce).to.be.true;
      monitor.stop();
    });
  });

  describe('stop', () => {
    it('should emit stop, close events', () => {
      const onStop = sinon.spy();
      const onClose = sinon.spy();
      const monitor = new PingMonitor();
      monitor.on('stop', onStop);
      monitor.on('close', onClose);
      monitor.start();
      monitor.stop();
      expect(onStop.calledOnce).to.be.true;
      expect(onClose.calledOnce).to.be.true;
    });
  });
});
