path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Corrige o progressBox e progressTrack para mostrar o caminhao
old_progress = '''  progressBox: { position:'absolute', top:90, left:16, right:16 },
  progressTrack: { height:6, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'visible', position:'relative' },
  progressFill: { height:6, backgroundColor:'#64B4FF', borderRadius:3 },
  progressDot: { position:'absolute', top:-3, width:12, height:12, borderRadius:6, borderWidth:2, borderColor:'#002855', marginLeft:-6 },
  truckIcon: { position:'absolute', top:-12, fontSize:24, marginLeft:-12 },'''

new_progress = '''  progressBox: { position:'absolute', top:90, left:16, right:16, paddingBottom:28 },
  progressTrack: { height:6, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:3, position:'relative', marginBottom:20 },
  progressFill: { height:6, backgroundColor:'#64B4FF', borderRadius:3 },
  progressDot: { position:'absolute', top:-3, width:12, height:12, borderRadius:6, borderWidth:2, borderColor:'#002855', marginLeft:-6 },
  truckIcon: { position:'absolute', top:-18, fontSize:22 },'''

content = content.replace(old_progress, new_progress)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Caminhao corrigido!')
