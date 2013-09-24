// Application module
var app = (function() {

    // Server URL components
    var URL = 'http://koti.kapsi.fi/~oturpe/test/test.cgi';
    var PRODUCTS_URL = '/products';

    // Last read bar code
    var barcode = undefined;

    // Creates REST URL for given product ID
    var toProductURL = function() {
        return URL + PRODUCTS_URL + '/' + barcode;
    };

    var log = function(message) {
        console.log('BA: ' + message);
    };

    // Application Constructor
    var initialize = function() {
        bindEvents();
    };

    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    var bindEvents = function() {
        document.addEventListener('deviceready',onDeviceReady,false);
    };

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the
    // 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    var onDeviceReady = function() {
        receivedEvent('deviceready');
    };

    // Update DOM on a Received Event
    var receivedEvent = function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style','display:none;');
        receivedElement.setAttribute('style','display:block;');

        log('Received Event: ' + id);
    };

    // Publish interface
    return {
        initialize: initialize,
        bindEvents: bindEvents,
        onDeviceReady: onDeviceReady,
        receivedEvent: receivedEvent
    }
})();
