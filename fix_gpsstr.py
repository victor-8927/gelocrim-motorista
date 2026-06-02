f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()
old = "    const gpsStr  = previewGps ? previewGps.latitude.toFixed(5) + ', ' + previewGps.longitude.toFixed(5) :"
new = "    const gpsStr  = previewEndereco ? previewEndereco : (previewGps ? previewGps.latitude.toFixed(5) + ', ' + previewGps.longitude.toFixed(5) :"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
