import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import ImageMarker, { TextBackgroundType, Position } from 'react-native-image-marker';

var GOOGLE_KEY = 'AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';

export default function CameraScreen({ navigation, route }) {
  var tipo = route.params?.tipo || 'nf';
  var onFoto = route.params?.onFoto;

  var [permission, requestPermission] = useCameraPermissions();
  var [fotoUri, setFotoUri] = useState(null);
  var [processando, setProcessando] = useState(false);
  var [gps, setGps] = useState(null);
  var [endereco, setEndereco] = useState('Manaus, AM');
  var cameraRef = useRef(null);

  useEffect(function() {
    obterGPS();
  }, []);

  async function obterGPS() {
    try {
      var perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      try {
        var res = await fetch('https://maps.googleapis.com/maps/api/geocode/json?latlng=' + loc.coords.latitude + ',' + loc.coords.longitude + '&key=' + GOOGLE_KEY + '&language=pt-BR');
        var json = await res.json();
        if (json.results && json.results[0]) setEndereco(json.results[0].formatted_address);
      } catch(e) {}
    } catch(e) {}
  }

  async function tirar() {
    if (!cameraRef.current) return;
    try {
      setProcessando(true);
      var foto = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });

      // 1. Comprimir
      var comprimida = await ImageManipulator.manipulateAsync(
        foto.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 2. Marca d'água
      var now = new Date();
      var dataHora = now.getFullYear() + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      var gpsStr = gps ? ('GPS ' + gps.lat.toFixed(5) + ', ' + gps.lng.toFixed(5)) : '';
      var texto = endereco + '\n' + dataHora + ' | GELOCRIM IND. DE GELO LTDA.\n' + gpsStr;

      var marcada = await ImageMarker.markText({
        src: comprimida.uri,
        text: texto,
        X: 10,
        Y: 80,
        color: '#FFFFFF',
        fontName: 'Arial',
        fontSize: 18,
        shadowStyle: { dx: 2, dy: 2, radius: 4, color: '#000000' },
        textBackgroundStyle: {
          type: TextBackgroundType.none,
          paddingX: 10,
          paddingY: 8,
          color: 'rgba(0,0,0,0.65)',
        },
        position: Position.bottomLeft,
        maxWidth: 1100,
      });

      setFotoUri(typeof marcada === 'string' ? marcada : marcada.uri || comprimida.uri);
    } catch(e) {
      // Se marca d'água falhar, usa foto comprimida mesmo
      console.log('Erro marca dagua:', e.message);
      try {
        var comprimida2 = await ImageManipulator.manipulateAsync(
          cameraRef.current ? (await cameraRef.current.takePictureAsync({ quality: 0.8 })).uri : '',
          [{ resize: { width: 1200 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );
        setFotoUri(comprimida2.uri);
      } catch(e2) {}
    } finally {
      setProcessando(false);
    }
  }

  function confirmar() {
    if (onFoto && fotoUri) onFoto(tipo, fotoUri);
    navigation.goBack();
  }

  function refazer() {
    setFotoUri(null);
  }

  if (!permission) return <View style={s.center}><ActivityIndicator color="#00FFEA" size="large" /></View>;

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.txt}>Permissão de câmera necessária</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnTxt}>Permitir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { marginTop: 10, backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' }]} onPress={() => navigation.goBack()}>
          <Text style={[s.btnTxt, { color: '#ef4444' }]}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (fotoUri) {
    return (
      <View style={s.container}>
        <Image source={{ uri: fotoUri }} style={{ flex: 1 }} resizeMode="contain" />
        <View style={s.footer}>
          <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' }]} onPress={refazer}>
            <Text style={[s.btnTxt, { color: '#ef4444' }]}>🔄 Refazer</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#00FFEA', borderColor: '#00FFEA' }]} onPress={confirmar}>
            <Text style={[s.btnTxt, { color: '#001020' }]}>✓ Usar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View style={s.overlayTop}>
        <Text style={s.overlayTxt} numberOfLines={1}>{endereco}</Text>
      </View>
      {processando && (
        <View style={s.overlayCenter}>
          <ActivityIndicator color="#00FFEA" size="large" />
          <Text style={{ color: '#00FFEA', marginTop: 10 }}>Processando...</Text>
        </View>
      )}
      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.captureBtn} onPress={tirar} disabled={processando}>
          <View style={s.captureBtnInner} />
        </TouchableOpacity>
        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#000' },
  center:          { flex: 1, backgroundColor: '#001020', alignItems: 'center', justifyContent: 'center', padding: 20 },
  txt:             { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  overlayTop:      { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  overlayTxt:      { color: '#00FFEA', fontSize: 11, fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  overlayCenter:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  footer:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 40, backgroundColor: '#000' },
  captureBtn:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  cancelBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  btn:             { borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#00FFEA' },
  btnTxt:          { color: '#00FFEA', fontWeight: '900', fontSize: 14 },
});
