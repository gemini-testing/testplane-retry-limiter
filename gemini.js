'use strict';

const _ = require('lodash');
const ConfigDecorator = require('./lib/config-decorator');
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
    gemini.on(gemini.events.RETRY, () => retryLimiter.exceedLimit() && configDecorator.disableRetries());
};

function getTotalTestsCount(suiteCollection) {
    return _.sumBy(suiteCollection.allSuites(), (suite) => {
        return suite.states.length * _.sumBy(suite.browsers, (browser) => !suite.shouldSkip(browser));
    });
}
