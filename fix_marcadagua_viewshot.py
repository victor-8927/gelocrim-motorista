# -*- coding: utf-8 -*-
f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()
c2 = c

# 1. Import ViewShot
c2 = c2.replace(
    "import { CameraView, useCameraPermissions } from 'expo-camera';",
    "import { CameraView, useCameraPermissions } from 'expo-camera';\nimport ViewShot, { captureRef } from 'react-native-view-shot';"
)

# 2. Import FileSystem
c2 = c2.replace(
    "import * as Location from 'expo-location';",
    "import * as Location from 'expo-location';\nimport * as FileSystem from 'expo-file-system';"
)

# 3. Estados preview
c2 = c2.replace(
    "  const [visorAberto, setVisorAberto]   = useState(false);",
    """  const [visorAberto, setVisorAberto]   = useState(false);
  const [previewFoto, setPreviewFoto]   = useState(null);
  const [previewGps, setPreviewGps]     = useState(null);
  const [previewTs, setPreviewTs]       = useState(null);
  const [previewTipo, setPreviewTipo]   = useState(null);
  const viewShotRef = React.useRef(null);"""
)

# 4. Modificar fim de tirarFotoVisor para abrir preview
old_tirar = "      const asset = { uri: fotoFinal.uri, base64: fotoFinal.base64, gps: gpsFoto, ts: agora.toISOString(), marcadagua: texto };\n      setFotos(prev => ({ ...prev, [tipoVisor]: asset }));\n      setVisorAberto(false);\n      setTipoVisor(null);"
new_tirar = """      setPreviewFoto(fotoFinal.uri);
      setPreviewGps(gpsFoto);
      setPreviewTs(agora);
      setPreviewTipo(tipoVisor);
      setVisorAberto(false);"""
c2 = c2.replace(old_tirar, new_tirar)

# 5. Adicionar funcao confirmarFotoPreview antes de tirarFoto
c2 = c2.replace(
    "  async function tirarFoto(tipo) {",
    """  async function confirmarFotoPreview() {
    try {
      const uri = await captureRef(viewShotRef, { format: 'jpg', quality: 0.8 });
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const asset = { uri, base64: b64, gps: previewGps, ts: previewTs.toISOString() };
      setFotos(prev => ({ ...prev, [previewTipo]: asset }));
      setPreviewFoto(null);
      setPreviewTipo(null);
    } catch(e) { Alert.alert('Erro', 'Nao foi possivel salvar a foto.'); }
  }

  async function tirarFoto(tipo) {"""
)

# 6. Tela de preview antes do visor
old_tela = "  // ── VISOR DE ENQUADRAMENTO ──"
new_tela = """  // ── PREVIEW COM MARCA DAGUA ──
  if (previewFoto) {
    const dataStr = previewTs ? previewTs.toLocaleDateString('pt-BR') + ' ' + previewTs.toLocaleTimeString('pt-BR') : '';
    const gpsStr  = previewGps ? previewGps.latitude.toFixed(5) + ', ' + previewGps.longitude.toFixed(5) : 'GPS indisponivel';
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
          <Image source={{ uri: previewFoto }} style={{ flex: 1 }} resizeMode="contain" />
          <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: 8 }}>
            <Text style={{ color: '#00ff88', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>GELOCRIM</Text>
            <Text style={{ color: '#fff', fontSize: 11, textAlign: 'center' }}>{dataStr}</Text>
            <Text style={{ color: '#00ff88', fontSize: 10, textAlign: 'center' }}>{gpsStr}</Text>
          </View>
        </ViewShot>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#000' }}>
          <TouchableOpacity onPress={() => { setPreviewFoto(null); setVisorAberto(true); }}
            style={{ padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ff4444' }}>
            <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>REPETIR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmarFotoPreview}
            style={{ padding: 14, borderRadius: 8, backgroundColor: '#00ff88' }}>
            <Text style={{ color: '#000', fontWeight: 'bold' }}>CONFIRMAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── VISOR DE ENQUADRAMENTO ──"""
c2 = c2.replace(old_tela, new_tela)

open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU - verifique os textos")
