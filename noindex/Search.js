'use strict';

var server = require('server');
server.extend(module.superModule);

/** script module */
var refineSearch = require('*/cartridge/models/bopis/refineSearch');
var preferences = require('*/cartridge/config/hudsonPreferences');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var cache = require('*/cartridge/scripts/middleware/cache');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');


var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var ACTION_HOME = 'Home-Show';

var SEARCH_SHOWAJAX = 'Search-ShowAjax';
var TOTAL_PAGE_SIZE = preferences.getTotalPageSize();
var LOAD_PAGE_SIZE = preferences.getDefaultPageSize();
var ACTION_REFINEMENT = 'Stores-ShowStoreRefinement';

server.extend(module.superModule);

server.replace('ShowAjax', cache.applyShortPromotionSensitiveCache, consentTracking.consent, function (req, res, next) {
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    var refinementActionUrl = 'Search-ShowAjax';
    var breadcrumbs;
    var hasBrand = req.querystring.preferences && req.querystring.preferences.brand;
    var isSale = req.querystring.preferences && req.querystring.preferences.isSale;
    var isClearance = req.querystring.preferences && req.querystring.preferences.isClearance;
    var isThematicPage = req.querystring.isThematicPage || false;
    var thematicData = {};
    let refinementTitle = '';
    var doNotReset = req.querystring && req.querystring.doNotReset;
    var brandMetaTag = {};

    var tempLocaleFlag = false;
    var loc = res.viewData && res.viewData.locale;
    if (loc.indexOf('fr_CA') > -1) {
        req.setLocale('en_CA');
        tempLocaleFlag = true;
    }
    if (tempLocaleFlag) {
        req.setLocale('fr_CA');
        tempLocaleFlag = false;
    }
    var cookiesHelper = require('*/cartridge/scripts/helpers/cookieHelpers');
    var custID = cookiesHelper.read('citus_cid');
    var sessionID= cookiesHelper.read('citrus_sid');
    var requestCookie = req.httpHeaders.get(Object('cookie'));
    var MCMID = '';
    if(sessionID){
        MCMID = sessionID
    }
    else if (requestCookie) {
        var isSessionCookie = !!(requestCookie.match(/(^|;)\s*((AMCV_)[^=|\s]*)\s*=\s*([^;]+)/));
        var citrusSessionId = isSessionCookie ? requestCookie.match(/(^|;)\s*((AMCV_)[^=|\s]*)\s*=\s*([^;]+)/).pop() : '';
        MCMID = decodeURIComponent(citrusSessionId);
        MCMID = MCMID.match(/(MCMID\|).*?\|/) ? MCMID.match(/(MCMID\|).*?\|/)[0].split('MCMID|').pop().replace('|', '')
                        : requestCookie.split('=')[1].substring(0, 38);
    }
    var templateAndFilters = searchHelper.getTemplateAndFilters(req,res,tempLocaleFlag);
    var template = templateAndFilters[0];
    var filters = templateAndFilters[1];

    // Sponsored products from Citrus
    var citrusToggle = preferences.getCitrus();
    if (require('*/cartridge/config/hudsonPreferences').isEverydayEnabled()) {
        citrusToggle = citrusToggle && session.custom.currentSite !== Resource.msg('CONSTANT.SITE.NAME.EVERYDAY', 'constants', null);
    }
    var sponsoredProducts = [];
    if (citrusToggle) {
        sponsoredProducts = searchHelper.getCitrusSponsoredProducts(req, res, template, filters, MCMID, custID);
    }
    var result = searchHelper.search(req, res, null, sponsoredProducts);
    if (result.tempCategory && result.tempCategory.ID !== 'root') {
        pageMetaHelper.setPageMetaData(req.pageMetaData, result.productSearch);
        pageMetaHelper.setPageMetaTags(req.pageMetaData, result.productSearch);
    }
    if (result.searchRedirect) {
        res.redirect(result.searchRedirect);
        return next();
    }
    var productSearch = result.productSearch;
    var renderingTemplate = 'search/searchResultsNoDecorator';
    if (productSearch.isCategorySearch && !productSearch.isRefinedCategorySearch && result.categoryTemplate) {
        renderingTemplate = result.categoryTemplate;
    }
    var totalBlocks = Math.ceil(TOTAL_PAGE_SIZE / LOAD_PAGE_SIZE);
    var currentPage = productSearch.pageNumber + 1;
    var showPreviousPage = (currentPage === totalBlocks * Math.ceil(currentPage / totalBlocks)) ? true : (!!(currentPage < (totalBlocks * Math.ceil(currentPage / totalBlocks)) && currentPage > ((totalBlocks * Math.floor(currentPage / totalBlocks)) + 1)));
    // prepare store refinement url loaded as url include in template
    var storeRefineUrl = refineSearch.getStoreRefinementUrl(req, ACTION_REFINEMENT);
    // url to reset and execute the search form the store select
    var storeRefineUrlForCheckBox = refineSearch.getStoreRefinementUrl(req, refinementActionUrl);

    // designer category changes
    if (result.category && result.category.ID === 'root' && !(isSale || isClearance)) {
        var alphaNums = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];
        designerObject.results = searchHelper.searchDesigner(productSearch);
        designerObject.alphaNums = alphaNums;
    }

    if (req.querystring && req.querystring.preferences && req.querystring.preferences['brand'] && req.querystring.cgid) { // eslint-disable-line
        // req.querystring.preferences['brand'] does not work in dot notation
        breadcrumbs = [];

        if (req.querystring.cgid !== 'brand' && req.querystring.cgid !== 'root') {
            breadcrumbs = productHelper.getAllBreadcrumbs(
                req.querystring.cgid,
                null,
                breadcrumbs
            );
        }

        if (isSale !== undefined) {
            var saleCategory = CatalogMgr.getCategory(preferences.getSaleCategoryID());
            if (saleCategory) {
                saleCatDisplayName = saleCategory.displayName;
                breadcrumbs.push({
                    htmlValue: saleCategory.displayName, // eslint-disable-line
                    url: searchHelper.getCategoryUrl(saleCategory)
                });
            }
        }

        if (isClearance !== undefined) {
            var clearanceCategory = CatalogMgr.getCategory(preferences.getClearanceCategoryID());
            if (clearanceCategory) {
                clearanceCatDisplayName = clearanceCategory.displayName;
                breadcrumbs.push({
                    htmlValue: clearanceCategory.displayName, // eslint-disable-line
                    url: searchHelper.getCategoryUrl(clearanceCategory)
                });
            }
        }

        if (req.querystring.preferences['brand'].indexOf('|') === -1) { // eslint-disable-line
            breadcrumbs.push({
                htmlValue: req.querystring.preferences['brand'], // eslint-disable-line
                url: URLUtils.https('Search-Show', 'cgid', 'brand', 'prefn1', 'brand', 'prefv1', hasBrand)
            });
        }

        breadcrumbs.push({
            htmlValue: Resource.msg('label.search.home', 'search', null),
            url: URLUtils.url(ACTION_HOME)
        });
        breadcrumbs.reverse();
    } else if (req.querystring && req.querystring.preferences && req.querystring.preferences.isSale && req.querystring.cgid != preferences.getSaleCategoryID()) {
        breadcrumbs = [];

        if (req.querystring.cgid !== 'brand' && req.querystring.cgid !== 'root') {
            breadcrumbs = productHelper.getAllBreadcrumbs(
                req.querystring.cgid,
                null,
                breadcrumbs
            );
        }
        var saleCategory = CatalogMgr.getCategory(preferences.getSaleCategoryID());
        if (saleCategory) {
            saleCatDisplayName = saleCategory.displayName;
            breadcrumbs.push({
                htmlValue: saleCategory.displayName, // eslint-disable-line
                url: searchHelper.getCategoryUrl(saleCategory)
            });
        }

        breadcrumbs.push({
            htmlValue: Resource.msg('label.search.home', 'search', null),
            url: URLUtils.url(ACTION_HOME)
        });
        breadcrumbs.reverse();
    } else if (req.querystring && req.querystring.preferences && req.querystring.preferences.isClearance && req.querystring.cgid != preferences.getClearanceCategoryID()) {
        breadcrumbs = [];

        if (req.querystring.cgid !== 'brand' && req.querystring.cgid !== 'root') {
            breadcrumbs = productHelper.getAllBreadcrumbs(
                req.querystring.cgid,
                null,
                breadcrumbs
            );
        }
        var clearanceCategory = CatalogMgr.getCategory(preferences.getClearanceCategoryID());
        if (clearanceCategory) {
            clearanceCatDisplayName = clearanceCategory.displayName;
            breadcrumbs.push({
                htmlValue: clearanceCategory.displayName, // eslint-disable-line
                url: searchHelper.getCategoryUrl(clearanceCategory)
            });
        }

        breadcrumbs.push({
            htmlValue: Resource.msg('label.search.home', 'search', null),
            url: URLUtils.url(ACTION_HOME)
        });
        breadcrumbs.reverse();
    } else if (productSearch.category) {
        var categoryId = productSearch.category.id;
        breadcrumbs = productHelper.getAllBreadcrumbs(
            categoryId,
            null,
            []
        );
        breadcrumbs.push({
            htmlValue: Resource.msg('label.search.home', 'search', null),
            url: URLUtils.url(ACTION_HOME)
        });
        breadcrumbs.reverse();
    } else if (productSearch.searchKeywords) {
        breadcrumbs = productHelper.getAllBreadcrumbs(null, null, [{
            htmlValue: Resource.msg('label.search.home', 'search', null),
            url: URLUtils.url(ACTION_HOME)
        },
        {
            htmlValue: Resource.msg('label.search.all.results', 'search', null),
            url: null
        }
        ]);
    }

    var citrusCategoryTemplate = productSearch.isCategorySearch ? 'categoryTemplate' : renderingTemplate;
    result.productSearch = searchHelper.addSponsoredProductsToSearch(req, res, productSearch, null, citrusCategoryTemplate,sponsoredProducts);
    productSearch = result.productSearch;

    let queryString = req.querystring;
    let whitelistedParams = ['pmin', 'cgid', 'pmax', 'srule', 'pmid', 'storeid', 'q'];
    let historyUrlParams = [];
    if (!empty(queryString)) {
        Object.keys(queryString).forEach(function (element) {
            if (whitelistedParams.indexOf(element) > -1) {
                historyUrlParams.push(element);
                historyUrlParams.push(queryString[element]);
            }
            if (element === 'preferences') {
                var i = 1;
                Object.keys(queryString[element]).forEach(function (preference) {
                    historyUrlParams.push('prefn' + i);
                    historyUrlParams.push(preference);
                    historyUrlParams.push('prefv' + i);
                    historyUrlParams.push(queryString[element][preference]);
                    i++;
                });
            }
        });
    }
    let historyUrl = URLUtils.url('Search-Show', historyUrlParams);
    var refinementObject = {};
    var ismultiValueSelected = false;
   productSearch.refinements.forEach(function(refinement){
    if (refinement.displayName === "Colour" || refinement.displayName === "Type" || refinement.displayName === "Style" || refinement.displayName ==="Brand") {
        refinement.values.forEach(function (value) {
            if (value.selected) {
                refinementObject[refinement.displayName] = ( refinementObject[refinement.displayName] || 0 ) + 1;
            }
        })
    }
   })

   Object.keys(refinementObject).forEach(function (key) {
        if (refinementObject[key] > 1) {
            ismultiValueSelected = true;
        }
   })

    res.render(renderingTemplate, {
        breadcrumbs: breadcrumbs,
        category: result.category ? result.category : result.tempCategory,
        hasBrandRefinement: !!hasBrand,
        brandValue: hasBrand || '',
        isSale: isSale,
        isClearance: isClearance,
        ajax: true,
        showPreviousPage: showPreviousPage,
        showMore: currentPage <= (totalBlocks * Math.ceil(currentPage / totalBlocks)),
        startSize: req.querystring.start ? req.querystring.start : '',
        storeRefineUrl: storeRefineUrl,
        productSearch: productSearch,
        ismultiValueSelected:ismultiValueSelected,
        maxSlots: result.maxSlots,
        reportingURLs: result.reportingURLs,
        refineurl: result.refineurl,
        isRefinedByStore: result.isRefinedByStore,
        isBopisEnabled: preferences.getIsBopisEnabled(),
        storeRefineUrlForCheckBox: storeRefineUrlForCheckBox,
        historyUrl: historyUrl
    });

    return next();
}, pageMetaData.computedPageMetaData);



