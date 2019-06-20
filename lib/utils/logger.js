const _ = require('lodash'),
  chalk = require('chalk'),
  debug = require('debug')('pineaple');

function Logger (options) {
  this.actions = 0; 
  this.operators = 0;
  this.total = 0;
  this.color = '#42f48c';
  if (_.isObject(options)) Object.assign(this, options);
}

Logger.prototype.addComment = function(text) {
  debug( this.count() + chalk.hex(this.color)( chalk.bold('comment') + ' ➜ ' + text ) );
};

Logger.prototype.addAction = function(action, value) {
  let key = chalk.bold(action.do);
  this.actions++;
  this.total++;
  debug( this.count() + `${key} ➜ ` + ( (value.length > 20) && typeof value || value ));
};

Logger.prototype.addOperator = function(key, value) {
  key = chalk.bold(key);
  this.operators++;
  this.total++;
  debug( this.count() + `${key} ➜ ` + ( (value.length > 20) && typeof value || value ));
};

Logger.prototype.concat = function(logger) {
  this.actions += logger.actions;
  this.operators += logger.operators;
  this.total += logger.total;
};

Logger.prototype.count = function(self) {
  return this.inForEach === true ? 
  chalk.hex('#f4c542')('_' + chalk.bold(this.total + ' ')): 
  chalk.hex('#f4c542')(chalk.bold(this.total + ' '));
};

module.exports = Logger;