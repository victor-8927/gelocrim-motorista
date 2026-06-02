f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()
old = "rotaInfo && (rotaInfo.status==='executing'||rotaInfo.status==='executando') ? 'REGISTRAR ENTREGA' : 'Inicie a operacao primeiro'"
new = """(function(){
  if(!rotaInfo||(rotaInfo.status!=='executing'&&rotaInfo.status!=='executando')) return 'Inicie a operacao primeiro';
  if(stopSel&&stopSel.lat&&stopSel.lng&&gpsAtual){
    var dist=Math.round(calcularDistancia(gpsAtual.latitude,gpsAtual.longitude,parseFloat(stopSel.lat),parseFloat(stopSel.lng)));
    if(dist>500) return 'REGISTRAR ENTREGA ('+dist+'m)';
  }
  return 'REGISTRAR ENTREGA';
})()"""
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
