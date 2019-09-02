'use strict';

const ConfigDecorator = require('./lib/config-decorator');
const parseOpts = require('./lib/plugin-opts');
const Limiter = require('./lib/limiter');
const logger = require('./lib/logger');

module.exports = (hermione, opts) => {
    if (hermione.isWorker()) {
        return;
    }

    opts = parseOpts(opts);
    if (!opts.enabled) {
        return;
    }

    const configDecorator = ConfigDecorator.create(hermione.config);

    let limiter;

    hermione.on(hermione.events.AFTER_TESTS_READ, (collection) => {
        let totalTestsCount = 0;
        collection.eachTest((test) => test.pending || test.disabled || ++totalTestsCount);

        limiter = Limiter.create(totalTestsCount, {limit: opts.limit, timeLimit: opts.timeLimit});
    });

    if (Number.isFinite(opts.timeLimit)) {
        logger.info(`will stop retrying tests after ${opts.timeLimit} seconds`);

        hermione.once(hermione.events.TEST_BEGIN, () => limiter.startCountdown());
        hermione.on(hermione.events.TEST_BEGIN, testBeginCallback);
    }

    hermione.on(hermione.events.RETRY, retryCallback);

    if (Number.isFinite(opts.setRetriesOnTestFail)) {
        logger.info(`will set retries to ${opts.setRetriesOnTestFail} after the first failed test`);
        hermione.once(hermione.events.TEST_FAIL, () => configDecorator.setRetries(opts.setRetriesOnTestFail));
    }

    function testBeginCallback() {
        limiter.exceedTimeLimit() && disableRetries();
    }

    function retryCallback() {
        limiter.exceedRetriesLimit() && disableRetries();
    }

    function disableRetries() {
        configDecorator.disableRetries();
        hermione.removeListener(hermione.events.TEST_BEGIN, testBeginCallback);
        hermione.removeListener(hermione.events.RETRY, retryCallback);
    }
};
