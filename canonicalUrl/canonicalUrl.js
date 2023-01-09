function computeCanonicalURL() {
    var Site = require('dw/system/Site');

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

    function isRefinementValueInURL(parametersKey, url) {
        var value = request.httpParameters.get('prefv' + parametersKey.slice(-1));
        var valueString = value ? value[0].trim().replace(/(\s&\s)|\s/g, '-').replace(/\|/g, '_').toLowerCase() : '';
        return url.indexOf(valueString) > -1;
    }

    function getParentCanonicalURL(parametersKeys, urlPath) {
        var paths = urlPath.split(/\//);
        paths = paths.filter(function (path) {
            return !parametersKeys.some(function (key) {
                return key.indexOf('prefn') > -1 ? isRefinementValueInURL(key, path) : false;
            });
        });

        return request.httpProtocol + '://' + request.httpHost + paths.join('/');
    }

    var excludedCategories = Site.current.getCustomPreferenceValue('excludedCanonicalCategories');
    var materialCategories = Site.current.getCustomPreferenceValue('materialSelfReferencingCanonicalCategories');
    var styleCategories = Site.current.getCustomPreferenceValue('styleSelfReferencingCanonicalCategories');
    var typeCategories = Site.current.getCustomPreferenceValue('typeSelfReferencingCanonicalCategories');
    var colorCategories = Site.current.getCustomPreferenceValue('colorSelfReferencingCanonicalCategories');
    var excludedCategoriesArray = excludedCategories ? excludedCategories.split(',').map(category => category.trim()) : [];
    var materialCategoriesArray = materialCategories ? materialCategories.split(',').map(category => category.trim()) : [];
    var styleCategoriesArray = styleCategories ? styleCategories.split(',').map(category => category.trim()) : [];
    var typeCategoriesArray = typeCategories ? typeCategories.split(',').map(category => category.trim()) : [];
    var colorCategoriesArray = colorCategories ? colorCategories.split(',').map(category => category.trim()) : [];
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var httpParametersValues = request.httpParameters.values().toArray();
    var path = request.httpHeaders['x-is-path_info'];
    var canonicalURL = request.httpProtocol + '://' + request.httpHost + path;
    var categoryId = '';
    var refinementCount = 0;
    var refinements = {
        isBrand: false,
        isMaterial: false,
        isStyle: false,
        isType: false,
        isColor: false
    };

    var urlParameters = httpParametersKeys.reduce(function (accumulator, key, index) {
        var value = httpParametersValues[index][0];
        var isPreferenceName = key.indexOf('prefn') > -1;
        var isPreferenceValue = key.indexOf('prefv') > -1;
        var isCategoryId = key.indexOf('cgid') > -1;
        var skipCurrentParameter = !(isPreferenceName || isPreferenceValue);
        var skipCurrentRefinementValue = isPreferenceName && isRefinementValueInURL(key, canonicalURL);
        var skipCurrentValue = isPreferenceValue && accumulator.indexOf('prefn' + key.slice(-1)) === -1;

        if (isPreferenceName) {
            setRefinement(value, refinements);
            refinementCount++;
        }

        if (isCategoryId) {
            categoryId = value;
        }

        if (skipCurrentParameter || skipCurrentRefinementValue || skipCurrentValue) {
            return accumulator;
        }

        return accumulator + (accumulator.length > 0 ? '&' : '?') + key + '=' + value;
    }, '');

    var hasMultipleValues = httpParametersValues.filter(function (value) {
        return value[0].indexOf('|') > -1;
    }).length > 0;

    var hasMultipleRefinements = refinementCount > 1;
    var isExcludedCategory = excludedCategoriesArray.indexOf(categoryId) > -1;
    var isMaterialCategory = refinements.isMaterial && materialCategoriesArray.indexOf(categoryId) > -1;
    var isStyleCategory = refinements.isStyle && styleCategoriesArray.indexOf(categoryId) > -1;
    var isTypeCategory = refinements.isType && typeCategoriesArray.indexOf(categoryId) > -1;
    var isColorCategory = refinements.isColor && colorCategoriesArray.indexOf(categoryId) > -1;

    var isCanonicalURL = !hasMultipleValues && !hasMultipleRefinements && !isExcludedCategory
        && (refinements.isBrand || isMaterialCategory || isStyleCategory || isTypeCategory || isColorCategory);

    if (isCanonicalURL) {
        return canonicalURL + urlParameters;
    }

    return getParentCanonicalURL(httpParametersKeys, path);
}
