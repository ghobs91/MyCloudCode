var url = 'http://svcs.ebay.com/services/search/FindingService/v1';

// Creation of initial userCategory object upon user signup   
Parse.Cloud.define("userCategoryCreate", function(request, response) {
    var userCategory = Parse.Object.extend("userCategory");
    var newUserCategory = new userCategory();
    newUserCategory.set("categoryId", "");
    newUserCategory.set("categoryName");
    newUserCategory.set("minPrice");
    newUserCategory.set("maxPrice");
    newUserCategory.set("itemCondition");
    newUserCategory.set("itemLocation");
    newUserCategory.set("parent", Parse.User.current());
    newUserCategory.save({

        success: function() {
            console.log('userCategory successfully created!');
            response.success('Request successful');
        },

        error: function() {
            console.log('error!!!');
            response.error('Request failed');
        }

    });
});

Parse.Cloud.define("mcComparisonArrayCreate", function(request, response) {
    var mComparisonArray = Parse.Object.extend("MComparisonArray");
    var newMComparisonArray = new mComparisonArray();
    newMComparisonArray.set("Name", "MatchCenter");
    newMComparisonArray.set("parent", Parse.User.current());
    newMComparisonArray.save({

        success: function() {
            console.log('newMComparisonArray successfully created!');
            response.success('Request successful');
        },

        error: function() {
            console.log('error!!!');
            response.error('Request failed');
        }

    });
});

/**
 * Uses the EBay API to search for the item requested by the user. 
 * Requires the 'item' param which is a search string to be sent along as a param to EBay.
 * The 'android' (boolean) param is an optional parameter that is used if the client is running on an android device.
 * All it does is simplify the Map sent to the client as opposed to the mess sent to the iOS client :P
 **/
Parse.Cloud.define("eBayCategorySearch", function(request, response) {

    Parse.Cloud.httpRequest({
        url: url,
        params: {
            'OPERATION-NAME': 'findItemsByKeywords',
            'SERVICE-VERSION': '1.12.0',
            'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
            'GLOBAL-ID': 'EBAY-US',
            'RESPONSE-DATA-FORMAT': 'JSON',
            'itemFilter(0).name=ListingType': 'itemFilter(0).value=FixedPrice',
            'keywords': request.params.item,

        },
        success: function(httpResponse) {
            //Parses results
            var httpresponse = JSON.parse(httpResponse.text);
            var items = [];

            httpresponse.findItemsByKeywordsResponse.forEach(function(itemByKeywordsResponse) {
                itemByKeywordsResponse.searchResult.forEach(function(result) {
                    result.item.forEach(function(item) {
                        items.push(item);
                    });
                });
            });

            //Count number of times each unique primaryCategory shows up (based on categoryId), returns top two IDs and their respective names   
            var categoryIdResults = {};

            // Collect two most frequent categoryIds
            items.forEach(function(item) {
                var id = item.primaryCategory[0].categoryId;
                if (categoryIdResults[id]) categoryIdResults[id]++;
                else categoryIdResults[id] = 1;
            });

            var top2 = Object.keys(categoryIdResults)
                .sort(function(a, b) {
                    return categoryIdResults[b] - categoryIdResults[a];
                }).slice(0, 2);

            console.log('Top category Ids: ' + top2.join(', '));

            var categoryNameResults = {};

            //Collect two most frequent categoryNames  
            items.forEach(function(item) {
                var categoryName = item.primaryCategory[0].categoryName;
                if (categoryNameResults[categoryName]) categoryNameResults[categoryName]++;
                else categoryNameResults[categoryName] = 1;
            });

            var top2Names = Object.keys(categoryNameResults)
                .sort(function(a, b) {
                    return categoryNameResults[b] - categoryNameResults[a];
                }).slice(0, 2);

            console.log('Top category Names: ' + top2Names.join(', '));


            //compare categoryIdResults to userCategory object

            //Extend the Parse.Object class to make the userCategory class
            var userCategory = Parse.Object.extend("userCategory");

            //Use Parse.Query to generate a new query, specifically querying the userCategory object.
            query = new Parse.Query(userCategory);

            //Set constraints on the query.
            query.containedIn('categoryId', top2);
            query.equalTo('parent', Parse.User.current())

            //Submit the query and pass in callback functions.
            var isMatching = false;
            query.find({
                success: function(results) {
                    var userCategoriesMatchingTop2 = results;
                    console.log("userCategory comparison success!");
                    console.log(results);

                    if (userCategoriesMatchingTop2.length > 0) {

                        var matchingItemCategoryId1 = results[0].get("categoryId");
                        console.log(matchingItemCategoryId1);

                        var matchingItemCondition1 = results[0].get("itemCondition");
                        console.log(matchingItemCondition1);

                        var matchingItemLocation1 = results[0].get("itemLocation");
                        console.log(matchingItemLocation1);

                        var matchingMinPrice1 = results[0].get("minPrice");
                        console.log(matchingMinPrice1);

                        var matchingMaxPrice1 = results[0].get("maxPrice");
                        console.log(matchingMaxPrice1);

                        var matchingItemSearch = request.params.item;
                        console.log(matchingItemSearch);

                        var matchingCategoryName1 = results[0].get("categoryName");
                        console.log(matchingCategoryName1);

                        if (userCategoriesMatchingTop2.length > 1) {

                            var matchingItemCategoryId2 = results[1].get("categoryId");
                            console.log(matchingItemCategoryId2);
                            var matchingItemCondition2 = results[1].get("itemCondition");
                            console.log(matchingItemCondition2);
                            var matchingItemLocation2 = results[1].get("itemLocation");
                            console.log(matchingItemLocation2);
                            var matchingMinPrice2 = results[1].get("minPrice");
                            console.log(matchingMinPrice2);
                            var matchingMaxPrice2 = results[1].get("maxPrice");
                            console.log(matchingMaxPrice2);
                            var matchingCategoryName2 = results[1].get("categoryName");
                            console.log(matchingCategoryName2);

                        }
                    }


                    if (userCategoriesMatchingTop2 && userCategoriesMatchingTop2.length > 0) {
                        isMatching = true;
                    }

                    if (request.params.android) {

                        response.success({
                            "top_categories_count": top2.length,
                            "top_categories_ids": top2,
                            "top_categories_names": top2Names,
                            "matches_count": userCategoriesMatchingTop2.length,
                            "matching_categories": userCategoriesMatchingTop2,
                            "category_condition_1": matchingItemCondition1,
                            "category_condition_2": matchingItemCondition2,
                            "category_location_1": matchingItemLocation1,
                            "category_location_2": matchingItemLocation2,
                            "category_max_1": matchingMaxPrice1,
                            "category_max_2": matchingMaxPrice2,
                            "category_min_1": matchingMinPrice1,
                            "category_min_2": matchingMinPrice2,
                            "query_string": matchingItemSearch,
                            "category_id_1": matchingItemCategoryId1,
                            "category_id_2": matchingItemCategoryId2,
                            "category_name_1": matchingCategoryName1,
                            "category_name_2": matchingCategoryName2
                        });
                    } else {
                        response.success({
                            "results": [{
                                "Number of top categories": top2.length
                            }, {
                                "Top category Ids": top2
                            }, {
                                "Top category names": top2Names
                            }, {
                                "Number of matches": userCategoriesMatchingTop2.length
                            }, {
                                "User categories that match search": userCategoriesMatchingTop2
                            }, {
                                "Matching Category Condition 1": matchingItemCondition1
                            }, {
                                "Matching Category Condition 2": matchingItemCondition2
                            }, {
                                "Matching Category Location 1": matchingItemLocation1
                            }, {
                                "Matching Category Location 2": matchingItemLocation2
                            }, {
                                "Matching Category MaxPrice 1": matchingMaxPrice1
                            }, {
                                "Matching Category MaxPrice 2": matchingMaxPrice2
                            }, {
                                "Matching Category MinPrice 1": matchingMinPrice1
                            }, {
                                "Matching Category MinPrice 2": matchingMinPrice2
                            }, {
                                "Search Term": matchingItemSearch
                            }, {
                                "Matching Category Id 1": matchingItemCategoryId1
                            }, {
                                "Matching Category Id 2": matchingItemCategoryId2
                            }, {
                                "Matching Category Name 1": matchingCategoryName1
                            }, {
                                "Matching Category Name 2": matchingCategoryName2
                            }, ]
                        });
                    }
                },
                error: function(error) {
                    //Error Callback
                    console.log("An error has occurred");
                    console.log(error);
                }
            });
        },
        error: function(httpResponse) {
            console.log('error!!!');
            response.error('Request failed with response code ' + httpResponse.status);
        }
    });
});

