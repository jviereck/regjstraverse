# RegJSTraverse

Traverse the RegJS AST (a AST for JavaScript's regular expressions).

## Installation

```bash
npm install regjstraverse
```

## Testing

To run the tests, run the following command:

```bash
npm test
```

## Background

A RegJS AST can be generated by using the `regjsparser` library:

```js
// Create the AST for the regular expression `/abc/`.
var ast = require('regjsparser').parse('abc');
```

## Example Usage

`regjstraverse` makes it easy to traverse the regular expression AST using the
`enter` and `leave` functions:

```js
var regjstraverse = require('regjstraverse');

regjstraverse.traverse(ast, {
  enter: function(node) {
    // Called when entering a node.
    console.log('enter', node.type);
  },

  leave: function(node) {
    // Called when leaving a node.
    console.log('leave', node.type);
  }
})
```

When traversing the nodes, it's possible to skip the sub-nodes of the current
node by calling the `this.skip()` method or returning `regjstraverse.VisitorOption.Skip`:

```js
var regjstraverse = require('regjstraverse');

regjstraverse.traverse(ast, {
  enter: function(node) {
    console.log('enter', node.type);
    if (node.type === 'characterClass') {
      // The following two lines have the same effect.
      this.skip();
      return regjstraverse.VisitorOption.Skip;
    }
  },

  leave: function(node) {
    // NOTE: Invoking `skip` in the leave function has no effect.

    // Called on leave the node.
    console.log('leave', node.type);
  }
})
```

Breaking at the current point in the tree traversal is possible by invoking `break`:

```js
var regjstraverse = require('regjstraverse');

regjstraverse.traverse(ast, {
  enter: function(node) {
    console.log('enter', node.type);
    if (node.type === 'characterClass') {
      // The following two lines have the same effect.
      this.break();
      return regjstraverse.VisitorOption.Break;
    }
  }
})
```

**Note**: After invoking `break` stops the entire tree traversal - no further
calls to `enter` or `leave` are made afterwards.

---

Replacing the current visited node is doable using the `replace` function:

```js
var regjstraverse = require('regjstraverse');
var parse = require('regjsparser').parse;

var newAst = regjstraverse.replace(ast, {
  enter: function(node) {
    if (node.type === 'value') {
      // Replace the `value` node with a new value node /a/.
      // The following two lines have the same effect.
      this.replace(parse('a'));
      return parse('a');
    }
  }
})
```

**Note**: if the `enter` function returns a new AST, the subnodes
of the new-replaced AST are visited. Example:

```js
var regjstraverse = require('regjstraverse');
var regjsparser = require('regjsparser');

var rawValues = '';
var ast = regjstraverse.replace(regjsparser.parse('a|b'), {
  enter: function(node, parent) {
    if (node.type === 'disjunction') {
      return regjsparser.parse('c|d');
    } else {
      // This visits the new replaced nodes `c` and `d` from above and not the
      // original `a` and `b` ones.
      rawValues += node.raw;
    }
  }
});
// Tests if `enter` was called on the replaced node.
assert.equal(rawValues, 'cd');
```
