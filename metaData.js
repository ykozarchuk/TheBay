/**
* Modify page meta tag (title, description, h1) according to the specified rules
* @param {Object} tag Page meta tag
* @param {Object} viewData View data
* @returns {string} Modified page meta tag content
*/
function modifyPageMetaTag(tag, viewData) {
    var THE_BAY = ' | The Bay Canada';
    var WOMEN = "Women's";
    var MEN = "Men's";

    var result = tag.content;
    var type = tag.ID;

    if (!empty(viewData.productSearch)) {
        var category = viewData.category;
        var refinements = viewData.productSearch.cachedRefinements;
        var isWomenCategory = tag.content.indexOf(WOMEN) > -1;
        var isMenCategory = tag.content.indexOf(MEN) > -1;
        var isTopLevelCategory = isWomenCategory || isMenCategory;
        var topLevelCategory = isWomenCategory ? WOMEN : MEN;
        var isCategoryContainsRefinementValue = false;
        var isMultipleRefinementValues = false;

        Object.keys(refinements).forEach(function (key) {
            var selected = refinements[key].selected;
            if (selected.length > 1) {
                isMultipleRefinementValues = true;
            }

            Object.keys(selected).forEach(function (key1) {
                if (category.displayName.indexOf(selected[key1].displayValue) > -1) {
                    isCategoryContainsRefinementValue = true;
                }
            });
        });

        if (isCategoryContainsRefinementValue && isTopLevelCategory) {
            if (type === 'title' || type === 'YOUR_H1_IDENTIFIER') {
                result = topLevelCategory + ' '
                    + tag.content.substr(0, tag.content.indexOf(topLevelCategory)).replace(/\|/g, '').trim()
                    + (type === 'title' ? THE_BAY : '');
            } else if (type === 'description') {
                result = tag.content.substr(tag.content.indexOf('.') + 1).trim();
            }
        }

        if (isMultipleRefinementValues && isTopLevelCategory) {
            if (type === 'title' || type === 'YOUR_H1_IDENTIFIER') {
                result = topLevelCategory + ' ' + category.displayName + (type === 'title' ? THE_BAY : '');
            } else if (type === 'description') {
                result = tag.content.substr(tag.content.indexOf('.') + 1).trim();
            }
        }
    }

    return result;
}
