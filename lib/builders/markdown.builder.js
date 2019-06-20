const BaseBuilder = require('./base.builder.js'),
  path = require('path');

function MarkdownBuilder() {
  BaseBuilder.call(this);

  this.name = 'markdown';
  this.defaultConfig = {
    documentationPath: {
      question: 'Where the documentation\'ll be generated ?',
      value: './documentations'
    },
    feathersServicesRoutes: {
      question: 'Feathers➜ Generate services routes ?',
      condition: `this.models.factoriesUsed.includes('feathers')`,
      value: 'boolean',
    },
    feathersHooks: {
      question: 'Feathers➜ Add documentation about hooks ?',
      condition: `this.models.factoriesUsed.includes('feathers')`,
      value: 'boolean',
    },
    distributeHooks: {
      question: 'Distribute➜ List all custom routes from middleware ?',
      condition: `this.models.factoriesUsed.includes('distribute')`,
      value: 'boolean',
    }
  };

  this.actions = [
    {
      name: 'Name of the Api',
      condition: `Object.keys(models).includes('feathers')`,
      input: 'models.feathers.data',
      output: 'documentation.md',
      template: 'mk-feathers-name.twig',
      noIndent: true,
      callback: this.callbackApiName
    },
    {
      name: 'Listing of services',
      description: '...',
      condition: `Object.keys(models).includes('feathers')`,
      input: 'models.feathers.data',
      output: 'documentation.md',
      template: 'mk-feathers-services.twig',
      noIndent: true,
      callback: this.callbackApiRoutes
    }
  ];

  this.sanitizeDefaultConfig();
}

MarkdownBuilder.prototype = Object.assign(BaseBuilder.prototype);

MarkdownBuilder.prototype.validateConfig = function() {
  if ( this.config.documentationPath ) {
    this.isValid = true;
  }

  return this.isValid;
};

MarkdownBuilder.prototype.writedFilePath = function(fileName) {
  let lastChar = this.config.documentationPath[this.config.documentationPath.length - 1];
  documentationPath = lastChar !== '/' ? this.config.documentationPath + '/' : this.config.documentationPath;
  _path = fileName === 'documentation.md' ? documentationPath + fileName : this.process.cwd() + fileName;
  return path.resolve(_path);
}

module.exports = MarkdownBuilder;