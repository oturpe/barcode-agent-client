/*global window, document, XMLHttpRequest */

var scanner, logger, settings, app;

var scanner = cordova.require("cordova/plugin/BarcodeScanner");

// Barcode Agent application module
//
// Contains and exposes all components of the application.
var app = (function() {
    'use strict';

    var Logger, Settings, PageView, logger, defaultSettings, settings, pageView, PRODUCTS_URL, newProductInfo, toProductURL, toQueryString, initialize, bindEvents, onDeviceReady, receivedEvent, scan, submit, requestInfo;

    // Logger constructor
    //
    // Thin wrapper around console.log method.
    Logger = function(prefix,baseLogger) {
        this.baseLogger = baseLogger;
        this.prefix = prefix || '';

        return this;
    };

    Logger.prototype = {
        log: function(message) {
            this.baseLogger.log(this.prefix + ' ' + message);
        }
    };

    // Application settings constructor.
    //
    // Thin wrapper around localStorage, providing defaults for missing values.
    //
    // Depends on a logger.
    Settings = function(logger,storage,defaults) {
        this.logger = logger;
        this.storage = storage;
        // Default values for item missing from store.
        this.defaults = defaults || {};

        return this;
    };

    Settings.prototype = {
        // Stores value
        setItem: function(key,value) {
            this.storage.setItem(key,value);
        },
        // Returns stored value of given key, or default value if none exists.
        getItem: function(key) {
            var value;

            value = this.storage.getItem(key);
            this.logger.log('Accessing storage: ' + key + ': ' + value);

            return value ? value : this.defaults[key];
        }
    };

    // Contains all pages within one virtual page and allows switching between
    // them.
    //
    // Initialization of page with given id is handled by specialized
    // handler function, registered with addPage method.
    PageView = function(logger) {
        this.logger = logger;
        this.handlers = {};
        this.pages = [];
    };

    PageView.prototype = {
        // Adds page to the list of registered pages and assiciated given
        // initializer and on-display handler with it.
        addPage: function(page,init,onDisplay) {
            this.pages.push(page);
            this.logger.log('Added page ' + page.id + ' to page list');

            // TODO Implement init

            onDisplay = onDisplay || function() {};
            this.handlers[page.id] = onDisplay;

            if(init) {
                init(page);
            }
        },

        // Switches virtual page within the single page model. Context parameter
        // is a JS object containing page-specific initialization data.
        //
        // Pages are referred to by their id's.
        gotoPage: function(id,context) {
            var thePage, handler;

            handler = this.handlers[id];

            if(handler === undefined) {
                this.logger.log('ERROR: ' +
                                'Cannot open page with unknown page id: ' +
                                id);
                return;
            }

            this.logger.log('Opening page with id ' + id);

            this.pages.forEach(function(page) {
                if(page.id === id) {
                    thePage = page;
                    page.style.display = 'block';
                } else {
                    page.style.display = 'none';
                }
            });

            handler(thePage,context);
        }
    };

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
        var page;

        defaultSettings = {
            'serverUrl': 'http://barcodeagent.nodejitsu.com'
        };

        logger = new Logger('BA',window.console);
        settings = new Settings(logger,window.localStorage,defaultSettings);
        pageView = new PageView(logger);

        bindEvents();

        page = document.querySelector('.page#intro');
        pageView.addPage(page);

        // Handler for product view.
        page = document.querySelector('.page#productview');
        pageView
                .addPage(page,
                    null,
                    function(page,context) {
                        var nameElement, commentsElement, commentObject, commentElement, comments, i, commentsLength;

                        nameElement = page.querySelector('#productname');
                        nameElement.innerHTML = context.name;

                        commentsElement = page
                                .querySelector('#productcomments');
                        logger.log('commentsElement:' + commentsElement);

                        comments = context.comments;
                        commentsLength = comments.length;
                        for(i = 0; i < commentsLength; i += 1) {
                            commentObject = comments[i];
                            commentElement = document.createElement('p');
                            commentElement.innerHTML = commentObject.text;
                            commentsElement.appendChild(commentElement);
                        }
                    });

        page = document.querySelector('.page#productnew');
        pageView.addPage(page,null,function(page,context) {
            var idElement;

            newProductInfo = {
                barcode: context.barcode
            };

            idElement = page.querySelector('#productnewid');
            idElement.value = newProductInfo.barcode;
            idElement.readOnly = true;

            // TODO: Image
        });

        page = document.querySelector('.page#settings');
        pageView.addPage(page,null,function(page,context) {
            var urlButton;

            urlButton = page.querySelector('#serverurl');
            urlButton.value = settings.getItem('serverUrl');
        });

        pageView.gotoPage('intro');
    };

    // Bind Event Listeners
    bindEvents = function() {
        var scanButton, settingsButton, serverUrlInput, newProductControls = {};

        document.addEventListener('deviceready',onDeviceReady,false);

        settingsButton = document.getElementById('settingsbutton');
        settingsButton.addEventListener('click',function() {
            pageView.gotoPage('settings');
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
                    pageView.gotoPage('productview',JSON.parse(response));
                } else if(request.status === 404) {
                    pageView.gotoPage('productnew',{
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

                if(request.status === 200) {
                    logger.log('Product added');
                } else {
                    logger.log('ERROR: Unexpected status code ' +
                               request.status);
                }
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

    // Publish interface
    return {
        Logger: Logger,
        Settings: Settings,
        PageView: PageView,
        initialize: initialize
    };
})();
