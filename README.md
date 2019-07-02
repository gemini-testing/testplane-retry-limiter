# retry-limiter [![Build Status](https://travis-ci.org/gemini-testing/retry-limiter.svg?branch=master)](https://travis-ci.org/gemini-testing/retry-limiter)

Plugin for [gemini](https://github.com/gemini-testing/gemini) and [hermione](https://github.com/gemini-testing/hermione/) to disable retries at runtime.

## How it works?

Plugin sets retries threshold. If it’s exceeded test will or will not be retried based on the result of `shouldRetry` function in config.

For Gemini the rule is: if the test ends without result (nor `equal:false` nor `equal:true`) test will be retried if it’s attempts not exceeded.

For Hermione the rule is: no retries.

## Install

```bash
$ npm install retry-limiter
```

## Usage

### Configuration

* **enabled** (optional) `Boolean` – enable/disable the plugin; default `true`.
* **limit** (optional) `Number` – number in range from 0 to 1; if retries count to a total number of tests exceed the specified limit all next tests will be run without retries; default `1`.
* **setRetriesOnTestFail** (optional) `Number` – set retries to the given value after the first test fail; default `Infinity` (retries will not be reset). **Option is supported only in hermione**. 

### Gemini

Add the plugin to your configuration file:

```js
module.exports = {
    system: {
        plugins: {
            'retry-limiter/gemini': {
                limit: 0.3
            }
        }
    }
};
```

### Hermione

```js
module.exports = {
    plugins: {
        'retry-limiter/hermione': {
            limit: 0.3,
            setRetriesOnTestFail: 1
        }
    }
};
```
