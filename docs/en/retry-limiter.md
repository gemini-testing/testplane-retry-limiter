# retry-limiter

## Overview

Use the `retry-limiter` plugin to limit the number of retries of failed tests, as well as the time during which retries are allowed.

_Use this plugin when running tests in CI.&mdash;Since in CI, as a rule, either all the tests of the project are run, or a significant part of them._

_Using the `retry-limiter` plugin for local launches of a few tests is most often impractical, due to their small number and, accordingly, the lack of a significant effect from saving hardware or time for running tests._

Retries of failed tests is one of the ways to deal with unstable tests. However, there are cases when a lot of tests fail due to infrastructure problems or because the project code was broken (for example, in a pull-request). In such cases, the retries only waste the resources of the servers on which the tests are run, and the developer's time, forcing the developer to wait for the end of the test run, which will obviously fail.

To avoid such scenarios, the `retry-limiter` plugin allows:
* set the maximum share of retries from the total number of tests;
* limit the time during which retries can be used;
* reduce the maximum number of retries for all tests if at least one of the tests fails despite all retries.

For example, if 1000 tests are run in the project and the `limit` parameter in the plugin config is set to _0.3,_ then when the tests fail, _300_ retries will be allowed as much as possible.

If the value _600 seconds (10 minutes)_ is still set in the plugin config for the `timeLimit` parameter, then regardless of how many times you can still retry the failed tests, the plugin will disable the retry mechanism after _10 minutes_ after the start of the test run. The latter protects against unreasonable waste of hardware resources for too long test runs.

If hermione is launched with the `--retry` option, for example, with the value _7_, and at the same time, in the config of the `retry-limiter` plugin, the `setRetriesOnTestFail` parameter is set to _4_, this means the following: if at least one test fails in any of the browsers after _7_ retries, the plugin will consider that some kind of system problem has arisen and it is necessary to reduce the maximum allowed number of retries to the value specified in the `setRetriesOnTestFail` parameter, that is, to _4_. It also allows you to protect yourself from the unreasonable consumption of resources for running tests in case of system problems.

_If you are faced with a situation in your project when the retry mechanism starts to turn off due to exceeding `timeLimit`, then it is not recommended to thoughtlessly increase this time. It is worth figuring out why the tests began to run for too long, and not to waste hardware resources instead of solving the real problem with the stability of test runs._

## Install

```bash
npm install -D retry-limiter
```

## Setup

Add the plugin to the `plugins` section of the `hermione` config:

```javascript
module.exports = {
    plugins: {
        'retry-limiter': {
            limit: 0.3, // allow no more than 30% of retries from the total number of tests
            setRetriesOnTestFail: 4, // descrease number of retries to 4, after the first test fails despite all retries made
            timeLimit: 600 // after 10 minutes the retries should be turned off
        },

        // other hermione plugins...
    },

    // other hermione settings...
};
```

### Description of configuration parameters

| **Parameter** | **Type** | **Default&nbsp;value** | **Description** |
| ------------- | -------- | ---------------------- | --------------- |
| enabled | Boolean | true | Enable / disable the plugin. |
| limit | Number | 1 | The maximum allowed percentage of retries from the total number of tests. It is set as a number in the range from 0 to 1. After exceeding the specified percentage of retries, the retries will be disabled. |
| setRetriesOnTestFail | Number | Infinity | The number of retries to which the allowed number of retries should be reduced if at least one test fails, despite all retries. |
| timeLimit | Number | Infinity | The time in seconds after which the retries will be disabled. |

### Passing parameters via the CLI

All plugin parameters that can be defined in the config can also be passed as command line options or through environment variables during Hermione startup. Use the prefix `--retry-limiter-` for command line options and `retry_limiter_` for environment variables. For example:

```bash
npx hermione --retry-limiter-time-limit=900
```

```bash
retry_limiter_time_limit=900 npx hermione
```

## Usage

When using the plugin in hermione's logs, you can see the following messages:

```bash
retry-limiter: will stop retrying tests after 600 seconds
```

```bash
retry-limiter: with limit 0.3 will stop retrying tests after 1189 retries
```

In the first message, the plugin informs about the limitation of the operation time of the retry mechanism.
In the second message&mdash;about limiting the total number of retries.
