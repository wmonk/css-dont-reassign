var path = require('path');
var main = require('../');

describe('Do Not Mutate', function () {
    it('should return the selectors', function (done) {
        main(path.join(__dirname, './fixtures/test.css')).then(function (selectors) {
            console.log(selectors.toString());
            done();
        }).catch(done);
    });
});
