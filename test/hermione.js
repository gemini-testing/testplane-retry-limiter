'use strict';

const _ = require('lodash');
const plugin = require('../hermione');
const ConfigDecorator = require('../lib/config-decorator');
const RetryLimiter = require('../lib/retry-limiter');
const stubTool = require('./utils').stubTool;
const stubOpts = require('./utils').stubOpts;

const Events = {
    AFTER_FILE_READ: 'fooBarAfterFileRead',
    BEGIN: 'fooBarBegin',
    RETRY: 'fooBarRetry'
};

describe('hermione', () => {
    const sandbox = sinon.sandbox.create();

    const stubHermione = (config) => stubTool(Events, config);
    const initPlugin = (hermione, opts) => plugin(hermione, stubOpts(opts));

    beforeEach(() => {
        sandbox.spy(ConfigDecorator, 'create');
        sandbox.stub(ConfigDecorator.prototype, 'disableRetries');

        sandbox.spy(RetryLimiter, 'create');
        sandbox.stub(RetryLimiter.prototype, 'exceedLimit');
    });

    afterEach(() => sandbox.restore());

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

    it('should create a retry limiter', () => {
        const hermione = stubHermione();

        initPlugin(hermione, {limit: 0.9});

        hermione.emit(hermione.events.BEGIN);

        assert.calledOnceWith(RetryLimiter.create, 0.9);
    });

    describe('total tests count', () => {
        const stubSuite = (tests) => ({suite: {eachTest: sinon.stub().callsFake((cb) => tests.forEach(cb))}});
        const stubTest = (opts) => _.defaults(opts || {}, {pending: false});

        it('should define a total tests count on "BEGIN" event', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest()]));
            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest(), stubTest()]));
            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest(), stubTest(), stubTest()]));
            hermione.emit(hermione.events.BEGIN);

            assert.calledWith(RetryLimiter.create, sinon.match.any, 1 + 2 + 3);
        });

        it('should not consider pending tests in a total tests count', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest({pending: true})]));
            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest({pending: true}), stubTest()]));
            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest(), stubTest()]));
            hermione.emit(hermione.events.BEGIN);

            assert.calledWith(RetryLimiter.create, sinon.match.any, 0 + 1 + 2);
        });

        it('should not increment a total tests count if "AFTER_FILE_READ" event was triggered after "BEGIN" one', () => {
            const hermione = stubHermione();

            initPlugin(hermione);

            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest()]));
            hermione.emit(hermione.events.BEGIN);
            hermione.emit(hermione.events.AFTER_FILE_READ, stubSuite([stubTest()]));

            assert.calledWith(RetryLimiter.create, sinon.match.any, 1);
        });
    });

    it('should disable retries if retries count exceed a limit', () => {
        const hermione = stubHermione();

        RetryLimiter.prototype.exceedLimit
            .onFirstCall().returns(false)
            .onSecondCall().returns(true);

        initPlugin(hermione);

        hermione.emit(hermione.events.BEGIN);
        hermione.emit(hermione.events.RETRY);
        hermione.emit(hermione.events.RETRY);

        assert.calledOnce(ConfigDecorator.prototype.disableRetries);
    });

    it('should not disable retries if retries count does not exceed the limit', () => {
        const hermione = stubHermione();

        RetryLimiter.prototype.exceedLimit.returns(false);

        initPlugin(hermione);

        hermione.emit(hermione.events.BEGIN);
        hermione.emit(hermione.events.RETRY);
        hermione.emit(hermione.events.RETRY);

        assert.notCalled(ConfigDecorator.prototype.disableRetries);
    });
});
