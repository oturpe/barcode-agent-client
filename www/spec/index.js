/*global describe,beforeEach,it,spyOn,runs,waitsFor,expect,jasmine,app */
describe('Barcode Agent',
    function() {
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
                expect(baseLogger.log)
                        .toHaveBeenCalledWith('PREFIX Testmessage');
            });

            it('sends notifications to both base logger and notifier',
                function() {
                    var logger, DELAY, expected;

                    logger = new app.Logger('PREFIX',baseLogger,notifier);
                    DELAY = app.Logger.DELAY;

                    spyOn(baseLogger,'log');
                    spyOn(notifier,'notify');

                    logger.notify(DELAY,'Testnotify');

                    expected = 'PREFIX [DELAY] Testnotify';

                    expect(baseLogger.log).toHaveBeenCalledWith(expected);
                    expect(notifier.notify).toHaveBeenCalledWith(DELAY,
                        'Testnotify');
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

        describe('Page',function() {
            var page, pageId, onDisplay, onHide;

            pageId = "testpage";

            it('sets default (no-op) on-display handler if none is given',
                function() {
                    page = new app.Page(pageId);

                    expect(page.onDisplay).toBeTruthy();
                });

            it('sets default (no-op) on-hide handler if none is given',
                function() {
                    page = new app.Page(pageId);

                    expect(page.onHide).toBeTruthy();
                });
        });

        describe('PageView',
            function() {

                var nullLogger, mockDocument, pageView, testPageMarkup, otherPage1Markup, otherPage2Markup;

                nullLogger = {
                    log: function() {}
                };

                // Mock for html document and pages contained within.
                mockDocument = {
                    querySelector: function(pageSelector) {
                        switch(pageSelector) {
                        case '#testpage':
                            return testPageMarkup;
                        case '#otherpage-1':
                            return otherPage1Markup;
                        case '#otherpage-2':
                            return otherPage2Markup;
                        }
                    }
                };

                beforeEach(function() {
                    pageView = new app.PageView(nullLogger,mockDocument);
                    testPageMarkup = {
                        id: 'testpage',style: {}
                    };
                    otherPage1Markup = {
                        id: 'otherpage-1',style: {}
                    };
                    otherPage2Markup = {
                        id: 'otherpage-2',style: {}
                    };
                });

                it('invokes ondisplay handler on page open',function() {
                    var onDisplay, testPage, context;

                    context = {
                        a: 'a'
                    };

                    onDisplay = jasmine.createSpy('ondisplay');
                    testPage = new app.Page(testPageMarkup.id,onDisplay);
                    pageView.addPage(testPage);

                    pageView.gotoPage(testPageMarkup.id,context);

                    expect(onDisplay).toHaveBeenCalledWith(testPageMarkup.id,
                        context);
                });

                it('invokes onhide handler of the previous page on page open',
                    function() {
                        var onHide;

                        onHide = jasmine.createSpy('onhide');

                        pageView.addPage(new app.Page(testPageMarkup.id,
                                                      null,
                                                      onHide));
                        pageView.addPage(new app.Page(otherPage1Markup.id));
                        pageView.addPage(otherPage2Markup.id);

                        pageView.gotoPage(testPageMarkup.id);
                        pageView.gotoPage(otherPage1Markup.id);

                        expect(onHide).toHaveBeenCalledWith(testPageMarkup.id);
                    });

                it('displays only selected page on page open',
                    function() {
                        pageView.addPage(new app.Page(testPageMarkup.id));
                        pageView.addPage(new app.Page(otherPage1Markup.id));
                        pageView.addPage(new app.Page(otherPage2Markup.id));

                        pageView.gotoPage(otherPage1Markup.id);
                        pageView.gotoPage(testPageMarkup.id);

                        expect(testPageMarkup.style.display).toEqual('block');
                        expect(otherPage1Markup.style.display).not
                                .toEqual('block');
                        expect(otherPage2Markup.style.display).not
                                .toEqual('block');
                    });

                it('going to page updates current page id',function() {
                    pageView.addPage(new app.Page(testPageMarkup.id));

                    pageView.gotoPage(testPageMarkup.id);

                    expect(pageView.currentPageId).toEqual(testPageMarkup.id);
                });

                it('can go back to previous page',function() {
                    pageView.addPage(new app.Page(testPageMarkup.id));
                    pageView.addPage(new app.Page(otherPage1Markup.id));

                    pageView.gotoPage(testPageMarkup.id);
                    pageView.gotoPage(otherPage1Markup.id);
                    pageView.previousPage();

                    expect(testPageMarkup.style.display).toEqual('block');
                    expect(otherPage1Markup.style.display).toEqual('none');
                });

                it('going to previous page updates current page id',function() {
                    pageView.addPage(new app.Page(testPageMarkup.id));
                    pageView.addPage(new app.Page(otherPage1Markup.id));

                    pageView.gotoPage(testPageMarkup.id);
                    pageView.gotoPage(otherPage1Markup.id);
                    pageView.previousPage();

                    expect(pageView.currentPageId).toEqual(testPageMarkup.id);
                });

                it('going to previous page does not fire ondisplay events',
                    function() {
                        var onDisplay;

                        onDisplay = jasmine.createSpy('ondisplay');

                        pageView.addPage(new app.Page(testPageMarkup.id,
                                                      onDisplay));
                        pageView.addPage(new app.Page(otherPage1Markup.id));

                        pageView.gotoPage(testPageMarkup.id);
                        pageView.gotoPage(otherPage1Markup.id);
                        pageView.previousPage();

                        expect(onDisplay.calls.length).toEqual(1);
                    });

                it('going to previous page fires onhide events',
                    function() {
                        var onHide;

                        onHide = jasmine.createSpy('onhide');

                        pageView.addPage(new app.Page(testPageMarkup.id,
                                                      null,
                                                      onHide));
                        pageView.addPage(new app.Page(otherPage1Markup.id));

                        pageView.gotoPage(otherPage1Markup.id);
                        pageView.gotoPage(testPageMarkup.id);
                        pageView.previousPage();

                        expect(onHide.calls.length).toEqual(1);
                    });

                // TODO: What should happen if we go to previous page twice, or
                // if there
                // is no previous page?
            });
    });
