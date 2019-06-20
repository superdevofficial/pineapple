
function Blueprint (options) {
  options = typeof options === 'object' && options || {};

  Blueprint.init.bind(this)();

  Object.assign(this, options);
}

Blueprint.init = function () {
  this.done = 0;
  this.passed = 0;
  this.current = 0;
  this.questions = {};
  this.currentQuestion = 0;
  this.model = null;
}

Blueprint.prototype.nextQuestion = function(){
  this.currentQuestion++;
  return this;
};

Blueprint.prototype.next = function(){
  this.passed++;
  this.current++;
  this.questions = {};
  this.currentQuestion = 0;
  this.model = null;
  return this;
};

Blueprint.prototype.reset = function(){
  Blueprint.init.bind(this)();
  return this;
};

module.exports = Blueprint;
