import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, TextInput, Image,
  KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';

var GOOGLE_API_KEY = 'AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';

var TOPS = {
  '1000':  { label: 'VENDA',        cor: '#10b981', bg: 'rgba(16,185,129,0.1)',  emoji: '🛒' },
  '1007':  { label: 'BONIFICAÇÃO',  cor: '#a78bfa', bg: 'rgba(167,139,250,0.1)', emoji: '🎁' },
  '1009':  { label: 'TROCA',        cor: '#f59e0b', bg: 'rgba(245,158,11,0.1)', emoji: '🔄' },
  '1010':  { label: 'PRÉ-PEDIDO',   cor: '#64B4FF', bg: 'rgba(100,180,255,0.1)', emoji: '📋' },
  'saldo': { label: 'SALDO',        cor: '#64B4FF', bg: 'rgba(100,180,255,0.1)', emoji: '💰' },
};

var MOTIVOS_RETORNO = ['Câmara Cheia', 'Sacos Avariados', 'Sem Data de Validade', 'Outro'];
var MOTIVOS_RECUSA  = ['Cliente Fechado', 'Cliente Ausente', 'Endereço Errado', 'Cliente Recusou', 'Sacos Avariados', 'Câmara Cheia', 'Outro'];
var MOTIVOS_TROCA   = ['Cliente não tinha quantidade', 'Sacos Avariados', 'Câmara Cheia', 'Reentrega mesmo saco', 'Outro'];

