var regjstraverse = require('../index');
var traverse = regjstraverse.traverse;

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
