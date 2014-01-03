/*global define, describe, it, xit, beforeEach, expect, spyOn*/

define(['jasmine/jasmine', 'js/logging', 'js/server-connection'], function (
    jasmine, logging, ServerConnection) {
    'use strict';

    var desc;
    describe('server-connection', function () {
        describe('ServerConnection', function () {
            var testBarcode, testProductId, testProductName, testUser, testComment, logger, url,
                XhrMock,
                serverConnection;

            testBarcode = 'testBarcode';
            testProductId = 'testProductId';
            testProductName = 'testProductName';
            testUser = 'testUser';
            testComment = 'test comment text';

            // Simple logger test double that ignores all log
            // messages
            logger = {
                statusCodes: logging.statusCodes,
                log: function () {},
                notify: function () {}
            };

            url = 'http://unittest.barcodeagent.com';

            beforeEach(function () {
                // Constructor for simple XMLHttpRequest mock that sets
                // ready state to DONE and calls onreadystatechange when
                // send is called. Status code and response text to be
                // returned by instances can be configured by setting the
                // 'status' and 'responseText' properties of this
                // constructor. Defaults of 0 (error code) and empty string
                // are used if properties are not set.
                XhrMock = function () {
                    this.DONE = 'mock xhr DONE';
                    this.readyState = '';
                };

                XhrMock.prototype.open = function () {};

                XhrMock.prototype.send = function () {
                    this.status = XhrMock.status || 0;
                    this.responseText = XhrMock.responseText ||
                        '';
                    this.readyState = this.DONE;
                    this.onreadystatechange();
                };
            });

            desc =
                'sends GET request to barcode url when requesting barcode info';
            it(desc, function () {
                var getUrl;

                spyOn(XhrMock.prototype, 'open').andCallThrough();

                serverConnection = new ServerConnection(
                    XhrMock,
                    logger,
                    url);

                serverConnection.requestBarcodeInfo(testBarcode);

                getUrl = url + '/barcodes' + '/' + testBarcode;
                expect(XhrMock.prototype.open).toHaveBeenCalledWith(
                    'GET', getUrl, true);
            });

            desc =
                'calls on-missing handler if barcode info is not found';
            it(desc, function () {
                var onFound, onMissing;

                XhrMock.status = 404;
                serverConnection = new ServerConnection(
                    XhrMock,
                    logger,
                    url);

                onFound = jasmine.createSpy('onFound');
                onMissing = jasmine.createSpy(
                    'onMissing');

                serverConnection.requestBarcodeInfo(
                    testBarcode,
                    onFound,
                    onMissing);

                expect(onFound).not.toHaveBeenCalled();
                expect(onMissing).toHaveBeenCalled();
            });

            desc =
                'calls on-found handler if barcode info is found';
            it(desc, function () {
                var onFound, onMissing;

                XhrMock.status = 200;
                XhrMock.responseText = '{"a":"aa"}';
                serverConnection = new ServerConnection(
                    XhrMock, logger, url);

                onFound = jasmine.createSpy('onFound');
                onMissing = jasmine.createSpy(
                    'onMissing');

                serverConnection.requestBarcodeInfo(
                    testBarcode,
                    onFound);

                expect(onFound).toHaveBeenCalled();
                expect(onMissing).not.toHaveBeenCalled();
            });

                        desc =
                'sends GET request to product url when requesting product info';
            it(desc, function () {
                var getUrl;

                spyOn(XhrMock.prototype, 'open').andCallThrough();

                serverConnection = new ServerConnection(
                    XhrMock,
                    logger,
                    url);

                serverConnection.requestProductInfo(testProductId);

                getUrl = url + '/products/' + testProductId;
                expect(XhrMock.prototype.open).toHaveBeenCalledWith(
                    'GET', getUrl, true);
            });

            desc =
                'calls on-missing handler if product info is not found';
            it(desc, function () {
                var onFound, onMissing;

                XhrMock.status = 404;
                serverConnection = new ServerConnection(
                    XhrMock,
                    logger,
                    url);

                onFound = jasmine.createSpy('onFound');
                onMissing = jasmine.createSpy(
                    'onMissing');

                serverConnection.requestProductInfo(
                    testProductId,
                    onFound,
                    onMissing);

                expect(onFound).not.toHaveBeenCalled();
                expect(onMissing).toHaveBeenCalled();
            });

            desc =
                'calls on-found handler if product info is found';
            it(desc, function () {
                var onFound, onMissing;

                XhrMock.status = 200;
                XhrMock.responseText = '{"a":"aa"}';
                serverConnection = new ServerConnection(
                    XhrMock, logger, url);

                onFound = jasmine.createSpy('onFound');
                onMissing = jasmine.createSpy(
                    'onMissing');

                serverConnection.requestProductInfo(
                    testBarcode,
                    onFound);

                expect(onFound).toHaveBeenCalled();
                expect(onMissing).not.toHaveBeenCalled();
            });

            desc =
                'sends POST request to product url when submitting product';
            it(desc, function () {
                var postUrl;

                spyOn(XhrMock.prototype, 'open').andCallThrough();

                serverConnection = new ServerConnection(
                    XhrMock,
                    logger,
                    url);

                serverConnection.submitProduct(testBarcode,
                    testProductName, testUser);

                postUrl = url + '/products';
                expect(XhrMock.prototype.open).toHaveBeenCalledWith(
                    'POST', postUrl, true);
            });

            desc =
                'calls on-success handler if server created submitted product';
            it(desc, function () {
                var onSuccess;

                XhrMock.status = 201;
                serverConnection = new ServerConnection(
                    XhrMock, logger, url);

                onSuccess = jasmine.createSpy('onSuccess');

                serverConnection.submitProduct(testBarcode,
                    testProductName, testUser, onSuccess);

                expect(onSuccess).toHaveBeenCalled();
            });

            desc =
                'does not call on-success handler if product submit fails';
            it(desc, function () {
                var onSuccess;

                XhrMock.status = 200;
                XhrMock.responseText = '{"a":"aa"}';
                serverConnection = new ServerConnection(
                    XhrMock, logger, url);

                onSuccess = jasmine.createSpy('onFound');

                serverConnection.requestInfo(testBarcode,
                    testProductName, testUser, onSuccess);

                expect(onSuccess).not.toHaveBeenCalled();
            });

            desc =
                'sends POST request to product comments url when ' + 
                'submitting a comment';
            it(desc, function () {
                var postUrl;

                spyOn(XhrMock.prototype, 'open').andCallThrough();

                serverConnection = new ServerConnection(
                    XhrMock,
                    logger,
                    url);

                serverConnection.submitComment(testProductId,
                    testComment, testUser);

                postUrl = url + '/products' + '/' + testProductId + '/comments' ;
                expect(XhrMock.prototype.open).toHaveBeenCalledWith(
                    'POST', postUrl, true);
            });

            desc =
                'calls on-success handler if server created submitted ' +
                'product comment';
            it(desc, function () {
                var onSuccess;

                XhrMock.status = 201;
                serverConnection = new ServerConnection(
                    XhrMock, logger, url);

                onSuccess = jasmine.createSpy('onSuccess');

                serverConnection.submitComment(testProductId,
                    testComment, testUser,onSuccess);

                expect(onSuccess).toHaveBeenCalled();
            });

            desc =
                'does not call on-success handler if product comment submit ' +
                'fails';
            it(desc, function () {
                var onSuccess;

                XhrMock.status = 200;
                XhrMock.responseText = '{"a":"aa"}';
                serverConnection = new ServerConnection(
                    XhrMock, logger, url);

                onSuccess = jasmine.createSpy('onFound');

                serverConnection.submitComment(testProductId,
                    testComment, testUser,onSuccess);

                expect(onSuccess).not.toHaveBeenCalled();
            });
        });
    });
});