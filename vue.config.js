module.exports = {
  "pluginOptions": {
    "electronBuilder": {
      "nodeIntegration": true,
      "experimentalNativeDepCheck": true,
      "builderOptions": {
        publish: ['github'],
        "artifactName": "${productName} Setup.${ext}",
        "appId": "dev.ruurd.screenshare",
        "productName": "Screen Share",
      },
    }
  },
  "transpileDependencies": [
    "vuetify"
  ],
  pwa: {
    name: 'Screen Share',
    themeColor: '#17181a',
    msTileColor: "#4bed99",
    manifestOptions: {
      "name": "Screen Share",
      "short_name": "Screen Share",
      "start_url": "./",
      "display": "standalone",
      "background_color": "#17181a",
      "theme_color": "#4bed94",
      "description": "Edit videos",
      "icons": [
        {
          "src": "img/icons/favicon-16x16.png",
          "sizes": "16x16",
          "type": "image/png"
        },
        {
          "src": "img/icons/apple-touch-icon-76x76.png",
          "sizes": "76x76",
          "type": "image/png"
        },
        {
          "src": "img/icons/favicon-32x32.png",
          "sizes": "32x32",
          "type": "image/png"
        },
        {
          "src": "img/icons/msapplication-icon-144x144.png",
          "sizes": "144x144",
          "type": "image/png"
        },
        {
          "src": "img/icons/android-chrome-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        },
        {
          "src": "img/icons/android-chrome-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    },
  }
}