f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()
old = "setRotaInfo(function(p){ return Object.assign({},p,{status:'executing'}); });"
new = "setRotaInfo(function(p){ return Object.assign({},p,{status:'executando'}); });"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
