'use strict';

const logger = require('./logger');

const {MS_PER_SEC} = require('./constants');

module.exports = class Limiter {
    static create(totalTestsCount, opts) {
        return new Limiter(totalTestsCount, opts);
    }

    constructor(totalTestsCount, {limit, timeLimit}) {
        this._limitTestsCount = Math.ceil(limit * totalTestsCount);
        this._retriedTestsCount = 0;
        logger.info(`with limit ${limit} will stop retrying tests after ${this._limitTestsCount} retries`);

        this._startTime = Infinity;
        this._timeLimit = timeLimit * MS_PER_SEC;
    }

    startCountdown() {
        this._startTime = new Date();
    }

    exceedRetriesLimit() {
        return ++this._retriedTestsCount > this._limitTestsCount;
    }

    exceedTimeLimit() {
        const currentTime = new Date();

        return (currentTime - this._startTime) > this._timeLimit;
    }
};
