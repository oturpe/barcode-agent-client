/*global window, document, XMLHttpRequest, $p */

var scanner, logger, settings, app;

var scanner = cordova.require("cordova/plugin/BarcodeScanner");

// Barcode Agent application module
//
// Contains and exposes all components of the application.
var app = (function() {
    'use strict';

    var Logger, Settings, Page, DocumentPageExtractor, PageView, logger, defaultSettings, settings, pageView, pageExtractor, BARCODES_URL, PRODUCTS_URL, newProductInfo, toBarcodeURL, toQueryString, contentSelector, initialize, bindEvents, onDeviceReady, receivedEvent, scan, submit, requestInfo, templates;

    // Logger constructor
    //
    // Component for logging and notification.
    Logger = function(prefix,baseLogger,notifier) {
        this.prefix = prefix || '';
        this.baseLogger = baseLogger;
        this.notifier = notifier;

        return this;
    };

    // Notification types: information, error condition, operation underway
    Logger.INFO = 'INFO';
    Logger.ERROR = 'ERROR';
    Logger.DELAY = 'DELAY';

    Logger.prototype = {
        // Silently logs given message
        log: function(message) {
            this.baseLogger.log(this.prefix + ' ' + message);
        },
        // Logs given notification and displays it to the user
        notify: function(type,message) {
            this.log('[' + type + '] ' + message);
            this.notifier.notify(type,message);
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

    // A single page of the application.
    //
    // Contains page id, dom page reference and on-display and on-hide handlers.
    // Default for both of these handlers is no-op.
    // TODO: add onDisplay,onHide and templated using a method.
    Page = function(id,domPage,onDisplay,onHide) {
        this.id = id;

        // FIXME: domPage is mandatory. What to do if it is missing?

        this.domPage = domPage;
        this.onDisplay = onDisplay || function() {};
        this.onHide = onHide || function() {};
    };

    // Contains all pages within one virtual page and allows switching between
    // them.
    //
    // Initialization of page with given id is handled by specialized
    // handler function, registered with addPage method.
    PageView = function(logger,document) {
        this.logger = logger;
        this.document = document;

        this.pages = {};

        this.currentPage = undefined;
        this.previousPage = undefined;
    };

    PageView.prototype = {
        // Adds page to the list of registered pages and associates given
        // on-display and on-hide handlers with it.
        //
        // Assumes responsibility for viewing and hiding the page, hiding it
        // initially. To show the page, see method gotoPage.
        addPage: function(page) {
            this.logger.log('Added page ' + page.id + ' to page list');
            this.pages[page.id] = page;
        },

        // Switches virtual page within the single page model. Context parameter
        // is a JS object containing page-specific initialization data.

        // The specific actions performed by this method are:
        // 1. Adjusting display values of page elements so that only the new
        // page remains visible.
        // 2. Calling on-display and on-hide handlers of the pages.
        // 3. Updating current and previous page id member variables.
        //
        // Pages are referred to by their id's.
        gotoPage: function(newPageId,context) {
            var newPage;

            newPage = this.pages[newPageId];

            if(newPage === undefined) {
                this.logger.log('ERROR: ' +
                                'Cannot open page with unknown page id: ' +
                                newPageId);
                return;
            }

            this.logger.log('Opening page with id ' + newPageId);

            // No current page when the first page is opened
            if(this.currentPage) {
                this.currentPage.onHide(this.currentPage.id);
            }

            newPage.onDisplay(context);

            this.changeDisplay(this.currentPage,newPage);

            this.previousPage = this.currentPage;
            this.currentPage = newPage;
        },

        // Displays the page that was visible before current page. This method
        // functions like gotoPage. Note that it is not possible to go to
        // previous page again from the opened page. Essentially, the history is
        // one page long and this method does not update it.
        //
        // Note that on-hide handler of hidden page is called, but on-display
        // of opened (previous) page is not called as it is expected that the
        // page is still in the state where it was when it was closed.
        gotoPreviousPage: function() {
            var pages;

            this.logger.log('Going back to page with id ' +
                            this.previousPage.id);

            this.currentPage.onHide(this.currentPage.id);

            this.changeDisplay(this.currentPage,this.previousPage);

            this.currentPage = this.previousPage;
            this.previousPage = null;
        },

        // Utility for changing display values of both current and new page.
        changeDisplay: function(currentPage,newPage) {
            if(currentPage) {
                currentPage.domPage.style.display = 'none';
            }

            newPage.domPage.style.display = 'block';
        }
    };

    // Extracts pages from dom tree
    DocumentPageExtractor = function(logger,document) {
        this.logger = logger;
        this.document = document;
    };

    DocumentPageExtractor.prototype = {
        // Given id, extracts that page from document and returns a Page object
        // that has given on-display and on-hide handlers registered. If page
        // is not found in document, logs a warning and returns null.
        extract: function(id,onDisplay,onHide) {
            var domPage;

            domPage = this.document.querySelector('#' + id);

            if(!domPage) {
                this.logger.log('Did not find page with id ' +
                                id +
                                ' in document.');
                return null;
            }

            return new Page(id,domPage,onDisplay,onHide);
        }
    };

    // Collection of compiled PURE.js templates, one for each page
    // TODO: Put templates inside Page objects
    templates = {};

    // Server URL components
    BARCODES_URL = '/barcodes.cgi';
    PRODUCTS_URL = '/products.cgi';

    // Variable storing details about new product
    newProductInfo = null;

    // Creates REST URL for given product ID
    toBarcodeURL = function(barcode) {
        return settings.getItem('serverUrl') + BARCODES_URL + '/' + barcode;
    };

    // Creates URL-encoded string from given object, suitable for http
    // get and post queries.
    toQueryString = function(obj) {
        var query = '', key, keys = Object.keys(obj), length = keys.length, i;

        for(i = 0; i < length; i += 1) {
            key = keys[i];

            if(i > 0) {
                query += '&';
            }

            query += key + '=' + encodeURIComponent(obj[key]);
        }

        return query;
    };

    // Create selector for choosing page content dom element
    contentSelector = function(pageId) {
        return '#' + pageId + 'content';
    };

    // Application Constructor
    initialize = function() {
        var notifier, statusTextElement, settingsButton;

        defaultSettings = {
            'serverUrl': 'http://barcodeagent.nodejitsu.com'
        };

        statusTextElement = document.getElementById('statustext');
        // Wraps Cordova notification plugin so that logger can be initialized
        // now without worrying if navigatotr.notification exists yet.
        notifier = {
            // Notifies user by showing message in status bar. Different
            // notification types and represented by different background
            // colors.
            notify: function(type,message) {
                var color;
                switch(type) {
                case Logger.INFO:
                    color = '#4B946A';
                    break;
                case Logger.DELAY:
                    color = '#333333';
                    break;
                case Logger.ERROR:
                    color = '#C90C22';
                    break;
                default:
                    color = '#C90C22';
                    message = 'Internal error in notifier';
                    logger.log('Unexpected notification type: ' + type);
                    break;
                }

                statusTextElement.style.backgroundColor = color;
                statusTextElement.innerHTML = message;
            }
        };

        logger = new Logger('BarcodeAgent',window.console,notifier);
        settings = new Settings(logger,window.localStorage,defaultSettings);
        pageView = new PageView(logger,document);
        pageExtractor = new DocumentPageExtractor(logger,document);

        bindEvents();

        // *** Sequence of IIFE's, each registering a single page. ***

        (function() {
            pageView.addPage(pageExtractor.extract('intro'));
        }());

        (function() {
            templates.productView = $p(contentSelector('productview'))
                    .compile({
                        '#productname': 'name',
                        '.productcomment': {
                            'comment<-comments': {
                                '.commentby': 'comment.by',
                                '.commentdate': 'comment.date',
                                '.commenttext': 'comment.text'
                            }
                        }
                    });

            function onDisplay(context) {
                var product, addCommentElement;

                // TODO: Handle all returned products somehow instead of
                // using the first one.
                product = context.products[0];
                $p(contentSelector(this.id)).render(product,
                    templates.productView);

                addCommentElement = this.domPage
                        .querySelector('#productcommentadd');

                addCommentElement.addEventListener('click',function() {
                    var context;

                    context = {
                        productName: product.name
                    };
                    pageView.gotoPage('commentadd',context);
                },false);
            }

            pageView.addPage(pageExtractor.extract('productview',onDisplay));
        }());

        (function() {
            templates.commentAdd = $p(contentSelector('commentadd')).compile({
                '#commentaddproduct': 'productName'
            });

            // Context:
            // - productName: name of the product to be commented on
            function onDisplay(context) {
                var product;

                $p(contentSelector(this.id)).render(context,
                    templates.commentAdd);

                // TODO: Functions for submit and cancel buttons.
            }

            pageView.addPage(pageExtractor.extract('commentadd',onDisplay));
        }());

        (function() {
            templates.productNew = $p(contentSelector('productnew')).compile({
                '#productnewbarcode@value': 'barcode',
                '#productnewname@value': 'name'
            });

            // Context:
            // - barcode: product's barcode (read-only)
            // - name: suggestion for product name, user-editable, usually empty
            function onDisplay(context) {
                var nameElement, submitElement;

                $p(contentSelector(this.id)).render(context,
                    templates.productNew);

                // TODO: Image

                nameElement = this.domPage.querySelector('#productnewname');
                submitElement = this.domPage.querySelector('#productnewsubmit');

                nameElement.addEventListener('change',function() {
                    newProductInfo.name = this.value;
                },false);

                // Note: Barcode does not need change event listener as it is
                // not to be edited by user.

                submitElement.addEventListener('click',function() {
                    submit(newProductInfo.barcode,
                        newProductInfo.name,
                        newProductInfo.user);
                },false);
            }

            pageView.addPage(pageExtractor.extract('productnew',onDisplay));
        }());

        (function() {
            // FIXME: This kind of additional info page should probably be
            // implemented some kind of modal dialog.
            var settingsButton;

            templates.settings = $p(contentSelector('settings')).compile({
                '#serverurl@value': 'url'
            });

            settingsButton = document.querySelector('#settingsbutton');

            // Context:
            // -url: current server url
            function onDisplay(context) {
                var serverUrlInput;

                $p(contentSelector(this.id)).render(context,templates.settings);

                serverUrlInput = document.getElementById('serverurl');
                serverUrlInput.addEventListener('change',function() {
                    logger.log('Setting server URL to "' + this.value + '"');
                    settings.setItem('serverUrl',this.value);
                },false);

                settingsButton.innerHTML = 'hide settings';
            }

            // On hide handler changes settings button text
            function onHide() {
                settingsButton.innerHTML = 'view settings';
            }

            pageView
                    .addPage(pageExtractor.extract('settings',onDisplay,onHide));
        }());

        pageView.gotoPage('intro');
    };

    // Bind Event Listeners
    bindEvents = function() {
        var scanButton, settingsButton, context;

        document.addEventListener('deviceready',function() {
            logger.notify(Logger.INFO,'Device is Ready');
        },false);

        settingsButton = document.getElementById('settingsbutton');
        settingsButton.addEventListener('click',function() {
            if(pageView.currentPage.id === 'settings') {
                pageView.gotoPreviousPage();
            } else {
                context = {
                    'url': settings.getItem('serverUrl')
                };
                pageView.gotoPage('settings',context);
            }
        },false);

        scanButton = document.getElementById('scanbutton');
        scanButton.addEventListener('click',scan,false);
    };

    // Scan barcode
    //
    // Calls barcode scanner plugin code.
    scan = function() {
        logger.log('scanning');
        try {
            scanner.scan(function(result) {
                if(result.cancelled) {
                    logger.notify(Logger.INFO,'Scan cancelled');
                    return;
                }

                logger.log('Scanner result: \n' +
                           'text: ' +
                           result.text +
                           '\n' +
                           'format: ' +
                           result.format +
                           '\n');

                requestInfo(result.text);
            },function(error) {
                logger.notify(Logger.ERROR,'Scanning failed: ' + error);
            });
        } catch(ex) {
            logger.notify(Logger.ERROR,'Internal error: ' + ex.message);
        }
    };

    // Retrieves barcode information for the server. If matching product is
    // found, takes app to view for that product. If no products are found,
    // instructs the user to add it to database.
    requestInfo = function(barcode) {
        var request, response, url, message;

        if(!barcode) {
            message = 'Interal error: Called "requestInfo" without barcode';
            logger.notify(Logger.ERROR,message);
            return;
        }

        url = toBarcodeURL(barcode);
        logger.log('Requesting info from ' + url);

        try {
            request = new XMLHttpRequest();
            request.open('GET',url,true);

            request.onreadystatechange = function() {
                if(request.readyState !== this.DONE) {
                    return;
                }

                if(request.status === 200) {
                    logger.notify(Logger.INFO,'Product found');

                    response = JSON.parse(request.responseText);
                    pageView.gotoPage('productview',response);
                } else if(request.status === 404) {
                    logger.notify(Logger.INFO,'No data available');

                    newProductInfo = {
                        barcode: barcode
                    };

                    pageView.gotoPage('productnew',newProductInfo);
                } else if(request.status === 0) {
                    logger.notify(Logger.ERROR,'Could not reach server');
                } else {
                    message = 'Internal error: Unexpected status code ' +
                              request.status;
                    logger.notify(Logger.ERROR,message);
                }
            };

            logger.notify(Logger.DELAY,'Requesting info...');
            request.send(null);
        } catch(ex) {
            logger.notify(Logger.ERROR,'Internal error: ' + ex.message);
        }
    };

    // Submits new product to server.
    submit = function(barcode,productName,user) {

        logger.log('At submit method');
        logger.log('barcode: ' + barcode);
        logger.log('name: ' + productName);
        logger.log('user: ' + user);

        var request, response, productInfo, message;

        try {
            request = new XMLHttpRequest();
            request.open('POST',
                settings.getItem('serverUrl') + PRODUCTS_URL,
                true);

            request.onreadystatechange = function() {
                if(request.readyState !== this.DONE) {
                    return;
                }

                if(request.status === 201) {
                    logger.notify(Logger.INFO,'Product submitted');
                } else {
                    message = 'Internal error: Unexpected status code ' +
                              request.status;
                    logger.notify(Logger.ERROR,message);
                }
            };

            productInfo = {
                barcode: barcode,name: productName
            };
            // TODO: Image

            logger.notify(Logger.DELAY,'Submitting product...');
            request.send(toQueryString(productInfo));
        } catch(ex) {
            logger.notify(Logger.ERROR,'Internal error: ' + ex.message);
        }
    };

    // Publish interface
    return {
        Logger: Logger,
        Settings: Settings,
        Page: Page,
        PageView: PageView,
        DocumentPageExtractor: DocumentPageExtractor,
        initialize: initialize
    };
}());
