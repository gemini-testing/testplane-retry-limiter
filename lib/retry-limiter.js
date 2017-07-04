'use strict';

module.exports = class RetryLimiter {
    static create(limit, totalTestsCount) {
        return new RetryLimiter(limit, totalTestsCount);
    }

    constructor(limit, totalTestsCount) {
        this._limit = limit;
        this._totalTestsCount = totalTestsCount;

        this._retriedTestsCount = 0;
    }

    exceedLimit() {
        return ++this._retriedTestsCount / this._totalTestsCount > this._limit;
    }
};