/**
 * Adds criteria info to userCategory object.
 * Takes a number of parameters: categoryId, categoryName, minPrice, maxPrice, itemCondition, itemLocation.
 **/
Parse.Cloud.define("userCategorySave", function(request, response) {

    var userCategory = Parse.Object.extend("userCategory");
    var newUserCategory = new userCategory();
    newUserCategory.set("categoryId", request.params.categoryId);
    newUserCategory.set("categoryName", request.params.categoryName);
    newUserCategory.set("minPrice", request.params.minPrice);
    newUserCategory.set("maxPrice", request.params.maxPrice);
    newUserCategory.set("itemCondition", request.params.itemCondition);
    newUserCategory.set("itemLocation", request.params.itemLocation);
    newUserCategory.set("parent", Parse.User.current());

    newUserCategory.save({

        success: function() {
            console.log('userCategory successfully created!');
            response.success('userCategory successfully created!');
        },

        error: function() {
            console.log('error!!!');
            response.error('Request failed');
        }
    });
});

// Add new item to MatchCenter Array with the criteria from userCategory instance, plus the search term
Parse.Cloud.define("addToMatchCenter", function(request, response) {

    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var newMatchCenterItem = new matchCenterItem();

    newMatchCenterItem.set("searchTerm", request.params.searchTerm);
    newMatchCenterItem.set("categoryId", request.params.categoryId);
    newMatchCenterItem.set("minPrice", request.params.minPrice);
    newMatchCenterItem.set("maxPrice", request.params.maxPrice);
    newMatchCenterItem.set("itemCondition", request.params.itemCondition);
    newMatchCenterItem.set("itemLocation", request.params.itemLocation);
    newMatchCenterItem.set("itemPriority", request.params.itemPriority);
    newMatchCenterItem.set("parent", Parse.User.current());

    newMatchCenterItem.save({

        success: function() {
            console.log('MatchCenter Item successfully created!');
            response.success('MatchCenter Item successfully created!');
        },

        error: function() {
            console.log('error!!!');
            response.error('Request failed');
        }

    });


});

Parse.Cloud.define("MatchCenter", function(request, response) {
    //defines which parse class to iterate through
    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);
    query.equalTo('parent', Parse.User.current())

    var promises = [];
    var searchTerms = [];

    //setting the limit of items at 10 for now
    query.limit(10);

    query.find().then(function(results) {
        if (results.length > 0) {

            for (i = 0; i < results.length; i++) {
                // ... later in your loop where you populate promises:
                var searchTerm = results[i].get('searchTerm');
                // add it to the array just like you add the promises:
                searchTerms.push(searchTerm);

                //push function containing criteria for every matchCenterItem into promises array
                promises.push((function() {

                    if (results[i].get('itemLocation') == 'US') {
                        console.log('americuh!');
                        var httpRequestPromise = Parse.Cloud.httpRequest({
                            url: url,
                            params: {
                                'OPERATION-NAME': 'findItemsByKeywords',
                                'SERVICE-VERSION': '1.12.0',
                                'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                'GLOBAL-ID': 'EBAY-US',
                                'RESPONSE-DATA-FORMAT': 'JSON',
                                'REST-PAYLOAD&sortOrder': 'BestMatch',
                                'paginationInput.entriesPerPage': '10',
                                //                    'affiliate.trackingId': '5337584338',
                                //                    'affiliate.networkId': '9',
                                'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                'itemFilter(0).value(1)': '1500',
                                'itemFilter(0).value(2)': results[i].get('itemCondition'),
                                'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                'itemFilter(3).name=LocatedIn&itemFilter(3).value': 'US',
                                'itemFilter(4).name=ListingType&itemFilter(4).value': 'FixedPrice',
                                'keywords': results[i].get('searchTerm'),
                            }
                        });
                    } else if (results[i].get('itemLocation') == 'WorldWide') {
                        console.log('Mr worlwide!');
                        var httpRequestPromise = Parse.Cloud.httpRequest({
                            url: url,
                            params: {
                                'OPERATION-NAME': 'findItemsByKeywords',
                                'SERVICE-VERSION': '1.12.0',
                                'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                'GLOBAL-ID': 'EBAY-US',
                                'RESPONSE-DATA-FORMAT': 'JSON',
                                'REST-PAYLOAD&sortOrder': 'BestMatch',
                                'paginationInput.entriesPerPage': '10',
                                //                    'affiliate.trackingId': '5337584338',
                                //                    'affiliate.networkId': '9',
                                'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                'itemFilter(0).value(1)': '1500',
                                'itemFilter(0).value(2)': results[i].get('itemCondition'),
                                'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                // 'itemFilter(3).name=LocatedIn&itemFilter(3).value' : 'US',
                                'itemFilter(3).name=ListingType&itemFilter(3).value': 'FixedPrice',
                                'keywords': results[i].get('searchTerm'),
                            }
                        });
                    }

                    return httpRequestPromise
                })());
            }
        }

        //when finished pushing all the httpRequest functions into promise array, do the following  
        Parse.Promise.when(promises).then(function(results) {

            var eBayResults = [];

            for (var i = 0; i < arguments.length; i++) {
                var httpResponse = arguments[i];
                // since they're in the same order, this is OK:
                var searchTerm = searchTerms[i];
                // pass it as a param:
                var top3 = collectEbayResults(httpResponse.text, searchTerm)
                eBayResults.push(top3);
            };

            console.log('izayak habibi, eBayResults are the following:' + eBayResults);

            function collectEbayResults(eBayResponseText, searchTerm) {

                console.log('so heres what the ebayresponsetext iz:' + eBayResponseText);
                var ebayResponse = JSON.parse(eBayResponseText)

                var matchCenterItems = [];

                //Parses through ebay's response, pushes each individual item and its properties into an array  
                ebayResponse.findItemsByKeywordsResponse.forEach(function(itemByKeywordsResponse) {
                    itemByKeywordsResponse.searchResult.forEach(function(result) {

                        if (result.item) {
                            result.item.forEach(function(item) {
                                matchCenterItems.push(item);
                            });
                        }

                    });
                });

                var top3Titles = [];
                var top3Prices = [];
                var top3ImgURLS = [];
                var top3ItemURLS = [];

                //where the title, price, and img url are sent over to the app
                matchCenterItems.forEach(function(item) {
                    var title = item.title[0];
                    var price = item.sellingStatus[0].convertedCurrentPrice[0].__value__;
                    var imgURL = item.galleryURL[0];
                    var itemURL = item.viewItemURL[0];

                    top3Titles.push(title);
                    top3Prices.push(price);
                    top3ImgURLS.push(imgURL);
                    top3ItemURLS.push(itemURL);
                });


                var top3 = {
                    "Top 3": [

                        {
                            "Title": top3Titles[0],
                            "Price": top3Prices[0],
                            "Image URL": top3ImgURLS[0],
                            "Item URL": top3ItemURLS[0]
                        },

                        {
                            "Title": top3Titles[1],
                            "Price": top3Prices[1],
                            "Image URL": top3ImgURLS[1],
                            "Item URL": top3ItemURLS[1]
                        },

                        {
                            "Title": top3Titles[2],
                            "Price": top3Prices[2],
                            "Image URL": top3ImgURLS[2],
                            "Item URL": top3ItemURLS[2]
                        },

                        {
                            "Search Term": searchTerm
                        }
                    ]
                }
                return top3
            }

            eBayResults.reverse();

            response.success(
                eBayResults
            );

        }, function(err) {
            console.log('error!');
            response.error('DAMN IT MAN');
        });
    });
});

