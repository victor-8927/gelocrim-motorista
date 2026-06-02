import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions, ScrollView
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import AssistenteGelocrim, { useAssistente } from './AssistenteGelocrim';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';
const DEPOSITO = { latitude: -3.093544, longitude: -60.075812 };
const NEON = { cyan:'#00FFEA', green:'#00FF88', yellow:'#FFE600', red:'#FF3355', purple:'#BF5FFF', bg:'#000d1a' };

async function salvarFilaOffline(item) {
  try {
    const raw = await AsyncStorage.getItem('fila_offline');
    const fila = raw ? JSON.parse(raw) : [];
    fila.push({ ...item, ts: Date.now() });
    await AsyncStorage.setItem('fila_offline', JSON.stringify(fila));
  } catch {}
}

async function sincronizarFila(headers) {
  try {
    const raw = await AsyncStorage.getItem('fila_offline');
    if (!raw) return;
    const fila = JSON.parse(raw);
    const restantes = [];
    for (const item of fila) {
      try {
        const res = await fetch(item.url, { method: item.method, headers, body: JSON.stringify(item.body) });
        if (!res.ok) restantes.push(item);
      } catch { restantes.push(item); }
    }
    await AsyncStorage.setItem('fila_offline', JSON.stringify(restantes));
  } catch {}
}

