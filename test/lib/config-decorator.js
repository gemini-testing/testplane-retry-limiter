'use strict';

const ConfigDecorator = require('../../lib/config-decorator');
const {createConfigStub} = require('../utils');

describe('lib/config-decorator', () => {
    describe('.create()', () => {
        it('should return an instance of a config decorator', () => {
            assert.instanceOf(ConfigDecorator.create(), ConfigDecorator);
        });
    });

    describe('.disableRetries()', () => {
        it('should extend config with "shouldRetry" function', () => {
            const config = createConfigStub({
                bro1: {},
                bro2: {shouldRetry: () => true}
            });
            const newRetryRule = () => false;
            const configDecorator = ConfigDecorator.create(config, newRetryRule);

            configDecorator.disableRetries();

            assert.equal(config.forBrowser('bro1').shouldRetry, newRetryRule);
            assert.equal(config.forBrowser('bro2').shouldRetry, newRetryRule);
        });

        it('should not modify "retry" field in config', () => {
            const config = createConfigStub({bro: {retry: 8}});
            const configDecorator = ConfigDecorator.create(config);

            configDecorator.disableRetries();

            assert.equal(config.forBrowser('bro').retry, 8);
        });
    });
});
