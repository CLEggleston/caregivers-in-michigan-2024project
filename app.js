mapboxgl.accessToken = 'pk.eyJ1IjoiY2xlZ2dsZXN0b24iLCJhIjoiY20xZmEybjQ3MXFtbzJwb29obnd4Ym9maSJ9.b38XRx5rB55HpzDk2sHo7g';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    projection: 'globe', // Enable the globe projection
    center: [70, -30], // Initial position on the opposite side of the globe
    zoom: 1.5,
    pitch: 45,
    bearing: 180
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// Ensure the globe is styled appropriately
map.on('style.load', () => {
    map.setFog({}); // Adds atmospheric layers to the globe
});

// Fly to Michigan after the globe loads
map.on('load', function () {
    map.flyTo({
        center: [-85.602, 44.3148], // Coordinates for Michigan
        zoom: 6, // Zoom into Michigan
        pitch: 45,
        bearing: 0, // Adjust bearing for smoother view
        speed: 0.4, // Slow down the fly animation
        curve: 2.0, // Make the fly smoother
        easing: function (t) {
            return t;
        }
    });

    // Add markers after the fly animation
    map.once('moveend', function () {
        addMarkers(); // Add unclustered markers for all locations except Detroit
        addDetroitClustersWithTitle(); // Cluster markers for Detroit with the title displayed before clicking
        addTitleOverlay(); // Call the function to add the title overlay
    });
});

// Function to add clustered markers for Detroit with title displayed
function addDetroitClustersWithTitle() {
    map.addSource('detroit-markers', {
        type: 'geojson',
        data: {
            "type": "FeatureCollection",
            "features": markersData.filter(marker => marker.cityName === 'Detroit').map(marker => ({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": marker.coordinates
                },
                "properties": {
                    "imgUrl": marker.imgUrl,
                    "videoUrl": marker.videoUrl,
                    "cityName": marker.cityName
                }
            }))
        },
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points
        clusterRadius: 50 // Cluster radius for Detroit
    });

    // Cluster circles for Detroit
    map.addLayer({
        id: 'detroit-clusters',
        type: 'circle',
        source: 'detroit-markers',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': '#51bbd6',
            'circle-radius': 20,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // Cluster count labels for Detroit
    map.addLayer({
        id: 'detroit-cluster-count',
        type: 'symbol',
        source: 'detroit-markers',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    });

    // Unclustered points for Detroit
    map.addLayer({
        id: 'detroit-unclustered-point',
        type: 'circle',
        source: 'detroit-markers',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#11b4da',
            'circle-radius': 10,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    });

    // Display the "Detroit" title for the entire cluster before clicking
    map.on('render', function () {
        var features = map.queryRenderedFeatures({ layers: ['detroit-clusters'] });

        if (features.length) {
            var clusterCoordinates = features[0].geometry.coordinates.slice();

            // Check if the cluster label already exists to avoid multiple labels
            var existingLabel = document.querySelector('.detroit-cluster-label');
            if (!existingLabel) {
                // Create a popup to show the Detroit cluster name
                new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: 'detroit-cluster-label transparent-popup',
                    offset: [0, -25] // Position the label above the cluster
                })
                .setLngLat(clusterCoordinates)
                .setHTML(`
                    <div style="font-size: 14px; font-weight: bold; color: white;">
                        Detroit
                    </div>
                `)
                .addTo(map);
            }
        }
    });

    // When a Detroit cluster is clicked, zoom into it
    map.on('click', 'detroit-clusters', function (e) {
        var features = map.queryRenderedFeatures(e.point, { layers: ['detroit-clusters'] });
        var clusterId = features[0].properties.cluster_id;

        // Zoom into the cluster
        map.getSource('detroit-markers').getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err) return;

            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom
            });
        });
    });

    // Show popups for unclustered Detroit points
    map.on('mouseenter', 'detroit-unclustered-point', function (e) {
        var coordinates = e.features[0].geometry.coordinates.slice();
        var props = e.features[0].properties;

        // Create a custom element for the marker
        var el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.backgroundImage = `url(${props.imgUrl})`;
        el.style.width = '50px'; // Size for Detroit markers
        el.style.height = '50px';
        el.style.borderRadius = '50%';
        el.style.backgroundSize = 'cover';
        el.style.boxShadow = '0px 0px 15px rgba(0, 0, 0, 0.8)';
        el.style.border = '3px solid white';

        // Create a video element to replace the image on hover
        var videoPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        }).setHTML(`
            <iframe width="100%" height="200" src="${props.videoUrl}?autoplay=1&mute=1" allow="autoplay" frameborder="0" allowfullscreen></iframe>
        `);

        // Show the video popup on mouse hover
        el.addEventListener('mouseenter', function () {
            videoPopup.setLngLat(coordinates).addTo(map);
        });

        // Remove the video popup when the mouse leaves
        el.addEventListener('mouseleave', function () {
            videoPopup.remove();
        });

        new mapboxgl.Marker(el)
            .setLngLat(coordinates)
            .addTo(map);
    });
}

