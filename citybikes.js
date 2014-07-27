var request = require('request'),
    _ = require('lodash');

var baseURL = 'http://api.citybik.es',
    networksURL = baseURL + '/v2/networks',
    networkURLBase = networksURL + '/';

var networksCache = {}, stationsCache = {},
    nextNetworksRefreshDue = new Date(),
    cacheValidityPeriodForNetworks = 60*60*1000, // 60 minutes for network lists
    cacheValidityPeriodForStations = 1*60*1000; // 1 minute for stations

function geoJSONify(item) {
  return { "type": "Feature",
           "geometry": { "type": "Point", "coordinates": [item.longitude, item.latitude]},
           "properties": _.omit(item, ['latitude', 'longitude', 'id']),
           "id": item.id };
}

function isCacheInvalid() {
  return _.size(networksCache) == 0 || new Date() >= nextNetworksRefreshDue;
}

exports.clearCache = function() {
  networksCache = {};
  stationsCache = {};
  nextNetworksRefreshDue = new Date();
}

exports.networks = function(callback) {
  if (isCacheInvalid()) {
    request(networksURL, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        nextNetworksRefreshDue = new Date((new Date()).getTime() + cacheValidityPeriodForNetworks);
        networksCache = _.indexBy(_.map(JSON.parse(body).networks, geoJSONify), 'id');
        return callback(null, processOutput(networksCache));
      } else {
        return callback(error, null);
      }
    })
  } else {
    return callback(null, processOutput(networksCache));
  }

  function processOutput(output) {
    return _.mapValues(_.cloneDeep(output), function(n) { 
      n.properties = _.omit(n.properties, ['id', 'href']); 
      return n; 
    });
  }
}

exports.network = function(networkName, callback) {
  // Return the cache if present and valid.
  if (stationsCache.hasOwnProperty(networkName)) {
    var cacheEntry = stationsCache[networkName];
    if (new Date() < cacheEntry.cacheExpiration) {
      return callback(null, processOutput(cacheEntry));
    }
  }

  // We didn't have a valid cache to return.
  // Get a URL for the network, but read it from the networks list if possible.
  var networkURL = '';
  if (networksCache.hasOwnProperty(networkName)) {
    var cacheEntry = networksCache[networkName];
    networkURL = baseURL + cacheEntry.properties.href;
  } else {
     networkURL = networkURLBase + networkName;
  }

  // Get the actual network data then.
  request(networkURL, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var j = JSON.parse(body);
      stationsCache[networkName] = {
        data: j.network,
        cacheExpiration: new Date((new Date()).getTime() + cacheValidityPeriodForStations)
      };
      return callback(null, processOutput(stationsCache[networkName]));
    } else {
      return callback(error, null);
    }
  });

  function processOutput(output) {
    return _.map(_.cloneDeep(output.data.stations), geoJSONify);
  }
}