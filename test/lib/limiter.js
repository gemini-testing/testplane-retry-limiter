'use strict';

const Limiter = require('../../lib/limiter');
const logger = require('../../lib/logger');

const {MS_PER_SEC} = require('../../lib/constants');

describe('lib/limiter', () => {
    const sandbox = sinon.createSandbox();

    const createLimiter = (opts) => Limiter.create(opts.totalTestsCount, {limit: opts.limit, timeLimit: opts.timeLimit});

    beforeEach(() => {
        sandbox.stub(logger, 'info');
    });

    afterEach(() => sandbox.restore());

    describe('.create()', () => {
        it('should create an instance of a retry limiter', () => {
            assert.instanceOf(createLimiter({limit: 0, timeLimit: 0}), Limiter);
        });
    });

    describe('.exceedRetriesLimit()', () => {
        it('should return "true" if limit is exceeded', () => {
            assert.isTrue(createLimiter({limit: 0, totalTestsCount: 1}).exceedRetriesLimit());
        });

        it('should return "false" if limit is not exceeded', () => {
            assert.isFalse(createLimiter({limit: 1, totalTestsCount: 1}).exceedRetriesLimit());
        });

        it('should return "false" until limit is exceeded', () => {
            const count = 11;
            const Limiter = createLimiter({limit: 0.9, totalTestsCount: count});

            for (let i = 0; i < count - 1; ++i) {
                assert.isFalse(Limiter.exceedRetriesLimit());
            }
            assert.isTrue(Limiter.exceedRetriesLimit());
        });
    });

    describe('.exceedTimeLimit()', () => {
        let clock;

        beforeEach(() => {
            clock = sandbox.useFakeTimers();
        });

        it('should return "true" if time limit is exceeded', () => {
            const timeLimit = 1;
            const limiter = createLimiter({timeLimit});
            limiter.startCountdown();

            clock.tick(timeLimit * MS_PER_SEC + 1);

            assert.isTrue(limiter.exceedTimeLimit());
        });

        it('should return "false" if time limits is not exceeded', () => {
            const timeLimit = 1;
            const limiter = createLimiter({timeLimit});
            limiter.startCountdown();

            clock.tick(timeLimit * MS_PER_SEC - 1);

            assert.isFalse(limiter.exceedTimeLimit());
        });
    });
});
