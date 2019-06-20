const _ = require('lodash'),
  fs = require('fs'),
  utils = require('../utils/index.js'),
  path = require('path'),
  Twig = require('twig'),
  mkdirp = require('mkdirp'),
  process = require('process');

function BaseBuilder() {
  this.name = '';
  this.defaultConfig = {};
  this.isValid = false;
  this.config = Object.assign(this.getDefaultConfig(true));
  this.actions = [];
  this.outputList = {};
  this.separator = `\n\n`;
  this.process = process;
  this.templatesPath = path.resolve(__dirname + '/../templates');
}

BaseBuilder.prototype.sanitizeDefaultConfig = function() {
  Object.values(this.defaultConfig).map(((value) => {
    value.condition = value.condition || 'true';
    return value;
  }).bind(this));
}

BaseBuilder.prototype.init = function(config) {
  if ( typeof config === 'object' && config !== null ) {
    this.config = Object.assign(this.config, config);
  }

  return this.validateConfig();
};

BaseBuilder.prototype.setDefaultConfig = function(name, config) {
  if ( typeof config === 'object' && config && typeof config.question === 'string' && config.value && typeof name === 'string' ) {
    if (!config.condition) config.condition = 'true';

    this.defaultConfig = Object.assign({[name]: config}, this.defaultConfig);
  }

  return this.getDefaultConfig();
}

BaseBuilder.prototype.getDefaultConfig = function(simplified) {
  let res = Object.assign(this.defaultConfig);

  if ( simplified === true ) {
    Object.keys(this.defaultConfig).map(((key, index) => {
      if (!key.condition) key.condition = '';
      res[key] = this.defaultConfig[key].hasOwnProperty('value') ? this.defaultConfig[key].value : null;
    }).bind(this));
  }

  return res;
};

BaseBuilder.prototype.validateConfig = function() {
  if ( this.config ) {
    this.isValid = true;
    this.generateData();
  }
};

BaseBuilder.prototype.build = function (modelsNoMapped) {
  if (modelsNoMapped) {
    let models = {};
    modelsNoMapped.forEach(model => models[model.name] = model);
    let test = this.doAllActions(models);
    return test;
  }
  return false;
};

BaseBuilder.prototype.doAllActions = function (models) {
  let log = { done: 0, passed: 0, total: this.actions.length }

  for (let action of this.actions) {
    if (action && action.name && action.input && action.output && action.template) {
      let condition = typeof action.condition === 'string' ? action.condition : 'true';
      if (eval(condition)) {
        let template = this.readTemplate(this.templatesPath + '/' + action.template);
        template = action.noIndent === true ? template.noIndent() : template;
        template = this.bugFixTemplate(template);

        let data = this.beforeAction(action, models),
        blueprint = this.doAction(action, data, models, template);
        blueprint = this.afterAction(action, data, models, blueprint);
        log.done++;
        this.saveOutput(action.output, blueprint);
      }
    }
    log.passed++;
  }

  return ( log.passed === log.total ) ? this.write() : false;
};

BaseBuilder.prototype.doAction = function (action, data, models, template) {
  let blueprint = '';

  if ( typeof action.callback === 'function' ) {
    blueprint = action.callback.bind(this)(data, models, template);
  } else {
    blueprint = this.populateTemplate(data, template);
  }

  return blueprint;
};

BaseBuilder.prototype.beforeAction = function (action, models) {
  let pineappleData = { actionName: action.name||'', actionDescription: action.description||'', config: this.config },
  data = Object.assign({pineapple: pineappleData}, eval(action.input));

  if ( typeof action.callbackBefore === 'function' ) {
    data = action.callbackBefore.bind(this)(data, models);
  }

  return data;
};

BaseBuilder.prototype.afterAction = function (action, data, models, blueprint) {
  if ( typeof action.callbackAfter === 'function' ) {
    blueprint = action.callbackAfter.bind(this)(data, models, blueprint);
  }

  return blueprint;
};

BaseBuilder.prototype.saveOutput = function (output, blueprint) {
  if ( this.outputList[output] )
    this.outputList[output].push(blueprint);
  else
    this.outputList[output] = [ blueprint ];
};

BaseBuilder.prototype.populateTemplate = function (data, template) {
  return Twig.twig({ id: data.pineapple.actionName.urlify(), data: template }).render(data);
};

BaseBuilder.prototype.writedFilePath = function(fileName) {
  return path.resolve(this.process.cwd() + fileName);
};

BaseBuilder.prototype.write = function () {
  let log = { passed: 0, done: [], total: Object.keys(this.outputList) };

  for (let outputFileName in this.outputList) {
    let data = this.outputList[outputFileName];
    data = data.join(this.separator),
    pathFile = this.writedFilePath(outputFileName)
    log.passed++;

    try {
      this.writeFile(pathFile, data);
      log.done.push(pathFile);
    } catch(e) {}
  }

  return log;
};

BaseBuilder.prototype.readTemplate = function (filePath) {
  return this.readFile(filePath).toString('utf8');
};

BaseBuilder.prototype.readFile = function (filePath) {
  let file = fs.readFileSync(filePath);
  return file;
};

BaseBuilder.prototype.writeFile = function (_path, data) {
  mkdirp(path.dirname(_path), function (err) {
    if (err) console.error(err);
    fs.writeFileSync(_path, data);
  });
};

BaseBuilder.prototype.bugFixTemplate = function (template) {
  return template.replace(/\<break\>/gm, `\r`);
};

module.exports = BaseBuilder;