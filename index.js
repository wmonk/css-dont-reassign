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

function toArray(root, method, functor) {
    var arr = [];
    root[method](function (rule) {
        arr.push(rule);
    });
    return arr.map(functor);
}

function pluckProp (decl) {
    return decl.prop;
}

function assertOnDecls(mapped, rule) {
    var mappedDecl = toArray(mapped[0].rule, 'eachDecl', pluckProp);
    var ruleDecl = toArray(rule, 'eachDecl', pluckProp);
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
            var mappedValue = map[0];

            if (mappedValue[rule.id] && (options.strict ? assertOnDecls(mappedValue[rule.id], rule.rule).length : true)) {
                var overWrite = rule;
                overWrite.rulesOverwritten = assertOnDecls(mappedValue[rule.id], rule.rule, true);

                mappedValue[rule.id].push(rule);
                return map;
            }

            mappedValue[rule.id] = [rule];
            return map;
        }, [{}]).reduce(function (overall, map) {
            return Object.keys(map).filter(function (selector) {
                return map[selector].length > 1;
            }).map(function (selectorName) {
                return map[selectorName];
            });
        }, []);

        res(mapped);
    });
};
