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
    const retryLimiter = RetryLimiter.create(opts.limit);

    gemini.on(gemini.events.BEGIN, (data) => retryLimiter.totalTestsCount = getTotalTestsCount(data.suiteCollection));
    gemini.on(gemini.events.RETRY, () => retryLimiter.isOverLimit() && configDecorator.disableRetries());
};

function getTotalTestsCount(suiteCollection) {
    return _.sumBy(suiteCollection.allSuites(), (suite) => suite.states.length * suite.browsers.length);
}
