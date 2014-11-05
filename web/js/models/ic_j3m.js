var app = app || {};//global Backbone

jQuery(document).ready(function($) {

	//do we still need this?
	app.InformaCamJ3M = Backbone.Model.extend({
		constructor: function() {
			Backbone.Model.apply(this, arguments);
		},
	});

	/* BACKBONE MODELS */

	app.InformaCamJ3MHeader = Backbone.Model.extend({
		urlRoot: '/j3mheader',
	});

	app.InformaCamJ3MStripped = Backbone.Model.extend({
		urlRoot: '/j3mretrieve',
	});

	app.InformaCamJ3MTimeStampedData = Backbone.Model.extend({
		initialize: function(options) {
			this.urlRoot = options.urlRoot;
		},
		parse: function(response) {
			this.set({values: response}, {silent: true});
			return response;
		},
	});

	/* BACKBONE VIEWS */

	app.InformaCamJ3MHeaderView = Backbone.View.extend({
		el: $('#ic_j3mheader_view_holder'),
		template: getTemplate("j3m_header.html"),
		render: function() {
			json = this.model.toJSON().data;
			json.URL = document.URL;
			json.genealogy.dateFormatted = moment(Number(json.genealogy.dateCreated)).format("MM/DD/YYYY HH:mm:ss")
			html = Mustache.to_html(this.template, json);
			this.$el.html(html);
			$('#submission_permalink').click(function() {
				this.select();
			});
			return this;
		},
	});

	app.InformaCamJ3MTimeseriesMapView = Backbone.View.extend({
		initialize: function(options) {
			this.maps = [];
			this.header = options.header;
		},
		render: function() {
			this.$el.prepend('<h2>' + this.header + '</h2>');
			this.json = {values: this.model.get("values")};
			this.loadMap('mapOverview', [this.json.values[0]], 4);
			this.loadMap('mapZoom', this.json.values, 19);

			return this;
		},
		
		loadMap: function(mapID, values, zoom) {
			$('#' + mapID).addClass("rendered");
			this.maps[mapID] = L.map(mapID).setView([values[0].gps_lat, values[0].gps_long], zoom);
			L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
			}).addTo(this.maps[mapID]);
			
			if (values.length > 1) {
				latlngs = _.map(values, function(latlong){ return [latlong.gps_lat,latlong.gps_long]; });
				L.polyline(latlngs, {color: 'red', weight:2}).addTo(this.maps[mapID]);
				var myIcon = L.icon({
					iconUrl: '/web/images/ic_map_icon.png',
					iconRetinaUrl: '/web/images/ic_map_icon.png',
					iconSize: [5, 5]
        		});
			} else {
				var myIcon = L.icon({
					iconUrl: '/web/images/ic_map_icon.png',
					iconRetinaUrl: '/web/images/ic_map_icon.png',
					iconSize: [18, 18]
        		});
			}

			_.each(values, function(latlong) {
				timestamp = moment(Number(latlong.timestamp)).format("MM/DD/YYYY HH:mm:ss");
				L.marker([latlong.gps_lat,latlong.gps_long]).setIcon(myIcon).addTo(this.maps[mapID])
				.bindPopup(timestamp);
			}, this);
		},
	});

	//abstracted class for arrays of 2-tuples, one of which is a timestamp
	app.InformaCamJ3MTimeStampedDataView = Backbone.View.extend({
		initialize: function(options) {
			this.template = options.template;
			this.xLabel = options.xLabel;
			this.yLabel = options.yLabel;
		},
		render: function() {
			json = {values: this.model.get("values")};
			$c(this.model.get("values"));
			html = Mustache.to_html(this.template, json);
			this.$el.html(html);
			return this;
		},
	});

	app.InformaCamJ3MLineChart = Backbone.View.extend({
		initialize: function(options) {
			this.keys = options.keys;
			this.header = options.header;
		},
		render: function() {
			this.$el.prepend('<h2>' + this.header + '</h2>');
			var data = this.model.get("values");
			var key = this.keys[0];
			var margin = {top: 20, right: 20, bottom: 30, left: 50},
			totalWidth = 960, totalHeight = 500,
			width = totalWidth - margin.left - margin.right,
			height = totalHeight - margin.top - margin.bottom;

			var x = d3.time.scale()
				.range([0, width]);

			var y = d3.scale.linear()
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.tickFormat(d3.time.format('%H:%M:%S.%L'));

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");
/*
			_.each(this.keys, function(key) {
				this.lines.push(
					d3.svg.line()
					.interpolate("basis")
					.x(function(d) { return x(d.timestamp); })
					.y(function(d) { return y(d[key]); })
				);
			}, this);

			var line = d3.svg.line()
				.interpolate("basis")
				.x(function(d) { return x(d.timestamp); })
				.y(function(d) { return y(d[key]); });
*/
			var svg = d3.select(this.el).append("svg")
				.attr({width: totalWidth,
				height:totalHeight,
				viewBox: "0 0 " + totalWidth + " " + totalHeight})
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			x.domain(d3.extent(data, function(d) { return d.timestamp; }));
			if (d3.min(data, function(d) { return d[key]; }) < 0) {
				y.domain(d3.extent(data, function(d) { return d[key]; }));
			} else {
				y.domain([0, d3.max(data, function(d) { return d[key]; })]);
			}

			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text(this.yLabel);

			_.each(this.keys, function(key) {
				var line = d3.svg.line()
					.interpolate("basis")
					.x(function(d) { return x(d.timestamp); })
					.y(function(d) { return y(d[key]); });
					
				svg.append("path")
					.datum(data)
					.attr("class", "line")
					.attr("d", line);
			}, this);
				
				scaleGraphs();

			return this;
		},
		
		
	});

	app.InformaCamJ3MAppView = Backbone.View.extend({
		el: '#ic_submission_view_holder',
		initialize: function() {
			this.headerView = new app.InformaCamJ3MHeaderView({
				model: new app.InformaCamJ3MHeader({
					id: app.docid
				})
			});

			this.lightMeterView = new app.InformaCamJ3MLineChart({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/lightMeter',
					id: app.docid,
				}),
				el: '#ic_lightMeterValue_view_holder',
				keys: ['lightMeterValue'],
				header: 'Light Meter',
			});
			
			this.gps_accuracyView = new app.InformaCamJ3MLineChart({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/GPSAccuracy',
					id: app.docid,
				}),
				el: '#ic_gps_accuracy_view_holder',
				keys: ['gps_accuracy'],
				header: 'GPS Accuracy',
			}); 

			this.gps_bearingView = new app.InformaCamJ3MLineChart({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/GPSBearing',
					id: app.docid,
				}),
				el: '#ic_gps_bearing_view_holder',
				keys: ['gps_bearing'],
				header: 'GPS Bearing',
			});
			
			this.gps_coordsView = new app.InformaCamJ3MTimeseriesMapView({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/GPSCoords',
					id: app.docid
				}),
				el: '#ic_gps_coords_view_holder',
				header: 'GPS Coordinates',
			}); 			

			this.pressureAltitudeView = new app.InformaCamJ3MLineChart({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/pressureAltitude',
					id: app.docid
				}),
				el: '#ic_pressureAltitude_view_holder',
				keys: ['pressureAltitude'],
				header: 'Pressure Alitude',
			}); 

			this.accelerometerView = new app.InformaCamJ3MLineChart({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/Accelerometer',
					id: app.docid,
				}),
				el: '#ic_accelerometer_view_holder',
				keys: ['acc_x', 'acc_y', ],
				header: 'Accelerometer',
			});

			//LISTENERS
			
