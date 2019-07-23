const _ = require('lodash'),
  fs = require('fs'),
  utils = require('../utils/index.js'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  process = require('process'),
  Logger = require('./logger');


function Describe(config) {};

Describe.TSfindAllExports = function(text) {
  let matches = /^export(\sdefault\s|\s)([a-zA-Z\{]+)/gm.exec(text),
  exports = {};

  console.log(matches);
};

Describe.jsonifyPropertiesAndValues = function(text) {
  if (text && _.isString(text)) {
    let reg = /([\_\$a-zA-Z0-9\/\#\?\!]+)\:/gm, arr = null;

    while ((arr = reg.exec(text)) !== null) {
      if (arr && arr[0]) {
        text = text.replace(arr[0], '"' + arr[1] + '":');
      }
    }

    reg = /([\\\-\_\$a-zA-Z\.0-9\/\#\?\!\.\(\)]+)(\}|\,|\])/gm, arr = null;

    while ((arr = reg.exec(text)) !== null) {
      if (arr && arr[0]) {
        text = text.replace(arr[0], '"' + arr[1] + '"' + arr[2]);
      }
    }
  }

  return text;
};

Describe.removeStringChar = function (text) {
  if (text && _.isString(text)) {
    reg = /(\"|\')([a-zA-Z\:\(\)\#\.]+)(\"|\')/gm, arr = null;

    while ((arr = reg.exec(text)) !== null) {
      if (arr && arr[2]) {
        text = text.replace(arr[2], arr[2].replace(/\:/g, '\\'));
      }
    }

    text = text.replace(/\'\'/g, '""').replace(/ /g,'').replace(/\'/g,'').trim();
  }

  return text;
};

Describe.rebuildSpaceInObject = function (text) {
  if (text && _.isString(text)) {
    text = text.replace(/\:/g, ': ').replace(/\,/g, ', ').replace(/\{/g, '{ ').replace(/\}/g, ' }');
  }
  return text;
};

Describe.prototype.TSClass = function(text){
  let exports = {};

  Describe.findAllTSExports(text);

  /*
  if (text && _.isString(text)) {
    let matches = /export(.+)class\s([A-Za-z]+)\s(.+)\{/gm.exec(text), classDescribe = {};

    if (matches && _.isString(matches[0]) && _.isString(matches[1]) && _.isString(matches[2]) && _.isString(matches[3])) {
      classDescribe = {
        default: matches[1].trim() && true || false,
        name: matches[2].trim(),
        interface: matches[3].trim()
      };
    }

    return classDescribe;
  }
  */
};

Describe.prototype.JSproperty = function(text, property) {
  let res = false;

  if (text && property && _.isString(text) && _.isString(property)) {   
    try {
      let matches = new RegExp('^' + property + "\\:\\s\\{$\\n((^(?!\\}\\;).+$\\n)*)^\\}\\,$", 'gm');
      matches = matches.exec(text);

      if (_.isString(matches[1])) {
        matches = Describe.removeStringChar(matches[1]);
        matches = Describe.jsonifyPropertiesAndValues(matches);
        matches = Describe.rebuildSpaceInObject(matches);
        matches = "{\n" + matches + "\n}";
        res = JSON.parse(matches);
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  return res;
};

module.exports = Describe;