Parse.Cloud.define("MatchCenter2", function(request, response) {
    //defines which parse class to iterate through
    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);
    query.equalTo('parent', Parse.User.current());

    var promises = [];
    var searchTerms = [];

    //setting the limit of items at 10 for now
    query.limit(20);

    query.find().then(function(results) {
        if (results.length > 0) {

            for (i = 0; i < results.length; i++) {
                // ... later in your loop where you populate promises:
                var searchTerm = results[i].get('searchTerm');
                // add it to the array just like you add the promises:
                searchTerms.push(searchTerm);


                //push function containing criteria for every matchCenterItem into promises array
                promises.push((function() {

                    if (results[i].get('itemLocation') == 'US') {
                        console.log('americuh!');
                        var httpRequestPromise = Parse.Cloud.httpRequest({
                            url: url,
                            params: {
                                'OPERATION-NAME': 'findItemsByKeywords',
                                'SERVICE-VERSION': '1.12.0',
                                'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                'GLOBAL-ID': 'EBAY-US',
                                'RESPONSE-DATA-FORMAT': 'JSON',
                                'REST-PAYLOAD&sortOrder': 'BestMatch',
                                'paginationInput.entriesPerPage': '10',
                                //                    'affiliate.trackingId': '5337584338',
                                //                    'affiliate.networkId': '9',
                                'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                'itemFilter(0).value(1)': '1500',
                                'itemFilter(0).value(2)': results[i].get('itemCondition'),
                                'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                'itemFilter(3).name=LocatedIn&itemFilter(3).value': 'US',
                                'itemFilter(4).name=ListingType&itemFilter(4).value': 'FixedPrice',
                                'keywords': results[i].get('searchTerm'),
                            }
                        });
                    } else if (results[i].get('itemLocation') == 'WorldWide') {
                        console.log('Mr worlwide!');
                        var httpRequestPromise = Parse.Cloud.httpRequest({
                            url: url,
                            params: {
                                'OPERATION-NAME': 'findItemsByKeywords',
                                'SERVICE-VERSION': '1.12.0',
                                'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                'GLOBAL-ID': 'EBAY-US',
                                'RESPONSE-DATA-FORMAT': 'JSON',
                                'REST-PAYLOAD&sortOrder': 'BestMatch',
                                'paginationInput.entriesPerPage': '10',
                                //                    'affiliate.trackingId': '5337584338',
                                //                    'affiliate.networkId': '9',
                                'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                'itemFilter(0).value(1)': '1500',
                                'itemFilter(0).value(2)': results[i].get('itemCondition'),
                                'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                // 'itemFilter(3).name=LocatedIn&itemFilter(3).value' : 'US',
                                'itemFilter(3).name=ListingType&itemFilter(3).value': 'FixedPrice',
                                'keywords': results[i].get('searchTerm'),
                            }
                        });
                    }

                    return httpRequestPromise;
                })());
            }
        }

        //when finished pushing all the httpRequest functions into promise array, do the following  
        Parse.Promise.when(promises).then(function(results) {

            var eBayResults = [];

            for (var i = 0; i < arguments.length; i++) {
                var httpResponse = arguments[i];
                // since they're in the same order, this is OK:
                var searchTerm = searchTerms[i];
                // pass it as a param:
                var top3 = collectEbayResults(httpResponse.text, searchTerm);
                eBayResults.push(top3);
            };

            console.log('izayak habibi, eBayResults are the following:' + eBayResults);

            function collectEbayResults(eBayResponseText, searchTerm) {

                console.log('so heres what the ebayresponsetext iz:' + eBayResponseText);
                var ebayResponse = JSON.parse(eBayResponseText);

                var matchCenterItems = [];

                //Parses through ebay's response, pushes each individual item and its properties into an array  
                ebayResponse.findItemsByKeywordsResponse.forEach(function(itemByKeywordsResponse) {
                    itemByKeywordsResponse.searchResult.forEach(function(result) {

                        if (result.item) {
                            result.item.forEach(function(item) {
                                console.log('Heres the item before i push it into matchCenterItems:' + item);
                                matchCenterItems.push(item);
                            });
                        }

                    });
                });

                var top3Titles = [];
                var top3Prices = [];
                var top3ImgURLS = [];
                var top3ItemURLS = [];

                //where the title, price, and img url are sent over to the app
                matchCenterItems.forEach(function(item) {
                    var title = item.title[0];
                    var price = item.sellingStatus[0].convertedCurrentPrice[0].__value__;
                    var imgURL = item.galleryURL[0];
                    var itemURL = item.viewItemURL[0];

                    top3Titles.push(title);
                    top3Prices.push(price);
                    top3ImgURLS.push(imgURL);
                    top3ItemURLS.push(itemURL);
                });

                // 10 results per MC Item, only showing 4 by default
                var top3 = {
                    "Top 3": [{
                            "Search Term": searchTerm
                        },

                        {
                            "Title": top3Titles[0],
                            "Price": top3Prices[0],
                            "Image URL": top3ImgURLS[0],
                            "Item URL": top3ItemURLS[0]
                        },

                        {
                            "Title": top3Titles[1],
                            "Price": top3Prices[1],
                            "Image URL": top3ImgURLS[1],
                            "Item URL": top3ItemURLS[1]
                        },

                        {
                            "Title": top3Titles[2],
                            "Price": top3Prices[2],
                            "Image URL": top3ImgURLS[2],
                            "Item URL": top3ItemURLS[2]
                        },

                        {
                            "Title": top3Titles[3],
                            "Price": top3Prices[3],
                            "Image URL": top3ImgURLS[3],
                            "Item URL": top3ItemURLS[3]
                        },

                        {
                            "Title": top3Titles[4],
                            "Price": top3Prices[4],
                            "Image URL": top3ImgURLS[4],
                            "Item URL": top3ItemURLS[4]
                        },

                        {
                            "Title": top3Titles[5],
                            "Price": top3Prices[5],
                            "Image URL": top3ImgURLS[5],
                            "Item URL": top3ItemURLS[5]
                        },

                        {
                            "Title": top3Titles[6],
                            "Price": top3Prices[6],
                            "Image URL": top3ImgURLS[6],
                            "Item URL": top3ItemURLS[6]
                        },

                        {
                            "Title": top3Titles[7],
                            "Price": top3Prices[7],
                            "Image URL": top3ImgURLS[7],
                            "Item URL": top3ItemURLS[7]
                        },

                        {
                            "Title": top3Titles[8],
                            "Price": top3Prices[8],
                            "Image URL": top3ImgURLS[8],
                            "Item URL": top3ItemURLS[8]
                        },

                        {
                            "Title": top3Titles[9],
                            "Price": top3Prices[9],
                            "Image URL": top3ImgURLS[9],
                            "Item URL": top3ItemURLS[9]
                        },

                    ]
                };
                return top3;
            }

            eBayResults.reverse();

            response.success(
                eBayResults
            );

        }, function(err) {
            console.log('error!');
            response.error('DAMN IT MAN');
        });
    });
});

