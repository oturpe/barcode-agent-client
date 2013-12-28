requirejs.config({
    baseUrl: '',paths: {
        jasmine: 'spec/lib/jasmine-1.2.0'
    },shim: {
        'cordova': {
            exports: 'cordova'
        },'barcodescanner': {
            deps: ['cordova']
        },'js/lib/pure': {
            exports: 'pure'
        }, 'jasmine/jasmine': {
            exports: 'jasmine'
        }, 'jasmine/jasmine-html': {
            deps: ['jasmine/jasmine'],
            exports: 'jasmine'
        }
    }
});
