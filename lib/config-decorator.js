'use strict';

module.exports = class ConfigDecorator {
    static create(config, retryRule) {
        return new ConfigDecorator(config, retryRule);
    }

    constructor(config, retryRule) {
        this._config = config;
        this._retryRule = retryRule;
    }

    disableRetries() {
        this._config.getBrowserIds().forEach((browserId) => {
            this._config.forBrowser(browserId).shouldRetry = this._retryRule;
        });
    }
};
