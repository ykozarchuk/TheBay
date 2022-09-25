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
    var KIDS = "Kids'";

    var result = tag.content;
    var type = tag.ID;
    var topLevelCategory = '';

    if (tag.content.indexOf(WOMEN) > -1) {
        topLevelCategory = WOMEN;
    } else if (tag.content.indexOf(MEN) > -1) {
        topLevelCategory = MEN;
    } else if (tag.content.indexOf(KIDS) > -1) {
        topLevelCategory = KIDS;
    }

    if (!empty(viewData.apiProductSearch)) {
        var searchRefinementsFactory = require('*/cartridge/scripts/factories/searchRefinements');
        var category = viewData.apiProductSearch.category;
        var refinements = viewData.apiProductSearch.refinements;
        var refinementDefinitions = refinements.refinementDefinitions;
        var refinementDefinitionsIterator = refinementDefinitions.iterator();
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

        if (isCategoryContainsRefinementValue) {
            if (type === 'title' || type === 'plp:h1') {
                result = (topLevelCategory ? topLevelCategory + ' ' : '')
                    + tag.content.substr(0, tag.content.indexOf(topLevelCategory || '|')).replace(/\|/g, '').trim()
                    + (type === 'title' ? THE_BAY : '');
            } else if (type === 'description') {
                var listOfRefinementValues = tag.content.match(new RegExp('Shop (.*) in'))[1];
                result = tag.content.substr(tag.content.indexOf('.') + 1).replace(category.displayName, listOfRefinementValues).trim();
            }
        }

        if (isMultipleRefinementValues) {
            if (type === 'title' || type === 'plp:h1') {
                result = (category.displayName.indexOf(topLevelCategory) > -1 ? '' : topLevelCategory + ' ') + category.displayName + (type === 'title' ? THE_BAY : '');
            } else if (type === 'description') {
                result = tag.content.substr(tag.content.indexOf('.') + 1).trim();
            }
        }
    }

    return result;
}
