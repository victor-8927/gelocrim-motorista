PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Corrigir o grid de fotos - usar padding e margem em vez de gap
OLD_GRID = "  fotosGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, justifyContent:'space-between', marginVertical:16 },"
NEW_GRID = "  fotosGrid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginVertical:16, paddingHorizontal:4 },"

OLD_QUAD = "  fotoQuadrado: { width:'47%', aspectRatio:1, backgroundColor:'rgba(0,100,150,0.2)', borderRadius:12, borderWidth:2, borderColor:'rgba(0,200,255,0.3)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:8 },"
NEW_QUAD = "  fotoQuadrado: { width:'48%', aspectRatio:0.9, backgroundColor:'rgba(0,30,60,0.8)', borderRadius:16, borderWidth:2, borderColor:'rgba(0,200,255,0.4)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:12, marginBottom:10 },"

OLD_THUMB = "  fotoThumb: { width:'100%', height:'75%', borderRadius:8, resizeMode:'cover' },"
NEW_THUMB = "  fotoThumb: { width:'100%', height:80, borderRadius:10, resizeMode:'cover', marginBottom:4 },"

OLD_EMOJI = "  fotoEmoji: { fontSize:36, marginBottom:4 },"
NEW_EMOJI = "  fotoEmoji: { fontSize:44, marginBottom:8 },"

OLD_LBL = "  fotoQuadLbl: { fontSize:10, fontWeight:'700', color:'#90afd4', letterSpacing:1, textAlign:'center', marginTop:4 },"
NEW_LBL = "  fotoQuadLbl: { fontSize:11, fontWeight:'800', color:'#90afd4', letterSpacing:1.5, textAlign:'center', marginTop:4 },"

for old, new in [(OLD_GRID,NEW_GRID),(OLD_QUAD,NEW_QUAD),(OLD_THUMB,NEW_THUMB),(OLD_EMOJI,NEW_EMOJI),(OLD_LBL,NEW_LBL)]:
    if old in content:
        content = content.replace(old, new)
        print(f"OK: {old[:40]}...")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reinicie o Expo!")
