f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()

old = "import * as ImagePicker from 'expo-image-picker';"
new = "import * as ImagePicker from 'expo-image-picker';\nimport * as ImageManipulator from 'expo-image-manipulator';"
c2 = c.replace(old, new)

old2 = """    if (!result.canceled) {
      // Captura GPS exatamente no momento da foto
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch {}
      const asset = { ...result.assets[0], gps: gpsFoto, ts: new Date().toISOString() };
      setFotos(prev => ({ ...prev, [tipo]: asset }));
    }"""

new2 = """    if (!result.canceled) {
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch {}
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const asset = { ...result.assets[0], uri: compressed.uri, base64: compressed.base64, gps: gpsFoto, ts: new Date().toISOString() };
        setFotos(prev => ({ ...prev, [tipo]: asset }));
      } catch {
        const asset = { ...result.assets[0], gps: gpsFoto, ts: new Date().toISOString() };
        setFotos(prev => ({ ...prev, [tipo]: asset }));
      }
    }"""

c3 = c2.replace(old2, new2)
open(f, "w", encoding="utf-8").write(c3)
print("OK!" if c != c3 else "NAO ALTEROU")
