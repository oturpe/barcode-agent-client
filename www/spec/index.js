describe('Logger',function() {
    it('sends prefixed log messages to given base logger',function() {
        var baseLogger = {
            log: function(message) {
                this.message = message
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
            values: {},
            setItem: function(key,value) {
                this.values[key] = value;
            },getItem: function(key) {
                return this.values[key];
            }
        };
        
        logger = {log: function() {}};
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
        var settings,value;
        
        settings = new app.Settings(logger,storage,{'foobar': 'default'});

        value = settings.getItem('foobar');

        expect(value).toEqual('default');
    });
    
    it('returns undefined if there is no default value',function() {
        var settings,value;
        
        settings = new app.Settings(logger,storage,{'foobar': 'default'});

        value = settings.getItem('no-default');

        expect(value).toBeUndefined();
    });
});

describe('PageView',function() {
    
    var pageView,testPage,otherPage1,otherPage2;
    
    beforeEach(function() {
        pageView = new app.PageView(nullLogger);
        testPage = { id: 'testpage', style: {}};
        otherPage1 = { id: 'otherpage-1', style: {}};
        otherPage2 = { id: 'otherpage-2', style: {}};
    });
    
    var nullLogger = { log: function() {} };
    it('invokes ondisplay handler on page open',function() {
        var handlerCalled = false;
        
        pageView.addPage(testPage,null,function() {handlerCalled = true;});
        
        pageView.gotoPage('testpage');
        
        expect(handlerCalled).toBe(true);
    });
    
    it('sets default (no-op) on-display handler if none is given',function() {
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
    
    it('passes page and the context object to on-display handler', function() {
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

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
describe('app',function() {
    describe('initialize',function() {
        it('should bind deviceready',function() {
            runs(function() {
                spyOn(app,'onDeviceReady');
                app.initialize();
                helper.trigger(window.document,'deviceready');
            });

            waitsFor(function() {
                return(app.onDeviceReady.calls.length > 0);
            },'onDeviceReady should be called once',500);

            runs(function() {
                expect(app.onDeviceReady).toHaveBeenCalled();
            });
        });
    });

    describe('onDeviceReady',function() {
        it('should report that it fired',function() {
            spyOn(app,'receivedEvent');
            app.onDeviceReady();
            expect(app.receivedEvent).toHaveBeenCalledWith('deviceready');
        });
    });

    describe('receivedEvent',function() {
        beforeEach(function() {
            var el = document.getElementById('stage');
            el.innerHTML = [
                    '<div id="deviceready">',
                    '    <p class="event listening">Listening</p>',
                    '    <p class="event received">Received</p>',
                    '</div>'
            ].join('\n');
        });

        it('should hide the listening element',function() {
            app.receivedEvent('deviceready');
            var displayStyle = helper
                    .getComputedStyle('#deviceready .listening','display');
            expect(displayStyle).toEqual('none');
        });

        it('should show the received element',function() {
            app.receivedEvent('deviceready');
            var displayStyle = helper
                    .getComputedStyle('#deviceready .received','display');
            expect(displayStyle).toEqual('block');
        });
    });
});
