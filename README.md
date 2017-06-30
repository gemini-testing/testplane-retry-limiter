# retry-limiter [![Build Status](https://travis-ci.org/gemini-testing/retry-limiter.svg?branch=master)](https://travis-ci.org/gemini-testing/retry-limiter)

Plugin for [gemini](https://github.com/gemini-testing/gemini) and [hermione](https://github.com/gemini-testing/hermione/) to disable retries at runtime.

## Install

```bash
$ npm install retry-limiter
```

## Usage

### configuration

* **enabled** (optional) `Boolean` – enable/disable the plugin; default `true`.
* **limit** (optional) `Number` – number in range from 0 to 1; if retries count to a total number of tests exceed the specified limit all next tests will be run without retries; default `1`.

### gemini

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

### hermione

```js
module.exports = {
    plugins: {
        'retry-limiter/hermione': {
            limit: 0.3
        }
    }
};
```
