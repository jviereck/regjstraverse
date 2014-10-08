var regjstraverse = require('../index');
var traverse = regjstraverse.traverse;
var replace = regjstraverse.replace;

var regjsparser = require('regjsparser');
var parse = regjsparser.parse;

var assert = require("assert");

// Used to test the traverse function.
function assertCountType(ast, typeName, expectedCount, enterFn, leaveFn) {
  var enterCounter = 0, leaveCounter = 0;
  var expectedEnterCounter, expectedLeaveCounter;

  if (Array.isArray(expectedCount)) {
    expectedEnterCounter = expectedCount[0];
    expectedLeaveCounter = expectedCount[1];
  } else {
    expectedEnterCounter = expectedLeaveCounter = expectedCount;
  }

  var state = new regjstraverse.TraverseState();
  traverse(ast, {
    enter: function(node, parent) {
      if (node.type === typeName) {
        enterCounter ++;
      }
      if (enterFn) {
        return enterFn.call(this, node, parent)
      }
    },
    leave: function(node, parent) {
      if (node.type === typeName) {
        leaveCounter ++;
      }
      if (leaveFn) {
        return leaveFn.call(this, node, parent)
      }
    }
  }, state);
  // Check the number of leaves and enter counted node types is the same.
  assert.equal(leaveCounter, expectedLeaveCounter);
  assert.equal(enterCounter, expectedEnterCounter);
  return state;
}

describe('Traverse', function() {
  describe('simple traverse', function() {
    it('should work without passing a TraverseState as third argument', function() {
      var enterCounter = 0;
      var leaveCounter = 0;

      traverse(parse('abc'), {
        enter: function(node, parent) {
          enterCounter += 1;
        },
        leave: function(node, parent) {
          leaveCounter += 1;
        }
      });

      assert.equal(enterCounter, 4);
      assert.equal(leaveCounter, 4);
    });

    it('should count simple values correctly', function() {
      assertCountType(parse('abc'), 'value', 3);
      assertCountType(parse('a|b|c'), 'value', 3);
      assertCountType(parse('a|b|c'), 'disjunction', 1);
    });

    it('should count values in ranges correctly', function() {
      assertCountType(parse('abc[a-c]d'), 'characterClass', 1);
      assertCountType(parse('abc[a-c]d'), 'value', 6);
    });
  });

  describe('skip handling', function() {
    it('should skip sub-ast on skip in enter', function() {
      // Skip using `this.skip();`.
      // In this case, the value nodes inside the class range `[a-c]` are
      // not counted due to the call to `this.skip()`.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 4, function(node) {
        if (node.type === 'characterClass') {
          this.skip();
        }
      });

      // Skip using `regjstraverse.VisitorOption.Skip`.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 4, function(node) {
        if (node.type === 'characterClass') {
          return regjstraverse.VisitorOption.Skip;
        }
      });
    });

    it('should not-skip sub-ast on skip in leave', function() {
      // Skip using `this.skip();`.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 6, null, function(node) {
        if (node.type === 'characterClass') {
          this.skip();
        }
      });

      // Skip using `regjstraverse.VisitorOption.Skip`.
      assertCountType(parse('abc[a-c]d'), 'value', 6, null, function(node) {
        if (node.type === 'characterClass') {
          return regjstraverse.VisitorOption.Skip;
        }
      });
    });
  });

  describe('break handling', function() {
    it('should break right away on break in enter', function() {
      // Skip using `this.break();`.
      // In this case, the value inside of `[a-c]` and `d` are not counted.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 3, function(node) {
        if (node.type === 'characterClass') {
          this.break();
        }
      });
      assert.equal(state.didCallBreak(), true);

      // Skip using `regjstraverse.VisitorOption.Break`.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 3, function(node) {
        if (node.type === 'characterClass') {
          return regjstraverse.VisitorOption.Break;
        }
      });
      assert.equal(state.didCallBreak(), true);
    });

    it('should break right away on break in leave', function() {
      // Skip using `this.break();`.
      // In this case, the value inside of `[a-c]` and `d` are not counted.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 5, null, function(node) {
        if (node.type === 'characterClass') {
          this.break();
        }
      });
      assert.equal(state.didCallBreak(), true);

      // Skip using `regjstraverse.VisitorOption.Break`.
      var state = assertCountType(parse('abc[a-c]d'), 'value', 5, null, function(node) {
        if (node.type === 'characterClass') {
          return regjstraverse.VisitorOption.Break;
        }
      });
      assert.equal(state.didCallBreak(), true);
    });
  });
});

describe('Replace', function() {
  describe('simple replace on enter', function() {
    it('should replace the root node', function() {
      var ast = replace(parse('a'), {
        enter: function(node, parent) {
          if (parent === null) {
            // Replace the entry with a class-range.
            return parse('[a]');
          }
        }
      });
      assert.equal(ast.type, 'characterClass');
      assert.equal(ast.raw, '[a]');
    });

    it ('should work the same with calling replace(...)', function() {
      var ast = replace(parse('a'), {
        enter: function(node, parent) {
          if (parent === null) {
            // Replace the entry with a class-range.
            this.replace(parse('[a]'));
          }
        }
      });
      assert.equal(ast.type, 'characterClass');
      assert.equal(ast.raw, '[a]');
    });

    it('should call replace on the replaced nodes', function() {
      var rawValues = '';
      var ast = replace(parse('a|b'), {
        enter: function(node, parent) {
          if (node.type === 'disjunction') {
            return parse('c|d');
          } else {
            rawValues += node.raw;
          }
        }
      });
      assert.equal(ast.raw, 'c|d');
      // Tests if `enter` was called on the replaced node.
      assert.equal(rawValues, 'cd');
    });

    it('should replace characterClassRange', function() {
      var ast = replace(parse('[a-b]'), {
        enter: function(node, parent) {
          if (node.type === 'value') {
            return parse(node.raw === 'a' ? 'c' : 'd');
          }
        }
      });
      assert.deepEqual(ast.body[0].min, parse('c'));
      assert.deepEqual(ast.body[0].max, parse('d'));
    })
  });

  describe('simple replace on leave', function() {
    it('should replace the root node', function() {
      var ast = replace(parse('a'), {
        leave: function(node, parent) {
          if (parent === null) {
            // Replace the entry with a class-range.
            return parse('[a]');
          }
        }
      });
      assert.equal(ast.type, 'characterClass');
      assert.equal(ast.raw, '[a]');
    });

    it('should call replace on the replaced nodes', function() {
      var rawValues = '';
      var ast = replace(parse('a|b'), {
        leave: function(node, parent) {
          if (node.type === 'disjunction') {
            return parse('c|d');
          } else {
            rawValues += node.raw;
          }
        }
      });
      assert.equal(ast.raw, 'c|d');
      // As the node is replaced on the leave, the rawValues are from
      // the original ast.
      assert.equal(rawValues, 'ab');
    });

    it('should replace characterClassRange', function() {
      var ast = replace(parse('[a-b]'), {
        leave: function(node, parent) {
          if (node.type === 'value') {
            return parse(node.raw === 'a' ? 'c' : 'd');
          }
        }
      });
      assert.deepEqual(ast.body[0].min, parse('c'));
      assert.deepEqual(ast.body[0].max, parse('d'));
    })
  });
});
