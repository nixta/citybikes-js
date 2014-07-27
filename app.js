var c = require('./citybikes.js');
var d = new Date();

c.networks(function(e,r) {
  var dDone = new Date();
  console.log(r);
  console.log('Time to get Networks: ' + (dDone - d));

  c.network('citi-bike-nyc', function(e1,r1) {
    var d1Done = new Date();
    console.log('Time to get Citibike: ' + (d1Done - dDone));
    c.network('citi-bike-nyc', function(e2,r2) {
      var d2Done = new Date();
      console.log('Time to get Citibike again: ' + (d2Done - d1Done));
    });
  });

  c.networks(function (en1,er1) {
    var dN1Done = new Date();
    console.log('Time to get Networks again: ' + (dN1Done - dDone));
  });
});
