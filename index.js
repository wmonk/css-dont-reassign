'use strict';

var Promise = require('bluebird');
var postcss = require('postcss');
var fs = require('fs');
var _ = require('ramda');

function makeId(rule, selector) {
    return [rule.parent.type, (rule.parent.params || 'root'), selector].join('-');
}

function isClass(predicate, c) {
    return c.match(predicate) && (c.charAt(0) === '.' || c.match(/h[1-6]|div|span|p/));
}

function toArray(method, root) {
    var arr = [];
    root[method](function (rule) {
        arr.push(rule);
    });
    return arr;
}

var eachDecl = _.curry(toArray, 2)('eachDecl');
var eachRule = _.curry(toArray, 2)('eachRule');
var pluckProp = _.compose(_.pluck('prop'), eachDecl);

function assertOnDecls(mapped, rule) {
    var mappedDecl = pluckProp(mapped[0].rule);
    var ruleDecl = pluckProp(rule);
    var intersect = _.intersection(mappedDecl, ruleDecl);

    return _.project(['prop', 'value'])(eachDecl(rule)).filter(function (def) {
        return intersect.indexOf(def.prop) > -1;
    });
}

module.exports = function (filePath, opts) {
    var options = _.merge({
        classMatch: new RegExp(/.+/g)
    }, opts);

    var matchesUserInput = _.curry(isClass)(options.classMatch);

    return new Promise(function (res) {
        var root = postcss.parse(fs.readFileSync(filePath));

        var rules = eachRule(root).map(function (rule) {
            return rule.selectors.filter(matchesUserInput)
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

            if (mappedValue[rule.id]) {
                var overWrite = rule;
                overWrite.rulesOverwritten = assertOnDecls(mappedValue[rule.id], rule.rule);

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

        mapped.toString = function () {
            return this.reduce(function (str, issues) {
                var first = _.head(issues);
                var rest = _.tail(issues);

                str += first.selector + ' defined on line ' + first.line.line + '\n';

                str += rest.reduce(function (restStr, issue) {
                    restStr += issue.selector + ' reassigned on line ' + issue.line.line + '\n';
                    return restStr;
                }, '');

                str += '\n';

                return str;
            }, '');
        };

        res(mapped);
    });
};
