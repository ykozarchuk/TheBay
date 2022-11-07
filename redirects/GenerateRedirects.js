'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var XMLStreamWriter = require('dw/io/XMLStreamWriter');

var DIRECTORY_PATH = 'src/instance';
var FILE_NAME = 'redirect-urls.xml';

exports.generate = function(args, stepExecution) {
    var catalogID = stepExecution.getParameterValue('Catalog-ID');
    var refinements = (stepExecution.getParameterValue('Refinements') || '').split(',').map(function (refinement) {
        return refinement.trim();
    });

    var directory = new File(File.IMPEX + File.SEPARATOR + DIRECTORY_PATH);
    if (!directory.exists()) {
        directory.mkdirs();
    }

    var file = new File(File.IMPEX + File.SEPARATOR + DIRECTORY_PATH + File.SEPARATOR + FILE_NAME);
    file.createNewFile();

    var fileWriter = new FileWriter(file, 'UTF-8');
    var xsw = new XMLStreamWriter(fileWriter);
    xsw.writeStartDocument();
    xsw.writeStartElement('redirect-urls');
    xsw.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/redirecturl/2011-09-01');

    var catalog = CatalogMgr.getCatalog(catalogID);
    var root = catalog && catalog.getRoot();
    var topLevelCategoriesIterator = root.getOnlineSubCategories().iterator();

    while (topLevelCategoriesIterator.hasNext()) {
        var topLevelCategory = topLevelCategoriesIterator.next();
        var secondLevelCategoriesIterator = topLevelCategory.getOnlineSubCategories().iterator();
        var topLevelCategoryRefinements = {};

        var topLevelProductSearch = new ProductSearchModel();
        topLevelProductSearch.setCategoryID(topLevelCategory.getID());
        topLevelProductSearch.search();

        var topLevelRefinements = topLevelProductSearch.refinements;
        var topLevelRefinementDefinitionsIterator = topLevelRefinements && topLevelRefinements.refinementDefinitions.iterator();

        while (topLevelRefinementDefinitionsIterator.hasNext()) {
            var topLevelDefinition = topLevelRefinementDefinitionsIterator.next();

            if (refinements.indexOf(topLevelDefinition.getAttributeID()) === -1) {
                continue;
            }

            var topLevelRefinementValues = topLevelRefinements.getAllRefinementValues(topLevelDefinition);
            topLevelCategoryRefinements[topLevelDefinition.getAttributeID()] = topLevelRefinementValues.toArray().map(function (topLevelRefinementValue) {
                return topLevelRefinementValue.getDisplayValue();
            });
        }

        while (secondLevelCategoriesIterator.hasNext()) {
            var secondLevelCategory = secondLevelCategoriesIterator.next();

            var secondLevelProductSearch = new ProductSearchModel();
            secondLevelProductSearch.setCategoryID(secondLevelCategory.getID());
            secondLevelProductSearch.search();

            var secondLevelRefinements = secondLevelProductSearch.refinements;
            var secondLevelRefinementDefinitionsIterator = secondLevelRefinements && secondLevelRefinements.refinementDefinitions.iterator();

            while (secondLevelRefinementDefinitionsIterator.hasNext()) {
                var secondLevelDefinition = secondLevelRefinementDefinitionsIterator.next();
                var secondLevelRefinementValues = secondLevelRefinements.getAllRefinementValues(secondLevelDefinition);
                var topLevelCategoryRefinementValues = topLevelCategoryRefinements[secondLevelDefinition.getAttributeID()];

                if (!topLevelCategoryRefinementValues || topLevelCategoryRefinementValues.length <= 0) {
                    continue;
                }

                secondLevelRefinementValues.toArray().forEach(function (secondLevelRefinementValue) {
                    if (topLevelCategoryRefinementValues.indexOf(secondLevelRefinementValue.getDisplayValue()) === -1) {
                        return;
                    }

                    writeToFile(
                        xsw,
                        topLevelProductSearch.urlRefineAttributeValue('Search-Show', secondLevelDefinition.getAttributeID(), secondLevelRefinementValue.getValue()).relative().toString(),
                        secondLevelProductSearch.urlRefineAttributeValue('Search-Show', secondLevelDefinition.getAttributeID(), secondLevelRefinementValue.getValue()).relative().toString()
                    );
                });
            }
        }
    }

    xsw.writeEndElement();
    xsw.writeEndDocument();
    xsw.close();
    fileWriter.close();

    return new Status(Status.OK);
};

/**
 * Takes given source and destination urls and writes them to the current redirect-urls XML file.
 * @param {dw.io.XMLStreamWriter} xsw - An XML stream writer.
 * @param {string} sourceURL - A source url.
 * @param {string} destinationURL - A destination url.
 */
function writeToFile(xsw, sourceURL, destinationURL) {
    xsw.writeStartElement('redirect-url');
    xsw.writeAttribute('uri', sourceURL);

        xsw.writeStartElement('status-code');
            xsw.writeCharacters('301');
        xsw.writeEndElement();

        xsw.writeStartElement('enabled-flag');
            xsw.writeCharacters('true');
        xsw.writeEndElement();

        xsw.writeStartElement('destination-url');
            xsw.writeCharacters(destinationURL);
        xsw.writeEndElement();

        xsw.writeStartElement('copy-source-params');
            xsw.writeCharacters('default');
        xsw.writeEndElement();

    xsw.writeEndElement();
}
