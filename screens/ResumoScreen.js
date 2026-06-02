import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encerrarViagem, supabase } from '../services/supabase';

var NEON = { cyan: '#00FFEA', green: '#00FF88', yellow: '#FFE600', red: '#FF3355', blue: '#64B4FF', bg: '#001020', card: '#001428' };

function TecladoKM({ valor, onChange }) {
  var keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={s.grid}>
      {keys.map(function(k, i) {
        return (
          <TouchableOpacity key={i} style={[s.key, !k && s.keyVazio]}
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

export default function ResumoScreen(props) {
  var navigation = props.navigation;
  var navRoute   = props.route;
  var routeId    = navRoute.params.routeId;
  var stopsParam = navRoute.params.stops;
  var driver     = navRoute.params.driver;

  var [kmFinal, setKmFinal]   = useState('');
  var [loading, setLoading]   = useState(false);
  var [fase, setFase]         = useState('km'); // km | resumo
  var [rota, setRota]         = useState(null);
  var [stops, setStops]       = useState(stopsParam || []);
  var [cargaResumida, setCargaResumida] = useState({ entregue: 0, retorno: 0, valor: 0 });
  var [veiculo, setVeiculo] = useState(null);

  useEffect(function() { carregarDados(); }, []); // eslint-disable-line

  async function carregarDados() {
    try {
      // Busca rota com dados de KM
      var resRota = await supabase.from('routes').select('id, trip_number, km_start, started_at, vehicle_id, trip_type').eq('id', routeId).single();
      // Buscar veículo para cálculo de diesel
      if (!resRota.error && resRota.data && resRota.data.vehicle_id) {
        var resVeiculo = await supabase.from('vehicles').select('vda, plate, km_per_liter, fuel_price').eq('id', resRota.data.vehicle_id).single();
        if (!resVeiculo.error) setVeiculo(resVeiculo.data);
      }
      if (!resRota.error) setRota(resRota.data);

      // Busca stops atualizados
      var resStops = await supabase.from('stops').select('*').eq('route_id', routeId).order('sequence');
      if (!resStops.error && resStops.data) setStops(resStops.data);

      // Busca stop_items para calcular sacos entregues e retornados
      var resItems = await supabase.from('stop_items').select('qty_entregue, qty_devolvida, order_type').in(
        'stop_id', (resStops.data || []).map(function(s) { return s.stop_id; })
      );
      if (!resItems.error && resItems.data) {
        var sacosEnt = (resItems.data || []).reduce(function(s, i) { return s + (parseFloat(i.qty_entregue) || 0); }, 0);
        var sacosRet = (resItems.data || []).reduce(function(s, i) { return s + (parseFloat(i.qty_devolvida) || 0); }, 0);
        setCargaResumida(function(prev) { return Object.assign({}, prev, { entregue: sacosEnt, retorno: sacosRet }); });
      }
      // Valor entregue — somar dos stops com status delivered
      var stopsEntregues = (resStops.data || []).filter(function(s) { return s.status === 'delivered'; });
      var orderIds = stopsEntregues.map(function(s) { return s.order_id; }).filter(Boolean);
      if (orderIds.length > 0) {
        var resOrders = await supabase.from('orders').select('total_value').in('id', orderIds);
        if (!resOrders.error) {
          var valTotal = (resOrders.data || []).reduce(function(s, o) { return s + parseFloat(o.total_value || 0); }, 0);
          setCargaResumida(function(prev) { return Object.assign({}, prev, { valor: valTotal }); });
        }
      }
    } catch (e) {}
  }

  var entregues   = stops.filter(function(s) { return s.status === 'delivered'; }).length;
  var falhas      = stops.filter(function(s) { return s.status === 'failed'; }).length;
  var reentregas  = stops.filter(function(s) { return s.status === 'rescheduled'; }).length;
  var pendentes   = stops.filter(function(s) { return s.status === 'pending' || s.status === 'in_progress'; }).length;
  var pesoEntregue = stops.filter(function(s) { return s.status === 'delivered'; }).reduce(function(sum, s) { return sum + (parseFloat(s.weight_kg) || 0); }, 0);
  var progresso   = stops.length > 0 ? Math.round((entregues / stops.length) * 100) : 0;

  // Calcular tempo de operação
  var tempoOperacao = '—';
  if (rota && rota.started_at) {
    var inicio = new Date(rota.started_at);
    var agora  = new Date();
    var mins   = Math.round((agora - inicio) / 60000);
    var h = Math.floor(mins / 60); var m = mins % 60;
    tempoOperacao = h + 'h ' + m + 'min';
  }

  // KM percorrido
  var kmPercorrido = '—';
  if (rota && rota.km_start && kmFinal) {
    var diff = parseInt(kmFinal) - parseInt(rota.km_start);
    if (diff > 0) kmPercorrido = diff + ' km';
  }

  async function confirmarEncerramento() {
    if (!kmFinal || kmFinal.length < 4) { Alert.alert('KM inválido', 'Digite o KM final corretamente.'); return; }
    if (pendentes > 0) {
      Alert.alert('Paradas pendentes', pendentes + ' entrega(s) ainda pendente(s). Encerrar mesmo assim?',
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Encerrar', style: 'destructive', onPress: function() { doEncerrar(); } }]
      );
    } else { doEncerrar(); }
  }

  async function doEncerrar() {
    setLoading(true);
    try {
      await encerrarViagem(routeId, kmFinal);
      await AsyncStorage.removeItem('gelocrim_session');
      Alert.alert(
        '🏁 Viagem Encerrada!',
        entregues + ' entregas • ' + falhas + ' falhas • ' + pesoEntregue.toFixed(0) + 'kg entregue\n\nBoa noite, ' + driver.name.split(' ')[0] + '!',
        [{ text: 'OK', onPress: function() { navigation.replace('Login'); } }]
      );
    } catch (e) { Alert.alert('Erro', e.message || 'Não foi possível encerrar.'); }
    finally { setLoading(false); }
  }

  // ── FASE KM FINAL ─────────────────────────────────────────────────────────
  if (fase === 'km') return (
    <View style={[s.container, { justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60 }]}>

      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 48 }}>🏁</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 10 }}>KM Final do Veículo</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
          Informe o KM do hodômetro antes de sair
        </Text>
        {rota && rota.km_start && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: 'rgba(100,180,255,0.08)', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: 'rgba(100,180,255,0.2)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>KM inicial:</Text>
            <Text style={{ color: NEON.blue, fontSize: 12, fontWeight: '800' }}>{rota.km_start} km</Text>
          </View>
        )}
      </View>

      {/* Display KM */}
      <View style={s.kmDisplay}>
        <Text style={s.kmValor}>{kmFinal || '_ _ _ _ _'}</Text>
        <Text style={s.kmUnidade}>km</Text>
      </View>

      {/* KM percorrido preview */}
      {rota && rota.km_start && kmFinal.length >= 4 && parseInt(kmFinal) > parseInt(rota.km_start) && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Percorrido:</Text>
          <Text style={{ color: NEON.green, fontSize: 12, fontWeight: '900' }}>{parseInt(kmFinal) - parseInt(rota.km_start)} km</Text>
        </View>
      )}

      {/* Teclado */}
      <TecladoKM valor={kmFinal} onChange={setKmFinal} />

      {/* Botão */}
      <TouchableOpacity
        style={[s.btnPrimario, { width: '90%', marginTop: 20, opacity: kmFinal.length >= 4 ? 1 : 0.4 }]}
        onPress={function() { setFase('resumo'); }}
        disabled={kmFinal.length < 4}
        activeOpacity={0.85}>
        <Text style={s.btnPrimarioTxt}>VER RESUMO DA VIAGEM →</Text>
      </TouchableOpacity>
    </View>
  );

  // ── FASE RESUMO ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={function() { setFase('km'); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← KM Final</Text>
        </TouchableOpacity>
        <Text style={s.headerTitulo}>📊 Resumo da Viagem</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>

        {/* Viagem info */}
        {rota && (
          <View style={s.card}>
            <Text style={{ color: NEON.cyan, fontSize: 16, fontWeight: '900', marginBottom: 4 }}>{rota.trip_number}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>👤 {driver.name}</Text>
          </View>
        )}

        {/* KPIs principais */}
        <View style={s.kpiGrid}>
          {[
            { emoji: '✅', val: entregues,  lbl: 'Entregues',  cor: '#10b981' },
            { emoji: '❌', val: falhas,     lbl: 'Falhas',     cor: '#ef4444' },
            { emoji: '🔄', val: reentregas, lbl: 'Reentregas', cor: '#f59e0b' },
            { emoji: '⏳', val: pendentes,  lbl: 'Pendentes',  cor: '#64B4FF' },
          ].map(function(k) {
            return (
              <View key={k.lbl} style={[s.kpi, { borderColor: k.cor + '33' }]}>
                <Text style={{ fontSize: 22 }}>{k.emoji}</Text>
                <Text style={[s.kpiVal, { color: k.cor }]}>{k.val}</Text>
                <Text style={s.kpiLbl}>{k.lbl}</Text>
              </View>
            );
          })}
        </View>

        {/* Barra de progresso */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Progresso da viagem</Text>
            <Text style={{ color: NEON.cyan, fontSize: 12, fontWeight: '900' }}>{progresso}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: progresso + '%', backgroundColor: progresso === 100 ? '#10b981' : NEON.cyan, borderRadius: 4 }} />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6 }}>{entregues} de {stops.length} paradas concluídas</Text>
        </View>

        {/* Métricas da operação */}
        <Text style={s.secTitulo}>📊 MÉTRICAS DA OPERAÇÃO</Text>
        <View style={s.card}>
          {(function() {
            var kmInicial = rota ? parseInt(rota.km_start || 0) : 0;
            var kmFinalNum = parseInt(kmFinal) || 0;
            var kmTotal = kmFinalNum > kmInicial ? kmFinalNum - kmInicial : 0;
            var kmPerLitro = veiculo ? parseFloat(veiculo.km_per_liter || 0) : 0;
            var precoDiesel = veiculo ? parseFloat(veiculo.fuel_price || 7.59) : 7.59;
            var litrosConsumidos = kmPerLitro > 0 ? (kmTotal / kmPerLitro).toFixed(1) : '—';
            var custoDiesel = kmPerLitro > 0 ? 'R$ ' + (kmTotal / kmPerLitro * precoDiesel).toFixed(2) : '—';
            var items = [
              { label: '🚦 KM Inicial',        valor: kmInicial + ' km',                cor: 'rgba(255,255,255,0.4)' },
              { label: '🏁 KM Final',           valor: kmFinalNum + ' km',               cor: NEON.green },
              { label: '🛣️ KM Percorrido',     valor: kmTotal > 0 ? kmTotal + ' km' : '—', cor: NEON.blue },
              { label: '⛽ Diesel consumido',   valor: litrosConsumidos !== '—' ? litrosConsumidos + ' L' : '—', cor: '#f59e0b' },
              { label: '💰 Custo diesel',       valor: custoDiesel,                      cor: '#ef4444' },
              { label: '⚖️ Peso entregue',      valor: pesoEntregue.toFixed(0) + ' kg',                            cor: '#f59e0b' },
              { label: '📦 Sacos entregues',    valor: cargaResumida.entregue > 0 ? cargaResumida.entregue + ' un' : '0 un', cor: NEON.green },
              { label: '↩️ Sacos retornados',   valor: cargaResumida.retorno > 0 ? cargaResumida.retorno + ' un' : '0 un',  cor: NEON.yellow },
              { label: '💵 Valor entregue',     valor: cargaResumida.valor > 0 ? 'R$ ' + cargaResumida.valor.toFixed(2) : '—', cor: NEON.green },
              { label: '⏱️ Tempo operação',     valor: tempoOperacao,                                                         cor: NEON.cyan  },
            ];
            return items.map(function(item, i) {
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{item.label}</Text>
                  <Text style={{ color: item.cor, fontSize: 14, fontWeight: '800' }}>{item.valor}</Text>
                </View>
              );
            });
          })()}
        </View>

        {/* Lista de paradas */}
        <Text style={s.secTitulo}>📋 PARADAS DA VIAGEM</Text>
        <View style={s.card}>
          {stops.map(function(stop, i) {
            var cor = stop.status === 'delivered' ? '#10b981' : stop.status === 'failed' ? '#ef4444' : stop.status === 'rescheduled' ? '#f59e0b' : '#64B4FF';
            var ico = stop.status === 'delivered' ? '✅' : stop.status === 'failed' ? '❌' : stop.status === 'rescheduled' ? '🔄' : '⏳';
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < stops.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 3, borderLeftColor: cor, paddingLeft: 12, marginLeft: -1 }}>
                <Text style={{ fontSize: 18, width: 24 }}>{ico}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{stop.recipient_name}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>
                    {stop.failure_reason || stop.status}
                    {stop.tempo_atendimento_min ? ' • ' + stop.tempo_atendimento_min + 'min' : ''}
                  </Text>
                </View>
                <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>{(stop.weight_kg || 0).toFixed(0)}kg</Text>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Footer com botão encerrar */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnEncerrar, loading && { opacity: 0.6 }]}
          onPress={confirmarEncerramento}
          disabled={loading}
          activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnEncerrarTxt}>🏁 CONFIRMAR E ENCERRAR VIAGEM</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={function() { setFase('km'); }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>← Corrigir KM Final</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: NEON.bg, padding: 20 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 14, paddingHorizontal: 14, backgroundColor: '#000d1a', borderBottomWidth: 1, borderBottomColor: 'rgba(0,255,234,0.1)', marginHorizontal: -20, marginTop: -20 },
  backBtn:       { padding: 4 },
  backBtnTxt:    { color: NEON.blue, fontSize: 14, fontWeight: '600' },
  headerTitulo:  { color: '#fff', fontSize: 15, fontWeight: '900' },
  scroll:        { flex: 1 },
  card:          { backgroundColor: NEON.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,255,234,0.08)' },
  secTitulo:     { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  kpiGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kpi:           { width: '47%', flexGrow: 1, backgroundColor: NEON.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  kpiVal:        { fontSize: 28, fontWeight: '900', marginTop: 4 },
  kpiLbl:        { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, width: '100%' },
  key:           { width: '30%', aspectRatio: 1.8, backgroundColor: 'rgba(0,191,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,191,255,0.2)' },
  keyVazio:      { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyTxt:        { color: '#fff', fontSize: 26, fontWeight: '700' },
  kmDisplay:     { backgroundColor: 'rgba(0,191,255,0.08)', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(0,191,255,0.3)', flexDirection: 'row', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginBottom: 12 },
  kmValor:       { color: '#00BFFF', fontSize: 38, fontWeight: '900', letterSpacing: 6 },
  kmUnidade:     { color: 'rgba(0,191,255,0.5)', fontSize: 16 },
  btnPrimario:   { backgroundColor: '#00BFFF', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnPrimarioTxt:{ color: '#001020', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: 'rgba(0,13,26,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  btnEncerrar:   { backgroundColor: '#e8521a', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnEncerrarTxt:{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
