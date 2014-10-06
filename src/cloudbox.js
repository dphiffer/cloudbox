(function($) {

	// These keys are tied to my personal email account, I may revoke them someday
	SC.initialize({
		client_id: 'd420fb1434ba2ddb257882c6365ec941',
		redirect_uri: window.location.href
	});
	L.mapbox.accessToken = 'pk.eyJ1IjoiZHBoaWZmZXIiLCJhIjoiRl9oZWFXTSJ9.F_OA9s-aQ2gy0Dhdj1hlAA';

	// Keep track of which marker is "active"
	var marker = null;
	
	// Set to a SoundCloud controller after the first marker is clicked on
	var sound = null;

	// Set up the Mapbox.js map
	function init() {
		var center = getLocation('#map');
		var zoom = parseInt($('#map').data('zoom'));
		var style = $('#map').data('style');
		var map = L.mapbox.map('map', style)
											.setView(center, zoom);
		var hash = L.hash(map);
		$('#map a.marker').each(function(i, link) {
			setupMarker(map, link);
		});
	}
	
	// Set up a single map marker from a link to soundcloud.com
	function setupMarker(map, link) {
		var location = getLocation(link);
		if (!location ||
		    !$(link).attr('href') ||
		    !$(link).attr('href').match(/^https?:\/\/(www\.)?soundcloud\.com/)) {
			return;
		}
		var title = $(link).html();
		if (title == '') {
			title = 'Untitled';
		}
		var properties = {
			title: title,
			href: $(link).attr('href')
		};

		if ($(link).data('description')) {
			properties.description = $(link).data('description');
		}
		if ($(link).data('symbol')) {
			properties['marker-symbol'] = $(link).data('symbol');
		}
		if ($(link).data('size')) {
			properties['marker-size'] = $(link).data('size');
		}
		if ($(link).data('color')) {
			properties['marker-color'] = $(link).data('color');
		}

		// Create a point on the map
		var point = L.mapbox.featureLayer({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [ // order is reversed: longitude, latitude
					location[1],
					location[0]
				]
			},
			properties: properties
		}).addTo(map);

		// Play the sound whenever the popup opens
		point.on('popupopen', function(e) {
			if (this.isPlaying) {
				return;
			}
			if (marker &&
				marker.getGeoJSON().properties.href != this.getGeoJSON().properties.href) {
				marker.isPlaying = false;
				marker.isPaused = false;
			}
			marker = this;
			this.isPlaying = true;
			window.marker = marker;
			var href = this.getGeoJSON().properties.href;
			if (this.isPaused) {
				this.isPaused = false;
				sound.play();
			} else if (this.resolvedURL) {
				$('#player').addClass('loading');
				sound.load(this.resolvedURL);
			} else {
				var self = this;
				$('#player').addClass('loading');
				// Resolve the SoundCloud URL to find its track ID
				SC.get('/resolve?url=' + href, function(track) {
					var url = 'https://api.soundcloud.com/tracks/' + track.id +
					          '?color=ff5500&inverse=true&auto_play=true&show_user=false';
					self.resolvedURL = url;
					if (!sound) {
						setupSound(url);
					} else {
						sound.load(url);
					}
				});
			}
		});

		// Pause the playing sound whenever the popup closes
		point.on('popupclose', function(e) {
			this.isPlaying = false;
			this.isPaused = true;
			sound.pause();
		});
	}

	// Set up the SoundCloud player widget and associated event handlers
	function setupSound(url) {
		var href = 'https://w.soundcloud.com/player/?url=' + url.replace(':', '%3A');
		$('#player').html(
			'<iframe src="' + href + '" id="sound" name="sound" ' +
			        'width="300" height="20" ' +
			        'scrolling="no" frameborder="no">' +
			'</iframe>'
		);
		$('#sound').load(function() {
			sound = SC.Widget('sound');
			sound.bind(SC.Widget.Events.READY, function() {
				$('#player').addClass('ready');
				$('#player').removeClass('loading');
			});
			sound.bind(SC.Widget.Events.PLAY, function() {
				if (!marker.isPlaying) {
					marker.isPlaying = true;
					marker.openPopup();
				}
			});
			sound.bind(SC.Widget.Events.PAUSE, function() {
				if (marker.isPlaying) {
					marker.eachLayer(function(m) {
						m.closePopup();
					});
				}
			});
			sound.bind(SC.Widget.Events.FINISH, function() {
				if (marker.isPlaying) {
					marker.eachLayer(function(m) {
						m.closePopup();
					});
				}
			});
		});
	}
	
	// Returns an array when passed <element data-location="[lat],[lng]">
	function getLocation(el) {
		var location = $(el).data('location');
		if (!location) {
			return null;
		}
		location = location.split(',');
		location[0] = parseFloat(location[0].trim());
		location[1] = parseFloat(location[1].trim());
		return location;
	}

	init();

})(jQuery);
