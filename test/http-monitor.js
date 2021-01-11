const expect = require('chai').expect;
const HttpMonitor = require('../http-monitor');

describe('HttpMonitor', () => {
    describe('constructor', () => {
        it('should create monitor', () => {
            const options = {
                timeout: 2000,
                interval: 2000,
                results: false,
                histogram: false,
                chart: false,
                fullscreen: false,
                verbose: false
            }
            
            const httpMonitor = new HttpMonitor(null, options);
            expect(httpMonitor).to.be.an.instanceof(HttpMonitor);
        });
    });
});
