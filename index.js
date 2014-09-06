/*!
* RegJSTraverse
* Copyright 2014 Juilan Viereck <http://jviereck.github.io/>
* Available under MIT license (see LICENSE file)
*/

(function() {

// Unique id
var BREAK = 0;
var SKIP = 1;

function VisitState() {
  this.__doBreak = false;
  this.__doSkip = false;
}

VisitState.prototype.skip = function() {
  this.__doSkip = true;
}

VisitState.prototype.didCallSkip  = function() {
  return this.__doSkip;
}

VisitState.prototype.break = function() {
  this.__doBreak = true;
}

VisitState.prototype.didCallBreak  = function() {
  return this.__doBreak;
}

/**
 * Process a single node.
 * @returns {Boolean} Indicates if break was not called while processing `node`.
 */
function processNode(node, parent, enterFn, leaveFn, state, index) {
  var i, res, doSkip = false, body;

  // Call the `enter` function on the `node` if defined.
  if (enterFn) {
    res = enterFn(/* this=state here (see traverse fn) ,*/ node, parent, index);
    if (res === BREAK || state.__doBreak === true) {
      state.__doBreak = true;
      return false /* break was called */;
    }
    if (res === SKIP || state.__doSkip === true) {
      doSkip = true;
    }
  }

  // If the consumer did not skip the node during the call to `enter`, then
  // process all the child nodes of the current node if there are any.
  if (!doSkip) {
    // The body to process is either the body on the node OR the min/max
    // entry on the `characterClassRange`.
    body = node.body;
    if (node.type === 'characterClassRange') {
      body = [node.min, node.max];
    }
    if (body /* there are child nodes to inspect */) {
      for (i = 0; i < body.length; i++) {
        if (!processNode(body[i], node, enterFn, leaveFn, state)) {
          return false;
        }
      }
    }
  }

  // Call the `leave` function on the `node` if defined.
  if (leaveFn) {
    res = leaveFn(/* this=state here (see traverse fn) ,*/ node, parent, index);
    if (res === BREAK || state.__doBreak === true) {
      state.__doBreak = true;
      return false /* break was called */;
    }
  }

  // Reset the skip flag. Do this at the very end after calling `funcs.leave`
  // as the leave function might invoke skip, which should have no effect.
  state.__doSkip = false;

  return true /* break was not called */;
}

function traverse(ast, funcs) {
  var enterFn, leaveFn;
  var state = new VisitState();

  // Bind the `state` as the first argument of the function. Binding the
  // `this` variable instead of using `funcs.enterFn.call(state,...)` for
  // performance reason.
  if (funcs.enter) enterFn = funcs.enter.bind(state);
  if (funcs.leave) leaveFn = funcs.leave.bind(state);

  // Kick off the traversal from the top node.
  processNode(ast, null, enterFn, leaveFn, state);
  return state;
}

function replace(ast, funcs) {
  // Reusing the travser function in here. Wrapping the `enter` and `leave`
  // from `funcs` to perform the replacement in case a node is returned.
}

var regjstraverse = {
  traverse: traverse,
  replace: replace,
  VisitorOption: {
    Break: BREAK,
    Skip: SKIP
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = regjstraverse;
} else {
  window.regjstraverse = regjstraverse;
}

}());
