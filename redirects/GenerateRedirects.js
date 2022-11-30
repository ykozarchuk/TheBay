'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var Status = require('dw/system/Status');
var Site = require('dw/system/Site');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var XMLStreamWriter = require('dw/io/XMLStreamWriter');

var DIRECTORY_PATH = 'src/instance/redirect-urls';
var FILE_NAME = 'redirect-urls.xml';
var SITES_DIRECTORY = 'sites';
var REFINEMENT_STYLE = 'refinementStyle';

exports.generate = function(args, stepExecution) {
    var catalogID = stepExecution.getParameterValue('Catalog-ID') || '';
    var hostName = stepExecution.getParameterValue('Hostname') || '';
    var refinements = (stepExecution.getParameterValue('Refinements') || '').split(',').map(function (refinement) {
        return refinement.trim();
    });
    var secondLevelCategories = (stepExecution.getParameterValue('Second-Level-Categories') || '').split(',').map(function (secondLevelCat) {
        return secondLevelCat.trim();
    });
    var thirdLevelCategories = (stepExecution.getParameterValue('Third-Level-Categories') || '').split(',').map(function (thirdLevelCat) {
        return thirdLevelCat.trim();
    });

    var directory = new File(File.IMPEX + File.SEPARATOR + DIRECTORY_PATH);
    directory.mkdirs();

    var sitesDirectory = new File(directory.getFullPath() + File.SEPARATOR + SITES_DIRECTORY);
    sitesDirectory.mkdirs();

    var currentSiteDirectory = new File(sitesDirectory.getFullPath() + File.SEPARATOR + Site.getCurrent().getID());
    currentSiteDirectory.mkdirs();

    var file = new File(currentSiteDirectory.getFullPath() + File.SEPARATOR + FILE_NAME);
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

        var topLevelProductSearch = getProductSearch(topLevelCategory.getID());
        var topLevelRefinements = topLevelProductSearch.refinements;
        var topLevelRefinementDefinitionsIterator = topLevelRefinements && topLevelRefinements.refinementDefinitions.iterator();

        while (topLevelRefinementDefinitionsIterator.hasNext()) {
            var topLevelDefinition = topLevelRefinementDefinitionsIterator.next();
            var topLevelRefinementValues = topLevelRefinements.getAllRefinementValues(topLevelDefinition);

            if (refinements.indexOf(topLevelDefinition.getAttributeID()) > -1) {
                topLevelCategoryRefinements[topLevelDefinition.getAttributeID()] = topLevelRefinementValues.toArray().map(function (topLevelRefinementValue) {
                    return topLevelRefinementValue.getDisplayValue();
                });
            }
        }

        while (secondLevelCategoriesIterator.hasNext()) {
            var secondLevelCategory = secondLevelCategoriesIterator.next();
            var thirdLevelCategoriesIterator = secondLevelCategory.getOnlineSubCategories().iterator();
            var secondLevelCategoryRefinements = {};

            var secondLevelProductSearch = getProductSearch(secondLevelCategory.getID());
            var secondLevelRefinements = secondLevelProductSearch.refinements;
            var secondLevelRefinementDefinitionsIterator = secondLevelRefinements && secondLevelRefinements.refinementDefinitions.iterator();

            while (secondLevelRefinementDefinitionsIterator.hasNext()) {
                var secondLevelDefinition = secondLevelRefinementDefinitionsIterator.next();
                var secondLevelRefinementValues = secondLevelRefinements.getAllRefinementValues(secondLevelDefinition);

                if (refinements.indexOf(secondLevelDefinition.getAttributeID()) > -1) {
                    secondLevelCategoryRefinements[secondLevelDefinition.getAttributeID()] = secondLevelRefinementValues.toArray().map(function (secondLevelRefinementValue) {
                        return secondLevelRefinementValue.getDisplayValue();
                    });
                }

                if (secondLevelDefinition.getAttributeID() === REFINEMENT_STYLE
                    || secondLevelCategories.indexOf(secondLevelCategory.getID()) === -1) {
                    continue;
                }

                var topLevelCategoryRefinementValues = topLevelCategoryRefinements[secondLevelDefinition.getAttributeID()];
                if (!topLevelCategoryRefinementValues || topLevelCategoryRefinementValues.length < 1) {
                    continue;
                }

                secondLevelRefinementValues.toArray().forEach(function (secondLevelRefinementValue) {
                    if (topLevelCategoryRefinementValues.indexOf(secondLevelRefinementValue.getDisplayValue()) > -1) {
                        writeToFile(
                            xsw,
                            hostName,
                            topLevelProductSearch.urlRefineAttributeValue('Search-Show', secondLevelDefinition.getAttributeID(), secondLevelRefinementValue.getValue()).toString(),
                            secondLevelProductSearch.urlRefineAttributeValue('Search-Show', secondLevelDefinition.getAttributeID(), secondLevelRefinementValue.getValue()).toString()
                        );
                    }
                });
            }
        }

        while (thirdLevelCategoriesIterator.hasNext()) {
            var thirdLevelCategory = thirdLevelCategoriesIterator.next();

            if (thirdLevelCategories.indexOf(thirdLevelCategory.getID()) === -1) {
                continue;
            }

            var thirdLevelProductSearch = getProductSearch(thirdLevelCategory.getID());
            var thirdLevelRefinements = thirdLevelProductSearch.refinements;
            var thirdLevelRefinementDefinitionsIterator = thirdLevelRefinements && thirdLevelRefinements.refinementDefinitions.iterator();

            while (thirdLevelRefinementDefinitionsIterator.hasNext()) {
                var thirdLevelDefinition = thirdLevelRefinementDefinitionsIterator.next();
                var thirdLevelRefinementValues = thirdLevelRefinements.getAllRefinementValues(thirdLevelDefinition);

                if (thirdLevelDefinition.getAttributeID() !== REFINEMENT_STYLE) {
                    continue;
                }

                var topLevelCategoryRefinementValues1 = topLevelCategoryRefinements[thirdLevelDefinition.getAttributeID()];
                var secondLevelCategoryRefinementValues = secondLevelCategoryRefinements[thirdLevelDefinition.getAttributeID()];
                if ((!topLevelCategoryRefinementValues1 || topLevelCategoryRefinementValues1.length < 1) && (!secondLevelCategoryRefinementValues || secondLevelCategoryRefinementValues.length < 1)) {
                    continue;
                }

                thirdLevelRefinementValues.toArray().forEach(function (thirdLevelRefinementValue) {
                    if (topLevelCategoryRefinementValues1 && topLevelCategoryRefinementValues1.indexOf(thirdLevelRefinementValue.getDisplayValue()) > -1) {
                        writeToFile(
                            xsw,
                            hostName,
                            topLevelProductSearch.urlRefineAttributeValue('Search-Show', thirdLevelDefinition.getAttributeID(), thirdLevelRefinementValue.getValue()).toString(),
                            thirdLevelProductSearch.urlRefineAttributeValue('Search-Show', thirdLevelDefinition.getAttributeID(), thirdLevelRefinementValue.getValue()).toString()
                        );
                    }

                    if (secondLevelCategoryRefinementValues && secondLevelCategoryRefinementValues.indexOf(thirdLevelRefinementValue.getDisplayValue()) > -1) {
                        writeToFile(
                            xsw,
                            hostName,
                            secondLevelProductSearch.urlRefineAttributeValue('Search-Show', thirdLevelDefinition.getAttributeID(), thirdLevelRefinementValue.getValue()).toString(),
                            thirdLevelProductSearch.urlRefineAttributeValue('Search-Show', thirdLevelDefinition.getAttributeID(), thirdLevelRefinementValue.getValue()).toString()
                        );
                    }
                });
            }
        }
    }

    xsw.writeEndElement();
    xsw.writeEndDocument();
    xsw.close();
    fileWriter.close();

    directory.zip(new File(directory.getFullPath() + '.zip'));
    directory.remove();

    return new Status(Status.OK);
};

