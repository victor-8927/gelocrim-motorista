import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, RefreshControl, AppState, Dimensions
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { getRouteWithStops, updateGPSMotorista, registrarChegada, supabase } from '../services/supabase';

var { width } = Dimensions.get('window');
var GOOGLE_API_KEY = 'AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';
var DEPOSITO = { latitude: -3.093544, longitude: -60.075812 };

var CORES_STATUS = {
  pending:     { bg: 'rgba(100,180,255,0.1)', border: '#64B4FF', txt: '#64B4FF', label: 'Pendente' },
  in_progress: { bg: 'rgba(249,115,22,0.15)', border: '#f97316', txt: '#f97316', label: 'Em Atendimento' },
  delivered:   { bg: 'rgba(16,185,129,0.15)', border: '#10b981', txt: '#10b981', label: 'Entregue' },
  failed:      { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', txt: '#ef4444', label: 'Recusado' },
  rescheduled: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', txt: '#f59e0b', label: 'Reentrega' },
};

function decodePolyline(encoded) {
  var points = [];
  var index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    var b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

async function buscarRotaGoogle(stops) {
  try {
    var comCoords = stops
      .slice()
      .sort(function(a, b) { return (a.sequence || 0) - (b.sequence || 0); })
      .filter(function(s) { return s.lat && s.lng; });

    if (comCoords.length === 0) return [];

    var destino = comCoords[comCoords.length - 1];
    var waypoints = comCoords.slice(0, -1).map(function(s) {
      return s.lat + ',' + s.lng;
    }).join('|');

    var url = 'https://maps.googleapis.com/maps/api/directions/json' +
      '?origin=' + DEPOSITO.latitude + ',' + DEPOSITO.longitude +
      '&destination=' + destino.lat + ',' + destino.lng +
      (waypoints ? '&waypoints=' + encodeURIComponent(waypoints) : '') +
      '&mode=driving&language=pt-BR' +
      '&key=' + GOOGLE_API_KEY;

    var res = await fetch(url);
    var json = await res.json();
    if (json.routes && json.routes.length > 0) {
      return decodePolyline(json.routes[0].overview_polyline.points);
    }
    return [];
  } catch (e) {
    console.log('Erro buscarRotaGoogle:', e.message);
    return [];
  }
}

export default function RotaScreen(props) {
  var navigation = props.navigation;
  var navRoute = props.route;
  var driver = navRoute.params.driver;
  var routeData = navRoute.params.route;

  var [rota, setRota]                 = useState(routeData);
  var [stops, setStops]               = useState((routeData.stops || []).sort(function(a,b){ return (a.sequence||0)-(b.sequence||0); }));
  var [loading, setLoading]           = useState(false);
  var [online, setOnline]             = useState(true);
  var [posAtual, setPosAtual]         = useState(null);
  var [rotaPolyline, setRotaPolyline] = useState([]);
  var [trajetoria, setTrajetoria]     = useState([]);
  var [abaAtiva, setAbaAtiva]         = useState('lista');

  var locInterval     = useRef(null);
  var mapRef          = useRef(null);
  var appState        = useRef(AppState.currentState);
  var rotaCarregada   = useRef(false);
  var stopsCarregados = useRef(false); // ← CORREÇÃO: estava faltando esta declaração

  // Log diagnóstico
  useEffect(function() {
    var stopsIniciais = (routeData.stops || []);
    console.log('=== ROTA SCREEN DIAGNÓSTICO ===');
    console.log('Total stops:', stopsIniciais.length);
    stopsIniciais.forEach(function(s, i) {
      console.log('Stop ' + (i+1) + ':', s.recipient_name, '| lat:', s.lat, '| lng:', s.lng);
    });
  }, []); // eslint-disable-line

  // Carrega stops frescos do Supabase ao iniciar
  useEffect(function() {
    if (!stopsCarregados.current) {
      stopsCarregados.current = true;
      getRouteWithStops(rota.id).then(function(data) {
        var stopsOrdenados = (data.stops || []).sort(function(a,b){ return (a.sequence||0)-(b.sequence||0); });
        setStops(stopsOrdenados);
        setRota(data);
      }).catch(function(e) { console.log('Erro ao carregar stops:', e.message); });
    }
  }, []); // eslint-disable-line

  useEffect(function() {
    iniciarGPS();
    monitorarConexao();

    var sub = AppState.addEventListener('change', function(nextState) {
      appState.current = nextState;
    });

    var channel = supabase
      .channel('rota_' + rota.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'stops',
        filter: 'route_id=eq.' + rota.id
      }, function(payload) {
        setStops(function(prev) {
          var atualizados = prev.map(function(s) {
            return s.stop_id === payload.new.stop_id ? Object.assign({}, s, payload.new) : s;
          });
          buscarRotaGoogle(atualizados).then(function(pts) {
            if (pts.length > 0) setRotaPolyline(pts);
          });
          return atualizados;
        });
      })
      .subscribe();

    return function() {
      sub.remove();
      supabase.removeChannel(channel);
      if (locInterval.current) clearInterval(locInterval.current);
    };
  }, []); // eslint-disable-line

  useEffect(function() {
    if (abaAtiva === 'mapa' && !rotaCarregada.current && stops.length > 0) {
      rotaCarregada.current = true;
      buscarRotaGoogle(stops).then(function(pts) {
        if (pts.length > 0) setRotaPolyline(pts);
      });
    }
  }, [abaAtiva, stops]);

  async function iniciarGPS() {
    var perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('GPS necessário', 'Ative a localização para continuar.');
      return;
    }
    var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    var pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setPosAtual(pos);
    setTrajetoria([pos]);

    locInterval.current = setInterval(async function() {
      try {
        var newLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        var newPos = { latitude: newLoc.coords.latitude, longitude: newLoc.coords.longitude };
        setPosAtual(newPos);
        setTrajetoria(function(prev) { return [...prev, newPos]; });
        if (online) {
          await updateGPSMotorista(rota.id, newPos.latitude, newPos.longitude);
          await supabase.from('route_tracking').insert({
            route_id: rota.id,
            lat: newPos.latitude,
            lng: newPos.longitude,
            recorded_at: new Date().toISOString(),
          }).catch(function() {});
        }
      } catch (e) {}
    }, 30000);
  }

  function monitorarConexao() {
    NetInfo.addEventListener(function(state) { setOnline(state.isConnected); });
  }

  var recarregar = useCallback(async function() {
    setLoading(true);
    try {
      var data = await getRouteWithStops(rota.id);
      setRota(data);
      var stopsOrdenados = (data.stops || []).sort(function(a,b){ return (a.sequence||0)-(b.sequence||0); });
      setStops(stopsOrdenados);
      rotaCarregada.current = false;
      if (abaAtiva === 'mapa') {
        buscarRotaGoogle(stopsOrdenados).then(function(pts) {
          if (pts.length > 0) setRotaPolyline(pts);
          rotaCarregada.current = true;
        });
      }
    } catch (e) { Alert.alert('Erro', 'Não foi possível recarregar.'); }
    finally { setLoading(false); }
  }, [rota.id, abaAtiva]);

  var total     = stops.length;
  var entregues = stops.filter(function(s) { return s.status === 'delivered'; }).length;
  var falhas    = stops.filter(function(s) { return s.status === 'failed' || s.status === 'rescheduled'; }).length;
  var pendentes = stops.filter(function(s) { return s.status === 'pending' || s.status === 'in_progress'; }).length;
  var progresso = total > 0 ? Math.round((entregues / total) * 100) : 0;
  var proximoIdx = stops.findIndex(function(s) { return s.status === 'pending' || s.status === 'in_progress'; });
  var proximo = proximoIdx >= 0 ? stops[proximoIdx] : null;

  async function abrirEntrega(stop) {
    try {
      var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await registrarChegada(stop.stop_id, loc.coords.latitude, loc.coords.longitude);
    } catch(e) {
      await registrarChegada(stop.stop_id, null, null);
    }
    navigation.navigate('Entrega', {
      stop: stop,
      driver: driver,
      routeId: rota.id,
      proximoStop: stops[stops.indexOf(stop) + 1] || null,
      onAtualizar: recarregar,
    });
  }

  function navegarParaProximo() {
    if (!proximo) return;
    navigation.navigate('Navegacao', { stop: proximo });
  }

  function irParaEncerrar() {
    if (pendentes > 0) {
      Alert.alert(
        'Paradas pendentes',
        'Ainda há ' + pendentes + ' entrega(s) pendente(s). Deseja encerrar mesmo assim?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Encerrar mesmo assim', onPress: function() {
            navigation.navigate('Resumo', { routeId: rota.id, stops: stops, driver: driver });
          }}
        ]
      );
    } else {
      navigation.navigate('Resumo', { routeId: rota.id, stops: stops, driver: driver });
    }
  }

  function centralizarMapa() {
    if (mapRef.current && posAtual) {
      mapRef.current.animateToRegion({
        latitude: posAtual.latitude,
        longitude: posAtual.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }

  function fitTodosOsPontos() {
    if (!mapRef.current) return;
    var coords = stops
      .filter(function(s) { return s.lat && s.lng; })
      .map(function(s) { return { latitude: parseFloat(s.lat), longitude: parseFloat(s.lng) }; });
    coords.push(DEPOSITO);
    if (posAtual) coords.push(posAtual);
    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 160, left: 40 },
        animated: true,
      });
    }
  }

  return (
    <View style={s.container}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerViagem}>{rota.trip_number || 'Viagem'}</Text>
          <Text style={s.headerMotorista}>👤 {driver.name}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.onlineBadge, {
            backgroundColor: online ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            borderColor: online ? '#10b981' : '#ef4444'
          }]}>
            <View style={[s.onlineDot, { backgroundColor: online ? '#10b981' : '#ef4444' }]} />
            <Text style={[s.onlineTxt, { color: online ? '#10b981' : '#ef4444' }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── PROGRESSO ── */}
      <View style={s.progressCard}>
        <View style={s.kpiRow}>
          {[
            { label: 'Total',     value: total,     cor: '#64B4FF' },
            { label: 'Entregues', value: entregues, cor: '#10b981' },
            { label: 'Falhas',    value: falhas,    cor: '#ef4444' },
            { label: 'Pendentes', value: pendentes, cor: '#f59e0b' },
          ].map(function(k) {
            return (
              <View key={k.label} style={s.kpi}>
                <Text style={[s.kpiVal, { color: k.cor }]}>{k.value}</Text>
                <Text style={s.kpiLbl}>{k.label}</Text>
              </View>
            );
          })}
        </View>
        <View style={s.progressBarWrap}>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: progresso + '%' }]} />
          </View>
          <Text style={s.progressPct}>{progresso}%</Text>
        </View>
      </View>

      {/* ── ABAS ── */}
      <View style={s.abas}>
        <TouchableOpacity
          style={[s.aba, abaAtiva === 'lista' && s.abaAtiva]}
          onPress={function() { setAbaAtiva('lista'); }}>
          <Text style={[s.abaTxt, abaAtiva === 'lista' && s.abaTxtAtiva]}>📋 Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.aba, abaAtiva === 'mapa' && s.abaAtiva]}
          onPress={function() { setAbaAtiva('mapa'); centralizarMapa(); }}>
          <Text style={[s.abaTxt, abaAtiva === 'mapa' && s.abaTxtAtiva]}>🗺️ Mapa</Text>
        </TouchableOpacity>
      </View>

      {/* ── ABA MAPA ── */}
      {abaAtiva === 'mapa' && (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: posAtual ? posAtual.latitude : DEPOSITO.latitude,
              longitude: posAtual ? posAtual.longitude : DEPOSITO.longitude,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}
            showsTraffic={true}
            showsBuildings={true}
            showsMyLocationButton={false}
            showsUserLocation={false}
          >
            <Marker coordinate={DEPOSITO} title="Depósito Gelocrim">
              <View style={s.pinDeposito}>
                <Text style={{ fontSize: 18 }}>🏭</Text>
              </View>
            </Marker>

            {posAtual && (
              <Marker coordinate={posAtual} title={driver.name} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={s.pinCaminhao}>
                  <Text style={{ fontSize: 22 }}>🚛</Text>
                </View>
              </Marker>
            )}

            {stops.map(function(stop, i) {
              if (!stop.lat || !stop.lng) return null;
              var isProximo = i === proximoIdx;
              var pinColor = stop.status === 'delivered' ? 'green'
                : stop.status === 'failed' ? 'red'
                : stop.status === 'rescheduled' ? 'yellow'
                : stop.status === 'in_progress' ? 'orange'
                : isProximo ? 'cyan' : 'blue';
              return (
                <Marker
                  key={stop.stop_id + '_' + stop.status}
                  coordinate={{ latitude: Number(stop.lat), longitude: Number(stop.lng) }}
                  title={(stop.sequence || i+1) + '. ' + stop.recipient_name}
                  description={(stop.eta || '') + ' — ' + (stop.weight_kg || 0) + 'kg'}
                  pinColor={pinColor}
                  onCalloutPress={function() { abrirEntrega(stop); }}
                />
              );
            })}

            {rotaPolyline.length > 1 && (
              <Polyline
                coordinates={rotaPolyline}
                strokeColor="#2563eb"
                strokeWidth={5}
                strokeOpacity={0.85}
              />
            )}

            {trajetoria.length > 1 && (
              <Polyline
                coordinates={trajetoria}
                strokeColor="#10b981"
                strokeWidth={3}
                lineDashPattern={[6, 4]}
                strokeOpacity={0.7}
              />
            )}
          </MapView>

          <View style={s.mapaBotoes}>
            <TouchableOpacity style={s.mapaBtnCircle} onPress={centralizarMapa}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mapaBtnCircle} onPress={fitTodosOsPontos}>
              <Text style={{ fontSize: 18 }}>🗺️</Text>
            </TouchableOpacity>
          </View>

          {proximo && (
            <View style={s.proximoMapaCard}>
              <View style={s.proximoMapaInfo}>
                <Text style={s.proximoMapaLabel}>PRÓXIMA ENTREGA — {proximo.eta}</Text>
                <Text style={s.proximoMapaNome} numberOfLines={1}>{proximo.recipient_name}</Text>
                <Text style={s.proximoMapaEnd} numberOfLines={1}>{proximo.address}</Text>
              </View>
              <View style={s.proximoMapaBtns}>
                <TouchableOpacity style={s.btnNavegar} onPress={navegarParaProximo}>
                  <Text style={s.btnNavegarTxt}>🧭 Navegar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAtender} onPress={function() { abrirEntrega(proximo); }}>
                  <Text style={s.btnAtenderTxt}>📦 Atender</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!proximo && entregues === total && (
            <View style={[s.proximoMapaCard, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' }]}>
              <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 16, textAlign: 'center' }}>
                ✅ Todas as entregas concluídas!
              </Text>
              <TouchableOpacity style={[s.btnAtender, { backgroundColor: '#10b981', marginTop: 8 }]}
                onPress={irParaEncerrar}>
                <Text style={[s.btnAtenderTxt, { color: '#001020' }]}>🏁 Encerrar Viagem</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── ABA LISTA ── */}
      {abaAtiva === 'lista' && (
        <ScrollView
          style={s.lista}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={recarregar} tintColor="#00FFEA" />}
          showsVerticalScrollIndicator={false}
        >
          {proximo && (
            <View style={s.proximoDestaque}>
              <Text style={s.proximoDestaqueLabel}>▶ PRÓXIMA ENTREGA</Text>
              <Text style={s.proximoDestaqueNome} numberOfLines={1}>{proximo.recipient_name}</Text>
              <Text style={s.proximoDestaqueEnd} numberOfLines={1}>{proximo.address}</Text>
              <View style={s.proximoDestaqueBtns}>
                <TouchableOpacity style={s.btnNavegarDestaque} onPress={navegarParaProximo}>
                  <Text style={s.btnNavegarDestaqueTxt}>🧭 Navegar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAtenderDestaque} onPress={function() { abrirEntrega(proximo); }}>
                  <Text style={s.btnAtenderDestaqueTxt}>📦 Atender Cliente</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {stops.map(function(stop, i) {
            var cor = CORES_STATUS[stop.status] || CORES_STATUS.pending;
            var isProximo = i === proximoIdx;
            var concluido = stop.status === 'delivered' || stop.status === 'failed' || stop.status === 'rescheduled';
            return (
              <TouchableOpacity
                key={stop.stop_id}
                style={[s.stopCard,
                  { borderColor: isProximo ? '#00FFEA' : cor.border },
                  concluido && { opacity: 0.55 }
                ]}
                onPress={function() { abrirEntrega(stop); }}
                activeOpacity={0.8}
              >
                <View style={[s.stopNumBox, { backgroundColor: cor.border }]}>
                  <Text style={s.stopNumTxt}>{stop.sequence || i + 1}</Text>
                </View>
                <View style={s.stopInfo}>
                  <Text style={s.stopNome} numberOfLines={1}>{stop.recipient_name || '—'}</Text>
                  <Text style={s.stopEnd} numberOfLines={1}>{stop.address || '—'}</Text>
                  <View style={s.stopMeta}>
                    <Text style={[s.stopStatus, { color: cor.txt }]}>{cor.label}</Text>
                    {stop.weight_kg > 0 && <Text style={s.stopMetaTxt}>⚖️ {stop.weight_kg}kg</Text>}
                    {stop.eta && <Text style={s.stopMetaTxt}>🕐 {stop.eta}</Text>}
                  </View>
                </View>
                <View style={s.stopRight}>
                  {stop.status === 'delivered'   && <Text style={{ fontSize: 24 }}>✅</Text>}
                  {stop.status === 'failed'       && <Text style={{ fontSize: 24 }}>❌</Text>}
                  {stop.status === 'rescheduled'  && <Text style={{ fontSize: 24 }}>🔄</Text>}
                  {stop.status === 'in_progress'  && <Text style={{ fontSize: 24 }}>⏳</Text>}
                  {stop.status === 'pending' && !isProximo && <Text style={{ fontSize: 24, opacity: 0.3 }}>📦</Text>}
                  {isProximo && <Text style={s.proximoTag}>▶</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── FOOTER ── */}
      <View style={s.footer}>
        <TouchableOpacity style={s.btnEncerrar} onPress={irParaEncerrar} activeOpacity={0.85}>
          <Text style={s.btnEncerrarTxt}>🏁 ENCERRAR VIAGEM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#001020' },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#000d1a', borderBottomWidth: 1, borderBottomColor: 'rgba(0,255,234,0.1)' },
  headerViagem:         { color: '#00FFEA', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  headerMotorista:      { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  headerRight:          { alignItems: 'flex-end' },
  onlineBadge:          { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  onlineDot:            { width: 7, height: 7, borderRadius: 4 },
  onlineTxt:            { fontSize: 11, fontWeight: '800' },
  progressCard:         { margin: 12, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(0,255,234,0.12)' },
  kpiRow:               { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  kpi:                  { alignItems: 'center' },
  kpiVal:               { fontSize: 22, fontWeight: '900' },
  kpiLbl:               { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontWeight: '600' },
  progressBarWrap:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar:          { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill:         { height: '100%', backgroundColor: '#00FFEA', borderRadius: 3 },
  progressPct:          { color: '#00FFEA', fontSize: 11, fontWeight: '900', width: 32, textAlign: 'right' },
  abas:                 { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 10, padding: 4 },
  aba:                  { flex: 1, padding: 8, alignItems: 'center', borderRadius: 8 },
  abaAtiva:             { backgroundColor: 'rgba(0,255,234,0.12)' },
  abaTxt:               { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700' },
  abaTxtAtiva:          { color: '#00FFEA' },
  pinDeposito:          { backgroundColor: 'rgba(0,10,25,0.9)', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#f59e0b' },
  pinCaminhao:          { backgroundColor: 'rgba(0,10,25,0.85)', borderRadius: 20, padding: 4, borderWidth: 2, borderColor: '#00FFEA' },
  pinCliente:           { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  pinClienteNum:        { color: '#000', fontWeight: '900', fontSize: 13 },
  pinClienteIco:        { color: '#000', fontSize: 10, fontWeight: '900' },
  mapaBotoes:           { position: 'absolute', top: 12, right: 12, gap: 8 },
  mapaBtnCircle:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,10,25,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,255,234,0.3)', elevation: 4 },
  proximoMapaCard:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,10,25,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(0,255,234,0.2)', padding: 14 },
  proximoMapaLabel:     { color: '#00FFEA', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  proximoMapaNome:      { color: '#fff', fontSize: 15, fontWeight: '900' },
  proximoMapaEnd:       { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2, marginBottom: 10 },
  proximoMapaBtns:      { flexDirection: 'row', gap: 10 },
  proximoMapaInfo:      { marginBottom: 10 },
  btnNavegar:           { flex: 1, backgroundColor: 'rgba(0,255,234,0.12)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#00FFEA' },
  btnNavegarTxt:        { color: '#00FFEA', fontWeight: '800', fontSize: 13 },
  btnAtender:           { flex: 1, backgroundColor: '#e8521a', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnAtenderTxt:        { color: '#fff', fontWeight: '800', fontSize: 13 },
  lista:                { flex: 1, paddingHorizontal: 12 },
  proximoDestaque:      { backgroundColor: 'rgba(0,255,234,0.06)', borderRadius: 14, borderWidth: 1.5, borderColor: '#00FFEA', padding: 14, marginBottom: 12, marginTop: 4 },
  proximoDestaqueLabel: { color: '#00FFEA', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  proximoDestaqueNome:  { color: '#fff', fontSize: 16, fontWeight: '900' },
  proximoDestaqueEnd:   { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2, marginBottom: 10 },
  proximoDestaqueBtns:  { flexDirection: 'row', gap: 10 },
  btnNavegarDestaque:   { flex: 1, backgroundColor: 'rgba(0,255,234,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#00FFEA' },
  btnNavegarDestaqueTxt:{ color: '#00FFEA', fontWeight: '800', fontSize: 13 },
  btnAtenderDestaque:   { flex: 1, backgroundColor: '#e8521a', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnAtenderDestaqueTxt:{ color: '#fff', fontWeight: '800', fontSize: 13 },
  stopCard:             { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 12, marginBottom: 8, backgroundColor: 'rgba(0,20,40,0.6)', gap: 10 },
  stopNumBox:           { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopNumTxt:           { color: '#000', fontWeight: '900', fontSize: 14 },
  stopInfo:             { flex: 1 },
  stopNome:             { color: '#fff', fontSize: 13, fontWeight: '700' },
  stopEnd:              { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  stopMeta:             { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' },
  stopStatus:           { fontSize: 10, fontWeight: '700' },
  stopMetaTxt:          { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  stopRight:            { alignItems: 'center', justifyContent: 'center', width: 32 },
  proximoTag:           { color: '#00FFEA', fontSize: 20, fontWeight: '900' },
  footer:               { padding: 16, backgroundColor: '#000d1a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  btnEncerrar:          { backgroundColor: '#e8521a', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnEncerrarTxt:       { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
