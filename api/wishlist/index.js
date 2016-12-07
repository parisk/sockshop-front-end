(function () {
  'use strict';

  var async = require("async")
    , express = require("express")
    , request = require("request")
    , helpers = require("../../helpers")
    , endpoints = require("../endpoints")
    , app = express()

  // Get wishlist items for current user
  app.get("/wishlist", function (req, res, next) {
    console.log("Request received: " + req.url + ", " + req.query.custId);
    var custId = helpers.getCustomerId(req, app.get("env"));
    console.log("Customer ID: " + custId);
    request(endpoints.wishlistUrl + "/wishlists/" + custId + "/items", function (error, response, body) {
      if (error) {
        return next(error);
      }
      // If a wishlist does not exist for this customer, create it.
      if (response.statusCode == 404) {
        console.log("Create the wishlist for: " + custId);
        var options = {
          uri: endpoints.wishlistUrl + "/wishlists/",
          method: 'POST',
          json: true,
          body: {
            customer: custId
          }
        };
        request(options, function (error, response, body) {
          if (error) {
            return next(error)
          }
          console.log('List creation response code', response.statusCode);
          request(endpoints.wishlistUrl + "/wishlists/" + custId + "/items", function (error, response, body) {
            if (error) {
              return next(error);
            }
            helpers.respondStatusBody(res, response.statusCode, body);
          });
        });
      } else {
        helpers.respondStatusBody(res, response.statusCode, body)
      }
    });
  });

  // Delete product from wishlist
  app.delete("/wishlists/:id", function (req, res, next) {
    if (req.params.id == null) {
      return next(new Error("Must pass id of a product to delete"), 400);
    }

    console.log("Delete item from cart: " + req.url);

    var custId = helpers.getCustomerId(req, app.get("env"));

    var options = {
      uri: endpoints.wishlistUrl + "/" + custId + "/items/" + req.params.id.toString(),
      method: 'DELETE'
    };
    request(options, function (error, response, body) {
      if (error) {
        return next(error);
      }
      console.log('Item deleted with status: ' + response.statusCode);
      helpers.respondStatus(res, response.statusCode);
    });
  });

  // Add new product to wishlist
  app.post("/wishlist", function (req, res, next) {
    console.log("Attempting to add to cart: " + JSON.stringify(req.body));

    if (req.body.id == null) {
      next(new Error("Must pass id of item to add"), 400);
      return;
    }

    var custId = helpers.getCustomerId(req, app.get("env"));

    async.waterfall([
      function (callback) {
        request(endpoints.catalogueUrl + "/catalogue/" + req.body.id.toString(), function (error, response, body) {
          console.log(body);
          callback(error, JSON.parse(body));
        });
      },
      function (item, callback) {
        var options = {
          uri: endpoints.wishlistUrl + "/wishlists/" + custId + "/items/",
          method: 'POST',
          json: true,
          body: { product: item.id }
        };
        console.log("POST to wishlist: " + options.uri + " body: " + JSON.stringify(options.body));
        request(options, function (error, response, body) {
          if (error) {
            callback(error)
            return;
          }
          callback(null, response.statusCode);
        });
      }
    ], function (err, statusCode) {
      if (err) {
        return next(err);
      }
      if (statusCode != 201) {
        return next(new Error("Unable to add to cart. Status code: " + statusCode))
      }
      helpers.respondStatus(res, statusCode);
    });
  });

  module.exports = app;
} ());
