# css-reassign
A linter to help stop you reassigning your CSS selectors

## Motivation
This module has been heavily inspired by [Immutable CSS](http://csswizardry.com/2015/03/immutable-css/) and [Functional Programming, CSS, and your sanity](http://www.jon.gold/2015/07/functional-css/). Both ideas describe a style of writing CSS in which your (specified) classes should never be overwritten - go and read them though, as they describe it better than here!

## Installation
`$ npm i --save css-reassign`

## Usage
```js
var dontReassign = require('css-reassign');

dontReassign(pathToCss /*, options */)
    .then(function (result) { 
        console.log(result.toString());
    });
```

## Options
### `classMatch (optional)` 
`(string|regex)`

This will allow you to specify a matching pattern for your selectors. E.g `.util-`, will only match selectors prefixed with `.util-`. This is described in the [Enforcing Immutability](http://csswizardry.com/2015/03/immutable-css/#enforcing-immutability) section on CSS Wizadry.

