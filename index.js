'use strict';

var Promise = require('bluebird');
var postcss = require('postcss');
var fs = require('fs');
var _ = require('lodash');

module.exports = function (filePath) {
    return new Promise(function (res, rej) {
        var root = postcss.parse(fs.readFileSync(filePath));
        var my = [];
        var map = {};
        root.eachRule(function (rule) {
            var ruleDecls = '';
            rule.eachDecl(function (decl) {
                ruleDecls += decl.prop + decl.value;
            });

            rule.selectors.forEach(function (selector) {
                if (map[selector]) {
                    if (rule.parent.type === map[selector].rules[0].parent.type) {
                        return map[selector].rules.push(rule);
                    }
                }

                map[selector] = {
                    source: ruleDecls,
                    rules: [rule]
                };
            });

            // my.push(rule.selectors);
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
                str += first.selector + ' was defined ' + first.source.start.line + ':' + first.source.start.column + '\n';

                selector.rules.forEach(function (rule) {
                    str += rule.selector + ' was mutated ' + rule.source.start.line + ':' + rule.source.start.column + '\n';
                });
            });

            return str;
        };

        rej(new Error('Mutations Found' + stuff.toString()));
    });
};