// Current MatchCenter being used, the others are kept for legacy purposes.
Parse.Cloud.define("MatchCenter3", function(request, response) {
    //defines which parse class to iterate through
    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);
    query.equalTo('parent', Parse.User.current());

    var promises = [];
    var searchTerms = [];

    //setting the limit of items at 10 for now
    query.limit(20);

    query.find()
        .then(function(results) {
            if (results.length > 0) {

                for (i = 0; i < results.length; i++) {
                    // ... later in your loop where you populate promises:
                    var searchTerm = results[i].get('searchTerm');
                    // add it to the array just like you add the promises:
                    searchTerms.push(searchTerm);


                    //push function containing criteria for every matchCenterItem into promises array
                    promises.push((function() {

                        if (results[i].get('itemLocation') == 'US') {
                            console.log('americuhh!');
                            var httpRequestPromise = Parse.Cloud.httpRequest({
                                url: url,
                                params: {
                                    'OPERATION-NAME': 'findItemsByKeywords',
                                    'SERVICE-VERSION': '1.12.0',
                                    'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                    'GLOBAL-ID': 'EBAY-US',
                                    'RESPONSE-DATA-FORMAT': 'JSON',
                                    'REST-PAYLOAD&sortOrder': 'BestMatch',
                                    'paginationInput.entriesPerPage': '10',
                                    //                  'affiliate.trackingId': '5337584338',
                                    //                  'affiliate.networkId': '9',
                                    'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                    'itemFilter(0).value(1)': '1500',
                                    'itemFilter(0).value(2)': results[i].get('itemCondition'),
                                    'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                    'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                    'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                    'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                    'itemFilter(3).name=LocatedIn&itemFilter(3).value': 'US',
                                    'itemFilter(4).name=ListingType&itemFilter(4).value': 'FixedPrice',
                                    'keywords': results[i].get('searchTerm'),
                                }
                            });
                        } else if (results[i].get('itemLocation') == 'WorldWide') {
                            console.log('Mr worlwide!');
                            var httpRequestPromise = Parse.Cloud.httpRequest({
                                url: url,
                                params: {
                                    'OPERATION-NAME': 'findItemsByKeywords',
                                    'SERVICE-VERSION': '1.12.0',
                                    'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                    'GLOBAL-ID': 'EBAY-US',
                                    'RESPONSE-DATA-FORMAT': 'JSON',
                                    'REST-PAYLOAD&sortOrder': 'BestMatch',
                                    'paginationInput.entriesPerPage': '10',
                                    //                  'affiliate.trackingId': '5337584338',
                                    //                  'affiliate.networkId': '9',
                                    'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                    'itemFilter(0).value(1)': '1500',
                                    'itemFilter(0).value(2)': results[i].get('itemCondition'),
                                    'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                    'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                    'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                    'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                    // 'itemFilter(3).name=LocatedIn&itemFilter(3).value' : 'US',
                                    'itemFilter(3).name=ListingType&itemFilter(3).value': 'FixedPrice',
                                    'keywords': results[i].get('searchTerm'),
                                }
                            });
                        }

                        return httpRequestPromise;
                    })());
                }
            }

            //when finished pushing all the httpRequest functions into promise array, do the following  
            Parse.Promise.when(promises)
                .then(function(results) {

                    var eBayResults = [];

                    for (var i = 0; i < arguments.length; i++) {
                        var httpResponse = arguments[i];
                        // since they're in the same order, this is OK:
                        var searchTerm = searchTerms[i];
                        // If no httpResponse, use "nada" version so it doesn't fail
                        var httpResponseBackup = '{"findItemsByKeywordsResponse":[{"searchResult":["nada"]}]}'

                        if (httpResponse) {
                            console.log('the httpResponse.text were about to use is:' + httpResponse.text);
                            var top3 = collectEbayResults(httpResponse.text, searchTerm);
                        } else {
                            var top3 = collectEbayResults(httpResponseBackup, searchTerm);
                        }
                        eBayResults.push(top3);
                        //            var top3 = collectEbayResults(httpResponse.text, searchTerm);
                        //            eBayResults.push(top3);
                    };

                    console.log('izayak habibi, eBayResults are the following:' + eBayResults);

                    function collectEbayResults(eBayResponseText, searchTerm) {

                        console.log('so heres what the ebayresponsetext iz:' + eBayResponseText);
                        var ebayResponse = JSON.parse(eBayResponseText);

                        var matchCenterItems = [];
                        //Parses through ebay's response, pushes each individual item and its properties into an array  
                        ebayResponse.findItemsByKeywordsResponse.forEach(function(itemByKeywordsResponse)                         {
                            if (itemByKeywordsResponse.searchResult) {
                                itemByKeywordsResponse.searchResult.forEach(function(result) {
                                    if (result.item) {
                                        result.item.forEach(function(item) {
                                            matchCenterItems.push(item);
                                        });
                                    }
                                });
                            }
                        });

                        // Creates array of items and their properties for every MC Item
                        var top3 = {
                            'Top 3': [{
                                "Search Term": searchTerm
                            }]
                        };

                        matchCenterItems.forEach(function(item) {

                            //              if (item.galleryURL[0]){
                            //                var imageURL = item.galleryURL[0];
                            //              }
                            //              else{
                            //                var imageUrl = someErrorImageURL;
                            //              } 

                            top3['Top 3'].push({
                                'Title': item.title[0],
                                'Price': item.sellingStatus[0].convertedCurrentPrice[0].__value__,
                                'Image URL': item.galleryURL[0],
                                'Item URL': item.viewItemURL[0],
                                'Item Condition': item.condition[0].conditionDisplayName[0]
                            });

                        });

                        return top3;
                    }

                    eBayResults.reverse();

                    response.success(
                        eBayResults
                    );

                }, function(err) {
                    console.log('error!');
                    response.error('DAMN IT MAN');
                });
        });
});


// Checks for new matches serverside to determine if user should receive Push Notification
Parse.Cloud.job("MatchCenterBackground", function(request, status) {
    // ... other code to setup usersQuery ...
    Parse.Cloud.useMasterKey();
    var usersQuery = new Parse.Query(Parse.User);

    return usersQuery.each(function(user) {
            return processUser(user)
                .then(function(eBayResults) {
                    return matchCenterComparison(user, eBayResults);
                });
        })
        .then(function() {
            // Set the job's success status
            status.success("MatchCenterBackground completed successfully.");
        }, function(error) {
            // Set the job's error status
            status.error("Got an error " + error.code + " : " + error.message);
        });
});

