import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';

export default function LoginScreen({ navigation }) {
  const [cpf, setCpf]           = useState('');
  const [viagem, setViagem]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [focusCpf, setFocusCpf] = useState(false);
  const [focusVia, setFocusVia] = useState(false);

  useEffect(() => { checkSavedToken(); }, []);

  async function checkSavedToken() {
    try {
      const token = await AsyncStorage.getItem('fleet_token');
      const user  = await AsyncStorage.getItem('fleet_user');
      if (token && user) {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' }
        });
        if (res.ok) {
          navigation.replace('Rota', { token, user: JSON.parse(user) });
          return;
        }
        await AsyncStorage.removeItem('fleet_token');
        await AsyncStorage.removeItem('fleet_user');
      }
    } catch (e) {}
    setLoading(false);
  }

  function formatCpf(text) {
    // Remove tudo que nao e numero
    const nums = text.replace(/\D/g, '');
    // Formata XXX.XXX.XXX-XX
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0,3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6)}`;
    return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6,9)}-${nums.slice(9,11)}`;
  }

  async function handleLogin() {
    const cpfNums = cpf.replace(/\D/g, '');
    if (!cpfNums || cpfNums.length < 11) {
      Alert.alert('Atenção', 'Digite o CPF completo (11 dígitos)!');
      return;
    }
    if (!viagem.trim()) {
      Alert.alert('Atenção', 'Digite o número da viagem!');
      return;
    }
    setLoading(true);
    try {
      // Login usando CPF como email e numero da viagem como senha
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ 
          email: cpfNums,
          password: viagem.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok) { 
        Alert.alert('Acesso Negado', 'CPF ou número de viagem inválido!'); 
        setLoading(false); 
        return; 
      }
      await AsyncStorage.setItem('fleet_token', data.access_token);
      await AsyncStorage.setItem('fleet_user', JSON.stringify(data.user));
      navigation.replace('Rota', { token: data.access_token, user: data.user });
    } catch (e) {
      Alert.alert('Erro de Conexão', 'Verifique se o servidor está online.');
      setLoading(false);
    }
  }

  if (loading) return (
    <View style={s.center}>
      <Text style={{ fontSize: 48 }}>❄️</Text>
      <ActivityIndicator size="large" color="#00FFEA" style={{ marginTop: 16 }} />
      <Text style={s.dimTxt}>Verificando sessão...</Text>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.logoBox}>
        <View style={s.flakeBox}>
          <Text style={s.flake}>❄️</Text>
        </View>
        <Text style={s.brand}>GELOCRIM</Text>
        <Text style={s.slogan}>PURA REFRESCÂNCIA</Text>
        <View style={s.divider}/>
        <Text style={s.portal}>PORTAL DO MOTORISTA</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Acesso à Operação</Text>

        <Text style={s.label}>CPF DO MOTORISTA</Text>
        <TextInput
          style={[s.input, focusCpf && s.inputFocus]}
          placeholder="000.000.000-00"
          placeholderTextColor="#334"
          value={cpf}
          onChangeText={(t) => setCpf(formatCpf(t))}
          keyboardType="numeric"
          maxLength={14}
          autoCorrect={false}
          returnKeyType="next"
          onFocus={() => setFocusCpf(true)}
          onBlur={() => setFocusCpf(false)}
        />

        <Text style={s.label}>Nº DA VIAGEM</Text>
        <TextInput
          style={[s.input, focusVia && s.inputFocus]}
          placeholder="Informe o número da viagem"
          placeholderTextColor="#334"
          value={viagem}
          onChangeText={setViagem}
          keyboardType="default"
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          onFocus={() => setFocusVia(true)}
          onBlur={() => setFocusVia(false)}
        />

        <TouchableOpacity
          style={[s.btn, loading && {opacity:0.6}]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#001020"/>
            : <Text style={s.btnTxt}>ENTRAR NA OPERAÇÃO →</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={s.version}>GELOCRIM Track v3.1</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#000d1a' },
  content:     { flexGrow:1, justifyContent:'center', padding:28 },
  center:      { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000d1a' },
  dimTxt:      { color:'rgba(255,255,255,0.4)', marginTop:12, fontSize:13 },
  logoBox:     { alignItems:'center', marginBottom:36 },
  flakeBox:    { 
    width:80, height:80, borderRadius:40,
    backgroundColor:'rgba(0,255,234,0.08)',
    borderWidth:2, borderColor:'#00FFEA',
    alignItems:'center', justifyContent:'center', marginBottom:14,
    shadowColor:'#00FFEA', shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:12,
  },
  flake:       { fontSize:38 },
  brand:       { fontSize:36, fontWeight:'900', color:'#FFFFFF', letterSpacing:10 },
  slogan:      { fontSize:10, color:'#00FFEA', letterSpacing:4, fontWeight:'600', marginTop:6 },
  divider:     { width:40, height:2, backgroundColor:'#00FFEA', marginVertical:10 },
  portal:      { fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:3 },
  card:        { 
    backgroundColor:'rgba(0,20,40,0.95)',
    borderRadius:20, padding:24,
    borderWidth:1, borderColor:'rgba(0,255,234,0.25)',
    marginBottom:20,
    shadowColor:'#00FFEA', shadowOffset:{width:0,height:0}, shadowOpacity:0.15, shadowRadius:20,
  },
  cardTitle:   { color:'#FFFFFF', fontSize:16, fontWeight:'700', marginBottom:22, textAlign:'center' },
  label:       { color:'#00FFEA', fontSize:10, fontWeight:'700', letterSpacing:2, marginBottom:7, marginTop:4 },
  input:       { 
    backgroundColor:'rgba(0,255,234,0.04)',
    color:'#fff', fontSize:16,
    paddingVertical:14, paddingHorizontal:16,
    borderRadius:12, marginBottom:16,
    fontWeight:'600',
    borderWidth:1.5, borderColor:'rgba(0,255,234,0.15)',
  },
  inputFocus:  { 
    borderColor:'#00FFEA',
    backgroundColor:'rgba(0,255,234,0.08)',
    shadowColor:'#00FFEA', shadowOffset:{width:0,height:0}, shadowOpacity:0.5, shadowRadius:8,
  },
  btn:         { 
    backgroundColor:'#00FFEA',
    borderRadius:12, padding:16,
    alignItems:'center', marginTop:8,
    shadowColor:'#00FFEA', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12,
  },
  btnTxt:      { color:'#000d1a', fontWeight:'900', fontSize:13, letterSpacing:2 },
  version:     { textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:10, letterSpacing:1, marginBottom:20 },
});
