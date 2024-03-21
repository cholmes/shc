const basemapUrl = 'https://1.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';
const basemapUrl2 = 'https://4.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
let overlayUrl = ''; // This will be updated by the user input

const basemapLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: basemapUrl
    })
});

const basemapLayer2 = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: basemapUrl2
    })
});

let overlayLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: overlayUrl, // This will be updated by the user input
        tileSize: [512, 512] // Specify the tile size here
        // tilePixelRatio: 2, // Uncomment if your tiles are high-DPI (Retina) tiles
    })
});

const map = new ol.Map({
    target: 'map',
    layers: [basemapLayer2, basemapLayer, overlayLayer],
    view: new ol.View({
        center: ol.proj.fromLonLat([0, 0]),
        zoom: 2
    })
});

function updateMap() {
    overlayUrl = document.getElementById('xyzUrl').value;
    overlayLayer.setSource(new ol.source.XYZ({
        url: overlayUrl
    }));
}
