# Criar tela AdminScreen
admin_screen = r"""import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://antsy-gloomily-query.ngrok-free.dev/api/v1';
const NEON = { cyan: '#00FFEA', green: '#00FF88', red: '#FF3355', yellow: '#FFE600', bg: '#000d1a' };

export default function AdminScreen({ navigation, route }) {
  const { token } = route.params;
  const [rotas, setRotas]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': '1'
  };

  useEffect(() => { carregarRotas(); }, []);

  async function carregarRotas() {
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_URL}/routes?date=${hoje}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRotas(data);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function fazerLogout() {
    await AsyncStorage.removeItem('fleet_token');
    await AsyncStorage.removeItem('fleet_user');
    navigation.replace('Login');
  }

  function getStatusColor(status) {
    if (status === 'executing') return NEON.green;
    if (status === 'released')  return NEON.cyan;
    if (status === 'completed') return '#666';
    return NEON.yellow;
  }

  function getStatusLabel(status) {
    const map = { executing:'Em Execucao', released:'Liberada', completed:'Concluida', optimized:'Conferida', planned:'Planejada' };
    return map[status] || status;
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={NEON.cyan} />
      <Text style={s.dimTxt}>Carregando rotas...</Text>
    </View>
  );

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
          <Text style={[s.resumoVal, {color: NEON.green}]}>
            {rotas.filter(r => r.status === 'executing').length}
          </Text>
          <Text style={s.resumoLbl}>Em execucao</Text>
        </View>
        <View style={s.resumoCard}>
          <Text style={[s.resumoVal, {color: '#666'}]}>
            {rotas.filter(r => r.status === 'completed').length}
          </Text>
          <Text style={s.resumoLbl}>Concluidas</Text>
        </View>
      </View>

      {/* Lista de rotas */}
      <ScrollView
        style={s.lista}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregarRotas(); }} tintColor={NEON.cyan} />}
      >
        {rotas.length === 0 ? (
          <View style={s.vazio}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={s.vazioTxt}>Nenhuma rota hoje</Text>
          </View>
        ) : rotas.map((rota, i) => {
          const pct = rota.total_stops > 0 ? Math.round((rota.delivered_stops||0) / rota.total_stops * 100) : 0;
          const cor = getStatusColor(rota.status);
          return (
            <View key={i} style={[s.rotaCard, {borderColor: cor}]}>
              <View style={s.rotaHeader}>
                <Text style={s.rotaTrip}>{rota.trip_number}</Text>
                <View style={[s.statusBadge, {backgroundColor: cor+'22', borderColor: cor}]}>
                  <Text style={[s.statusTxt, {color: cor}]}>{getStatusLabel(rota.status)}</Text>
                </View>
              </View>
              <Text style={s.rotaVeiculo}>{rota.vehicle_plate} — {rota.driver_name || 'Motorista'}</Text>
              <View style={s.rotaBar}>
                <View style={[s.rotaBarFill, {width: `${pct}%`, backgroundColor: cor}]}/>
              </View>
              <Text style={s.rotaPct}>{pct}% — {rota.delivered_stops||0}/{rota.total_stops} paradas</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#000d1a' },
  center:       { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000d1a' },
  dimTxt:       { color:'rgba(255,255,255,0.4)', marginTop:12 },
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, paddingTop:50, backgroundColor:'rgba(0,20,40,0.95)', borderBottomWidth:1, borderBottomColor:'rgba(0,255,234,0.15)' },
  headerTitulo: { color:'#00FFEA', fontSize:16, fontWeight:'900', letterSpacing:4 },
  headerSub:    { color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 },
  btnSair:      { backgroundColor:'rgba(255,80,80,0.15)', borderRadius:8, paddingHorizontal:16, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,80,80,0.3)' },
  btnSairTxt:   { color:'#ff5050', fontWeight:'700', fontSize:13 },
  resumoRow:    { flexDirection:'row', padding:16, gap:10 },
  resumoCard:   { flex:1, backgroundColor:'rgba(0,20,40,0.8)', borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:'rgba(0,255,234,0.1)' },
  resumoVal:    { color:'#00FFEA', fontSize:28, fontWeight:'900' },
  resumoLbl:    { color:'rgba(255,255,255,0.4)', fontSize:10, marginTop:4 },
  lista:        { flex:1, padding:16 },
  vazio:        { alignItems:'center', paddingTop:60, gap:12 },
  vazioTxt:     { color:'rgba(255,255,255,0.4)', fontSize:14 },
  rotaCard:     { backgroundColor:'rgba(0,20,40,0.8)', borderRadius:14, padding:16, marginBottom:12, borderWidth:1 },
  rotaHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  rotaTrip:     { color:'#fff', fontSize:14, fontWeight:'900' },
  statusBadge:  { borderRadius:6, paddingHorizontal:10, paddingVertical:4, borderWidth:1 },
  statusTxt:    { fontSize:10, fontWeight:'800' },
  rotaVeiculo:  { color:'rgba(255,255,255,0.45)', fontSize:11, marginBottom:10 },
  rotaBar:      { height:4, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:2, marginBottom:6 },
  rotaBarFill:  { height:4, borderRadius:2 },
  rotaPct:      { color:'rgba(255,255,255,0.35)', fontSize:10 },
});
"""

