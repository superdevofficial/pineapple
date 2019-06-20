const utils = require('../utils/index.js'),
  process = require('process'),
  _ = require('lodash');

function BaseModel () {
  this.name = '';
  this.defaultConfig = {};
  this.isValid = false;
  this.config = Object.assign(this.getDefaultConfig(true));
  this.data = {};
  this.process = process;
  this.actions = [];
  this.parser = {};
}

BaseModel.prototype.sanitizeDefaultConfig = function() {
  Object.values(this.defaultConfig).map(((value) => {
    value.condition = value.condition || 'true';
    return value;
  }).bind(this));
}

BaseModel.prototype.init = function (config) {
  if ( typeof config === 'object' && config !== null ) {
    this.config = Object.assign(this.config, config);
  }

  return this.validateConfig();
};

BaseModel.prototype.setDefaultConfig = function(name, config) {
  if ( typeof config === 'object' && config && typeof config.question === 'string' && config.value && typeof name === 'string' ) {
    if (!config.condition) config.condition = 'true';

    this.defaultConfig = Object.assign({[name]: config}, this.defaultConfig);
  }

  return this.getDefaultConfig();
};

BaseModel.prototype.getDefaultConfig = function(simplified) {
  let res = Object.assign(this.defaultConfig);

  if ( simplified === true ) {
    Object.keys(this.defaultConfig).map(((key, index) => {
      if (!key.condition) key.condition = '';
      res[key] = this.defaultConfig[key].hasOwnProperty('value') ? this.defaultConfig[key].value : null;
    }).bind(this));
  }

  return res;
};

BaseModel.prototype.validateConfig = function() {
  if (this.isValid)
    this.doAllActions();
};

BaseModel.prototype.generateData = function() {};

BaseModel.prototype.doAllActions = function() {
  if (this.isValid) {
    let log = { done: 0, passed: 0, total: this.actions.length };
    this.parser = new utils.Parser(this.config);
    this.actions.forEach(((action) => {
      if (action) {  
        this.parser.doAction(action);
        log.done++;
      }
      log.passed++;
    }).bind(this));
    
    this.data = this.parser.end();
  }
};

module.exports = BaseModel;