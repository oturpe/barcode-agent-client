/*global define*/

// Interface to Barcode Agent server. Uses XMLHttpRequest to submit and request
// data to and from server. Methods accept callbacks which are called depending
// on status code returned by server, so different actions can be taken for
// found data, missing data and so on.
define(['js/server-utils'],function(utils) {
    'use strict';

    // Server URL components
    var BARCODES_URL = '/barcodes';
    var PRODUCTS_URL = '/products';
    var COMMENTS_URL_COMPONENT = 'comments';

    // Creates and initializes new server connection. Uses XMLHttpRequest
    // internally, so implementation is passed as parameter. Also needs
    // a logger and server url.
    var ServerConnection = function(XMLHttpRequest,logger,url) {
        this.XMLHttpRequest = XMLHttpRequest;
        this.logger = logger;
        this.url = url;
    };

    // Products REST url
    ServerConnection.prototype.productsUrl = function() {
        return this.url + PRODUCTS_URL;
    };

    // Creates REST url for given barcode
    ServerConnection.prototype.toBarcodeUrl = function(barcode) {
        return this.url + BARCODES_URL + '/' + barcode;
    };

    // Creates REST url for product from its id
    ServerConnection.prototype.toProductUrl = function (id) {
        return this.url + PRODUCTS_URL + '/' + id;
    };

    // Creates REST url for comments of given product
    ServerConnection.prototype.toCommentsUrl = function (productId) {
        return this.url +
               PRODUCTS_URL +
               '/' +
                productId +
               '/' +
               COMMENTS_URL_COMPONENT;
        //return this.url + '/comments.cgi';
    };

    // Requests info on given barcode from server. Result handling is
    // done using callback functions. Function onFound in called if
    // server returns data on barcode. It accepts a single parameter,
    // which is an object parsed from server response JSON. See
    // protocol specification for exact format. On the other hand, if
    // data is not found on server, onMissing callback is called.
    //
    // Omitting a callback is interpreted as no-op callback.
    //
    // Errors and request progress are logger internally in this method except
    // for code paths that end in calling the handlers. They are expected to do
    // their own logging. This allows customization of logging and notifications
    // by caller.
    ServerConnection.prototype.requestBarcodeInfo = function (barcode,
                                                              onFound,
                                                              onMissing) {
        onFound = onFound || function() {};
        onMissing = onMissing || function() {};

        // Get explicit reference to logger as it is needed inside
        // callback function to be executed from within XMLHttpRequest.
        var logger = this.logger;

        var message;
        if (!barcode) {
            message = 'Interal error: Called "requestBarcodeInfo" ' +
                      'without barcode';
            logger.notify(logger.statusCodes.ERROR, message);
            return;
        }

        var url = this.toBarcodeUrl(barcode);
        logger.log('Requesting info from ' + url);

        try {
            var request = new this.XMLHttpRequest();
            request.open('GET',url,true);

            request.onreadystatechange = function() {
                if(request.readyState !== this.DONE) {
                    return;
                }

                if(request.status === 200) {
                    onFound(utils.readMongoResponse(request.responseText));
                } else if(request.status === 404) {
                    onMissing();
                } else if(request.status === 0) {
                    logger.notify(logger.statusCodes.ERROR,
                                  'Could not reach server');
                } else {
                    message = 'Internal error: Unexpected status code ' +
                              request.status;
                    logger.notify(logger.statusCodes.ERROR,message);
                }
            };

            logger.notify(logger.statusCodes.DELAY,'Requesting info...');
            request.send(null);
        } catch(ex) {
            logger.notify(logger.statusCodes.ERROR,
                          'Internal error: ' + ex.message);
        }
    };

    // Requests info on given product from server. Result handling is
    // done using callback functions. Function onFound in called if
    // server returns data on barcode. It is passed a single parameter,
    // which is an object parsed from server response JSON. See
    // protocol specification for exact response contents. On the other hand,
    // if data is not found on server, onMissing callback is called.
    //
    // Omitting a callback is interpreted as no-op callback.
    //
    // Errors and request progress are logger internally in this method except
    // for code paths that end in calling the handlers. They are expected to do
    // their own logging. This allows customization of logging and notifications
    // by caller.
    ServerConnection.prototype.requestProductInfo = function (productId,
                                                              onFound,
                                                              onMissing) {
        onFound = onFound || function () {};
        onMissing = onMissing || function () {};

        // Get explicit reference to logger as it is needed inside
        // callback function to be executed from within XMLHttpRequest.
        var logger = this.logger;

        if (!productId) {
            var message = 'Interal error: Called "requestProductInfo" ' +
                          'without product id';
            logger.notify(logger.statusCodes.ERROR, message);
            return;
        }

        var url = this.toProductUrl(productId);
        logger.log('Requesting info from ' + url);

        try {
            var request = new this.XMLHttpRequest();
            request.open('GET', url, true);

            request.onreadystatechange = function () {
                if (request.readyState !== this.DONE) {
                    return;
                }

                if (request.status === 200) {
                    onFound(utils.readMongoResponse(request.responseText));
                } else if (request.status === 404) {
                    onMissing();
                } else if (request.status === 0) {
                    logger.notify(logger.statusCodes.ERROR,
                                  'Could not reach server');
                } else {
                    message = 'Internal error: Unexpected status code ' +
                              request.status;
                    logger.notify(logger.statusCodes.ERROR, message);
                }
            };

            logger.notify(logger.statusCodes.DELAY,'Requesting info...');
            request.send(null);
        } catch (ex) {
            logger.notify(logger.statusCodes.ERROR,
                          'Internal error: ' + ex.message);
        }
    };

    // Submits new product to server. Required data is product barcode
    // and name. Callback function onSuccess is called after successful
    // submit. It is passed a single parameter, which is an object
    // parsed from server response JSON. See protocol specification for exact
    // response contents.
    //
    // Omitting on-success callback is interpreted as no-op callback.
    //
    // Errors and request progress are logger internally in this method except
    // for code paths that end in calling the handler. It is expected to do
    // its own logging. This allows customization of logging and notifications
    // by caller.
    ServerConnection.prototype.submitProduct = function(barcode,
                                                        productName,
                                                        user,
                                                        onSuccess) {
        onSuccess = onSuccess || function() {};

        // Get explicit reference to logger as it is needed inside
        // callback function to be executed from within XMLHttpRequest.
        var logger = this.logger;

        try {
            var request = new this.XMLHttpRequest();
            request.open('POST',this.productsUrl(),true);

            request.onreadystatechange = function() {
                if(request.readyState !== this.DONE) {
                    return;
                }

                if(request.status === 201) {
                    onSuccess(utils.readMongoResponse(request.responseText));
                } else {
                    var message = 'Internal error: Unexpected status code ' +
                                  request.status;
                    logger.notify(logger.statusCodes.ERROR,message);
                }
            };

            var productInfo = {
                barcode: barcode,
                name: productName
            };
            // TODO: Image

            logger.notify(logger.statusCodes.DELAY,'Submitting product...');
            request.send(utils.toQueryString(productInfo));
        } catch(ex) {
            logger.notify(logger.statusCodes.ERROR,
                          'Internal error: ' + ex.message);
        }
    };

    // Submits new product to server. Required data is product id,
    // comment text and username. Callback function onSuccess is called
    // after successful submit.
    //
    // Omitting on-success callback is interpreted as no-op callback.
    //
    // Errors and request progress are logger internally in this method except
    // for code paths that end in calling the handler. It is expected to do
    // its own logging. This allows customization of logging and notifications
    // by caller.
    ServerConnection.prototype.submitComment = function(productId,
                                                        comment,
                                                        username,
                                                        onSuccess) {
        onSuccess = onSuccess || function() {};

        // Get explicit reference to logger as it is needed inside
        // callback function to be executed from within XMLHttpRequest.
        var logger = this.logger;

        var url = this.toCommentsUrl(productId);

        try {
            var request = new this.XMLHttpRequest();
            request.open('POST',url,true);

            request.onreadystatechange = function() {
                if(request.readyState !== this.DONE) {
                    return;
                }

                if(request.status === 201) {
                    onSuccess();
                } else {
                    var message = 'Internal error: Unexpected status code ' +
                                  request.status;
                    logger.notify(logger.statusCodes.ERROR,message);
                }
            };

            var commentInfo = {by: username,comment: comment};

            logger.notify(logger.statusCodes.DELAY,'Submitting comment...');
            request.send(utils.toQueryString(commentInfo));
        } catch(ex) {
            logger.notify(logger.statusCodes.ERROR,
                          'Internal error: ' + ex.message);
        }
    };

    return ServerConnection;
});
