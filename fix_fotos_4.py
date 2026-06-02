PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

start = None
end = None
for i, line in enumerate(lines):
    if '// TELA DE FOTOS' in line:
        start = i
    if start and i > start and '// TELA DETALHES' in line:
        end = i
        break

print(f"Bloco: linhas {start+1} a {end+1 if end else '?'}")

NEW_BLOCK = """  // TELA DE FOTOS
  const FOTO_CONFIG = [
    { key: 'nf',       label: 'FOTO NF',       emoji: '📄', obrigatorio: true  },
    { key: 'boleto',   label: 'FOTO BOLETO',   emoji: '💳', obrigatorio: false },
    { key: 'comodato', label: 'FOTO COMODATO', emoji: '📋', obrigatorio: false },
    { key: 'outros',   label: 'OUTROS',        emoji: '📎', obrigatorio: false },
  ];
  const podeConfirmar = fotos.nf !== null;

  if (tela === 'fotos') {
    return (
      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.fotoTitulo}>EVIDENCIA BLINDADA</Text>
          <Text style={s.fotoCliente}>{stop.recipient_name}</Text>
          {gps && (
            <View style={s.gpsBar}>
              <Text style={s.gpsTxt}>GPS: {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}</Text>
              <Text style={s.gpsTxt}>{new Date().toLocaleString('pt-BR')}</Text>
            </View>
          )}
          <View style={s.fotosGrid}>
            {FOTO_CONFIG.map(fc => (
              <TouchableOpacity key={fc.key} style={[s.fotoQuadrado, fotos[fc.key] && s.fotoQuadradoOk]} onPress={() => tirarFoto(fc.key)}>
                {fotos[fc.key] ? (
                  <Image source={{ uri: fotos[fc.key].uri }} style={s.fotoThumb}/>
                ) : (
                  <Text style={s.fotoEmoji}>{fc.emoji}</Text>
                )}
                <Text style={[s.fotoQuadLbl, fotos[fc.key] && {color:'#00FF88'}]}>{fc.label}</Text>
                {fc.obrigatorio && !fotos[fc.key] && <Text style={s.fotoObrig}>*</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fotoHint}>* Foto NF obrigatoria para finalizar</Text>
          <TouchableOpacity
            style={[s.btnConfirmar, (!podeConfirmar || loading) && { opacity: 0.4 }]}
            onPress={confirmarEntrega}
            disabled={!podeConfirmar || loading}
          >
            {loading
              ? <ActivityIndicator color="#001020" />
              : <Text style={s.btnConfirmarTxt}>FINALIZAR E PROXIMO</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.btnVoltar} onPress={() => setTela('detalhes')}>
            <Text style={s.btnVoltarTxt}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  }
"""

if end:
    new_lines = lines[:start] + [NEW_BLOCK] + lines[end:]
else:
    new_lines = lines[:start] + [NEW_BLOCK] + lines[start+40:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("OK! 4 quadradinhos implementados!")

# Adicionar estilos
with open(PATH, encoding='utf-8') as f:
    content = f.read()

ESTILOS = "\n  fotosGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, justifyContent:'space-between', marginVertical:16 },\n  fotoQuadrado: { width:'47%', aspectRatio:1, backgroundColor:'rgba(0,100,150,0.2)', borderRadius:12, borderWidth:2, borderColor:'rgba(0,200,255,0.3)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:8 },\n  fotoQuadradoOk: { borderColor:'#00FF88', borderStyle:'solid', backgroundColor:'rgba(0,255,136,0.1)' },\n  fotoThumb: { width:'100%', height:'75%', borderRadius:8, resizeMode:'cover' },\n  fotoEmoji: { fontSize:36, marginBottom:4 },\n  fotoQuadLbl: { fontSize:10, fontWeight:'700', color:'#90afd4', letterSpacing:1, textAlign:'center', marginTop:4 },\n  fotoObrig: { position:'absolute', top:6, right:8, color:'#FF3355', fontSize:18, fontWeight:'900' },\n  fotoHint: { color:'#666', fontSize:11, textAlign:'center', marginBottom:12 },\n  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8, borderWidth:1, borderColor:'rgba(0,255,136,0.2)' },\n  gpsTxt: { color:'#00FF88', fontSize:10, textAlign:'center' },"

if "opcional:" in content:
    content = content.replace(
        "  opcional: { color: '#666', fontSize: 10 },",
        "  opcional: { color: '#666', fontSize: 10 }," + ESTILOS
    )
    with open(PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK! Estilos adicionados!")

print("Reinicie o Expo!")
