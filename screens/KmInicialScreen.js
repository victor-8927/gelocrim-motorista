import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator
} from 'react-native';
import { updateRouteStatus } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

function TecladoKM(props) {
  var valor = props.valor;
  var onChange = props.onChange;
  var keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={s.grid}>
      {keys.map(function(k, i) {
        return (
          <TouchableOpacity key={i}
            style={[s.key, !k && s.keyVazio]}
            onPress={function() {
              if (!k) return;
              if (k === '⌫') onChange(valor.slice(0, -1));
              else if (valor.length < 6) onChange(valor + k);
            }}
            activeOpacity={k ? 0.7 : 1}>
            <Text style={s.keyTxt}>{k}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function KmInicialScreen(props) {
  var navigation = props.navigation;
  var navRoute = props.route;
  var driver = navRoute.params.driver;
  var route = navRoute.params.route;

  var [km, setKm] = useState('');
  var [loading, setLoading] = useState(false);

  // Pular KM se já foi registrado
  React.useEffect(function() {
    if (route.km_start && route.status === 'in_progress') {
      navigation.replace('PreViagem', { driver: driver, route: route });
    }
  }, []); // eslint-disable-line

  async function confirmar() {
    if (!km || km.length < 4) {
      Alert.alert('KM inválido', 'Digite o KM inicial corretamente (mínimo 4 dígitos).');
      return;
    }
    setLoading(true);
    try {
      var kmNum = parseInt(km);
      await updateRouteStatus(route.id, 'in_progress', {
        km_start: kmNum,
        started_at: new Date().toISOString(),
      });
      var routeAtualizada = Object.assign({}, route, {
        km_start: kmNum,
        status: 'in_progress',
      });
      // Salvar sessão — app reabre direto na RotaScreen
      await AsyncStorage.setItem('gelocrim_session', JSON.stringify({
        driver: driver,
        route: routeAtualizada,
      }));
      navigation.replace('PreViagem', {
        driver: driver,
        route: routeAtualizada,
      });
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível registrar o KM.');
      setLoading(false);
    }
  }

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerSub}>{route.trip_number}</Text>
        <Text style={s.headerNome}>{driver.name}</Text>
      </View>

      {/* Conteúdo */}
      <View style={s.body}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🚛</Text>
        <Text style={s.titulo}>KM Inicial do Veículo</Text>
        <Text style={s.sub}>Antes de sair, registre o KM atual do hodômetro</Text>

        {/* Display do KM */}
        <View style={s.kmDisplay}>
          <Text style={s.kmValor}>{km || '_ _ _ _ _'}</Text>
          <Text style={s.kmUnidade}>km</Text>
        </View>

        {/* Info do veículo */}
        <View style={s.veicInfo}>
          <Text style={s.veicTxt}>
            Veículo: {route.vehicles ? route.vehicles.vda : '—'}
          </Text>
          <Text style={s.veicTxt}>
            Data: {route.route_date}
          </Text>
          <Text style={s.veicTxt}>
            Paradas: {(route.stops || []).length}
          </Text>
        </View>

        {/* Teclado */}
        <TecladoKM valor={km} onChange={setKm} />

        {/* Botão confirmar */}
        <TouchableOpacity
          style={[s.btnConfirmar, (km.length < 4 || loading) && { opacity: 0.4 }]}
          onPress={confirmar}
          disabled={km.length < 4 || loading}
          activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#001020" />
            : <Text style={s.btnConfirmarTxt}>✅ CONFIRMAR E INICIAR VIAGEM</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#001020' },
  header:         { backgroundColor: '#000d1a', padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(0,255,234,0.1)', alignItems: 'center' },
  headerSub:      { color: '#00FFEA', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerNome:     { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  body:           { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  titulo:         { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  sub:            { color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20, marginBottom: 16 },
  kmDisplay:      { backgroundColor: 'rgba(0,191,255,0.08)', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(0,191,255,0.3)', flexDirection: 'row', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginBottom: 12 },
  kmValor:        { color: '#00BFFF', fontSize: 38, fontWeight: '900', letterSpacing: 6 },
  kmUnidade:      { color: 'rgba(0,191,255,0.5)', fontSize: 16 },
  veicInfo:       { flexDirection: 'row', gap: 16, marginBottom: 16 },
  veicTxt:        { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  key:            { width: '30%', aspectRatio: 1.8, backgroundColor: 'rgba(0,191,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,191,255,0.2)' },
  keyVazio:       { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyTxt:         { color: '#fff', fontSize: 26, fontWeight: '700' },
  btnConfirmar:   { width: '100%', backgroundColor: '#00FFEA', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
  btnConfirmarTxt:{ color: '#001020', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
