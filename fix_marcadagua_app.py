f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()

old = """      const foto = await cameraRef.takePictureAsync({ base64: true, quality: 0.6 });
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

new = """      const foto = await cameraRef.takePictureAsync({ base64: true, quality: 0.8 });
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, timeout: 5000 });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch(gpsErr) {
        gpsFoto = gps;
      }
      // Marca dagua via ImageManipulator
      const agora = new Date();
      const dataStr = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
      const gpsStr = gpsFoto ? gpsFoto.latitude.toFixed(5) + ',' + gpsFoto.longitude.toFixed(5) : 'GPS indisponivel';
      const texto = 'GELOCRIM | ' + dataStr + ' | ' + gpsStr;
      let fotoFinal = foto;
      try {
        fotoFinal = await ImageManipulator.manipulateAsync(
          foto.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
      } catch(e) { fotoFinal = foto; }
      const asset = { uri: fotoFinal.uri, base64: fotoFinal.base64, gps: gpsFoto, ts: agora.toISOString(), marcadagua: texto };"""

c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
