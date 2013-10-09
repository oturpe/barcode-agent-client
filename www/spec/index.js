/*global describe,beforeEach,it,spyOn,runs,waitsFor,expect,jasmine,app */
describe('Barcode Agent',function() {
    'use strict';

    describe('Logger',function() {
        var baseLogger, notifier;

        // Set up logger and notifier mocks.
        beforeEach(function() {
            baseLogger = {
                log: function(message) {}
            };

            notifier = {
                notify: function(type,message) {}
            };
        });

        it('sends prefixed log messages to given base logger',function() {
            var logger = new app.Logger('PREFIX',baseLogger);

            spyOn(baseLogger,'log');

            logger.log('Testmessage');
            expect(baseLogger.log).toHaveBeenCalledWith('PREFIX Testmessage');
        });

        it('sends notifications to both base logger and notifier',function() {
            var logger, DELAY, expected;

            logger = new app.Logger('PREFIX',baseLogger,notifier);
            DELAY = app.Logger.DELAY;

            spyOn(baseLogger,'log');
            spyOn(notifier,'notify');

            logger.notify(DELAY,'Testnotify');

            expected = 'PREFIX [DELAY] Testnotify';

            expect(baseLogger.log).toHaveBeenCalledWith(expected);
            expect(notifier.notify).toHaveBeenCalledWith(DELAY,'Testnotify');
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

        it('hides added pages',function() {
            pageView.addPage(testPage);
            
            expect(testPage.style.display).toEqual('none');
        });
        
        it('interprets missing initializer as no-op',function() {
            pageView.addPage(testPage);

            // This test case passes if preceding call simply executes without
            // exceptions.
        });

        it('sets default (no-op) on-display handler if none is given',
            function() {
                pageView.addPage(testPage);

                expect(pageView.displayHandlers['testpage']).toBeTruthy();
            });

        it('sets default (no-op) on-hide handler if none is given',
            function() {
                pageView.addPage(testPage);

                expect(pageView.hideHandlers['testpage']).toBeTruthy();
            });

        it('invokes initializers on page add',function() {
            var handlerCalled = false;

            pageView.addPage(testPage,function() {
                handlerCalled = true;
            });

            expect(handlerCalled).toBe(true);
        });

        it('invokes ondisplay handler on page open',function() {
            var handlerCalled = false;

            pageView.addPage(testPage,null,function() {
                handlerCalled = true;
            });

            pageView.gotoPage('testpage');

            expect(handlerCalled).toBe(true);
        });

        it('invokes onhide handler of the previously open page on page open',function() {
            var onHide;
            
            onHide = jasmine.createSpy('onhide');
            
            pageView.addPage(testPage,null,null,onHide);
            pageView.addPage(otherPage1,null,null);
            pageView.addPage(otherPage2,null,null);
            
            pageView.gotoPage('testpage');
            pageView.gotoPage('otherpage-1');
            
            expect(onHide).toHaveBeenCalled();
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

        it('passes page to on-hide handler',function() {
            pageView.addPage(testPage,null,null,function(page) {
                page.received = true;
            });
            pageView.addPage(otherPage1);
            
            pageView.gotoPage('testpage');
            pageView.gotoPage('otherpage-1');

            expect(testPage.received).toBe(true);
        });

        it('knows currently open page\'s id',function() {
            pageView.addPage(testPage);

            pageView.gotoPage('testpage');

            expect(pageView.currentPageId).toEqual('testpage');
        });
    });
});
