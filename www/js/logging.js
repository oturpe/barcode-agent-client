// Logging for Barcode Agent client.
//
// Logging supports two different channels: log and notifications. The logger
// forwards all messages to base log with optional prefix showing the source
// of messages. In addition to log, logger can refer to a notifier, a UI
// component for displaying application messages to user.
define([],function() {
    'use strict';

    var exports;

    exports = {};

    // Logger constructor
    //
    // Component for logging and notification.
    exports.Logger = function(prefix,baseLogger,notifier) {
        this.prefix = prefix || '';
        this.baseLogger = baseLogger;
        this.notifier = notifier;

        return this;
    };

    exports.Logger.prototype = {
        // Silently logs given message
        log: function(message) {
            this.baseLogger.log(this.prefix + ' ' + message);
        },
        // Logs given notification and displays it to the user. The type
        // parameter is expected to be one of enumerated status values.
        notify: function(type,message) {
            this.log('[' + type + '] ' + message);
            this.notifier.notify(type,message);
        }
    };

    // Notification types: information, error condition, operation underway
    exports.status = {
        INFO: 'INFO',ERROR: 'ERROR',DELAY: 'DELAY'
    };

    return exports;
});
