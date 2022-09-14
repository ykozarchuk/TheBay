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

    if (!empty(viewData.apiProductSearch)) {
        var searchRefinementsFactory = require('*/cartridge/scripts/factories/searchRefinements');
        var category = viewData.apiProductSearch.category;
        var refinements = viewData.apiProductSearch.refinements;
        var refinementDefinitions = refinements.refinementDefinitions;
        var refinementDefinitionsIterator = refinementDefinitions.iterator();
        var isWomenCategory = tag.content.indexOf(WOMEN) > -1;
        var isMenCategory = tag.content.indexOf(MEN) > -1;
        var isTopLevelCategory = isWomenCategory || isMenCategory;
        var topLevelCategory = isWomenCategory ? WOMEN : MEN;
        var isCategoryContainsRefinementValue = false;
        var isMultipleRefinementValues = false;

        while (refinementDefinitionsIterator.hasNext()) {
            var definition = refinementDefinitionsIterator.next();
            var refinementValues = refinements.getAllRefinementValues(definition);
            var values = searchRefinementsFactory.get(viewData.apiProductSearch, definition, refinementValues);
            var selected = values.filter(function (value) {
                return value.selected;
            });
            var containsRefinementValue = selected.some(function (selectedValue) {
                return category.displayName.indexOf(selectedValue.displayValue) > -1;
            });

            if (containsRefinementValue) {
                isCategoryContainsRefinementValue = true;
            }

            if (selected.length > 1) {
                isMultipleRefinementValues = true;
            }
        }

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
                result = (category.displayName.indexOf(topLevelCategory) > -1 ? '' : topLevelCategory + ' ')
                    + category.displayName + (type === 'title' ? THE_BAY : '');
            } else if (type === 'description') {
                result = tag.content.substr(tag.content.indexOf('.') + 1).trim();
            }
        }
    }

    return result;
}
