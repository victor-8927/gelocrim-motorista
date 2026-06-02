PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8') as f:
    content = f.read()

# 1. Adicionar import do ViewShot
OLD_IMPORT = "import * as ImagePicker from 'expo-image-picker';"
NEW_IMPORT = """import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';"""

if OLD_IMPORT in content:
    content = content.replace(OLD_IMPORT, NEW_IMPORT)
    print("OK: import ViewShot adicionado!")

# 2. Adicionar estado de preview
OLD_STATE = "  const [loading, setLoading]     = useState(false);"
NEW_STATE = """  const [loading, setLoading]     = useState(false);
  const [preview, setPreview]     = useState(null); // { tipo, asset }
  const viewShotRef = useRef(null);"""

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE)
    print("OK: estado preview adicionado!")

# 3. Modificar tirarFoto para mostrar preview em vez de salvar direto
OLD_TIRAR = """    if (!result.canceled) {
      const asset = result.assets[0];
      setFotos(p => ({ ...p, [tipo]: asset }));
    }
  }"""

NEW_TIRAR = """    if (!result.canceled) {
      const asset = result.assets[0];
      // Capturar GPS no momento exato da foto
      let gpsAtual = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        gpsAtual = loc.coords;
        setGps(gpsAtual);
      } catch {}
      setPreview({ tipo, asset, gps: gpsAtual });
    }
  }"""

if OLD_TIRAR in content:
    content = content.replace(OLD_TIRAR, NEW_TIRAR)
    print("OK: tirarFoto mostra preview!")

# 4. Adicionar tela de preview antes da tela de fotos
OLD_TELA_FOTOS = "  // TELA DE FOTOS"
NEW_PREVIEW_TELA = """  // TELA PREVIEW FOTO
  if (preview) {
    const now = new Date();
    const dataHora = now.toLocaleString('pt-BR');
    const gpsStr = preview.gps
      ? `GPS: ${preview.gps.latitude.toFixed(5)}, ${preview.gps.longitude.toFixed(5)}`
      : 'GPS: sem sinal';
    return (
      <View style={{flex:1, backgroundColor:'#000'}}>
        <ViewShot ref={viewShotRef} options={{format:'jpg', quality:0.8}} style={{flex:1}}>
          <Image source={{uri: preview.asset.uri}} style={{flex:1, resizeMode:'contain'}}/>
          <View style={s.watermark}>
            <Text style={s.watermarkTxt}>{dataHora}</Text>
            <Text style={s.watermarkTxt}>{stop.address}</Text>
            <Text style={s.watermarkTxt}>Manaus - Amazonas</Text>
            <Text style={s.watermarkTxt}>{gpsStr}</Text>
          </View>
        </ViewShot>
        <View style={s.previewBtns}>
          <TouchableOpacity style={s.btnRejeitar} onPress={() => setPreview(null)}>
            <Text style={s.btnRejeitarTxt}>Tirar Outra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnAprovar} onPress={async () => {
            try {
              const uri = await viewShotRef.current.capture();
              const asset = { ...preview.asset, uri };
              setFotos(p => ({ ...p, [preview.tipo]: asset }));
            } catch {
              setFotos(p => ({ ...p, [preview.tipo]: preview.asset }));
            }
            setPreview(null);
          }}>
            <Text style={s.btnAprovarTxt}>Usar Foto</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TELA DE FOTOS"""

if OLD_TELA_FOTOS in content:
    content = content.replace(OLD_TELA_FOTOS, NEW_PREVIEW_TELA)
    print("OK: tela de preview adicionada!")

# 5. Adicionar estilos de watermark
OLD_GPS_STYLE = "  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8 },"
NEW_GPS_STYLE = """  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8 },
  watermark: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(0,0,0,0.6)', padding:10 },
  watermarkTxt: { color:'#00FFEA', fontSize:11, fontFamily:'monospace', textAlign:'right' },
  previewBtns: { flexDirection:'row', padding:12, gap:12, backgroundColor:'#000' },
  btnRejeitar: { flex:1, padding:14, borderRadius:10, borderWidth:2, borderColor:'#FF3355', alignItems:'center' },
  btnRejeitarTxt: { color:'#FF3355', fontWeight:'700' },
  btnAprovar: { flex:1, padding:14, borderRadius:10, backgroundColor:'#00FF88', alignItems:'center' },
  btnAprovarTxt: { color:'#000', fontWeight:'900' },"""

if OLD_GPS_STYLE in content:
    content = content.replace(OLD_GPS_STYLE, NEW_GPS_STYLE)
    print("OK: estilos watermark adicionados!")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nReinicie o Expo!")
