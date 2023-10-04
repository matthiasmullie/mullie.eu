'use strict';

var map = {
    map: null,

    getOptions: function (scheme) {
        return {
            scrollwheel: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {
                    elementType: 'labels.text.stroke',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'administrative',
                    elementType: 'geometry.stroke',
                    stylers: [{ color: scheme === 'dark' ? '#A2A6A9' : '#595A5C' }]
                },
                {
                    featureType: 'administrative',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: scheme === 'dark' ? '#A2A6A9' : '#595A5C' }]
                },
                {
                    featureType: 'landscape',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#3B464F' : '#FFFFFF' }]
                },
                {
                    featureType: 'landscape.man_made',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#293138' : '#EFF2F7' }]
                },
                {
                    featureType: 'poi',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#3F3E38' : '#fbf8e0' }]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#3A3D36' : '#e6f3d6' }]
                },
                {
                    featureType: 'poi.sports_complex',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#403B37' : '#ffeddb' }]
                },
                {
                    featureType: 'poi.business',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'road',
                    elementType: 'geometry.stroke',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'road',
                    elementType: 'labels.icon',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'road',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: scheme === 'dark' ? '#888888' : '#aaaaaa' }]
                },
                {
                    featureType: 'road.arterial',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#666666' : '#c9c9c9' }, { weight: 2 }]
                },
                {
                    featureType: 'road.local',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#666666' : '#c9c9c9' }, { weight: 1 }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'geometry.fill',
                    stylers: [{ color: scheme === 'dark' ? '#555555' : '#fbd4c4' }, { weight: 4 }]
                },
                {
                    featureType: 'transit',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'water',
                    stylers: [{ color: scheme === 'dark' ? '#3A3B3E' : '#e8eefb' }]
                }
            ]
        }
    },

    load: function (node, config) {
        var scheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.map = new google.maps.Map(node, this.getOptions(scheme));

        this.setCenter(config.center);
        this.setZoom(config.zoom);
        this.setMarkers(config.markers);
        this.setDirections(config.directions);
    },

    setCenter: function (center) {
        if (!center || !(0 in center) || !(1 in center)) {
            return;
        }

        var coordinate = new google.maps.LatLng(center[0], center[1]);
        this.map.setCenter(coordinate);
    },

    setZoom: function (zoom) {
        if (isNaN(zoom)) {
            return;
        }

        this.map.setZoom(parseInt(zoom));
    },

    getIcon: function (color, text) {
        color = color || '#e08b1d';
        text = text || '';

        var svg =
            '<svg width="46" height="54" xmlns="http://www.w3.org/2000/svg">' +
                // balloon shape
                '<path stroke="' + color + '" stroke-width="2" fill="#fcfcfc" style="stroke-opacity: 1; opacity: 0.8" d=" M 7.81 8.31 C 11.74 4.27 17.35 1.87 23 2 C 28.65 1.88 34.27 4.27 38.19 8.31 C 42.01 12.15 44.21 17.59 44 23.02 C 44.04 28.86 41.15 34.49 36.78 38.28 C 32.15 42.35 27.72 46.65 23 50.62 C 18.28 46.66 13.86 42.34 9.23 38.28 C 4.85 34.49 1.96 28.85 2 23.01 C 1.8 17.59 3.99 12.15 7.81 8.31 Z" />' +
                // bottom balloon shadow
                '<path fill="#7f7f7f" d=" M 18.18 52.59 C 19 52.19 19.83 51.81 20.64 51.41 C 21.36 51.99 22.05 52.79 23.01 52.91 C 23.96 52.79 24.64 51.99 25.36 51.42 C 26.2 51.82 27.05 52.21 27.9 52.6 C 27.79 53.07 27.67 53.53 27.55 54 L 18.33 54 C 18.28 53.53 18.24 53.06 18.18 52.59 Z" />' +
                // text
                '<text x="23" y="28" font-size="13" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="#515151" textContent="'+ text +'">'+ text +'</text>' +
            '</svg>';

        return {
            url: 'data:image/svg+xml;base64,' + btoa(svg),
            scaledSize: new google.maps.Size(34.5, 40.5),
            anchor: new google.maps.Point(21, 40.5)
        };
    },

    setMarkers: function (coordinates) {
        var coordinate, icon, i;

        if (!coordinates || coordinates.length === 0) {
            return;
        }

        for (i in coordinates) {
            if (!coordinates.hasOwnProperty(i)) {
                continue;
            }

            coordinate = coordinates[i];
            icon = this.getIcon(parseInt(i) === coordinates.length - 1 ? '#e08b1d' : '#888888');

            this.addMarker(new google.maps.LatLng(coordinate[0], coordinate[1]), icon);
        }
    },

    setDirections: function (coordinates) {
        var directionsService = new google.maps.DirectionsService,
            directionsDisplay = new google.maps.DirectionsRenderer({
                suppressMarkers: true,
                suppressInfoWindows: true
            }),
            waypoints = [],
            coordinate,
            start,
            stop,
            i;

        if (!coordinates || coordinates.length === 0) {
            return;
        }

        directionsDisplay.setMap(this.map);

        for (i in coordinates) {
            if (!coordinates.hasOwnProperty(i)) {
                continue;
            }

            coordinate = coordinates[i];
            waypoints.push({
                location: new google.maps.LatLng(coordinate[0], coordinate[1]),
                stopover: true
            });
        }

        start = waypoints[0];
        stop = waypoints[waypoints.length - 1];
        directionsService.route({
            origin: start.location,
            destination: stop.location,
            waypoints: waypoints,
            travelMode: 'DRIVING'
        }, function (response, status) {
            if (status === 'OK') {
                directionsDisplay.setDirections(response);

                for (i = 0; i < waypoints.length; i++) {
                    this.addMarker(
                        waypoints[i].location,
                        this.getIcon('#888888'),
//                        'http://maps.google.com/mapfiles/ms/icons/red.png',
                        coordinates[i][2] || ''
                    );
                }
            }
        }.bind(this));
    },

    addMarker: function (latlng, icon, text) {
        var marker = new google.maps.Marker({
                map: this.map,
                position: latlng,
                icon: icon,
                zIndex: 999
            }),
            infowindow;

        if (text) {
            infowindow = new google.maps.InfoWindow;
            google.maps.event.addListener(marker, 'click', function() {
                infowindow.setContent(text);
                infowindow.open(this.map, marker);
            }.bind(this));
        }
    }
};

function initMap() {
    var $map = $('#map'),
        config = {};

    if ($map.length) {
        config.center = $map.data('center');
        config.zoom = $map.data('zoom');
        config.markers = $map.data('markers');
        config.directions = $map.data('directions');

        map.load($map[0], config);
    }
}
