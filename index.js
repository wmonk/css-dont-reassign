'use strict';

var Promise = require('bluebird');
var postcss = require('postcss');
var fs = require('fs');
var _ = require('lodash');

function makeId(rule, selector) {
    return [rule.parent.type, (rule.parent.params || 'root'), selector].join('-');
}

module.exports = function (filePath) {
    return new Promise(function (res, rej) {
        var root = postcss.parse(fs.readFileSync(filePath));
        var map = {};
        root.eachRule(function (rule) {
            var ruleDecls = '';
            rule.eachDecl(function (decl) {
                ruleDecls += decl.prop + decl.value;
            });

            rule.selectors.forEach(function (selector) {
                var id = makeId(rule, selector);

                if (map[id]) {
                    return map[id].rules.push({
                        selector: selector,
                        rule: rule
                    });
                }

                map[id] = {
                    source: ruleDecls,
                    rules: [{
                        selector: selector,
                        rule: rule
                    }]
                };
            });
        });

        var stuff = Object.keys(map).filter(function (selector) {
            return map[selector].rules.length > 1;
        }).map(function (selectorName) {
            return map[selectorName];
        });

        stuff.toString = function () {
            var str = '';
            this.forEach(function (selector) {
                var first = selector.rules.shift();
                str += '\n\n';
                str += first.selector + ' was defined ' + first.rule.source.start.line + ':' + first.rule.source.start.column + '\n';

                selector.rules.forEach(function (sel) {
                    str += sel.selector + ' was mutated ' + sel.rule.source.start.line + ':' + sel.rule.source.start.column + '\n';
                });
            });

            return str;
        };

        res(stuff);
    });
};
