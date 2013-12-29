/*global require*/

// Wrapper code for importing and setting up all testing libraries and calling
// test code proper.
//
// Testing is performed using Jasmine unit test framework and its html reporter.
// For mocking amd dependencies, Squire is used. This code has 'tests' module
// as dependency, which in turn is responsible for either directly containing
// or depending on code that has the actual Jasmine specs.
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
