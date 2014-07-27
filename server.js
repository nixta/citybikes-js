#!/usr/bin/env node
"use strict";

var cors = require("cors"),
    express = require("express"),
    responseTime = require("response-time"),
    citybikes = require("./citybikes.js");

var app = express();

app.disable("x-powered-by");
app.use(responseTime());
app.use(cors());

app.get('/networks', function(req, res) {
  citybikes.networks(function(err, networks) {
    res.status(err==null?200:500).send(err==null?networks:err);
  });
});

app.get('/networks/:networkName', function(req, res) {
  citybikes.network(req.params.networkName, function(err, stations) {
    res.status(err==null?200:500).send(err==null?stations:err);
  });
});

if (process.env.NODE_ENV === "development") {
  app.use(express.logger());
}

app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT || 1337,  function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});

