var scanner = cordova.require("cordova/plugin/BarcodeScanner");

var app = {
    // Server URL components
    URL: 'http://koti.kapsi.fi/~oturpe/test/test.cgi',
    PRODUCTS_URL: '/products',

    // Last read bar code
    barcode: undefined,

    // Creates REST URL for given product ID
    toProductURL: function(barcode) {
        return this.URL + this.PRODUCTS_URL + '/' + barcode;
    },

    log: function(message) {
        console.log('BA: ' + message);
    },

    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },

    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        var scanButton;
        var postButton;

        document.addEventListener('deviceready',this.onDeviceReady,false);

        scanButton = document.getElementById('scanbutton');
        scanButton.addEventListener('click',scan,false);

        postButton = document.getElementById('postbutton');
        postButton.addEventListener('click',post,false);
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the
    // 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style','display:none;');
        receivedElement.setAttribute('style','display:block;');

        console.log('Received Event: ' + id);
    },
};

// Scan barcode
//
// Calls barcode scanner plugin code.
var scan = function() {
    app.log('scanning');
    try {
        scanner.scan(function(result) {
            app.log('Scanner result: \n' +
                    'text: ' +
                    result.text +
                    '\n' +
                    'format: ' +
                    result.format +
                    '\n' +
                    'cancelled: ' +
                    result.cancelled +
                    '\n');

            app.barcode = result.text;
            document.getElementById('scanresult').innerHTML = app.barcode;
        },function(error) {
            app.log('Scanning failed: ',error);
        });
    } catch(ex) {
        this.log(ex.message);
    }

    this.log('stored barcode: ' + this.barcode);
};

var post = function() {
    var request;
    var response;

    if(!app.barcode) {
        console.log('ERROR: Called "post" without barcode');
        return;
    }

    app.log('posting');

    try {
        request = new XMLHttpRequest();
        request.open('GET',app.toProductURL(app.barcode),true);

        request.onreadystatechange = function() {
            if(request.readyState !== 4)
                return;

            if(request.status === 200) {
                response = request.responseText;

                console.log('Response received:');
                console.log(response);

                document.getElementById('postresult').innerHTML = response;
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
        app.log(ex.message);
    }
}
