'use strict';

var Promise = require('bluebird');
var postcss = require('postcss');
var fs = require('fs');
var _ = require('lodash');
var colors = require('colors');

function makeId(rule, selector, hash) {
    return [rule.parent.type, (rule.parent.params || 'root'), selector, hash || ''].join('-');
}

function isClass(c) {
    return c.charAt(0) === '.';
}

function makeDeclsIntoArray(rule) {
    var decls = [];

    rule.eachDecl(function (decl) {
        decls.push(decl.prop);
    });

    return decls;
}

function assertOnDecls(mapped, rule, vals) {
    var mappedDecl = makeDeclsIntoArray(mapped[0].rule);
    var ruleDecl = makeDeclsIntoArray(rule);
    var intersect = _.intersection(mappedDecl, ruleDecl);

    if (vals) {
        var defs = [];
        rule.eachDecl(function (decl) {
            defs.push([decl.prop, decl.value]);
        });

        return defs.filter(function (def) {
            return intersect.indexOf(def[0]) > -1;
        });
    }

    return intersect;
}

module.exports = function (filePath, opts) {
    var options = _.assign({
        strict: false
    }, opts);

    return new Promise(function (res) {
        var root = postcss.parse(fs.readFileSync(filePath));
        var map = {};

        root.eachRule(function (rule) {
            rule.selectors.forEach(function (selector) {
                if (!isClass(selector)) {
                    return;
                }

                var id = makeId(rule, selector);

                if (map[id] && (options.strict ? assertOnDecls(map[id], rule).length : true)) {
                    var overWrite = {
                        selector: selector,
                        rule: rule
                    };

                    if (options.strict) {
                        overWrite.rulesOverwritten = assertOnDecls(map[id], rule, true);
                    }

                    map[id].push(overWrite);
                    return;
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
                var first = selector.shift();
                str += '\n\n';
                str += colors.green(first.selector) + colors.bold(' defined line ' + first.rule.source.start.line + ':' + first.rule.source.start.column) + ' ' + ' \n';

                selector.forEach(function (sel) {
                    str += colors.bold.grey('mutated line ' + sel.rule.source.start.line + ':' + sel.rule.source.start.column) + ' ' + colors.red((sel.rulesOverwritten || []).reduce(function (data, over) {
                        data += over[0] + ': ' + over[1] + ' ';
                        return data;
                    }, '')) + '\n';
                });
            });

            return str;
        };

        res(stuff);
    });
};
