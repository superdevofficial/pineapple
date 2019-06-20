const fs = require('fs');
const BaseModel = require('./base.model.js');

function FeathersModel() {
  BaseModel.call(this);

  this.name = 'feathers';
  this.defaultConfig = {
    feathersGenPath: {
      question: 'Path to the feathers gen specs ?',
      value: './app/feathers-gen-specs.json'
    },
    sourcesPath: {
      question: 'Path to the source folder ?',
      value: './app/src'
    }
  };

  this.actions = [
    { do: 'log', comment: 'Get the whole app configuration' },
    { do: 'read', path: 'this.config.feathersGenPath', useProcessPath: true },
    { do: 'set' },

    { do: 'log', comment: 'Get general hooks' },
    { do: 'read', path: 'this.config.sourcesPath + "/" + "app.hooks.ts"', useProcessPath: true, to: 'string' },
    { do: 'sanitize', comments: true, unescape: true, multipleSpace: true },
    { do: 'search', key: /before\:.\{(.*?)\}\,/gms },
    { do: 'map', to: 'object' },
    { do: 'set', in: 'this.data.app', value: { hooks: {} }, assign: true },
    { do: 'set', in: 'this.data.app.hooks', assign: true },

    { do: 'log', comment: 'Check if auth is required for the whole application' },
    { do: 'get', target: 'this.data.app.hooks' },
    { do: 'map', to: 'string' },
    { do: 'search', key: 'authenticate' },
    { do: 'set', in: 'this.data.app.needAuth' },

    { do: 'log', comment: 'List all services' },
    { for: 'this.data.services', each: [
      { do: 'log', comment: 'Get Folder path' },
      { do: 'exist', path: 'this.config.sourcesPath + "/services/" + this.data.fileName', useProcessPath: true, thenReturn: 'crossData' },
      { do: 'set', in: 'this.data.folder' },

      { do: 'log', comment: 'Get all before hooks for the service' },
      { do: 'read', path: 'this.data.folder + "/" + this.data.fileName + ".hooks.ts"', to: 'string' },
      { do: 'sanitize', comments: true, unescape: true, multipleSpace: true, quote: true },
      { do: 'save' },
      { do: 'search', key: /before\:.\{(.*?)\}\,/gms, to: 'object'},
      { do: 'set', in: 'this.data', value: { hooks: { before: {}, after: {} } }, assign: true },
      { do: 'set', in: 'this.data.hooks.before', assign: true },

      { do: 'log', comment: 'Get all after hooks for the service' },
      { do: 'search', in: 'this.saveData', key: /after\:.\{(.*?)\}\,/gms, to: 'object'},
      { do: 'set', in: 'this.data.hooks.after', assign: true },

      { do: 'log', comment: 'Check if auth is required' },
      { do: 'get', target: 'this.data.hooks.before' },
      { do: 'search', key: 'authenticate' },
      { do: 'set', in: 'this.data.needAuth' },

      { do: 'log', comment: 'Describe model' },
      { do: 'read', path: 'this.data.folder + "/" + this.data.fileName + ".schema.ts"', to: 'string' },
      { do: 'sanitize', comments: true, removeTab: true, quote: true },
      { do: 'save' },
      { do: 'search', key: /properties\:.\{\n(((?!\}\;).+\n)*)/gm, to: 'object'},
      { do: 'set', in: 'this.data.model' },
      { do: 'search', in: 'this.saveData', key: /required\:.\[\n(((?!\]\;|\]\,).+\n)*)/gm, to: 'array'},
      { do: 'set', in: 'this.data.modelRequired' },
      { do: 'search', in: 'this.saveData', key: /uniqueItemProperties\:.\[\n(((?!\]\;|\]\,).+\n)*)/gm, to: 'array'},
      { do: 'set', in: 'this.data.modelUnique' },

      { do: 'log', comment: 'Describe class' },
      { do: 'read', path: 'this.data.folder + "/" + this.data.fileName + ".class.ts"', to: 'string' },
      { do: 'describe', type: 'class' },
      { do: 'set', in: 'this.data.customClass' },
    ]},
  ];

  this.sanitizeDefaultConfig();
}

FeathersModel.prototype = Object.assign(BaseModel.prototype);

FeathersModel.prototype.validateConfig = function() {
  if ( typeof this.config.feathersGenPath === 'string' && typeof this.config.sourcesPath === 'string' ) {
    this.isValid = true;
    this.doAllActions();
  }
};

module.exports = FeathersModel;