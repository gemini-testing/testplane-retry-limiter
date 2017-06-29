'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');

exports.stubTool = (events, config) => {
    const tool = new EventEmitter();

    tool.events = events;
    tool.config = config;

    return tool;
};

exports.stubOpts = (opts) => {
    return _.defaults(opts, {
        enabled: true
    });
};
