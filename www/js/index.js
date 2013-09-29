var scanner = cordova.require("cordova/plugin/BarcodeScanner");

// Application module
var app = (function() {

    // Server URL components
    var URL = 'http://koti.kapsi.fi/~oturpe/barcode-agent';
    var PRODUCTS_URL = '/newproduct.cgi';

    // Variable storing details about new product
    var newProductInfo = null;

    // Creates REST URL for given product ID
    var toProductURL = function(barcode) {
        return URL + PRODUCTS_URL + '/' + barcode;
    };

    var log = function(message) {
        console.log('BA: ' + message);
    };

    // Creates URL-encoded string from given object, suitable for http
    // get and post queries.
    var toQueryString = function(obj) {
        var query = '';
        var key;
        var keys = Object.keys(obj);
        var length = keys.length;
        var i;

        for(i = 0; i < length; i++) {
            key = keys[i];

            if(i > 0)
                query += '&';

            query += key + '=' + encodeURIComponent(obj[key]);
        }

        return query;
    };

    // Application Constructor
    var initialize = function() {
        bindEvents();
    };

    // Bind Event Listeners
    var bindEvents = function() {
        var scanButton, newProductControls = {};

        document.addEventListener('deviceready',onDeviceReady,false);

        scanButton = document.getElementById('scanbutton');
        scanButton.addEventListener('click',scan,false);

        newProductControls.barcode = document.getElementById('productnewid');
        newProductControls.name = document.getElementById('productnewname');
        newProductControls.submit = document.getElementById('productnewsubmit');

        newProductControls.name.addEventListener('change',function() {
            newProductInfo.name = this.value;
        },false);

        // Note: Barcode does not need change event listener as it is not to be
        // edited by user.

        newProductControls.submit.addEventListener('click',function() {
            submit(newProductInfo.barcode,
                   newProductInfo.name,
                   newProductInfo.user);
        },false);
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

                post(result.text);
            },function(error) {
                log('Scanning failed: ',error);
            });
        } catch(ex) {
            log(ex.message);
        }
    };

    var post = function(barcode) {
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
                    gotoPage('productview',JSON.parse(response));
                } else if(request.status === 404) {
                    gotoPage('productnew',{
                        barcode: barcode
                    });
                } else {
                    log('ERROR: Unexpected status code ' + request.status);
                }
            };

            request.send(null);
        } catch(ex) {
            log(ex.message);
        }
    };

    // Submits new product to server.
    var submit = function(barcode,productName,user) {

        log('At submit method');
        log('barcode: ' + barcode);
        log('name: ' + productName);
        log('user: ' + user);

        var request, response, productInfo;

        try {
            request = new XMLHttpRequest();
            // request.open('POST',URL + PRODUCTS_URL,true);
            request.open('POST',URL + '/products.cgi',true);

            request.onreadystatechange = function() {
                if(request.readyState !== 4)
                    return;

                if(request.status === 200)
                    log('Product added');
                else
                    log('ERROR: Unexpected status code ' + request.status);
            };

            productInfo = {
                barcode: barcode,name: productName
            };
            // TODO: Image

            request.send(toQueryString(productInfo));
        } catch(ex) {
            log(ex.message);
        }
    }

    // Switches virtual page within the single page model. Context parameter
    // is a JS object containing page-specific initialization data.
    //
    // Initialization of page with given id is handled by specialized handler
    // function, registered in gotoPage.handlers object.
    var gotoPage = function(id,context) {
        var handler = gotoPage.handlers[id];

        if(handler === undefined) {
            log('ERROR: Cannot open page with unknown page id: ' + id);
            return;
        }

        log('Opening page with id ' + id);

        gotoPage.pages.forEach(function(item) {
            item.style.display = item.id === id ? 'block' : 'none';
        });

        handler(context);
    };

    gotoPage.pages = [];

    var pageNodes = document.querySelectorAll(".page");
    var max = pageNodes.length;
    for(i = 0; i < max; i += 1) {
        gotoPage.pages.push(pageNodes.item(i));
        log(gotoPage.pages[i].id);
    }

    gotoPage.handlers = {};

    // Handler for product view.
    gotoPage.handlers['productview'] = function(context) {
        var nameElement, commentsElement, commentObject, commentElement, comments, i, commentsLength;

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

    gotoPage.handlers['productnew'] = function(context) {
        var idElement;

        newProductInfo = {
            barcode: context.barcode
        };

        idElement = document.getElementById('productnewid');
        idElement.value = newProductInfo.barcode;
        idElement.readOnly = true;

        // TODO: Image
    };

    // Publish interface
    return {
        initialize: initialize
    };
})();