server.replace('UpdateGrid', cache.applyShortPromotionSensitiveCache, function (req, res, next) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var ProductSearch = require('*/cartridge/models/search/productSearch');

    var apiProductSearch = new ProductSearchModel();
    apiProductSearch = searchHelper.setupSearch(apiProductSearch, req.querystring);
    var viewData = {
        apiProductSearch: apiProductSearch
    };

    res.setViewData(viewData);

    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        // execute custom search and return the search model
        var storeRefineResult = refineSearch.search(apiProductSearch, req.querystring);
        apiProductsearch = storeRefineResult.apiProductsearch; // eslint-disable-line

        if (!apiProductSearch.personalizedSort) {
            searchHelper.applyCache(res);
        }
            var productSearch = new ProductSearch(
                apiProductSearch,
                req.querystring,
                req.querystring.srule,
                CatalogMgr.getSortingOptions(),
                CatalogMgr.getSiteCatalog().getRoot(),null
            ); 
    
        var totalBlocks = Math.ceil(TOTAL_PAGE_SIZE / LOAD_PAGE_SIZE);
        var currentPage = productSearch.pageNumber;
        var showPreviousPage = !!(currentPage < (totalBlocks * Math.ceil(currentPage / totalBlocks)) && currentPage > (totalBlocks * Math.floor(currentPage / totalBlocks)));
       
        // SFDEV-2503 || Fix for Gift card PLP ajax loading product grid count
        var template = 'search/components/categoryProductGrid';
        if (productSearch.category != null && productSearch.category.template === 'rendering/category/producthitsgiftcards') {
            template = 'search/productGiftGrid';
        }
        res.render(template, {
            productSearch: productSearch,
            startSize: req.querystring.start ? req.querystring.start : '',
            // eslint-disable-next-line no-nested-ternary
            showMore: (req.querystring.showMore || req.querystring.previous) ? (currentPage === (totalBlocks * Math.ceil(currentPage / totalBlocks)) ? false : !req.querystring.previous) : true,
            showPreviousPage: showPreviousPage && !!req.querystring.previous && !req.querystring.showMore
        });
    });

    next();
});

