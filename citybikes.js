var request = require('request'),
    _ = require('lodash');

var baseURL = 'http://api.citybik.es',
    networksURL = baseURL + '/v2/networks',
    networkURLBase = networksURL + '/';

var useCaching = true,
    networksCache, stationsCache,
    cacheValidityPeriodForNetworks = 60*60*1000, // 60 minutes for network lists
    cacheValidityPeriodForStations = 1*60*1000; // 1 minute for stations

clearCaches();

// Private functions
function clearCaches() {
    networksCache = {
      data: {},
      cacheExpiration: new Date()
    }; 
    stationsCache = {
      data: {},
      cacheExpiration: new Date()
    };  
}

function isCacheInvalid(cache) {
  return (!useCaching) || _.size(cache.data) == 0 || new Date() >= cache.cacheExpiration;
}

function geoJSONify(item) {
  var gSrc = item.hasOwnProperty('location')?item.location:item;
  return { "type": "Feature",
           "geometry": { "type": "Point", "coordinates": [gSrc.longitude, gSrc.latitude]},
           "properties": _.omit(item, ['latitude', 'longitude', 'id']),
           "id": item.id };
}

// API Functions
exports.clearCaches = function() {
  clearCaches();
}

exports.networks = function(callback) {
  if (isCacheInvalid(networksCache)) {
    request(networksURL, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        networksCache = {
          data: _.indexBy(_.map(JSON.parse(body).networks, geoJSONify), 'id'),
          cacheExpiration: new Date((new Date()).getTime() + cacheValidityPeriodForNetworks)
        };
        return callback(null, processOutput(networksCache));
      } else {
        return callback(error, null);
      }
    })
  } else {
    return callback(null, processOutput(networksCache));
  }

  function processOutput(output) {
    return _.values(_.mapValues(_.cloneDeep(output.data), function(n) { 
      n.properties = _.omit(n.properties, ['id', 'href']); 
      return n; 
    }));
  }
}

exports.network = function(networkName, callback) {
  // Return the cache if present and valid.
  if (stationsCache.hasOwnProperty(networkName)) {
    var cacheEntry = stationsCache[networkName];
    if (!isCacheInvalid(cacheEntry)) {
      return callback(null, processOutput(cacheEntry));
    }
  }

  // We didn't have a valid cache to return.
  // Get a URL for the network, but read it from the networks list if possible.
  var networkURL = networksCache.data.hasOwnProperty(networkName) ?
                    baseURL + networksCache.data[networkName].properties.href : 
                    networkURLBase + networkName;

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
