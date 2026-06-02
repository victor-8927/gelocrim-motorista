conteudo = r"""import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image,
  Animated, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';

const TOP_LABEL = {
  '1000': 'Venda', '1009': 'Troca', '1007': 'Bonif.',
  '1008': 'Consig.', '1010': 'Pre-ped.'
};

export default function EntregaScreen({ navigation, route }) {
  const { stop, token, routeId, proximoStop } = route.params;
  const [notas, setNotas]         = useState([]);
  const [loadNotas, setLoadNotas] = useState(true);
  const [tela, setTela]           = useState('detalhes');
  const [fotos, setFotos]         = useState({ canhoto: null, outros: [] });
  const [gps, setGps]             = useState(null);
  const [loading, setLoading]     = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': '1'
  };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    obterGPS();
    carregarNotas();
  }, []);

  async function obterGPS() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps(loc.coords);
    } catch {}
  }

  async function carregarNotas() {
    try {
      const res = await fetch(
        `${API_URL}/routes/${routeId}/stops/${stop.stop_id}/notas`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        // Deduplicar notas por external_id
        const vistas = new Set();
        const unicas = data.filter(n => {
          if (vistas.has(n.external_id)) return false;
          vistas.add(n.external_id);
          return true;
        });
        setNotas(unicas);
      }
    } catch (e) {
      console.log('Notas erro:', e);
    } finally {
      setLoadNotas(false);
    }
  }

  function abrirMaps() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`;
    Linking.openURL(url);
  }

  function irParaProximo() {
    if (proximoStop) {
      navigation.goBack();
    } else {
      navigation.goBack();
    }
  }

  function selecionarAcao(a) {
    if (a === 'reentrega') {
      Alert.alert('Motivo da Reentrega', 'Selecione:', [
        { text: 'Cliente nao estava',     onPress: () => enviarReentrega('Cliente nao estava') },
        { text: 'Sem espaco no freezer',  onPress: () => enviarReentrega('Sem espaco no freezer') },
        { text: 'Horario incompativel',   onPress: () => enviarReentrega('Horario incompativel') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else if (a === 'nao_entregue') {
      Alert.alert('Motivo da Nao Entrega', 'Selecione:', [
        { text: 'Cliente ausente',          onPress: () => enviarFalha('Cliente ausente') },
        { text: 'Endereco nao encontrado',  onPress: () => enviarFalha('Endereco nao encontrado') },
        { text: 'Recusou a entrega',        onPress: () => enviarFalha('Recusou a entrega') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else {
      setTela('fotos');
    }
  }

  async function tirarFoto(tipo) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera necessaria'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images', quality: 0.5, base64: true
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (tipo === 'outros') {
        setFotos(p => ({ ...p, outros: [...p.outros, asset] }));
      } else {
        setFotos(p => ({ ...p, canhoto: asset }));
      }
    }
  }

  async function confirmarEntrega() {
    setLoading(true);
    try {
      const fotoB64 = fotos.canhoto?.base64
        ? `data:image/jpeg;base64,${fotos.canhoto.base64}` : null;

      const res = await fetch(`${API_URL}/routes/${routeId}/stops/${stop.stop_id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          status: 'completed',
          ata: new Date().toISOString(),
          lat_confirmacao: gps?.latitude,
          lng_confirmacao: gps?.longitude,
          foto_base64: fotoB64,
        }),
      });

      if (res.ok) {
        Alert.alert(
          'Entregue!',
          proximoStop ? `Proximo: ${proximoStop.recipient_name}` : 'Ultima entrega concluida!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        const err = await res.json();
        Alert.alert('Erro', err.detail || 'Falha ao confirmar.');
      }
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function enviarReentrega(motivo) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/routes/${routeId}/stops/${stop.stop_id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'reentrega', failure_reason: motivo }),
      });
      if (res.ok) {
        Alert.alert('Reentrega Solicitada', 'Torre de Controle notificada.', [
          { text: 'Proximo', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function enviarFalha(motivo) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/routes/${routeId}/stops/${stop.stop_id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'failed', failure_reason: motivo, atd: new Date().toISOString() }),
      });
      if (res.ok) {
        Alert.alert('Falha Registrada', motivo, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  // TELA DE FOTOS
  if (tela === 'fotos') {
    return (
      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.fotoTitulo}>COMPROVANTE DE ENTREGA</Text>
          <Text style={s.fotoCliente}>{stop.recipient_name}</Text>

          <View style={s.fotoCard}>
            <Text style={s.fotoLabel}>FOTO DO CANHOTO <Text style={s.opcional}>(OPCIONAL)</Text></Text>
            {fotos.canhoto ? (
              <View>
                <Image source={{ uri: fotos.canhoto.uri }} style={s.fotoPreview} />
                <TouchableOpacity style={s.btnRetake} onPress={() => tirarFoto('canhoto')}>
                  <Text style={s.btnRetakeTxt}>Tirar outra</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.btnFoto} onPress={() => tirarFoto('canhoto')}>
                <Text style={{ fontSize: 40 }}>📷</Text>
                <Text style={s.btnFotoTxt}>TIRAR FOTO DO CANHOTO</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[s.btnConfirmar, loading && { opacity: 0.4 }]}
            onPress={confirmarEntrega}
            disabled={loading}
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

  // TELA DETALHES
  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerSeq}>PARADA #{(stop.sequence||0)+1}</Text>
            <Text style={s.headerNome}>{stop.recipient_name}</Text>
            <Text style={s.headerEnd} numberOfLines={2}>{stop.address}</Text>
            {stop.tempo_entrega ? (
              <Text style={s.headerTempoAtend}>T.Atend: {stop.tempo_entrega} min</Text>
            ) : null}
          </View>
          <TouchableOpacity style={s.btnMaps} onPress={abrirMaps}>
            <Text style={{ fontSize: 24 }}>🗺️</Text>
            <Text style={s.btnMapsTxt}>GPS</Text>
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={s.kpiRow}>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{(stop.weight_kg||0).toFixed(0)}</Text>
            <Text style={s.kpiLbl}>kg total</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{notas.length}</Text>
            <Text style={s.kpiLbl}>notas</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{stop.tempo_entrega || '--'}</Text>
            <Text style={s.kpiLbl}>min atend</Text>
          </View>
        </View>

        {/* Notas */}
        <View style={s.notasCard}>
          <Text style={s.notasLabel}>NOTAS / PEDIDOS</Text>
          {loadNotas ? (
            <ActivityIndicator color="#00FFEA" style={{ marginTop: 12 }} />
          ) : notas.length === 0 ? (
            <Text style={s.semNotas}>Nenhuma nota encontrada</Text>
          ) : (
            notas.map((nota, i) => (
              <View key={i} style={s.notaItem}>
                <View style={s.notaHeader}>
                  <Text style={s.notaNum}>Nota {nota.external_id}</Text>
                  <View style={s.topBadge}>
                    <Text style={s.topBadgeTxt}>
                      {TOP_LABEL[nota.top_app] || nota.top_app}
                    </Text>
                  </View>
                </View>
                {(nota.itens||[]).map((item, j) => (
                  <View key={j} style={s.itemRow}>
                    <Text style={s.itemNome}>{item.nome || item.cod}</Text>
                    <Text style={s.itemQtd}>{item.qtd} un</Text>
                  </View>
                ))}
                <Text style={s.notaPeso}>{nota.weight_kg?.toFixed(0)||0} kg</Text>
              </View>
            ))
          )}
        </View>

        {/* Acoes */}
        <TouchableOpacity style={s.btnEntregar} onPress={() => selecionarAcao('entregar')}>
          <Text style={s.btnAcaoEmoji}>✅</Text>
          <Text style={[s.btnAcaoTxt, {color:'#001020'}]}>ENTREGAR</Text>
        </TouchableOpacity>
        <View style={s.acoesRow}>
          <TouchableOpacity style={s.btnReentrega} onPress={() => selecionarAcao('reentrega')}>
            <Text style={s.btnAcaoEmoji}>🔄</Text>
            <Text style={[s.btnAcaoTxt, {color:'#001020'}]}>REENTREGA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnNaoEntregue} onPress={() => selecionarAcao('nao_entregue')}>
            <Text style={s.btnAcaoEmoji}>❌</Text>
            <Text style={s.btnAcaoTxt}>NAO ENTREGUE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container:      { flex:1, backgroundColor:'#000d1a' },
  content:        { padding:16, gap:12, paddingBottom:40 },
  header:         { backgroundColor:'rgba(0,20,40,0.95)', borderRadius:16, padding:16, flexDirection:'row', gap:12, borderWidth:1, borderColor:'rgba(0,255,234,0.2)' },
  headerSeq:      { color:'#00FFEA', fontSize:10, fontWeight:'800', letterSpacing:3, marginBottom:4 },
  headerNome:     { color:'#fff', fontSize:18, fontWeight:'900', marginBottom:2 },
  headerEnd:      { color:'rgba(255,255,255,0.4)', fontSize:11, lineHeight:16 },
  headerTempoAtend:{ color:'#00FFEA', fontSize:11, fontWeight:'700', marginTop:4 },
  btnMaps:        { width:56, height:56, borderRadius:12, backgroundColor:'rgba(0,255,234,0.1)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(0,255,234,0.3)' },
  btnMapsTxt:     { color:'#00FFEA', fontSize:9, fontWeight:'700' },
  kpiRow:         { flexDirection:'row', gap:8 },
  kpi:            { flex:1, backgroundColor:'rgba(0,20,40,0.8)', borderRadius:10, padding:12, alignItems:'center', borderWidth:1, borderColor:'rgba(0,255,234,0.1)' },
  kpiVal:         { color:'#00FFEA', fontSize:22, fontWeight:'900' },
  kpiLbl:         { color:'rgba(255,255,255,0.4)', fontSize:10, marginTop:2 },
  notasCard:      { backgroundColor:'rgba(0,20,40,0.95)', borderRadius:16, padding:14, borderWidth:1, borderColor:'rgba(0,255,234,0.1)' },
  notasLabel:     { color:'#00FFEA', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:10 },
  semNotas:       { color:'rgba(255,255,255,0.3)', fontSize:12, textAlign:'center', padding:12 },
  notaItem:       { backgroundColor:'rgba(0,10,30,0.5)', borderRadius:10, padding:10, marginBottom:8, borderWidth:1, borderColor:'rgba(0,255,234,0.08)' },
  notaHeader:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  notaNum:        { color:'#fff', fontSize:12, fontWeight:'700' },
  topBadge:       { backgroundColor:'rgba(0,255,234,0.1)', borderRadius:6, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'rgba(0,255,234,0.25)' },
  topBadgeTxt:    { color:'#00FFEA', fontSize:10, fontWeight:'700' },
  itemRow:        { flexDirection:'row', justifyContent:'space-between', paddingVertical:2 },
  itemNome:       { color:'rgba(255,255,255,0.6)', fontSize:11 },
  itemQtd:        { color:'#00FFEA', fontSize:11, fontWeight:'700' },
  notaPeso:       { color:'rgba(255,255,255,0.35)', fontSize:10, marginTop:4 },
  acoesRow:       { flexDirection:'row', gap:10 },
  btnEntregar:    { backgroundColor:'#00FF88', borderRadius:14, padding:20, alignItems:'center', marginBottom:10 },
  btnReentrega:   { flex:1, backgroundColor:'#FFD700', borderRadius:14, padding:18, alignItems:'center' },
  btnNaoEntregue: { flex:1, backgroundColor:'#FF3355', borderRadius:14, padding:18, alignItems:'center' },
  btnAcaoEmoji:   { fontSize:28, marginBottom:4 },
  btnAcaoTxt:     { color:'#fff', fontWeight:'900', fontSize:13, letterSpacing:1 },
  fotoTitulo:     { color:'#00FFEA', fontSize:12, fontWeight:'800', letterSpacing:2, textAlign:'center' },
  fotoCliente:    { color:'#fff', fontSize:16, fontWeight:'900', textAlign:'center', marginBottom:8 },
  fotoCard:       { backgroundColor:'rgba(0,20,40,0.95)', borderRadius:16, padding:14, borderWidth:1, borderColor:'rgba(0,255,234,0.1)' },
  fotoLabel:      { color:'#00FFEA', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:10 },
  opcional:       { color:'rgba(255,255,255,0.4)' },
  btnFoto:        { borderWidth:1.5, borderColor:'rgba(0,255,234,0.3)', borderStyle:'dashed', borderRadius:12, padding:28, alignItems:'center', gap:8 },
  btnFotoTxt:     { color:'#00FFEA', fontWeight:'800', fontSize:12, letterSpacing:1 },
  fotoPreview:    { width:'100%', height:200, borderRadius:10 },
  btnRetake:      { padding:10, alignItems:'center' },
  btnRetakeTxt:   { color:'#00FFEA', fontSize:12, fontWeight:'600' },
  btnConfirmar:   { backgroundColor:'#00FF88', borderRadius:14, padding:18, alignItems:'center', marginTop:8 },
  btnConfirmarTxt:{ color:'#001020', fontWeight:'900', fontSize:15, letterSpacing:2 },
  btnVoltar:      { padding:14, alignItems:'center' },
  btnVoltarTxt:   { color:'rgba(255,255,255,0.4)', fontSize:13 },
});
"""

with open(r'C:\gelocrim-motorista\screens\EntregaScreen.js', 'w', encoding='utf-8') as f:
    f.write(conteudo)
print("OK - EntregaScreen atualizado!")
