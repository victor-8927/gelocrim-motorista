f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()
old = "        (loc) => enviarGPS({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, loc.coords.speed, loc.coords.heading)"
new = "        (loc) => { setGpsAtual({latitude: loc.coords.latitude, longitude: loc.coords.longitude}); enviarGPS({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, loc.coords.speed, loc.coords.heading); }"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
