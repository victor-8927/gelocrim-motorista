import os

# ── 1. LoginScreen com Refresh Token ─────────────────────────
login = r"""import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, AsyncStorage
} from 'react-native';
import AsyncStoragePkg from '@react-native-async-storage/async-storage';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';
const Storage = AsyncStoragePkg;

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Verifica token salvo — login persistente
    checkSavedToken();
  }, []);

  async function checkSavedToken() {
    try {
      const token = await Storage.getItem('fleet_token');
      const user  = await Storage.getItem('fleet_user');
      if (token && user) {
        // Valida token no servidor
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' }
        });
        if (res.ok) {
          navigation.replace('Rota', { token, user: JSON.parse(user) });
          return;
        }
        // Token expirado — limpa
        await Storage.removeItem('fleet_token');
        await Storage.removeItem('fleet_user');
      }
    } catch (e) {}
    setLoading(false);
  }

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Atenção', 'Preencha email e senha!'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Erro', data.detail || 'Login inválido!'); setLoading(false); return; }
      // Salva token persistente
      await Storage.setItem('fleet_token', data.access_token);
      await Storage.setItem('fleet_user', JSON.stringify(data.user));
      navigation.replace('Rota', { token: data.access_token, user: data.user });
    } catch (e) {
      Alert.alert('Erro de Conexão', 'Verifique se o servidor está online.');
      setLoading(false);
    }
  }

  if (loading) return (
    <View style={s.center}>
      <Text style={{ fontSize: 48 }}>❄</Text>
      <ActivityIndicator size="large" color="#00BFFF" style={{ marginTop: 16 }} />
      <Text style={s.dimTxt}>Verificando sessão...</Text>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.logoBox}>
        <View style={s.flakeBox}><Text style={s.flake}>❄</Text></View>
        <Text style={s.brand}>GELOCRIM</Text>
        <Text style={s.slogan}>PURA REFRESCÂNCIA</Text>
        <View style={s.divider}/>
        <Text style={s.portal}>PORTAL DO MOTORISTA</Text>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Acesso à Operação</Text>
        <Text style={s.label}>E-MAIL</Text>
        <TextInput style={s.input} placeholder="seu@email.com" placeholderTextColor="#555"
          value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" autoCorrect={false} returnKeyType="next"/>
        <Text style={s.label}>SENHA</Text>
        <TextInput style={s.input} placeholder="senha" placeholderTextColor="#555"
          value={password} onChangeText={setPassword} secureTextEntry
          returnKeyType="done" onSubmitEditing={handleLogin}/>
        <TouchableOpacity style={[s.btn, loading && {opacity:0.6}]}
          onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#001020"/> :
            <Text style={s.btnTxt}>ENTRAR NA OPERAÇÃO →</Text>}
        </TouchableOpacity>
      </View>
      <Text style={s.version}>GELOCRIM Track v3.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#001020' },
  content: { flexGrow:1, justifyContent:'center', padding:28 },
  center: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#001020' },
  dimTxt: { color:'rgba(255,255,255,0.4)', marginTop:12, fontSize:13 },
  logoBox: { alignItems:'center', marginBottom:32 },
  flakeBox: { width:70, height:70, borderRadius:35, backgroundColor:'rgba(0,191,255,0.1)', borderWidth:1, borderColor:'rgba(0,191,255,0.3)', alignItems:'center', justifyContent:'center', marginBottom:12 },
  flake: { fontSize:34, color:'#00BFFF' },
  brand: { fontSize:34, fontWeight:'900', color:'#FFFFFF', letterSpacing:10 },
  slogan: { fontSize:10, color:'#00BFFF', letterSpacing:4, fontWeight:'600', marginTop:5 },
  divider: { width:36, height:2, backgroundColor:'#00BFFF', marginVertical:10 },
  portal: { fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:3 },
  card: { backgroundColor:'rgba(0,30,60,0.9)', borderRadius:20, padding:22, borderWidth:1, borderColor:'rgba(0,191,255,0.2)', marginBottom:20 },
  cardTitle: { color:'#FFFFFF', fontSize:16, fontWeight:'700', marginBottom:20, textAlign:'center' },
  label: { color:'#00BFFF', fontSize:10, fontWeight:'700', letterSpacing:2, marginBottom:7, marginTop:4 },
  input: { backgroundColor:'rgba(0,191,255,0.08)', color:'#fff', fontSize:15, paddingVertical:13, paddingHorizontal:16, borderRadius:12, marginBottom:14, fontWeight:'600', borderWidth:1, borderColor:'rgba(0,191,255,0.2)' },
  btn: { backgroundColor:'#00BFFF', borderRadius:12, padding:15, alignItems:'center', marginTop:6 },
  btnTxt: { color:'#001020', fontWeight:'900', fontSize:13, letterSpacing:2 },
  version: { textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:10, letterSpacing:1, marginBottom:20 },
});
"""

