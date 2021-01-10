const expect = require('chai').expect;
const { Statistic } = require('../utils/statistic');

describe('Statistic', () => {
    describe('constructor', () => {
        it('should support empty parameters', () => {
            const stat = new Statistic();
            expect(stat.count).to.equal(0);
        });

        it('should support custom parameters', () => {
            const stat = new Statistic(-100, 100, 10, 10);
            expect(stat.count).to.equal(0);
        });
    });

    describe('update', () => {
        it('should increase count', () => {
            const stat = new Statistic();
            expect(stat.count).to.equal(0);
            stat.update(1);
            expect(stat.count).to.equal(1);
        });

        it('should change min value', () => {
            const stat = new Statistic();
            
            stat.update(0);
            expect(stat.min).to.equal(0);

            stat.update(-1);
            expect(stat.min).to.equal(-1);

            stat.update(100);
            expect(stat.min).to.equal(-1);
        });

        it('should change max value', () => {
            const stat = new Statistic();
            
            stat.update(0);
            expect(stat.max).to.equal(0);

            stat.update(-1);
            expect(stat.max).to.equal(0);

            stat.update(100);
            expect(stat.max).to.equal(100);
        });
    });

    describe('text', () => {
        it('should return min, avg, max', () => {
            const stat = new Statistic();
            stat.update(0);
            stat.update(1);
            stat.update(2);
            expect(stat.text).to.equal(`min 0, avg 1, max 2`);
        });
    });
});
