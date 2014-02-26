/*global define, describe, it, expect*/

define(['js/server-utils','jasmine/jasmine'], function (utils) {
    'use strict';

    var desc;
    describe('server-utils', function () {
        describe('cleanMongoInternals', function () {

            desc = 'renames \'_id\' to \'id\'';
            it(desc, function () {
                var object = {_id: 55, _di: 12};
                utils.cleanMongoInternals(object);

                expect(object).toEqual({id: 55, _di: 12});
            });

            desc = 'does not end in endess recursion when meets ' +
                   'string-valued properties';
            it(desc, function () {
                var object = {prop: 'value'};
                utils.cleanMongoInternals(object);

                expect(object).toEqual({prop: 'value'});
            });

            desc = 'renames \'_id\' recursively';
            it(desc, function () {
                var object = {
                    _id: 55,
                    subarray: [
                        {_id: 1},
                        {subsub: {idd: 2, _id: 'abc'}}
                    ]
                };
                utils.cleanMongoInternals(object);

                expect(object).toEqual({
                    id: 55,
                    subarray: [
                        {id: 1},
                        {subsub: {idd: 2, id: 'abc'}}
                    ]
                });
            });
        });
    });
});