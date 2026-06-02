conteudo = r"""import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions, ScrollView,
  PanResponder, Animated
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';
const DEPOSITO = { latitude: -3.093544, longitude: -60.075812 };
const { width, height } = Dimensions.get('window');

const NEON = {
  cyan:   '#00FFEA',
  green:  '#00FF88',
  yellow: '#FFE600',
  red:    '#FF3355',
  purple: '#BF5FFF',
  bg:     '#000d1a',
};

function TecladoKM({ valor, onChange }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={tk.grid}>
      {keys.map((k, i) => (
        <TouchableOpacity key={i}
          style={[tk.key, !k && tk.keyVazio]}
          onPress={() => {
            if (!k) return;
            if (k === '⌫') onChange(valor.slice(0,-1));
            else if (valor.length < 6) onChange(valor + k);
          }}
          activeOpacity={k ? 0.7 : 1}
        >
          <Text style={tk.keyTxt}>{k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tk = StyleSheet.create({
  grid: { flexDirection:'row', flexWrap:'wrap', width:'100%', gap:10, marginTop:20 },
  key: { width:'30%', aspectRatio:1.6, backgroundColor:'rgba(0,255,234,0.1)',
    borderRadius:14, alignItems:'center', justifyContent:'center',
    borderWidth:1.5, borderColor:'rgba(0,255,234,0.2)' },
  keyVazio: { backgroundColor:'transparent', borderColor:'transparent' },
  keyTxt: { color:'#fff', fontSize:28, fontWeight:'700' },
});

export default function RotaScreen({ navigation, route }) {
  const { token } = route.params;
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [stops, setStops]         = useState([]);
  const [rotaInfo, setRotaInfo]   = useState(null);
  const [posicao, setPosicao]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [semRota, setSemRota]     = useState(false);
  const [stopSel, setStopSel]     = useState(null);
  const [aba, setAba]             = useState('mapa'); // mapa | lista
  const [kmInicial, setKmInicial] = useState('');
  const [showKm, setShowKm]       = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': '1'
  };

  useEffect(() => { iniciarGPS(); carregarRota(); }, []);

  async function iniciarGPS() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setPosicao({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {}
  }

  async function carregarRota() {
    setLoading(true); setSemRota(false);
    try {
      const datas = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(Date.now() - i * 86400000);
        datas.push(d.toISOString().slice(0, 10));
      }
      let rotaEncontrada = null;
      for (const data of datas) {
        const res = await fetch(`${API_URL}/routes?date=${data}`, { headers });
        if (!res.ok) continue;
        const rotas = await res.json();
        if (!Array.isArray(rotas)) continue;
        const validas = rotas.filter(r => r.status === 'released' || r.status === 'executing');
        if (validas.length > 0) { rotaEncontrada = validas[0]; break; }
      }
      if (!rotaEncontrada) { setSemRota(true); setLoading(false); return; }
      setRotaInfo(rotaEncontrada);
      if (rotaEncontrada.status === 'released') setShowKm(true);

      const resS = await fetch(`${API_URL}/routes/${rotaEncontrada.route_id}/stops`, { headers });
      const stopsData = await resS.json();
      if (Array.isArray(stopsData)) {
        const sorted = stopsData.sort((a, b) => (a.sequence||0) - (b.sequence||0));
        setStops(sorted);
        // Linha de rota
        const coords = sorted
          .filter(s => s.lat && s.lng)
          .map(s => ({ latitude: parseFloat(s.lat), longitude: parseFloat(s.lng) }));
        setRouteCoords([DEPOSITO, ...coords, DEPOSITO]);
        setTimeout(() => {
          if (mapRef.current && coords.length > 0) {
            mapRef.current.fitToCoordinates([DEPOSITO, ...coords], {
              edgePadding: { top:120, right:50, bottom:200, left:50 }, animated:true
            });
          }
        }, 800);
      }
    } catch (e) { Alert.alert('Erro', String(e)); }
    finally { setLoading(false); }
  }

  async function confirmarKmEIniciar() {
    if (!kmInicial || kmInicial.length < 4) {
      Alert.alert('KM invalido', 'Informe pelo menos 4 digitos.'); return;
    }
    try {
      await fetch(`${API_URL}/routes/${rotaInfo.route_id}/iniciar`, {
        method: 'POST', headers,
        body: JSON.stringify({ km_inicial: parseInt(kmInicial) })
      });
      setRotaInfo(p => ({ ...p, status: 'executing' }));
      setShowKm(false);
    } catch (e) { Alert.alert('Erro', e.message); }
  }

  async function finalizarViagem() {
    Alert.alert('Finalizar Viagem', 'Confirma que chegou a fabrica?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim, chegei!', onPress: () => {
        navigation.navigate('Resumo', { token, routeId: rotaInfo.route_id, stops, kmInicial });
      }}
    ]);
  }

  function getCorStop(stop) {
    if (stop.status === 'completed') return NEON.green;
    if (stop.status === 'failed')    return NEON.red;
    if (stop.status === 'reentrega') return NEON.yellow;
    if (stop.status === 'adiada')    return NEON.purple;
    const prox = stops.find(s => s.status === 'pending');
    if (prox && prox.stop_id === stop.stop_id) return NEON.cyan;
    return 'rgba(180,200,220,0.4)';
  }

  const completadas = stops.filter(s => s.status === 'completed').length;
  const total = stops.length;
  const pct = total > 0 ? Math.round(completadas / total * 100) : 0;
  const proxStop = stops.find(s => s.status === 'pending');

  if (loading) return (
    <View style={s.center}>
      <Text style={{ fontSize: 52 }}>❄️</Text>
      <ActivityIndicator size="large" color={NEON.cyan} style={{ marginTop: 16 }} />
      <Text style={s.dimTxt}>Carregando rota...</Text>
    </View>
  );

  if (semRota) return (
    <View style={s.center}>
      <Text style={{ fontSize: 52 }}>⏳</Text>
      <Text style={s.titulo}>Aguardando Liberacao</Text>
      <Text style={s.sub}>Sua rota ainda nao foi liberada.{'\n'}Aguarde o analista.</Text>
      <TouchableOpacity style={s.btnSec} onPress={carregarRota}>
        <Text style={s.btnSecTxt}>🔄 Verificar</Text>
      </TouchableOpacity>
    </View>
  );

  // Tela KM inicial
  if (showKm) return (
    <View style={[s.center, { justifyContent:'flex-start', paddingTop:50, backgroundColor: NEON.bg }]}>
      <View style={s.kmIconBox}>
        <Text style={{ fontSize:42 }}>🚛</Text>
      </View>
      <Text style={s.titulo}>KM Inicial</Text>
      <Text style={s.sub}>Obrigatorio para iniciar a operacao</Text>
      <View style={s.kmDisplay}>
        <Text style={s.kmValor}>{kmInicial || '- - - - -'}</Text>
        <Text style={s.kmUnidade}>km</Text>
      </View>
      <TecladoKM valor={kmInicial} onChange={setKmInicial} />
      <TouchableOpacity
        style={[s.btnPrimario, { marginTop:28, opacity: kmInicial.length >= 4 ? 1 : 0.4 }]}
        onPress={confirmarKmEIniciar}
        disabled={kmInicial.length < 4}
      >
        <Text style={s.btnPrimarioTxt}>✅ INICIAR OPERACAO</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex:1, backgroundColor: NEON.bg }}>

      {/* MAPA TELA CHEIA */}
      {aba === 'mapa' && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{ ...DEPOSITO, latitudeDelta:0.08, longitudeDelta:0.08 }}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Linha de rota NEON verde */}
          {routeCoords.length > 1 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={NEON.green}
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}

          {/* Deposito */}
          <Marker coordinate={DEPOSITO} anchor={{ x:0.5, y:0.5 }}>
            <View style={s.depositoPin}>
              <Text style={{ fontSize:20 }}>🏭</Text>
            </View>
          </Marker>

          {/* Paradas */}
          {stops.map(stop => {
            const lat = parseFloat(stop.lat), lng = parseFloat(stop.lng);
            if (!lat || !lng) return null;
            const cor = getCorStop(stop);
            const isProx = proxStop?.stop_id === stop.stop_id;
            return (
              <Marker
                key={stop.stop_id}
                coordinate={{ latitude:lat, longitude:lng }}
                onPress={() => setStopSel(stop)}
                anchor={{ x:0.5, y:0.5 }}
              >
                <View style={[s.pin, {
                  backgroundColor: cor,
                  width: isProx ? 46 : 36,
                  height: isProx ? 46 : 36,
                  borderRadius: isProx ? 23 : 18,
                  borderWidth: isProx ? 3 : 2,
                  borderColor: isProx ? '#fff' : NEON.bg,
                }]}>
                  <Text style={[s.pinNum, { fontSize: isProx ? 16 : 13 }]}>
                    {(stop.sequence||0)+1}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* LISTA */}
      {aba === 'lista' && (
        <View style={{ flex:1, backgroundColor: NEON.bg, paddingTop:100 }}>
          <ScrollView contentContainerStyle={{ padding:16 }}>
            {stops.map(stop => (
              <TouchableOpacity
                key={stop.stop_id}
                style={[s.listaItem, { borderLeftColor: getCorStop(stop) }]}
                onPress={() => { setStopSel(stop); setAba('mapa'); }}
              >
                <View style={[s.badge, { backgroundColor: getCorStop(stop) }]}>
                  <Text style={s.badgeTxt}>{(stop.sequence||0)+1}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.listaNome} numberOfLines={1}>{stop.recipient_name}</Text>
                  <Text style={s.listaSub}>
                    {stop.address} • {(stop.weight_kg||0).toFixed(0)}kg
                  </Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: getCorStop(stop) }]}/>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* BARRA SUPERIOR SLIM */}
      <View style={s.topBar}>
        <View style={{ flex:1 }}>
          <Text style={s.topViagem}>❄️ {rotaInfo?.trip_number || 'GELOCRIM'}</Text>
          <Text style={s.topProximo} numberOfLines={1}>
            {proxStop ? `▶ ${proxStop.recipient_name}` : '✅ Todas entregues!'}
          </Text>
        </View>
        <View style={s.topPctBox}>
          <Text style={s.topPct}>{pct}%</Text>
          <Text style={s.topSub}>{completadas}/{total}</Text>
        </View>
      </View>

      {/* BARRA DE PROGRESSO */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width:`${pct}%` }]}/>
      </View>

      {/* CARD PARADA SELECIONADA */}
      {stopSel && aba === 'mapa' && (
        <View style={[s.cardStop, { borderColor: getCorStop(stopSel) }]}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 }}>
            <View style={[s.badge, { backgroundColor: getCorStop(stopSel), width:40, height:40, borderRadius:20 }]}>
              <Text style={[s.badgeTxt, { fontSize:16 }]}>{(stopSel.sequence||0)+1}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={s.cardNome} numberOfLines={1}>{stopSel.recipient_name}</Text>
              <Text style={s.cardEnd} numberOfLines={1}>{stopSel.address}</Text>
              <Text style={s.cardPeso}>⚖️ {(stopSel.weight_kg||0).toFixed(0)} kg  •  T.Atend: {stopSel.tempo_entrega||'--'} min</Text>
            </View>
            <TouchableOpacity onPress={() => setStopSel(null)} style={s.btnFechar}>
              <Text style={{ color:'#fff', fontSize:18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.btnEntrar, rotaInfo?.status !== 'executing' && { opacity:0.4 }]}
            disabled={rotaInfo?.status !== 'executing'}
            onPress={() => navigation.navigate('Entrega', {
              stop: stopSel, token, routeId: rotaInfo?.route_id,
              proximoStop: stops.find(x => x.sequence > (stopSel.sequence||0) && x.status === 'pending')
            })}
          >
            <Text style={s.btnEntrarTxt}>
              {rotaInfo?.status === 'executing' ? '📦 REGISTRAR ENTREGA →' : 'Inicie a operacao primeiro'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BARRA INFERIOR */}
      <View style={s.bottomBar}>
        {[
          { id:'mapa',  icon:'🗺️',  label:'Mapa'  },
          { id:'lista', icon:'📋',  label:'Lista' },
        ].map(item => (
          <TouchableOpacity
            key={item.id}
            style={[s.tabBtn, aba === item.id && s.tabBtnAtivo]}
            onPress={() => { setAba(item.id); setStopSel(null); }}
          >
            <Text style={{ fontSize:22 }}>{item.icon}</Text>
            <Text style={[s.tabLabel, aba === item.id && { color: NEON.cyan }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        {/* Botao finalizar */}
        {rotaInfo?.status === 'executing' && (
          <TouchableOpacity style={s.tabBtnFinalizar} onPress={finalizarViagem}>
            <Text style={{ fontSize:22 }}>🏁</Text>
            <Text style={[s.tabLabel, { color: NEON.red }]}>Finalizar</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  center:       { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000d1a', padding:28 },
  titulo:       { color:'#fff', fontSize:24, fontWeight:'900', marginTop:12, textAlign:'center' },
  sub:          { color:'rgba(255,255,255,0.45)', fontSize:14, marginTop:8, textAlign:'center', lineHeight:22 },
  dimTxt:       { color:'rgba(255,255,255,0.4)', marginTop:12, fontSize:14 },
  btnSec:       { marginTop:24, backgroundColor:'rgba(0,255,234,0.1)', borderRadius:14, padding:16, paddingHorizontal:32, borderWidth:1.5, borderColor:'rgba(0,255,234,0.3)' },
  btnSecTxt:    { color:'#00FFEA', fontWeight:'700', fontSize:15 },
  btnPrimario:  { backgroundColor:'#00FFEA', borderRadius:16, padding:18, paddingHorizontal:40, alignItems:'center', width:'90%' },
  btnPrimarioTxt: { color:'#000d1a', fontWeight:'900', fontSize:16, letterSpacing:2 },
  kmIconBox:    { width:90, height:90, borderRadius:45, backgroundColor:'rgba(0,255,234,0.1)', borderWidth:2, borderColor:'#00FFEA', alignItems:'center', justifyContent:'center', marginBottom:16 },
  kmDisplay:    { marginTop:24, backgroundColor:'rgba(0,255,234,0.06)', borderRadius:18, paddingHorizontal:36, paddingVertical:22, borderWidth:1.5, borderColor:'rgba(0,255,234,0.25)', flexDirection:'row', alignItems:'baseline', gap:10, width:'90%', justifyContent:'center' },
  kmValor:      { color:'#00FFEA', fontSize:44, fontWeight:'900', letterSpacing:8 },
  kmUnidade:    { color:'rgba(0,255,234,0.5)', fontSize:18, fontWeight:'600' },
  topBar:       { position:'absolute', top:0, left:0, right:0, backgroundColor:'rgba(0,10,25,0.93)', flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingTop:44, paddingBottom:10 },
  topViagem:    { color:'#00FFEA', fontSize:10, fontWeight:'800', letterSpacing:3, marginBottom:2 },
  topProximo:   { color:'#fff', fontSize:15, fontWeight:'800' },
  topPctBox:    { alignItems:'flex-end' },
  topPct:       { color:'#00FF88', fontSize:26, fontWeight:'900' },
  topSub:       { color:'rgba(255,255,255,0.35)', fontSize:10 },
  progressBar:  { position:'absolute', top:88, left:0, right:0, height:4, backgroundColor:'rgba(255,255,255,0.06)' },
  progressFill: { height:4, backgroundColor:'#00FF88' },
  pin:          { alignItems:'center', justifyContent:'center', elevation:10, shadowOpacity:0.9, shadowRadius:10 },
  pinNum:       { color:'#000d1a', fontWeight:'900' },
  depositoPin:  { width:50, height:50, borderRadius:25, backgroundColor:'rgba(0,10,25,0.95)', alignItems:'center', justifyContent:'center', borderWidth:2.5, borderColor:'#00FFEA' },
  cardStop:     { position:'absolute', bottom:90, left:12, right:12, backgroundColor:'rgba(0,10,25,0.97)', borderRadius:20, padding:18, elevation:15, borderWidth:1.5 },
  cardNome:     { color:'#fff', fontSize:16, fontWeight:'900' },
  cardEnd:      { color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:2 },
  cardPeso:     { color:'#00FFEA', fontSize:12, marginTop:4, fontWeight:'700' },
  btnFechar:    { width:32, height:32, borderRadius:16, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  btnEntrar:    { backgroundColor:'#00FFEA', borderRadius:14, padding:16, alignItems:'center', marginTop:4 },
  btnEntrarTxt: { color:'#000d1a', fontWeight:'900', fontSize:14, letterSpacing:1 },
  badge:        { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  badgeTxt:     { color:'#000d1a', fontWeight:'900', fontSize:14 },
  bottomBar:    { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(0,10,25,0.97)', flexDirection:'row', borderTopWidth:1, borderTopColor:'rgba(0,255,234,0.15)', paddingBottom:20, paddingTop:8 },
  tabBtn:       { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:6 },
  tabBtnAtivo:  { borderTopWidth:2, borderTopColor:'#00FFEA' },
  tabBtnFinalizar: { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:6 },
  tabLabel:     { color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:'700', marginTop:2 },
  listaItem:    { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)', borderLeftWidth:4, paddingLeft:12, marginBottom:4, backgroundColor:'rgba(0,20,40,0.5)', borderRadius:10 },
  listaNome:    { color:'#fff', fontSize:15, fontWeight:'800' },
  listaSub:     { color:'rgba(0,255,234,0.6)', fontSize:11, marginTop:2 },
  statusDot:    { width:12, height:12, borderRadius:6 },
});
"""

with open(r'C:\gelocrim-motorista\screens\RotaScreen.js', 'w', encoding='utf-8') as f:
    f.write(conteudo)
print("OK - RotaScreen.js atualizado!")
