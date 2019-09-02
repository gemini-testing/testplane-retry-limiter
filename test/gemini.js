'use strict';

const plugin = require('../gemini');
const ConfigDecorator = require('../lib/gemini-config-decorator');
const Limiter = require('../lib/limiter');
const logger = require('../lib/logger');
const {createConfigStub, stubTool, stubOpts} = require('./utils');

const Events = {
    BEGIN: 'fooBarBegin',
    RETRY: 'fooBarRetry'
};

describe('gemini', () => {
    const sandbox = sinon.createSandbox();

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

        sandbox.spy(Limiter, 'create');
        sandbox.stub(Limiter.prototype, 'exceedRetriesLimit');
        sandbox.stub(logger, 'info');
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

        assert.calledOnceWith(Limiter.create, {limit: 0.9});
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

            assert.calledWith(Limiter.create, sinon.match.any, 3 * 2 + 4 * 0 + 2 * 1);
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

            assert.calledWith(Limiter.create, sinon.match.any, 3 * 1 + 4 * 0 + 2 * 2);
        });
    });

    it('should disable retries if retries count exceed a limit', () => {
        sandbox.stub(ConfigDecorator.prototype, 'disableRetries');
        const gemini = stubGemini();

        Limiter.prototype.exceedRetriesLimit
            .onFirstCall().returns(false)
            .onSecondCall().returns(true);

        initPlugin(gemini);

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});
        gemini.emit(gemini.events.RETRY);
        gemini.emit(gemini.events.RETRY);

        assert.calledOnce(ConfigDecorator.prototype.disableRetries);
    });

    it('should not disable retries if retries count does not exceed the limit', () => {
        sandbox.stub(ConfigDecorator.prototype, 'disableRetries');
        const gemini = stubGemini();

        Limiter.prototype.exceedRetriesLimit.returns(false);

        initPlugin(gemini);

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});
        gemini.emit(gemini.events.RETRY);
        gemini.emit(gemini.events.RETRY);

        assert.notCalled(ConfigDecorator.prototype.disableRetries);
    });

    it('should unsubscribe from RETRY event after exceed the limit', () => {
        sandbox.stub(ConfigDecorator.prototype, 'disableRetries');
        const gemini = stubGemini();

        Limiter.prototype.exceedRetriesLimit.returns(true);

        initPlugin(gemini);

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});
        for (let i = 0; i < 10; i++) {
            gemini.emit(gemini.events.RETRY);
        }
        assert.calledOnce(Limiter.prototype.exceedRetriesLimit);
        assert.calledOnce(ConfigDecorator.prototype.disableRetries);
    });

    it('shouldRetry() implementation', () => {
        const config = createConfigStub({bro: {}});
        const gemini = stubGemini(config);

        Limiter.prototype.exceedRetriesLimit.returns(true);

        initPlugin(gemini);

        gemini.emit(gemini.events.BEGIN, {suiteCollection: stubSuiteCollection()});
        gemini.emit(gemini.events.RETRY);

        const shouldRetry = config.forBrowser('bro').shouldRetry;

        assert.equal(
            shouldRetry({retriesLeft: 3/* no "equal" field */}),
            true,
            'should allow retries for test without result despite the total retries limit was exceeded'
        );

        assert.equal(
            shouldRetry({retriesLeft: 3, equal: false}),
            false,
            'should disallow retry for test with result because the total retries limit was exceeded'
        );

        assert.equal(
            shouldRetry({retriesLeft: 0/* no "equal" field */}),
            false,
            'should disallow retry for test without result because the test’s attempts was run out'
        );

        assert.equal(
            shouldRetry({retriesLeft: 0, equal: false}),
            false,
            'should disallow retry for test with result because the test’s attempts was run out'
        );
    });
});
