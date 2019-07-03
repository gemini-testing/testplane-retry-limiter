'use strict';

module.exports = class ConfigDecorator {
    static create(config) {
        return new ConfigDecorator(config);
    }

    constructor(config) {
        this._config = config;

        this._disabledRetries = false;
    }

    setRetries(retriesCount) {
        !this._disabledRetries && this._config.getBrowserIds().forEach((browserId) => {
            const browserConfig = this._config.forBrowser(browserId);

            browserConfig.shouldRetry = ({retriesLeft}) => {
                return browserConfig.retry - retriesLeft < retriesCount;
            };
        });

        if (!retriesCount) {
            this._disabledRetries = true;
        }
    }

    disableRetries() {
        this.setRetries(0);
    }
};
