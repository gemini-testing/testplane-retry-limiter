'use strict';

const RetryLimiter = require('../../lib/retry-limiter');
const logger = require('../../lib/logger');

describe('lib/retry-limiter', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(logger, 'info');
    });

    afterEach(() => sandbox.restore());

    describe('.create()', () => {
        it('should create an instance of a retry limiter', () => {
            assert.instanceOf(RetryLimiter.create(), RetryLimiter);
        });
    });

    describe('.exceedLimit()', () => {
        const createRetryLimiter = (opts) => RetryLimiter.create(opts.limit, opts.totalTestsCount);

        it('should return "true" if limit is exceeded', () => {
            assert.isTrue(createRetryLimiter({limit: 0, totalTestsCount: 1}).exceedLimit());
        });

        it('should return "false" if limit is not exceeded', () => {
            assert.isFalse(createRetryLimiter({limit: 1, totalTestsCount: 1}).exceedLimit());
        });

        it('should return "false" until limit is exceeded', () => {
            const count = 11;
            const retryLimiter = createRetryLimiter({limit: 0.9, totalTestsCount: count});

            for (let i = 0; i < count - 1; ++i) {
                assert.isFalse(retryLimiter.exceedLimit());
            }
            assert.isTrue(retryLimiter.exceedLimit());
        });
    });
});
