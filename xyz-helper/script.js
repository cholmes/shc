let baseUrl = "https://services.sentinel-hub.com/ogc/wmts/";

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
    const mapLinkDiv = document.getElementById('mapLink');
    const generatedUrlsDiv = document.getElementById('generatedUrls');
    const coordsDiv = document.getElementById('layerCoordinates');
    serviceTitleDiv.innerHTML = '';
    layerInfoDiv.innerHTML = '';
    mapLinkDiv.innerHTML = '';
    generatedUrlsDiv.innerHTML = '';
    coordsDiv.innerHTML = '';

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
            }

            const layers = xmlDoc.querySelectorAll('Layer');
            layerInfoDiv.innerHTML = '';

            layers.forEach(layer => {
                const title = layer.querySelector('Title').textContent;
                const abstract = layer.querySelector('Abstract').textContent;
                const identifier = layer.querySelector('Identifier').textContent;

                const layerDiv = document.createElement('div');
                layerDiv.className = 'layer';
                layerDiv.innerHTML = `<h3>${title}</h3><p>${abstract}</p>`;
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
    displayMapLink(layer);
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

function displayLayerCoordinates(layer) {
    const { lon, lat, zoom } = calculateCenterAndZoom(layer);
    const coordsDiv = document.getElementById('layerCoordinates');
    
    if (!coordsDiv) return;
    
    coordsDiv.innerHTML = `<p>Center: ${lon.toFixed(6)}, ${lat.toFixed(6)} | Zoom: ${zoom}</p>`;
}

function displayMapLink(layer) {
    const { lon, lat, zoom } = calculateCenterAndZoom(layer);
    const identifier = layer.querySelector('Identifier').textContent;
    const layerUrl = generateUrl(identifier);

    const mapLinkDiv = document.getElementById('mapLink');
    mapLinkDiv.innerHTML = '';

    mapLinkDiv.innerHTML = `<a href="https://felt.com/map/new?lat=${lat}&lon=${lon}&zoom=${zoom}&layer_urls[]=${encodeURIComponent(layerUrl)}" target="_blank">Open in Felt</a>`;
}