with open(r'C:\gelocrim-motorista\screens\AdminScreen.js', 'w', encoding='utf-8') as f:
    f.write(admin_screen)
print("OK - AdminScreen criada!")

# Atualizar App.js para incluir AdminScreen
app_js = open(r'C:\gelocrim-motorista\App.js', encoding='utf-8').read()

antigo = "import ResumoScreen from './screens/ResumoScreen';"
novo   = "import ResumoScreen from './screens/ResumoScreen';\nimport AdminScreen  from './screens/AdminScreen';"

app_js = app_js.replace(antigo, novo)

antigo2 = "        <Stack.Screen name=\"Resumo\"  component={ResumoScreen}  options={{ title: 'Resumo da Viagem', headerLeft: null }} />"
novo2   = """        <Stack.Screen name="Resumo"  component={ResumoScreen}  options={{ title: 'Resumo da Viagem', headerLeft: null }} />
        <Stack.Screen name="Admin"   component={AdminScreen}   options={{ headerShown: false }} />"""

app_js = app_js.replace(antigo2, novo2)

with open(r'C:\gelocrim-motorista\App.js', 'w', encoding='utf-8') as f:
    f.write(app_js)
print("OK - App.js atualizado!")

# Atualizar LoginScreen para redirecionar admin para AdminScreen
login = open(r'C:\gelocrim-motorista\screens\LoginScreen.js', encoding='utf-8').read()

antigo3 = "      navigation.replace('Rota', { token: data.access_token, user: data.user });\n    } catch (e) {\n      Alert.alert('Erro de Conexao', 'Verifique se o servidor esta online.');\n      setLoading(false);\n    }\n  }\n\n  async function handleAdminLogin()"
novo3   = "      const dest = data.user?.role === 'admin' ? 'Admin' : 'Rota';\n      navigation.replace(dest, { token: data.access_token, user: data.user });\n    } catch (e) {\n      Alert.alert('Erro de Conexao', 'Verifique se o servidor esta online.');\n      setLoading(false);\n    }\n  }\n\n  async function handleAdminLogin()"

if antigo3 in login:
    login = login.replace(antigo3, novo3)
    print("OK - motorista vai para Rota!")

antigo4 = "      setShowAdmin(false);\n      navigation.replace('Rota', { token: data.access_token, user: data.user });"
novo4   = "      setShowAdmin(false);\n      navigation.replace('Admin', { token: data.access_token, user: data.user });"

if antigo4 in login:
    login = login.replace(antigo4, novo4)
    print("OK - admin vai para AdminScreen!")

with open(r'C:\gelocrim-motorista\screens\LoginScreen.js', 'w', encoding='utf-8') as f:
    f.write(login)
print("Salvo!")