// process user, return promise
function processUser(user) {
    // ... code to setup per-user query ...
    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);
    query.equalTo('parent', user);

    // easy way to share multiple arrays
    var shared = {
        promises: [],
        searchTerms: [],
    };

    return query.find()
        .then(function(results) {
            // process results, populate shared data (promises and searchTerms)
            console.log('matchCenterItem query results:' + results);
            if (results.length > 0) {
                console.log('User has MatchCenter Item/s');
                // Loop through MatchCenter Items
                for (i = 0; i < results.length; i++) {

                    console.log('About to loop through MatchCenter Items');
                    // later in your loop where you populate promises:
                    var searchTerm = results[i].get('searchTerm');
                    // add it to the array just like you add the promises:
                    shared.searchTerms.push(searchTerm);


                    //push function containing criteria for every matchCenterItem into promises array
                    shared.promises.push((function() {

                        if (results[i].get('itemLocation') == 'US') {
                            console.log('americuh!');
                            var httpRequestPromise = Parse.Cloud.httpRequest({
                                url: url,
                                params: {
                                    'OPERATION-NAME': 'findItemsByKeywords',
                                    'SERVICE-VERSION': '1.12.0',
                                    'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                    'GLOBAL-ID': 'EBAY-US',
                                    'RESPONSE-DATA-FORMAT': 'JSON',
                                    'REST-PAYLOAD&sortOrder': 'BestMatch',
                                    'paginationInput.entriesPerPage': '3',
                                    'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                    'itemFilter(0).value(1)': results[i].get('itemCondition'),
                                    'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                    'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                    'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                    'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                    'itemFilter(3).name=LocatedIn&itemFilter(3).value': 'US',
                                    'itemFilter(4).name=ListingType&itemFilter(4).value': 'FixedPrice',
                                    'keywords': results[i].get('searchTerm'),
                                }
                            });
                        } else if (results[i].get('itemLocation') == 'WorldWide') {
                            console.log('Mr worlwide!');
                            var httpRequestPromise = Parse.Cloud.httpRequest({
                                url: url,
                                params: {
                                    'OPERATION-NAME': 'findItemsByKeywords',
                                    'SERVICE-VERSION': '1.12.0',
                                    'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                    'GLOBAL-ID': 'EBAY-US',
                                    'RESPONSE-DATA-FORMAT': 'JSON',
                                    'REST-PAYLOAD&sortOrder': 'BestMatch',
                                    'paginationInput.entriesPerPage': '3',
                                    'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                    'itemFilter(0).value(1)': results[i].get('itemCondition'),
                                    'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                    'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                    'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                    'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                    'itemFilter(3).name=ListingType&itemFilter(3).value': 'FixedPrice',
                                    'keywords': results[i].get('searchTerm'),
                                }
                            });
                        }

                        return httpRequestPromise;
                    })());
                }
            }

            //buildEbayRequestPromises(results, shared);
        })
        .then(function() {
            // process promises, return query promise
            return Parse.Promise.when(shared.promises)
                .then(function() {

                    // process the results of the promises, returning a query promise
                    console.log('were in the when.then of promise');

                    var eBayResults = [];

                    for (var i = 0; i < arguments.length; i++) {
                        var httpResponse = arguments[i];
                        // since they're in the same order, this is OK:
                        var searchTerm = shared.searchTerms[i];

                        // If no httpResponse, use "nada" version so it doesn't fail
                        var httpResponseBackup = '{"findItemsByKeywordsResponse":[{"searchResult":["nada"]}]}'

                        if (httpResponse) {
                            console.log('the httpResponse.text were about to use is:' + httpResponse.text);
                            var top3 = buildEbayRequestPromises(httpResponse.text, searchTerm);
                        } else {
                            var top3 = buildEbayRequestPromises(httpResponseBackup, searchTerm);
                        }

                        eBayResults.push(top3);
                    }

                    return eBayResults;
                });
        });
}

// process matchCenterItem results to build eBay promises
function buildEbayRequestPromises(eBayResponseText, shared) {
    // ... code that pushes items into shared.promises and shared.searchTerms ...

    var ebayResponse = JSON.parse(eBayResponseText);
    var matchCenterItems = [];

    //Parses through ebay's response, pushes each individual item and its properties into an array  
    ebayResponse.findItemsByKeywordsResponse.forEach(function(itemByKeywordsResponse) {
        if (itemByKeywordsResponse.searchResult) {
            itemByKeywordsResponse.searchResult.forEach(function(result) {

                if (result.item) {
                    result.item.forEach(function(item) {
                        matchCenterItems.push(item);
                    });
                }

            });
        }
    });

    //where the title, price, and img url are set

    if (matchCenterItems.length > 0) {

        console.log('about to define top3 value');
        //Top 3 item info for every MatchCenterItem
        // Creates array of items and their properties for every MC Item
        var top3 = {
            'Top 3': []
        };

        matchCenterItems.forEach(function(item) {
            top3['Top 3'].push({
                'Title': item.title[0],
                'Price': item.sellingStatus[0].convertedCurrentPrice[0].__value__,
                'Item URL': item.viewItemURL[0]
            });
        });

    }
    return top3;
}

// compare eBayResults to the users MCItems Array in their MComparisonArray object
function matchCenterComparison(parentUser, eBayResults) {

    console.log('izayak habibi, eBayResults are the following:' + eBayResults);

    var matchCenterComparisonPromise = new Parse.Promise();

    // if the user has MatchCenter items, do this:

    console.log('ando ishal');

    // If eBay finds results for at least 
    if (eBayResults.length > 0) {
        console.log('yes the ebay results be longer than 0');

        var mComparisonArray = Parse.Object.extend("MComparisonArray");
        var mComparisonQuery = new Parse.Query(mComparisonArray);

        // Query that compares MCItems array contents to eBayResults
        mComparisonQuery.equalTo('parent', parentUser);
        mComparisonQuery.contains('Name', 'MatchCenter');
        mComparisonQuery.containedIn('MCItems', eBayResults);

        console.log('setup query criteria, about to run it');
        mComparisonQuery.find()
            .then(function(results) {
                //No new items                      
                if (results.length > 0) {
                    console.log("No new items, you're good to go!");

                    //Add user to the "DON'T send push notification" channel
                    ////////
                    var installationQuery = new Parse.Query(Parse.Installation);
                    installationQuery.equalTo('userId', parentUser);

                    installationQuery.first()
                        .then(function(result) {
                            if (result) {
                                result.set('channels', ["noPush"]);
                                result.save();
                            }

                        });
                    ///////
                    console.log('done updating channel');
                }

                //New items found
                else if (results.length === 0) {
                    console.log('no matching mComparisonArray, lets push some new shit');

                    var mComparisonEditQuery = new Parse.Query(mComparisonArray);
                    mComparisonEditQuery.contains('Name', 'MatchCenter');
                    mComparisonEditQuery.equalTo('parent', parentUser);

                    console.log('setup query criteria again, about to run it');

                    // Update MComparisonArray with new eBayResults
                    mComparisonEditQuery.find()
                        .then(function(results) {
                            if (results.length > 0) {
                                results[0].set('MCItems', eBayResults);
                                results[0].save();
                            }


                            console.log('totally just updated the mComparisonArray, NBD');
                        })
                        .then(function() {
                            // Check for high priority MC items
                            var matchCenterItem = Parse.Object.extend("matchCenterItem");
                            var matchCenterItemQuery = new Parse.Query(matchCenterItem);
                            matchCenterItemQuery.equalTo('parent', parentUser);
                            matchCenterItemQuery.contains('itemPriority', 'High');

                            matchCenterItemQuery.find()
                                .then(function(results) {
                                    if (results.length > 0) {
                                        //Add user to the "highPush" notification channel
                                        var installationQuery = new Parse.Query(Parse.Installation);
                                        installationQuery.equalTo('userId', parentUser);

                                        installationQuery.first()
                                            .then(function(result) {

                                                if (result) {
                                                    result.set('channels', ["highPush"]);
                                                    result.save();
                                                }

                                            });
                                        console.log('set it to high push');
                                    } else {
                                        //Add user to the "lowPush" notification channel
                                        var installationQuery = new Parse.Query(Parse.Installation);
                                        installationQuery.equalTo('userId', parentUser);

                                        installationQuery.first()
                                            .then(function(result) {
                                                result.set('channels', ["lowPush"]);
                                                result.save();
                                            });
                                        console.log('set it to low push');
                                    }
                                });
                            console.log('done updating channel');
                        });
                }
            });
        matchCenterComparisonPromise.resolve(console.log('MatchCenterComparison Suceeded sen!'));
    } else {
        matchCenterComparisonPromise.reject({
            message: 'No work done, expression failed'
        });
    }
    //return matchCenterComparisonPromise;  

}



