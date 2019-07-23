const Blueprint = require('./blueprint'),
  Parser = require('./parser'),
  Logger = require('./logger'),
  Describe = require('./describe'),
  _ = require('lodash');

String.prototype.noIndent = function() {
  return this.replace(/^\s+/mg, '');
};

String.prototype.urlify = function() {
  return this.trim().replace(/\s/g, '%20');
};

String.prototype.jsonSanitize = function() {
  let target = this.toString()
    .sanitizeSpaceForObject()
    .sanitizeExpressionInString()
    .sanitizeFunctionInObject();

  matches = target.match(/([\-\w\(\)\.\'\`\|\s\/\=\>\!]+)/g);
  matches = matches.unescapeAll();
  matches = matches.trimAll();
  matches = matches.removeDuplicate();

  matches.forEach(match => {
    match = match.trim();
    if (match !== '') {
      let toReplace = match;

      if (match === 'true') match = true;
      else if (match === 'false') match = false;
      else if (!isNaN(match) ) match = match.includes('.') ? parseFloat(match) : parseInt(match, 10);
      else if (match[0] === `\'` && match[match.length-1] === `\'`) { match = match.replaceAt(0,'"'); match = match.replaceAt(match.length-1,'"') }
      else match = '"' + match + '"';

      target = target.split(` `+toReplace).join(match);
    }
  });

  return target;
};

String.prototype.sanitizeFunctionInObject = function() {
  let text = this;
  matches = text.reg(/(\(\w+(\:\s{1,}\w+)\))/g, 2);

  if (Array.isArray(matches)) 
    matches.forEach(match => { if(match) text = text.replace(match, ''); });

  return text;
};

String.prototype.sanitizeExpressionInString = function() {
  return this.replace(/(\'[a-zA-Z\:\{\}\s]+\')/gm, 'string')
};

String.prototype.sanitizeSpaceForObject = function() {
  return this.replace(/\s/g, '')
    .replaceAll('{', '{ ')
    .replaceAll('}', ' }')
    .replaceAll('[', '[ ')
    .replaceAll(']', ' ]')
    .replaceAll(':', ': ')
    .replaceAll(',', ', ')
    .replaceAll('[  ]', '[]');
};

String.prototype.reg = function(re, index) {
  var m, res = [];
  do {
    m = re.exec(this);
    if (m) res.push(m[index].trim());
  } while (m);
  return res;
};

String.prototype.findRegExp = function(re, returnFirst) {
  var m, res = {};
  do {
    m = re.exec(this);
    if (m) res[m[0]] = m[1].trim();
  } while (m);
  return returnFirst === true ? Object.values(res)[0] : res;
};

String.prototype.unescape = function() {
  var target = this;
  return target.replace(/\r?\n|\r/g,'');
};

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.pluriel = function() {
  return this + 's';
};

String.prototype.replaceAt = function(index, replacement) {
  return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
};

Array.prototype.unescapeAll = function() {
  return this.map(match => _.isString(match) ? match.unescape() : match);
};

Array.prototype.trimAll = function() {
  return this.map(match => _.isString(match) ? match.trim() : match);
};

Array.prototype.copy = function () {
  var newOne = [];
  this.forEach(function(value, index){ newOne.push(value); })
  return newOne;
};

Array.prototype.removeDuplicate = function() {
  return this.filter(function(elem, index, self) {
    return index == self.indexOf(elem);
  });
};

Number.prototype.toRoman = function () {
  if (isNaN(this)) return NaN;
  var digits = String(+this).split(""),
      key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
              "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
              "","I","II","III","IV","V","VI","VII","VIII","IX"],
      roman = "",
      i = 3;
  while (i--) roman = (key[+digits.pop() + (i * 10)] || "") + roman;
  return Array(+digits.join("") + 1).join("M") + roman;
};

module.exports = {
  Blueprint,
  Parser,
  Describe,
  Logger
}