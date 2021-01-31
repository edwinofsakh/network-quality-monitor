const expect = require('chai').expect;
const { Histogram } = require('../utils/histogram');

describe('Histogram', () => {
    describe('constructor', () => {
        it('should support empty parameters', () => {
            const hist = new Histogram();
            expect(hist.options.k).to.equal(100);
            expect(hist.options.min).to.equal(0);
            expect(hist.options.max).to.equal(100);
            expect(hist.options.width).to.equal(1);
        });

        it('should support custom parameters', () => {
            const hist = new Histogram(-100, 100, 10);
            expect(hist.options.k).to.equal(10);
            expect(hist.options.min).to.equal(-100);
            expect(hist.options.max).to.equal(100);
            expect(hist.options.width).to.equal(20);
        });

        it('should support custom labels', () => {
            const hist = new Histogram(0, 10, 2, ['0', '1', '2']);
            expect(hist.labels).to.deep.equal(['0', '1', '2']);
        });
    });

    describe('update', () => {
        it('should increase count', () => {
            const hist = new Histogram();
            expect(hist.count).to.equal(0);
            hist.update(1);
            expect(hist.count).to.equal(1);
        });

        it('should increase right frequency', () => {
            const hist = new Histogram(0, 100, 10);
            
            expect(hist.frequencies[0]).to.equal(0);
            hist.update(-1);
            hist.update(-2);
            expect(hist.frequencies[0]).to.equal(2);

            expect(hist.frequencies[1]).to.equal(0);
            hist.update(0);
            hist.update(1);
            hist.update(2);
            expect(hist.frequencies[1]).to.equal(3);

            expect(hist.frequencies[10]).to.equal(0);
            hist.update(98);
            hist.update(99);
            expect(hist.frequencies[10]).to.equal(2);

            expect(hist.frequencies[11]).to.equal(0);
            hist.update(100);
            hist.update(200);
            expect(hist.frequencies[11]).to.equal(2);
        });
    });

    describe('percentile', () => {
        it('should return five lines', () => {
            const hist = new Histogram(0, 100, 20);
            hist.update(15);
            hist.update(20);
            hist.update(35);
            hist.update(40);
            hist.update(50);
            expect(hist.percentile(10)).to.equal(15);
            expect(hist.percentile(50)).to.equal(35);
            expect(hist.percentile(90)).to.equal(50);
        });
    });
});
