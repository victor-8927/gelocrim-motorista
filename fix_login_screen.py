caminho = r"C:\gelocrim-motorista\screens\LoginScreen.js"
with open(caminho, encoding="utf-8", errors="ignore") as f:
    data = f.read()

antigo = "  btnAdminDiscret:  { position:'absolute', top:16, right:16, padding:10, zIndex:10 },"
novo   = "  btnAdminDiscret:  { position:'absolute', top:48, right:12, padding:10, zIndex:10 },"

if antigo in data:
    data = data.replace(antigo, novo)
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(data)
    print("OK - posicao do botao admin corrigida!")
else:
    print("Nao encontrado")
