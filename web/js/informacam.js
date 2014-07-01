var informacam_user = null;
var current_asset;

var onConfLoaded = function() {	
	var map_id = "harlo.ibn0kk8l";
	var key = "23c00ae936704081ab019253c36a55b3";
	UV.CM_API = {
		AUTH_STR : "http://{s}.tiles.mapbox.com/v3/" + map_id + "/{z}/{x}/{y}.png",
		MAX_ZOOM: 18,
		ATTRIBUTION: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
	};
	
	UV.SEARCH_FACETS.push("Public Hash");
	
	UV.SEARCH_TYPES = {
		submission : ["genealogy.createdOnDevice"],
		source : ["fingerprint", "alias", "email"]
	};
	
	UV.SEARCH_CLAUSE_SELECTORS = {
		submission : [
			{
				label: "were created on or between...",
				tmpl: "by_dateCreated.html"
			},
			{
				label: "were taken near...",
				tmpl: "by_location.html"
			},
			{
				label: "were taken by...",
				tmpl: "by_source_j3m.html"
			},
			{
				label: "were taken in view of...",
				tmpl: "by_broadcast.html"
			}
		],
		source: [
			{
				label: "goes by alias...",
				tmpl: "by_source_alias.html"
			},
			{
				label: "with email address...",
				tmpl: "by_source_email.html"
			}
		]
	};
}

function initUser() {
	doInnerAjax("get_user_status", "post", null, function(json) {
		json = JSON.parse(json.responseText);
		if(json.result == 200) {
			status = Number(json.data);
			if(status == 0) { return; }
			
			if(status != 4) {
				informacam_user = new InformaCamUser();
			}
		}
	});
	
}

function loadAsset(asset_type, _id) {
	if(asset_type == "submission") {
		current_asset = new InformaCamSubmission({ _id : _id });
	} else if(asset_type == "source") {
		current_asset = new InformaCamSource({ _id : _id });
	}
	
	try {
		current_asset.updateInfo();
	} catch(err) {
		console.warn("COULD NOT LOAD WHOLE ASSET AT THIS TIME");
		console.warn(err);
	}
}

function loadHeaderPopup(view, onSuccess) {
	if(!toggleElement($("#ic_header_popup"))) { toggleElement($("#ic_header_popup")); }
	
	insertTemplate((view + ".html"), null, $("#ic_header_popup_content"), 
		onSuccess, "/web/layout/views/popup/");
}

function closeHeaderPopup() {
	toggleElement('#ic_header_popup');
	window.back();
}

function initVisualSearch() {
	visual_search = new InformaCamVisualSearch();
}

(function($) {
	var header_sammy = $.sammy("#header", function() {
		this.get(/(.*)\#login/, function(context) {
			loadHeaderPopup("login", null);
		});
		
		this.get(/(.*)\#logout/, function(context) {
			loadHeaderPopup("logout", null);
		});
	});
	
	$(function() {
		var css_stub = $(document.createElement('link'))
			.attr({
				'rel' : "stylesheet",
				'type' : "text/css",
				'media' : "screen"
			});
		
		_.each(['informacam', 'visualsearch-datauri', 'visualsearch'], function(c) {
			var css = $(css_stub).clone();
			css.attr('href', "/web/css/" + c + ".css");
			document.getElementsByTagName("head")[0].appendChild(css.get(0));
		});
		
		css = $(css_stub).clone();
		css.attr('href', "http://cdn.leafletjs.com/leaflet-0.6.4/leaflet.css");
		document.getElementsByTagName("head")[0].appendChild(css.get(0));
		
		var conf = $(document.createElement('script'))
			.attr({
				'type' : "text/javascript",
				'src' : "/web/js/conf.js?t=" + new Date().getTime()
			})
			.on("load", function() {
				onConfLoaded();
				initUser();
				header_sammy.run();
			});
		document.getElementsByTagName("head")[0].appendChild(conf.get(0));
			
	})
})(jQuery);