Parse.Cloud.job("MatchCenterBackgroundTEST", function(request, status) {
    // ... other code to setup usersQuery ...
    Parse.Cloud.useMasterKey();
    var usersQuery = new Parse.Query(Parse.User);

    // For each user in the DB...       
    return usersQuery.each(function(user) {
            // Run processUser fxn
            return processUserTEST(user)
                .then(function(MCI_Comparison_Data) {
                    // Then run matchCenterComparison using the eBayResults returned
                    return matchCenterComparisonTEST(user, MCI_Comparison_Data);
                });
        })
        .then(function() {
            // Set the job's success status
            status.success("MatchCenterBackground completed successfully.");
        }, function(error) {
            // Set the job's error status
            status.error("Got an error " + error.code + " : " + error.message);
        });
});

// Ping eBay with all matchCenterItems and their criteria (price, condition, location) 
function processUserTEST(user) {
    // ... code to setup per-user query ...
    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);
    query.equalTo('parent', user);

    // easy way to share multiple arrays
    var shared = {
        promises: [],
        searchTerms: [],
        itemPriorities: [],
    };

    // Once all matchCenterItems are returned...
    return query.find()
        .then(function(results) {
            // process results, populate shared data (promises and searchTerms)
            //console.log('matchCenterItem query results:' + results);

            // If user has at least one matchCenterItem...
            if (results.length > 0) {
                console.log('User has MatchCenter Items');
                // For every matchCenterItem...
                for (i = 0; i < results.length; i++) {

                    console.log('About to loop through MatchCenter Items');
                    // later in your loop where you populate promises:

                    // get the matchCenterItem's searchTerm    
                    var searchTerm = results[i].get('searchTerm');

                    // get the matchCenterItem's itemPriority
                    var itemPriority = results[i].get('itemPriority');

                    // Add respective searchTerm to the searchTerms Array
                    shared.searchTerms.push(searchTerm);

                    // Add respective itemPriority to the itemPriorities Array    
                    shared.itemPriorities.push(itemPriority);


                    //push function containing criteria for every matchCenterItem into promises array
                    shared.promises.push((function() {
                        // If item location = US... 
                        if (results[i].get('itemLocation') == 'US') {
                            console.log('americuh!');
                            var httpRequestPromise = Parse.Cloud.httpRequest({
                                url: url,
                                params: {
                                    'OPERATION-NAME': 'findItemsByKeywords',
                                    'SERVICE-VERSION': '1.12.0',
                                    'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                    'GLOBAL-ID': 'EBAY-US',
                                    'RESPONSE-DATA-FORMAT': 'JSON',
                                    'REST-PAYLOAD&sortOrder': 'BestMatch',
                                    'paginationInput.entriesPerPage': '3',
                                    'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                    'itemFilter(0).value(1)': results[i].get('itemCondition'),
                                    'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                    'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                    'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                    'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                    'itemFilter(3).name=LocatedIn&itemFilter(3).value': 'US',
                                    'itemFilter(4).name=ListingType&itemFilter(4).value': 'FixedPrice',
                                    'keywords': results[i].get('searchTerm'),
                                }
                            });
                        }
                        // If item location = WorldWide... 
                        else if (results[i].get('itemLocation') == 'WorldWide') {
                            console.log('Mr worlwide!');
                            var httpRequestPromise = Parse.Cloud.httpRequest({
                                url: url,
                                params: {
                                    'OPERATION-NAME': 'findItemsByKeywords',
                                    'SERVICE-VERSION': '1.12.0',
                                    'SECURITY-APPNAME': 'AndrewGh-2d30-4c8d-a9cd-248083bc4d0f',
                                    'GLOBAL-ID': 'EBAY-US',
                                    'RESPONSE-DATA-FORMAT': 'JSON',
                                    'REST-PAYLOAD&sortOrder': 'BestMatch',
                                    'paginationInput.entriesPerPage': '3',
                                    'outputSelector=AspectHistogram&itemFilter(0).name=Condition&itemFilter(0).value(0)': 'New',
                                    'itemFilter(0).value(1)': results[i].get('itemCondition'),
                                    'itemFilter(1).name=MaxPrice&itemFilter(1).value': results[i].get('maxPrice'),
                                    'itemFilter(1).paramName=Currency&itemFilter(1).paramValue': 'USD',
                                    'itemFilter(2).name=MinPrice&itemFilter(2).value': results[i].get('minPrice'),
                                    'itemFilter(2).paramName=Currency&itemFilter(2).paramValue': 'USD',
                                    'itemFilter(3).name=ListingType&itemFilter(3).value': 'FixedPrice',
                                    'keywords': results[i].get('searchTerm'),
                                }
                            });
                        }

                        return httpRequestPromise;
                    })());
                }
            }

            //buildEbayRequestPromises(results, shared);
        })
        .then(function() {
            // process promises, return query promise
            return Parse.Promise.when(shared.promises)
                .then(function() {
                    // process the results of the promises, returning a query promise

                    var MCI_Comparison_Data = {
                        top3List: [],
                        searchTermsList: [],
                        itemPrioritiesList: [],
                    };

                    for (var i = 0; i < arguments.length; i++) {
                        var httpResponse = arguments[i];

                        // since they're in the same order, this is OK:
                        var searchTerm = shared.searchTerms[i];
                        var itemPriority = shared.itemPriorities[i];



                        // If no httpResponse, use "nada" version so it doesn't fail
                        var httpResponseBackup = '{"findItemsByKeywordsResponse":[{"searchResult":["nada"]}]}'

                        if (httpResponse) {
                            console.log('the httpResponse.text were about to use is:' + httpResponse.text);
                            var BERP_Result = buildEbayRequestPromisesTEST(httpResponse.text, searchTerm);
                        } else {
                            var BERP_Result = buildEbayRequestPromisesTEST(httpResponseBackup, searchTerm);
                        }


                        //            //console.log('The httpResponse.text we use is this:' + httpResponse.text);
                        //            console.log('The searchTerm we use is this:' + searchTerm);
                        //              
                        //            var BERP_Result = buildEbayRequestPromisesTEST(httpResponse.text, searchTerm);
                        //              
                        //            console.log ('buildEbayRequestPromisesResult:' + BERP_Result);

                        if (BERP_Result !== false) {

                            console.log('BERP_Result isnt false! Yay!');

                            MCI_Comparison_Data.top3List.push(BERP_Result['Top 3']);
                            MCI_Comparison_Data.searchTermsList.push(searchTerm);

                            console.log('The searchTerm here iiiiiiiiiisss:' + shared.searchTerms[i]);
                            // Check to see if MCI_Item entry exists
                            var MCI_Results = Parse.Object.extend("MCI_Results");
                            var MCI_Results_Query = new Parse.Query(MCI_Results);
                            MCI_Results_Query.equalTo('parent', user);
                            MCI_Results_Query.contains('searchTerm', searchTerm);

                            MCI_Results_Query.find()
                                .then(function(results) {
                                    // If MCI_Item entry doesn't exist yet, create it
                                    if (results.length < 1) {

                                        console.log('no MCI_Results entry, lets make it.');
                                        var newMCI_Results = new MCI_Results();

                                        newMCI_Results.set("searchTerm", searchTerm);
                                        newMCI_Results.set("itemPriority", itemPriority);
                                        newMCI_Results.set("Results", BERP_Result['Top 3']);
                                        newMCI_Results.set("parent", user);
                                        newMCI_Results.save();

                                        console.log('this is the part where the item shouldve been saved');
                                    }
                                });
                        } else {
                            console.log('dude isnt following any items broski');
                        }
                    }

                    return MCI_Comparison_Data;
                });
        });
}