//			views = [this.headerView, this.lightMeterView, this.gps_accuracyView, this.gps_bearingView, this.gps_coordsView, this.pressureAltitudeView, this.accelerometerView, ];
			views = [this.accelerometerView, ];
			
			_.each(views, function(view) {
				this.listenTo(view.model, 'change', function() {
					view.$el.append(view.render().el);
				});
				view.model.fetch();
			}, this);
			
		},
	});


	function $c(foo) {
		console.log(foo);
	}
});

/*
think about these:

http://localhost:8888/GPSAccuracy/4c20d05a772723f1b5e97166ca1f3709/
http://localhost:8888/Accelerometer/4c20d05a772723f1b5e97166ca1f3709/
//acc_x, acc_y, acc_z
http://localhost:8888/DocumentWrapper/4c20d05a772723f1b5e97166ca1f3709/
http://localhost:8888/PitchRollAzimuth/f76f260fb500ac1a58e0c35c97d5361e/
//pitch, roll, azimuth, plus all 3 corrected
http://localhost:8888/VisibleWifiNetworks/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/j3mheader/4c20d05a772723f1b5e97166ca1f3709/


http://localhost:8888/GPSAccuracy/f76f260fb500ac1a58e0c35c97d5361e/
http://localhost:8888/GPSCoords/f76f260fb500ac1a58e0c35c97d5361e/


http://localhost:8888/GPSAccuracy/4c20d05a772723f1b5e97166ca1f3709/
http://localhost:8888/GPSBearing/4c20d05a772723f1b5e97166ca1f3709/
gps_bearing
http://localhost:8888/GPSCoords/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/lightMeter/f76f260fb500ac1a58e0c35c97d5361e/

http://localhost:8888/GPSAccuracy/f76f260fb500ac1a58e0c35c97d5361e/

http://localhost:8888/lightMeter/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/pressureAltitude/4c20d05a772723f1b5e97166ca1f3709/
*/

