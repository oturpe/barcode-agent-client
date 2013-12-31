/*global XMLHttpRequest */

// Interface to Barcode Agent server. Uses XMLHttpRequest to submit and request
// data to and from server. Methods accept callbacks which are called depending
// on status code returned by server, so different actions can be taken for
// found data, missing data and so on.
define([],
    function() {
        'use strict';

        var BARCODES_URL, PRODUCTS_URL, COMMENTS_URL_COMPONENT, ServerConnection;

        // Server URL components
        BARCODES_URL = '/barcodes.cgi';
        PRODUCTS_URL = '/products.cgi';
        COMMENTS_URL_COMPONENT = 'comments';

        // Creates url-encoded string from given object, suitable for http
        // get and post queries.
        function toQueryString(obj) {
            var query = '', key, keys = Object.keys(obj), length = keys.length, i;

            for(i = 0; i < length; i += 1) {
                key = keys[i];

                if(i > 0) {
                    query += '&';
                }

                query += key + '=' + encodeURIComponent(obj[key]);
            }

            return query;
        }

        ServerConnection = function(logger,url) {
            this.logger = logger;
            this.url = url;
        };

        ServerConnection.prototype = {
            // Products REST url
            productsUrl: function() {
                return this.url + PRODUCTS_URL;
            },
            // Creates REST url for given barcode
            toBarcodeUrl: function(barcode) {
                return this.url + BARCODES_URL + '/' + barcode;
            },
            // Creates REST url for comments of given product
            toCommentsUrl: function(productId) {
                // return this.url +
                // PRODUCTS_URL +
                // '/' +
                // productId +
                // '/' +
                // COMMENTS_URL_COMPONENT;
                return this.url + '/comments.cgi';
            },
            // Requests info on given barcode from server. Result handling is
            // done using callback functions. Function onFound in called if
            // server returns data on barcode. It accepts a single parameter,
            // which is an object directly parsed from server response JSON. See
            // protocol specification for exact format. On the other hand, if
            // data is not found on server, onMissing callback is called.
            //
            // Omitting a callback is interpreted as no-op callback.
            //
            // Logging happens internally in this method, there is no need to
            // log 'barcode found' or 'barcode not found' messages in callbacks.
            requestInfo: function(barcode,onFound,onMissing) {

                var logger, request, response, url, message;

                onFound = onFound || function() {};
                onMissing = onMissing || function() {};

                // Get explicit reference to logger as it is needed inside
                // callback function to be executed from within XMLHttpRequest.
                logger = this.logger;

                if(!barcode) {
                    message = 'Interal error: Called "requestInfo" without barcode';
                    logger.notify(logger.statusCodes.ERROR,message);
                    return;
                }

                url = this.toBarcodeUrl(barcode);
                logger.log('Requesting info from ' + url);

                try {
                    request = new XMLHttpRequest();
                    request.open('GET',url,true);

                    request.onreadystatechange = function() {
                        if(request.readyState !== this.DONE) {
                            return;
                        }

                        if(request.status === 200) {
                            logger.notify(logger.statusCodes.INFO,
                                'Product found');
                            onFound(JSON.parse(request.responseText));
                        } else if(request.status === 404) {
                            logger.notify(logger.statusCodes.INFO,
                                'No data available');
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

                    logger
                            .notify(logger.statusCodes.DELAY,
                                'Requesting info...');
                    request.send(null);
                } catch(ex) {
                    logger.notify(logger.statusCodes.ERROR,'Internal error: ' +
                                                           ex.message);
                }
            },
            // Submits new product to server. Required data is product barcode
            // and name. Callback function onSuccess is called after successful
            // submit.
            //
            // Omitting on-success callback is interpreted as no-op callback.
            submitProduct: function(barcode,productName,user,onSuccess) {

                var logger, request, response, productInfo, message;

                // Get explicit reference to logger as it is needed inside
                // callback function to be executed from within XMLHttpRequest.
                logger = this.logger;

                try {
                    request = new XMLHttpRequest();
                    request.open('POST',this.productsUrl(),true);

                    request.onreadystatechange = function() {
                        if(request.readyState !== this.DONE) {
                            return;
                        }

                        if(request.status === 201) {
                            logger.notify(logger.statusCodes.INFO,
                                'Product submitted');
                            onSuccess();
                        } else {
                            message = 'Internal error: Unexpected status code ' +
                                      request.status;
                            logger.notify(logger.statusCodes.ERROR,message);
                        }
                    };

                    productInfo = {
                        barcode: barcode,name: productName
                    };
                    // TODO: Image

                    logger.notify(logger.statusCodes.DELAY,
                        'Submitting product...');
                    request.send(toQueryString(productInfo));
                } catch(ex) {
                    logger.notify(logger.statusCodes.ERROR,'Internal error: ' +
                                                           ex.message);
                }

            },
            // Submits new product to server. Required data is product, comment
            // text and username. Callback function onSuccess is called after
            // successful submit.
            //
            // Omitting on-success callback is interpreted as no-op callback.
            submitComment: function(product,comment,username,onSuccess) {
                var logger, url, request, response, commentInfo, message;

                onSuccess = onSuccess || function() {};

                // Get explicit reference to logger as it is needed inside
                // callback function to be executed from within XMLHttpRequest.
                logger = this.logger;

                url = this.toCommentsUrl(product.id);

                try {
                    request = new XMLHttpRequest();
                    request.open('POST',url,true);

                    request.onreadystatechange = function() {
                        if(request.readyState !== this.DONE) {
                            return;
                        }

                        if(request.status === 201) {
                            logger.notify(logger.statusCodes.INFO,
                                'Comment submitted');
                            onSuccess();
                        } else {
                            message = 'Internal error: Unexpected status code ' +
                                      request.status;
                            logger.notify(logger.statusCodes.ERROR,message);
                        }
                    };

                    commentInfo = {
                        by: username,comment: comment
                    };

                    logger.notify(logger.statusCodes.DELAY,
                        'Submitting comment...');
                    request.send(toQueryString(commentInfo));
                } catch(ex) {
                    logger.notify(logger.statusCodes.ERROR,'Internal error: ' +
                                                           ex.message);
                }
            }
        };

        return ServerConnection;
    });
