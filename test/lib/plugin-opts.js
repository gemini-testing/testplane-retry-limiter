'use strict';

const _ = require('lodash');
const pluginOpts = require('../../lib/plugin-opts');

describe('plugin-opts', () => {
    let env;

    beforeEach(() => env = _.clone(process.env));
    afterEach(() => _.keys(process.env).forEach((name) => !env[name] && (delete process.env[name])));

    describe('enabled', () => {
        it('should throw if a value from a config is not boolean', () => {
            assert.throws(() => pluginOpts({enabled: 'not boolean'}), 'Option "enabled" must be boolean');
        });

        it('should throw if a value from an environment is not boolean', () => {
            process.env['retry_limiter_enabled'] = '"not boolean"';

            assert.throws(() => pluginOpts(), 'Option "enabled" must be boolean');
        });

        it('should be "true" by default', () => {
            assert.isTrue(pluginOpts().enabled);
        });

        it('should be overridden by a value from a config', () => {
            assert.isFalse(pluginOpts({enabled: false}).enabled);
        });

        it('should be overridden by a value from an environment', () => {
            process.env['retry_limiter_enabled'] = 'false';

            assert.isFalse(pluginOpts().enabled);
        });

        it('should use a value from an environment instead of a value from a config', () => {
            process.env['retry_limiter_enabled'] = 'true';

            assert.isTrue(pluginOpts({enabled: 'false'}).enabled);
        });
    });

    describe('limit', () => {
        it('should throw if a value from a config is not in a range from 0 to 1', () => {
            assert.throws(() => pluginOpts({limit: -0.0001}), 'Option "limit" must be a number in a range from 0 to 1');
            assert.throws(() => pluginOpts({limit: 1.00001}), 'Option "limit" must be a number in a range from 0 to 1');
        });

        it('should throw if a value from an environment is not in range from 0 to 1', () => {
            process.env['retry_limiter_limit'] = '-.0001';
            assert.throws(() => pluginOpts(), 'Option "limit" must be a number in a range from 0 to 1');

            process.env['retry_limiter_limit'] = '1.00001';
            assert.throws(() => pluginOpts(), 'Option "limit" must be a number in a range from 0 to 1');
        });

        it('should be "1" by default', () => {
            assert.deepEqual(pluginOpts().limit, 1);
        });

        it('should be overridden by a value from a config', () => {
            assert.deepEqual(pluginOpts({limit: 0.5}).limit, 0.5);
        });

        it('should be overridden by a value from an environment', () => {
            process.env['retry_limiter_limit'] = '0.5';

            assert.deepEqual(pluginOpts().limit, 0.5);
        });

        it('should use a value from an environment instead of a value from a config', () => {
            process.env['retry_limiter_limit'] = '0.9';

            assert.deepEqual(pluginOpts({limit: '0.5'}).limit, 0.9);
        });
    });
});
