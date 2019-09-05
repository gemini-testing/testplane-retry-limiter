'use strict';

const _ = require('lodash');
const ConfigDecorator = require('./lib/gemini-config-decorator');
const parseOpts = require('./lib/plugin-opts');
const Limiter = require('./lib/limiter');

module.exports = (gemini, opts) => {
    opts = parseOpts(opts);

    if (!opts.enabled) {
        return;
    }

    const configDecorator = ConfigDecorator.create(gemini.config);

    let limiter;

    gemini.on(gemini.events.BEGIN, (data) => {
        limiter = Limiter.create({limit: opts.limit}, getTotalTestsCount(data.suiteCollection));
    });
    gemini.on(gemini.events.RETRY, function retryCallback() {
        if (!limiter.exceedRetriesLimit()) {
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