// process matchCenterItem results to build eBay promises
function buildEbayRequestPromisesTEST(eBayResponseText, shared) {
    // ... code that pushes items into shared.promises and shared.searchTerms ...

    var ebayResponse = JSON.parse(eBayResponseText);
    var matchCenterItems = [];

    //Parses through ebay's response, pushes each individual item and its properties into an array  
    ebayResponse.findItemsByKeywordsResponse.forEach(function(itemByKeywordsResponse) {
        if (itemByKeywordsResponse.searchResult) {
            itemByKeywordsResponse.searchResult.forEach(function(result) {
                if (result.item) {
                    result.item.forEach(function(item) {
                        matchCenterItems.push(item);
                    });
                }
            });
        }
    });

    //where the title, price, and img url are set

    if (matchCenterItems.length > 0) {
        //console.log('about to define top3 value');
        //Top 3 item info for every MatchCenterItem
        // Creates array of items and their properties for every MC Item
        var top3 = {
            'Top 3': []
        };

        matchCenterItems.forEach(function(item) {
            top3['Top 3'].push({
                'Title': item.title[0],
                'Price': item.sellingStatus[0].convertedCurrentPrice[0].__value__,
                'Item URL': item.viewItemURL[0]
            });
        });

        return top3;
    } else {
        return false;
    }

}

// compare eBayResults to the users MCItems Array in their MComparisonArray object
function matchCenterComparisonTEST(user, MCI_Comparison_Data) {

        var matchCenterComparisonPromise = new Parse.Promise();

        var top3List = MCI_Comparison_Data.top3List;
        var searchTermsList = MCI_Comparison_Data.searchTermsList;

        // If eBay finds results for at least one MCI
        if (searchTermsList.length > 0) {
            console.log('yes the ebay results be longer than 0');

            for (var i = 0;
                (i < top3List.length) && (i < searchTermsList.length); i++) {

                console.log('searchTermsList[i] is:' + searchTermsList[i]);
                console.log('top3List[i] is:' + top3List[i]);

                var DaSearchTerm = searchTermsList[i];
                var DaTop3List = top3List[i];

                console.log('DaSearchTerm is:' + DaSearchTerm);
                console.log('DaTop3List is:' + DaTop3List);

                var MCI_Results = Parse.Object.extend("MCI_Results");
                var MCI_Results_Comparison_Query = new Parse.Query(MCI_Results);

                // Compare respective items' MCI_Results array to eBay results (top3List[i])
                MCI_Results_Comparison_Query.equalTo('parent', user);
                MCI_Results_Comparison_Query.contains('searchTerm', DaSearchTerm);
                MCI_Results_Comparison_Query.containsAll('Results', DaTop3List);

                MCI_Results_Comparison_Query.find()
                    .then(function(results) {
                        console.log('results length iiizzzzzz:' + results.length);

                        // No new items, Results and top3List[i] are identical                     
                        if (results.length > 0) {
                            console.log("No new items, you're good to go!");

                            // Find MCI_Results objects for user
                            var MCI_Results_Update_Query = new Parse.Query(MCI_Results);
                            MCI_Results_Update_Query.equalTo('parent', user);

                            // Update MCI_Results newMatch status to "NO"
                            MCI_Results_Update_Query.find()
                                .then(function(results) {
                                    if (results) {

                                        for (i = 0; i < results.length; i++) {
                                            results[i].set('newMatch', 'NO');
                                            results[i].save();
                                        }
                                        console.log('totally just updated the MCI_Results, NBD');
                                    }
                                })

                            //Add user to the "DON'T send push notification" channel
                            ////////
                            var installationQuery = new Parse.Query(Parse.Installation);
                            installationQuery.equalTo('userId', user);

                            installationQuery.first().then(function(result) {
                                result.set('channels', ["noPush"]);
                                result.save();
                            });
                            ///////
                            console.log('done updating channel');
                        }

                        // New items found, Results and top3List[i] don't match
                        else {
                            console.log('no matching MCI_Results, lets push some new hit');

                            // Find MCI_Results object for specific item
                            var MCI_Results_Update_Query = new Parse.Query(MCI_Results);
                            MCI_Results_Update_Query.equalTo('parent', user);
                            console.log('the searchTermsList[i] Im about to use for the query es:' + DaSearchTerm);
                            MCI_Results_Update_Query.contains('searchTerm', DaSearchTerm);

                            // Update MCI_Results with new top3List eBay results
                            MCI_Results_Update_Query.first()
                                .then(function(results) {
                                    console.log('about to update this items list:' + DaSearchTerm);
                                    if (results) {
                                        results.set('Results', DaTop3List);
                                        results.set('newMatch', 'YES');
                                        results.save();

                                        console.log('totally just updated the MCI_Results, NBD');
                                    }

                                })
                                .then(function() {
                                    // Check for high priority MC items
                                    var matchCenterItem = Parse.Object.extend("matchCenterItem");
                                    var matchCenterItemQuery = new Parse.Query(matchCenterItem);
                                    matchCenterItemQuery.equalTo('parent', user);
                                    matchCenterItemQuery.contains('itemPriority', 'High');

                                    matchCenterItemQuery.find()
                                        .then(function(results) {
                                            // If user has any high priority items
                                            if (results.length > 0) {
                                                //Add user to the "highPush" notification channel
                                                var installationQuery = new Parse.Query(Parse.Installation);
                                                installationQuery.equalTo('userId', user);

                                                installationQuery.first()
                                                    .then(function(result) {
                                                        result.set('channels', [user.id, "highPush"]);
                                                        result.save();
                                                    });
                                            } else {
                                                //Add user to the "lowPush" notification channel
                                                var installationQuery = new Parse.Query(Parse.Installation);
                                                installationQuery.equalTo('userId', user);

                                                installationQuery.first()
                                                    .then(function(result) {
                                                        result.set('channels', [user.id, "lowPush"]);
                                                        result.save();
                                                    });
                                            }
                                        });
                                    console.log('done updating channel');
                                });
                        }
                    });
            }

            matchCenterComparisonPromise.resolve(console.log('MatchCenterComparison Suceeded sen!'));
        } else {
            matchCenterComparisonPromise.reject({
                message: 'No work done, expression failed'
            });
        }
        //return matchCenterComparisonPromise;  
    }


