const labelsUrl = 'https://1.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';
const nolabelsUrl = 'https://4.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png';
let overlayUrl = ''; // This will be updated by the user input

const labelsLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: labelsUrl
    })
});

const nolabelsLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: nolabelsUrl
    })
});

let overlayLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: overlayUrl // Initially empty
    })
});

const map = new ol.Map({
    target: 'map',
    layers: [nolabelsLayer, labelsLayer, overlayLayer],
    view: new ol.View({
        center: ol.proj.fromLonLat([-0.7507, 44.8178]), // Coordinates are longitude, latitude
        zoom: 9
    })
});

function updateMap() {
    const year = document.getElementById('year').value;
    overlayUrl = document.getElementById('xyzUrl').value + `&time=${year}-01-01`;
    overlayLayer.setSource(new ol.source.XYZ({
        url: overlayUrl
    }));
}

function changeYear(delta) {
    let year = parseInt(document.getElementById('year').value);
    year += delta;
    if (year >= 2013 && year <= 2022) {
        document.getElementById('year').value = year;
        updateMap();
    }
}
