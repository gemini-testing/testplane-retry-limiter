'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'retry_limiter_';
const CLI_PREFIX = '--retry-limiter-';

module.exports = (options) => getParser()({options, env: process.env, argv: process.argv});

function getParser() {
    return root(section({
        enabled: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: (value) => !_.isBoolean(value) && thr('Option "enabled" must be boolean')
        }),
        limit: option({
            defaultValue: 1,
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => !inRange(value, 0, 1) && thr('Option "limit" must be a number in a range from 0 to 1')
        }),
        setRetriesOnTestFail: option({
            defaultValue: Infinity,
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => !isNonNegativeInteger(value) && value !== Infinity && thr('Option "setRetriesOnTestFail" must be a non negative integer or "Infinity"')
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
}

function thr(str) {
    throw new TypeError(str);
}

function inRange(value, start, end) {
    return _.isNumber(value) && value >= start && value <= end;
}

function isNonNegativeInteger(value) {
    return value >= 0 && Number.isInteger(value);
}
