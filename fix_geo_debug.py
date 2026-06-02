f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()
old = "        } catch { enderecoFinal = null; }"
new = "        } catch(geoErr) { console.log('GEO ERRO:', geoErr); enderecoFinal = null; }"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
