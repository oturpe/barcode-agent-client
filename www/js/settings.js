// Settings container for Barcode Agent client.
//
// Settings are collection of key-value pairs. They can be stored in any
// storage that can be interfaced with 'setItem' and 'getItem', expected to be
// localStorage. They also accept default values which are returned in case no
// value is given explicitly.
// 
// This module returns Settings object constructor.
define([],function() {
    'use strict';
    
    var Settings;
    
    // Application settings constructor.
    //
    // Thin wrapper around localStorage, providing defaults for missing
    // values.
    //
    // Depends on a logger.
    Settings = function(logger,storage,defaults) {
        this.logger = logger;
        this.storage = storage;
        // Default values for item missing from store.
        this.defaults = defaults || {};

        return this;
    };

    Settings.prototype = {
        // Stores value
        setItem: function(key,value) {
            this.storage.setItem(key,value);
        },
        // Returns stored value of given key, or default value if none
        // exists.
        getItem: function(key) {
            var value;

            value = this.storage.getItem(key);
            this.logger.log('Accessing storage: ' + key + ': ' + value);

            return value ? value : this.defaults[key];
        }
    };

    return Settings;
});
