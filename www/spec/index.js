/*global require*/

require(['../js/lib/Squire','../js/require-config'],function(Squire) {
    'use strict';

    var injector = new Squire();

    injector.mock('cordova',{
        require: function() {}
    });
    
    injector.mock('barcodescanner',{});

    injector.require(['jasmine/jasmine-html','spec/tests'],function(jasmine) {
        var jasmineEnv, htmlReporter;

        jasmineEnv = jasmine.getEnv();
        jasmineEnv.updateInterval = 1000;

        htmlReporter = new jasmine.HtmlReporter();

        jasmineEnv.addReporter(htmlReporter);

        jasmineEnv.specFilter = function(spec) {
            return htmlReporter.specFilter(spec);
        };

        jasmineEnv.execute();
    });
});
