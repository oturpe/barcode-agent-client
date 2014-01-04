/*global define*/

// Pages for Barcode Agent client.
//
// A page is a single view to be presented to the user, either fitting to one
// screen or to be scrolled. In dom, it is a div with class 'page'. If page has
// dynamic content, it is generated using a Pure template associated with the
// page. This template is called a page content element,which is a div with
// class 'pagecontent' inside the page. Is is needed because
// Pure templating removes and re-creates them template element when rendering,
// but other parts of UI code expect the page itself to retain its identity.
// The solution to this problem is that page is never removed from dom after
// creation, but it only acts as a wrapper for page content which can be
// replaced.
//
// Note that page's content element is found using method 'contentSelector'.
// Currently, classes 'page' and 'pagecontent' are not used at all.
//
// Pages are controlled by a page view. Any page used within the application
// should be registered with a page view. The view displays a single page at a
// time. If the page has a Pure template, page content is created using the
// template at display time. Custom handlers to be fired upon display or hide of
// a page can be registered, too. The on-display handlers are primarily used
// to attach various dom events to elements within the page. On-hide events are
// not normally needed.
//
// In addition to a page, user may see some additional elements that do not
// classify as page themselves, such as navigation bar, status indicator and
// title. These are not under control of a page view and are currently handled
// in ad-hoc way.
//
// This module also contains utility class DocumentPageExtractor, used to create
// page objects given dom id of the page element.
define(['js/logging'],function(logging) {
    'use strict';

    var exports = {};

    // Create selector for choosing page content dom element. If page is named
    // 'examplepage', then its content element's id is 'examplepagecontent'.
    function contentSelector(pageId) {
        return '#' + pageId + 'content';
    }

    exports.contentSelector = contentSelector;
    
    // A single page of the application.
    //
    // Contains page id, dom page reference, html template and on-display
    // and
    // on-hide handlers.
    //
    // Default for both handlers is no-op. Falsy template indicates that no
    // template rendering is to be performed.

    // TODO: add onDisplay,onHide and template using a method.
    var Page = function(id,domPage,template,onDisplay,onHide) {
        this.id = id;

        // FIXME: domPage is mandatory. What to do if it is missing?

        this.domPage = domPage;
        this.template = template;
        this.onDisplay = onDisplay || function() {};
        this.onHide = onHide || function() {};
    };

    exports.Page = Page;
    
    // Contains all pages within one virtual page and allows switching
    // between
    // them.
    //
    // Input is logger for logging and PURE.js renderer for page templates.
    var PageView = function(logger,renderer) {
        this.logger = logger;
        this.renderer = renderer;

        this.pages = {};

        this.currentPage = undefined;
        this.previousPage = undefined;
    };

    // Adds page to the list of registered pages and associates given
    // on-display and on-hide handlers with it.
    //
    // Assumes responsibility for viewing and hiding the page, hiding it
    // initially. To show the page, see method gotoPage.
    PageView.prototype.addPage = function(page) {
        this.logger.log('Added page ' + page.id + ' to page list');
        this.pages[page.id] = page;
    };

    // Switches virtual page within the single page model. Context
    // parameter
    // is a JS object containing page-specific initialization data.

    // The specific actions performed by this method are:
    // 1. Adjusting display values of page elements so that only the new
    // page remains visible.
    // 2. Rendering new page's content from page template.
    // 3. Calling on-display and on-hide handlers of the pages.
    // 4. Updating current and previous page member variables.
    //
    // Page to be opened is referred to by its id.
    PageView.prototype.gotoPage = function(newPageId,context) {
        var newPage;

        newPage = this.pages[newPageId];

        if(newPage === undefined) {
            this.logger.log('ERROR: ' +
                            'Cannot open page with unknown page id: ' +
                            newPageId);
            return;
        }

        this.logger.log('Opening page with id ' + newPageId);

        // No current page when the first page is opened
        if(this.currentPage) {
            this.currentPage.onHide(this.currentPage.id);
        }

        if(newPage.template) {
            this.renderer(contentSelector(newPage.id))
                    .render(context,newPage.template);
        }
        newPage.onDisplay(context);

        this.changeDisplay(this.currentPage,newPage);

        this.previousPage = this.currentPage;
        this.currentPage = newPage;
    };

    // Displays the page that was visible before current page. This method
    // functions like gotoPage. Note that it is not possible to go to
    // previous page again from the opened page. Essentially, the
    // history is one page long and this method does not update it.
    //
    // Note that on-hide handler of hidden page is called, but on-display
    // of opened (previous) page is not called, nor is it templated as it
    // is expected that the page is still in the state where it was when it
    // was closed.
    PageView.prototype.gotoPreviousPage = function() {
        this.logger.log('Going back to page with id ' +
                        this.previousPage.id);

        this.currentPage.onHide(this.currentPage.id);

        this.changeDisplay(this.currentPage,this.previousPage);

        this.currentPage = this.previousPage;
        this.previousPage = null;
    };

    // Utility for changing display values of both current and new page.
    PageView.prototype.changeDisplay = function(currentPage,newPage) {
        if(currentPage) {
            currentPage.domPage.style.display = 'none';
        }

        newPage.domPage.style.display = 'block';
    };

    exports.PageView = PageView;

    // Extracts pages from dom tree
    var DocumentPageExtractor = function(logger,document) {
        this.logger = logger;
        this.document = document;
    };

    // Given id, extracts that page from document and returns a Page object
    // that has given on-display and on-hide handlers registered. If page
    // is not found in document, logs a warning and returns null.
    DocumentPageExtractor.prototype.extract = function(id,
                                                       template,
                                                       onDisplay,
                                                       onHide) {
        var domPage;

        domPage = this.document.querySelector('#' + id);

        if(!domPage) {
            this.logger.log('Did not find page with id ' +
                            id +
                            ' in document.');
            return null;
        }

        return new Page(id,domPage,template,onDisplay,onHide);
    };

    exports.DocumentPageExtractor = DocumentPageExtractor;

    return exports;
});
