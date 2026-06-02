import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';
const NEON = { cyan:'#00FFEA', green:'#00FF88', yellow:'#FFE600', red:'#FF3355', bg:'#000d1a' };

async function salvarFilaOffline(item) {
  try {
    const raw = await AsyncStorage.getItem('fila_offline');
    const fila = raw ? JSON.parse(raw) : [];
    fila.push({ ...item, ts: Date.now() });
    await AsyncStorage.setItem('fila_offline', JSON.stringify(fila));
  } catch {}
}

export default function EntregaScreen({ navigation, route }) {
  const { stop, token, routeId, proximoStop, onStopUpdated } = route.params;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    'ngrok-skip-browser-warning': '1',
  };

  const [tela, setTela]       = useState('detalhes');
  const [fotos, setFotos]     = useState({ nf: null, boleto: null, comodato: null, outros: null });
  const [gps, setGps]         = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setGps({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch {}
    })();
  }, []);

  // ── TIRAR FOTO COM GPS NO MOMENTO EXATO ──────────────────────────────────
  async function tirarFoto(tipo) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão necessária', 'Libere o acesso à câmera.'); return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      // Captura GPS exatamente no momento da foto
      let gpsFoto = gps;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsFoto = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(gpsFoto);
      } catch {}

      const asset = { ...result.assets[0], gps: gpsFoto, ts: new Date().toISOString() };
      setFotos(prev => ({ ...prev, [tipo]: asset }));
    }
  }

  // ── NÃO ENTREGUE ─────────────────────────────────────────────────────────
  function handleNaoEntregue() {
    Alert.alert('Motivo da Não Entrega', 'Selecione o motivo:', [
      { text: 'Cliente ausente',           onPress: () => enviarFalha('Cliente ausente') },
      { text: 'Endereço não encontrado',   onPress: () => enviarFalha('Endereço não encontrado') },
      { text: 'Recusou a entrega',         onPress: () => enviarFalha('Recusou a entrega') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function enviarFalha(motivo) {
    setLoading(true);
    const payload = {
      url: `${API_URL}/routes/${routeId}/stops/${stop.stop_id}`,
      method: 'PATCH',
      body: {
        status: 'failed',
        failure_reason: motivo,
        lat_confirmacao: gps?.latitude,
        lng_confirmacao: gps?.longitude,
        ata: new Date().toISOString(),
      },
    };
    try {
      const res = await fetch(payload.url, { method: payload.method, headers, body: JSON.stringify(payload.body) });
      if (!res.ok) throw new Error();
    } catch {
      await salvarFilaOffline(payload);
    }
    if (onStopUpdated) onStopUpdated(stop.stop_id, 'failed');
    Alert.alert('Registrado', `Motivo: ${motivo}`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
    setLoading(false);
  }

  // ── CONFIRMAR ENTREGA ─────────────────────────────────────────────────────
  async function confirmarEntrega() {
    if (!fotos.nf) {
      Alert.alert('Foto obrigatória', 'A foto da NF é obrigatória para confirmar!');
      return;
    }
    setLoading(true);
    const payload = {
      url: `${API_URL}/routes/${routeId}/stops/${stop.stop_id}`,
      method: 'PATCH',
      body: {
        status: 'completed',
        ata: new Date().toISOString(),
        lat_confirmacao: fotos.nf?.gps?.latitude || gps?.latitude,
        lng_confirmacao: fotos.nf?.gps?.longitude || gps?.longitude,
        foto_nf_base64:       fotos.nf?.base64      ? `data:image/jpeg;base64,${fotos.nf.base64}`      : null,
        foto_boleto_base64:   fotos.boleto?.base64  ? `data:image/jpeg;base64,${fotos.boleto.base64}`  : null,
        foto_comodato_base64: fotos.comodato?.base64? `data:image/jpeg;base64,${fotos.comodato.base64}`: null,
        foto_outros_base64:   fotos.outros?.base64  ? `data:image/jpeg;base64,${fotos.outros.base64}`  : null,
      },
    };
    try {
      const res = await fetch(payload.url, { method: payload.method, headers, body: JSON.stringify(payload.body) });
      if (!res.ok) throw new Error();
    } catch {
      await salvarFilaOffline(payload);
    }
    if (onStopUpdated) onStopUpdated(stop.stop_id, 'completed');

    if (proximoStop) {
      Alert.alert(
        '✅ Entrega Confirmada!',
        `Próximo:\n#${(proximoStop.sequence || 0) + 1} — ${proximoStop.recipient_name}`,
        [
          {
            text: '🗺️ Abrir GPS',
            onPress: () => {
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${proximoStop.lat},${proximoStop.lng}&travelmode=driving`
              );
              navigation.goBack();
            },
          },
          { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      Alert.alert('✅ Entrega Confirmada!', 'Última parada concluída!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
    setLoading(false);
  }

  // ── TELA: DETALHES ────────────────────────────────────────────────────────
  if (tela === 'detalhes') {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.content}>

          <View style={s.clienteCard}>
            <View style={s.seq}><Text style={s.seqTxt}>{(stop.sequence || 0) + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.clienteNome} numberOfLines={2}>{stop.recipient_name}</Text>
              <Text style={s.clienteEnd}  numberOfLines={2}>{stop.address}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={s.infoBox}>
              <Text style={s.infoLbl}>PESO</Text>
              <Text style={s.infoVal}>{(stop.weight_kg || 0).toFixed(0)} kg</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoLbl}>VOLUMES</Text>
              <Text style={s.infoVal}>{stop.volumes || '--'}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoLbl}>NF</Text>
              <Text style={s.infoVal} numberOfLines={1}>{stop.invoice_number || '--'}</Text>
            </View>
          </View>

          {stop.notes ? (
            <View style={s.obsBox}>
              <Text style={s.obsLbl}>OBSERVAÇÃO</Text>
              <Text style={s.obsVal}>{stop.notes}</Text>
            </View>
          ) : null}

          <View style={s.gpsBox}>
            <Text style={s.gpsLbl}>GPS ATUAL</Text>
            <Text style={s.gpsVal}>
              {gps ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}` : 'Obtendo localização...'}
            </Text>
          </View>

          <TouchableOpacity
            style={s.btnGoogleMaps}
            onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`)}
          >
            <Text style={s.btnGoogleMapsTxt}>🗺️ ABRIR NO GOOGLE MAPS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnEntregue} onPress={() => setTela('fotos')}>
            <Text style={s.btnEntregueTxt}>✅ REGISTRAR ENTREGA</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnNaoEntregue} onPress={handleNaoEntregue} disabled={loading}>
            {loading
              ? <ActivityIndicator color={NEON.red} />
              : <Text style={s.btnNaoEntregueTxt}>✗ NÃO ENTREGUE</Text>}
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  // ── TELA: FOTOS ───────────────────────────────────────────────────────────
  const fotosDef = [
    { id: 'nf',       label: 'NOTA FISCAL',  obrig: true  },
    { id: 'boleto',   label: 'BOLETO',        obrig: false },
    { id: 'comodato', label: 'COMODATO',      obrig: false },
    { id: 'outros',   label: 'OUTROS',        obrig: false },
  ];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.fotoTitulo}>COMPROVANTE DE ENTREGA</Text>
        <Text style={s.fotoCliente} numberOfLines={1}>{stop.recipient_name}</Text>

        <View style={s.fotosGrid}>
          {fotosDef.map(f => {
            const foto = fotos[f.id];
            const ok   = !!foto;
            return (
              <TouchableOpacity
                key={f.id}
                style={[s.fotoQuadrado, ok && s.fotoQuadradoOk]}
                onPress={() => tirarFoto(f.id)}
                activeOpacity={0.8}
              >
                {ok ? (
                  <>
                    <Text style={s.fotoCheck}>✓</Text>
                    <Text style={s.fotoLabelOk}>{f.label}</Text>
                    {foto.gps && (
                      <Text style={s.fotoGps} numberOfLines={1}>
                        {foto.gps.latitude.toFixed(4)},{foto.gps.longitude.toFixed(4)}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={s.fotoIcone}>📷</Text>
                    <Text style={s.fotoLabel}>{f.label}</Text>
                    {f.obrig && <Text style={s.fotoObrig}>OBRIGATÓRIO</Text>}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.btnEntregue, { marginTop: 24, opacity: fotos.nf ? 1 : 0.45 }]}
          onPress={confirmarEntrega}
          disabled={!fotos.nf || loading}
        >
          {loading
            ? <ActivityIndicator color="#000d1a" />
            : <Text style={s.btnEntregueTxt}>✅ CONFIRMAR ENTREGA</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.btnVoltar} onPress={() => setTela('detalhes')}>
          <Text style={s.btnVoltarTxt}>← Voltar</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: NEON.bg },
  content:         { padding: 20, paddingBottom: 40 },

  // Cliente
  clienteCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(0,20,40,0.9)', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(0,255,234,0.2)' },
  seq:             { width: 44, height: 44, borderRadius: 22, backgroundColor: NEON.cyan, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  seqTxt:          { color: '#000d1a', fontWeight: '900', fontSize: 18 },
  clienteNome:     { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  clienteEnd:      { color: 'rgba(0,255,234,0.6)', fontSize: 12 },

  // Info
  infoRow:         { flexDirection: 'row', gap: 10, marginBottom: 14 },
  infoBox:         { flex: 1, backgroundColor: 'rgba(0,20,40,0.8)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,234,0.1)' },
  infoLbl:         { color: 'rgba(0,255,234,0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  infoVal:         { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Obs
  obsBox:          { backgroundColor: 'rgba(255,230,0,0.07)', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,230,0,0.2)' },
  obsLbl:          { color: NEON.yellow, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  obsVal:          { color: '#fff', fontSize: 13 },

  // GPS
  gpsBox:          { backgroundColor: 'rgba(0,255,136,0.06)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,255,136,0.15)' },
  gpsLbl:          { color: NEON.green, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  gpsVal:          { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'monospace' },

  // Botões detalhes
  btnGoogleMaps:   { backgroundColor: 'rgba(0,255,234,0.08)', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: 'rgba(0,255,234,0.3)' },
  btnGoogleMapsTxt:{ color: NEON.cyan, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  btnEntregue:     { backgroundColor: NEON.cyan, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  btnEntregueTxt:  { color: '#000d1a', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  btnNaoEntregue:  { backgroundColor: 'rgba(255,51,85,0.1)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,51,85,0.35)' },
  btnNaoEntregueTxt:{ color: NEON.red, fontWeight: '800', fontSize: 14, letterSpacing: 1 },

  // Fotos
  fotoTitulo:      { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  fotoCliente:     { color: NEON.cyan, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  fotosGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  fotoQuadrado:    { width: '47%', aspectRatio: 1, backgroundColor: 'rgba(0,30,60,0.9)', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,200,255,0.3)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 10 },
  fotoQuadradoOk:  { borderColor: NEON.green, borderStyle: 'solid', backgroundColor: 'rgba(0,255,136,0.08)' },
  fotoIcone:       { fontSize: 32, marginBottom: 8 },
  fotoLabel:       { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  fotoObrig:       { color: NEON.red, fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  fotoCheck:       { fontSize: 28, color: NEON.green, marginBottom: 4 },
  fotoLabelOk:     { color: NEON.green, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  fotoGps:         { color: 'rgba(0,255,136,0.5)', fontSize: 9, marginTop: 4, textAlign: 'center' },

  // Voltar
  btnVoltar:       { padding: 16, alignItems: 'center', marginTop: 8 },
  btnVoltarTxt:    { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
});
