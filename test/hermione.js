'use strict';

const _ = require('lodash');
const plugin = require('../hermione');
const ConfigDecorator = require('../lib/config-decorator');
const RetryLimiter = require('../lib/retry-limiter');
const {createConfigStub, stubTool, stubOpts} = require('./utils');

const Events = {
    AFTER_TESTS_READ: 'fooBarAfterTestsRead',
    RETRY: 'fooBarRetry'
};

describe('hermione', () => {
    const sandbox = sinon.sandbox.create();

    const stubHermione = (config) => {
        const hermione = stubTool(Events, config);
        hermione.isWorker = () => false;
        return hermione;
    };

    const initPlugin = (hermione, opts) => plugin(hermione, stubOpts(opts));

    const mkTestCollection = (tests = []) => {
        return {
            eachTest: (cb) => tests.forEach(cb)
        };
    };

    beforeEach(() => {
        sandbox.spy(ConfigDecorator, 'create');

        sandbox.spy(RetryLimiter, 'create');
        sandbox.stub(RetryLimiter.prototype, 'exceedLimit');
    });

    afterEach(() => sandbox.restore());

    it('should do nothing in worker', () => {
        const hermione = stubHermione();
        hermione.isWorker = () => true;
        sandbox.spy(hermione, 'on');

        initPlugin(hermione);

        assert.notCalled(hermione.on);
    });

    it('should do nothing if plugin is disabled', () => {
        const hermione = stubHermione();
        sandbox.spy(hermione, 'on');

        initPlugin(hermione, {enabled: false});

        assert.notCalled(hermione.on);
    });

    it('should create a config decorator', () => {
        initPlugin(stubHermione({some: 'config'}));

        assert.calledOnceWith(ConfigDecorator.create, {some: 'config'});
    });

    describe('on AFTER_TESTS_READ event', () => {
        const stubTest = (opts) => _.defaults(opts || {}, {pending: false});

        it('should create retry limiter', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection());

            assert.calledOnce(RetryLimiter.create);
        });

        it('should pass limit option to retry limiter', () => {
            const hermione = stubHermione();

            initPlugin(hermione, {limit: 0.9});

            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection());

            assert.calledOnceWith(RetryLimiter.create, 0.9);
        });

        it('should pass total test count to retry limiter', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            const tests = [stubTest(), stubTest()];
            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection(tests));

            assert.calledOnceWith(RetryLimiter.create, sinon.match.any, tests.length);
        });

        it('should not consider pending tests in a total tests count', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            const tests = [
                stubTest(),
                stubTest({pending: true}),
                stubTest()
            ];
            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection(tests));

            assert.calledOnceWith(RetryLimiter.create, sinon.match.any, 2);
        });
    });

    describe('on RETRY event', () => {
        const init_ = (config) => {
            const hermione = stubHermione(config || createConfigStub());
            initPlugin(hermione);

            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection());
            return hermione;
        };

        it('should disable retries if retries count exceed a limit', () => {
            sandbox.stub(ConfigDecorator.prototype, 'disableRetries');

            RetryLimiter.prototype.exceedLimit
                .onFirstCall().returns(false)
                .onSecondCall().returns(true);

            const hermione = init_();
            hermione.emit(hermione.events.RETRY);
            hermione.emit(hermione.events.RETRY);

            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });

        it('should not disable retries if retries count does not exceed the limit', () => {
            sandbox.stub(ConfigDecorator.prototype, 'disableRetries');

            RetryLimiter.prototype.exceedLimit.returns(false);

            const hermione = init_();
            hermione.emit(hermione.events.RETRY);
            hermione.emit(hermione.events.RETRY);

            assert.notCalled(ConfigDecorator.prototype.disableRetries);
        });

        it('should unsubscribe from RETRY event after exceed the limit', () => {
            sandbox.stub(ConfigDecorator.prototype, 'disableRetries');

            RetryLimiter.prototype.exceedLimit.returns(true);

            const hermione = init_();
            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.RETRY);
            }
            assert.calledOnce(RetryLimiter.prototype.exceedLimit);
            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });

        it('shouldRetry() returns false after exceed a limit', () => {
            const config = createConfigStub({bro: {}});
            const hermione = init_(config);

            RetryLimiter.prototype.exceedLimit.returns(true);

            hermione.emit(hermione.events.RETRY);

            assert.equal(config.forBrowser('bro').shouldRetry(), false);
        });
    });
});
