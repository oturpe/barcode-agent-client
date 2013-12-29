/*global define, describe, beforeEach, it, spyOn, expect */

// Unit tests for settings module
define(['js/settings'],function(Settings) {
    'use strict';

    describe('settings',function() {
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
                var settings = new Settings(logger,storage);
                spyOn(storage,'getItem');

                settings.getItem('foobar');

                expect(storage.getItem).toHaveBeenCalledWith('foobar');
            });

            it('forwards set requests to underlying storage',function() {
                var settings = new Settings(logger,storage);
                spyOn(storage,'setItem');

                settings.setItem('foobar',12);

                expect(storage.setItem).toHaveBeenCalledWith('foobar',12);
            });

            it('returns default values for missing keys',function() {
                var settings, value;

                settings = new Settings(logger,storage,{
                    'foobar': 'default'
                });

                value = settings.getItem('foobar');

                expect(value).toEqual('default');
            });

            it('returns undefined if there is no default value',function() {
                var settings, value;

                settings = new Settings(logger,storage,{
                    'foobar': 'default'
                });

                value = settings.getItem('no-default');

                expect(value).toBeUndefined();
            });
        });
    });
});
