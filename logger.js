/**
* @module logger
* @description a singleton logger module that uses winston under the covers
* (copied from: http://thottingal.in/blog/2014/04/06/winston-nodejs-logging/).
* Use standard winston syntax to create log entries (ex. logger.debug, logger.warn etc.)
*/

'use strict';

var winston = require('winston');
var fs = require('fs');
var env = process.env.NODE_ENV || 'development';
var config;
var logDir;
var logger;

try {
	config = require('./config');
} catch (e) { console.log(e); }
if (config && config.logging) {
	logDir = config.logging.directory;
} else {
	var logDir = './logs';
}

winston.setLevels(winston.config.npm.levels);
winston.addColors(winston.config.npm.colors);

if (!fs.existsSync(logDir)) {
	// Create the directory if it does not exist
	fs.mkdirSync(logDir);
}

logger = new(winston.Logger)({
	transports: [
		new winston.transports.Console({
			level: 'debug',
			colorize: true,
			prettyPrint: true
		}),
		new winston.transports.File({
			level: 'debug',
			filename: logDir + '/logs.log',
			maxsize: 1024 * 1024 * 10,
			prettyPrint: true
		})
    ],
    handleExceptions: true,
	exceptionHandlers: [
		new winston.transports.File({
			filename: logDir + '/errors.log',
			maxsize: 1024 * 1024 * 10,
			prettyPrint: true
		})
    ]
});
logger.exitOnError = false;

module.exports = logger;