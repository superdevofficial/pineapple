const _ = require('lodash'),
  fs = require('fs'),
  utils = require('../utils/index.js'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  process = require('process'),
  Logger = require('./logger'),
  Describe = require('./describe');


function Parser(config) {
  this.methodsWithBuildHelpers = ['read','exist','search'];
  this.reset(config);
}

Parser.prototype.reset = function(config) {
  config = config || {};
  this.logger = new Logger({inForEach: config.inForEach||false});
  this.config = config;
  this.data = {};
  this.describer = new Describe(config);
  this.resetSavedData();
  this.resetCrossData();

  return this;
};

Parser.prototype.doAction = function(action) {
  let condition = action.condition ? action.condition : 'true';

  if (action && eval(condition)) {
    if (action.for && action.each) {
      // FOR OPEREATOR
      this.logger.addOperator('for', action.for);
      this.forEach(action);
    } else if (action.if) {
      // IF OPEREATOR
      this.logger.addOperator('if', action.if);
      this.if(action);
    } else if (action.do && typeof this[action.do] === 'function') {
      // ACTIONS
      this.methodsWithBuildHelpers.includes(action.do) ? 
        Parser.buildMapHelpers(this, action, action.do):
        this[action.do](action);

      this.logger.addAction(action, this.crossData);
    }
  }

  return this;
};

Parser.prototype.resetCrossData = function() {
  this.crossData = false;

  return this;
};

Parser.prototype.resetSavedData = function() {
  this.savedData = false;

  return this;
};

Parser.prototype.save = function(action) {
  this.saveData = _.isObject(this.crossData) ? _.cloneDeep(this.crossData) : this.crossData;

  return this;
};

Parser.prototype.read = function(action) {
  let pathToFile = action.file || this.crossData, ext = path.extname(pathToFile);

  if (_.isString(pathToFile) && fs.existsSync(pathToFile)) {
    this.crossData = fs.readFileSync(pathToFile);
    if (ext === '.json')
      this.crossData = JSON.parse(this.crossData);
  } else
    this.crossData = false;

  return this;
};

Parser.prototype.build = function(action) {
  if (_.isString(action.path)) {
    let filePath = action.path ? eval(action.path) : false;
    filePath = action.useProcessPath === true ? process.cwd() + '/' + filePath : filePath;
    this.crossData = typeof filePath === 'string' ? path.resolve(filePath) : false;
  }
  
  return this;
};

Parser.prototype.map = function(action) {
  if (this.crossData === false) return this;

  if (action.to === 'string' && _.isBuffer(this.crossData)) {
    this.crossData = this.crossData.toString('utf8');
  }
  else if (action.to === 'string' && _.isObject(this.crossData)) {
    this.crossData = JSON.stringify(this.crossData);
  }
  else if (action.to === 'object' && !_.isObject(this.crossData)) {
    this.crossData = Parser.tryToBuildObject(this.crossData);
  }
  else if (action.to === 'array' && _.isString(this.crossData)) {
    this.crossData = this.crossData.replace(/\'|\"|\n|\r/g,'').split(',');
  }
  
  return this;
};

Parser.prototype.get = function(action) {
  if (action.target && _.has(this, action.target.replace('this.', ''))) {
    this.crossData = _.get(this, action.target.replace('this.', ''));
  }

  return this;
};

Parser.prototype.set = function(action) {
  let value = Parser.parseValue(action.value) || this.crossData || false;
  if (value !== false) {
    let target = _.isString(action.in) ? action.in.replace('this.', '') : 'data';
    value = Parser.checkType(action.type || 'null', value);

    action.assign === true ? 
      _.assign(_.get(this, target), value): 
      _.set(this, target, value);
  }

  return this;
};

Parser.prototype.sanitize = function(action) {
  if (this.crossData && _.isString(this.crossData)) {
    if (action.comments === true)
      this.crossData = this.crossData.replace(/^.*\/\/.*$/gm, '');
    if (action.unescape === true)
      this.crossData = this.crossData.unescape();
    if (action.multipleSpace === true)
      this.crossData = this.crossData.replace(/\s\s\s/g,'');
    if (action.removeTab === true)
      this.crossData = this.crossData.replace(/^(\s)+/gms, '');
    if (action.quote === true)
      this.crossData = this.crossData.replaceAll('"', `'`);
  }

  return this;
};

Parser.prototype.search = function(action) {
  let searchIn = (action.in && eval(action.in)) || this.crossData;
  searchIn = searchIn || false;

  if (searchIn !== false && action.key) {
    if (_.isObject(searchIn)) searchIn = JSON.stringify(searchIn);

    this.crossData = _.isRegExp(action.key) ? 
      searchIn.findRegExp(action.key, true) : 
      searchIn.includes(action.key.trim());

    this.crossData = this.crossData ? this.crossData : false;
  }

  return this;
};

Parser.prototype.describe = function(action) {
  if (_.isString(action.type) && _.isString(this.crossData)) {
    switch (action.type) {
      case 'class':
        let classDescribe = Parser.describeClass(this.crossData),
        commentDescribe = Parser.describeClassComments(this.crossData),
        methodsDescribe = Parser.describeClassMethod(this.crossData);

        this.crossData = Object.assign(classDescribe, { comment: commentDescribe }, { methods: methodsDescribe })
        break;
      case 'comment':
        this.crossData = Parser.describeClassComments(this.crossData);
        break;
      case 'JSproperty':
        if (action.index)
          this.crossData = this.describer.JSproperty(this.crossData, action.index);
        break;
    }
  }

  return this;
};

Parser.prototype.exist = function(action) {
  // File Case 
  if (_.isString(action.path)) {
    let saveCrossData = this.crossData;
    this.crossData = _.isString(this.crossData) ? fs.existsSync(this.crossData) : false;
    if (_.isString(action.thenReturn) && this.crossData === true)
      this.crossData = action.thenReturn === 'crossData' ? saveCrossData : eval(action.thenReturn);
  }

  return this;
};

Parser.prototype.log = function(action) {
  if (action.log)
    console.log('[Parser]', eval(action.log));
  if (action.comment)
    this.logger.addComment(action.comment);

  return this;
};

Parser.prototype.end = function() {
  let data = this.data;
  this.reset();
  return data;
};

Parser.prototype.if = function(action) {
  // TODO: make a if else then method

  return this;
};

Parser.prototype.forEach = function(action) {
  let each = action.each
  datas =  _.isString(action.for) ? eval(action.for) : this.data;

  if ( _.isArray(datas) ) {
    datas.forEach(((data, index) => datas[index] = this.forOne(data, each)).bind(this));
  } else if (_.isObject(datas)) {
    let keys = Object.keys(datas);
    keys.forEach((key => datas[key] = this.forOne(datas[key], each)).bind(this));
  }

  _.isString(action.for) ?
    _.set(this, action.for.replace('this.', ''), datas) :
    this.data = datas;

  return this;
};

Parser.prototype.forOne = function(data, each) {
  if (_.isFunction(each)) {
    return each.bind(this)(data);
  } else if (_.isArray(each)) {
    let conf = Object.assign(_.cloneDeep(this.config), { inForEach: true }),
    parser = new Parser(conf);
    parser.data = data;
    each.forEach(action => parser.doAction(action));
    return _.cloneDeep(parser.end());
  }
};

Parser.checkType = function(type, value) {
  switch(type) {
    case 'boolean':
      return value !== false;
      break;
    default:
      return value;
      break;
  }
};

Parser.tryToBuildObject = function(file) {
  let fileStringify = _.isBuffer(file) ? file.toString('utf8') : file;
  fileStringify = fileStringify.trim(),
  fileLength = fileStringify.length;

  if (fileStringify[0] !== '{') fileStringify = '{ ' + fileStringify;
  if (fileStringify[fileLength - 2] === '}') fileStringify = fileStringify.slice(0, -1);
  else if (fileStringify[fileLength-1] !== '}') fileStringify += ' }';

  try {
    let jsonStringify = fileStringify.jsonSanitize();
    return JSON.parse(jsonStringify);
  } catch(e) {
    return false;
  }
};

Parser.parseValue = function(value) {
  return (_.isString(value) && eval(value)) || (_.isObject(value) && value);
};

Parser.buildMapHelpers = function(parser, action, method) {
  if (_.isString(action.path)) parser.build.bind(parser)(action);
  parser = parser[method].bind(parser)(action);
  if (_.isString(action.to) || _.isBoolean(action.toString)) parser.map.bind(parser)(action);
};

Parser.describeClass = function(value) {
  let matches = /export(.+)class\s([A-Za-z]+)\s(.+)\{/gm.exec(value), classDescribe = {};

  if (matches && _.isString(matches[0]) && _.isString(matches[1]) && _.isString(matches[2]) && _.isString(matches[3])) {
    classDescribe = {
      default: matches[1].trim() && true || false,
      name: matches[2].trim(),
      interface: matches[3].trim()
    };
  }

  return classDescribe;
};

Parser.describeClassComments = function(value) {
  let matches = /\/\*\*\*\s+(\w+)\*(.+)\*\//gm.exec(value), commentDescribe = {};

  if (matches && _.isString(matches[0]) && _.isString(matches[1]) && _.isString(matches[2])) {
    commentDescribe = {
      title: matches[1].trim(),
      desc: matches[2].trim(),
    };
  }

  return commentDescribe;
};

Parser.describeClassMethod = function(value) {
  let regEx = /^\s+(public|private|protected|\w+)(.+)?\s(\w+)(\(|\s\()(.+)\)([a-zA-Z\:\s\<\>\[\]\|]+\{|\0)$/gm,
  matches = regEx.exec(value), methodsDescribe = [];
  while (matches != null) {
    if (matches && matches[3] && matches[5] && matches[6]){
      let scope = matches[1] && matches[1].trim() || 'public',
      isAsync = matches[2] && matches[2].trim() === 'async' || false,
      name = matches[3].trim(),
      params = matches[5].trim().split(','),
      response = matches[6] && matches[6].trim() && matches[6].replace(':','').replace('{','').trim() || 'void';
      methodsDescribe.push({
        scope: scope ? scope : 'public',
        isAsync,
        name,
        params,
        response
      });
    }

    matches = regEx.exec(value);
  }

  methodsDescribe = methodsDescribe.filter((value)=>value.env !== 'export');
  return methodsDescribe;
};

module.exports = Parser;