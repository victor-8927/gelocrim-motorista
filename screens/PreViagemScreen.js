import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { supabase, updateRouteStatus } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

var NEON = { cyan: '#00FFEA', green: '#00FF88', yellow: '#FFE600', red: '#FF3355', purple: '#BF5FFF', blue: '#64B4FF', bg: '#000d1a', card: '#001428' };

var ORDER_TYPES = {
  '1000': { label: 'VENDAS',      cor: '#00FF88', emoji: '🛒' },
  '1007': { label: 'TROCAS',      cor: '#FFE600', emoji: '🔄' },
  '1009': { label: 'BONIFICAÇÃO', cor: '#00FFEA', emoji: '🎁' },
  '1010': { label: 'SALDO',       cor: '#BF5FFF', emoji: '💰' },
};

var PRODUTOS = { '370': '5kg', '371': '10kg', '372': '20kg', '373': '40kg' };

function somarMinutos(hora, mins) {
  if (!hora) return '--:--';
  var parts = hora.split(':');
  var total = parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(mins || 0);
  var hf = Math.floor(total / 60) % 24;
  var mf = total % 60;
  return String(hf).padStart(2,'0') + ':' + String(mf).padStart(2,'0');
}

function formatarTempo(mins) {
  if (!mins) return '--';
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  if (h === 0) return m + 'min';
  if (m === 0) return h + 'h';
  return h + 'h ' + m + 'min';
}

