'use strict';

var Promise = require('bluebird');
var postcss = require('postcss');
var fs = require('fs');
var _ = require('lodash');

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

function toArray(root, method, functor) {
    var arr = [];
    root[method](function (rule) {
        arr.push(rule);
    });
    return arr.map(functor);
}

function assertOnDecls(mapped, rule) {
    var mappedDecl = makeDeclsIntoArray(mapped[0].rule);
    var ruleDecl = makeDeclsIntoArray(rule);
    var intersect = _.intersection(mappedDecl, ruleDecl);

    return toArray(rule, 'eachDecl', function (decl) {
        return [decl.prop, decl.value];
    }).filter(function (def) {
        return intersect.indexOf(def[0]) > -1;
    });
}

module.exports = function (filePath, opts) {
    var options = _.assign({
        strict: false
    }, opts);

    return new Promise(function (res) {
        var root = postcss.parse(fs.readFileSync(filePath));

        var rules = toArray(root, 'eachRule', function (rule) {
            return rule.selectors.filter(isClass)
                .map(function (selector) {
                    return {
                        id: makeId(rule, selector),
                        selector: selector,
                        rule: rule,
                        line: rule.source.start,
                        from: rule.source.input.from
                    };
                });
        });

        var mapped = _.flatten(rules).reduce(function (map, rule) {
            if (map[rule.id] && (options.strict ? assertOnDecls(map[rule.id], rule.rule).length : true)) {
                var overWrite = rule;

                if (options.strict) {
                    overWrite.rulesOverwritten = assertOnDecls(map[rule.id], rule.rule, true);
                }

                map[rule.id].push(rule);
                return map;
            }

            map[rule.id] = [rule];
            return map;
        }, {});

        var stuff = Object.keys(mapped).filter(function (selector) {
            return mapped[selector].length > 1;
        }).map(function (selectorName) {
            return mapped[selectorName];
        });

        res(stuff);
    });
};
