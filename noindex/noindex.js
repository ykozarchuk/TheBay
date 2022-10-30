var renderNoIndexTag = (function () {
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var isSortingParameter = httpParametersKeys.indexOf('srule') > -1;
    var preferences = httpParametersKeys.filter(function (key) {
        return key.indexOf('prefn') > -1;
    });

    return preferences.length > 1 && isSortingParameter;
}());

res.setViewData({
    renderNoIndexTag: renderNoIndexTag
});
