'use strict';

const _ = require('lodash');
const plugin = require('../hermione');
const ConfigDecorator = require('../lib/config-decorator');
const Limiter = require('../lib/limiter');
const logger = require('../lib/logger');
const {createConfigStub, stubTool, stubOpts} = require('./utils');

const Events = {
    AFTER_TESTS_READ: 'fooBarAfterTestsRead',
    TEST_BEGIN: 'foorBarTestBegin',
    TEST_FAIL: 'fooBarTestFail',
    RETRY: 'fooBarRetry'
};

describe('hermione', () => {
    const sandbox = sinon.createSandbox();

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

    const init_ = (opts) => {
        const hermione = stubHermione(createConfigStub());
        initPlugin(hermione, opts);

        hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection());
        return hermione;
    };

    beforeEach(() => {
        sandbox.spy(ConfigDecorator, 'create');
        sandbox.stub(ConfigDecorator.prototype, 'disableRetries');

        sandbox.spy(Limiter, 'create');
        sandbox.stub(Limiter.prototype, 'startCountdown');
        sandbox.stub(Limiter.prototype, 'exceedTimeLimit');
        sandbox.stub(Limiter.prototype, 'exceedRetriesLimit');

        sandbox.stub(logger, 'info');
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

            assert.calledOnce(Limiter.create);
        });

        it('should pass limit options to retry limiter', () => {
            const hermione = stubHermione();

            initPlugin(hermione, {limit: 0.9, timeLimit: 60});

            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection());

            assert.calledOnceWith(Limiter.create, sinon.match.any, {limit: 0.9, timeLimit: 60});
        });

        it('should pass total test count to retry limiter', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            const tests = [stubTest(), stubTest()];
            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection(tests));

            assert.calledOnceWith(Limiter.create, tests.length, sinon.match.any);
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

            assert.calledOnceWith(Limiter.create, 2, sinon.match.any);
        });

        it('should not consider disabled tests in a total tests count', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            const tests = [
                stubTest(),
                stubTest({disabled: true}),
                stubTest()
            ];
            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollection(tests));

            assert.calledOnceWith(Limiter.create, 2, sinon.match.any);
        });
    });

    describe('on TEST_BEGIN event', () => {
        it('should start countdown if option "timeLimit" is finite', () => {
            const hermione = init_({timeLimit: 0});
            hermione.emit(hermione.events.TEST_BEGIN);

            assert.calledOnce(Limiter.prototype.startCountdown);
        });

        it('should not start countdown if option "timeLimit" is set to Infinity', () => {
            const hermione = init_({timeLimit: Infinity});
            hermione.emit(hermione.events.TEST_BEGIN);

            assert.notCalled(Limiter.prototype.startCountdown);
        });

        it('should start countdown only once on the first test begin', () => {
            const hermione = init_({timeLimit: 0});

            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.TEST_BEGIN);
            }

            assert.calledOnce(Limiter.prototype.startCountdown);
        });

        it('should check the exceed of time limit if option "timeLimit" is finite', () => {
            const hermione = init_({timeLimit: 0});
            hermione.emit(hermione.events.TEST_BEGIN);

            assert.calledOnce(Limiter.prototype.exceedTimeLimit);
        });

        it('should do nothing if option "timeLimit" is set to Infinity', () => {
            const hermione = init_({timeLimit: Infinity});
            hermione.emit(hermione.events.TEST_BEGIN);

            assert.notCalled(Limiter.prototype.exceedTimeLimit);
        });

        it('should disable retries if test duration exceeds the time limit', () => {
            Limiter.prototype.exceedTimeLimit
                .onFirstCall().returns(false)
                .onSecondCall().returns(true);

            const hermione = init_({timeLimit: 0});
            hermione.emit(hermione.events.TEST_BEGIN);
            hermione.emit(hermione.events.TEST_BEGIN);

            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });

        it('should not disable retries if test duration does not exceeds the time limit', () => {
            Limiter.prototype.exceedTimeLimit.returns(false);

            const hermione = init_({timeLimit: 0});
            hermione.emit(hermione.events.TEST_BEGIN);
            hermione.emit(hermione.events.TEST_BEGIN);

            assert.notCalled(ConfigDecorator.prototype.disableRetries);
        });

        it('should unsubscribe from TEST_BEGIN event after exceed the time limit', () => {
            Limiter.prototype.exceedTimeLimit.returns(true);

            const hermione = init_({timeLimit: 0});
            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.TEST_BEGIN);
            }
            assert.calledOnce(Limiter.prototype.exceedTimeLimit);
            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });

        it('should unsubscribe from RETRY event after exceed the time limit', () => {
            Limiter.prototype.exceedTimeLimit.returns(true);

            const hermione = init_({timeLimit: 0});
            hermione.emit(hermione.events.TEST_BEGIN);

            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.RETRY);
            }
            assert.notCalled(Limiter.prototype.exceedRetriesLimit);
            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });
    });

    describe('on TEST_FAIL event', () => {
        beforeEach(() => {
            sandbox.stub(ConfigDecorator.prototype, 'setRetries');

            Limiter.prototype.exceedRetriesLimit.returns(true);
        });

        it('should do nothing if option "setRetriesOnTestFail" is set to Infinity', () => {
            init_({setRetriesOnTestFail: Infinity});

            assert.notCalled(ConfigDecorator.prototype.setRetries);
        });

        it('should set retries if option "setRetriesOnTestFail" is switched on', () => {
            const hermione = init_({setRetriesOnTestFail: 100500});

            hermione.emit(hermione.events.TEST_FAIL);

            assert.calledOnceWith(ConfigDecorator.prototype.setRetries, 100500);
        });

        it('should set retries only once on the first test fail', () => {
            const hermione = init_({setRetriesOnTestFail: 0});

            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.TEST_FAIL);
            }

            assert.calledOnce(ConfigDecorator.prototype.setRetries);
        });
    });

    describe('on RETRY event', () => {
        it('should disable retries if retries count exceed a limit', () => {
            Limiter.prototype.exceedRetriesLimit
                .onFirstCall().returns(false)
                .onSecondCall().returns(true);

            const hermione = init_();
            hermione.emit(hermione.events.RETRY);
            hermione.emit(hermione.events.RETRY);

            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });

        it('should not disable retries if retries count does not exceed the limit', () => {
            Limiter.prototype.exceedRetriesLimit.returns(false);

            const hermione = init_();
            hermione.emit(hermione.events.RETRY);
            hermione.emit(hermione.events.RETRY);

            assert.notCalled(ConfigDecorator.prototype.disableRetries);
        });

        it('should unsubscribe from RETRY event after exceed the limit', () => {
            Limiter.prototype.exceedRetriesLimit.returns(true);

            const hermione = init_();
            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.RETRY);
            }
            assert.calledOnce(Limiter.prototype.exceedRetriesLimit);
            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });

        it('should unsubscribe from TEST_BEGIN event after exceed the limit', () => {
            Limiter.prototype.exceedRetriesLimit.returns(true);

            const hermione = init_();
            hermione.emit(hermione.events.RETRY);

            for (let i = 0; i < 10; i++) {
                hermione.emit(hermione.events.TEST_BEGIN);
            }
            assert.notCalled(Limiter.prototype.exceedTimeLimit);
            assert.calledOnce(ConfigDecorator.prototype.disableRetries);
        });
    });
});
