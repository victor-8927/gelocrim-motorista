f = r'C:\gelocrim-motorista\screens\EntregaScreen.js'
c = open(f, encoding='utf-8').read()
e = """
  fotosRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  fotoQuadrado: { width:'48%', height:150, backgroundColor:'rgba(0,30,60,0.9)', borderRadius:16, borderWidth:2, borderColor:'rgba(0,200,255,0.4)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:10 },
  fotoQuadradoOk: { borderColor:'#00FF88', borderStyle:'solid', backgroundColor:'rgba(0,255,136,0.1)' },
  fotoThumb: { width:'100%', height:100, borderRadius:10, resizeMode:'cover' },
  fotoEmoji: { fontSize:44, marginBottom:6 },
  fotoQuadLbl: { fontSize:11, fontWeight:'800', color:'#90afd4', textAlign:'center', marginTop:4 },
  fotoObrig: { position:'absolute', top:6, right:8, color:'#FF3355', fontSize:18 },
  fotoHint: { color:'#666', fontSize:11, textAlign:'center', marginBottom:12 },
  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8 },
  gpsTxt: { color:'#00FF88', fontSize:10, textAlign:'center' },
"""
i = c.rfind('});')
c = c[:i] + e + c[i:]
open(f, 'w', encoding='utf-8').write(c)
print('OK!')
