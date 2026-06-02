DEST = r'C:\gelocrim-motorista\screens\AssistenteGelocrim.js'

with open(DEST, encoding='utf-8') as f:
    content = f.read()

# Mover avatar para canto superior direito, acima da barra de progresso
OLD = "  miniContainer:  { position:'absolute', bottom:100, right:12, zIndex:999, alignItems:'flex-end' },"
NEW = "  miniContainer:  { position:'absolute', top:100, right:12, zIndex:999, alignItems:'flex-end' },"

if OLD in content:
    content = content.replace(OLD, NEW)
    print("OK! Avatar movido para canto superior direito!")
else:
    print("Tentando alternativa...")
    content = content.replace(
        "bottom:100, right:12, zIndex:999",
        "top:100, right:12, zIndex:999"
    )
    print("OK! Posicao ajustada!")

with open(DEST, 'w', encoding='utf-8') as f:
    f.write(content)

print("Pressione R R no Expo para recarregar!")
