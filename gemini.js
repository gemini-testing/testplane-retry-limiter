'use strict';

const _ = require('lodash');
const ConfigDecorator = require('./lib/gemini-config-decorator');
const parseOpts = require('./lib/plugin-opts');
const RetryLimiter = require('./lib/retry-limiter');

module.exports = (gemini, opts) => {
    opts = parseOpts(opts);

    if (!opts.enabled) {
        return;
    }

    const configDecorator = ConfigDecorator.create(gemini.config);

    let retryLimiter;

    gemini.on(gemini.events.BEGIN, (data) => {
        retryLimiter = RetryLimiter.create(opts.limit, getTotalTestsCount(data.suiteCollection));
    });
    gemini.on(gemini.events.RETRY, function retryCallback() {
        if (!retryLimiter.exceedLimit()) {
            return;
        }

        configDecorator.disableRetries();
        gemini.removeListener(gemini.events.RETRY, retryCallback);
    });
};

function getTotalTestsCount(suiteCollection) {
    return _.sumBy(suiteCollection.allSuites(), (suite) => {
        return suite.states.length * _.sumBy(suite.browsers, (browser) => !suite.shouldSkip(browser));
    });
}
