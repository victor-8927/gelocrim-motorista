f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()

old1 = "style={[s.btnEntrar,rotaInfo && rotaInfo.status!=='executing' && {opacity:0.4}]}\n            disabled={!rotaInfo || rotaInfo.status!=='executing'}"
new1 = "style={[s.btnEntrar,rotaInfo && rotaInfo.status!=='executing'&&rotaInfo.status!=='executando' && {opacity:0.4}]}\n            disabled={!rotaInfo || (rotaInfo.status!=='executing'&&rotaInfo.status!=='executando')}"

old2 = "rotaInfo && rotaInfo.status==='executing' ? 'REGISTRAR ENTREGA' : 'Inicie a operacao primeiro'"
new2 = "rotaInfo && (rotaInfo.status==='executing'||rotaInfo.status==='executando') ? 'REGISTRAR ENTREGA' : 'Inicie a operacao primeiro'"

old3 = "{rotaInfo && rotaInfo.status==='executing' && ("
new3 = "{rotaInfo && (rotaInfo.status==='executing'||rotaInfo.status==='executando') && ("

c2 = c.replace(old1, new1)
c2 = c2.replace(old2, new2)
c2 = c2.replace(old3, new3)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c else "NAO ALTEROU")
print("Trocas feitas!")
