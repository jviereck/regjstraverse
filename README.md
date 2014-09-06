# RegJSTraverse

Traverse the RegJS AST.

## Installation

```bash
npm install regjstraverse
```

## Usage

```js
var regjstraverse = require('regjstraverse').traverse;

regjstraverse.traverse(ast, {
  enter: function(node) {
    // Called on enter the node.
    console.log('enter', node.type);
  },

  leave: function(node) {
    // Called on leave the node.
    console.log('leave', node.type);
  }
})
```

When traversing the nodes, it's possible to skip the sub-nodes of the current
node by calling the `this.skip()` method or returning `regjstraverse.VisitorOption.Skip`.

```js
var regjstraverse = require('regjstraverse').traverse;

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

Breaking at the current point of tree traversial is possible by invoking `break`:

```js
var regjstraverse = require('regjstraverse').traverse;

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

## Testing

To run the tests, run the following command:

```bash
npm test
```