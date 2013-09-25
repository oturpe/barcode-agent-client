var scanner = cordova.require("cordova/plugin/BarcodeScanner");

// Application module
var app = (function() {

    // Server URL components
    var URL = 'http://koti.kapsi.fi/~oturpe/barcode-agent';
    var PRODUCTS_URL = '/products.cgi';

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
        var scanButton;
        var postButton;

        document.addEventListener('deviceready',onDeviceReady,false);

        scanButton = document.getElementById('scanbutton');
        scanButton.addEventListener('click',scan,false);

        postButton = document.getElementById('postbutton');
        postButton.addEventListener('click',post,false);
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

    // Scan barcode
    //
    // Calls barcode scanner plugin code.
    var scan = function() {
        log('scanning');
        try {
            scanner.scan(function(result) {
                log('Scanner result: \n' +
                    'text: ' +
                    result.text +
                    '\n' +
                    'format: ' +
                    result.format +
                    '\n' +
                    'cancelled: ' +
                    result.cancelled +
                    '\n');

                barcode = result.text;
                document.getElementById('scanresult').innerHTML = barcode;
            },function(error) {
                log('Scanning failed: ',error);
            });
        } catch(ex) {
            log(ex.message);
        }

        log('stored barcode: ' + barcode);
    };

    var post = function() {
        var request;
        var response;

        if(!barcode) {
            log('ERROR: Called "post" without barcode');
            return;
        }

        log('posting');

        try {
            request = new XMLHttpRequest();
            request.open('GET',toProductURL(barcode),true);

            request.onreadystatechange = function() {
                if(request.readyState !== 4)
                    return;

                if(request.status === 200) {
                    response = request.responseText;

                    log('Response received:');
                    log(response);

                    gotoPage('productview',JSON.parse(response));
                }
            };

            request.send(null);

            // Not needed now, maybe later?
            /*
            function toQueryString(obj) {
              var query = '';
              var key;
              var keys =  Object.keys(obj);
              var length = keys.length;
              var i;

              for(i=0; i<length; i++) {
                key = keys[i];

                if(i>0)
                  query += '&';

                query += key + '=' + encodeURIComponent(obj[key]);

              }
            }
            */
        } catch(ex) {
            log(ex.message);
        }
    };

    // Switches virtual page within the single page model. Context parameter
    // is a JS object containing page-specific initialization data.
    var gotoPage = function(id,context) {
        var nameElement, commentsElement, commentObject, commentElement, comments, i, commentsLength;

        if(id !== 'productview') {
            log('Unknown page id: ' + id);
            return;
        }

        nameElement = document.getElementById('productname');
        nameElement.innerHTML = context.name;

        commentsElement = document.getElementById('productcomments');
        log('commentsElement:' + commentsElement);

        comments = context.comments;
        commentsLength = comments.length;
        for(i = 0; i < commentsLength; i += 1) {
            commentObject = comments[i];
            commentElement = document.createElement('p');
            commentElement.innerHTML = commentObject.text;
            commentsElement.appendChild(commentElement);
        }
    };

    // Publish interface
    return {
        initialize: initialize
    };
})();
