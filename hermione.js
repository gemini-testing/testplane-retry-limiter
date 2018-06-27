'use strict';

const ConfigDecorator = require('./lib/config-decorator');
const parseOpts = require('./lib/plugin-opts');
const RetryLimiter = require('./lib/retry-limiter');

module.exports = (hermione, opts) => {
    if (hermione.isWorker()) {
        return;
    }

    opts = parseOpts(opts);
    if (!opts.enabled) {
        return;
    }

    const retryRuleAfterLimit = () => false;
    const configDecorator = ConfigDecorator.create(hermione.config, retryRuleAfterLimit);

    let retryLimiter;

    hermione.on(hermione.events.AFTER_TESTS_READ, (collection) => {
        let totalTestsCount = 0;
        collection.eachTest((test) => test.pending || ++totalTestsCount);

        retryLimiter = RetryLimiter.create(opts.limit, totalTestsCount);
    });

    hermione.on(hermione.events.RETRY, function retryCallback() {
        if (!retryLimiter.exceedLimit()) {
            return;
        }

        configDecorator.disableRetries();
        hermione.removeListener(hermione.events.RETRY, retryCallback);
    });
};
