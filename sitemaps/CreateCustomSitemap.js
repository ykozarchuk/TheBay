exports.createCustomSitemap = function (args, stepExecution) {
    var Status = require('dw/system/Status');
    var status = new Status(Status.OK);
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var catalogID = stepExecution.getParameterValue('Catalog-ID'); // Retrieved the job step in Business Manager.
    var refinementID = stepExecution.getParameterValue('Refinement-ID'); // Retrieved the job step in Business Manager.
    var excludedCategories = stepExecution.getParameterValue('Excluded-Categories') || null; // Retrieved the job step in Business Manager.
    var includedCategories1 = stepExecution.getParameterValue('Included-Categories-1') || null; // Retrieved the job step in Business Manager.
    var includedCategories2 = stepExecution.getParameterValue('Included-Categories-2') || null; // Retrieved the job step in Business Manager.
    var linksPerSitemapFile = stepExecution.getParameterValue('Links-Per-Sitemap-File'); // Retrieved the job step in Business Manager.
    var ProductSearchModel = require('/dw/catalog/ProductSearchModel');
    var File = require('dw/io/File');
    var FileWriter = require('dw/io/FileWriter');
    var XMLStreamWriter = require('dw/io/XMLStreamWriter');
    var SitemapMgr = require('dw/sitemap/SitemapMgr');
    var hostName = stepExecution.getParameterValue('Hostname'); // Retrieved the job step in Business Manager.
    var urlCounter = 0;
    var currentFile;
    var allFiles = [];
    var domainRegex = new RegExp(/(.*).(?=\/c\/)/ig); // A regular expression to match the domain in a url string.
    var excludedCategoriesArray = excludedCategories ? excludedCategories.split(',') : [];
    var includedCategoriesConverted1 = includedCategories1 ? includedCategories1.split(',') : [];
    var includedCategoriesConverted2 = includedCategories2 ? includedCategories2.split(',') : [];
    var includedCategoriesArray = [].concat(includedCategoriesConverted1, includedCategoriesConverted2);

    /**
     * Validates the given category.
     * @param {string} categoryID - A category ID.
     * @returns {boolean} - True if the category is valid, False otherwise.
     */
    function isValidCategory(categoryID) {
        if (!empty(includedCategoriesArray) && includedCategoriesArray.indexOf(categoryID) < 0) {
            return false;
        }

        if (empty(includedCategoriesArray) && !empty(excludedCategoriesArray) && excludedCategoriesArray.indexOf(categoryID) > -1) {
            return false;
        }

        return true;
    }

    /**
     * Gets search refinement values by executing a category search.
     * @param {string} categoryID - A category ID.
     * @returns {dw.catalog.SearchRefinementDefinition} or undefined if not found.
     */
    function getSearchRefinementValues(categoryID) {
        var searchRefinementValues;
        var PSM = new ProductSearchModel();
        PSM.setCategoryID(categoryID);
        PSM.search();
        // Get the SearchRefinementDefinition by filtering for it's ID.
        var searchRefinementDefinition = PSM.getRefinements().getAllRefinementDefinitions().toArray().filter(function (refinementDefintion) {
            return refinementDefintion.getAttributeID() === refinementID;
        })[0];

        if (searchRefinementDefinition !== undefined) {
            searchRefinementValues = PSM.getRefinements().getAllRefinementValues(searchRefinementDefinition).toArray();
        }
        return searchRefinementValues;
    }

    /**
    * Creates a file in CustomXMLSitemaps directory. The XMLStreamWriter can write to these files. It will append the suffix to the end of the filename.
    * @param {string} fileName - The name of the file to be used, without filetype extension.
    * @param {string} suffix - A suffix to add after the filename.
    * @returns {dw.io.File} file - Returns a file.
    */
    function createFile(fileName, suffix) {
        var targetDirectory = new File(File.IMPEX + File.SEPARATOR + 'CustomXMLSitemaps');
        targetDirectory.mkdirs();
        var file = new File(File.IMPEX + File.SEPARATOR + 'CustomXMLSitemaps' + File.SEPARATOR + fileName + '-' + suffix + '.xml');
        file.createNewFile();
        return file;
    }
    // Prepare the first file and writers.
    currentFile = createFile(refinementID, '0');
    var fileWriter = new FileWriter(currentFile, 'UTF-8');
    var xsw = new XMLStreamWriter(fileWriter);

    /**
     * Takes a given url and writes it to the current file. If its the start of a new file, it'll write the urlset attribute too.
     * @param {dw.io.File} file - A file.
     * @param {dw.web.URL} url - A url
     * @returns {void}
     */
    function writeToFile(url) {
        // if it's a new document, write the heading.
        if (urlCounter === 0) {
            xsw.writeStartDocument();
            xsw.writeStartElement('urlset'); // start urlset
                xsw.writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
                xsw.writeAttribute('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');
                xsw.writeAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
                xsw.writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
                xsw.writeAttribute('xsi:schemaLocation', 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd http://www.w3.org/1999/xhtml http://www.w3.org/2002/08/xhtml/xhtml1-strict.xsd');
        }
        // Write the url element
        xsw.writeStartElement('url');
            xsw.writeStartElement('loc');
                xsw.writeCharacters('https://' + url.toString().replace(domainRegex, hostName));
            xsw.writeEndElement(); // end loc element

            xsw.writeStartElement('lastmod');
                xsw.writeCharacters(new Date(new Date().toUTCString()).toISOString());
            xsw.writeEndElement(); // end lastmod

            xsw.writeStartElement('changefreq');
                xsw.writeCharacters('daily');
            xsw.writeEndElement(); // end changefreq

            xsw.writeStartElement('priority');
                xsw.writeCharacters('0.5');
            xsw.writeEndElement(); // end priority
        xsw.writeEndElement(); // end url element
    }

    /**
     * Responsible for handling which file a url gets written to, and creating a new file if necessary.
     * @param {dw.web.URL} url - A url.
     * @returns {void}
     */
    function handleUrl(url) {
        if (urlCounter === linksPerSitemapFile - 1) {
            // current file is full. Close it. Push the old one. Create a new one.
            xsw.writeEndElement(); // end urlset
            xsw.writeEndDocument();
            xsw.close();
            fileWriter.close();
            allFiles.push(currentFile);
            currentFile = createFile(refinementID, allFiles.length.toString());
            fileWriter = new FileWriter(currentFile, 'UTF-8');
            xsw = new XMLStreamWriter(fileWriter);
            urlCounter = 0;
        }
        writeToFile(url);
        urlCounter++;
    }

    /**
     * Builds a sitemap by writing the refinement url of a given category and it's subcategories to an XML file in the Salesforce system, recursively.
     * @param {dw.catalog.Category} category - A category
     * @returns {void}
     */
    function createSitemap(category) {
        // core work
        if (isValidCategory(category.getID())) {
            try {
                var SRV = getSearchRefinementValues(category.getID());
                if (SRV !== undefined) {
                    SRV.forEach(function (searchRefinementValue) {
                        // Setup Product Search Model to conduct a search on a given category, with a refinement.
                        var PSM = new ProductSearchModel();
                        PSM.setCategoryID(category.getID());
                        PSM.addRefinementValues(refinementID, searchRefinementValue.getValue());

                        PSM.search(); // Execute search.
                        var url = PSM.url('Search-Show').abs();
                        if (url.toString().indexOf('cgid') === -1) { // Prevents urls with cgid parameter from being written to the file.
                            handleUrl(url);
                        }
                    });
                }
            } catch (error) {
                status = new Status(Status.OK, 'WARN', error.toString());
            }
        }

        // Check for subcategories, if they exist then create sitemaps for them too.
        if (category.getSubCategories().getLength() > 0) {
            category.getSubCategories().toArray().forEach(function (subCategory) {
                createSitemap(subCategory);
            });
        }
    }

    // Create sitemaps from all categories and subcategories.
    CatalogMgr.getCatalog(catalogID).getRoot().getSubCategories().toArray()
        .forEach(function (subCategory) {
            createSitemap(subCategory);
        });

    // Upload files.
    allFiles.push(currentFile);
    xsw.writeEndElement(); // end urlset
    xsw.writeEndDocument();
    xsw.close();
    fileWriter.close();
    allFiles.forEach(function (file) {
        SitemapMgr.addCustomSitemapFile(hostName, file);
    });
    return status;
};

exports.deleteCustomSitemapFiles = function(args, stepExecution) {
    var Status = require('dw/system/Status');
    var SitemapMgr = require('dw/sitemap/SitemapMgr');
    var hostName = require('dw/system/Site').getCurrent().getHttpsHostName();
    var status = new Status(Status.OK);
    try {
        SitemapMgr.deleteCustomSitemapFiles(hostName);
    } catch (error) {
        status = new Status(Status.ERROR);
    }
    return status;
};