// eslint-disable-next-line consistent-return
server.replace('Show', cache.applySearchShowCache, consentTracking.consent, function (req, res, next) {

    var ProductSearchModel = require('dw/catalog/ProductSearchModel');
    var ContentMgr = require('dw/content/ContentMgr');

    var apiProductSearch = new ProductSearchModel();
    var viewData = {
        apiProductSearch: apiProductSearch
    };
    res.setViewData(viewData);
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');

    // set store search url
    var storeRefineUrl = refineSearch.getStoreRefinementUrl(req, ACTION_REFINEMENT);
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');

    // apply all selected refinements to the filters being sent to Citrus in the request body
    let citrusConstants = require('*/cartridge/citrusConstants');
    var citrusFilterNames = citrusConstants.FilterNames;
    var cookiesHelper = require('*/cartridge/scripts/helpers/cookieHelpers');
    var loc = res.viewData && res.viewData.locale;
    var custID = cookiesHelper.read('citus_cid');
    var sessionID = cookiesHelper.read('citrus_sid');
    var requestCookie = req.httpHeaders.get(Object('cookie'));
    var MCMID = '';
        if(sessionID){
            MCMID = sessionID;
        } else if (requestCookie) {
            var isSessionCookie = !!(requestCookie.match(/(^|;)\s*((AMCV_)[^=|\s]*)\s*=\s*([^;]+)/));
            var citrusSessionId = isSessionCookie ? requestCookie.match(/(^|;)\s*((AMCV_)[^=|\s]*)\s*=\s*([^;]+)/).pop() : '';
            MCMID = decodeURIComponent(citrusSessionId);
            MCMID = MCMID.match(/(MCMID\|).*?\|/) ? MCMID.match(/(MCMID\|).*?\|/)[0].split('MCMID|').pop().replace('|', '')
                        : requestCookie.split('=')[1].substring(0, 38);
        }

    var tempLocaleFlag = false;
    if (loc.indexOf('fr_CA') > -1) {
        req.setLocale('en_CA');
        tempLocaleFlag = true;
    }

    if (tempLocaleFlag) {
        req.setLocale('fr_CA');
        tempLocaleFlag = false;
    }

    var templateAndFilters = searchHelper.getTemplateAndFilters(req,res,tempLocaleFlag);
    var template = templateAndFilters[0];
    var filters = templateAndFilters[1];

    // Sponsored products from Citrus
    var citrusToggle = preferences.getCitrus();
    if (require('*/cartridge/config/hudsonPreferences').isEverydayEnabled()) {
        citrusToggle = citrusToggle && session.custom.currentSite !== Resource.msg('CONSTANT.SITE.NAME.EVERYDAY', 'constants', null);
    }
    var sponsoredProducts = [];
    if (citrusToggle) {
        sponsoredProducts =searchHelper.getCitrusSponsoredProducts(req, res, template, filters, MCMID, custID);
    }

    var renderNoIndexTag = (function () {
        var httpParametersKeys = request.httpParameters.keySet().toArray();
        var isSortingParameter = httpParametersKeys.indexOf('srule') > -1;
        var currentPreferences = httpParametersKeys.filter(function (key) {
            return key.indexOf('prefn') > -1;
        });

        return currentPreferences.length > 1 || isSortingParameter;
    }());

    var result = searchHelper.search(req, res,null,sponsoredProducts);
    var Site = require('dw/system/Site');
    var siteName = Site.getCurrent().getName();
    var hasBrand = req.querystring.preferences && req.querystring.preferences.brand;
    var isSale = req.querystring.preferences && req.querystring.preferences.isSale;
    var isClearance = req.querystring.preferences && req.querystring.preferences.isClearance;
    var isThematicPage = req.querystring.isThematicPage || false;
    var isPLPPage = true;
    var thematicData = {};
    let refinementTitle = '';
    var doNotReset = req.querystring && req.querystring.doNotReset;
    var brandMetaTag = {};
    if (!!hasBrand) { // eslint-disable-line
        if (result.tempCategory && result.tempCategory.ID !== 'root') {
            pageMetaHelper.setPageMetaData(req.pageMetaData, result.productSearch);
            pageMetaHelper.setPageMetaTags(req.pageMetaData, result.productSearch);
        } else {
            brandMetaTag.pageTitle = req.querystring.preferences.brand + ' | ' + siteName; // eslint-disable-line
            brandMetaTag.pageDescription = brandMetaTag.pageTitle;
            brandMetaTag.keywords = brandMetaTag.pageTitle;
        }
        pageMetaHelper.setPageMetaData(req.pageMetaData, brandMetaTag);
        pageMetaHelper.setPageMetaTags(req.pageMetaData, brandMetaTag);
    } else if (result.category && result.category.ID == 'root') {
        var designerSEO = ContentMgr.getContent('seo-designer');
        if (designerSEO) {
            pageMetaHelper.setPageMetaData(req.pageMetaData, designerSEO);
            pageMetaHelper.setPageMetaTags(req.pageMetaData, designerSEO);
        }
    } else if (!empty(req.querystring.q)) {
        var searchObj = {};
        searchObj.pageTitle = req.querystring.q + ' | ' + siteName;
        searchObj.pageDescription = req.querystring.q + ' | ' + siteName;
        if (isThematicPage) {
            // do overrides for thematic search results page
            if (req.querystring.h1Title) { thematicData.h1Title = req.querystring.h1Title; }
            if (req.querystring.blurb) { thematicData.blurb = req.querystring.blurb; }
            if (req.querystring.metaTitleForThematicPage) { searchObj.pageTitle = req.querystring.metaTitleForThematicPage; }
            if (req.querystring.metaDescriptionForThematicPage) { searchObj.pageDescription = req.querystring.metaDescriptionForThematicPage; }
        }
        pageMetaHelper.setPageMetaData(req.pageMetaData, searchObj);
        pageMetaHelper.setPageMetaTags(req.pageMetaData, searchObj);
    } else if (isSale && req.querystring && req.querystring.cgid !== preferences.getSaleCategoryID()) {
        // The conditions are separated at  line #179 for isClearance. It is separated to give preference to isSale
        let titleObj = {};
        // eslint-disable-next-line no-nested-ternary
        refinementTitle = Resource.msg('refinement.sale.label', 'common', null);
        if ('pageMetaTags' in result.productSearch) {
            result.productSearch.pageMetaTags.forEach(function (item) {
                if (item.title) {
                    titleObj.pageTitle = refinementTitle + ' ' + item.content;
                } else if (item.name && item.ID === 'description') {
                    titleObj.pageDescription = item.content;
                } else if (item.name && item.ID === 'keywords') {
                    titleObj.pageKeywords = item.content;
                }
            });
        }
        pageMetaHelper.setPageMetaData(req.pageMetaData, titleObj);
        pageMetaHelper.setPageMetaTags(req.pageMetaData, titleObj);
    } else if (isClearance && req.querystring && req.querystring.cgid !== preferences.getClearanceCategoryID()) {
        let titleObj = {};
        refinementTitle = Resource.msg('refinement.clearance.label', 'common', null);
        if ('pageMetaTags' in result.productSearch) {
            result.productSearch.pageMetaTags.forEach(function (item) {
                if (item.title) {
                    titleObj.pageTitle = refinementTitle + ' ' + item.content;
                } else if (item.name && item.ID === 'description') {
                    titleObj.pageDescription = item.content;
                } else if (item.name && item.ID === 'keywords') {
                    titleObj.pageKeywords = item.content;
                }
            });
        }
        pageMetaHelper.setPageMetaData(req.pageMetaData, titleObj);
        pageMetaHelper.setPageMetaTags(req.pageMetaData, titleObj);
    } else if (result.productSearch) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, result.productSearch);
        pageMetaHelper.setPageMetaTags(req.pageMetaData, result.productSearch);
    }
    // url to reset and execute the search form the store select
    var storeRefineUrlForCheckBox = refineSearch.getStoreRefinementUrl(req, SEARCH_SHOWAJAX);

    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line
        if (result.searchRedirect) {
            res.redirect(result.searchRedirect);
            return;
        }

        // redirect to error if any refinement is applied without these parameters
        if ((!req.querystring.cgid && !req.querystring.q && !req.querystring.pid && !req.querystring.pmid && req.querystring.q != '') || searchHelper.checkForSpecialCharacters(req.querystring.q)) {
            res.redirect(URLUtils.https('Home-ErrorNotFound').toString());
            return;
        }
        //  SFDEV-3056 | Issue for redirecting to PDP in case only one product is found
        if (result.productSearch.count === 1 && !req.querystring.ajax && !hasBrand) {
            let product = result.productSearch.productIds[0].productID;
            res.redirect(URLUtils.url('Product-Show', 'pid', product));
            return;
        }
        if (result.category) {
            template = result.categoryTemplate || 'rendering/category/producthits';
        }

        if (result.category && result.category.ID === 'root' && !(isSale || isClearance)) {
            template = 'rendering/category/designerbay';
        }
        // if the category is root, then set the brand as the category
        var categoryOnBrandPage;
        if (result.tempCategory) {
            categoryOnBrandPage = result.tempCategory.ID;
            if (result.tempCategory.ID === 'root') {
                categoryOnBrandPage = 'brand';
            }
        }

        // reset the clear All to fetch the results only with the brand in selection and not wipe brand selection
        // As brand selection does not show up on the filter bar for the brand pages.
        if (!doNotReset && hasBrand && hasBrand.indexOf('|') === -1) {
            result.productSearch.resetLink = URLUtils.https('Search-Show', 'cgid', categoryOnBrandPage, 'prefn1', 'brand', 'prefv1', hasBrand);
        }

        var isL1Category = result && result.productSearch && result.productSearch.isCategorySearch && result.category && result.category.isTopLevel();
        var designerObject = {};
        var productSearch = result.productSearch;
        var breadcrumbs;
        var clearanceCatDisplayName;
        var saleCatDisplayName;
        // logic to include recaptcha JS

        // Search for Keyword banner content asset using the mapping saved in the "KeywordSearchBanner" Custom Object.
        var searchPromo;
        if (!empty(req.querystring.q)) {
            var searchKeyword = req.querystring.q.toLowerCase();
            searchKeyword = '*|' + searchKeyword + '|*';
            var CustomObjectMgr = require('dw/object/CustomObjectMgr');
            var searchBannerCO = CustomObjectMgr.queryCustomObject('KeywordSearchBanner', 'custom.keywords ILIKE {0}', searchKeyword);
            if (searchBannerCO) {
                if (!empty(searchBannerCO.custom.contentAssetId)) {
                    searchPromo = ContentMgr.getContent(searchBannerCO.custom.contentAssetId);
                }
            }
        }

        // designer category changes
        if (result.category && result.category.ID === 'root' && !(isSale || isClearance)) {
            var alphaNums = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];
            designerObject.results = searchHelper.searchDesigner(productSearch);
            designerObject.alphaNums = alphaNums;
        }

        if (req.querystring && req.querystring.preferences && req.querystring.preferences['brand'] && req.querystring.cgid) { // eslint-disable-line
            // req.querystring.preferences['brand'] does not work in dot notation
            breadcrumbs = [];

            if (req.querystring.cgid !== 'brand' && req.querystring.cgid !== 'root') {
                breadcrumbs = productHelper.getAllBreadcrumbs(
                    req.querystring.cgid,
                    null,
                    breadcrumbs
                );
            }
            if (req.querystring.preferences['brand'].indexOf('|') === -1) { // eslint-disable-line
                breadcrumbs.push({
                    htmlValue: req.querystring.preferences['brand'], // eslint-disable-line
                    url: URLUtils.https('Search-Show', 'cgid', 'brand', 'prefn1', 'brand', 'prefv1', hasBrand)
                });
            }

            breadcrumbs.push({
                htmlValue: Resource.msg('label.search.home', 'search', null),
                url: URLUtils.url(ACTION_HOME)
            });
            breadcrumbs.reverse();
        } else if (req.querystring && req.querystring.preferences && req.querystring.preferences.isSale && req.querystring.cgid != preferences.getSaleCategoryID()) {
            breadcrumbs = [];

            if (req.querystring.cgid !== 'brand' && req.querystring.cgid !== 'root') {
                breadcrumbs = productHelper.getAllBreadcrumbs(
                    req.querystring.cgid,
                    null,
                    breadcrumbs
                );
            }
            var saleCategory = CatalogMgr.getCategory(preferences.getSaleCategoryID());
            if (saleCategory) {
                saleCatDisplayName = saleCategory.displayName;
                breadcrumbs.push({
                    htmlValue: saleCategory.displayName, // eslint-disable-line
                    url: searchHelper.getCategoryUrl(saleCategory)
                });
            }

            breadcrumbs.push({
                htmlValue: Resource.msg('label.search.home', 'search', null),
                url: URLUtils.url(ACTION_HOME)
            });
            breadcrumbs.reverse();
        } else if (req.querystring && req.querystring.preferences && req.querystring.preferences.isClearance && req.querystring.cgid != preferences.getClearanceCategoryID()) {
            breadcrumbs = [];

            if (req.querystring.cgid !== 'brand' && req.querystring.cgid !== 'root') {
                breadcrumbs = productHelper.getAllBreadcrumbs(
                    req.querystring.cgid,
                    null,
                    breadcrumbs
                );
            }
            var clearanceCategory = CatalogMgr.getCategory(preferences.getClearanceCategoryID());
            if (clearanceCategory) {
                clearanceCatDisplayName = clearanceCategory.displayName;
                breadcrumbs.push({
                    htmlValue: clearanceCategory.displayName, // eslint-disable-line
                    url: searchHelper.getCategoryUrl(clearanceCategory)
                });
            }

            breadcrumbs.push({
                htmlValue: Resource.msg('label.search.home', 'search', null),
                url: URLUtils.url(ACTION_HOME)
            });
            breadcrumbs.reverse();
        } else if (productSearch.category) {
            var categoryId = productSearch.category.id;
            breadcrumbs = productHelper.getAllBreadcrumbs(
                categoryId,
                null,
                []
            );
            breadcrumbs.push({
                htmlValue: Resource.msg('label.search.home', 'search', null),
                url: URLUtils.url(ACTION_HOME)
            });
            breadcrumbs.reverse();
        } else if (productSearch.searchKeywords) {
            breadcrumbs = productHelper.getAllBreadcrumbs(null, null, [{
                htmlValue: Resource.msg('label.search.home', 'search', null),
                url: URLUtils.url(ACTION_HOME)
            },
            {
                htmlValue: Resource.msg('label.search.all.results', 'search', null),
                url: null
            }
            ]);
        }

        result.productSearch = searchHelper.addSponsoredProductsToSearch(req, res, productSearch, null, template, sponsoredProducts);
        productSearch = result.productSearch;
        var totalBlocks = Math.ceil(TOTAL_PAGE_SIZE / LOAD_PAGE_SIZE);
        var currentPage = productSearch.pageNumber + 1;
        var showPreviousPage = (currentPage === totalBlocks * Math.ceil(currentPage / totalBlocks)) ? true : (!!(currentPage < (totalBlocks * Math.ceil(currentPage / totalBlocks)) && currentPage > ((totalBlocks * Math.floor(currentPage / totalBlocks)) + 1)));
        // Logic to retrieve category taxonomy for Chanel CLP/listing page
        var chanelCategory;
        var chanelCategories = [];
        if (productSearch.isCategorySearch && productSearch.category !== null && (productSearch.category.template === 'rendering/category/categorylandingchanel' || productSearch.category.template === 'rendering/category/producthitschanel')) {
            var categoryFromProductSearch = CatalogMgr.getCategory(productSearch.category.id);
            if (categoryFromProductSearch) {
                chanelCategory = searchHelper.getL1CategoryDetails(categoryFromProductSearch);
            }
            if (chanelCategory) {
                if (chanelCategory.hasOnlineSubCategories()) {
                    chanelCategories = searchHelper.categories(chanelCategory.onlineSubCategories);
                }
            }
        }
        viewData = {
            ajax: !!req.querystring.ajax,
            productSearch: productSearch,
            isRootCategory: (result.category && result.category.root) || (result.tempCategory && result.tempCategory.root),
            maxSlots: result.maxSlots,
            isSale: isSale,
            isClearance: isClearance,
            hasMultipleRefinements: !!req.querystring.preferences && Object.keys(req.querystring.preferences).some(function (key) { return req.querystring.preferences[key].indexOf('|') > -1; }),
            renderNoIndexTag: renderNoIndexTag,
            isPLPPage: isPLPPage,
            clearanceCategoryID: preferences.getClearanceCategoryID(),
            saleCategoryID: preferences.getSaleCategoryID(),
            reportingURLs: result.reportingURLs,
            refineurl: result.refineurl,
            category: result.category ? result.category : result.tempCategory,
            canonicalUrl: result.canonicalUrl,
            schemaData: result.schemaData,
            isRefinedByStore: result.isRefinedByStore,
            storeRefineUrl: storeRefineUrl,
            storeRefineUrlForCheckBox: storeRefineUrlForCheckBox,
            showPriceFilter: req.querystring.pmin || req.querystring.pmax,
            isL1Category: isL1Category,
            designerObject: designerObject,
            hasBrandRefinement: !!hasBrand,
            brandValue: hasBrand || '',
            clearanceCatDisplayName: clearanceCatDisplayName,
            saleCatDisplayName: saleCatDisplayName,
            showPreviousPage: showPreviousPage,
            showMore: currentPage <= (totalBlocks * Math.ceil(currentPage / totalBlocks)),
            breadcrumbs: breadcrumbs,
            startSize: req.querystring.start ? req.querystring.start : '',
            chanelCategories: chanelCategories,
            SearchPromo: searchPromo,
            searchTerm: req.querystring.term,
            searchType: req.querystring.type,
            chanelCategory: chanelCategory,
            chanelCatUrl: chanelCategory != null ? URLUtils.https('Search-ShowAjax', 'cgid', chanelCategory.ID).toString() : '',
            searchPageClass: !productSearch.isRefinedCategorySearch && (preferences.getCatRefinementLevel() === 2 || !preferences.getCatRefinementLevel()) ? 'search-results-page' : '',
            storeModalUrl: URLUtils.url('Stores-InitSearch').toString(),
            template: template
        };
        res.setViewData(viewData);
        res.render(template, viewData);
    });

    viewData = {
        previousWord: req.querystring.prevQ,
        searchWord: req.querystring.q,
        searchSuggestion: !!req.querystring.ss,
        s7APIForPDPZoomViewer: preferences.getS7APIForPDPZoomViewer(),
        s7APIForPDPVideoPlayer: preferences.getS7APIForPDPVideoPlayer(),
        displayQuickLook: preferences.getDisplayQuickLook(),
        isBopisEnabled: preferences.getIsBopisEnabled(),
        isThematicPage: isThematicPage,
        thematicData: thematicData,
        promoTrayEnabled: preferences.getIsPromoTrayEnabled(),
        src: req.querystring.src
    };
    viewData.storeRefineUrl = storeRefineUrl;
    res.setViewData(viewData);
    next();
}, pageMetaData.computedPageMetaData);


