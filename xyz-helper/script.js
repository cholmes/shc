let baseUrl = "https://services.sentinel-hub.com/ogc/wmts/";
let map = null;
let xyzLayer = null;

function toggleSettings() {
    const settings = document.getElementById('settings');
    settings.classList.toggle('expanded');
}

function updateBaseUrl() {
    const selectedService = document.querySelector('input[name="service"]:checked').value;
    baseUrl = selectedService === 'services' 
        ? "https://services.sentinel-hub.com/ogc/wmts/" 
        : "https://services-uswest2.sentinel-hub.com/ogc/wmts/";
    getLayers();
}

function getXYZUrl(id, identifier) {
    const parameters = `?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=${encodeURIComponent(identifier)}&STYLE=default&FORMAT=image%2Fpng&TILEMATRIXSET=PopularWebMercator256&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;
    return baseUrl + id + parameters;
}

function generateUrl(identifier) {
    const id = document.getElementById('id').value.trim();
    const fullUrl = getXYZUrl(id, identifier);

    const generatedUrlsDiv = document.getElementById('generatedUrls');
    generatedUrlsDiv.innerHTML = '';

    const urlElement = document.createElement('div');
    urlElement.innerHTML = `<a href="${fullUrl}" target="_blank">${fullUrl}</a>`;
    generatedUrlsDiv.appendChild(urlElement);

    return fullUrl;
}

function getLayers() {
    const id = document.getElementById('id').value.trim();

    const serviceTitleDiv = document.getElementById('serviceTitle');
    const layerInfoDiv = document.getElementById('layerInfo');
    const generatedUrlsDiv = document.getElementById('generatedUrls');
    const coordsDiv = document.getElementById('layerCoordinates');
    const mapDiv = document.getElementById('map');
    const xyzDiv = document.getElementById('xyzTemplate');
    
    serviceTitleDiv.innerHTML = '';
    layerInfoDiv.innerHTML = '';
    generatedUrlsDiv.innerHTML = '';
    coordsDiv.innerHTML = '';
    mapDiv.style.display = 'none';
    xyzDiv.innerHTML = '';
    
    if (map) {
        map.setTarget(null);
        map = null;
    }

    if (!id) {
        layerInfoDiv.innerHTML = 'Please enter an ID.';
        return;
    }

    layerInfoDiv.innerHTML = '<p class="loading">Loading...</p>';

    const url = `${baseUrl}${id}?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities`;

    fetch(url)
        .then(response => response.text())
        .then(str => {
            const parser = new window.DOMParser();
            const xmlDoc = parser.parseFromString(str, "text/xml");

            const exceptionText = xmlDoc.querySelector('ows\\:ExceptionText, ExceptionText');
            if (exceptionText) {
                throw new Error(exceptionText.textContent);
            }

            const titleElement = xmlDoc.querySelector('ows\\:Title, Title');
            if (titleElement) {
                let serviceTitle = titleElement.textContent.replace('Sentinel Hub WMTS service - ', '');
                serviceTitleDiv.innerHTML = `<h2>${serviceTitle}</h2>`;
                document.getElementById('configNameLabel').style.display = '';
            } else {
                document.getElementById('configNameLabel').style.display = 'none';
            }

            const layers = xmlDoc.querySelectorAll('Layer');
            layerInfoDiv.innerHTML = '';

            if (layers.length > 0) {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'layer-list-label';
                labelDiv.textContent = 'Available Layers';
                layerInfoDiv.appendChild(labelDiv);
            }

            layers.forEach(layer => {
                const title = layer.querySelector('Title').textContent;
                const abstract = layer.querySelector('Abstract').textContent;
                const identifier = layer.querySelector('Identifier').textContent;

                const layerDiv = document.createElement('div');
                layerDiv.className = 'layer';
                if (title === abstract) {
                    layerDiv.innerHTML = `<div class=\"layer-title\">${title}</div>`;
                } else {
                    layerDiv.innerHTML = `<div class=\"layer-title\">${title}</div><div class=\"layer-abstract\">${abstract}</div>`;
                }
                layerDiv.onclick = function() {
                    selectLayer(layerDiv, layer);
                };
                layerInfoDiv.appendChild(layerDiv);
            });
        })
        .catch(error => {
            console.error('Error fetching or parsing:', error);
            layerInfoDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        });
}

