function robotsTag() {
    var Site = require('dw/system/Site');
    var URLUtils = require('dw/web/URLUtils');

    function setRefinement(refinementName, refinements) {
        switch (refinementName) {
            case 'brand':
                refinements.isBrand = true;
                break;
            case 'refMaterial':
                refinements.isMaterial = true;
                break;
            case 'refinementStyle':
                refinements.isStyle = true;
                break;
            case 'refinementProductType':
                refinements.isType = true;
                break;
            case 'colorRefinement':
                refinements.isColor = true;
                break;
            default:
                break;
        }
    }

    var currentSite = Site.current;
    var preferences = currentSite && currentSite.preferences;
    var excludedNoIndexNoFollowCategories = preferences ? currentSite.getCustomPreferenceValue('excludedNoIndexNoFollowCategories') : null;
    var indexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('indexFollowCategories') : null;
    var indexFollowRefinements = preferences ? currentSite.getCustomPreferenceValue('indexFollowRefinements') : null;
    var brandIndexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('brandIndexFollowCategories') : null;
    var materialIndexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('materialIndexFollowCategories') : null;
    var styleIndexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('styleIndexFollowCategories') : null;
    var typeIndexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('typeIndexFollowCategories') : null;
    var colorIndexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('colorIndexFollowCategories') : null;
    var excludedNoIndexNoFollowCategoriesArray = !empty(excludedNoIndexNoFollowCategories) ? excludedNoIndexNoFollowCategories.split(',').map(function (excludedNoIndexNoFollowCategory) {
        return excludedNoIndexNoFollowCategory.trim();
    }) : [];
    var indexFollowCategoriesArray = !empty(indexFollowCategories) ? indexFollowCategories.split(',').map(function (indexFollowCategory) {
        return indexFollowCategory.trim();
    }) : [];
    var indexFollowRefinementsArray = !empty(indexFollowRefinements) ? indexFollowRefinements.split(',').map(function (indexFollowRefinement) {
        return indexFollowRefinement.trim();
    }) : [];
    var brandIndexFollowCategoriesArray = !empty(brandIndexFollowCategories) ? brandIndexFollowCategories.split(',').map(function (brandIndexFollowCategory) {
        return brandIndexFollowCategory.trim();
    }) : [];
    var materialIndexFollowCategoriesArray = !empty(materialIndexFollowCategories) ? materialIndexFollowCategories.split(',').map(function (materialIndexFollowCategory) {
        return materialIndexFollowCategory.trim();
    }) : [];
    var styleIndexFollowCategoriesArray = !empty(styleIndexFollowCategories) ? styleIndexFollowCategories.split(',').map(function (styleIndexFollowCategory) {
        return styleIndexFollowCategory.trim();
    }) : [];
    var typeIndexFollowCategoriesArray = !empty(typeIndexFollowCategories) ? typeIndexFollowCategories.split(',').map(function (typeIndexFollowCategory) {
        return typeIndexFollowCategory.trim();
    }) : [];
    var colorIndexFollowCategoriesArray = !empty(colorIndexFollowCategories) ? colorIndexFollowCategories.split(',').map(function (colorIndexFollowCategory) {
        return colorIndexFollowCategory.trim();
    }) : [];
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var httpParametersValues = request.httpParameters.values().toArray();

    var categoryId = '';
    var refinementCount = 0;
    var parameters = [];
    var isIndexFollowRefinement = false;
    var refinements = {
        isBrand: false,
        isMaterial: false,
        isStyle: false,
        isType: false,
        isColor: false
    };

    httpParametersKeys.forEach(function (key, index) {
        var value = httpParametersValues[index][0];
        var isPreferenceName = key.indexOf('prefn') > -1;
        var isCategoryId = key.indexOf('cgid') > -1;
        parameters.push(key);
        parameters.push(value);

        if (!isIndexFollowRefinement) {
            isIndexFollowRefinement = indexFollowRefinementsArray.indexOf(value) > -1;
        }

        if (isCategoryId) {
            categoryId = value;
        }

        if (isPreferenceName) {
            setRefinement(value, refinements);
            refinementCount++;
        }
    });

    var hasMultipleRefinements = refinementCount > 1;
    var url = URLUtils.url('Search-Show', parameters).toString();
    var isPreferenceParameter = url.indexOf('prefn') > -1;
    var isSortingParameter = httpParametersKeys.indexOf('srule') > -1;
    var isCustomEditorialCategory = url.indexOf('c/custom/editorial-events') > -1;
    var isExcludedNoIndexNoFollowCategory = excludedNoIndexNoFollowCategoriesArray.indexOf(categoryId) > -1;
    var isIndexFollowCategory = indexFollowCategoriesArray.indexOf(categoryId) > -1;
    var isBrandIndexFollowCategory = refinements.isBrand && brandIndexFollowCategoriesArray.indexOf(categoryId) > -1;
    var isMaterialIndexFollowCategory = refinements.isMaterial && materialIndexFollowCategoriesArray.indexOf(categoryId) > -1;
    var isStyleIndexFollowCategory = refinements.isStyle && styleIndexFollowCategoriesArray.indexOf(categoryId) > -1;
    var isTypeIndexFollowCategory = refinements.isType && typeIndexFollowCategoriesArray.indexOf(categoryId) > -1;
    var isColorIndexFollowCategory = refinements.isColor && colorIndexFollowCategoriesArray.indexOf(categoryId) > -1;

    var indexFollow = !hasMultipleRefinements && (isIndexFollowCategory || isIndexFollowRefinement
            || isBrandIndexFollowCategory || isMaterialIndexFollowCategory || isStyleIndexFollowCategory || isTypeIndexFollowCategory || isColorIndexFollowCategory);
    var noIndexNoFollow = !isExcludedNoIndexNoFollowCategory && (isPreferenceParameter || isSortingParameter || isCustomEditorialCategory);

    return {
        indexFollow: indexFollow,
        noIndexNoFollow: noIndexNoFollow
    };
}
