f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()
old = "const validas = Array.isArray(rotas) ? rotas.filter(r => r.status==='released'||r.status==='executing') : [];"
new = "const validas = Array.isArray(rotas) ? rotas.filter(r => r.status==='released'||r.status==='executing'||r.status==='liberada'||r.status==='executando') : [];"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
