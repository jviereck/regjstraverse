/*!
* RegJSTraverse
* Copyright 2014 Juilan Viereck <http://jviereck.github.io/>
* Available under MIT license (see LICENSE file)
*/

(function() {

// Unique id
var BREAK = {};
var SKIP = {};

function TraverseState() {
  this.__doBreak = false;
  this.__doSkip = false;
}

TraverseState.prototype.skip = function() {
  this.__doSkip = true;
}

TraverseState.prototype.didCallSkip  = function() {
  return this.__doSkip;
}

TraverseState.prototype.break = function() {
  this.__doBreak = true;
}

TraverseState.prototype.didCallBreak  = function() {
  return this.__doBreak;
}

function ReplaceState() {
  TraverseState.call(this);
  this.__replaceWith = null;
}
ReplaceState.prototype = new TraverseState();

ReplaceState.prototype.replace = function(node) {
  this.__replaceWith = node;
}

/**
 * Process a single node.
 * @returns {Boolean} Indicates if break was not called while processing `node`.
 */
function processNode(node, parent, enterFn, leaveFn, state) {
  var i, res, doSkip = false, body, replaceWith = null, isCharacterClassRange;

  // Call the `enter` function on the `node` if defined.
  if (enterFn) {
    res = enterFn(/* this=state here (see traverse fn) ,*/ node, parent);
    if (state.__replaceWith) {
      node = replaceWith = state.__replaceWith;
      state.__replaceWith = null;
    }
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
    isCharacterClassRange = node.type === 'characterClassRange';
    if (isCharacterClassRange) {
      body = [node.min, node.max];
    }
    if (body /* there are child nodes to inspect */) {
      for (i = 0; i < body.length; i++) {
        res = processNode(body[i], node, enterFn, leaveFn, state);
        if (state.__replaceWith) {
          if (isCharacterClassRange) {
            if (i === 0) {
              node.min = state.__replaceWith;
            } else {
              node.max = state.__replaceWith;
            }
          } else {
            body[i] = state.__replaceWith;
          }
          state.__replaceWith = null;
        }
        if (!res) {
          return false;
        }
      }
    }
  }

  // Call the `leave` function on the `node` if defined.
  if (leaveFn) {
    res = leaveFn(/* this=state here (see traverse fn) ,*/ node, parent);
    if (state.__replaceWith) {
      replaceWith = state.__replaceWith;
    }
    if (res === BREAK || state.__doBreak === true) {
      state.__doBreak = true;
      return false /* break was called */;
    }
  }

  // Reset the skip flag. Do this at the very end after calling `funcs.leave`
  // as the leave function might invoke skip, which should have no effect.
  state.__doSkip = false;
  state.__replaceWith = replaceWith;

  return true /* break was not called */;
}

function traverse(ast, funcs, customState) {
  var enterFn, leaveFn;
  var state = customState || new VisitState();

  // Bind the `state` as the first argument of the function. Binding the
  // `this` variable instead of using `funcs.enterFn.call(state,...)` for
  // performance reason.
  if (funcs.enter) enterFn = funcs.enter.bind(state);
  if (funcs.leave) leaveFn = funcs.leave.bind(state);

  // Kick off the traversal from the top node.
  processNode(ast, null, enterFn, leaveFn, state);
}

/**
 * Replace a single node.
 * @returns {Boolean} Indicates if break was not called while processing `node`.
 */
function replace(ast, funcs, customState) {
  var enterFn, leaveFn, userEnterFn, userLeaveFn;

  // Using a different kind of state here as in the `traverse` function.
  // This state allows the call to `replace` and has a new property
  // `this.__replaceWith`.
  var state = customState || new ReplaceState();

  // Wrap the enter and leave functions to move the return values onto the
  // state. This is necessary, as the `processNode` function assumes to find
  // the replacement node on the state object.
  if (funcs.enter) {
    userEnterFn = funcs.enter.bind(state);
    enterFn = function(node, parent) {
      var res = userEnterFn(node, parent);

      // Move the return value onto the state.
      if (res !== null && res !== undefined && res !== BREAK && res !== SKIP) {
        this.__replaceWith = res;
      }
      return res;
    }
    enterFn = enterFn.bind(state);
  }
  if (funcs.leave) {
    userLeaveFn = funcs.leave.bind(state);
    leaveFn = function(node, parent) {
      var res = userLeaveFn(node, parent);

      // Move the return value onto the state.
      if (res !== null && res !== undefined && res !== BREAK && res !== SKIP) {
        this.__replaceWith = res;
      }
      return res;
    }
    leaveFn = leaveFn.bind(state);
  }
  processNode(ast, null, enterFn, leaveFn, state);
  if (state.__replaceWith) {
    return state.__replaceWith;
  } else {
    return ast;
  }
}

var regjstraverse = {
  traverse: traverse,
  replace: replace,
  VisitorOption: {
    Break: BREAK,
    Skip: SKIP
  },
  ReplaceState: ReplaceState,
  TraverseState: TraverseState
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = regjstraverse;
} else {
  window.regjstraverse = regjstraverse;
}

}());
