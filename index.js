'use strict';

var Promise = require('bluebird');
var postcss = require('postcss');
var fs = require('fs');
var _ = require('lodash');

function makeId(rule, selector, hash) {
    return [rule.parent.type, (rule.parent.params || 'root'), selector, hash || ''].join('-');
}

function makeDeclsIntoArray(rule) {
    var decls = [];

    rule.eachDecl(function (decl) {
        decls.push(decl.prop);
    });

    return decls;
}

function assertOnDecls(mapped, rule) {
    var mappedDecl = makeDeclsIntoArray(mapped.rules[0].rule);
    var ruleDecl = makeDeclsIntoArray(rule);

    return _.intersection(mappedDecl, ruleDecl);
}

module.exports = function (filePath, opts) {
    var options = _.assign({
        strict: false
    }, opts);

    return new Promise(function (res, rej) {
        var root = postcss.parse(fs.readFileSync(filePath));
        var map = {};
        root.eachRule(function (rule) {
            rule.selectors.forEach(function (selector) {
                var id = makeId(rule, selector);

                if (map[id] && (options.strict ? assertOnDecls(map[id], rule).length : true)) {
                    return map[id].push({
                        selector: selector,
                        rule: rule
                    });
                }

                map[id] = [{
                    selector: selector,
                    rule: rule
                }];
            });
        });

        var stuff = Object.keys(map).filter(function (selector) {
            return map[selector].length > 1;
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
