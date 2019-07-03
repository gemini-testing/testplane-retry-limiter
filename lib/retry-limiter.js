'use strict';

const logger = require('./logger');

module.exports = class RetryLimiter {
    static create(limit, totalTestsCount) {
        return new RetryLimiter(limit, totalTestsCount);
    }

    constructor(limit, totalTestsCount) {
        this._limitTestsCount = Math.ceil(limit * totalTestsCount);
        logger.info(`with limit ${limit} will stop retrying tests after ${this._limitTestsCount} retries`);

        this._retriedTestsCount = 0;
    }

    exceedLimit() {
        return ++this._retriedTestsCount > this._limitTestsCount;
    }
};
