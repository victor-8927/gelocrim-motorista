PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8') as f:
    content = f.read()

# O problema: os estilos foram inseridos dentro do useState
# Precisamos fechar o useState corretamente e mover os estilos para o StyleSheet

OLD = """  const [fotos, setFotos]         = useState({ nf: null, boleto: null, comodato: null, outros: null
  fotosRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  fotoQuadrado: { width:'48%', height:150, backgroundColor:'rgba(0,30,60,0.9)', borderRadius:16, borderWidth:2, borderColor:'rgba(0,200,255,0.4)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:10 },
  fotoQuadradoOk: { borderColor:'#00FF88', borderStyle:'solid', backgroundColor:'rgba(0,255,136,0.1)' },
  fotoThumb: { width:'100%', height:100, borderRadius:10, resizeMode:'cover' },
  fotoEmoji: { fontSize:44, marginBottom:6 },
  fotoQuadLbl: { fontSize:11, fontWeight:'800', color:'#90afd4', letterSpacing:1, textAlign:'center', marginTop:4 },
  fotoObrig: { position:'absolute', top:6, right:8, color:'#FF3355', fontSize:18, fontWeight:'900' },
  fotoHint: { color:'#666', fontSize:11, textAlign:'center', marginBottom:12 },
  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8, borderWidth:1, borderColor:'rgba(0,255,136,0.2)' },
  gpsTxt: { color:'#00FF88', fontSize:10, textAlign:'center' },"""

NEW = "  const [fotos, setFotos]         = useState({ nf: null, boleto: null, comodato: null, outros: null });"

if OLD in content:
    content = content.replace(OLD, NEW)
    print("OK: useState corrigido!")
else:
    print("AVISO: bloco nao encontrado exatamente")
    # Tentar encontrar e mostrar
    idx = content.find('useState({ nf: null')
    if idx >= 0:
        print("Encontrado em:", repr(content[idx:idx+200]))

# Agora adicionar os estilos no lugar certo - antes do fechamento do StyleSheet
ESTILOS = """
  fotosRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  fotoQuadrado: { width:'48%', height:150, backgroundColor:'rgba(0,30,60,0.9)', borderRadius:16, borderWidth:2, borderColor:'rgba(0,200,255,0.4)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:10 },
  fotoQuadradoOk: { borderColor:'#00FF88', borderStyle:'solid', backgroundColor:'rgba(0,255,136,0.1)' },
  fotoThumb: { width:'100%', height:100, borderRadius:10, resizeMode:'cover' },
  fotoEmoji: { fontSize:44, marginBottom:6 },
  fotoQuadLbl: { fontSize:11, fontWeight:'800', color:'#90afd4', letterSpacing:1, textAlign:'center', marginTop:4 },
  fotoObrig: { position:'absolute', top:6, right:8, color:'#FF3355', fontSize:18, fontWeight:'900' },
  fotoHint: { color:'#666', fontSize:11, textAlign:'center', marginBottom:12 },
  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8, borderWidth:1, borderColor:'rgba(0,255,136,0.2)' },
  gpsTxt: { color:'#00FF88', fontSize:10, textAlign:'center' },"""

# Inserir antes do ultimo });
last_close = content.rfind('});')
if last_close >= 0:
    content = content[:last_close] + ESTILOS + '\n' + content[last_close:]
    print("OK: estilos adicionados no StyleSheet!")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reinicie o Expo!")