// Function to add unclustered markers for all locations except Detroit
function addMarkers() {
    markersData.filter(marker => marker.cityName !== 'Detroit').forEach(marker => {
        var el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.backgroundImage = `url(${marker.imgUrl})`;
        el.style.width = '40px'; // Reduced size for non-Detroit markers
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.backgroundSize = 'cover';
        el.style.boxShadow = '0px 0px 15px rgba(0, 0, 0, 0.8)';
        el.style.border = '3px solid white';

        // Add the city name for non-Detroit markers
        var cityLabel = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: [0, -25], // Offset to position label above the marker
            className: 'transparent-popup'
        })
        .setLngLat(marker.coordinates)
        .setHTML(`
            <div style="font-size: 14px; font-weight: bold; color: white;">
                ${marker.cityName}
            </div>
        `)
        .addTo(map);

        // Create a popup for the video
        var videoPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        }).setHTML(`
            <iframe width="100%" height="200" src="${marker.videoUrl}?autoplay=1&mute=1" allow="autoplay" frameborder="0" allowfullscreen></iframe>
        `);

        // Add the marker to the map at the specified coordinates
        var markerObj = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat(marker.coordinates)
        .addTo(map);

        // Show the video popup on mouse enter
        el.addEventListener('mouseenter', function () {
            videoPopup.setLngLat(marker.coordinates).addTo(map);
        });

        // Hide the video popup when the mouse leaves the marker
        el.addEventListener('mouseleave', function () {
            videoPopup.remove();
        });
    });

    // Add new marker at the provided coordinates for Boyne Falls
    var newMarkerData = {
        coordinates: [-84.9162, 45.1681], // New coordinates (Boyne Falls)
        imgUrl: 'https://imgur.com/GIA1WSx.jpg', // New image link
        videoUrl: 'https://www.youtube.com/embed/KxNpbytO6oo?autoplay=1&mute=1', // Corrected YouTube embed link with autoplay
        cityName: 'Boyne Falls' // Updated city name
    };

    // Create a new marker following the same format
    var newMarkerEl = document.createElement('div');
    newMarkerEl.className = 'custom-marker';
    newMarkerEl.style.backgroundImage = `url(${newMarkerData.imgUrl})`;
    newMarkerEl.style.width = '40px'; // Reduced size for non-Detroit markers
    newMarkerEl.style.height = '40px';
    newMarkerEl.style.borderRadius = '50%';
    newMarkerEl.style.backgroundSize = 'cover';
    newMarkerEl.style.boxShadow = '0px 0px 15px rgba(0, 0, 0, 0.8)';
    newMarkerEl.style.border = '3px solid white';

    var newMarkerLabel = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -25],
        className: 'transparent-popup'
    }).setLngLat(newMarkerData.coordinates)
    .setHTML(`
        <div style="font-size: 14px; font-weight: bold; color: white;">
            ${newMarkerData.cityName}
        </div>
    `).addTo(map);

    var newMarkerVideoPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    }).setHTML(`
        <iframe width="100%" height="200" src="${newMarkerData.videoUrl}" allow="autoplay" frameborder="0" allowfullscreen></iframe>
    `);

    var newMarkerObj = new mapboxgl.Marker({
        element: newMarkerEl,
        anchor: 'center'
    })
    .setLngLat(newMarkerData.coordinates)
    .addTo(map);

    newMarkerEl.addEventListener('mouseenter', function () {
        newMarkerVideoPopup.setLngLat(newMarkerData.coordinates).addTo(map);
    });

    newMarkerEl.addEventListener('mouseleave', function () {
        newMarkerVideoPopup.remove();
    });

    // Add Traverse City marker (updated from Boyne City)
    var traverseCityData = {
        coordinates: [ -85.6206, 44.7631 ], // Traverse City coordinates
        imgUrl: 'https://imgur.com/VrkUN6c.jpg', // Image for Traverse City
        videoUrl: 'https://www.youtube.com/embed/gW5dGlY0JvA', // Video for Traverse City
        cityName: 'Traverse City' // Updated city name
    };

    var traverseCityEl = document.createElement('div');
    traverseCityEl.className = 'custom-marker';
    traverseCityEl.style.backgroundImage = `url(${traverseCityData.imgUrl})`;
    traverseCityEl.style.width = '40px'; // Reduced size for Traverse City marker
    traverseCityEl.style.height = '40px';
    traverseCityEl.style.borderRadius = '50%';
    traverseCityEl.style.backgroundSize = 'cover';
    traverseCityEl.style.boxShadow = '0px 0px 15px rgba(0, 0, 0, 0.8)';
    traverseCityEl.style.border = '3px solid white';

    var traverseCityLabel = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -25],
        className: 'transparent-popup'
    }).setLngLat(traverseCityData.coordinates)
    .setHTML(`
        <div style="font-size: 14px; font-weight: bold; color: white;">
            ${traverseCityData.cityName}
        </div>
    `).addTo(map);

    var traverseCityVideoPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    }).setHTML(`
        <iframe width="100%" height="200" src="${traverseCityData.videoUrl}?autoplay=1&mute=1" allow="autoplay" frameborder="0" allowfullscreen></iframe>
    `);

    var traverseCityMarker = new mapboxgl.Marker({
        element: traverseCityEl,
        anchor: 'center'
    })
    .setLngLat(traverseCityData.coordinates)
    .addTo(map);

    traverseCityEl.addEventListener('mouseenter', function () {
        traverseCityVideoPopup.setLngLat(traverseCityData.coordinates).addTo(map);
    });

    traverseCityEl.addEventListener('mouseleave', function () {
        traverseCityVideoPopup.remove();
    });
}

