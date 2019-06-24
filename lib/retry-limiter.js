'use strict';

module.exports = class RetryLimiter {
    static create(limit, totalTestsCount) {
        return new RetryLimiter(limit, totalTestsCount);
    }

    constructor(limit, totalTestsCount) {
        this._limitTestsCount = Math.ceil(limit * totalTestsCount);
        console.info(`retry-limiter: with limit ${limit} will stop retrying tests after ${this._limitTestsCount} failed tests`);

        this._retriedTestsCount = 0;
    }

    exceedLimit() {
        return ++this._retriedTestsCount > this._limitTestsCount;
    }
};
