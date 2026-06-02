import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen     from './screens/LoginScreen';
import KmInicialScreen from './screens/KmInicialScreen';
import PreViagemScreen from './screens/PreViagemScreen';
import RotaScreen      from './screens/RotaScreen';
import EntregaScreen   from './screens/EntregaScreen';
import ResumoScreen    from './screens/ResumoScreen';
import AdminScreen     from './screens/AdminScreen';
import NavegacaoScreen from './screens/NavegacaoScreen';
import EventoScreen   from './screens/EventoScreen';
import CameraScreen   from './screens/CameraScreen';

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
        <Stack.Screen name="Login"      component={LoginScreen}     options={{ headerShown: false }} />
        <Stack.Screen name="KmInicial"  component={KmInicialScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PreViagem"  component={PreViagemScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Rota"       component={RotaScreen}      options={{ headerShown: false }} />
        <Stack.Screen name="Entrega"    component={EntregaScreen}   options={{ title: 'Detalhes da Parada' }} />
        <Stack.Screen name="Resumo"     component={ResumoScreen}    options={{ title: 'Resumo da Viagem', headerLeft: null }} />
        <Stack.Screen name="Admin"      component={AdminScreen}     options={{ headerShown: false }} />
        <Stack.Screen name="Navegacao"  component={NavegacaoScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Evento"     component={EventoScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="Camera"     component={CameraScreen}    options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);