// Function to add a title overlay with population and caregiver data
function addTitleOverlay() {
    var titleDiv = document.createElement('div');
    titleDiv.className = 'title-overlay';
    titleDiv.innerHTML = `
        <h2 style="color: white; text-align: center; font-size: 20px;">
            State of Michigan<br>Total Population: 10,037,261<br>Total Family Caregivers: 1,730,000
        </h2>
    `;
    titleDiv.style.position = 'absolute';
    titleDiv.style.top = '20px'; // Position it near the top of the map
    titleDiv.style.left = '50%';
    titleDiv.style.transform = 'translateX(-50%)'; // Center the title
    titleDiv.style.zIndex = '1'; // Ensure it's visible above the map

    document.body.appendChild(titleDiv); // Add the title to the map container
}

// GeoJSON data for markers
var markersData = [
    {
        coordinates: [-84.568340, 42.740380], // Lansing
        imgUrl: 'https://imgur.com/aDseYSy.jpg',
        videoUrl: 'https://www.youtube.com/embed/XVut_g99oZE',
        cityName: 'Lansing'
    },
    {
        coordinates: [-83.748333, 42.280833], // Ann Arbor
        imgUrl: 'https://imgur.com/9jaHa0k.jpg',
        videoUrl: 'https://www.youtube.com/embed/gH6-KGoFJ9M',
        cityName: 'Ann Arbor'
    },
    {
        coordinates: [-83.045753, 42.331429], // Detroit (Main)
        imgUrl: 'https://imgur.com/FCmOtb2.jpg',
        videoUrl: 'https://www.youtube.com/embed/r4hTP7Hdfvc',
        cityName: 'Detroit'
    },
    {
        coordinates: [-83.040753, 42.335429], // Detroit (Slightly offset 1)
        imgUrl: 'https://imgur.com/uoRPP4W.jpg',
        videoUrl: 'https://www.youtube.com/embed/46uYcx28oag',
        cityName: 'Detroit'
    },
    {
        coordinates: [-85.6681, 42.9634], // Grand Rapids
        imgUrl: 'https://imgur.com/f2XF0bu.jpg',
        videoUrl: 'https://www.youtube.com/embed/fWWwyXYGcpM',
        cityName: 'Grand Rapids'
    },
    {
        coordinates: [-83.23993, 42.7840], // Lake Orion
        imgUrl: 'https://imgur.com/4ADLIoL.jpg',
        videoUrl: 'https://www.youtube.com/embed/NUGkVdsLZGo',
        cityName: 'Lake Orion'
    },
    {
        coordinates: [-83.775, 42.1664], // Saline
        imgUrl: 'https://imgur.com/8QA0U2T.jpg',
        videoUrl: 'https://www.youtube.com/embed/6n29yVcnH2o',
        cityName: 'Saline'
    },
    {
        coordinates: [-85.0717, 42.9819], // Ionia
        imgUrl: 'https://imgur.com/B64SRnj.jpg',
        videoUrl: 'https://www.youtube.com/embed/6cu6c-ie0ng',
        cityName: 'Ionia'
    },
    {
        coordinates: [-85.6206, 44.7631], // Traverse City (Updated from Boyne City)
        imgUrl: 'https://imgur.com/VrkUN6c.jpg',
        videoUrl: 'https://www.youtube.com/embed/gW5dGlY0JvA',
        cityName: 'Traverse City' // Updated city name
    }
];

// Adding custom styles for the popup
const style = document.createElement('style');
style.innerHTML = `
    .transparent-popup .mapboxgl-popup-content {
        background-color: transparent !important;
        box-shadow: none !important;
        border: none !important;
    }
    .transparent-popup .mapboxgl-popup-tip {
        display: none !important;
    }
`;
document.head.appendChild(style);