# ── 2. ResumoScreen — tela de debriefing final ──────────────
resumo = r"""import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import AsyncStoragePkg from '@react-native-async-storage/async-storage';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';
const Storage = AsyncStoragePkg;

function TecladoKM({ valor, onChange }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={s.grid}>
      {keys.map((k,i) => (
        <TouchableOpacity key={i} style={[s.key, !k && s.keyVazio]}
          onPress={()=>{ if(!k) return; if(k==='⌫') onChange(valor.slice(0,-1)); else onChange(valor+k); }}
          activeOpacity={k?0.7:1}>
          <Text style={s.keyTxt}>{k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ResumoScreen({ navigation, route }) {
  const { token, routeId, stops, kmInicial } = route.params;
  const [kmFinal, setKmFinal]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [fase, setFase]         = useState('km'); // km | resumo

  const completadas = stops.filter(s => s.status === 'completed').length;
  const falhas      = stops.filter(s => s.status === 'failed').length;
  const reentregas  = stops.filter(s => s.status === 'reentrega').length;
  const pesoTotal   = stops.filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (parseFloat(s.weight_kg)||0), 0);
  const kmRodados   = kmFinal && kmInicial ? parseInt(kmFinal) - parseInt(kmInicial) : 0;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': '1'
  };

  async function confirmarKmFinal() {
    if (!kmFinal || kmFinal.length < 4) {
      Alert.alert('KM inválido', 'Informe o KM final correto.'); return;
    }
    if (parseInt(kmFinal) <= parseInt(kmInicial||0)) {
      Alert.alert('KM inválido', 'KM final deve ser maior que o inicial.'); return;
    }
    setFase('resumo');
  }

  async function encerrarViagem() {
    setLoading(true);
    try {
      await fetch(`${API_URL}/routes/${routeId}/finalizar`, {
        method: 'POST', headers,
        body: JSON.stringify({ km_final: parseInt(kmFinal) })
      });
      // Limpa token para forçar novo login amanhã
      await Storage.removeItem('fleet_token');
      await Storage.removeItem('fleet_user');
      Alert.alert('🏁 Viagem Encerrada!', 'Boa noite! Obrigado pela dedicação.', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  if (fase === 'km') return (
    <View style={[s.container, { justifyContent:'flex-start', paddingTop:60 }]}>
      <Text style={{ fontSize:36, textAlign:'center' }}>🏁</Text>
      <Text style={s.titulo}>KM Final do Veículo</Text>
      <Text style={s.sub}>Você chegou à fábrica!{'\n'}Informe o KM final para encerrar.</Text>
      <View style={s.kmDisplay}>
        <Text style={s.kmValor}>{kmFinal || '_ _ _ _ _'}</Text>
        <Text style={s.kmUnidade}>km</Text>
      </View>
      {kmInicial && <Text style={s.kmSub}>KM Inicial: {kmInicial}</Text>}
      <TecladoKM valor={kmFinal} onChange={setKmFinal}/>
      <TouchableOpacity
        style={[s.btnPrimario, { opacity: kmFinal.length>=4?1:0.4, marginTop:24 }]}
        onPress={confirmarKmFinal} disabled={kmFinal.length<4}>
        <Text style={s.btnPrimarioTxt}>VER RESUMO DA VIAGEM →</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding:20, paddingBottom:40 }}>
      <Text style={s.titulo}>📊 Resumo da Viagem</Text>
      <Text style={[s.sub, { marginBottom:20 }]}>Revise os dados antes do fechamento</Text>

      {/* KPIs */}
      <View style={s.kpiGrid}>
        {[
          ['✅', completadas, 'Entregues', '#00FF88'],
          ['❌', falhas,      'Falhas',    '#FF3355'],
          ['🟡', reentregas,  'Reentregas','#FFD700'],
          ['🚛', kmRodados+'km', 'Rodados','#00BFFF'],
          ['⚖️', pesoTotal.toFixed(0)+'kg', 'Entregue','#a78bfa'],
          ['📍', stops.length, 'Paradas', '#90afd4'],
        ].map(([ico,val,lbl,cor])=>(
          <View key={lbl} style={[s.kpi, {borderColor:cor+'44'}]}>
            <Text style={{fontSize:22}}>{ico}</Text>
            <Text style={[s.kpiVal,{color:cor}]}>{val}</Text>
            <Text style={s.kpiLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* KM */}
      <View style={s.kmCard}>
        <Text style={s.kmCardTitulo}>🛣️ HODÔMETRO</Text>
        <View style={{flexDirection:'row',justifyContent:'space-around'}}>
          <View style={{alignItems:'center'}}>
            <Text style={s.kmCardVal}>{kmInicial}</Text>
            <Text style={s.kmCardLbl}>KM Inicial</Text>
          </View>
          <Text style={{color:'#00BFFF',fontSize:24,alignSelf:'center'}}>→</Text>
          <View style={{alignItems:'center'}}>
            <Text style={[s.kmCardVal,{color:'#00FF88'}]}>{kmFinal}</Text>
            <Text style={s.kmCardLbl}>KM Final</Text>
          </View>
          <View style={{alignItems:'center'}}>
            <Text style={[s.kmCardVal,{color:'#FFD700'}]}>{kmRodados}</Text>
            <Text style={s.kmCardLbl}>KM Rodados</Text>
          </View>
        </View>
      </View>

      {/* Lista de paradas */}
      <View style={s.listaCard}>
        <Text style={s.kmCardTitulo}>📋 PARADAS</Text>
        {stops.map((stop,i)=>{
          const cor = stop.status==='completed'?'#00FF88':stop.status==='failed'?'#FF3355':'#FFD700';
          const ico = stop.status==='completed'?'✅':stop.status==='failed'?'❌':'🟡';
          return (
            <View key={i} style={[s.stopRow,{borderLeftColor:cor}]}>
              <Text style={[s.stopNum,{color:cor}]}>{(stop.sequence||0)+1}</Text>
              <View style={{flex:1}}>
                <Text style={s.stopNome} numberOfLines={1}>{stop.recipient_name}</Text>
                <Text style={s.stopSub}>{ico} {stop.status} {stop.failure_reason?'· '+stop.failure_reason:''}</Text>
              </View>
              <Text style={{color:cor,fontSize:12,fontWeight:'700'}}>{(stop.weight_kg||0).toFixed(0)}kg</Text>
            </View>
          );
        })}
      </View>

      {/* Botão encerrar */}
      <TouchableOpacity
        style={[s.btnEncerrar, loading&&{opacity:0.6}]}
        onPress={encerrarViagem} disabled={loading}>
        {loading ? <ActivityIndicator color="#001020"/> :
          <Text style={s.btnEncerrarTxt}>🏁 CONFIRMAR E ENCERRAR VIAGEM</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={{padding:14,alignItems:'center'}} onPress={()=>setFase('km')}>
        <Text style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>← Corrigir KM Final</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#001020',padding:20},
  titulo:{color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',marginTop:16},
  sub:{color:'rgba(255,255,255,0.45)',fontSize:13,textAlign:'center',marginTop:8,lineHeight:20},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16,width:'100%'},
  key:{width:'30%',aspectRatio:1.8,backgroundColor:'rgba(0,191,255,0.1)',borderRadius:12,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(0,191,255,0.2)'},
  keyVazio:{backgroundColor:'transparent',borderColor:'transparent'},
  keyTxt:{color:'#fff',fontSize:26,fontWeight:'700'},
  kmDisplay:{marginTop:20,backgroundColor:'rgba(0,191,255,0.08)',borderRadius:16,paddingHorizontal:32,paddingVertical:16,borderWidth:1,borderColor:'rgba(0,191,255,0.3)',flexDirection:'row',alignItems:'baseline',gap:8,width:'90%',justifyContent:'center'},
  kmValor:{color:'#00BFFF',fontSize:38,fontWeight:'900',letterSpacing:6},
  kmUnidade:{color:'rgba(0,191,255,0.5)',fontSize:16,fontWeight:'600'},
  kmSub:{color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:6},
  btnPrimario:{backgroundColor:'#00BFFF',borderRadius:14,padding:16,paddingHorizontal:28,alignItems:'center',width:'90%'},
  btnPrimarioTxt:{color:'#001020',fontWeight:'900',fontSize:14,letterSpacing:1},
  kpiGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},
  kpi:{width:'30%',flexGrow:1,backgroundColor:'rgba(0,30,60,0.8)',borderRadius:12,padding:12,alignItems:'center',borderWidth:1},
  kpiVal:{fontSize:20,fontWeight:'900',marginTop:4},
  kpiLbl:{color:'rgba(255,255,255,0.4)',fontSize:10,marginTop:2},
  kmCard:{backgroundColor:'rgba(0,30,60,0.8)',borderRadius:12,padding:16,marginBottom:16,borderWidth:1,borderColor:'rgba(0,191,255,0.2)'},
  kmCardTitulo:{color:'#00BFFF',fontSize:10,fontWeight:'800',letterSpacing:2,marginBottom:12},
  kmCardVal:{color:'#fff',fontSize:22,fontWeight:'900'},
  kmCardLbl:{color:'rgba(255,255,255,0.4)',fontSize:10,marginTop:2},
  listaCard:{backgroundColor:'rgba(0,30,60,0.8)',borderRadius:12,padding:16,marginBottom:16,borderWidth:1,borderColor:'rgba(0,191,255,0.15)'},
  stopRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.05)',borderLeftWidth:3,paddingLeft:10,marginLeft:-10},
  stopNum:{width:20,fontWeight:'900',fontSize:12},
  stopNome:{color:'#fff',fontSize:12,fontWeight:'700'},
  stopSub:{color:'rgba(255,255,255,0.4)',fontSize:10,marginTop:1},
  btnEncerrar:{backgroundColor:'#00FF88',borderRadius:14,padding:18,alignItems:'center',marginBottom:8},
  btnEncerrarTxt:{color:'#001020',fontWeight:'900',fontSize:15,letterSpacing:1},
});
"""

os.makedirs(r'C:\gelocrim-motorista\screens', exist_ok=True)

with open(r'C:\gelocrim-motorista\screens\LoginScreen.js', 'w', encoding='utf-8') as f:
    f.write(login)
print('LoginScreen.js atualizado com Refresh Token!')

with open(r'C:\gelocrim-motorista\screens\ResumoScreen.js', 'w', encoding='utf-8') as f:
    f.write(resumo)
print('ResumoScreen.js criado!')