export default function PreViagemScreen({ navigation, route }) {
  var driver  = route.params.driver;
  var rota    = route.params.route;

  var [loading, setLoading]         = useState(true);
  var [confirmando, setConfirmando] = useState(false);
  var [stops, setStops]             = useState([]);
  var [carga, setCarga]             = useState({});
  var [totais, setTotais]           = useState({});
  var [totalGeral, setTotalGeral]   = useState({ sacos: 0, kg: 0 });
  var [tempoTotal, setTempoTotal]   = useState(0);
  var [previsaoRetorno, setPrevisaoRetorno] = useState('--:--');
  var [equipe, setEquipe]           = useState({ assistente1: null, assistente2: null, veiculo: null });
  var [almocoInicio] = useState('12:00');
  var [almocoFim] = useState('13:12');

  var tripType  = rota.trip_type || '1viagem';
  var isEvento  = tripType === 'evento';
  var tripLabel = tripType === '1viagem' ? '1ª Viagem' : tripType === '2viagem' ? '2ª Viagem' : 'Evento';
  var tripEmoji = tripType === '1viagem' ? '🌅' : tripType === '2viagem' ? '🌆' : '🎯';

  useEffect(function() { carregarDados(); }, []); // eslint-disable-line

  async function carregarDados() {
    setLoading(true);
    try {
      // 1. Equipe e veículo
      var [resEquipe, resVeiculo] = await Promise.all([
        supabase.from('drivers').select('id, name, type').in('id', [
          rota.assistant1_id, rota.assistant2_id
        ].filter(Boolean)),
        rota.vehicle_id ? supabase.from('vehicles').select('id, vda, plate, model').eq('id', rota.vehicle_id).single() : Promise.resolve({ data: null }),
      ]);
      setEquipe({
        assistente1: (resEquipe.data || []).find(function(d) { return d.id === rota.assistant1_id; }) || null,
        assistente2: (resEquipe.data || []).find(function(d) { return d.id === rota.assistant2_id; }) || null,
        veiculo: resVeiculo.data || null,
      });

      // 2. Stops da rota
      var resStops = await supabase
        .from('stops')
        .select('stop_id, sequence, recipient_name, address, eta, weight_kg, codparc, order_id, status, lat, lng')
        .eq('route_id', rota.id)
        .order('sequence');
      if (resStops.error) throw resStops.error;
      var stopsData = resStops.data || [];

      // 3. Tempo de atendimento dos clientes
      var codparcs = [...new Set(stopsData.map(function(s) { return s.codparc; }).filter(Boolean))];
      var tempoMap = {};
      if (codparcs.length > 0) {
        var resClients = await supabase.from('clients').select('codparc, service_time').in('codparc', codparcs);
        if (!resClients.error) {
          (resClients.data || []).forEach(function(c) { tempoMap[c.codparc] = parseInt(c.service_time) || 15; });
        }
      }

      // 4. Calcular tempo total e previsão de retorno
      var totalMins = 0;
      var ultimoStop = null;
      stopsData.forEach(function(s) {
        var t = tempoMap[s.codparc] || 15;
        totalMins += t;
        if (!ultimoStop || s.sequence > ultimoStop.sequence) {
          ultimoStop = Object.assign({}, s, { tempo: t });
        }
      });
      setTempoTotal(totalMins);
      if (ultimoStop && ultimoStop.eta) {
        setPrevisaoRetorno(somarMinutos(ultimoStop.eta, ultimoStop.tempo + 30));
      }
      setStops(stopsData.map(function(s) {
        return Object.assign({}, s, { tempo_atendimento: tempoMap[s.codparc] || 15 });
      }));

      // 5. Carga por TOP — busca TODOS os pedidos de TODOS os clientes desta rota
      // Corrigido: busca por codparc + status routed para pegar múltiplos TOPs por cliente
      if (codparcs.length > 0) {
        var resOrders = await supabase
          .from('orders')
          .select('id, codparc, order_type, order_items(item_type, qty, weight_unit)')
          .in('codparc', codparcs)
          .eq('status', 'routed');

        if (!resOrders.error && resOrders.data) {
          var cargaMap = {}; var totaisMap = {}; var totalSacos = 0; var totalKg = 0;

          resOrders.data.forEach(function(pedido) {
            var otype = String(pedido.order_type || '1000');
            (pedido.order_items || []).forEach(function(item) {
              var itype = item.item_type;
              var qty   = parseFloat(item.qty) || 0;
              var kg    = qty * (parseFloat(item.weight_unit) || 0);

              // Agrupa por TOP corretamente — cada pedido tem seu próprio order_type
              if (!cargaMap[otype]) cargaMap[otype] = {};
              if (!cargaMap[otype][itype]) cargaMap[otype][itype] = { qty: 0, kg: 0 };
              cargaMap[otype][itype].qty += qty;
              cargaMap[otype][itype].kg  += kg;

              // Total geral por produto
              if (!totaisMap[itype]) totaisMap[itype] = { qty: 0, kg: 0 };
              totaisMap[itype].qty += qty;
              totaisMap[itype].kg  += kg;

              totalSacos += qty;
              totalKg    += kg;
            });
          });

          setCarga(cargaMap);
          setTotais(totaisMap);
          setTotalGeral({ sacos: totalSacos, kg: totalKg });
        }
      }
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function confirmarInicio() {
    setConfirmando(true);
    try {
      await updateRouteStatus(rota.id, 'in_progress', { started_at: new Date().toISOString() });
      var session = await AsyncStorage.getItem('gelocrim_session');
      if (session) {
        var parsed = JSON.parse(session);
        parsed.route = Object.assign({}, parsed.route, { status: 'in_progress' });
        await AsyncStorage.setItem('gelocrim_session', JSON.stringify(parsed));
      }
      if (isEvento) {
        navigation.replace('Evento', { driver: driver, route: Object.assign({}, rota, { status: 'in_progress' }) });
      } else {
        navigation.replace('Rota', { driver: driver, route: Object.assign({}, rota, { status: 'in_progress', stops: stops }) });
      }
    } catch (e) { Alert.alert('Erro', e.message); setConfirmando(false); }
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={NEON.cyan} />
      <Text style={s.dimTxt}>Preparando briefing da viagem...</Text>
    </View>
  );

  var totalSacosGeral = Math.round(totalGeral.sacos);

  return (
    <View style={s.container}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={function() { navigation.goBack(); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← Voltar</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.tripNum}>{rota.trip_number}</Text>
          <View style={[s.badge, { borderColor: isEvento ? NEON.purple : NEON.cyan }]}>
            <Text style={[s.badgeTxt, { color: isEvento ? NEON.purple : NEON.cyan }]}>{tripEmoji} {tripLabel}</Text>
          </View>
        </View>
        <View style={s.headerHoras}>
          <Text style={s.horaLabel}>SAÍDA</Text>
          <Text style={s.horaValor}>{rota.planned_start || '07:30'}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 14, paddingBottom: 130 }}>

        {/* EQUIPE */}
        <View style={s.card}>
          <Text style={s.secTitulo}>👥 EQUIPE DA VIAGEM</Text>
          <View style={s.equipeRow}>
            <View style={s.equipeMembro}>
              <Text style={s.equipeEmoji}>🚛</Text>
              <Text style={s.equipeLabel}>MOTORISTA</Text>
              <Text style={s.equipeNome}>{driver.name.split(' ')[0]}</Text>
            </View>
            {equipe.assistente1 && (
              <View style={s.equipeMembro}>
                <Text style={s.equipeEmoji}>👷</Text>
                <Text style={s.equipeLabel}>AJUDANTE 1</Text>
                <Text style={s.equipeNome}>{equipe.assistente1.name.split(' ')[0]}</Text>
              </View>
            )}
            {equipe.assistente2 && (
              <View style={s.equipeMembro}>
                <Text style={s.equipeEmoji}>👷</Text>
                <Text style={s.equipeLabel}>AJUDANTE 2</Text>
                <Text style={s.equipeNome}>{equipe.assistente2.name.split(' ')[0]}</Text>
              </View>
            )}
            {equipe.veiculo && (
              <View style={s.equipeMembro}>
                <Text style={s.equipeEmoji}>🚐</Text>
                <Text style={s.equipeLabel}>VEÍCULO</Text>
                <Text style={s.equipeNome}>{equipe.veiculo.vda || equipe.veiculo.plate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* KPIs */}
        <View style={s.kpiRow}>
          {[
            { val: stops.length,                           lbl: 'Clientes',  cor: NEON.cyan   },
            { val: formatarTempo(tempoTotal),              lbl: 'T. Atend.', cor: NEON.yellow },
            { val: totalSacosGeral,                        lbl: 'Sacos',     cor: NEON.green  },
            { val: (totalGeral.kg/1000).toFixed(1) + 't', lbl: 'Peso',      cor: NEON.purple },
          ].map(function(k) {
            return (
              <View key={k.lbl} style={s.kpi}>
                <Text style={[s.kpiVal, { color: k.cor }]}>{k.val}</Text>
                <Text style={s.kpiLbl}>{k.lbl}</Text>
              </View>
            );
          })}
        </View>

        {/* HORÁRIOS */}
        <View style={s.card}>
          <Text style={s.secTitulo}>🕐 CRONOGRAMA DO DIA</Text>
          <View style={s.horariosGrid}>
            <View style={s.horarioItem}>
              <Text style={s.horarioLabel}>SAÍDA</Text>
              <Text style={[s.horarioValor, { color: NEON.cyan }]}>{rota.planned_start || '07:30'}</Text>
            </View>
            <View style={[s.horarioItem, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={s.horarioLabel}>🍽️ ALMOÇO</Text>
              <Text style={[s.horarioValor, { color: NEON.yellow, fontSize: 13 }]}>{almocoInicio} — {almocoFim}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textAlign: 'center', marginTop: 2 }}>72 min pausa</Text>
            </View>
            <View style={s.horarioItem}>
              <Text style={s.horarioLabel}>RETORNO</Text>
              <Text style={[s.horarioValor, { color: NEON.green }]}>{previsaoRetorno}</Text>
            </View>
          </View>
        </View>

        {/* CLIENTES */}
        {!isEvento && (
          <View style={s.card}>
            <Text style={s.secTitulo}>📍 SEQUÊNCIA DE ATENDIMENTO</Text>
            {stops.map(function(stop, i) {
              return (
                <View key={stop.stop_id} style={[s.stopRow, i < stops.length - 1 && s.stopRowBorder]}>
                  <View style={s.stopSeq}>
                    <Text style={s.stopSeqNum}>{stop.sequence}</Text>
                  </View>
                  <View style={s.stopInfo}>
                    <Text style={s.stopNome} numberOfLines={1}>{stop.recipient_name}</Text>
                    <View style={s.stopMeta}>
                      <Text style={s.stopMetaTxt}>⏱ {stop.tempo_atendimento}min</Text>
                      <Text style={s.stopMetaTxt}>⚖️ {stop.weight_kg}kg</Text>
                    </View>
                  </View>
                  <Text style={s.stopEta}>{stop.eta || '--:--'}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* EVENTO */}
        {isEvento && (
          <View style={[s.card, { borderColor: NEON.purple + '44' }]}>
            <Text style={[s.secTitulo, { color: NEON.purple }]}>🎯 INSTRUÇÕES DO EVENTO</Text>
            {[
              { n: '1', cor: NEON.cyan,   txt: 'Dirija até o local do evento' },
              { n: '2', cor: NEON.yellow, txt: 'Estacione em local seguro e autorizado' },
              { n: '3', cor: NEON.purple, txt: 'Fotografe o veículo estacionado' },
              { n: '4', cor: NEON.green,  txt: 'Retorne de Uber — outro motorista recolhe amanhã' },
            ].map(function(item) {
              return (
                <View key={item.n} style={s.eventoStep}>
                  <View style={[s.eventoNum, { backgroundColor: item.cor }]}>
                    <Text style={s.eventoNumTxt}>{item.n}</Text>
                  </View>
                  <Text style={s.eventoTxt}>{item.txt}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* CARGA POR TOP */}
        <Text style={[s.secTitulo, { paddingHorizontal: 0, marginBottom: 8 }]}>📦 CARGA DA VIAGEM</Text>
        {Object.keys(ORDER_TYPES).map(function(otype) {
          var info = ORDER_TYPES[otype];
          var itens = carga[otype];
          if (!itens || Object.keys(itens).length === 0) return null;
          return (
            <View key={otype} style={[s.cargaCard, { borderColor: info.cor + '44' }]}>
              <Text style={[s.cargaTitulo, { color: info.cor }]}>{info.emoji} {info.label}</Text>
              <View style={s.cargaItens}>
                {Object.keys(itens).sort().map(function(itype) {
                  var item = itens[itype];
                  if (!item.qty) return null;
                  return (
                    <View key={itype} style={s.cargaItem}>
                      <Text style={[s.cargaQty, { color: info.cor }]}>{Math.round(item.qty)}</Text>
                      <Text style={s.cargaLbl}>sacos {PRODUTOS[itype] || itype}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* TOTAL GERAL */}
        {Object.keys(totais).length > 0 && (
          <View style={s.totalCard}>
            <Text style={s.totalTitulo}>TOTAL GERAL</Text>
            <View style={s.cargaItens}>
              {Object.keys(totais).sort().map(function(itype) {
                var item = totais[itype];
                if (!item.qty) return null;
                return (
                  <View key={itype} style={s.cargaItem}>
                    <Text style={[s.cargaQty, { color: '#fff' }]}>{Math.round(item.qty)}</Text>
                    <Text style={[s.cargaLbl, { color: 'rgba(255,255,255,0.5)' }]}>sacos {PRODUTOS[itype] || itype}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.totalKg}>{(totalGeral.kg / 1000).toFixed(2)} toneladas</Text>
          </View>
        )}

      </ScrollView>

      {/* FOOTER */}
      <View style={s.footer}>
        <View style={s.footerInfo}>
          <Text style={s.footerInfoTxt}>⏰ {rota.planned_start || '07:30'}</Text>
          <Text style={s.footerInfoTxt}>🍽️ {almocoInicio}–{almocoFim}</Text>
          <Text style={s.footerInfoTxt}>🏁 {previsaoRetorno}</Text>
          <Text style={s.footerInfoTxt}>⏱ {formatarTempo(tempoTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[s.btnIniciar, confirmando && { opacity: 0.6 }]}
          onPress={confirmarInicio}
          disabled={confirmando}
          activeOpacity={0.85}>
          {confirmando
            ? <ActivityIndicator color="#001020" />
            : <Text style={s.btnIniciarTxt}>🚀 CONFIRMAR E INICIAR VIAGEM</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: NEON.bg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: NEON.bg },
  dimTxt:         { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13 },
  header:         { backgroundColor: '#000d1a', padding: 14, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(0,255,234,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:        { padding: 4 },
  backBtnTxt:     { color: NEON.blue, fontSize: 14, fontWeight: '600' },
  headerCenter:   { alignItems: 'center', flex: 1 },
  tripNum:        { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  badge:          { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  badgeTxt:       { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerHoras:    { alignItems: 'flex-end' },
  horaLabel:      { color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2 },
  horaValor:      { color: NEON.yellow, fontSize: 18, fontWeight: '900' },
  scroll:         { flex: 1 },
  card:           { backgroundColor: NEON.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,255,234,0.08)' },
  secTitulo:      { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  equipeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipeMembro:   { flex: 1, minWidth: 70, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100,180,255,0.15)' },
  equipeEmoji:    { fontSize: 22, marginBottom: 4 },
  equipeLabel:    { color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  equipeNome:     { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  kpiRow:         { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpi:            { flex: 1, backgroundColor: NEON.card, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,234,0.08)' },
  kpiVal:         { fontSize: 18, fontWeight: '900' },
  kpiLbl:         { color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 3, textAlign: 'center' },
  horariosGrid:   { flexDirection: 'row' },
  horarioItem:    { flex: 1, alignItems: 'center', paddingVertical: 4 },
  horarioLabel:   { color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1, fontWeight: '700', marginBottom: 4 },
  horarioValor:   { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  stopRow:        { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  stopRowBorder:  { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  stopSeq:        { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,255,234,0.12)', alignItems: 'center', justifyContent: 'center' },
  stopSeqNum:     { color: NEON.cyan, fontSize: 12, fontWeight: '900' },
  stopInfo:       { flex: 1 },
  stopNome:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  stopMeta:       { flexDirection: 'row', gap: 10, marginTop: 2 },
  stopMetaTxt:    { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
  stopEta:        { color: NEON.cyan, fontSize: 14, fontWeight: '900' },
  eventoStep:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  eventoNum:      { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventoNumTxt:   { color: '#001020', fontSize: 12, fontWeight: '900' },
  eventoTxt:      { color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1, lineHeight: 18 },
  cargaCard:      { backgroundColor: NEON.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  cargaTitulo:    { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  cargaItens:     { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cargaItem:      { alignItems: 'center', minWidth: 60 },
  cargaQty:       { fontSize: 22, fontWeight: '900' },
  cargaLbl:       { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 },
  totalCard:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  totalTitulo:    { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  totalKg:        { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 10, textAlign: 'right' },
  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 28, backgroundColor: 'rgba(0,13,26,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(0,255,234,0.1)' },
  footerInfo:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  footerInfoTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  btnIniciar:     { backgroundColor: NEON.cyan, borderRadius: 14, padding: 18, alignItems: 'center' },
  btnIniciarTxt:  { color: '#001020', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
