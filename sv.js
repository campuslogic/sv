#!/usr/bin/env node
/*jslint white: true */
/*jslint plusplus: true */
'use strict';

var svApi = require('sv-api');
var isirs = svApi.isirs;

var logger = require('./logger');
var oauth = require('oauth-wrap');
var config = require('./config');
var args = require('optimist').argv;

var fs = require('fs');

// coerce fs to return promises
var Promise = require('promise');
var readFile = Promise.denodeify(require('fs').readFile);
svApi.logger = logger;

var pad = function (text) {
  'use strict';
  var temp = '0' + text.toString();
  return temp.substring(temp.length - 2);
};

var formatDate = function(dateString) {
  'use strict';
  var date = new Date(dateString);
  return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + '-' + date.getFullYear();
};

var getCorrections = function() {
  'use strict';
  var startDate = args.startDate;
  var endDate = args.endDate;
  var outputDir = args.outputDir;

  var validate = function(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        return false;
      }
      var start = new Date(startDate);
      var end = new Date(endDate);
      var startISO = start.toISOString();
      var endISO = end.toISOString();
      logger.debug('start: ', startISO);
      logger.debug('end: ', endISO);
      if (start > end) { return false; }
      return true;
    } catch (error) {
      logger.debug(error.stack);
    }
    return false;
  };

  if (!outputDir || !fs.existsSync(outputDir)) {
    logger.error('outputDir does not exist.');
    return;
  }

  if (!validate(startDate, endDate)) {
    logger.error('Invalid date(s) detected.');
    // allow logger to write to log before exit
    return;
  }

  var oauthRequest = config.oauthWrapRequest;

  oauth.getAuthHeader(oauthRequest.url,
            oauthRequest.creds.uid,
            oauthRequest.creds.pwd,
            oauthRequest.wrapScope)
    .then(function(authorization) {
      isirs.getCorrections(config.svApi.rootUrl,
        authorization,
        formatDate(startDate),
        formatDate(endDate),
        outputDir)
        .then(function(files) {
          logger.debug('files: ', files);
          if (files.length > 0) {
            logger.info(files.length + ' ISIR correction files were successfully retrieved.');
            var i;
            for (i = 0; i < files.length; i+= 1) {
              logger.info('File Name: ' + files[i].name);
            }
          } else {
            logger.info('No ISIR corrections found.');
          }
        })
        .catch(function(error) {
          logger.error('error retrieving ISIR corrections: ', error.stack);
          throw(error);
          //return;    
        });
    })
    .catch(function(error) {
      logger.error('error retrieving authorization: ', error.stack);
      throw(error);
      //return;
    });
};

var upload = function() {
  'use strict';
  var oauthRequest = config.oauthWrapRequest;

  // get the file
  // upload via api
  var file = args.file;
  if (file === undefined || file === null) {
    logger.warn('invalid file argument detected');
    return;
  }

  var promise = new Promise(function(resolve, reject) {
    readFile(file, {encoding: 'utf8'})
      .then(function(content) {
        oauth.getAuthHeader(oauthRequest.url,
                  oauthRequest.creds.uid,
                  oauthRequest.creds.pwd,
                  oauthRequest.wrapScope)
          .then(function(authorization) {
            isirs.upload(config.svApi.rootUrl, authorization, '3000-3001', content)
              .then(function(result) {
                resolve(result);
              })
              .catch(function(error) {
                reject(error);
              });
          })
          .catch(function(error) {
            logger.error('failed to obtain authorization: ', error.stack);
          });
      })
      .catch(function(error) {
        logger.error('failed to read file: ', error.stack);
      });
  });
  return promise;
};

var exec = function() {
  'use strict';
  var timeout = args.timeout;

  if (timeout !== undefined && timeout ) {
    svApi.options = { timeout: timeout };
  }

  var command = args.command;
  if (command === undefined || command === null) { logger.error('command parameter not found.'); }

  switch (command.toLowerCase()) {
    
    case 'corrections':
      getCorrections();
      break;

    case 'upload':
      upload()
        .then(function(result) {
          logger.info('file uploaded successfully; fileid=' + result);
        })
        .catch(function(error) {
          logger.error(error);
        });
      break;

    default:
      logger.debug('unsupported command detected');
      break;
  }
};

// allow logger to write to log before exit
exec();
