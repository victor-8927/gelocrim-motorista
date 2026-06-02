f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()

# 1. Adicionar import do expo-camera
old_import = "import * as ImagePicker from 'expo-image-picker';"
new_import = "import * as ImagePicker from 'expo-image-picker';\nimport { CameraView, useCameraPermissions } from 'expo-camera';"
c = c.replace(old_import, new_import)

# 2. Adicionar estado do visor apos os estados existentes
old_state = "const [loading, setLoading] = useState(false);"
new_state = """const [loading, setLoading] = useState(false);
  const [visorAberto, setVisorAberto]   = useState(false);
  const [tipoVisor, setTipoVisor]       = useState(null);
  const [cameraRef, setCameraRef]       = useState(null);
  const [permCamera, requestPermCamera] = useCameraPermissions();"""
c = c.replace(old_state, new_state)

# 3. Adicionar funcao abrirVisor e tirarFotoVisor antes de tirarFoto
old_func = "  async function tirarFoto(tipo) {"
new_func = """  // VISOR DE ENQUADRAMENTO para NF e Boleto
  async function abrirVisor(tipo) {
    if (!permCamera?.granted) {
      const { granted } = await requestPermCamera();
      if (!granted) { Alert.alert('Permissao necessaria', 'Libere o acesso a camera.'); return; }
    }
    setTipoVisor(tipo);
    setVisorAberto(true);
  }

  async function tirarFotoVisor() {
    if (!cameraRef) return;
    try {
      const foto = await cameraRef.takePictureAsync({ base64: true, quality: 0.6 });
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch {}
      const asset = { uri: foto.uri, base64: foto.base64, gps: gpsFoto, ts: new Date().toISOString() };
      setFotos(prev => ({ ...prev, [tipoVisor]: asset }));
      setVisorAberto(false);
      setTipoVisor(null);
    } catch(e) { Alert.alert('Erro', 'Nao foi possivel tirar a foto.'); }
  }

  async function tirarFoto(tipo) {"""
c = c.replace(old_func, new_func)

# 4. Redirecionar NF e Boleto para o visor
old_press = "onPress={() => tirarFoto(f.id)}"
new_press = "onPress={() => (f.id === 'nf' || f.id === 'boleto') ? abrirVisor(f.id) : tirarFoto(f.id)}"
c = c.replace(old_press, new_press)

# 5. Adicionar o componente Visor antes do return final da tela de fotos
old_return = "  // ── TELA: FOTOS"
new_return = """  // ── VISOR DE ENQUADRAMENTO ──
  if (visorAberto) {
    const label = tipoVisor === 'nf' ? 'NOTA FISCAL' : 'BOLETO';
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} ref={r => setCameraRef(r)} facing="back">
          {/* Overlay escuro nas bordas */}
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            {/* Topo */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#00ff88', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 }}>
                ENQUADRE {label}
              </Text>
            </View>
            {/* Centro com guias */}
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 280, height: 200, position: 'relative' }}>
                {/* Cantos do visor */}
                {[
                  { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
                  { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
                  { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
                  { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
                ].map((style, i) => (
                  <View key={i} style={[{ position: 'absolute', width: 30, height: 30, borderColor: '#00ff88' }, style]} />
                ))}
                {/* Linha central horizontal */}
                <View style={{ position: 'absolute', top: '50%', left: 10, right: 10, height: 1, backgroundColor: 'rgba(0,255,136,0.3)' }} />
                {/* Linha central vertical */}
                <View style={{ position: 'absolute', left: '50%', top: 10, bottom: 10, width: 1, backgroundColor: 'rgba(0,255,136,0.3)' }} />
              </View>
            </View>
            {/* Botoes */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', padding: 24, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { setVisorAberto(false); setTipoVisor(null); }}
                style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ff4444' }}>
                <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={tirarFotoVisor}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#00ff88', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' }}>
                <Text style={{ fontSize: 28 }}>📷</Text>
              </TouchableOpacity>
              <View style={{ width: 80 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ── TELA: FOTOS"""
c = c.replace(old_return, new_return)

open(f, "w", encoding="utf-8").write(c)
print("OK!")
