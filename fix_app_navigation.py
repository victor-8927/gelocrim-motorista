# App.js com ResumoScreen
app_js = r"""import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen  from './screens/LoginScreen';
import RotaScreen   from './screens/RotaScreen';
import EntregaScreen from './screens/EntregaScreen';
import ResumoScreen from './screens/ResumoScreen';

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#001020" />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#001020', borderBottomColor: '#1e3a5c', borderBottomWidth: 1 },
          headerTintColor: '#00BFFF',
          headerTitleStyle: { fontWeight: '800', letterSpacing: 1 },
        }}
      >
        <Stack.Screen name="Login"   component={LoginScreen}   options={{ headerShown: false }} />
        <Stack.Screen name="Rota"    component={RotaScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="Entrega" component={EntregaScreen} options={{ title: 'Detalhes da Parada' }} />
        <Stack.Screen name="Resumo"  component={ResumoScreen}  options={{ title: 'Resumo da Viagem', headerLeft: null }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);
"""

with open(r'C:\gelocrim-motorista\App.js', 'w', encoding='utf-8') as f:
    f.write(app_js)
print('App.js atualizado com ResumoScreen!')

# Atualiza RotaScreen - botão finalizar agora vai para ResumoScreen
with open(r'C:\gelocrim-motorista\screens\RotaScreen.js', 'r', encoding='utf-8') as f:
    rota = f.read()

# Substitui função finalizarViagem
old = """  async function finalizarViagem() {
    Alert.alert('KM Final', 'Informe o KM final:', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', onPress: async () => {
        await fetch(`${API_URL}/routes/${rotaInfo.route_id}/finalizar`, { method: 'POST', headers });
        Alert.alert('🏁 Viagem Finalizada!', '', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      }}
    ]);
  }"""

new = """  async function finalizarViagem() {
    Alert.alert('Finalizar Viagem', 'Confirma que chegou à fábrica?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim, chegei!', onPress: () => {
        navigation.navigate('Resumo', {
          token,
          routeId: rotaInfo.route_id,
          stops,
          kmInicial
        });
      }}
    ]);
  }"""

if old in rota:
    rota = rota.replace(old, new)
    with open(r'C:\gelocrim-motorista\screens\RotaScreen.js', 'w', encoding='utf-8') as f:
        f.write(rota)
    print('RotaScreen.js atualizado - finalizar vai para ResumoScreen!')
else:
    print('Padrão finalizarViagem não encontrado!')
