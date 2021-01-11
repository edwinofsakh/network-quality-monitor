const expect = require('chai').expect;
const PingMonitor = require('../ping-monitor');

describe('PingMonitor', () => {
    describe('start', () => {
        it('should create monitor', () => {
            const pingMonitor = new PingMonitor(null, {timeout: 2000, interval: 2000});
            expect(pingMonitor).to.be.an.instanceof(PingMonitor);
        });
    });

    describe('start', () => {
        it('should create monitor', () => {
            expect(() => {
                const pingMonitor = new PingMonitor(null, {timeout: 2000, interval: 2000});
                pingMonitor.start(() => {});
                pingMonitor.stop();
            }).to.not.throw();
        });
    });
});
