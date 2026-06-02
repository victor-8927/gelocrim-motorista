f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()

# Adicionar import do MapViewDirections
old = "import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';"
new = "import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';\nimport MapViewDirections from 'react-native-maps-directions';\nconst GOOGLE_MAPS_KEY = 'AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';"
c2 = c.replace(old, new)

# Substituir Polyline por MapViewDirections quando tiver proximo stop
old2 = "          {routeCoords.length>1 && <Polyline coordinates={routeCoords} strokeColor={NEON.green} strokeWidth={4}/>}"
new2 = """          {proxStop && gpsAtual && (
            <MapViewDirections
              origin={{latitude: gpsAtual.latitude, longitude: gpsAtual.longitude}}
              destination={{latitude: parseFloat(proxStop.lat), longitude: parseFloat(proxStop.lng)}}
              apikey={GOOGLE_MAPS_KEY}
              strokeWidth={5}
              strokeColor={NEON.cyan}
              precision="high"
              timePrecision="now"
              onReady={function(result) {
                if (result.legs && result.legs[0] && result.legs[0].steps && result.legs[0].steps[0]) {
                  var instrucao = result.legs[0].steps[0].html_instructions.replace(/<[^>]*>/g, '');
                  assistente.mostrar('chegada', instrucao);
                }
              }}
            />
          )}
          {!proxStop && routeCoords.length>1 && <Polyline coordinates={routeCoords} strokeColor={NEON.green} strokeWidth={4}/>}"""

c3 = c2.replace(old2, new2)
open(f, "w", encoding="utf-8").write(c3)
print("OK!" if c != c3 else "NAO ALTEROU")
