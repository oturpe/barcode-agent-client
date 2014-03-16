/*global define, window, document*/

// Barcode Agent application module
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
        'barcodescanner'], function(cordova,
                                    pure,
                                    pages,
                                    logging,
                                    Settings,
                                    ServerConnection) {
    'use strict';

    var logger, settings, pageView, server, pageExtractor;

    var scanner = cordova.require('cordova/plugin/BarcodeScanner');

    // FIXME: The following globals are bad. Refactor them away.

    // Variable storing details about new product
    var newProductInfo = null;
    // Variable storing details about new comment
    var newCommentInfo = null;
    // Variable storing details about new flag
    var newFlagInfo = null;

    // Application Constructor
    function initialize() {
        var defaultSettings = {
            'serverUrl': 'http://barcodeagent.nodejitsu.com',
            'username': 'Anonymous User'
        };

        var statusTextElement = document.getElementById('statustext');
        // Wraps Cordova notification plugin so that logger can be
        // initialized
        // now without worrying if navigator.notification exists yet.
        var notifier = {
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
        server = new ServerConnection(window.XMLHttpRequest,
                                      logger,
                                      settings.getItem('serverUrl'));

        bindEvents();

        // *** Sequence of IIFE's, each registering a single page. ***

        // Introductory page
        (function() {
            pageView.addPage(pageExtractor.extract('intro'));
        }());

        // Page for viewing a product
        (function() {
            var template = pure(pages.contentSelector('productview')).compile({
                '#productname': 'name',
                '#productimage@src': 'image.url',
                '#productimage@alt': 'name',
                '#productimageby': 'image.by',
                '#productimagedate': 'image.date',
                '.productflag' : {
                    'flag<-flags': {
                        '.flagtext': 'flag'
                    }
                },
                '.productcomment': {
                    'comment<-comments': {
                        '.commentby': 'comment.by',
                        '.commentdate': 'comment.date',
                        '.commenttext': 'comment.comment'
                    }
                }
            });

            // Context:
            // -id: product id
            // -name: product name
            // -image: object containing image data (optional)
            function onDisplay(context) {
                var productFigureElement =
                    this.domPage.querySelector('#productfigure');
                var productFigureMissingElement =
                   this.domPage.querySelector('#productfiguremissing');
                if(!context.image) {
                    productFigureElement.style.display = 'none';
                    productFigureMissingElement.style.display = 'block';
                }

                var productImageAddEĺement =
                    this.domPage.querySelector('#productimageadd');
                productImageAddEĺement.addEventListener('click',function() {
                    var camera = navigator.camera;

                    // Cordova options for taking the picture.
                    var pictureOptions = {
                        targetHeight: 640,
                        targetWidth: 480,
                        destinationType: camera.DestinationType.DATA_URL
                    };

                    camera.getPicture(onPicture,onPictureFail,pictureOptions);

                    function onPicture(imageURI) {
                        server.submitImage(context.id,
                                           server.ImageTypes.JPEG,
                                           imageURI,
                                           settings.getItem('username'),
                                           onImageSubmitSuccess);
                    }

                    function onPictureFail(errorMessage) {
                        var message = 'Taking picture failed: ' + errorMessage;
                        logger.notify(logger.statusCodes.ERROR,message);
                    }

                    function onImageSubmitSuccess() {
                        logger.notify(logger.statusCodes.INFO,
                                      'Image submitted');

                        // FIXME: Submits the image, but does not show it. How
                        // should this be handled? Probably by simply adding the
                        // image to image element. Other way which is more
                        // uniform but very wasteful on resources is to retrieve
                        // the submitted picture from server. I guess it mostly
                        // depends on whether the server is going to perform
                        // modifications to the image.
                    }

                });

                var addFlagElement =
                    this.domPage.querySelector('#productflagadd');

                addFlagElement.addEventListener('click',function() {
                    newFlagInfo = {
                        productId: context.id,
                        username: settings.getItem('username')
                    };

                    var flagContext = {
                        product: {
                            name: context.name
                        },
                        username: settings.getItem('username')
                    };

                    pageView.gotoPage('flagadd',flagContext);
                },false);

                var addCommentElement =
                    this.domPage.querySelector('#productcommentadd');

                addCommentElement.addEventListener('click',function() {
                    var commentContext;

                    newCommentInfo = {
                        productId: context.id,
                        username: settings.getItem('username')
                    };

                    commentContext = {
                        product: {
                            name: context.name
                        },
                        username: settings.getItem('username')
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
            var contentSelector = pages.contentSelector('commentadd');
            var template = pure(contentSelector).compile({
                '#commentaddproduct': 'product.name',
                '#commentadduser': 'username'
            });

            // Context:
            // -product: product whose comment we are about to add
            // --name: product name
            // -username: User name to be submitted as commenter
            function onDisplay(context) {
                var textElement =
                    this.domPage.querySelector('#commentaddtext');
                textElement.addEventListener('change',function() {
                    newCommentInfo.text = this.value;
                });

                var submitElement =
                    this.domPage.querySelector('#commentaddsubmit');
                submitElement.addEventListener('click',function() {
                    server.submitComment(newCommentInfo.productId,
                                         newCommentInfo.text,
                                         context.username,
                                         onSubmitSuccess);
                },false);

                function onSubmitSuccess() {
                    requestProductWithComments(newCommentInfo.productId,
                                               'Comment submitted');
                }

                var cancelElement =
                    this.domPage.querySelector('#commentaddcancel');
                cancelElement.addEventListener('click',function() {
                    pageView.gotoPreviousPage();
                },false);
            }

            pageView.addPage(pageExtractor.extract('commentadd',
                                                   template,
                                                   onDisplay));
        }());

        // Page for adding a flag for product
        (function() {
            var contentSelector = pages.contentSelector('flagadd');
            var template = pure(contentSelector).compile({
                '#flagaddproduct': 'product.name',
                '#flagadduser': 'username'
            });

            // Context:
            // -product: product to which we are about to add a flag
            // --name: product name
            // -username: User name to be submitted as flagger
            function onDisplay(context) {
                var nameElement =
                    this.domPage.querySelector('#flagaddname');
                nameElement.addEventListener('change',function() {
                    newFlagInfo.name = this.value;
                });

                var submitElement =
                    this.domPage.querySelector('#flagaddsubmit');
                submitElement.addEventListener('click',function() {
                    server.submitFlag(newFlagInfo.productId,
                                      newFlagInfo.name,
                                      context.username,
                                      onSubmitSuccess);
                },false);

                function onSubmitSuccess() {
                    requestProductWithComments(newFlagInfo.productId,
                                               'Flag submitted');
                }

                var cancelElement =
                    this.domPage.querySelector('#flagaddcancel');
                cancelElement.addEventListener('click',function() {
                    pageView.gotoPreviousPage();
                },false);
            }

            pageView.addPage(pageExtractor.extract('flagadd',
                                                   template,
                                                   onDisplay));
        }());

        // Page for adding new product
        (function() {
            var contentSelector = pages.contentSelector('productnew');
            var template = pure(contentSelector).compile({
                '#productnewbarcode@value': 'barcode',
                '#productnewname@value': 'name'
            });

            // Context:
            // -barcode: barcode of new product
            // -name: name of new product
            function onDisplay(context) {
                // TODO: Image

                var nameElement =
                    this.domPage.querySelector('#productnewname');
                var submitElement =
                    this.domPage.querySelector('#productnewsubmit');

                nameElement.addEventListener('change',function() {
                    newProductInfo.name = this.value;
                },false);

                // Note: Barcode does not need change event listener as it
                // is not to be edited by user.

                submitElement.addEventListener('click',function() {
                    server.submitProduct(newProductInfo.barcode,
                                         newProductInfo.name,
                                         settings.getItem('username'),
                                         onSubmitSuccess);
                },false);

                function onSubmitSuccess(product) {
                    logger.notify(logger.statusCodes.DELAY,
                                  'Product submitted, updating...');
                    requestProductWithComments(product.id,'Product submitted');
                }
            }

            pageView.addPage(pageExtractor.extract('productnew',
                                                   template,
                                                   onDisplay));
        }());

        // Page for adjusting settings
        (function() {
            // FIXME: This kind of additional info page should probably be
            // implemented some kind of modal dialog.
            var template = pure(pages.contentSelector('settings')).compile({
                '#username@value': 'username',
                '#serverurl@value': 'url'
            });

            var settingsButton = document.querySelector('#settingsbutton');

            function onDisplay(context) {
                var usernameInput = this.domPage.querySelector('#username');
                usernameInput.addEventListener('change',function() {
                    logger.log('Setting username to "' + this.value + '"');
                    settings.setItem('username',this.value);
                },false);

                var serverUrlInput = this.domPage.querySelector('#serverurl');
                serverUrlInput.addEventListener('change',function() {
                    logger.log('Setting server URL to "' + this.value + '"');
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
    }

    // Bind Event Listeners
    function bindEvents() {
        document.addEventListener('deviceready',function() {
            logger.notify(logging.statusCodes.INFO,'Device is Ready');
        },false);

        var settingsButton = document.getElementById('settingsbutton');
        settingsButton.addEventListener('click',function() {
            if(pageView.currentPage.id === 'settings') {
                pageView.gotoPreviousPage();
            } else {
                var context = {
                    'username': settings.getItem('username'),
                    'url': settings.getItem('serverUrl')
                };
                pageView.gotoPage('settings',context);
            }
        },false);

        var scanButton = document.getElementById('scanbutton');
        scanButton.addEventListener('click',scan,false);
    }

    // Scan barcode
    //
    // Calls barcode scanner plugin code.
    function scan() {
        logger.log('scanning');

        var message;
        try {
            scanner.scan(function(result) {
                if(result.cancelled) {
                    var foo = 2;
                    logger.notify(logging.statusCodes.INFO,'Scan cancelled');
                    foo = foo + 1;
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
                message = 'Scanning failed: ' + error;
                logger.notify(logging.statusCodes.ERROR,message);
            });
        } catch(ex) {
            message = 'Internal error: ' + ex.message;
            logger.notify(logging.statusCodes.ERROR,message);
        }
    }

    // Request info on barcode and act on it. If products with given barcode
    // are found, display the first of them in 'productview' page. If no
    // products are found, go to 'productnew' page to add one.
    function requestBarcodeInfo(barcode) {
        var onFound = function(response) {
            // TODO: What to do if multiple products are returned?
            requestProductWithComments(response.products[0].id,'Product found');
        };

        var onMissing = function() {
            logger.notify(logger.statusCodes.INFO,'No data available');

            newProductInfo = {barcode: barcode};
            pageView.gotoPage('productnew',newProductInfo);
        };

        server.requestBarcodeInfo(barcode,onFound,onMissing);
    }

    // Request product info and act on it. If product with given id
    // is found, display it along with its comments on 'productview' page.
    // Given success message is displayed as notification.
    function requestProductWithComments(productId,successMessage) {
        var productInfo;

        server.requestProductInfo(productId,onInitialSuccess,onMissing);

        function onInitialSuccess(product) {
            productInfo = product;

            logger.notify(logger.statusCodes.DELAY,'Fetching flags...');
            server.requestFlags(product.id,onFlagsSuccess,onMissing);
        }

        function onFlagsSuccess(flags) {
            productInfo.flags = flags.flags;

            logger.notify(logger.statusCodes.DELAY,'Fetching comments...');
            server.requestComments(productInfo.id,onCommentsSuccess,onMissing);
        }

        function onCommentsSuccess(comments) {
            productInfo.comments = comments.comments;

            logger.notify(logger.statusCodes.INFO,successMessage);
            pageView.gotoPage('productview',productInfo);
        }

        function onMissing() {
            logger.notify(logger.statusCodes.ERROR,'Product info not found');
        }
    }

    // Publish interface
    return {initialize: initialize};
});
