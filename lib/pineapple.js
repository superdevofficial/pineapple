const fs = require('fs'),
  path = require('path'),
  pkg = require('../package.json'),
  chalk = require('chalk'),
  figlet = require('figlet'),
  program = require('commander'),
  readline = require('readline'),
  utils = require('./utils/index'),
  _ = require('lodash');

const BaseModel = require('./models/base.model'),
  FeathersModel = require('./models/feathers.model'),
  BaseBuilder = require('./builders/base.builder'),
  CucumberBuilder = require('./builders/cucumber.builder'),
  MarkdownBuilder = require('./builders/markdown.builder');

const TEXTS = {
  TITLE_FINAL: 'Files created',
  ERROR: {
    PREFIX: 'You break something idiot ! ',
    SELECT_SOMETHING: 'You need to select at least a builder AND a model',
    MODEL_EMPTY: 'No model imported !',
    NEED_THIS_QUESTION: 'This question is required !'
  },
  MODEL: {
    TITLE: 'Model',
    INIT: 'Select models',
    NEED: 'Do you want to import this model ?',
    SUCCESSFULL: 'The model was succefully imported !',
    FAILED: 'The model isn\'t imported !',
  },
  BUILDER: {
    TITLE: 'Builder',
    INIT: 'Select builders',
    NEED: 'Do you want to use this builder ?',
    SUCCESSFULL: 'The builder was succefully configurate !',
    FAILED: 'The import was failed !',
  }
};



function Pineapple () {
  this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  this.state = 0;
  this.options = {};
  this.models = {
    data: [],
    factoriesUsed: [],
    needToAsk: true,
    factories: [ FeathersModel ],
    active: { 
      question: TEXTS.MODEL.NEED, 
      value: 'boolean', 
      skipIf: `answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no'` 
    }
  };

  this.builders = {
    data: [],
    factoriesUsed: [],
    needToAsk: true,
    factories: [ /*CucumberBuilder,*/ MarkdownBuilder ],
    active: { 
      question: TEXTS.BUILDER.NEED, 
      value: 'boolean', 
      skipIf: `answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no'` 
    }
  };

  this.logOptions = {
    romanTitleCount: 1,
    titleCount: 1
  };

  this.fontOptions = {
    main: {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    }
  };

  this.colors = {
    green: '#44b752',
    red: '#ce5454',
    yellow: '#d8ce5f',
    blue: '#42a8bc',
  };
  
  program.version(pkg.version)
    .description('Generate documentation, n2n tests and more')
    .option('-m, --model [model]', 'Choose the type of data for building')
    .option('-b, --builder [builder]', 'Choose what you want to build')
    .action(this.init.bind(this));

  program.parse(process.argv);
}

/**
 * Start pineaple experience !
 * @options object
 */
Pineapple.prototype.init = function() {
  this.log('presentation');

  if ( program.model ) {
    console.log(program.model);
    this.models.needToAsk = false;
    this.models.factories = program.model !== 'all' ? 
      this.models.factories.filter((value) => value.name.replace('Model', '').toLowerCase() === program.model.toLowerCase() ? value : false ) : 
      this.models.factories;
  }

  if ( program.builder ) {
    this.builders.needToAsk = false;
    this.builders.factories = program.builder !== 'all' ? 
      this.builders.factories.filter((value) => value.name.replace('Builder', '').toLowerCase() === program.builder.toLowerCase() ? value : false) : 
      this.builders.factories;
  }

  this.controller(1);
}

/**
 * Check if all is good for start the building
 */
Pineapple.prototype.controller = function(state) {
  this.state = typeof state === 'number' ? state : this.state + 1;

  switch (this.state) {
    case 1:
      this.initializeModel();
      break;
    case 2:
      this.initializeBuilder();
      break;
    case 3:
      this.buildAll();
    case 4:
      this.shutdown();
      break;
    default:
      this.init();
      break;
  }
};

/**
 * Init all models
 * @blueprint object
 */
Pineapple.prototype.initializeModel = function() {
  if ( this.builders.factories.length < 1 || this.models.factories.length < 1 ) {
    this.error(TEXTS.ERROR.SELECT_SOMETHING);
    this.shutdown();
    return;
  }

  this.logOptions.titleCount = 1;
  this.log('romanTitle', TEXTS.MODEL.INIT );
  this.askAllQuestions('model', new utils.Blueprint());
};

Pineapple.prototype.initializeBuilder = function() {
  if ( this.models.data.length < 1 ) {
    this.error(TEXTS.ERROR.MODEL_EMPTY);
    this.shutdown();
    return;
  }

  this.logOptions.titleCount = 1;
  this.log('romanTitle', TEXTS.BUILDER.INIT );
  this.askAllQuestions('builder', new utils.Blueprint());
};

Pineapple.prototype.initializeBlueprint = function (index, blueprint) {
  if ( !blueprint.model ) {
    let MasterClass = eval('Base' + index.capitalize());
    blueprint.model = new this[index.pluriel()].factories[blueprint.current]();
    blueprint.questions = this[index.pluriel()].needToAsk ? 
      blueprint.model.setDefaultConfig('active', this[index.pluriel()].active) :
      blueprint.model.getDefaultConfig();

    this.log('title', TEXTS[index.toUpperCase()].TITLE + '➜ ' + chalk.underline(blueprint.model.name.capitalize()));
    if ( !(blueprint.model instanceof MasterClass) ) 
      return false;
  }

  return blueprint;
};