// Componente teclado numérico para quantidade
function ControlQtd({ valor, max, onChange, cor }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' }}
        onPress={function() { onChange(Math.max(0, valor - 1)); }}>
        <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: '900', lineHeight: 24 }}>−</Text>
      </TouchableOpacity>
      <View style={{ width: 48, height: 32, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: cor || 'rgba(0,255,234,0.3)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: cor || '#00FFEA', fontSize: 16, fontWeight: '900' }}>{valor}</Text>
      </View>
      <TouchableOpacity
        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center' }}
        onPress={function() { onChange(Math.min(max || 9999, valor + 1)); }}>
        <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '900', lineHeight: 24 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// Botões de motivo
function MotivosBtns({ motivos, selecionado, onSelect, cor }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {motivos.map(function(m) {
        var sel = selecionado === m;
        return (
          <TouchableOpacity key={m}
            style={{ backgroundColor: sel ? (cor || '#ef4444') + '22' : 'rgba(255,255,255,0.04)', borderWidth: sel ? 1.5 : 1, borderColor: sel ? (cor || '#ef4444') : 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
            onPress={function() { onSelect(m); }}>
            <Text style={{ color: sel ? (cor || '#ef4444') : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: sel ? '800' : '500' }}>{m}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Botão de foto
function FotoBtn({ foto, onPress, label, obrigatorio, cor }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 }}>
        {label}{obrigatorio ? ' *' : ' (opcional)'}
      </Text>
      <TouchableOpacity
        style={{ borderWidth: foto ? 1.5 : 1.5, borderColor: foto ? '#10b981' : obrigatorio ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)', borderStyle: foto ? 'solid' : 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: foto ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)' }}
        onPress={onPress}>
        {foto
          ? <Image source={{ uri: foto }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" />
          : <Text style={{ color: obrigatorio ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.3)', fontSize: 13 }}>📷 Tirar Foto</Text>
        }
        {foto && <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700', marginTop: 4 }}>✅ Foto tirada — toque para refazer</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function EntregaScreen(props) {
  var navigation = props.navigation;
  var navRoute   = props.route;
  var stop       = navRoute.params.stop;
  var driver     = navRoute.params.driver;
  var routeId    = navRoute.params.routeId;

  // Fases: detalhes | atendimento | entregue | troca | recusado
  var [fase, setFase]             = useState('detalhes');
  var [loading, setLoading]       = useState(false);
  var [loadingDados, setLoadingDados] = useState(true);
  var [cliente, setCliente]       = useState(null);
  var [pedidos, setPedidos]       = useState([]);
  var [gps, setGps]               = useState(null);
  var [obs, setObs]               = useState('');
  var [fotos, setFotos]           = useState({ nf: null, canhoto: null, outros: null });
  var [motivoRecusa, setMotivoRecusa] = useState('');
  var [tipoRecusa, setTipoRecusa] = useState('recusado'); // recusado | reentrega
  var [vendaLocal, setVendaLocal] = useState(false);
  var tempoInicio = useRef(null);


  // Controle de quantidades por pedido/item
  var [qtdsEntregues, setQtdsEntregues]   = useState({});
  var [motivosRetorno, setMotivosRetorno] = useState({});
  var [destinoRetorno, setDestinoRetorno] = useState({}); // base | venda_local | saldo
  var [qtdsTrocadas, setQtdsTrocadas]     = useState({});
  var [statusTrocas, setStatusTrocas]     = useState({}); // 100 | parcial | nao_feita
  var [motivosTroca, setMotivosTroca]     = useState({});

  useEffect(function() {
    carregarDados();
    obterGPS();
  }, []); // eslint-disable-line

  async function obterGPS() {
    try {
      var perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) {}
  }

  async function carregarDados() {
    setLoadingDados(true);
    try {
      // Cliente
      if (stop.codparc) {
        var resC = await supabase.from('clients').select('codparc, name, phone, address, district, city, state, segment, service_time, lat, lng').eq('codparc', stop.codparc).single();
        if (!resC.error) setCliente(resC.data);
      }
      // Todos os pedidos do cliente roteirizados
      var resP = await supabase.from('orders').select('id, external_id, order_type, invoice_number, payment_description, total_value, weight_kg, order_items(*)').eq('codparc', stop.codparc).eq('status', 'routed').order('order_type');
      if (!resP.error && resP.data) {
        setPedidos(resP.data);
        // Inicializar quantidades
        var qtds = {}; var trocas = {}; var statuses = {};
        resP.data.forEach(function(p) {
          (p.order_items || []).forEach(function(item) {
            var key = p.id + '_' + item.item_type;
            qtds[key] = parseFloat(item.qty) || 0;
            trocas[key] = parseFloat(item.qty) || 0;
            statuses[p.id] = '100';
          });
        });
        setQtdsEntregues(qtds);
        setQtdsTrocadas(trocas);
        setStatusTrocas(statuses);
      }
    } catch (e) {}
    finally { setLoadingDados(false); }
  }

  function tirarFoto(tipo) {
    navigation.navigate('Camera', {
      tipo: tipo,
      onFoto: function(t, uri) {
        setFotos(function(prev) { return Object.assign({}, prev, { [t]: uri }); });
      }
    });
  }

  async function capturarFoto() {
    if (!cameraRef.current) return;
    try {
      var foto = await cameraRef.current.takePictureAsync({ quality: 1.0, exif: false });
      setProcessandoFoto(true);
      var now = new Date();
      var dataHora = now.getFullYear() + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + String(now.getDate()).padStart(2,'0') + '  ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      var W = foto.width || 1080;
      var H = foto.height || 1920;
      var faixaY = H - 130;
      var resultado = await RNPhotoManipulator.batch(
        foto.uri,
        [
          { operation: 'text', options: { position: { x: 20, y: faixaY + 10 }, text: enderecoAtual || 'Manaus, AM', textSize: 28, color: '#FFFFFF', thickness: 1 } },
          { operation: 'text', options: { position: { x: 20, y: faixaY + 50 }, text: dataHora + '  GELOCRIM IND. DE GELO LTDA.', textSize: 22, color: '#FFFFFF', thickness: 1 } },
          { operation: 'text', options: { position: { x: 20, y: faixaY + 88 }, text: gpsAtual ? ('GPS ' + gpsAtual.lat.toFixed(5) + ', ' + gpsAtual.lng.toFixed(5)) : '', textSize: 18, color: '#00FFEA', thickness: 1 } },
        ],
        { x: 0, y: 0, width: W, height: H },
        { width: 800, height: Math.round(800 * H / W) },
        75
      );
      setFotoPreview(resultado);
      setProcessandoFoto(false);
    } catch(e) {
      setProcessandoFoto(false);
      Alert.alert('Erro', 'Não foi possível processar a foto.');
    }
  }

  function confirmarFoto() {
    setFotos(function(prev) { return Object.assign({}, prev, { [tipoFotoAtual]: fotoPreview }); });
    setCameraAberta(false);
    setFotoPreview(null);
    setTipoFotoAtual(null);
  }

  function refazerFoto() {
    setFotoPreview(null);
    setProcessandoFoto(false);
  }

  function iniciarAtendimento() {
    tempoInicio.current = new Date();
    supabase.from('stops').update({ status: 'in_progress', atendimento_iniciado_at: new Date().toISOString(), lat_ata: gps ? gps.lat : null, lng_ata: gps ? gps.lng : null }).eq('stop_id', stop.stop_id).then(function() {});
    setFase('atendimento');
  }

  function navegarCliente() {
    var lat = stop.lat || (cliente && cliente.lat);
    var lng = stop.lng || (cliente && cliente.lng);
    if (!lat || !lng) { Alert.alert('GPS do cliente não disponível'); return; }
    Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng);
  }

  function ligarCliente() {
    if (!cliente || !cliente.phone) { Alert.alert('Telefone não disponível'); return; }
    Linking.openURL('tel:' + cliente.phone.replace(/\D/g, ''));
  }

  async function uploadFoto(uri, nome) {
    try {
      var resp = await fetch(uri);
      var blob = await resp.blob();
      var path = 'stops/' + stop.stop_id + '/' + nome + '_' + Date.now() + '.jpg';
      var { error } = await supabase.storage.from('stops').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      var { data } = supabase.storage.from('stops').getPublicUrl(path);
      return data.publicUrl;
    } catch(e) {
      console.log('Erro upload foto:', e.message);
      return null;
    }
  }

  async function finalizarEntrega() {
    // CORREÇÃO 2: validação de fotos obrigatórias
    if (!fotos.nf)      { Alert.alert('Foto obrigatória', 'Tire a foto da Nota Fiscal.'); return; }
    if (!fotos.canhoto) { Alert.alert('Foto obrigatória', 'Tire a foto do Canhoto.'); return; }
    setLoading(true);
    try {
      var agora = new Date();
      var tempoMin = tempoInicio.current ? Math.round((agora - tempoInicio.current) / 60000) : null;
      // Upload das fotos
      var nfUrl      = fotos.nf      ? await uploadFoto(fotos.nf,      'nf')      : null;
      var canhotoUrl = fotos.canhoto ? await uploadFoto(fotos.canhoto,  'canhoto') : null;
      var outrosUrl  = fotos.outros  ? await uploadFoto(fotos.outros,   'outros')  : null;
      // CORREÇÃO 1: colunas corretas que o App Mãe lê
      await supabase.from('stops').update({
        status: 'delivered', atd: agora.toISOString(),
        atendimento_finalizado_at: agora.toISOString(),
        tempo_atendimento_min: tempoMin,
        lat_atd: gps ? gps.lat : null, lng_atd: gps ? gps.lng : null,
        notes: obs || null,
        nf_url:      nfUrl      || null,
        canhoto_url: canhotoUrl || null,
        outros_url:  outrosUrl  || null,
      }).eq('stop_id', stop.stop_id);
      // CORREÇÃO 4: chave correta (item_type) + destino_retorno + motivo_devolucao
      var stopItemsRows = [];
      pedidos.forEach(function(pedido) {
        (pedido.order_items || []).forEach(function(item) {
          var key = pedido.id + '_' + item.item_type; // ← chave igual à usada na UI
          var qtdPlan = parseFloat(item.qty) || 0;
          var qtdEnt  = parseFloat(qtdsEntregues[key] !== undefined ? qtdsEntregues[key] : qtdPlan);
          var qtdDev  = qtdPlan - qtdEnt;
          stopItemsRows.push({
            stop_id:          stop.stop_id,
            order_id:         pedido.id,
            order_item_id:    item.id,
            order_type:       String(pedido.order_type || '1000'),
            item_name:        item.item_name || item.sku || item.description || '',
            weight_unit:      parseFloat(item.weight_unit || 0),
            qty_planejada:    qtdPlan,
            qty_entregue:     qtdEnt,
            qty_devolvida:    qtdDev > 0 ? qtdDev : 0,
            destino_retorno:  qtdDev > 0 ? (destinoRetorno[key] || 'base') : null,
            motivo_devolucao: qtdDev > 0 ? (motivosRetorno[key] || obs || null) : null,
            top_app:          String(pedido.order_type || '1000'),
          });
        });
      });
      if (stopItemsRows.length > 0) {
        await supabase.from('stop_items').upsert(stopItemsRows, { onConflict: 'stop_id,order_item_id', ignoreDuplicates: false });
      }
      Alert.alert('✅ Entrega confirmada!', stop.recipient_name + (tempoMin ? '\nTempo: ' + tempoMin + ' min' : ''), [{ text: 'OK', onPress: function() { navigation.goBack(); } }]);
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function finalizarTroca() {
    setLoading(true);
    try {
      var agora = new Date();
      var tempoMin = tempoInicio.current ? Math.round((agora - tempoInicio.current) / 60000) : null;
      var canhotoUrl = fotos.canhoto ? await uploadFoto(fotos.canhoto, 'canhoto') : null;
      var outrosUrl  = fotos.outros  ? await uploadFoto(fotos.outros,  'outros')  : null;
      await supabase.from('stops').update({
        status: 'delivered', atd: agora.toISOString(),
        atendimento_finalizado_at: agora.toISOString(),
        tempo_atendimento_min: tempoMin,
        notes: obs || null,
        canhoto_url: canhotoUrl || null,
        outros_url:  outrosUrl  || null,
      }).eq('stop_id', stop.stop_id);
      // Salvar stop_items para trocas
      var stopItemsRows = [];
      pedidos.filter(function(p) { return String(p.order_type) === '1009'; }).forEach(function(pedido) {
        (pedido.order_items || []).forEach(function(item) {
          var key = pedido.id + '_' + item.id;
          var qtdPlan = parseFloat(item.qty) || 0;
          var qtdTroc = parseFloat(qtdsTrocadas[key] !== undefined ? qtdsTrocadas[key] : qtdPlan);
          stopItemsRows.push({
            stop_id:          stop.stop_id,
            order_id:         pedido.id,
            order_item_id:    item.id,
            order_type:       '1009',
            item_name:        item.sku || item.description || '',
            weight_unit:      parseFloat(item.weight_unit || 0),
            qty_planejada:    qtdPlan,
            qty_entregue:     qtdTroc,
            qty_devolvida:    qtdPlan - qtdTroc > 0 ? qtdPlan - qtdTroc : 0,
            motivo_devolucao: null,
            top_app:          '1009',
          });
        });
      });
      if (stopItemsRows.length > 0) {
        await supabase.from('stop_items').upsert(stopItemsRows, { onConflict: 'stop_id,order_item_id', ignoreDuplicates: false });
      }
      Alert.alert('🔄 Troca confirmada!', stop.recipient_name, [{ text: 'OK', onPress: function() { navigation.goBack(); } }]);
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function finalizarRecusa() {
    if (!motivoRecusa) { Alert.alert('Motivo obrigatório', 'Selecione o motivo.'); return; }
    setLoading(true);
    try {
      var agora = new Date();
      var tempoMin = tempoInicio.current ? Math.round((agora - tempoInicio.current) / 60000) : null;
      var statusFinal = tipoRecusa === 'reentrega' ? 'rescheduled' : 'failed';
      var ocorrenciaUrl = fotos.outros ? await uploadFoto(fotos.outros, 'ocorrencia') : null;
      await supabase.from('stops').update({
        status: statusFinal, atd: agora.toISOString(),
        atendimento_finalizado_at: agora.toISOString(),
        tempo_atendimento_min: tempoMin,
        failure_reason: motivoRecusa,
        notes: obs || null,
        ocorrencia_url: ocorrenciaUrl || null,
      }).eq('stop_id', stop.stop_id);
      var emoji = tipoRecusa === 'reentrega' ? '🔄' : '❌';
      Alert.alert(emoji + ' Registrado!', motivoRecusa, [{ text: 'OK', onPress: function() { navigation.goBack(); } }]);
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  var totalSacos = 0; var totalKg = 0; var totalValor = 0;
  pedidos.forEach(function(p) {
    totalKg += parseFloat(p.weight_kg || 0);
    totalValor += parseFloat(p.total_value || 0);
    (p.order_items || []).forEach(function(i) { totalSacos += parseFloat(i.qty || 0); });
  });

  // ── TELA DETALHES ──────────────────────────────────────────────────────────


  if (fase === 'detalhes') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={function() { navigation.goBack(); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← Lista</Text>
        </TouchableOpacity>
        <Text style={s.headerTitulo}>Parada {stop.sequence}</Text>
        <View style={s.headerEta}>
          <Text style={s.etaLabel}>ETA</Text>
          <Text style={s.etaVal}>{stop.eta || '--:--'}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Card Cliente */}
        <View style={s.clienteCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.clienteNome}>{stop.recipient_name}</Text>
              {cliente && <Text style={s.clienteCod}>Cód. {cliente.codparc} • {cliente.segment || '—'}</Text>}
            </View>
            {cliente && cliente.phone && (
              <TouchableOpacity style={s.btnLigar} onPress={ligarCliente}>
                <Text style={{ fontSize: 22 }}>📞</Text>
                <Text style={s.btnLigarTxt}>Ligar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.enderecoBox}>
            <Text style={s.enderecoLabel}>📍 ENDEREÇO DO CLIENTE</Text>
            <Text style={s.enderecoTxt}>{cliente ? (cliente.address || stop.address) : stop.address}</Text>
            {cliente && <Text style={s.enderecoSub}>{[cliente.district, cliente.city, cliente.state].filter(Boolean).join(' • ')}</Text>}
            {stop.lat && stop.lng && <Text style={s.gpsCoord}>GPS: {parseFloat(stop.lat).toFixed(4)}, {parseFloat(stop.lng).toFixed(4)}</Text>}
          </View>

          <View style={s.kpiRow}>
            {cliente && cliente.service_time && <View style={s.kpi}><Text style={[s.kpiVal, { color: '#00FFEA' }]}>{cliente.service_time}min</Text><Text style={s.kpiLbl}>T. Atend.</Text></View>}
            <View style={s.kpi}><Text style={[s.kpiVal, { color: '#f59e0b' }]}>{Math.round(totalSacos)}</Text><Text style={s.kpiLbl}>Sacos</Text></View>
            <View style={s.kpi}><Text style={[s.kpiVal, { color: '#f59e0b' }]}>{Math.round(totalKg)}kg</Text><Text style={s.kpiLbl}>Peso</Text></View>
            <View style={s.kpi}><Text style={[s.kpiVal, { color: '#10b981' }]}>R${totalValor.toFixed(0)}</Text><Text style={s.kpiLbl}>Valor</Text></View>
          </View>

          <TouchableOpacity style={s.btnNavegar} onPress={navegarCliente}>
            <Text style={s.btnNavegarTxt}>🧭  NAVEGAR ATÉ O CLIENTE</Text>
          </TouchableOpacity>
        </View>

        {/* Pedidos */}
        {loadingDados
          ? <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color="#64B4FF" /></View>
          : pedidos.map(function(pedido, pi) {
            var top  = String(pedido.order_type || '1000');
            var info = TOPS[top] || TOPS['1000'];
            var temBoleto = pedido.payment_description && pedido.payment_description.toLowerCase().includes('boleto');
            return (
              <View key={pi} style={[s.pedidoCard, { borderTopColor: info.cor }]}>
                <View style={[s.pedidoHeader, { backgroundColor: info.bg }]}>
                  <Text style={[s.pedidoTop, { color: info.cor }]}>{info.emoji} {info.label}</Text>
                  <Text style={s.pedidoNF}>NF {pedido.invoice_number || pedido.external_id || '—'}</Text>
                </View>
                <View style={s.pedidoInfo}>
                  <View style={s.pedidoInfoItem}><Text style={s.pedidoInfoLabel}>PAGAMENTO</Text><Text style={s.pedidoInfoVal}>{pedido.payment_description || 'À Vista'}</Text></View>
                  <View style={s.pedidoInfoItem}><Text style={s.pedidoInfoLabel}>BOLETO</Text><Text style={[s.pedidoInfoVal, { color: temBoleto ? '#f59e0b' : '#10b981' }]}>{temBoleto ? '⚠️ SIM' : 'Não'}</Text></View>
                  <View style={s.pedidoInfoItem}><Text style={s.pedidoInfoLabel}>VALOR</Text><Text style={[s.pedidoInfoVal, { color: info.cor }]}>R${parseFloat(pedido.total_value || 0).toFixed(2)}</Text></View>
                </View>
                <View style={s.itensTbl}>
                  <View style={s.itensTblHeader}>
                    <Text style={[s.itensTblLabel, { flex: 0.5 }]}>CÓD</Text>
                    <Text style={[s.itensTblLabel, { flex: 2 }]}>PRODUTO</Text>
                    <Text style={[s.itensTblLabel, { flex: 1, textAlign: 'center' }]}>QTDE</Text>
                    <Text style={[s.itensTblLabel, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
                  </View>
                  {(pedido.order_items || []).map(function(item, ii) {
                    var peso = (parseFloat(item.qty) * parseFloat(item.weight_unit || 0)).toFixed(0);
                    return (
                      <View key={ii} style={s.itensTblRow}>
                        <Text style={[s.itensTblCod, { flex: 0.5 }]}>{item.item_type}</Text>
                        <Text style={[s.itensTblNome, { flex: 2 }]} numberOfLines={1}>{item.item_name}</Text>
                        <Text style={[s.itensTblQtd, { flex: 1, textAlign: 'center', color: info.cor }]}>{item.qty}un</Text>
                        <Text style={[s.itensTblPeso, { flex: 1, textAlign: 'right' }]}>{peso}kg</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        }

        {/* Botão iniciar */}
        <View style={{ padding: 14, paddingBottom: 40 }}>
          <TouchableOpacity style={s.btnIniciar} onPress={iniciarAtendimento} activeOpacity={0.85}>
            <Text style={s.btnIniciarTxt}>✅  INICIAR ATENDIMENTO</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── TELA ATENDIMENTO ───────────────────────────────────────────────────────
  if (fase === 'atendimento') return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={function() { setFase('detalhes'); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitulo}>{stop.recipient_name}</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', gap: 14 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>O QUE ACONTECEU?</Text>

        <TouchableOpacity style={[s.acaoBtn, { borderColor: '#10b981' }]} onPress={function() { setFase('entregue'); }} activeOpacity={0.85}>
          <Text style={{ fontSize: 36 }}>✅</Text>
          <Text style={[s.acaoBtnTitulo, { color: '#10b981' }]}>ENTREGUE</Text>
          <Text style={s.acaoBtnSub}>Registrar entrega e fotos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.acaoBtn, { borderColor: '#f59e0b' }]} onPress={function() { setFase('troca'); }} activeOpacity={0.85}>
          <Text style={{ fontSize: 36 }}>🔄</Text>
          <Text style={[s.acaoBtnTitulo, { color: '#f59e0b' }]}>TROCA</Text>
          <Text style={s.acaoBtnSub}>Registrar trocas realizadas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.acaoBtn, { borderColor: '#ef4444' }]} onPress={function() { setFase('recusado'); }} activeOpacity={0.85}>
          <Text style={{ fontSize: 36 }}>❌</Text>
          <Text style={[s.acaoBtnTitulo, { color: '#ef4444' }]}>RECUSADO / REENTREGA</Text>
          <Text style={s.acaoBtnSub}>Todos os sacos retornam</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── SUBTELA ENTREGUE ───────────────────────────────────────────────────────
  if (fase === 'entregue') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { borderBottomColor: 'rgba(16,185,129,0.2)' }]}>
        <TouchableOpacity onPress={function() { setFase('atendimento'); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitulo, { color: '#10b981' }]}>✅ ENTREGUE</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Controle por pedido/produto */}
        {pedidos.filter(function(p) { return String(p.order_type) === '1000' || String(p.order_type) === '1009'; }).map(function(pedido) {
          var top  = String(pedido.order_type);
          var info = TOPS[top] || TOPS['1000'];
          return (
            <View key={pedido.id} style={[s.subCard, { borderTopColor: info.cor }]}>
              <View style={[s.subCardHeader, { backgroundColor: info.bg }]}>
                <Text style={[s.subCardTitulo, { color: info.cor }]}>{info.emoji} {info.label} — NF {pedido.invoice_number}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Ref. Pedido {pedido.external_id}</Text>
              </View>
              {(pedido.order_items || []).map(function(item) {
                var key = pedido.id + '_' + item.item_type;
                var qtdPlan = parseFloat(item.qty) || 0;
                var qtdEnt  = qtdsEntregues[key] !== undefined ? qtdsEntregues[key] : qtdPlan;
                var retorno = qtdPlan - qtdEnt;
                return (
                  <View key={key} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View>
                        <Text style={{ color: '#64B4FF', fontSize: 11, fontWeight: '700' }}>{item.item_type} — {item.item_name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>Planejado: {qtdPlan} sacos</Text>
                      </View>
                      <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>{(qtdEnt * parseFloat(item.weight_unit || 0)).toFixed(0)}kg</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Entregues:</Text>
                      <ControlQtd valor={qtdEnt} max={qtdPlan} cor={info.cor} onChange={function(v) {
                        setQtdsEntregues(function(prev) { var n = Object.assign({}, prev); n[key] = v; return n; });
                      }} />
                    </View>
                    {retorno > 0 && (
                      <View style={{ marginTop: 10, backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                        <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800', marginBottom: 6 }}>↩ RETORNO: {retorno} sacos — O que fazer?</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                          {['base', 'venda_local', 'saldo'].map(function(dest) {
                            var labels = { base: 'Volta base', venda_local: 'Venda local', saldo: 'Saldo cliente' };
                            var sel = destinoRetorno[key] === dest;
                            return (
                              <TouchableOpacity key={dest}
                                style={{ flex: 1, backgroundColor: sel ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', borderWidth: sel ? 1.5 : 1, borderColor: sel ? '#ef4444' : 'rgba(255,255,255,0.12)', borderRadius: 6, padding: 6, alignItems: 'center' }}
                                onPress={function() { setDestinoRetorno(function(prev) { var n = Object.assign({}, prev); n[key] = dest; return n; }); }}>
                                <Text style={{ color: sel ? '#ef4444' : 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: sel ? '800' : '500' }}>{labels[dest]}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {destinoRetorno[key] === 'base' && (
                          <MotivosBtns motivos={MOTIVOS_RETORNO} selecionado={motivosRetorno[key]} cor="#ef4444"
                            onSelect={function(m) { setMotivosRetorno(function(prev) { var n = Object.assign({}, prev); n[key] = m; return n; }); }} />
                        )}
                        {destinoRetorno[key] === 'venda_local' && (
                          <View style={{ backgroundColor: 'rgba(100,180,255,0.08)', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: 'rgba(100,180,255,0.2)' }}>
                            <Text style={{ color: '#64B4FF', fontSize: 10 }}>💰 Analista será notificado para faturar venda local</Text>
                          </View>
                        )}
                        {destinoRetorno[key] === 'saldo' && (
                          <View style={{ backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }}>
                            <Text style={{ color: '#a78bfa', fontSize: 10 }}>🔗 Saldo vinculado ao Pedido {pedido.external_id} • NF {pedido.invoice_number}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Fotos */}
        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>📸 FOTOS DA ENTREGA</Text>
          <FotoBtn foto={fotos.nf}      onPress={function() { tirarFoto('nf'); }}      label="NOTA FISCAL"  obrigatorio={true}  />
          <FotoBtn foto={fotos.canhoto} onPress={function() { tirarFoto('canhoto'); }} label="CANHOTO"      obrigatorio={true}  />
          <FotoBtn foto={fotos.outros}  onPress={function() { tirarFoto('outros'); }}  label="OUTROS"       obrigatorio={false} />
        </View>

        {/* Observações */}
        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>📝 OBSERVAÇÕES</Text>
          <TextInput style={s.obsInput} value={obs} onChangeText={setObs} placeholder="Observações opcionais..." placeholderTextColor="rgba(255,255,255,0.25)" multiline />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão fixo */}
      <View style={s.footerBtn}>
        <TouchableOpacity
          style={[s.btnConfirmar, { backgroundColor: (fotos.nf && fotos.canhoto) ? '#10b981' : 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10b981' }]}
          onPress={finalizarEntrega} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#001020" /> : <Text style={[s.btnConfirmarTxt, { color: (fotos.nf && fotos.canhoto) ? '#001020' : 'rgba(16,185,129,0.5)' }]}>✅ CONFIRMAR ENTREGA</Text>}
        </TouchableOpacity>
        {(!fotos.nf || !fotos.canhoto) && (
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 6 }}>
            {!fotos.nf ? 'Foto da NF obrigatória' : 'Foto do Canhoto obrigatória'}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );

  // ── SUBTELA TROCA ─────────────────────────────────────────────────────────
  if (fase === 'troca') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { borderBottomColor: 'rgba(245,158,11,0.2)' }]}>
        <TouchableOpacity onPress={function() { setFase('atendimento'); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitulo, { color: '#f59e0b' }]}>🔄 TROCA</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={[s.subCard, { borderColor: 'rgba(245,158,11,0.2)', marginTop: 14 }]}>
          <Text style={{ color: '#f59e0b', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 }}>⚖️ REGRA: O QUE SAI DEVE VOLTAR</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Registre exatamente quantos sacos foram trocados.</Text>
        </View>

        {pedidos.filter(function(p) { return String(p.order_type) === '1007'; }).map(function(pedido) {
          return (
            <View key={pedido.id} style={[s.subCard, { borderTopColor: '#f59e0b', borderTopWidth: 3 }]}>
              <View style={[s.subCardHeader, { backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                <Text style={[s.subCardTitulo, { color: '#f59e0b' }]}>🔄 TROCA — NF {pedido.invoice_number}</Text>
              </View>
              {(pedido.order_items || []).map(function(item) {
                var key = pedido.id + '_' + item.item_type;
                var qtdPlan = parseFloat(item.qty) || 0;
                var qtdTroc = qtdsTrocadas[key] !== undefined ? qtdsTrocadas[key] : qtdPlan;
                var status  = statusTrocas[pedido.id] || '100';
                var naotrocados = qtdPlan - qtdTroc;
                return (
                  <View key={key} style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <View>
                        <Text style={{ color: '#64B4FF', fontSize: 11, fontWeight: '700' }}>{item.item_type} — {item.item_name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>Enviado para troca: {qtdPlan} sacos</Text>
                      </View>
                      <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>{(qtdTroc * parseFloat(item.weight_unit || 0)).toFixed(0)}kg</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Trocados:</Text>
                      <ControlQtd valor={qtdTroc} max={qtdPlan} cor="#f59e0b" onChange={function(v) {
                        setQtdsTrocadas(function(prev) { var n = Object.assign({}, prev); n[key] = v; return n; });
                        setStatusTrocas(function(prev) { var n = Object.assign({}, prev); n[pedido.id] = v === qtdPlan ? '100' : v === 0 ? 'nao_feita' : 'parcial'; return n; });
                      }} />
                    </View>
                    {/* Status */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                      {[{ k: '100', l: '100% Feita' }, { k: 'parcial', l: 'Parcial' }, { k: 'nao_feita', l: 'Não feita' }].map(function(opt) {
                        var sel = status === opt.k;
                        var cor = opt.k === '100' ? '#10b981' : opt.k === 'parcial' ? '#f59e0b' : '#ef4444';
                        return (
                          <TouchableOpacity key={opt.k} style={{ flex: 1, backgroundColor: sel ? cor + '22' : 'rgba(255,255,255,0.04)', borderWidth: sel ? 1.5 : 1, borderColor: sel ? cor : 'rgba(255,255,255,0.12)', borderRadius: 6, padding: 6, alignItems: 'center' }}
                            onPress={function() { setStatusTrocas(function(prev) { var n = Object.assign({}, prev); n[pedido.id] = opt.k; return n; }); }}>
                            <Text style={{ color: sel ? cor : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: sel ? '800' : '500' }}>{opt.l}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {(status === 'parcial' || status === 'nao_feita') && (
                      <View style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 8 }}>
                        <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800', marginBottom: 6 }}>
                          {naotrocados > 0 ? '↩ ' + naotrocados + ' não trocados — MOTIVO:' : 'MOTIVO:'}
                        </Text>
                        <MotivosBtns motivos={MOTIVOS_TROCA} selecionado={motivosTroca[key]} cor="#f59e0b"
                          onSelect={function(m) { setMotivosTroca(function(prev) { var n = Object.assign({}, prev); n[key] = m; return n; }); }} />
                      </View>
                    )}
                    {status === 'parcial' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(100,180,255,0.06)', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: 'rgba(100,180,255,0.15)' }}>
                        <Text style={{ color: '#64B4FF', fontSize: 10 }}>✍️ Cliente assinou observando {qtdTroc} de {qtdPlan} sacos</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>📸 FOTOS</Text>
          <FotoBtn foto={fotos.canhoto} onPress={function() { tirarFoto('canhoto'); }} label="CANHOTO" obrigatorio={true} cor="#f59e0b" />
          <FotoBtn foto={fotos.outros}  onPress={function() { tirarFoto('outros'); }}  label="OUTROS"  obrigatorio={false} />
        </View>

        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>📝 OBSERVAÇÕES</Text>
          <TextInput style={s.obsInput} value={obs} onChangeText={setObs} placeholder="Observações..." placeholderTextColor="rgba(255,255,255,0.25)" multiline />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={s.footerBtn}>
        <TouchableOpacity style={[s.btnConfirmar, { backgroundColor: fotos.canhoto ? '#f59e0b' : 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: '#f59e0b' }]}
          onPress={finalizarTroca} disabled={loading || !fotos.canhoto} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#001020" /> : <Text style={[s.btnConfirmarTxt, { color: fotos.canhoto ? '#001020' : 'rgba(245,158,11,0.5)' }]}>🔄 CONFIRMAR TROCA</Text>}
        </TouchableOpacity>
        {!fotos.canhoto && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 6 }}>Tire o canhoto para liberar</Text>}
      </View>
    </KeyboardAvoidingView>
  );

  // ── SUBTELA RECUSADO / REENTREGA ──────────────────────────────────────────
  if (fase === 'recusado') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { borderBottomColor: 'rgba(239,68,68,0.2)' }]}>
        <TouchableOpacity onPress={function() { setFase('atendimento'); }} style={s.backBtn}>
          <Text style={s.backBtnTxt}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitulo, { color: '#ef4444' }]}>❌ RECUSADO</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Aviso retorno total */}
        <View style={[s.subCard, { borderColor: 'rgba(239,68,68,0.3)', marginTop: 14 }]}>
          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '900', textAlign: 'center' }}>⚠️ TODOS OS SACOS RETORNAM</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 4 }}>{Math.round(totalSacos)} sacos • {Math.round(totalKg)}kg voltam para base</Text>
        </View>

        {/* Tipo */}
        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>TIPO DE OCORRÊNCIA</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: tipoRecusa === 'recusado' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', borderWidth: tipoRecusa === 'recusado' ? 2 : 1, borderColor: tipoRecusa === 'recusado' ? '#ef4444' : 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14, alignItems: 'center' }}
              onPress={function() { setTipoRecusa('recusado'); }}>
              <Text style={{ fontSize: 24 }}>❌</Text>
              <Text style={{ color: tipoRecusa === 'recusado' ? '#ef4444' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800', marginTop: 4 }}>Recusado</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>não aceita entrega</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, backgroundColor: tipoRecusa === 'reentrega' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', borderWidth: tipoRecusa === 'reentrega' ? 2 : 1, borderColor: tipoRecusa === 'reentrega' ? '#f59e0b' : 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14, alignItems: 'center' }}
              onPress={function() { setTipoRecusa('reentrega'); }}>
              <Text style={{ fontSize: 24 }}>🔄</Text>
              <Text style={{ color: tipoRecusa === 'reentrega' ? '#f59e0b' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800', marginTop: 4 }}>Reentrega</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>tenta outro dia</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Motivos */}
        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>MOTIVO OBRIGATÓRIO *</Text>
          <MotivosBtns motivos={MOTIVOS_RECUSA} selecionado={motivoRecusa} cor="#ef4444" onSelect={setMotivoRecusa} />
        </View>

        {/* Venda local */}
        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>💰 SACOS BONS? VENDA NO LOCAL</Text>
          <TouchableOpacity
            style={{ backgroundColor: vendaLocal ? 'rgba(100,180,255,0.12)' : 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderStyle: vendaLocal ? 'solid' : 'dashed', borderColor: vendaLocal ? '#64B4FF' : 'rgba(100,180,255,0.25)', borderRadius: 10, padding: 12, alignItems: 'center' }}
            onPress={function() { setVendaLocal(function(v) { return !v; }); }}>
            <Text style={{ color: vendaLocal ? '#64B4FF' : 'rgba(100,180,255,0.5)', fontSize: 12, fontWeight: '700' }}>
              {vendaLocal ? '✅ Venda local ativada — analista será notificado' : '+ Registrar venda local'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Foto e obs */}
        <View style={s.subCard}>
          <Text style={s.subSecTitulo}>📸 FOTO (opcional)</Text>
          <FotoBtn foto={fotos.outros} onPress={function() { tirarFoto('outros'); }} label="FOTO DA OCORRÊNCIA" obrigatorio={false} />
          <Text style={[s.subSecTitulo, { marginTop: 8 }]}>📝 OBSERVAÇÕES</Text>
          <TextInput style={s.obsInput} value={obs} onChangeText={setObs} placeholder="Detalhes da ocorrência..." placeholderTextColor="rgba(255,255,255,0.25)" multiline />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={s.footerBtn}>
        <TouchableOpacity style={[s.btnConfirmar, { backgroundColor: motivoRecusa ? '#ef4444' : 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#ef4444' }]}
          onPress={finalizarRecusa} disabled={loading || !motivoRecusa} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnConfirmarTxt, { color: motivoRecusa ? '#fff' : 'rgba(239,68,68,0.5)' }]}>
            {tipoRecusa === 'reentrega' ? '🔄 CONFIRMAR REENTREGA' : '❌ REGISTRAR RECUSA'}
          </Text>}
        </TouchableOpacity>
        {!motivoRecusa && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 6 }}>Selecione o motivo para continuar</Text>}
      </View>
    </KeyboardAvoidingView>
  );

  return null;
}

var s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#001020' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#000d1a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backBtn:        { padding: 4 },
  backBtnTxt:     { color: '#64B4FF', fontSize: 14, fontWeight: '600' },
  headerTitulo:   { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center', flex: 1 },
  headerEta:      { alignItems: 'flex-end' },
  etaLabel:       { color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2 },
  etaVal:         { color: '#00FFEA', fontSize: 16, fontWeight: '900' },
  scroll:         { flex: 1 },
  clienteCard:    { margin: 12, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(100,180,255,0.2)' },
  clienteNome:    { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  clienteCod:     { color: '#64B4FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  btnLigar:       { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  btnLigarTxt:    { color: '#10b981', fontSize: 9, fontWeight: '700' },
  enderecoBox:    { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, marginVertical: 10 },
  enderecoLabel:  { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  enderecoTxt:    { color: '#e8f0fe', fontSize: 13, fontWeight: '700' },
  enderecoSub:    { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  gpsCoord:       { color: 'rgba(100,180,255,0.5)', fontSize: 10, marginTop: 4, fontFamily: 'monospace' },
  kpiRow:         { flexDirection: 'row', gap: 0, marginBottom: 12 },
  kpi:            { flex: 1, alignItems: 'center', paddingVertical: 8, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' },
  kpiVal:         { fontSize: 16, fontWeight: '900' },
  kpiLbl:         { color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 2 },
  btnNavegar:     { backgroundColor: 'rgba(37,99,235,0.15)', borderWidth: 1.5, borderColor: '#2563eb', borderRadius: 10, padding: 13, alignItems: 'center' },
  btnNavegarTxt:  { color: '#60a5fa', fontSize: 14, fontWeight: '800' },
  pedidoCard:     { marginHorizontal: 12, marginBottom: 10, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 14, overflow: 'hidden', borderTopWidth: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  pedidoHeader:   { padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pedidoTop:      { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  pedidoNF:       { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
  pedidoInfo:     { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 0 },
  pedidoInfoItem: { flex: 1, alignItems: 'center' },
  pedidoInfoLabel:{ color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  pedidoInfoVal:  { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  itensTbl:       { paddingHorizontal: 12, paddingBottom: 12 },
  itensTblHeader: { flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 6 },
  itensTblLabel:  { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  itensTblRow:    { flexDirection: 'row', paddingVertical: 4, alignItems: 'center' },
  itensTblCod:    { color: '#64B4FF', fontSize: 11, fontWeight: '700' },
  itensTblNome:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  itensTblQtd:    { fontSize: 13, fontWeight: '900' },
  itensTblPeso:   { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  btnIniciar:     { backgroundColor: '#00FFEA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnIniciarTxt:  { color: '#001020', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  acaoBtn:        { backgroundColor: 'rgba(0,20,40,0.8)', borderWidth: 2, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  acaoBtnTitulo:  { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  acaoBtnSub:     { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  subCard:        { marginHorizontal: 12, marginBottom: 10, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  subCardHeader:  { padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  subCardTitulo:  { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  subSecTitulo:   { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, padding: 12, paddingBottom: 8 },
  obsInput:       { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', padding: 12, fontSize: 13, minHeight: 70, textAlignVertical: 'top', margin: 12, marginTop: 0 },
  footerBtn:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: 'rgba(0,13,26,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  btnConfirmar:   { borderRadius: 14, padding: 18, alignItems: 'center' },
  btnConfirmarTxt:{ fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
