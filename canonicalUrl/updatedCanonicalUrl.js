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

    var Site = require('dw/system/Site');
    var currentSite = Site.getCurrent();
    var parentCategories = currentSite.getCustomPreferenceValue('parentCategoriesWithCanonicalUrls');
    var subCategories = currentSite.getCustomPreferenceValue('subCategoriesWithCanonicalUrls');
    var secondarySubCategories = currentSite.getCustomPreferenceValue('secondarySubCategoriesWithCanonicalUrls');
    var parentCategoriesArray = parentCategories ? parentCategories.split(',').map(category => category.trim()) : [];
    var subCategoriesArray = subCategories ? subCategories.split(',').map(category => category.trim()) : [];
    var secondarySubCategoriesArray = secondarySubCategories ? secondarySubCategories.split(',').map(category => category.trim()) : [];
    var path = request.httpHeaders['x-is-path_info'];
    var parentCategory = path.split(/\//)[2];
    var subCategory = parentCategory + '/' + path.split(/\//)[3];
    var secondarySubCategory = subCategory + '/' + path.split(/\//)[4];
    var canonicalURL = request.httpProtocol + '://' + request.httpHost + path;
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var isDefaultCanonicalURL = parentCategoriesArray.indexOf(parentCategory) > -1
        || subCategoriesArray.indexOf(subCategory) > -1
        || secondarySubCategoriesArray.indexOf(secondarySubCategory) > -1;


    if (isDefaultCanonicalURL) {
        return canonicalURL;
    }

    return getParentCanonicalURL(httpParametersKeys, path);
}
