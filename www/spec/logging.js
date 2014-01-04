/*global describe, beforeEach, it, spyOn, expect */

define(['js/logging','jasmine/jasmine'],function(logging) {
    'use strict';

    describe('logging',function() {
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

            it('sends prefixed log messages to base logger',function() {
                var logger = new logging.Logger('PREFIX',baseLogger);

                spyOn(baseLogger,'log');

                logger.log('Testmessage');
                expect(baseLogger.log)
                        .toHaveBeenCalledWith('PREFIX Testmessage');
            });

            var desc = 'sends notifications to both base logger and notifier';
            it(desc,function() {
                var logger, DELAY, expected;

                logger = new logging.Logger('PREFIX',baseLogger,notifier);
                DELAY = logging.statusCodes.DELAY;

                spyOn(baseLogger,'log');
                spyOn(notifier,'notify');

                logger.notify(DELAY,'Testnotify');

                expected = 'PREFIX [DELAY] Testnotify';

                expect(baseLogger.log).toHaveBeenCalledWith(expected);
                expect(notifier.notify).toHaveBeenCalledWith(DELAY,
                                                             'Testnotify');
            });
        });
    });
});