Pineapple.prototype.buildAll = function() {
  let fileWrited = [];

  for (let builder of this.builders.data) {
    let res = builder.build(this.models.data);
    if (res && _.isArray(res.done)){
      fileWrited = fileWrited.concat(res.done);
    }
  }

  this.log('romanTitle', TEXTS.TITLE_FINAL);

  if (fileWrited.length > 0) {
    for (let file of fileWrited){
      this.success('- ' + file);
    }
  } else {
    this.error('No files was created !');
  }

  this.log('break');
  this.controller();
};

Pineapple.prototype.askAllQuestions = function (index, blueprint) {
  let tmpBlueprint = this.initializeBlueprint(index, blueprint)

  if ( tmpBlueprint !== false ) {
    blueprint = tmpBlueprint;
    let indexQuestion = Object.keys(blueprint.questions)[blueprint.currentQuestion],
    question = blueprint.questions[indexQuestion];

    if ( question && question.question && question.value && eval(question.condition) ) {
      this.ask(question.question + ' ' + this.example('question', question), answer => {
        if ( typeof question.skipIf === 'string' && eval(question.skipIf) ) this.next(index, blueprint, true);

        if (question.value === 'boolean') {
          blueprint.model.config[indexQuestion] = (typeof answer === 'string' && (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') ) ? 
            false : true;
        } else
          blueprint.model.config[indexQuestion] = (typeof answer === 'string' && answer !== '') ? 
            answer : question.value;

        this.next(index, blueprint);
      });
    } else if ( question && question.stopIfNoAnswer ) {
      this.log('error', TEXTS.ERROR.NEED_THIS_QUESTION);
      this.shutdown();
    } else {
      this.next(index, blueprint);
    }
    
    return;
  }

  this.next(index, blueprint, true);
};

Pineapple.prototype.next = function(index, blueprint, skipQuestion) {
  if ( (blueprint.currentQuestion + 1) !== Object.keys(blueprint.questions).length && !skipQuestion ) {
    this.askAllQuestions(index, blueprint.nextQuestion());
  } else {
    blueprint.model.init();

    if ( blueprint.model.isValid ) {
      this[index.pluriel()].data.push(blueprint.model);
      this[index.pluriel()].factoriesUsed.push(blueprint.model.name);
      this.success(TEXTS[index.toUpperCase()].SUCCESSFULL);
    } else 
      this.log('warn', TEXTS[index.toUpperCase()].FAILED);

    this.log('break');
    blueprint.next();
    blueprint.passed === this[index.pluriel()].factories.length ?
      this.controller() :
      this.askAllQuestions(index, blueprint);
  }
};

Pineapple.prototype.example = function(type, data) {
  let res = '';
  switch(type) {
    case 'question':
      res = chalk.grey( data.value === 'boolean' ? '[Y/n]' : '(' + data.value + ')');
      break;
  }
  return res;
}

Pineapple.prototype.shutdown = function() {
  this.rl.close();
}

Pineapple.prototype.error = function(text) {
  this.log('error', text);
};

Pineapple.prototype.ask = function(text, callback) {
  this.log(text, callback);
};

Pineapple.prototype.success = function(text) {
  this.log('success', text);
};

Pineapple.prototype.log = function(text, plus) {
  let self = this;

  if ( text === 'presentation' ) {
    console.clear();
    console.log(figlet.textSync(pkg.title, this.fontOptions.main));
    this.log('line');
    console.log(chalk.bold(pkg.description));
    this.log('line');
  } else if ( text === 'line' ) {
    console.log(`----------------------------------------\r`);
  } else if ( text === 'back' ) {
    console.log(`\n`);
  } else if ( text === 'break' ) {
      console.log(`\r`);
  } else if ( text === 'clean' ) {
    console.clear();
  } else if ( text === 'romanTitle' ) {
    let startLine = chalk.hex(this.colors.yellow)('[ ' + this.logOptions.romanTitleCount.toRoman() + ' ] ');
    console.log(chalk.hex(this.colors.yellow)(chalk.bold(startLine + plus || '')));
    this.logOptions.romanTitleCount++;
  } else if ( text === 'title' ) {
    console.log(chalk.hex(this.colors.green)(chalk.bold('( ' + this.logOptions.titleCount + ' ) ' + plus || '')));
    this.logOptions.titleCount++;
  } else if ( text === 'warn' ) {
    console.log(chalk.bold(chalk.hex(this.colors.yellow)('(u_u) ') + (plus || '')));
  } else if ( text === 'error' ) {
    console.log(chalk.bold(chalk.hex(this.colors.red)('(ఠ_ఠ) ' + TEXTS.ERROR.PREFIX) + (`➜  `+plus || '')));
  } else if ( typeof plus === 'function' ) {
    let startLine = chalk.hex(this.colors.green)('(°o°) ');
    self.rl.question( chalk.bold(startLine + text) + ' ', answer => plus.bind(self)(answer) );
  } else if ( text === 'success' ) {
    console.log(chalk.hex(this.colors.blue)(chalk.bold('(^ပ^) ' + plus)));
  } else {
    let startLine = chalk.hex(this.colors.green)('(^-^) ');
    console.log(chalk.bold(startLine + text));
  }
};

module.exports = Pineapple;
