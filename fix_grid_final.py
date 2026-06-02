PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8') as f:
    content = f.read()

# Substituir o bloco de grid por rows fixas 2x2
OLD_GRID_JSX = """          <View style={s.fotosGrid}>
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
          </View>"""

NEW_GRID_JSX = """          <View style={s.fotosRow}>
            {[FOTO_CONFIG[0], FOTO_CONFIG[1]].map(fc => (
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
          <View style={s.fotosRow}>
            {[FOTO_CONFIG[2], FOTO_CONFIG[3]].map(fc => (
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
          </View>"""

if OLD_GRID_JSX in content:
    content = content.replace(OLD_GRID_JSX, NEW_GRID_JSX)
    print("OK: grid 2x2 implementado!")
else:
    print("AVISO: grid JSX nao encontrado")

# Corrigir estilos - tamanho fixo dos quadradinhos
import re

# Substituir estilos do grid
style_fixes = [
    ("  fotosGrid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginVertical:16, paddingHorizontal:4 },",
     "  fotosRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:10 },"),
    ("  fotoQuadrado: { width:'48%', height:150,",
     "  fotoQuadrado: { width:'48%', height:140,"),
    ("  fotoThumb: { width:'100%', height:80, borderRadius:10, resizeMode:'cover', marginBottom:4 },",
     "  fotoThumb: { width:'100%', flex:1, borderRadius:10, resizeMode:'cover', marginBottom:4 },"),
]

for old, new in style_fixes:
    if old in content:
        content = content.replace(old, new)
        print(f"OK: estilo corrigido")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reinicie o Expo!")
