import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

const NEON = { cyan: '#00FFEA', green: '#00FF88', red: '#FF3355', yellow: '#FFE600', bg: '#000d1a' };

function getStatusColor(status) {
  if (status === 'in_progress') return NEON.green;
  if (status === 'pending')     return NEON.cyan;
  if (status === 'completed')   return '#666';
  return NEON.yellow;
}

function getStatusLabel(status) {
  var map = {
    in_progress: 'Em Execução',
    pending:     'Liberada',
    completed:   'Concluída',
    planned:     'Planejada',
  };
  return map[status] || status;
}

export default function AdminScreen({ navigation, route }) {
  var [rotas, setRotas]         = useState([]);
  var [loading, setLoading]     = useState(true);
  var [refreshing, setRefreshing] = useState(false);

  useEffect(function() { carregarRotas(); }, []); // eslint-disable-line

  async function carregarRotas() {
    try {
      var hoje = new Date().toISOString().slice(0, 10);
      var res = await supabase
        .from('routes')
        .select('id, trip_number, status, route_date, trip_type, total_stops, delivered_stops, drivers(name), vehicles(plate, vda)')
        .eq('route_date', hoje)
        .order('trip_number');

      if (!res.error && res.data) {
        // Normaliza os dados para o formato esperado pelo render
        var rotasNormalizadas = res.data.map(function(r) {
          return Object.assign({}, r, {
            driver_name:    r.drivers ? r.drivers.name : '—',
            vehicle_plate:  r.vehicles ? r.vehicles.plate : '—',
            vehicle_vda:    r.vehicles ? r.vehicles.vda : '—',
          });
        });
        setRotas(rotasNormalizadas);
      }
    } catch (e) { console.log('Erro AdminScreen:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function fazerLogout() {
    await AsyncStorage.removeItem('gelocrim_session');
    navigation.replace('Login');
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={NEON.cyan} />
      <Text style={s.dimTxt}>Carregando rotas...</Text>
    </View>
  );

  var emExecucao = rotas.filter(function(r) { return r.status === 'in_progress'; }).length;
  var concluidas = rotas.filter(function(r) { return r.status === 'completed'; }).length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitulo}>❄️ GELOCRIM</Text>
          <Text style={s.headerSub}>Dashboard Administrativo</Text>
        </View>
        <TouchableOpacity style={s.btnSair} onPress={fazerLogout}>
          <Text style={s.btnSairTxt}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo */}
      <View style={s.resumoRow}>
        <View style={s.resumoCard}>
          <Text style={s.resumoVal}>{rotas.length}</Text>
          <Text style={s.resumoLbl}>Rotas hoje</Text>
        </View>
        <View style={s.resumoCard}>
          <Text style={[s.resumoVal, { color: NEON.green }]}>{emExecucao}</Text>
          <Text style={s.resumoLbl}>Em execução</Text>
        </View>
        <View style={s.resumoCard}>
          <Text style={[s.resumoVal, { color: '#666' }]}>{concluidas}</Text>
          <Text style={s.resumoLbl}>Concluídas</Text>
        </View>
      </View>

      {/* Lista de rotas */}
      <ScrollView
        style={s.lista}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={function() { setRefreshing(true); carregarRotas(); }}
            tintColor={NEON.cyan}
          />
        }
      >
        {rotas.length === 0 ? (
          <View style={s.vazio}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={s.vazioTxt}>Nenhuma rota hoje</Text>
          </View>
        ) : rotas.map(function(rota, i) {
          var total     = rota.total_stops || 0;
          var entregues = rota.delivered_stops || 0;
          var pct       = total > 0 ? Math.round((entregues / total) * 100) : 0;
          var cor       = getStatusColor(rota.status);
          return (
            <View key={i} style={[s.rotaCard, { borderColor: cor }]}>
              <View style={s.rotaHeader}>
                <Text style={s.rotaTrip}>{rota.trip_number}</Text>
                <View style={[s.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
                  <Text style={[s.statusTxt, { color: cor }]}>{getStatusLabel(rota.status)}</Text>
                </View>
              </View>
              <Text style={s.rotaVeiculo}>
                {rota.vehicle_vda || rota.vehicle_plate} — {rota.driver_name}
              </Text>
              <View style={s.rotaBar}>
                <View style={[s.rotaBarFill, { width: pct + '%', backgroundColor: cor }]} />
              </View>
              <Text style={s.rotaPct}>{pct}% — {entregues}/{total} paradas</Text>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000d1a' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000d1a' },
  dimTxt:       { color: 'rgba(255,255,255,0.4)', marginTop: 12 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: 'rgba(0,20,40,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,255,234,0.15)' },
  headerTitulo: { color: '#00FFEA', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  headerSub:    { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  btnSair:      { backgroundColor: 'rgba(255,80,80,0.15)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,80,80,0.3)' },
  btnSairTxt:   { color: '#ff5050', fontWeight: '700', fontSize: 13 },
  resumoRow:    { flexDirection: 'row', padding: 16, gap: 10 },
  resumoCard:   { flex: 1, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,234,0.1)' },
  resumoVal:    { color: '#00FFEA', fontSize: 28, fontWeight: '900' },
  resumoLbl:    { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 },
  lista:        { flex: 1, padding: 16 },
  vazio:        { alignItems: 'center', paddingTop: 60, gap: 12 },
  vazioTxt:     { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  rotaCard:     { backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  rotaHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rotaTrip:     { color: '#fff', fontSize: 14, fontWeight: '900' },
  statusBadge:  { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusTxt:    { fontSize: 10, fontWeight: '800' },
  rotaVeiculo:  { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 10 },
  rotaBar:      { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 6 },
  rotaBarFill:  { height: 4, borderRadius: 2 },
  rotaPct:      { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
});
