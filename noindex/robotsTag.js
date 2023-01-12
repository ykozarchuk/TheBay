function robotsTag() {
    var Site = require('dw/system/Site');

    var currentSite = Site.current;
    var preferences = currentSite && currentSite.preferences;
    var indexFollowCategories = preferences ? currentSite.getCustomPreferenceValue('indexFollowCategories') : null;
    var indexFollowRefinements = preferences ? currentSite.getCustomPreferenceValue('indexFollowRefinements') : null;
    var indexFollowCategoriesArray = !empty(indexFollowCategories) ? indexFollowCategories.split(',').map(function (indexFollowCategory) {
        return indexFollowCategory.trim();
    }) : [];
    var indexFollowRefinementsArray = !empty(indexFollowRefinements) ? indexFollowRefinements.split(',').map(function (indexFollowRefinement) {
        return indexFollowRefinement.trim();
    }) : [];
    var httpParametersKeys = request.httpParameters.keySet().toArray();
    var httpParametersValues = request.httpParameters.values().toArray();

    var isSortingParameter = httpParametersKeys.indexOf('srule') > -1;
    var isIndexFollowRefinement = false;
    var categoryId = '';
    var preferencesCount = 0;

    httpParametersKeys.forEach(function (key, index) {
        var value = httpParametersValues[index][0];

        if (!isIndexFollowRefinement) {
            isIndexFollowRefinement = indexFollowRefinementsArray.indexOf(value) > -1;
        }

        if (key.indexOf('cgid') > -1) {
            categoryId = value;
        }

        if (key.indexOf('prefn') > -1) {
            preferencesCount++;
        }
    });

    var isIndexFollowCategory = indexFollowCategoriesArray.indexOf(categoryId) > -1;

    return {
        indexFollow: isIndexFollowCategory || isIndexFollowRefinement,
        noIndexNoFollow: preferencesCount > 1 || isSortingParameter
    };
}
