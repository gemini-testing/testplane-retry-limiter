'use strict';

const ConfigDecorator = require('./lib/config-decorator');
const parseOpts = require('./lib/plugin-opts');
const Limiter = require('./lib/limiter');
const logger = require('./lib/logger');

module.exports = (testplane, opts) => {
    if (testplane.isWorker()) {
        return;
    }

    opts = parseOpts(opts);
    if (!opts.enabled) {
        return;
    }

    const configDecorator = ConfigDecorator.create(testplane.config);

    let limiter;

    testplane.on(testplane.events.AFTER_TESTS_READ, (collection) => {
        let totalTestsCount = 0;
        collection.eachTest((test) => test.pending || test.disabled || ++totalTestsCount);

        limiter = Limiter.create(totalTestsCount, {limit: opts.limit, timeLimit: opts.timeLimit});
    });

    if (Number.isFinite(opts.timeLimit)) {
        logger.info(`will stop retrying tests after ${opts.timeLimit} seconds`);

        testplane.once(testplane.events.TEST_BEGIN, () => limiter.startCountdown());
        testplane.on(testplane.events.TEST_BEGIN, testBeginCallback);
    }

    testplane.on(testplane.events.RETRY, retryCallback);

    if (Number.isFinite(opts.setRetriesOnTestFail)) {
        logger.info(`will set retries to ${opts.setRetriesOnTestFail} after the first failed test`);
        testplane.once(testplane.events.TEST_FAIL, () => configDecorator.setRetries(opts.setRetriesOnTestFail));
    }

    function testBeginCallback() {
        limiter.exceedTimeLimit() && disableRetries();
    }

    function retryCallback() {
        limiter.exceedRetriesLimit() && disableRetries();
    }

    function disableRetries() {
        configDecorator.disableRetries();
        testplane.removeListener(testplane.events.TEST_BEGIN, testBeginCallback);
        testplane.removeListener(testplane.events.RETRY, retryCallback);
    }
};