/**
 * Gets Product Search Model based on the passed category id.
 * @param {string} categoryID - Cagegory id.
 * @returns {dw.catalog.ProductSearchModel} - Product Search Model.
 */
function getProductSearch(categoryID) {
    var PSM = new ProductSearchModel();
    PSM.setCategoryID(categoryID);
    PSM.search();

    return PSM;
}

/**
 * Takes given source and destination URLs and writes them to the current redirect-urls XML file.
 * @param {dw.io.XMLStreamWriter} xsw - An XML stream writer.
 * @param {string} hostName - Hostname.
 * @param {string} sourceURL - A source URL.
 * @param {string} destinationURL - A destination URL.
 */
function writeToFile(xsw, hostName, sourceURL, destinationURL) {
    xsw.writeStartElement('redirect-url');
    xsw.writeAttribute('uri', sourceURL.replace(hostName, ''));

        xsw.writeStartElement('status-code');
            xsw.writeCharacters('301');
        xsw.writeEndElement();

        xsw.writeStartElement('enabled-flag');
            xsw.writeCharacters('true');
        xsw.writeEndElement();

        xsw.writeStartElement('destination-url');
            xsw.writeCharacters(destinationURL.replace(hostName, ''));
        xsw.writeEndElement();

        xsw.writeStartElement('copy-source-params');
            xsw.writeCharacters('default');
        xsw.writeEndElement();

    xsw.writeEndElement();
}
