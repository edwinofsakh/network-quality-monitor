const expect = require('chai').expect;
const { Statistics } = require('../utils/statistics');

describe('Statistics', () => {
  describe('constructor', () => {
    it('should support empty parameters', () => {
      const stat = new Statistics();
      expect(stat.count).to.equal(0);
    });

    it('should support custom parameters', () => {
      const stat = new Statistics(-100, 100, 10, 10);
      expect(stat.count).to.equal(0);
    });
  });

  describe('update', () => {
    it('should increase count', () => {
      const stat = new Statistics();
      expect(stat.count).to.equal(0);
      stat.update(1);
      expect(stat.count).to.equal(1);
    });

    it('should change min value', () => {
      const stat = new Statistics();

      stat.update(0);
      expect(stat.min).to.equal(0);

      stat.update(-1);
      expect(stat.min).to.equal(-1);

      stat.update(100);
      expect(stat.min).to.equal(-1);
    });

    it('should change max value', () => {
      const stat = new Statistics();

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
      const stat = new Statistics();
      stat.update(0);
      stat.update(1);
      stat.update(2);
      expect(stat.text).to.equal(`min 0, avg 1, max 2`);
    });
  });

  describe('percentile', () => {
    it('should return right value', () => {
      const values = [15, 20, 35, 40, 50];
      expect(Statistics.percentile(values, 0)).to.equal(15);
      expect(Statistics.percentile(values, 5)).to.equal(15);
      expect(Statistics.percentile(values, 10)).to.equal(15);
      expect(Statistics.percentile(values, 30)).to.equal(20);
      expect(Statistics.percentile(values, 40)).to.equal(20);
      expect(Statistics.percentile(values, 50)).to.equal(35);
      expect(Statistics.percentile(values, 90)).to.equal(50);
      expect(Statistics.percentile(values, 100)).to.equal(50);
    });

    it('should return zero for empty list', () => {
      const values = [];
      expect(Statistics.percentile(values, 0)).to.equal(0);
      expect(Statistics.percentile(values, 50)).to.equal(0);
      expect(Statistics.percentile(values, 100)).to.equal(0);
    });

    it('should return min for p <= 0', () => {
      const values = [15, 20, 35, 40, 50];
      expect(Statistics.percentile(values, -10)).to.equal(15);
    });

    it('should return min for p >= 100', () => {
      const values = [15, 20, 35, 40, 50];
      expect(Statistics.percentile(values, 120)).to.equal(50);
    });
  });

  describe('stats', () => {
    it('should return min, p10, mdn, avg, p90, max', () => {
      const values = [15, 20, 35, 40, 50];
      const stats = Statistics.stats(values);
      expect(stats.min).to.equal(15);
      expect(stats.mdn).to.equal(35);
      expect(stats.avg).to.equal(32);
      expect(stats.p90).to.equal(50);
      expect(stats.p95).to.equal(50);
      expect(stats.p99).to.equal(50);
      expect(stats.max).to.equal(50);
    });

    it('should return zero for empty list', () => {
      const values = [];
      const stats = Statistics.stats(values);
      expect(stats.min).to.equal(0);
      expect(stats.mdn).to.equal(0);
      expect(stats.avg).to.equal(0);
      expect(stats.p90).to.equal(0);
      expect(stats.p95).to.equal(0);
      expect(stats.p99).to.equal(0);
      expect(stats.max).to.equal(0);
    });
  });
});
