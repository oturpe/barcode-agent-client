/*global define*/

// Utilities for working with server connection.
define([], function() {
    'use strict';

    var exports = {};

    // Creates url-encoded string from given object, suitable for http
    // get and post queries.
    function toQueryString(obj) {
        var query = '';

        var keys = Object.keys(obj);
        var length = keys.length;

        var key;
        for(var i = 0; i < length; i += 1) {
            key = keys[i];

            if(i > 0) {
                query += '&';
            }

            query += key + '=' + encodeURIComponent(obj[key]);
        }

        return query;
    }

    exports.toQueryString = toQueryString;

    // Cleans given object from internal notation originating from MongoDb used
    // to store the data. Cleaning is performed in-place by modifying the given
    // object.
    //
    // The following cleanup actions are performed:
    //
    // 1. Rename member named '_id' to 'id'. This is not done if 'id' already
    //    exists.
    //
    // Cleanup is recursive, so any members of object to be cleaned are cleaned
    // as well.
    function cleanMongoInternals(mongoObject) {
        if(!mongoObject || typeof mongoObject === 'string') {
            return;
        }

        if(mongoObject._id !== undefined) {
            if(mongoObject.id === undefined) {
                mongoObject.id = mongoObject._id;
                delete mongoObject._id;
            } else {
                // TODO: Some kind of warning if this happens?
            }
        }

        for (var member in mongoObject) {
            if(!mongoObject.hasOwnProperty(member)) {
                continue;
            }

            cleanMongoInternals(mongoObject[member]);
        }
    }

    exports.cleanMongoInternals = cleanMongoInternals;

    // Given an response text string, parses it as json object and cleans
    // Mongo internals of the resulting object.
    function readMongoResponse(mongoResponse) {
        // TODO: Unit test this, has been problematic!
        var mongoObject = JSON.parse(mongoResponse);

        cleanMongoInternals(mongoObject);

        return mongoObject;
    }

    exports.readMongoResponse = readMongoResponse;

    return exports;
});