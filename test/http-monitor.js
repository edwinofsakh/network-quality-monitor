const expect = require('chai').expect;
const { HttpMonitor } = require('../utils/http-monitor');

describe('HttpMonitor', () => {
  describe('constructor', () => {
    it('should support default settings', () => {
      const monitor = new HttpMonitor();
      expect(monitor.options.timeout).to.be.equal(2000);
    });
  });
});