function TecladoKM({ valor, onChange }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','<'];
  return (
    <View style={tk.grid}>
      {keys.map((k, i) => (
        <TouchableOpacity key={i} style={[tk.key, !k && tk.keyVazio]}
          onPress={() => { if(!k) return; if(k==='<') onChange(valor.slice(0,-1)); else if(valor.length<6) onChange(valor+k); }}
          activeOpacity={k?0.7:1}>
          <Text style={tk.keyTxt}>{k === '<' ? 'Del' : k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tk = StyleSheet.create({
  grid: { flexDirection:'row', flexWrap:'wrap', width:'100%', gap:10, marginTop:20 },
  key: { width:'30%', aspectRatio:1.6, backgroundColor:'rgba(0,255,234,0.1)', borderRadius:14, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:'rgba(0,255,234,0.2)' },
  keyVazio: { backgroundColor:'transparent', borderColor:'transparent' },
  keyTxt: { color:'#fff', fontSize:24, fontWeight:'700' },
});

function decodePolyline(encoded) {
  const poly = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

export default function RotaScreen({ navigation, route }) {
  const { token, user } = route.params;
  const mapRef = useRef(null);
  const assistente = useAssistente();

  const [stops, setStops]         = useState([]);
  const [rotaInfo, setRotaInfo]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [semRota, setSemRota]     = useState(false);
  const [stopSel, setStopSel]     = useState(null);
  const [aba, setAba]             = useState('mapa');
  const [kmInicial, setKmInicial] = useState('');
  const [showKm, setShowKm]       = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [online, setOnline]       = useState(true);
  const [filaCount, setFilaCount] = useState(0);

  const headers = { 'Content-Type':'application/json', 'Authorization':'Bearer '+token, 'ngrok-skip-browser-warning':'1' };

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const ok = state.isConnected && state.isInternetReachable;
      setOnline(!!ok);
      if (ok) sincronizarFila(headers).then(atualizarFila);
    });
    return () => unsub();
  }, []);

  async function atualizarFila() {
    const raw = await AsyncStorage.getItem('fila_offline');
    setFilaCount(raw ? JSON.parse(raw).length : 0);
  }

  useEffect(() => {
    let sub = null;
    async function gps() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
        (loc) => enviarGPS({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, loc.coords.speed, loc.coords.heading)
      );
    }
    gps();
    return () => { if (sub) sub.remove(); };
  }, [rotaInfo]);

  async function enviarGPS(coords, speed, heading) {
    if (!rotaInfo) return;
    const payload = { url:API_URL+'/routes/'+rotaInfo.route_id+'/gps', method:'POST', body:{ lat:coords.latitude, lng:coords.longitude, speed:speed||0, heading:heading||0, ts:new Date().toISOString() } };
    try {
      const res = await fetch(payload.url, { method:'POST', headers, body:JSON.stringify(payload.body) });
      if (!res.ok) throw new Error();
    } catch { await salvarFilaOffline(payload); await atualizarFila(); }
  }

  useEffect(() => {
    carregarRota();
    atualizarFila();
    setTimeout(() => assistente.anunciarKmInicial(), 1500);
  }, []);

  async function carregarRota() {
    setLoading(true); setSemRota(false);
    try {
      let rotaEncontrada = null;
      for (let i = 0; i < 3; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
        try {
          const res = await fetch(API_URL+'/routes?date='+d, { headers });
          if (!res.ok) continue;
          const rotas = await res.json();
          const validas = Array.isArray(rotas) ? rotas.filter(r => r.status==='released'||r.status==='executing') : [];
          if (validas.length) { rotaEncontrada = validas[0]; break; }
        } catch {}
      }
      if (!rotaEncontrada) {
        const cached = await AsyncStorage.getItem('rota_cache');
        if (cached) { const {rota, stops:sc} = JSON.parse(cached); setRotaInfo(rota); setStops(sc); setLoading(false); return; }
        setSemRota(true); setLoading(false);
        assistente.mostrar('neutral', 'Sua rota ainda nao foi liberada. Aguarde o analista.');
        return;
      }
      setRotaInfo(rotaEncontrada);
      if (rotaEncontrada.status === 'released') setShowKm(true);
      const resS = await fetch(API_URL+'/routes/'+rotaEncontrada.route_id+'/stops', { headers });
      const stopsData = await resS.json();
      if (Array.isArray(stopsData)) {
        const sorted = stopsData.sort((a,b) => (a.sequence||0)-(b.sequence||0));
        setStops(sorted);
        await AsyncStorage.setItem('rota_cache', JSON.stringify({ rota:rotaEncontrada, stops:sorted, ts:Date.now() }));
        const coords = sorted.filter(s=>s.lat&&s.lng).map(s=>({latitude:parseFloat(s.lat),longitude:parseFloat(s.lng)}));
        try {
          const wps = coords.slice(0,-1).map(c=>c.latitude+','+c.longitude).join('|');
          const dest = coords[coords.length-1];
          const url = 'https://maps.googleapis.com/maps/api/directions/json?origin='+DEPOSITO.latitude+','+DEPOSITO.longitude+'&destination='+dest.latitude+','+dest.longitude+'&waypoints='+wps+'&key=AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';
          const resp = await fetch(url);
          const json = await resp.json();
          if (json.routes && json.routes[0]) {
            const pts = json.routes[0].overview_polyline && json.routes[0].overview_polyline.points;
            setRouteCoords(pts ? decodePolyline(pts) : [DEPOSITO].concat(coords).concat([DEPOSITO]));
          } else setRouteCoords([DEPOSITO].concat(coords).concat([DEPOSITO]));
        } catch { setRouteCoords([DEPOSITO].concat(coords).concat([DEPOSITO])); }
        setTimeout(() => {
          if (mapRef.current && coords.length) mapRef.current.fitToCoordinates([DEPOSITO].concat(coords), { edgePadding:{top:120,right:50,bottom:200,left:50}, animated:true });
        }, 800);
        const nome = user && user.name ? user.name.split(' ')[0] : 'Motorista';
        setTimeout(() => assistente.anunciarInicio(nome, sorted.length), 2500);
      }
    } catch {
      const cached = await AsyncStorage.getItem('rota_cache');
      if (cached) { const {rota,stops:sc}=JSON.parse(cached); setRotaInfo(rota); setStops(sc); } else setSemRota(true);
    }
    finally { setLoading(false); }
  }

  async function confirmarKmEIniciar() {
    if (!kmInicial || kmInicial.length < 4) { Alert.alert('KM invalido','Informe pelo menos 4 digitos.'); return; }
    try {
      await fetch(API_URL+'/routes/'+rotaInfo.route_id+'/iniciar', { method:'POST', headers, body:JSON.stringify({km_inicial:parseInt(kmInicial)}) });
    } catch { await salvarFilaOffline({url:API_URL+'/routes/'+rotaInfo.route_id+'/iniciar',method:'POST',body:{km_inicial:parseInt(kmInicial)}}); }
    setRotaInfo(function(p){ return Object.assign({},p,{status:'executing'}); });
    setShowKm(false);
    const nome = user && user.name ? user.name.split(' ')[0] : 'Motorista';
    assistente.anunciarInicio(nome, stops.length);
  }

  function selecionarStop(stop) {
    setStopSel(stop);
    assistente.anunciarChegada(stop.recipient_name, '~3', stop._eta || '--');
    setTimeout(() => assistente.anunciarBriefing((stop.weight_kg||0).toFixed(0), 1, 'Verifique os itens antes de descarregar.'), 4000);
  }

  function getCorStop(stop) {
    if (stop.status==='completed') return NEON.green;
    if (stop.status==='failed')    return NEON.red;
    if (stop.status==='reentrega') return NEON.yellow;
    if (stop.status==='adiada')    return NEON.purple;
    const prox = stops.find(function(s){ return s.status==='pending'; });
    if (prox && prox.stop_id===stop.stop_id) return NEON.cyan;
    return 'rgba(180,200,220,0.4)';
  }

  const completadas = stops.filter(function(s){ return s.status==='completed'; }).length;
  const total = stops.length;
  const pct = total>0 ? Math.round(completadas/total*100) : 0;
  const proxStop = stops.find(function(s){ return s.status==='pending'; });

  async function fazerLogout() {
    await AsyncStorage.multiRemove(['fleet_token','fleet_user','rota_cache']);
    navigation.replace('Login');
  }

  if (loading) return (
    <View style={s.center}>
      <Text style={{fontSize:52}}>*</Text>
      <ActivityIndicator size="large" color={NEON.cyan} style={{marginTop:16}}/>
      <Text style={s.dimTxt}>Carregando rota...</Text>
    </View>
  );

  if (semRota) return (
    <View style={s.center}>
      <Text style={{fontSize:52}}>!</Text>
      <Text style={s.titulo}>Aguardando Liberacao</Text>
      <Text style={s.sub}>Sua rota ainda nao foi liberada.</Text>
      <TouchableOpacity style={s.btnSec} onPress={carregarRota}><Text style={s.btnSecTxt}>Verificar</Text></TouchableOpacity>
      <TouchableOpacity style={[s.btnSec,{marginTop:12,borderColor:'rgba(255,80,80,0.3)'}]} onPress={fazerLogout}><Text style={[s.btnSecTxt,{color:'#ff5050'}]}>Sair</Text></TouchableOpacity>
      <AssistenteGelocrim {...assistente}/>
    </View>
  );

  if (showKm) return (
    <View style={[s.center,{justifyContent:'flex-start',paddingTop:50,backgroundColor:NEON.bg}]}>
      <View style={s.kmIconBox}><Text style={{fontSize:42}}>KM</Text></View>
      <Text style={s.titulo}>KM Inicial</Text>
      <Text style={s.sub}>Obrigatorio para iniciar a operacao</Text>
      <View style={s.kmDisplay}>
        <Text style={s.kmValor}>{kmInicial||'-----'}</Text>
        <Text style={s.kmUnidade}>km</Text>
      </View>
      <TecladoKM valor={kmInicial} onChange={setKmInicial}/>
      <TouchableOpacity style={[s.btnPrimario,{marginTop:28,opacity:kmInicial.length>=4?1:0.4}]} onPress={confirmarKmEIniciar} disabled={kmInicial.length<4}>
        <Text style={s.btnPrimarioTxt}>INICIAR OPERACAO</Text>
      </TouchableOpacity>
      <AssistenteGelocrim {...assistente}/>
    </View>
  );

  return (
    <View style={{flex:1,backgroundColor:NEON.bg}}>
      {aba==='mapa' && (
        <MapView ref={mapRef} style={StyleSheet.absoluteFillObject} provider={PROVIDER_GOOGLE}
          initialRegion={{...DEPOSITO,latitudeDelta:0.08,longitudeDelta:0.08}}
          showsUserLocation={true} showsMyLocationButton={false}>
          {routeCoords.length>1 && <Polyline coordinates={routeCoords} strokeColor={NEON.green} strokeWidth={4}/>}
          <Marker coordinate={DEPOSITO} anchor={{x:0.5,y:0.5}}>
            <View style={s.depositoPin}><Text style={{fontSize:20}}>D</Text></View>
          </Marker>
          {stops.map(function(stop) {
            const lat=parseFloat(stop.lat), lng=parseFloat(stop.lng);
            if(!lat||!lng) return null;
            const cor=getCorStop(stop);
            const isProx=proxStop && proxStop.stop_id===stop.stop_id;
            return (
              <Marker key={stop.stop_id} coordinate={{latitude:lat,longitude:lng}} onPress={function(){ selecionarStop(stop); }} anchor={{x:0.5,y:0.5}}>
                <View style={[s.pin,{backgroundColor:cor,width:isProx?46:36,height:isProx?46:36,borderRadius:isProx?23:18,borderWidth:isProx?3:2,borderColor:isProx?'#fff':NEON.bg}]}>
                  <Text style={[s.pinNum,{fontSize:isProx?16:13}]}>{(stop.sequence||0)+1}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {aba==='lista' && (
        <View style={{flex:1,backgroundColor:NEON.bg,paddingTop:100}}>
          <ScrollView contentContainerStyle={{padding:16}}>
            {stops.map(function(stop){
              return (
                <TouchableOpacity key={stop.stop_id} style={[s.listaItem,{borderLeftColor:getCorStop(stop)}]} onPress={function(){ selecionarStop(stop); setAba('mapa'); }}>
                  <View style={[s.badge,{backgroundColor:getCorStop(stop)}]}><Text style={s.badgeTxt}>{(stop.sequence||0)+1}</Text></View>
                  <View style={{flex:1}}>
                    <Text style={s.listaNome} numberOfLines={1}>{stop.recipient_name}</Text>
                    <Text style={s.listaSub}>{stop.address} - {(stop.weight_kg||0).toFixed(0)}kg</Text>
                  </View>
                  <View style={[s.statusDot,{backgroundColor:getCorStop(stop)}]}/>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={s.topBar}>
        <View style={{flex:1}}>
          <Text style={s.topViagem}>GELOCRIM - {rotaInfo && rotaInfo.trip_number ? rotaInfo.trip_number : ''}</Text>
          <Text style={s.topProximo} numberOfLines={1}>{proxStop ? '> '+proxStop.recipient_name : 'Todas entregues!'}</Text>
        </View>
        <View style={s.topPctBox}>
          <Text style={s.topPct}>{pct}%</Text>
          <Text style={s.topSub}>{completadas}/{total}</Text>
        </View>
      </View>

      <View style={s.progressBar}><View style={[s.progressFill,{width:pct+'%'}]}/></View>

      {(!online||filaCount>0) && (
        <View style={[s.offlineBanner,{backgroundColor:online?'#FF8C00':'#FF3355'}]}>
          <Text style={s.offlineTxt}>{online?'Sincronizando '+filaCount+' itens...':'Sem internet - '+filaCount+' itens na fila'}</Text>
        </View>
      )}

      {stopSel && aba==='mapa' && (
        <View style={[s.cardStop,{borderColor:getCorStop(stopSel)}]}>
          <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10}}>
            <View style={[s.badge,{backgroundColor:getCorStop(stopSel),width:40,height:40,borderRadius:20}]}>
              <Text style={[s.badgeTxt,{fontSize:16}]}>{(stopSel.sequence||0)+1}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={s.cardNome} numberOfLines={1}>{stopSel.recipient_name}</Text>
              <Text style={s.cardEnd} numberOfLines={1}>{stopSel.address}</Text>
              <Text style={s.cardPeso}>{(stopSel.weight_kg||0).toFixed(0)} kg</Text>
            </View>
            <TouchableOpacity onPress={function(){ setStopSel(null); }} style={s.btnFechar}>
              <Text style={{color:'#fff',fontSize:18}}>X</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.btnEntrar,rotaInfo && rotaInfo.status!=='executing' && {opacity:0.4}]}
            disabled={!rotaInfo || rotaInfo.status!=='executing'}
            onPress={function(){
              navigation.navigate('Entrega',{
                stop:stopSel, token, routeId:rotaInfo.route_id,
                proximoStop:stops.find(function(x){ return x.sequence>(stopSel.sequence||0)&&x.status==='pending'; }),
                onStopUpdated:function(stopId,status){
                  setStops(function(prev){ return prev.map(function(s){ return s.stop_id===stopId?Object.assign({},s,{status:status}):s; }); });
                  setStopSel(null);
                  if(status==='completed') assistente.anunciarSucesso(stopSel.recipient_name);
                  else assistente.anunciarCrise(status==='failed'?'Nao entregue':'Reentrega solicitada');
                }
              });
            }}
          >
            <Text style={s.btnEntrarTxt}>{rotaInfo && rotaInfo.status==='executing' ? 'REGISTRAR ENTREGA' : 'Inicie a operacao primeiro'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.bottomBar}>
        {[{id:'mapa',icon:'Mapa'},{id:'lista',icon:'Lista'}].map(function(item){
          return (
            <TouchableOpacity key={item.id} style={[s.tabBtn,aba===item.id&&s.tabBtnAtivo]} onPress={function(){ setAba(item.id); setStopSel(null); }}>
              <Text style={[s.tabLabel,aba===item.id&&{color:NEON.cyan}]}>{item.icon}</Text>
            </TouchableOpacity>
          );
        })}
        {rotaInfo && rotaInfo.status==='executing' && (
          <TouchableOpacity style={s.tabBtnFinalizar} onPress={function(){
            Alert.alert('Finalizar Viagem','Confirma que chegou a fabrica?',[
              {text:'Cancelar',style:'cancel'},
              {text:'Sim, cheguei!',onPress:function(){ navigation.navigate('Resumo',{token,routeId:rotaInfo.route_id,stops,kmInicial}); }}
            ]);
          }}>
            <Text style={[s.tabLabel,{color:NEON.red}]}>Finalizar</Text>
          </TouchableOpacity>
        )}
      </View>

      <AssistenteGelocrim {...assistente}/>
    </View>
  );
}

const s = StyleSheet.create({
  center:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#000d1a',padding:28},
  titulo:{color:'#fff',fontSize:24,fontWeight:'900',marginTop:12,textAlign:'center'},
  sub:{color:'rgba(255,255,255,0.45)',fontSize:14,marginTop:8,textAlign:'center',lineHeight:22},
  dimTxt:{color:'rgba(255,255,255,0.4)',marginTop:12,fontSize:14},
  btnSec:{marginTop:24,backgroundColor:'rgba(0,255,234,0.1)',borderRadius:14,padding:16,paddingHorizontal:32,borderWidth:1.5,borderColor:'rgba(0,255,234,0.3)'},
  btnSecTxt:{color:'#00FFEA',fontWeight:'700',fontSize:15},
  btnPrimario:{backgroundColor:'#00FFEA',borderRadius:16,padding:18,paddingHorizontal:40,alignItems:'center',width:'90%'},
  btnPrimarioTxt:{color:'#000d1a',fontWeight:'900',fontSize:16,letterSpacing:2},
  kmIconBox:{width:90,height:90,borderRadius:45,backgroundColor:'rgba(0,255,234,0.1)',borderWidth:2,borderColor:'#00FFEA',alignItems:'center',justifyContent:'center',marginBottom:16},
  kmDisplay:{marginTop:24,backgroundColor:'rgba(0,255,234,0.06)',borderRadius:18,paddingHorizontal:36,paddingVertical:22,borderWidth:1.5,borderColor:'rgba(0,255,234,0.25)',flexDirection:'row',alignItems:'baseline',gap:10,width:'90%',justifyContent:'center'},
  kmValor:{color:'#00FFEA',fontSize:44,fontWeight:'900',letterSpacing:8},
  kmUnidade:{color:'rgba(0,255,234,0.5)',fontSize:18,fontWeight:'600'},
  topBar:{position:'absolute',top:0,left:0,right:0,backgroundColor:'rgba(0,10,25,0.93)',flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingTop:44,paddingBottom:10},
  topViagem:{color:'#00FFEA',fontSize:10,fontWeight:'800',letterSpacing:3,marginBottom:2},
  topProximo:{color:'#fff',fontSize:15,fontWeight:'800'},
  topPctBox:{alignItems:'flex-end'},
  topPct:{color:'#00FF88',fontSize:26,fontWeight:'900'},
  topSub:{color:'rgba(255,255,255,0.35)',fontSize:10},
  progressBar:{position:'absolute',top:88,left:0,right:0,height:4,backgroundColor:'rgba(255,255,255,0.06)'},
  progressFill:{height:4,backgroundColor:'#00FF88'},
  offlineBanner:{position:'absolute',top:92,left:0,right:0,paddingVertical:6,alignItems:'center',zIndex:10},
  offlineTxt:{color:'#fff',fontSize:11,fontWeight:'800',letterSpacing:1},
  pin:{alignItems:'center',justifyContent:'center',elevation:10},
  pinNum:{color:'#000d1a',fontWeight:'900'},
  depositoPin:{width:50,height:50,borderRadius:25,backgroundColor:'rgba(0,10,25,0.95)',alignItems:'center',justifyContent:'center',borderWidth:2.5,borderColor:'#00FFEA'},
  cardStop:{position:'absolute',bottom:90,left:12,right:12,backgroundColor:'rgba(0,10,25,0.97)',borderRadius:20,padding:18,elevation:15,borderWidth:1.5},
  cardNome:{color:'#fff',fontSize:16,fontWeight:'900'},
  cardEnd:{color:'rgba(255,255,255,0.45)',fontSize:12,marginTop:2},
  cardPeso:{color:'#00FFEA',fontSize:12,marginTop:4,fontWeight:'700'},
  btnFechar:{width:32,height:32,borderRadius:16,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center'},
  btnEntrar:{backgroundColor:'#00FFEA',borderRadius:14,padding:16,alignItems:'center',marginTop:4},
  btnEntrarTxt:{color:'#000d1a',fontWeight:'900',fontSize:14,letterSpacing:1},
  badge:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  badgeTxt:{color:'#000d1a',fontWeight:'900',fontSize:14},
  bottomBar:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(0,10,25,0.97)',flexDirection:'row',borderTopWidth:1,borderTopColor:'rgba(0,255,234,0.15)',paddingBottom:20,paddingTop:8},
  tabBtn:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:6},
  tabBtnAtivo:{borderTopWidth:2,borderTopColor:'#00FFEA'},
  tabBtnFinalizar:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:6},
  tabLabel:{color:'rgba(255,255,255,0.45)',fontSize:13,fontWeight:'700',marginTop:2},
  listaItem:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.05)',borderLeftWidth:4,paddingLeft:12,marginBottom:4,backgroundColor:'rgba(0,20,40,0.5)',borderRadius:10},
  listaNome:{color:'#fff',fontSize:15,fontWeight:'800'},
  listaSub:{color:'rgba(0,255,234,0.6)',fontSize:11,marginTop:2},
  statusDot:{width:12,height:12,borderRadius:6},
});
