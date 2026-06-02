import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export var GPS_TASK_NAME = 'GELOCRIM_GPS_BACKGROUND';

// ─── Fila offline ─────────────────────────────────────────────────────────────
// Pontos são enfileirados localmente e enviados quando houver conexão.
var FILA_KEY = 'gelocrim_gps_fila';

async function enfileirar(ponto) {
  try {
    var raw = await AsyncStorage.getItem(FILA_KEY);
    var fila = raw ? JSON.parse(raw) : [];
    fila.push(ponto);
    // Limita a 500 pontos para não lotar o storage (~50KB)
    if (fila.length > 500) fila = fila.slice(-500);
    await AsyncStorage.setItem(FILA_KEY, JSON.stringify(fila));
  } catch (e) {}
}

async function enviarFila() {
  try {
    var raw = await AsyncStorage.getItem(FILA_KEY);
    if (!raw) return;
    var fila = JSON.parse(raw);
    if (!fila.length) return;

    var { error } = await supabase.from('route_tracking').insert(fila);
    if (!error) {
      await AsyncStorage.removeItem(FILA_KEY);
    }
  } catch (e) {}
}

// ─── Task de background ───────────────────────────────────────────────────────
// Registrada UMA VEZ — o sistema operacional Android chama automaticamente
// mesmo com tela apagada, app minimizado ou modo de economia de bateria.
TaskManager.defineTask(GPS_TASK_NAME, async function({ data, error }) {
  if (error) {
    console.warn('[GPS Task] erro:', error.message);
    return;
  }
  if (!data || !data.locations || !data.locations.length) return;

  var loc = data.locations[data.locations.length - 1];
  var { latitude, longitude, speed, heading, accuracy } = loc.coords;
  var agora = new Date().toISOString();

  // Buscar routeId salvo no AsyncStorage
  var routeId = null;
  try {
    routeId = await AsyncStorage.getItem('gelocrim_rota_ativa');
  } catch (e) {}
  if (!routeId) return;

  var ponto = {
    route_id:    routeId,
    lat:         latitude,
    lng:         longitude,
    speed:       speed != null ? Math.round(speed * 3.6) : 0, // m/s → km/h
    heading:     heading != null ? Math.round(heading) : null,
    accuracy:    accuracy != null ? Math.round(accuracy) : null,
    recorded_at: agora,
    ts:          agora,
  };

  // Tentar enviar direto; se falhar, enfileirar para retry
  try {
    var { error: insertError } = await supabase.from('route_tracking').insert(ponto);
    if (insertError) {
      await enfileirar(ponto);
    } else {
      // Aproveitar e enviar fila pendente
      await enviarFila();
    }

    // Atualizar posição atual na rota (para a Torre de Controle)
    await supabase.from('routes').update({
      current_lat:    latitude,
      current_lng:    longitude,
      gps_updated_at: agora,
    }).eq('id', routeId);

  } catch (e) {
    // Sem conexão — enfileirar
    await enfileirar(ponto);
  }
});

// ─── API pública ──────────────────────────────────────────────────────────────

export async function iniciarGPSBackground(routeId) {
  // Salvar routeId para a task acessar
  await AsyncStorage.setItem('gelocrim_rota_ativa', routeId);

  // Pedir permissão foreground
  var { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    throw new Error('Permissão de localização negada.');
  }

  // Pedir permissão background (Android 10+)
  var { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  var temBackground = bgStatus === 'granted';

  // Parar task anterior se existir
  var rodando = await Location.hasStartedLocationUpdatesAsync(GPS_TASK_NAME).catch(function() { return false; });
  if (rodando) {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  }

  // Iniciar rastreamento
  await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
    accuracy:                   Location.Accuracy.Balanced,  // equilíbrio precisão/bateria
    timeInterval:               10000,                        // mínimo 10 segundos
    distanceInterval:           50,                           // mínimo 50 metros
    deferredUpdatesInterval:    10000,
    deferredUpdatesDistance:    50,
    showsBackgroundLocationIndicator: temBackground,          // ícone de GPS na barra (iOS)
    foregroundService: temBackground ? {
      notificationTitle:  'GELOCRIM — Em rota',
      notificationBody:   'Rastreamento ativo',
      notificationColor:  '#e8521a',
    } : undefined,
    pausesUpdatesAutomatically: false,                        // nunca pausar automaticamente
  });

  console.log('[GPS] Background task iniciada. Permissão background:', temBackground);
}

export async function pararGPSBackground() {
  try {
    var rodando = await Location.hasStartedLocationUpdatesAsync(GPS_TASK_NAME).catch(function() { return false; });
    if (rodando) {
      await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
    }
    // Enviar fila pendente antes de parar
    await enviarFila();
    await AsyncStorage.removeItem('gelocrim_rota_ativa');
    console.log('[GPS] Background task parada.');
  } catch (e) {
    console.warn('[GPS] Erro ao parar task:', e.message);
  }
}

export async function posicaoAtual() {
  try {
    var { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    var loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return loc.coords;
  } catch (e) {
    return null;
  }
}