/** ROUTE REPLACED : to add store refinement in refinement***
 ****custom search with store price book set to session***
 ****if store id is found in the query***/
server.replace('Refinebar', cache.applySearchRefineBarCache, function (req, res, next) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');
    var ProductSearch = require('*/cartridge/models/search/productSearch');
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var maxRefinementValueLimit = preferences.getRefinementValueMaxLimit();
    var viewData = res.getViewData();
    var hasBrand = req.querystring.preferences && req.querystring.preferences.brand;

    var apiProductSearch = new ProductSearchModel();
    apiProductSearch = searchHelper.setupSearch(apiProductSearch, req.querystring);

    // if the search key has chanel, then skip the refinement of non-chanel products.
    if (req.querystring && req.querystring.q && req.querystring.q.toLowerCase().indexOf('chanel') === -1) {
        if (preferences.getNonChanelProductTypes()) {
            apiProductSearch.addRefinementValues('hbcProductType', preferences.getNonChanelProductTypes());
        }
    }
    // PSM search with store refinement
    var storeRefineResult = refineSearch.search(apiProductSearch, req.querystring);
    var apiProductsearch = storeRefineResult.apiProductsearch; // eslint-disable-line
    var productSearch = new ProductSearch(
        apiProductSearch,
        req.querystring,
        req.querystring.srule,
        CatalogMgr.getSortingOptions(),
        CatalogMgr.getSiteCatalog().getRoot(),null
    );
    viewData = {
        maxRefinementValueLimit: maxRefinementValueLimit,
        plpRefineViewMoreCatLimit: preferences.getPlpRefineViewMoreCatLimit(),
        enableCategoryFilterCustomization: preferences.getEnableCategoryFilterCustomization()
    };
    if (preferences.getIsBopisEnabled() && productSearch.refinements) {
        var Resource = require('dw/web/Resource');
        productSearch.refinements.unshift({
            displayName: Resource.msg('shippingoption.product.getitfast', 'storeLocator', null),
            isStoreRefinement: true,
            values: []
        });
    }
    res.setViewData(viewData);
    res.render('/search/searchRefineBar', {
        productSearch: productSearch,
        querystring: req.querystring,
        isRefinedByStore: storeRefineResult.isRefinedByStore,
        searchSource: storeRefineResult.isRefinedByStore ? 'search' : 'store',
        hasBrandRefinement: !!hasBrand,
        brandValue: hasBrand || '',
        storeRefineUrl: refineSearch.getStoreRefinementUrl(req, ACTION_REFINEMENT)
    });

    next();
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();