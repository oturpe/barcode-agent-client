/*
 * global console: false, document: false, XMLHttpRequest: false, localStorage:
 * false
 */

var scanner, logger, settings, app;

var scanner = cordova.require("cordova/plugin/BarcodeScanner");

// Logger module
//
// Thin wrapper around console.log method.
var logger = (function() {
    'use strict';

    var log = function(message) {
        console.log('BA: ' + message);
    };

    return {
        log: log
    };
})();

// A module for storing application settings.
//
// Thin wrapper around localStorage, providing defaults for missing values.
//
// Depends on a logger.
var settings = (function(logger) {
    'use strict';

    var defaults, getItem, setItem;

    // Default values for item missing from store.
    defaults = {
        'serverUrl': 'http://barcodeagent.nodejitsu.com'
    };

    // Returns stored value of given key, or default value if none exists.
    getItem = function(key) {
        var value;

        value = localStorage.getItem(key);
        logger.log('Accessing storage: ' + key + ': ' + value);

        return value ? value : defaults[key];
    };

    setItem = function(key,value) {
        localStorage.setItem(key,value);
    };

    return {
        getItem: getItem,setItem: setItem
    };
})(logger);

// Barcode Agent application module
//
// Depends on:
// - logger
// - settings
var app = (function(logger,settings) {
    'use strict';

    var PRODUCTS_URL, newProductInfo, toProductURL, toQueryString, initialize, bindEvents, onDeviceReady, bindEvents, receivedEvent, scan, submit, requestInfo, gotoPage;

    // Server URL components
    PRODUCTS_URL = '/products';

    // Variable storing details about new product
    newProductInfo = null;

    // Creates REST URL for given product ID
    toProductURL = function(barcode) {
        return settings.getItem('serverUrl') + PRODUCTS_URL + '/' + barcode;
    };

    // Creates URL-encoded string from given object, suitable for http
    // get and post queries.
    toQueryString = function(obj) {
        var query = '', key, keys = Object.keys(obj), length = keys.length, i;

        for(i = 0; i < length; i += 1) {
            key = keys[i];

            if(i > 0)
                query += '&';

            query += key + '=' + encodeURIComponent(obj[key]);
        }

        return query;
    };

    // Application Constructor
    initialize = function() {
        gotoPage('intro');
        bindEvents();
    };

    // Bind Event Listeners
    bindEvents = function() {
        var scanButton, settingsButton, serverUrlInput, newProductControls = {};

        document.addEventListener('deviceready',onDeviceReady,false);

        settingsButton = document.getElementById('settingsbutton');
        settingsButton.addEventListener('click',function() {
            gotoPage('settings');
        },false);

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

        serverUrlInput = document.getElementById('serverurl');
        serverUrlInput.addEventListener('change',function() {
            logger.log('Setting server URL to "' + this.value + '"');
            settings.setItem('serverUrl',this.value);
        },false);
    };

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the
    // 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady = function() {
        receivedEvent('deviceready');
    };

    // Update DOM on a Received Event
    receivedEvent = function(id) {
        var parentElement = document.getElementById(id), listeningElement = parentElement
                .querySelector('.listening'), receivedElement = parentElement
                .querySelector('.received');

        listeningElement.setAttribute('style','display:none;');
        receivedElement.setAttribute('style','display:block;');

        logger.log('Received Event: ' + id);
    };

    // Scan barcode
    //
    // Calls barcode scanner plugin code.
    scan = function() {
        logger.log('scanning');
        try {
            scanner.scan(function(result) {
                logger.log('Scanner result: \n' +
                           'text: ' +
                           result.text +
                           '\n' +
                           'format: ' +
                           result.format +
                           '\n' +
                           'cancelled: ' +
                           result.cancelled +
                           '\n');

                requestInfo(result.text);
            },function(error) {
                logger.log('Scanning failed: ',error);
            });
        } catch(ex) {
            logger.log(ex.message);
        }
    };

    // Retrieves product information for the server.
    requestInfo = function(barcode) {
        var request, response;

        if(!barcode) {
            logger.log('ERROR: Called "requestInfo" without barcode');
            return;
        }

        logger.log('Requesting info from ' + toProductURL(barcode));

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
                    logger.log('ERROR: Unexpected status code ' +
                               request.status);
                }
            };

            request.send(null);
        } catch(ex) {
            logger.log(ex.message);
        }
    };

    // Submits new product to server.
    submit = function(barcode,productName,user) {

        logger.log('At submit method');
        logger.log('barcode: ' + barcode);
        logger.log('name: ' + productName);
        logger.log('user: ' + user);

        var request, response, productInfo;

        try {
            request = new XMLHttpRequest();
            request.open('POST',
                         settings.getItem('serverUrl') + PRODUCTS_URL,
                         true);

            request.onreadystatechange = function() {
                if(request.readyState !== 4)
                    return;

                if(request.status === 200)
                    logger.log('Product added');
                else
                    logger.log('ERROR: Unexpected status code ' +
                               request.status);
            };

            productInfo = {
                barcode: barcode,name: productName
            };
            // TODO: Image

            request.send(toQueryString(productInfo));
        } catch(ex) {
            logger.log(ex.message);
        }
    };

    // Switches virtual page within the single page model. Context parameter
    // is a JS object containing page-specific initialization data.
    //
    // Initialization of page with given id is handled by specialized handler
    // function, registered in gotoPage.handlers object.
    gotoPage = function(id,context) {
        var handler = gotoPage.handlers[id];

        if(handler === undefined) {
            logger.log('ERROR: Cannot open page with unknown page id: ' + id);
            return;
        }

        logger.log('Opening page with id ' + id);

        gotoPage.pages.forEach(function(item) {
            item.style.display = item.id === id ? 'block' : 'none';
        });

        handler(context);
    };

    gotoPage.pages = [];

    var pageNodes = document.querySelectorAll(".page");
    var max = pageNodes.length;
    var i;
    for(i = 0; i < max; i += 1) {
        gotoPage.pages.push(pageNodes.item(i));
        logger.log(gotoPage.pages[i].id);
    }

    gotoPage.handlers = {};

    gotoPage.handlers['intro'] = function(context) {
    // Nothing to do, just static text.
    };

    // Handler for product view.
    gotoPage.handlers['productview'] = function(context) {
        var nameElement, commentsElement, commentObject, commentElement, comments, i, commentsLength;

        nameElement = document.getElementById('productname');
        nameElement.innerHTML = context.name;

        commentsElement = document.getElementById('productcomments');
        logger.log('commentsElement:' + commentsElement);

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

    gotoPage.handlers['settings'] = function(context) {
        var urlButton;

        urlButton = document.getElementById('serverurl');
        urlButton.value = settings.getItem('serverUrl');
    };

    // Publish interface
    return {
        initialize: initialize
    };
})(logger,settings);
