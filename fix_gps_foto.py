f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()

old = """      const foto = await cameraRef.takePictureAsync({ base64: true, quality: 0.6 });
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch {}
      const asset = { uri: foto.uri, base64: foto.base64, gps: gpsFoto, ts: new Date().toISOString() };"""

new = """      const foto = await cameraRef.takePictureAsync({ base64: true, quality: 0.6 });
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, timeout: 5000 });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch(gpsErr) {
        // usa ultimo GPS conhecido
        gpsFoto = gps;
      }
      const asset = { uri: foto.uri, base64: foto.base64, gps: gpsFoto, ts: new Date().toISOString() };"""

c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
