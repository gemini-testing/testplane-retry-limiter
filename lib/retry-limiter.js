'use strict';

module.exports = class RetryLimiter {
    static create(limit) {
        return new RetryLimiter(limit);
    }

    constructor(limit) {
        this._limit = limit;
        this._retriedTestsCount = 0;

        this.totalTestsCount = 0;
    }

    isOverLimit() {
        return ++this._retriedTestsCount / this.totalTestsCount > this._limit;
    }
};
