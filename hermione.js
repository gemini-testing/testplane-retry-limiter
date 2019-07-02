'use strict';

const ConfigDecorator = require('./lib/config-decorator');
const parseOpts = require('./lib/plugin-opts');
const RetryLimiter = require('./lib/retry-limiter');
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

    let retryLimiter;

    hermione.on(hermione.events.AFTER_TESTS_READ, (collection) => {
        let totalTestsCount = 0;
        collection.eachTest((test) => test.pending || test.disabled || ++totalTestsCount);

        retryLimiter = RetryLimiter.create(opts.limit, totalTestsCount);
    });

    hermione.on(hermione.events.RETRY, function retryCallback() {
        if (!retryLimiter.exceedLimit()) {
            return;
        }

        configDecorator.disableRetries();
        hermione.removeListener(hermione.events.RETRY, retryCallback);
    });

    if (Number.isFinite(opts.setRetriesOnTestFail)) {
        logger.info(`will set retries to ${opts.setRetriesOnTestFail} after the first failed test`);
        hermione.once(hermione.events.TEST_FAIL, () => configDecorator.setRetries(opts.setRetriesOnTestFail));
    }
};
