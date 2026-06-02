f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()
old = "            disabled={!rotaInfo || (rotaInfo.status!=='executing'&&rotaInfo.status!=='executando') || (stopSel && stopSel.lat && stopSel.lng && gpsAtual && calcularDistancia(gpsAtual.latitude, gpsAtual.longitude, parseFloat(stopSel.lat), parseFloat(stopSel.lng)) > 200)}"
new = "            disabled={!rotaInfo || (rotaInfo.status!=='executing'&&rotaInfo.status!=='executando')}"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
