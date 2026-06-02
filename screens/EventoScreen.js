import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

var NEON = { cyan: '#00FFEA', green: '#00FF88', yellow: '#FFE600', purple: '#BF5FFF', blue: '#64B4FF', bg: '#000d1a', card: '#001428' };

export default function EventoScreen(props) {
  var navigation = props.navigation;
  var navRoute   = props.route;
  var driver     = navRoute.params.driver;
  var rota       = navRoute.params.route;

  var [fase, setFase]         = useState('instrucoes');
  var [loading, setLoading]   = useState(false);
  var [gps, setGps]           = useState(null);
  var [foto, setFoto]         = useState(null);
  var [endereco, setEndereco] = useState('Obtendo localização...');

  useEffect(function() { obterGPS(); }, []); // eslint-disable-line

  async function obterGPS() {
    try {
      var perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + loc.coords.latitude + ',' + loc.coords.longitude + '&key=AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M&language=pt-BR';
      var res = await fetch(url);
      var json = await res.json();
      if (json.results && json.results[0]) setEndereco(json.results[0].formatted_address);
    } catch (e) { setEndereco('GPS indisponível'); }
  }

  async function tirarFoto() {
    var perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Câmera necessária'); return; }
    // CORREÇÃO: MediaType.Images → ['images']
    var result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1.0 });
    if (result.canceled || !result.assets || !result.assets[0]) return;
    var manip = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    setFoto(manip.uri);
  }

  async function uploadFotoEvento(uriLocal) {
    if (!uriLocal) return null;
    try {
      var response = await fetch(uriLocal);
      var blob = await response.blob();
      var caminho = rota.id + '/evento_' + Date.now() + '.jpg';
      var { error } = await supabase.storage.from('stops').upload(caminho, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) { console.log('Erro upload foto evento:', error.message); return null; }
      var { data } = supabase.storage.from('stops').getPublicUrl(caminho);
      return data.publicUrl;
    } catch (e) {
      console.log('Erro upload foto evento:', e.message);
      return null;
    }
  }

  function abrirUber() {
    Linking.openURL('uber://').catch(function() {
      Linking.openURL('https://m.uber.com/looking');
    });
  }

  async function confirmarEvento() {
    if (!foto) { Alert.alert('Foto obrigatória', 'Tire a foto do veículo estacionado no local.'); return; }
    setLoading(true);
    try {
      var agora = new Date().toISOString();
      var urlFoto = await uploadFotoEvento(foto);
      await supabase.from('routes').update({
        status:         'completed',
        completed_at:   agora,
        updated_at:     agora,
        current_lat:    gps ? gps.lat : null,
        current_lng:    gps ? gps.lng : null,
        gps_updated_at: agora,
        ...(urlFoto ? { notes: 'Foto evento: ' + urlFoto } : {}),
      }).eq('id', rota.id);
      await AsyncStorage.removeItem('gelocrim_session');
      setFase('confirmado');
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  if (fase === 'confirmado') return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
      <Text style={{ fontSize: 72, marginBottom: 20 }}>✅</Text>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>Evento Registrado!</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        Veículo registrado no local.{'\n'}Outro motorista fará o recolhimento.
      </Text>
      {gps && (
        <View style={{ backgroundColor: NEON.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0,255,234,0.2)', width: '100%', marginBottom: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>📍 LOCAL REGISTRADO</Text>
          <Text style={{ color: '#fff', fontSize: 12, lineHeight: 18 }}>{endereco}</Text>
          <Text style={{ color: 'rgba(100,180,255,0.6)', fontSize: 10, marginTop: 4, fontFamily: 'monospace' }}>
            GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
          </Text>
        </View>
      )}
      <TouchableOpacity style={[s.btnPrimario, { backgroundColor: '#000', borderWidth: 1.5, borderColor: NEON.cyan, width: '100%', marginBottom: 12 }]} onPress={abrirUber}>
        <Text style={{ color: NEON.cyan, fontWeight: '900', fontSize: 15 }}>🚗 CHAMAR UBER</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.btnPrimario, { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', width: '100%' }]}
        onPress={function() { navigation.replace('Login'); }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 14 }}>Voltar ao início</Text>
      </TouchableOpacity>
    </View>
  );

  if (fase === 'instrucoes') return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: NEON.purple, fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>🎯 EVENTO</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 2 }}>{rota.trip_number}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>👤 {driver.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2 }}>SAÍDA</Text>
          <Text style={{ color: NEON.yellow, fontSize: 20, fontWeight: '900' }}>{rota.planned_start || '07:00'}</Text>
          {rota.tempo_evento && (
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>~{rota.tempo_evento}h no local</Text>
          )}
        </View>
      </View>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', gap: 14 }}>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 2, textAlign: 'center' }}>PROCEDIMENTO DO EVENTO</Text>
        {[
          { n: '1', cor: NEON.cyan,   emoji: '🗺️', titulo: 'Navegue até o local',     sub: 'O endereço está no seu roteiro' },
          { n: '2', cor: NEON.yellow, emoji: '🅿️', titulo: 'Estacione com segurança',  sub: 'Local autorizado e seguro' },
          { n: '3', cor: NEON.purple, emoji: '📷', titulo: 'Fotografe o veículo',       sub: 'Foto obrigatória para registrar' },
          { n: '4', cor: NEON.green,  emoji: '🚗', titulo: 'Retorne de Uber',           sub: 'Outro motorista recolhe amanhã' },
        ].map(function(item) {
          return (
            <View key={item.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: NEON.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: item.cor + '33' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: item.cor + '22', borderWidth: 1.5, borderColor: item.cor, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: item.cor, fontSize: 14, fontWeight: '900' }}>{item.n}</Text>
              </View>
              <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{item.titulo}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{item.sub}</Text>
              </View>
            </View>
          );
        })}
        <TouchableOpacity style={[s.btnPrimario, { backgroundColor: NEON.purple, marginTop: 8 }]} onPress={function() { setFase('registro'); }} activeOpacity={0.85}>
          <Text style={[s.btnPrimarioTxt, { color: '#fff' }]}>🎯 CHEGUEI NO LOCAL →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={function() { setFase('instrucoes'); }} style={{ padding: 4 }}>
          <Text style={{ color: NEON.blue, fontSize: 14, fontWeight: '600' }}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={{ color: NEON.purple, fontSize: 14, fontWeight: '900' }}>🎯 REGISTRAR EVENTO</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        <View style={{ backgroundColor: NEON.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(0,255,234,0.15)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>📍 LOCAL ATUAL</Text>
          <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18 }}>{endereco}</Text>
          {gps && <Text style={{ color: 'rgba(100,180,255,0.6)', fontSize: 10, marginTop: 4, fontFamily: 'monospace' }}>GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</Text>}
          {!gps && <ActivityIndicator color={NEON.cyan} style={{ marginTop: 8 }} />}
        </View>
        <View style={{ backgroundColor: NEON.card, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(191,95,255,0.3)', overflow: 'hidden' }}>
          <View style={{ backgroundColor: 'rgba(191,95,255,0.08)', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(191,95,255,0.15)' }}>
            <Text style={{ color: NEON.purple, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>📷 FOTO DO VEÍCULO ESTACIONADO *</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>Obrigatória — registra o veículo no local do evento</Text>
          </View>
          <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={tirarFoto} activeOpacity={0.85}>
            {foto
              ? <Image source={{ uri: foto }} style={{ width: '100%', height: 200, borderRadius: 8 }} resizeMode="cover" />
              : (
                <View style={{ height: 160, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 48 }}>📷</Text>
                  <Text style={{ color: 'rgba(191,95,255,0.7)', fontSize: 13, fontWeight: '700' }}>Toque para tirar a foto</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Mostre o veículo e o local</Text>
                </View>
              )
            }
            {foto && <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700', marginTop: 8 }}>✅ Foto tirada — toque para refazer</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ backgroundColor: 'rgba(255,165,0,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,165,0,0.2)', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 20 }}>⚠️</Text>
          <Text style={{ color: 'rgba(255,165,0,0.8)', fontSize: 12, flex: 1, lineHeight: 18 }}>
            Após confirmar, a viagem será encerrada. Outro motorista fará o recolhimento amanhã.
          </Text>
        </View>
        <TouchableOpacity
          style={[s.btnPrimario, { backgroundColor: foto ? NEON.purple : 'rgba(191,95,255,0.2)', borderWidth: 1, borderColor: NEON.purple, opacity: loading ? 0.6 : 1 }]}
          onPress={confirmarEvento}
          disabled={loading || !foto}
          activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[s.btnPrimarioTxt, { color: foto ? '#fff' : 'rgba(191,95,255,0.5)' }]}>✅ CONFIRMAR E ENCERRAR EVENTO</Text>
          }
        </TouchableOpacity>
        {!foto && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center' }}>Tire a foto para liberar</Text>}
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: NEON.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#000d1a', borderBottomWidth: 1, borderBottomColor: 'rgba(191,95,255,0.15)' },
  btnPrimario:    { borderRadius: 14, padding: 18, alignItems: 'center' },
  btnPrimarioTxt: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