function selectLayer(layerDiv, layer) {
    const previousSelectedLayer = document.querySelector('.layer.selected');
    if (previousSelectedLayer) {
        previousSelectedLayer.classList.remove('selected');
    }

    layerDiv.classList.add('selected');
    displayLayerCoordinates(layer);
    displayXYZTemplate(layer);
}

function lonLatToXY(lon, lat) {
    const x = (lon + 180) / 360;
    const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2;
    return { x, y };
}

function calculateCenterAndZoom(layer) {
    const boundingBox = layer.querySelector('WGS84BoundingBox');
    const lowerCorner = boundingBox.querySelector('LowerCorner').textContent.split(' ');
    const upperCorner = boundingBox.querySelector('UpperCorner').textContent.split(' ');
    const lonMin = parseFloat(lowerCorner[0]);
    const latMin = parseFloat(lowerCorner[1]);
    const lonMax = parseFloat(upperCorner[0]);
    const latMax = parseFloat(upperCorner[1]);

    const { x: xMin, y: yMin } = lonLatToXY(lonMin, latMin);
    const { x: xMax, y: yMax } = lonLatToXY(lonMax, latMax);

    const lon = (lonMin + lonMax) / 2;
    const lat = (latMin + latMax) / 2;

    const mapWidthInTiles = 1 / (xMax - xMin);
    const mapHeightInTiles = 1 / (yMax - yMin);

    const tiles = Math.max(mapWidthInTiles, mapHeightInTiles);
    const zoom = Math.floor(Math.log2(tiles)) + 2;

    return { lon, lat, zoom };
}

function initMap(center, zoom, xyzUrl) {
    const mapContainer = document.getElementById('map');
    mapContainer.style.display = 'block';
    
    // Convert from WGS84 [longitude, latitude] to Web Mercator [x, y]
    const centerWebMercator = ol.proj.fromLonLat([center.lon, center.lat]);
    
    // Create Carto basemap layer (Voyager with labels)
    const cartoLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attributions: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
        })
    });
    
    // Create XYZ layer from the provided URL
    xyzLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: xyzUrl
        })
    });
    
    // Initialize map
    if (map) {
        map.setTarget(null);
    }
    
    map = new ol.Map({
        target: 'map',
        layers: [cartoLayer, xyzLayer],
        view: new ol.View({
            center: centerWebMercator,
            zoom: zoom
        })
    });
}

function copyToClipboard(value) {
    navigator.clipboard.writeText(value);
}

function displayLayerCoordinates(layer) {
    const centerAndZoom = calculateCenterAndZoom(layer);
    const coordsDiv = document.getElementById('layerCoordinates');
    if (!coordsDiv) return;
    const centerStr = `${centerAndZoom.lon.toFixed(6)}, ${centerAndZoom.lat.toFixed(6)}`;
    const zoomStr = `${centerAndZoom.zoom}`;
    coordsDiv.innerHTML = `
        <div>
            <strong>Center:</strong> <span>${centerStr}</span>
            <button class="copy-btn" onclick="copyToClipboard('${centerStr}')" title="Copy center"><i class='fa-solid fa-copy'></i></button>
        </div>
        <div>
            <strong>Zoom:</strong> <span>${zoomStr}</span>
            <button class="copy-btn" onclick="copyToClipboard('${zoomStr}')" title="Copy zoom"><i class='fa-solid fa-copy'></i></button>
        </div>
    `;
    // Get the identifier and generate the XYZ URL
    const identifier = layer.querySelector('Identifier').textContent;
    const id = document.getElementById('id').value.trim();
    const xyzUrl = getXYZUrl(id, identifier);
    // Initialize or update the map
    initMap(centerAndZoom, centerAndZoom.zoom, xyzUrl);
}

function displayXYZTemplate(layer) {
    const identifier = layer.querySelector('Identifier').textContent;
    const id = document.getElementById('id').value.trim();
    const xyzUrl = getXYZUrl(id, identifier);
    const xyzDiv = document.getElementById('xyzTemplate');
    xyzDiv.innerHTML = `<div><strong>XYZ template url:</strong> <span>${xyzUrl}</span><button class="copy-btn" onclick="copyToClipboard('${xyzUrl}')" title="Copy XYZ template"><i class='fa-solid fa-copy'></i></button></div>`;
}