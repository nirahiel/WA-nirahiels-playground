const apiExtra = "https://unpkg.com/@workadventure/scripting-api-extra@1.3.2/dist";

class Properties {
    constructor(properties) {
        this.properties = null != properties ? properties : []
    }
    get(propertyName) {
        const property = this.properties.filter((property => property.name === propertyName)).map((entry => entry.value));
        if (property.length > 1) throw new Error('Expected only one property to be named "' + propertyName + '"');
        if (0 !== property.length) return property[0]
    }
    getString(property) {
        return this.getByType(property, "string")
    }
    getNumber(propertyName) {
        return this.getByType(propertyName, "number")
    }
    getBoolean(propertyName) {
        return this.getByType(propertyName, "boolean")
    }
    getByType(propertyName, type) {
        const property = this.get(propertyName);
        if (void 0 !== property) {
            if (typeof property !== type) throw new Error('Expected property "' + propertyName + '" to have type "' + type + '"');
            return property
        }
    }
    mustGetString(propertyName) {
        return this.mustGetByType(propertyName, "string")
    }
    mustGetNumber(propertyName) {
        return this.mustGetByType(propertyName, "number")
    }
    mustGetBoolean(propertyName) {
        return this.mustGetByType(propertyName, "boolean")
    }
    mustGetByType(propertyName, type) {
        const property = this.get(propertyName);
        if (void 0 === property) throw new Error('Property "' + propertyName + '" is missing');
        if (typeof property !== type) throw new Error('Expected property "' + propertyName + '" to have type "' + type + '"');
        return property
    }
    getType(propertyName) {
        const type = this.properties.filter((prop => prop.name === propertyName)).map((entry => entry.type));
        if (type.length > 1) throw new Error('Expected only one property to be named "' + propertyName + '"');
        if (0 !== type.length) return type[0]
    }
}

function flattenMapLayers(layers, path, map) {
    for (const layer of layers) {
        if (layer.type === "group") {
            flattenMapLayers(layer.layers, path + layer.name + "/", map)
        } else {
            layer.name = path + layer.name;
            map.set(layer.name, layer)
        }
    }
}
async function getMapLayers() {
    const tiledMap = await WA.room.getTiledMap();
    const map = new Map;
    return flattenMapLayers(tiledMap.layers, "", map), map
}

function configureExit(variableName) {
    console.log("Configure exit : " + variableName)
    const args = variableName ? "#" + variableName.join() : "";
    console.log(apiExtra + "/configuration.html" + args)
    WA.nav.openCoWebSite(apiExtra + "/configuration.html" + args)
}

function setupConfigTrigger(variableName, layerName, layerProperties) {
    let actionMessage;
    const adminTag = layerProperties.getString("openConfigAdminTag");
    let canConfigure = true;

    if (adminTag && !WA.player.tags.includes(adminTag)) {
        canConfigure = false;
    }
    WA.room.onEnterLayer(layerName).subscribe((() => {
        const trigger = layerProperties.getString("openConfigTrigger");
        var triggerMessage;
        if (canConfigure) {
            if (trigger && trigger === "onaction") {
                if (actionMessage) {
                    actionMessage.remove();
                }
                triggerMessage = layerProperties.getString("openConfigTriggerMessage");
                if (!triggerMessage) {
                    triggerMessage = "Press SPACE or touch here to configure";
                }
                actionMessage = WA.ui.displayActionMessage({
                    message: triggerMessage,
                    callback: () => configureExit(variableName)
                });
            } else {
                configureExit(variableName)
            }
        }
    })), WA.room.onLeaveLayer(layerName).subscribe((() => {
        if (actionMessage) {
            actionMessage.remove();
        }
        WA.nav.closeCoWebSite(); 
    }))
}

WA.onInit().then(async () => {
    if (WA.player.tags.includes('editor')) {
        ['exitEastConfig', 'exitSouthConfig'].forEach(WA.room.showLayer);
    }
    const tiledMap = await WA.room.getTiledMap();
    const sortedMapLayers = await getMapLayers();
    const configLayer = tiledMap.layers.find((e => "configuration" === e.name));
    if (configLayer) {
        const tag = new Properties(configLayer.properties).getString("tag");
        console.log(tag)
        if (tag && WA.player.tags.includes(tag)) {
            WA.ui.registerMenuCommand("Configure the room", (() => {
                WA.nav.openCoWebSite(apiExtra + "/configuration.html", true)
            }));
        }
        for (const layer of sortedMapLayers.values()) {
            const layerProperties = new Properties(layer.properties),
            openConfig = layerProperties.getString("openConfig");
            if (openConfig && "tilelayer" === layer.type) {
                setupConfigTrigger(openConfig.split(","), layer.name, layerProperties);
            }
        }
    }

});