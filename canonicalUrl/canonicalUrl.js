function computeCanonicalURL() {
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

    var path = request.httpHeaders['x-is-path_info'];
    var canonicalURL = request.httpProtocol + '://' + request.httpHost + path;
    var parentCategory = path.split(/\//)[2];
    var subCategory = parentCategory + '/' + path.split(/\//)[3];
    var secondarySubCategory = subCategory + '/' + path.split(/\//)[4];
    var skippedCategories = ['custom', 'new', 'sale-clearance', 'our-brands'];
    var skippedSubCategories = ['women/new-arrivals', 'women/young-adult-1', 'men/new-arrivals-this-week',
        'men/young-adult', 'home/new-arrivals', 'beauty/best-sellers', 'home/best-sellers'];
    var skippedSecondarySubCategories = ['home/bath/best-sellers'];
    var blockedCategories = ['/sale1', '/sale2', '/clerance1', '/clerance2'];
    var isSkippedCategory = skippedCategories.indexOf(parentCategory) > -1;
    var isSkippedSubCategory = skippedSubCategories.indexOf(subCategory) > -1;
    var isSkippedSecondarySubCategory = skippedSecondarySubCategories.indexOf(secondarySubCategory) > -1;
    var isBlockedCategory = blockedCategories.some(function (category) {
        return canonicalURL.indexOf(category) > -1;
    });
    var isCanonicalURL = isSkippedCategory || isSkippedSubCategory || isSkippedSecondarySubCategory || isBlockedCategory;
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var httpParametersValues = request.httpParameters.values().toArray();

    var preferences = httpParametersKeys.filter(function (key) {
        return key.indexOf('prefn') > -1 && !isRefinementValueInURL(key, canonicalURL);
    });

    var multipleValues = httpParametersValues.filter(function (value) {
        return value[0].indexOf('|') > -1;
    });

    if (multipleValues.length > 0) {
        return getParentCanonicalURL(httpParametersKeys, path);
    }

    if (isCanonicalURL || preferences.length > 1) {
        return canonicalURL;
    }

    var refinedParameters = httpParametersKeys.reduce(function (accumulator, key, index) {
        var value = httpParametersValues[index][0];
        var isPreferenceName = key.indexOf('prefn') > -1;
        var isPreferenceValue = key.indexOf('prefv') > -1;
        var skipCurrentParameter = !(isPreferenceName || isPreferenceValue);
        var skipCurrentRefinementValue = isPreferenceName && isRefinementValueInURL(key, canonicalURL);
        var skipCurrentRefinement = isPreferenceName && value !== 'colorRefinement' && value !== 'refinementStyle';
        var skipCurrentValue = isPreferenceValue && accumulator.indexOf('prefn' + key.slice(-1)) === -1;

        if (skipCurrentParameter || skipCurrentRefinementValue || skipCurrentRefinement || skipCurrentValue) {
            return accumulator;
        }

        return accumulator + (accumulator.length > 0 ? '&' : '?') + key + '=' + value;
    }, '');

    return canonicalURL + refinedParameters;
}
