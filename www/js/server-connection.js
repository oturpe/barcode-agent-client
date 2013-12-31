/*global XMLHttpRequest */

// Interface to Barcode Agent server. Uses XMLHttpRequest to submit and request
// data to and from server. Methods accept callbacks which are called depending
// on status code returned by server, so different actions can be taken for
// found data, missing data and so on.
define([],
    function() {
        'use strict';

        var BARCODES_URL, ServerConnection;

        // Server URL components
        BARCODES_URL = '/barcodes.cgi';

        ServerConnection = function(logger,url) {
            this.logger = logger;
            this.url = url;
        };

        ServerConnection.prototype = {
            // Creates REST url for given barcode
            toBarcodeUrl: function(barcode) {
                return this.url + BARCODES_URL + '/' + barcode;
            },
            // Requests info on given barcode from server. Result handling is
            // done using callback functions. Function onFound in called if
            // server returns data on barcode. It accepts a single parameter,
            // which is an object directly parsed from server response JSON. See
            // protocol specification for exact format. On the other hand, if
            // data is not found on server, onMissing callback is called.
            //
            // Logging happens internally in this method, there is no need to
            // log 'barcode found' or 'barcode not found' messages in callbacks. 
            requestInfo: function(barcode,onFound,onMissing) {
                var logger, request, response, url, message;
                
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
                            logger.notify(logger.statusCodes.ERROR,
                                message);
                        }
                    };

                    logger.notify(logger.statusCodes.DELAY,
                        'Requesting info...');
                    request.send(null);
                } catch(ex) {
                    logger.notify(logger.statusCodes.ERROR,
                        'Internal error: ' + ex.message);
                }
            }
        };
        
        return ServerConnection;
    });
