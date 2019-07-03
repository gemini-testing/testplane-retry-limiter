'use strict';

const ConfigDecorator = require('../../lib/config-decorator');
const {createConfigStub} = require('../utils');

describe('lib/config-decorator', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe('.create()', () => {
        it('should return an instance of a config decorator', () => {
            assert.instanceOf(ConfigDecorator.create(), ConfigDecorator);
        });
    });

    describe('.setRetries()', () => {
        it('should set passed retries to all browsers', () => {
            const config = createConfigStub({
                bro1: {retry: 7},
                bro2: {retry: 7}
            });
            const configDecorator = ConfigDecorator.create(config);

            configDecorator.setRetries(2);

            assert.isTrue(config.forBrowser('bro1').shouldRetry({retriesLeft: 7}));
            assert.isTrue(config.forBrowser('bro1').shouldRetry({retriesLeft: 6}));
            assert.isFalse(config.forBrowser('bro1').shouldRetry({retriesLeft: 5}));
            assert.isFalse(config.forBrowser('bro1').shouldRetry({retriesLeft: 4}));

            assert.isTrue(config.forBrowser('bro2').shouldRetry({retriesLeft: 7}));
            assert.isTrue(config.forBrowser('bro2').shouldRetry({retriesLeft: 6}));
            assert.isFalse(config.forBrowser('bro2').shouldRetry({retriesLeft: 5}));
            assert.isFalse(config.forBrowser('bro2').shouldRetry({retriesLeft: 4}));
        });

        it('should not set passed retries if they were already set to "0"', () => {
            const config = createConfigStub({
                bro1: {retry: 7},
                bro2: {retry: 7}
            });
            const configDecorator = ConfigDecorator.create(config);

            configDecorator.setRetries(1);
            assert.isFalse(config.forBrowser('bro1').shouldRetry({retriesLeft: 6}));

            configDecorator.setRetries(Infinity);
            assert.isTrue(config.forBrowser('bro1').shouldRetry({retriesLeft: 6}));

            configDecorator.setRetries(0);
            assert.isFalse(config.forBrowser('bro1').shouldRetry({retriesLeft: 6}));

            configDecorator.setRetries(Infinity);
            assert.isFalse(config.forBrowser('bro1').shouldRetry({retriesLeft: 6}));
        });
    });

    describe('.disableRetries()', () => {
        it('should set retries to "0"', () => {
            const configDecorator = ConfigDecorator.create(createConfigStub());
            sandbox.spy(configDecorator, 'setRetries');

            configDecorator.disableRetries();

            assert.calledOnceWith(configDecorator.setRetries, 0);
        });
    });
});