// Push notifications sent to users with High priority items
Parse.Cloud.job("sendHighPush", function(request, status) {

    Parse.Cloud.useMasterKey();
    //send push notification to all users in the "yesPush" channel 
    Parse.Push.send({
        channels: ["highPush"],
        //push_time: new Date("T00:45:00"),
        data: {
            alert: "New match found!",
            badge: "Increment"
        }
    }, {
        success: function() {
            // Push was successful
            console.log('Push Notifications completed successfully.');
        },
        error: function(error) {
            throw "Got an error " + error.code + " : " + error.message;
        }
    }).then(function() {
        // Set the job's success status
        status.success("Push Notifications completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, ain't no pushing going on hurr.");
    });

});

Parse.Cloud.job("sendHighPushTEST", function(request, status) {

    Parse.Cloud.useMasterKey();

    // Query all users
    var usersQuery = new Parse.Query(Parse.User);

    // For each user in the DB...       
    return usersQuery.each(function(user) {
            // find all their MCI_Results items with a newMatch of "YES" and a priority level of "High"
            var MCI_Results = Parse.Object.extend("MCI_Results");
            var MCI_Results_Query = new Parse.Query(MCI_Results);

            MCI_Results_Query.equalTo('parent', user);
            MCI_Results_Query.contains('newMatch', 'YES');
            MCI_Results_Query.contains('itemPriority', 'High');
            MCI_Results_Query.find()
                .then(function(result) {
                    // Send a notification with the items name in it.
                    //
                    console.log('the MCI_Results_Query result is as follows:' + result);

                    // If >1 high priority items, say "New matches for _____ and X more items"
                    if (result.length > 1) {
                        var pushQuery = new Parse.Query(Parse.Installation);
                        pushQuery.containsAll("channels", [user.id, "highPush"]);

                        Parse.Push.send({
                            where: pushQuery, // Set our Installation query
                            data: {
                                alert: "New matches found for" + result[0].searchTerm + "and" + result.length - 1 + "more items!"
                            }
                        });

                    }

                    // If 1 high priority item, say "New matches for _____!"
                    else if (result.length = 1) {
                        var pushQuery = new Parse.Query(Parse.Installation);
                        pushQuery.containsAll("channels", [user.id, "highPush"]);

                        Parse.Push.send({
                            where: pushQuery,
                            data: {
                                alert: "New matches found for" + result[0].searchTerm + "!"
                            }
                        });
                    } else {
                        // If no high priority items, don't send any push notification.
                        console.log('No high priority items fo u');
                    }

                });


        })
        .then(function() {
            // Set the job's success status
            status.success(".");
        }, function(error) {
            // Set the job's error status
            status.error("Got an error " + error.code + " : " + error.message);
        });


});

// Push notifications sent to users with Low priority items
Parse.Cloud.job("sendLowPush", function(request, status) {

    Parse.Cloud.useMasterKey();
    //send push notification to all users in the "lowPush" channel 

    //{Query the # value of pushIncrement with object id hKj2Eazz6h}
    var pushIncrement = Parse.Object.extend("pushIncrement");
    var pushIncrementQuery = new Parse.Query(pushIncrement);
    pushIncrementQuery.equalTo('objectId', 'hKj2Eazz6h');

    pushIncrementQuery.get('hKj2Eazz6h', {
        success: function(obj) {
            var dayNumber = obj.get("Number");
            // ...
            //Figure out whether its day 1, 2, or 3, and increment. Send lowPush if day 3.
            if (dayNumber == 1) {
                //change it to 2
                console.log('dayNumber is 1');

                obj.set('Number', 2);
                obj.save();
                console.log('dayNumber is now 2');
                status.success("Push Notifications completed successfully.");
            } else if (dayNumber == 2) {
                //change it to 3
                console.log('dayNumber is 2');
                obj.set('Number', 3);
                obj.save();
                console.log('dayNumber is now 3');
                status.success("Push Notifications completed successfully.");
            } else if (dayNumber == 3) {
                console.log('dayNumber is 3');
                //send push, then change it to 1
                Parse.Push.send({
                    channels: ["lowPush"],
                    //push_time: new Date("T00:45:00"),
                    data: {
                        alert: "New match found!",
                        badge: "Increment"
                    }
                }, {
                    success: function() {
                        // Push was successful
                    },
                    error: function(error) {
                        throw "Got an error " + error.code + " : " + error.message;
                    }
                }).then(function() {
                    // Set the job's success status
                    obj.set('Number', 1);
                    obj.save();
                    status.success("Push Notifications completed successfully.");
                }, function(error) {
                    // Set the job's error status
                    status.error("Uh oh, ain't no pushing going on hurr.");
                });
            }
        },

        error: function(error) {
            console.log('shit');
            status.error('shitty shit');
        }
    });



});

Parse.Cloud.define("deleteFromMatchCenter", function(request, response) {

    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);

    query.contains('searchTerm', request.params.searchTerm);
    query.equalTo('parent', Parse.User.current())

    query.find().then(function(matchCenterItem) {
        return Parse.Object.destroyAll(matchCenterItem);
    }).then(function(success) {
        response.success('MatchCenterItem removed!')
    }, function(error) {
        response.error('MatchCenterItem Unable to be removed!');
    });

});

Parse.Cloud.define("mcSettings", function(request, response) {

    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);

    query.equalTo('parent', Parse.User.current())

    query.find({
        success: function(results) {

            console.log(results);
            response.success(results);

        },
        error: function() {
            response.error("matchCenterItem lookup failed");
        }
    });

});

// Show MatchCenter Criteria, and allow editing
Parse.Cloud.define("editMatchCenter", function(request, response) {

    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);

    query.contains('searchTerm', request.params.searchTerm);
    query.equalTo('parent', Parse.User.current())

    query.first({
        success: function(results) {

            results.set('minPrice', request.params.minPrice);
            results.set('maxPrice', request.params.maxPrice);
            results.set('itemCondition', request.params.itemCondition);
            results.set('itemLocation', request.params.itemLocation);
            results.set('itemPriority', request.params.itemPriority);

            results.save().then(function(
                savedMatchCenterItem) {
                response.success('MatchCenterItem successfully edited!');
            });

        },
        error: function() {
            response.error('MatchCenterItem NAAAAT successfully edited!');
        }
    });

});

// Show MatchCenter Criteria, and allow editing
Parse.Cloud.define("editMatchCenter2", function(request, response) {

    var matchCenterItem = Parse.Object.extend("matchCenterItem");
    var query = new Parse.Query(matchCenterItem);

    query.contains('searchTerm', request.params.originalSearchTerm);
    query.equalTo('parent', Parse.User.current())

    query.first({
        success: function(results) {

            results.set('searchTerm', request.params.newSearchTerm);
            results.set('minPrice', request.params.minPrice);
            results.set('maxPrice', request.params.maxPrice);
            results.set('itemCondition', request.params.itemCondition);
            results.set('itemLocation', request.params.itemLocation);
            results.set('itemPriority', request.params.itemPriority);

            results.save().then(function(
                savedMatchCenterItem) {
                response.success('MatchCenterItem successfully edited!');
            });

        },
        error: function() {
            response.error('MatchCenterItem NAAAAT successfully edited!');
        }
    });

});