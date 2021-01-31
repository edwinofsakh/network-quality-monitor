const expect = require('chai').expect;
const sinon = require('sinon');
const { GeneralMonitor } = require('../utils/monitor');

describe('GeneralMonitor', () => {
    describe('constructor', () => {
        it('should have start and stop methods', () => {
            const monitor = new GeneralMonitor();
            expect(monitor).to.be.an.instanceof(GeneralMonitor);
            expect(monitor.start).to.be.a('function');
            expect(monitor.stop).to.be.a('function');
        });

        it('should support default settings', () => {
            const monitor = new GeneralMonitor();
            expect(monitor).to.be.an.instanceof(GeneralMonitor);
            expect(monitor.options.timeout).to.be.equal(2000);
            expect(monitor.options.interval).to.be.equal(2000);
            expect(monitor.options.period).to.be.equal(15);
        });

        it('should support custom settings', () => {
            const monitor = new GeneralMonitor({ timeout: 1000, interval: 3000, period: 5 });
            expect(monitor.options.timeout).to.be.equal(1000);
            expect(monitor.options.interval).to.be.equal(3000);
            expect(monitor.options.period).to.be.equal(5);
        });

        it('should support partial custom settings', () => {
            const monitor = new GeneralMonitor({ timeout: 1000 });
            expect(monitor.options.timeout).to.be.equal(1000);
            expect(monitor.options.interval).to.be.equal(2000);
            expect(monitor.options.period).to.be.equal(15);
        });
    });

    describe('start', () => {
        beforeEach(() => {
            this.clock = sinon.useFakeTimers();
            this.monitor = new GeneralMonitor({ timeout: 1000, interval: 1000, period: 1 });
        });

        afterEach(() => {
            this.monitor.stop();
            this.clock = sinon.restore();
        });

        it('should execute task immediately after start', () => {
            const spy = sinon.spy();
            this.monitor.start(spy);
            expect(spy.calledOnce).to.be.true;
        });

        it('should throws error if already started', () => {
            this.monitor.start(cb => cb(null, new Date(), new Date()));
            expect(() => {
                this.monitor.start(cb => cb(null, new Date(), new Date()));
            }).to.throw(Error, 'Monitor is already started');
        });

        it('should throw error if task is not function', () => {
            expect(() => {
                this.monitor.start(true);
            }).to.throw();
        });

        it('should not emit update event if task did not call callback', () => {
            const spy = sinon.spy();
            this.monitor.on('update', spy);
            this.monitor.start(() => {});
            expect(spy.called).to.be.false;
        });

        it('should emit start event', () => {
            const spy1 = sinon.spy();
            const spy2 = sinon.spy();
            this.monitor.on('start', spy1);
            this.monitor.on('start', spy2);
            this.monitor.start(cb => cb(null, new Date(), new Date()));
            expect(spy1.calledOnce).to.be.true;
            expect(spy2.calledOnce).to.be.true;
        });

        it('should emit update events', () => {
            const updateSpy = sinon.spy();
            this.monitor.on('update', updateSpy);
            this.monitor.start(cb => cb(null, new Date(), new Date()));
            expect(updateSpy.calledOnce).to.be.true;
            this.clock.tick(1001);
            expect(updateSpy.calledTwice).to.be.true;
        });

        it('should emit period events', () => {
            const updateSpy = sinon.spy();
            const periodSpy = sinon.spy();
            this.monitor.on('update', updateSpy);
            this.monitor.on('period', periodSpy);
            this.monitor.start(cb => cb(null, new Date(), new Date()));
            this.clock.tick(2 * 60 * 1000 + 5);
            expect(updateSpy.callCount).to.be.equal(121);
            expect(periodSpy.callCount).to.be.equal(2);
        });

        it('should emit update event for failed execution', () => {
            const onUpdate = sinon.spy();
            this.monitor.on('update', onUpdate);
            this.monitor.start(cb => cb(new Error('Test'), new Date(), new Date()));
            expect(onUpdate.calledOnce).to.be.true;
            expect(this.monitor.overall.lost).to.be.equal(1);
        });
    });

    describe('stop', () => {
        it('should emit stop event', () => {
            const spy = sinon.spy();
            const monitor = new GeneralMonitor();
            monitor.on('stop', spy);
            monitor.start(cb => cb(null, new Date(), new Date()));
            monitor.stop();
            expect(spy.calledOnce).to.be.true;
        });

        it('should emit stop event', () => {
            const spy = sinon.spy();
            const monitor = new GeneralMonitor();
            monitor.on('stop', spy);
            monitor.start(cb => cb(null, new Date(), new Date()));
            monitor.stop();
            expect(() => {
                monitor.stop();
            }).to.throws(Error, 'Monitor is already stopped');
            expect(spy.calledOnce).to.be.true;
        });
    });
});
