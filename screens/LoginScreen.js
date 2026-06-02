import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, ImageBackground, Animated,
  Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginMotorista, supabase } from '../services/supabase';

const { width, height } = Dimensions.get('window');

const FOTOS = [
  require('../assets/images/manaus1.jpg'),
  require('../assets/images/manaus2.jpg'),
  require('../assets/images/manaus3.jpg'),
  require('../assets/images/manaus4.jpg'),
  require('../assets/images/manaus5.jpg'),
  require('../assets/images/manaus6.jpg'),
  require('../assets/images/manaus7.jpg'),
  require('../assets/images/manaus8.jpg'),
  require('../assets/images/manaus9.jpg'),
];

function Floco({ delay, left, size, duration }) {
  var anim = useRef(new Animated.Value(-30)).current;
  var opacAnim = useRef(new Animated.Value(0)).current;
  useEffect(function() {
    var loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim, { toValue: height + 30, duration: duration, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
            Animated.timing(opacAnim, { toValue: 0, duration: duration - 500, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(anim, { toValue: -30, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return function() { loop.stop(); };
  }, []); // eslint-disable-line
  return (
    <Animated.Text style={{
      position: 'absolute', left: left, top: 0,
      fontSize: size, color: '#64B4FF',
      opacity: opacAnim, transform: [{ translateY: anim }],
    }}>{'\u2744'}</Animated.Text>
  );
}

export default function LoginScreen({ navigation }) {
  var [cpf, setCpf] = useState('');
  var [senha, setSenha] = useState('');
  var [loading, setLoading] = useState(true);
  var [focusCpf, setFocusCpf] = useState(false);
  var [focusSenha, setFocusSenha] = useState(false);
  var [fotoIdx, setFotoIdx] = useState(Math.floor(Math.random() * FOTOS.length));
  var fadeAnim = useRef(new Animated.Value(0)).current;
  var slideAnim = useRef(new Animated.Value(40)).current;

  var flocos = [
    { delay: 0,    left: width * 0.05, size: 14, duration: 7000 },
    { delay: 1500, left: width * 0.15, size: 10, duration: 8000 },
    { delay: 3000, left: width * 0.30, size: 16, duration: 6500 },
    { delay: 500,  left: width * 0.50, size: 12, duration: 9000 },
    { delay: 2000, left: width * 0.65, size: 8,  duration: 7500 },
    { delay: 4000, left: width * 0.80, size: 14, duration: 8500 },
    { delay: 1000, left: width * 0.92, size: 10, duration: 7000 },
  ];

  useEffect(function() {
    checkSavedSession();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    var interval = setInterval(function() {
      setFotoIdx(function(prev) { return (prev + 1) % FOTOS.length; });
    }, 5000);
    return function() { clearInterval(interval); };
  }, []); // eslint-disable-line

  async function checkSavedSession() {
    try {
      var raw = await AsyncStorage.getItem('gelocrim_session');
      if (!raw) { setLoading(false); return; }

      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.driver || !parsed.route) {
        await AsyncStorage.removeItem('gelocrim_session');
        setLoading(false);
        return;
      }

      // Consulta status atual no Supabase
      var res = await supabase
        .from('routes')
        .select('id, status, trip_number, km_start, stops(*)')
        .eq('id', parsed.route.id)
        .single();

      if (res.error || !res.data) {
        await AsyncStorage.removeItem('gelocrim_session');
        setLoading(false);
        return;
      }

      var statusAtual = res.data.status;
      var rotaAtual = Object.assign({}, parsed.route, res.data);

      if (statusAtual === 'planned') {
        navigation.replace('KmInicial', { driver: parsed.driver, route: rotaAtual });
        return;
      }

      if (statusAtual === 'in_progress') {
        if (rotaAtual.km_start) {
          navigation.replace('Rota', { driver: parsed.driver, route: rotaAtual });
        } else {
          navigation.replace('KmInicial', { driver: parsed.driver, route: rotaAtual });
        }
        return;
      }

      // completed ou outro — limpa sessão
      await AsyncStorage.removeItem('gelocrim_session');
    } catch (e) {
      await AsyncStorage.removeItem('gelocrim_session');
    }
    setLoading(false);
  }

  function formatCpf(text) {
    var nums = text.replace(/\D/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return nums.slice(0,3) + '.' + nums.slice(3);
    if (nums.length <= 9) return nums.slice(0,3) + '.' + nums.slice(3,6) + '.' + nums.slice(6);
    return nums.slice(0,3) + '.' + nums.slice(3,6) + '.' + nums.slice(6,9) + '-' + nums.slice(9,11);
  }

  async function handleLogin() {
    var cpfNums = cpf.replace(/\D/g, '');
    if (!cpfNums || cpfNums.length < 11) {
      Alert.alert('Atenção', 'Digite o CPF completo (11 dígitos)!');
      return;
    }
    if (!senha.trim() || senha.trim().length !== 3) {
      Alert.alert('Atenção', 'Digite os 3 últimos dígitos da viagem!');
      return;
    }
    setLoading(true);
    try {
      var result = await loginMotorista(cpf, senha.trim());
      var session = { driver: result.driver, route: result.route };
      await AsyncStorage.setItem('gelocrim_session', JSON.stringify(session));

      if (result.route.status === 'in_progress' && result.route.km_start) {
        navigation.replace('Rota', { driver: result.driver, route: result.route });
      } else {
        navigation.replace('KmInicial', { driver: result.driver, route: result.route });
      }
    } catch (e) {
      Alert.alert('Acesso Negado', e.message || 'CPF ou senha inválidos!');
      setLoading(false);
    }
  }

  if (loading) return (
    <View style={s.center}>
      <Text style={{ fontSize: 48 }}>{'\u2744\ufe0f'}</Text>
      <ActivityIndicator size="large" color="#00FFEA" style={{ marginTop: 16 }} />
      <Text style={s.dimTxt}>Verificando sessão...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={FOTOS[fotoIdx]} style={s.bg} resizeMode="cover">
        <View style={s.overlay} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {flocos.map(function(f, i) {
            return <Floco key={i} delay={f.delay} left={f.left} size={f.size} duration={f.duration} />;
          })}
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

              {/* Logo */}
              <View style={s.logoBox}>
                <View style={s.flakeBox}>
                  <Text style={s.flakeEmoji}>{'\u2744\ufe0f'}</Text>
                </View>
                <Text style={s.brand}>GELOCRIM</Text>
                <Text style={s.slogan}>PURA REFRESCÂNCIA</Text>
                <View style={s.divider} />
                <Text style={s.portal}>PORTAL DO MOTORISTA</Text>
                <Text style={s.cidade}>MANAUS — AM</Text>
              </View>

              {/* Card login */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Acesso à Operação</Text>
                <Text style={s.cardSub}>Entre com seu CPF e senha da viagem</Text>

                <Text style={s.label}>CPF DO MOTORISTA</Text>
                <TextInput
                  style={[s.input, focusCpf && s.inputFocus]}
                  placeholder="000.000.000-00"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={cpf}
                  onChangeText={function(t) { setCpf(formatCpf(t)); }}
                  keyboardType="numeric"
                  maxLength={14}
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={function() { setFocusCpf(true); }}
                  onBlur={function() { setFocusCpf(false); }}
                />

                <Text style={s.label}>SENHA DA VIAGEM (3 dígitos)</Text>
                <TextInput
                  style={[s.input, focusSenha && s.inputFocus]}
                  placeholder="Ex: 026"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={senha}
                  onChangeText={setSenha}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry={true}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={function() { setFocusSenha(true); }}
                  onBlur={function() { setFocusSenha(false); }}
                />

                <TouchableOpacity
                  style={[s.btn, loading && { opacity: 0.6 }]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color="#001020" />
                    : <Text style={s.btnTxt}>🚀 ENTRAR NA OPERAÇÃO</Text>
                  }
                </TouchableOpacity>
              </View>

              <Text style={s.version}>GELOCRIM Track v4.0</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

var s = StyleSheet.create({
  bg:         { flex: 1, width: '100%', height: '100%' },
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,10,25,0.75)' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000d1a' },
  dimTxt:     { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13 },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  content:    { alignItems: 'center' },
  logoBox:    { alignItems: 'center', marginBottom: 32 },
  flakeBox:   { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,255,234,0.1)', borderWidth: 2, borderColor: '#00FFEA', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  flakeEmoji: { fontSize: 38 },
  brand:      { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 10 },
  slogan:     { fontSize: 10, color: '#00FFEA', letterSpacing: 4, fontWeight: '600', marginTop: 6 },
  divider:    { width: 40, height: 2, backgroundColor: '#00FFEA', marginVertical: 10 },
  portal:     { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 3 },
  cidade:     { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 4 },
  card:       { width: '100%', backgroundColor: 'rgba(0,15,35,0.88)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(0,255,234,0.2)', marginBottom: 20 },
  cardTitle:  { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  cardSub:    { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 24 },
  label:      { color: '#00FFEA', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 7, marginTop: 4 },
  input:      { backgroundColor: 'rgba(0,255,234,0.05)', color: '#fff', fontSize: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 16, fontWeight: '600', borderWidth: 1.5, borderColor: 'rgba(0,255,234,0.15)' },
  inputFocus: { borderColor: '#00FFEA', backgroundColor: 'rgba(0,255,234,0.1)' },
  btn:        { backgroundColor: '#00FFEA', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnTxt:     { color: '#000d1a', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  version:    { color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 1 },
});
