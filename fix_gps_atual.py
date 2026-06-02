f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()
old = "  const [filaCount, setFilaCount] = useState(0);"
new = "  const [filaCount, setFilaCount] = useState(0);\n  const [gpsAtual, setGpsAtual] = useState(null);"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
