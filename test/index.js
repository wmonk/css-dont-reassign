'use strict';

var path = require('path');
var dontOverwrite = require('../');
require('chai').should();

describe('Do Not Mutate', function () {
    it('should pick up overwrites in root context', function (done) {
        dontOverwrite(path.join(__dirname, './fixtures/test.css')).then(function (result) {
            result[0].rules[0].selector.should.equal('.a');
            result[0].rules[1].selector.should.equal('.a');

            done();
        }).catch(done);
    });

    it('should pick up overwrites in atrule context', function (done) {
        dontOverwrite(path.join(__dirname, './fixtures/test.css')).then(function (result) {
            result[2].rules[0].selector.should.equal('.b');
            result[2].rules[1].selector.should.equal('.b');

            done();
        }).catch(done);
    });

    describe('allow options', function () {
        it('should allow strict', function (done) {
            dontOverwrite(path.join(__dirname, './fixtures/test.css'), {
                strict: true
            }).then(function (result) {
                result[0].rules[0].selector.should.equal('.c');
                result[0].rules[1].selector.should.equal('.c');

                done();
            }).catch(done);
        });
    });
});
