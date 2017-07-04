'use strict';

const _ = require('lodash');
const ConfigDecorator = require('../../lib/config-decorator');

describe('lib/config-decorator', () => {
    describe('.create()', () => {
        it('should return an instance of a config decorator', () => {
            assert.instanceOf(ConfigDecorator.create(), ConfigDecorator);
        });
    });

    describe('.disableRetries()', () => {
        const createConfigStub = (browsers) => ({
            getBrowserIds: sinon.stub().returns(_.keys(browsers)),
            forBrowser: sinon.stub().callsFake((id) => browsers[id])
        });

        it('should disable retries in all browsers', () => {
            const config = createConfigStub({bro1: {retry: 100500}, bro2: {retry: 500100}});
            const configDecorator = ConfigDecorator.create(config);

            configDecorator.disableRetries();

            assert.deepEqual(config.forBrowser('bro1'), {retry: 0});
            assert.deepEqual(config.forBrowser('bro2'), {retry: 0});
        });
    });
});
