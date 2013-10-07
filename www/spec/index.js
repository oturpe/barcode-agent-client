/*global describe,beforeEach,it,spyOn,runs,waitsFor,expect,app */
describe('Barcode Agent',function() {
    'use strict';

    describe('Logger',function() {
        it('sends prefixed log messages to given base logger',function() {
            var baseLogger = {
                log: function(message) {
                    this.message = message;
                }
            }, logger = new app.Logger('PREFIX',baseLogger);

            logger.log('Testmessage');
            expect(baseLogger.message).toEqual('PREFIX Testmessage');
        });
    });

    describe('Settings',function() {
        var logger, storage;

        beforeEach(function() {
            storage = {
                values: {},setItem: function(key,value) {
                    this.values[key] = value;
                },getItem: function(key) {
                    return this.values[key];
                }
            };

            logger = {
                log: function() {}
            };
        });

        it('forwards get requests to underlying storage',function() {
            var settings = new app.Settings(logger,storage);
            spyOn(storage,'getItem');

            settings.getItem('foobar');

            expect(storage.getItem).toHaveBeenCalledWith('foobar');
        });

        it('forwards set requests to underlying storage',function() {
            var settings = new app.Settings(logger,storage);
            spyOn(storage,'setItem');

            settings.setItem('foobar',12);

            expect(storage.setItem).toHaveBeenCalledWith('foobar',12);
        });

        it('returns default values for missing keys',function() {
            var settings, value;

            settings = new app.Settings(logger,storage,{
                'foobar': 'default'
            });

            value = settings.getItem('foobar');

            expect(value).toEqual('default');
        });

        it('returns undefined if there is no default value',function() {
            var settings, value;

            settings = new app.Settings(logger,storage,{
                'foobar': 'default'
            });

            value = settings.getItem('no-default');

            expect(value).toBeUndefined();
        });
    });

    describe('PageView',function() {

        var nullLogger, pageView, testPage, otherPage1, otherPage2;

        nullLogger = {
            log: function() {}
        };

        beforeEach(function() {
            pageView = new app.PageView(nullLogger);
            testPage = {
                id: 'testpage',style: {}
            };
            otherPage1 = {
                id: 'otherpage-1',style: {}
            };
            otherPage2 = {
                id: 'otherpage-2',style: {}
            };
        });

        it('invokes initializers on page add',function() {
            var handlerCalled = false;

            pageView.addPage(testPage,function() {
                handlerCalled = true;
            });

            expect(handlerCalled).toBe(true);
        });

        it('interprets missing initializer as no-op',function() {
            pageView.addPage(testPage);

            // This test case passes if preceding call simply executes without
            // exceptions.
        });

        it('invokes ondisplay handler on page open',function() {
            var handlerCalled = false;

            pageView.addPage(testPage,null,function() {
                handlerCalled = true;
            });

            pageView.gotoPage('testpage');

            expect(handlerCalled).toBe(true);
        });

        it('sets default (no-op) on-display handler if none is given',
            function() {
                pageView.addPage(testPage);

                expect(pageView.handlers['testpage']).toBeTruthy();
            });

        it('displays only selected page on page open',function() {
            pageView.addPage(testPage,null,function() {});
            pageView.addPage(otherPage1,null,function() {});
            pageView.addPage(otherPage2,null,function() {});

            pageView.gotoPage('testpage');

            expect(testPage.style.display).toEqual('block');
            expect(otherPage1.style.display).toEqual('none');
            expect(otherPage2.style.display).toEqual('none');
        });

        it('passes page to initializer',function() {
            pageView.addPage(testPage,function(page) {
                page.received = true;
            });

            expect(testPage.received).toBe(true);
        });

        it('passes page and the context object to on-display handler',
            function() {
                var context = {};

                pageView.addPage(testPage,null,function(page,context) {
                    page.received = true;
                    context.received = true;
                });

                pageView.gotoPage('testpage',context);

                expect(testPage.received).toBe(true);
                expect(context.received).toBe(true);
            });
    });
});
