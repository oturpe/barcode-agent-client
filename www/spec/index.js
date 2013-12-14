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

                var nullLogger, mockRenderer, pageView, testPageDom, otherPageDom1, otherPageDom2;

                nullLogger = {
                    log: function() {}
                };

                mockRenderer = {
                    render: jasmine.createSpy('renderer')
                };

                beforeEach(function() {
                    function mockPure() {
                        return mockRenderer;
                    }

                    pageView = new app.PageView(nullLogger,mockPure);
                    testPageDom = {
                        id: 'testpage',style: {}
                    };
                    otherPageDom1 = {
                        id: 'otherpage-1',style: {}
                    };
                    otherPageDom2 = {
                        id: 'otherpage-2',style: {}
                    };
                });

                it('adds plain pages',function() {
                    pageView.addPage(new app.Page(testPageDom.id));

                    expect(pageView.pages[testPageDom.id]).toBeTruthy();
                });

                it('invokes ondisplay handler on page open',function() {
                    var onDisplay, testPage, context;

                    context = {
                        a: 'a'
                    };

                    onDisplay = jasmine.createSpy('ondisplay');
                    testPage = new app.Page(testPageDom.id,
                                            testPageDom,
                                            null,
                                            onDisplay);
                    pageView.addPage(testPage);

                    pageView.gotoPage(testPageDom.id,context);

                    expect(onDisplay).toHaveBeenCalledWith(context);
                });

                it('renders template with give data on page open',
                    function() {
                        var testPage, template, context;

                        template = {
                            b: 'b'
                        };
                        context = {
                            a: 'a'
                        };

                        testPage = new app.Page(testPageDom.id,
                                                testPageDom,
                                                template);
                        pageView.addPage(testPage);
                        pageView.gotoPage(testPageDom.id,context);

                        expect(mockRenderer.render)
                                .toHaveBeenCalledWith(context,template);
                    });

                it('invokes onhide handler of the previous page on page open',
                    function() {
                        var onHide;

                        onHide = jasmine.createSpy('onhide');

                        pageView.addPage(new app.Page(testPageDom.id,
                                                      testPageDom,
                                                      null,
                                                      null,
                                                      onHide));
                        pageView.addPage(new app.Page(otherPageDom1.id,
                                                      otherPageDom1));
                        pageView.addPage(new app.Page(otherPageDom2.id,
                                                      otherPageDom2));

                        pageView.gotoPage(testPageDom.id);
                        pageView.gotoPage(otherPageDom1.id);

                        expect(onHide).toHaveBeenCalledWith(testPageDom.id);
                    });

                it('displays only selected page on page open',function() {
                    pageView.addPage(new app.Page(testPageDom.id,testPageDom));
                    pageView.addPage(new app.Page(otherPageDom1.id,
                                                  otherPageDom1));
                    pageView.addPage(new app.Page(otherPageDom2.id,
                                                  otherPageDom2));

                    pageView.gotoPage(otherPageDom1.id);
                    pageView.gotoPage(testPageDom.id);

                    expect(testPageDom.style.display).toEqual('block');
                    expect(otherPageDom1.style.display).not.toEqual('block');
                    expect(otherPageDom2.style.display).not.toEqual('block');
                });

                it('going to page updates current page',function() {
                    var testPage;

                    testPage = new app.Page(testPageDom.id,testPageDom);
                    pageView.addPage(testPage);

                    pageView.addPage(testPage);
                    pageView.gotoPage(testPageDom.id);

                    expect(pageView.currentPage).toEqual(testPage);
                });

                it('can go back to previous page',function() {
                    pageView.addPage(new app.Page(testPageDom.id,testPageDom));
                    pageView.addPage(new app.Page(otherPageDom1.id,
                                                  otherPageDom1));

                    pageView.gotoPage(testPageDom.id);
                    pageView.gotoPage(otherPageDom1.id);
                    pageView.gotoPreviousPage();

                    expect(testPageDom.style.display).toEqual('block');
                    expect(otherPageDom1.style.display).toEqual('none');
                });

                it('going to previous page updates current page',function() {
                    var testPage;

                    testPage = new app.Page(testPageDom.id,testPageDom);

                    pageView.addPage(testPage);
                    pageView.addPage(new app.Page(otherPageDom1.id,
                                                  otherPageDom1));

                    pageView.gotoPage(testPageDom.id);
                    pageView.gotoPage(otherPageDom1.id);
                    pageView.gotoPreviousPage();

                    expect(pageView.currentPage).toEqual(testPage);
                });

                it('going to previous page does not fire ondisplay events',
                    function() {
                        var onDisplay;

                        onDisplay = jasmine.createSpy('ondisplay');

                        pageView.addPage(new app.Page(testPageDom.id,
                                                      testPageDom,
                                                      null,
                                                      onDisplay));
                        pageView.addPage(new app.Page(otherPageDom1.id,
                                                      otherPageDom1));

                        pageView.gotoPage(testPageDom.id);
                        pageView.gotoPage(otherPageDom1.id);
                        pageView.gotoPreviousPage();

                        expect(onDisplay.calls.length).toEqual(1);
                    });

                it('going to previous page fires onhide events',function() {
                    var onHide;

                    onHide = jasmine.createSpy('onhide');

                    pageView.addPage(new app.Page(testPageDom.id,
                                                  testPageDom,
                                                  null,
                                                  onHide));
                    pageView.addPage(new app.Page(otherPageDom1.id,
                                                  otherPageDom1));

                    pageView.gotoPage(otherPageDom1.id);
                    pageView.gotoPage(testPageDom.id);
                    pageView.gotoPreviousPage();

                    expect(onHide.calls.length).toEqual(1);
                });

                // TODO: What should happen if we go to previous page twice, or
                // if there
                // is no previous page?
            });

        describe('DocumentPageExtractor',function() {
            var nullLogger, mockDocument, testPageDom;

            testPageDom = {
                id: 'testpage'
            };

            nullLogger = {
                log: function() {}
            };

            mockDocument = {
                querySelector: function(string) {
                    switch(string) {
                    case '#testpage':
                        return testPageDom;
                    }
                }
            };

            it('creates pages from document',function() {
                var extractor, template, onDisplay, onHide, page;

                extractor = new app.DocumentPageExtractor(nullLogger,
                                                          mockDocument);

                template = {
                    a: 'a'
                };
                onDisplay = function() {
                    return 1;
                };
                onHide = function() {
                    return 2;
                };

                page = extractor.extract(testPageDom.id,
                    template,
                    onDisplay,
                    onHide);

                // FIXME: More careful examination of call contents
                expect(page.id).toEqual(testPageDom.id);
                expect(page.template).toBe(template);
                expect(page.onDisplay).toBe(onDisplay);
                expect(page.onHide).toBe(onHide);
            });
        });
    });
