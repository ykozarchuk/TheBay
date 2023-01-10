function robotsTag() {
    var Site = require('dw/system/Site');

    var indexFollowCategories = Site.current.getCustomPreferenceValue('indexFollowCategories');
    var indexFollowRefinements = Site.current.getCustomPreferenceValue('indexFollowRefinements');
    var indexFollowCategoriesArray = indexFollowCategories ? indexFollowCategories.split(',').map(category => category.trim()) : [];
    var indexFollowRefinementsArray = indexFollowRefinements ? indexFollowRefinements.split(',').map(refinement => refinement.trim()) : [];
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
