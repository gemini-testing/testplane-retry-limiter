'use strict';

const plugin = require('../gemini');
const ConfigDecorator = require('../lib/config-decorator');
const RetryLimiter = require('../lib/retry-limiter');
const stubTool = require('./utils').stubTool;
const stubOpts = require('./utils').stubOpts;

const Events = {
    BEGIN: 'fooBarBegin',
    RETRY: 'fooBarRetry'
};

describe('gemini', () => {
    const sandbox = sinon.sandbox.create();

    const stubGemini = (config) => stubTool(Events, config);
    const initPlugin = (gemini, opts) => plugin(gemini, stubOpts(opts));

    const stubSuiteCollection = (suites) => {
        suites = suites || [];

        suites.forEach((suite) => {
            suite.shouldSkip = sinon.stub();

            (suite.skip || []).forEach((bro) => suite.shouldSkip.withArgs(bro).returns(true));
        });

        return {allSuites: sinon.stub().returns(suites)};
    };

    beforeEach(() => {
        sandbox.spy(ConfigDecorator, 'create');
        sandbox.stub(ConfigDecorator.prototype, 'disableRetries');

        sandbox.spy(RetryLimiter, 'create');
        sandbox.stub(RetryLimiter.prototype, 'exceedLimit');
    });

    afterEach(() => sandbox.restore());

    it('should do nothing if plugin is disabled', () => {
        const gemini = stubGemini();
        sandbox.spy(gemini, 'on');

        initPlugin(gemini, {enabled: false});

        assert.notCalled(gemini.on);
    });

    it('should create a config decorator', () => {
        initPlugin(stubGemini({some: 'config'}));

        assert.calledOnceWith(ConfigDecorator.create, {some: 'config'});
    });

    it('should create a retry limiter', () => {
        const gemini = stubGemini();

        initPlugin(gemini, {limit: 0.9});

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});

        assert.calledOnceWith(RetryLimiter.create, 0.9);
    });

    describe('total tests count', () => {
        it('should define a total tests count on "BEGIN" event', () => {
            const gemini = stubGemini();
            const suiteCollection = stubSuiteCollection([
                {states: new Array(3), browsers: new Array(2)},
                {states: new Array(4), browsers: new Array(0)},
                {states: new Array(2), browsers: new Array(1)}
            ]);

            initPlugin(gemini);

            gemini.emit(gemini.events.BEGIN, {suiteCollection});

            assert.calledWith(RetryLimiter.create, sinon.match.any, 3 * 2 + 4 * 0 + 2 * 1);
        });

        it('should not consider pending tests in a total tests count', () => {
            const gemini = stubGemini();
            const suiteCollection = stubSuiteCollection([
                {states: new Array(3), browsers: ['bro1', 'bro2'], skip: ['bro1']},
                {states: new Array(4), browsers: ['bro1', 'bro2'], skip: ['bro1', 'bro2']},
                {states: new Array(2), browsers: ['bro1', 'bro2']}
            ]);

            initPlugin(gemini);

            gemini.emit(gemini.events.BEGIN, {suiteCollection});

            assert.calledWith(RetryLimiter.create, sinon.match.any, 3 * 1 + 4 * 0 + 2 * 2);
        });
    });

    it('should disable retries if retries count exceed a limit', () => {
        const gemini = stubGemini();

        RetryLimiter.prototype.exceedLimit
            .onFirstCall().returns(false)
            .onSecondCall().returns(true);

        initPlugin(gemini);

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});
        gemini.emit(gemini.events.RETRY);
        gemini.emit(gemini.events.RETRY);

        assert.calledOnce(ConfigDecorator.prototype.disableRetries);
    });

    it('should not disable retries if retries count does not exceed the limit', () => {
        const gemini = stubGemini();

        RetryLimiter.prototype.exceedLimit.returns(false);

        initPlugin(gemini);

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});
        gemini.emit(gemini.events.RETRY);
        gemini.emit(gemini.events.RETRY);

        assert.notCalled(ConfigDecorator.prototype.disableRetries);
    });
});
