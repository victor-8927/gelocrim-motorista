import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Dimensions, Linking
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

var { width } = Dimensions.get('window');
var GOOGLE_API_KEY = 'AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';

function decodePolyline(encoded) {
  var points = [];
  var index = 0;
  var lat = 0;
  var lng = 0;
  while (index < encoded.length) {
    var b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// CORREÇÃO: função pura — recebe apenas coordenadas, sem referência a stop ou Linking
function calcularDirecao(lat1, lng1, lat2, lng2) {
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var lat1r = lat1 * Math.PI / 180;
  var lat2r = lat2 * Math.PI / 180;
  var y = Math.sin(dLng) * Math.cos(lat2r);
  var x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng);
  var brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function NavegacaoScreen(props) {
  var navigation = props.navigation;
  var navRoute = props.route;
  var stop = navRoute.params.stop;

  var mapRef = useRef(null);
  var [posAtual, setPosAtual] = useState(null);
  var [rota, setRota] = useState([]);
  var [steps, setSteps] = useState([]);
  var [stepAtual, setStepAtual] = useState(0);
  var [distancia, setDistancia] = useState('--');
  var [tempo, setTempo] = useState('--');
  var [loading, setLoading] = useState(true);
  var [direcao, setDirecao] = useState(0);
  var locSub = useRef(null);

  useEffect(function() {
    iniciar();
    return function() {
      if (locSub.current) locSub.current.remove();
    };
  }, []); // eslint-disable-line

  // CORREÇÃO: abrirGoogleMaps no escopo do componente — acessa stop via closure correta
  function abrirGoogleMaps() {
    if (!stop.lat || !stop.lng) return;
    var url = 'google.navigation:q=' + stop.lat + ',' + stop.lng + '&mode=d';
    Linking.canOpenURL(url).then(function(supported) {
      if (supported) {
        Linking.openURL(url);
      } else {
        var urlWeb = 'https://www.google.com/maps/dir/?api=1&destination=' + stop.lat + ',' + stop.lng + '&travelmode=driving';
        Linking.openURL(urlWeb);
      }
    });
  }

  async function iniciar() {
    var perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('GPS necessário'); return; }

    var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    var pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setPosAtual(pos);

    await buscarRota(pos);

    locSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
      function(newLoc) {
        var newPos = { latitude: newLoc.coords.latitude, longitude: newLoc.coords.longitude };
        setPosAtual(newPos);

        if (stop.lat && stop.lng) {
          var dir = calcularDirecao(newPos.latitude, newPos.longitude, parseFloat(stop.lat), parseFloat(stop.lng));
          setDirecao(dir);
        }

        if (stop.lat && stop.lng) {
          var dist = calcularDistancia(newPos.latitude, newPos.longitude, parseFloat(stop.lat), parseFloat(stop.lng));
          if (dist < 1) setDistancia(Math.round(dist * 1000) + ' m');
          else setDistancia(dist.toFixed(1) + ' km');
        }

        if (mapRef.current) {
          mapRef.current.animateCamera({
            center: newPos,
            heading: newLoc.coords.heading || 0,
            pitch: 45,
            zoom: 17,
          }, { duration: 1000 });
        }
      }
    );
  }

  async function buscarRota(origem) {
    if (!stop.lat || !stop.lng) { setLoading(false); return; }
    try {
      var url = 'https://maps.googleapis.com/maps/api/directions/json' +
        '?origin=' + origem.latitude + ',' + origem.longitude +
        '&destination=' + stop.lat + ',' + stop.lng +
        '&mode=driving&language=pt-BR&key=' + GOOGLE_API_KEY;
      var res = await fetch(url);
      var json = await res.json();
      if (json.routes && json.routes.length > 0) {
        var route = json.routes[0];
        var leg = route.legs[0];
        setDistancia(leg.distance.text);
        setTempo(leg.duration.text);
        var pontos = decodePolyline(route.overview_polyline.points);
        setRota(pontos);
        var stepsData = leg.steps.map(function(step) {
          return {
            instrucao: step.html_instructions.replace(/<[^>]*>/g, ''),
            distancia: step.distance.text,
          };
        });
        setSteps(stepsData);
      }
    } catch (e) { console.log('Erro buscarRota:', e.message); }
    finally { setLoading(false); }
  }

  var destino = stop.lat && stop.lng ? { latitude: parseFloat(stop.lat), longitude: parseFloat(stop.lng) } : null;
  var instrucaoAtual = steps[stepAtual] ? steps[stepAtual].instrucao : 'Siga em direção ao destino';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={function() { navigation.goBack(); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerNome} numberOfLines={1}>{stop.recipient_name}</Text>
          <Text style={s.headerEnd} numberOfLines={1}>{stop.address}</Text>
        </View>
        {/* Botão Google Maps nativo */}
        <TouchableOpacity onPress={abrirGoogleMaps} style={s.gmapsBtn}>
          <Text style={s.gmapsBtnTxt}>🗺️ GM</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#00FFEA" />
          <Text style={s.loadingTxt}>Calculando rota...</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={posAtual ? {
          latitude: posAtual.latitude,
          longitude: posAtual.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : {
          latitude: -3.093544,
          longitude: -60.075812,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={true}
      >
        {rota.length > 0 && (
          <Polyline coordinates={rota} strokeColor="#2563eb" strokeWidth={6} strokeOpacity={0.9} />
        )}
        {destino && (
          <Marker coordinate={destino} title={stop.recipient_name}>
            <View style={s.pinDestino}>
              <Text style={s.pinDestinoTxt}>{stop.sequence}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <View style={s.instrucaoCard}>
        <View style={s.instrucaoTop}>
          <Text style={s.instrucaoTxt} numberOfLines={2}>{instrucaoAtual}</Text>
          {steps[stepAtual] && (
            <Text style={s.instrucaoDist}>{steps[stepAtual].distancia}</Text>
          )}
        </View>
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoVal}>{distancia}</Text>
            <Text style={s.infoLbl}>Distância</Text>
          </View>
          <View style={s.infoDivider} />
          <View style={s.infoBox}>
            <Text style={s.infoVal}>{tempo}</Text>
            <Text style={s.infoLbl}>Tempo estimado</Text>
          </View>
          <View style={s.infoDivider} />
          <TouchableOpacity style={s.infoBox} onPress={function() { navigation.goBack(); }}>
            <Text style={[s.infoVal, { color: '#ef4444' }]}>✕</Text>
            <Text style={[s.infoLbl, { color: '#ef4444' }]}>Encerrar</Text>
          </TouchableOpacity>
        </View>
        {steps[stepAtual + 1] && (
          <View style={s.proximaInstrucao}>
            <Text style={s.proximaLbl}>Depois: </Text>
            <Text style={s.proximaTxt} numberOfLines={1}>{steps[stepAtual + 1].instrucao}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#001020' },
  header:           { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#000d1a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backBtnTxt:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  gmapsBtn:         { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(0,255,234,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,234,0.3)' },
  gmapsBtnTxt:      { color: '#00FFEA', fontSize: 12, fontWeight: '800' },
  headerNome:       { color: '#fff', fontSize: 14, fontWeight: '900' },
  headerEnd:        { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  loadingBox:       { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  loadingTxt:       { color: '#00FFEA', marginTop: 8, fontSize: 13 },
  pinDestino:       { width: 40, height: 40, borderRadius: 8, backgroundColor: '#e8521a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  pinDestinoTxt:    { color: '#fff', fontWeight: '900', fontSize: 16 },
  instrucaoCard:    { backgroundColor: '#000d1a', borderTopWidth: 1, borderTopColor: 'rgba(0,255,234,0.2)', padding: 16 },
  instrucaoTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  instrucaoTxt:     { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 22 },
  instrucaoDist:    { color: '#00FFEA', fontSize: 14, fontWeight: '900', marginLeft: 8 },
  infoRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoBox:          { flex: 1, alignItems: 'center' },
  infoVal:          { color: '#00FFEA', fontSize: 18, fontWeight: '900' },
  infoLbl:          { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
  infoDivider:      { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  proximaInstrucao: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8 },
  proximaLbl:       { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  proximaTxt:       { color: 'rgba(255,255,255,0.7)', fontSize: 11, flex: 1 },
});
