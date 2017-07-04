'use strict';

const ConfigDecorator = require('./lib/config-decorator');
const parseOpts = require('./lib/plugin-opts');
const RetryLimiter = require('./lib/retry-limiter');

module.exports = (hermione, opts) => {
    opts = parseOpts(opts);

    if (!opts.enabled) {
        return;
    }

    const configDecorator = ConfigDecorator.create(hermione.config);

    let retryLimiter;
    let totalTestsCount = 0;
    // Files with tests are reread on retries
    // and we do not need to increment a counter
    // of a total tests count on retries
    let hasBegun = false;

    hermione.on(hermione.events.AFTER_FILE_READ, (data) => {
        return !hasBegun && data.suite.eachTest((test) => !test.pending && ++totalTestsCount);
    });
    hermione.on(hermione.events.BEGIN, () => {
        retryLimiter = RetryLimiter.create(opts.limit, totalTestsCount);
        hasBegun = true;
    });
    hermione.on(hermione.events.RETRY, () => retryLimiter.exceedLimit() && configDecorator.disableRetries());
};
