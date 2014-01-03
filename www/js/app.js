/*global define, window, document*/

// Barcode Agent application module
//
// Currently in flux of being decomposed to various AMD modules.
//
// Note: barcodescanner is a Cordova plugin, thus it is only shimmed as a script
// to execute in Require and does not return a sensible object for Require. It
// is assigned to a variable right in the beginning of this module using the
// Cordova module system.
define(['cordova',
        'js/lib/pure',
        'js/pages',
        'js/logging',
        'js/settings',
        'js/server-connection',
        'barcodescanner'],
    function(cordova,pure,pages,logging,Settings,ServerConnection) {
        'use strict';

        var scanner, logger, settings, pageView, server, pageExtractor, newProductInfo, newCommentInfo, initialize, bindEvents, onDeviceReady, receivedEvent, scan, requestBarcodeInfo;

        scanner = cordova.require('cordova/plugin/BarcodeScanner');

        // Variable storing details about new product
        newProductInfo = null;

        // Variable storing details about new comment
        newCommentInfo = null;

        // Application Constructor
        initialize = function() {
            var defaultSettings, notifier, statusTextElement, settingsButton;

            defaultSettings = {
                'serverUrl': 'http://barcodeagent.nodejitsu.com',
                'username': 'Anonymous User'
            };

            statusTextElement = document.getElementById('statustext');
            // Wraps Cordova notification plugin so that logger can be
            // initialized
            // now without worrying if navigator.notification exists yet.
            notifier = {
                // Notifies user by showing message in status bar. Different
                // notification types and represented by different background
                // colors.
                notify: function(type,message) {
                    var color;
                    switch(type) {
                    case logging.statusCodes.INFO:
                        color = '#4B946A';
                        break;
                    case logging.statusCodes.DELAY:
                        color = '#333333';
                        break;
                    case logging.statusCodes.ERROR:
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

            logger = new logging.Logger('BarcodeAgent',window.console,notifier);
            settings = new Settings(logger,window.localStorage,defaultSettings);
            pageView = new pages.PageView(logger,pure);
            pageExtractor = new pages.DocumentPageExtractor(logger,document);
            server = new ServerConnection(window.XMLHttpRequest,logger,settings.getItem('serverUrl'));

            bindEvents();

            // *** Sequence of IIFE's, each registering a single page. ***

            // Introductory page
            (function() {
                pageView.addPage(pageExtractor.extract('intro'));
            }());

            // Page for viewing a product
            (function() {
                var template;

                // TODO: Handle a list of products
                template = pure(pages.contentSelector('productview')).compile({
                    '#productname': 'name',
                    '.productcomment': {
                        'comment<-comments': {
                            '.commentby': 'comment.by',
                            '.commentdate': 'comment.date',
                            '.commenttext': 'comment.text'
                        }
                    }
                });

                // Context:
                // -id: product id
                // -name: product name
                function onDisplay(context) {
                    var addCommentElement;

                    addCommentElement = this.domPage
                            .querySelector('#productcommentadd');

                    addCommentElement.addEventListener('click',function() {
                        var commentContext;

                        newCommentInfo = {
                            productId: context.id,
                            username: settings.getItem('username')
                        };

                        commentContext = {
                            product: {
                                name: context.name
                            },username: settings.getItem('username')
                        };

                        pageView.gotoPage('commentadd',commentContext);
                    },false);
                }

                pageView.addPage(pageExtractor.extract('productview',
                    template,
                    onDisplay));
            }());

            // Page for adding a comment for product
            (function() {
                var template;

                template = pure(pages.contentSelector('commentadd')).compile({
                    '#commentaddproduct': 'product.name',
                    '#commentadduser': 'username'
                });

                // Context:
                // -product: product whose comment we are about to add
                // --name: product name
                // -username: User name to be submitted as commenter
                function onDisplay(context) {
                    var textElement, cancelElement, submitElement;

                    textElement = this.domPage.querySelector('#commentaddtext');
                    textElement.addEventListener('change',function() {
                        newCommentInfo.text = this.value;
                    });

                    submitElement = this.domPage
                            .querySelector('#commentaddsubmit');
                    submitElement.addEventListener('click',function() {
                        var onSuccess;

                        onSuccess = function() {
                            server.requestProductInfo(newCommentInfo.productId,function() {
                            // TODO: Notification bar currently says 'product
                            // found'. Does not make much sense.
                            pageView.gotoPage('productview',product);
                        },function() {
                            // TODO: What to do if product is not found at this
                            // point? Not necessarily an error!
                        });};

                        server.submitComment(newCommentInfo.productId,
                            newCommentInfo.text,
                            context.username,
                            onSuccess);
                    },false);

                    cancelElement = this.domPage
                            .querySelector('#commentaddcancel');
                    cancelElement.addEventListener('click',function() {
                        pageView.gotoPreviousPage();
                    },false);
                }

                pageView.addPage(pageExtractor.extract('commentadd',
                    template,
                    onDisplay));
            }());

            // Page for adding new product
            (function() {
                var template;

                template = pure(pages.contentSelector('productnew')).compile({
                    '#productnewbarcode@value': 'barcode',
                    '#productnewname@value': 'name'
                });

                // Context:
                // -barcode: barcode of new product
                // -name: name of new product
                function onDisplay(context) {
                    var nameElement, submitElement;

                    // TODO: Image

                    nameElement = this.domPage.querySelector('#productnewname');
                    submitElement = this.domPage
                            .querySelector('#productnewsubmit');

                    nameElement.addEventListener('change',function() {
                        newProductInfo.name = this.value;
                    },false);

                    // Note: Barcode does not need change event listener as it
                    // is not to be edited by user.

                    submitElement.addEventListener('click',function() {
                        // TODO: Retrieve newly created product page afterwards
                        server.submitProduct(newProductInfo.barcode,
                            newProductInfo.name,
                            settings.getItem('username'));
                    },false);
                }

                pageView.addPage(pageExtractor.extract('productnew',
                    template,
                    onDisplay));
            }());

            // Page for adjusting settings
            (function() {
                // FIXME: This kind of additional info page should probably be
                // implemented some kind of modal dialog.
                var template, settingsButton;

                template = pure(pages.contentSelector('settings')).compile({
                    '#username@value': 'username','#serverurl@value': 'url'
                });

                settingsButton = document.querySelector('#settingsbutton');

                function onDisplay(context) {
                    var usernameInput, serverUrlInput;

                    usernameInput = this.domPage.querySelector('#username');
                    usernameInput.addEventListener('change',function() {
                        logger.log('Setting username to "' + this.value + '"');
                        settings.setItem('username',this.value);
                    },false);

                    serverUrlInput = this.domPage.querySelector('#serverurl');
                    serverUrlInput.addEventListener('change',function() {
                        logger
                                .log('Setting server URL to "' +
                                     this.value +
                                     '"');
                        settings.setItem('serverUrl',this.value);
                        // Note: This simple method of modifying server url
                        // in-place here works. If this phenomenon of putting
                        // something into settings and copying values to other
                        // places becomes more common, Settings may need its own
                        // notification system.
                        server.url = this.value;
                    },false);

                    settingsButton.innerHTML = 'hide settings';
                }

                // On hide handler changes settings button text
                function onHide() {
                    settingsButton.innerHTML = 'view settings';
                }

                pageView.addPage(pageExtractor.extract('settings',
                    template,
                    onDisplay,
                    onHide));
            }());

            pageView.gotoPage('intro');
        };

        // Bind Event Listeners
        bindEvents = function() {
            var scanButton, settingsButton, context;

            document.addEventListener('deviceready',function() {
                logger.notify(logging.statusCodes.INFO,'Device is Ready');
            },false);

            settingsButton = document.getElementById('settingsbutton');
            settingsButton.addEventListener('click',function() {
                if(pageView.currentPage.id === 'settings') {
                    pageView.gotoPreviousPage();
                } else {
                    context = {
                        'username': settings.getItem('username'),
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
                        logger
                                .notify(logging.statusCodes.INFO,
                                    'Scan cancelled');
                        return;
                    }

                    logger.log('Scanner result: \n' +
                               'text: ' +
                               result.text +
                               '\n' +
                               'format: ' +
                               result.format +
                               '\n');

                    requestBarcodeInfo(result.text);
                },function(error) {
                    logger.notify(logging.statusCodes.ERROR,
                        'Scanning failed: ' + error);
                });
            } catch(ex) {
                logger.notify(logging.statusCodes.ERROR,'Internal error: ' +
                                                        ex.message);
            }
        };

        // Request info on barcode and act on it. If products with given barcode
        // are found, display the first of them in 'productview' page. If no
        // products are found, go to 'productnew' page to add one.
        requestBarcodeInfo = function(barcode) {
            var onFound, onMissing;

            onFound = function(response) {
                // TODO: What to do if multiple products are returned?
                pageView.gotoPage('productview',response.products[0]);
            };

            onMissing = function() {
                newProductInfo = {
                    barcode: barcode
                };

                pageView.gotoPage('productnew',newProductInfo);
            };

            server.requestBarcodeInfo(barcode,onFound,onMissing);
        };

        // Publish interface
        return {
            initialize: initialize
        };
    });
