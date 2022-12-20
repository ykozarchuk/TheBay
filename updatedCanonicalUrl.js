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
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var httpParametersValues = request.httpParameters.values().toArray();

    var multipleValues = httpParametersValues.filter(function (value) {
        return value[0].indexOf('|') > -1;
    });

    if (multipleValues.length > 0) {
        return getParentCanonicalURL(httpParametersKeys, path);
    }

    return canonicalURL;
}
