import { createClient } from '@supabase/supabase-js';

var SUPABASE_URL     = 'https://wziprddrflgpzankofad.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aXByZGRyZmxncHphbmtvZmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDMyNjMsImV4cCI6MjA5NDExOTI2M30.hWrdRYH6M6Voii8uo3MmJB8BKNZOOWRhjls7DFg4pcs';
var STORAGE_BUCKET   = 'stops';

export var supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── HORA MANAUS ─────────────────────────────────────────────────────────────
function agora() { return new Date().toISOString(); }
function hojeManaus() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export var loginMotorista = async function(cpf, senha) {
  var cpfNums = cpf.replace(/\D/g, '');
  if (!cpfNums || cpfNums.length < 11) throw new Error('CPF inválido');

  var res1 = await supabase.from('drivers').select('*').eq('cpf', cpfNums).single();
  if (res1.error || !res1.data) throw new Error('CPF não encontrado');
  var driver = res1.data;

  var hoje  = hojeManaus();
  var ontem = new Date(Date.now() - 4*60*60*1000 - 86400000).toISOString().slice(0, 10);
  var amanha = new Date(Date.now() - 4*60*60*1000 + 86400000).toISOString().slice(0, 10);

  var res2 = await supabase
    .from('routes')
    .select('*, stops(*)')
    .eq('driver_id', driver.id)
    .in('status', ['planned', 'in_progress'])
    .in('route_date', [ontem, hoje, amanha]);

  if (res2.error || !res2.data || res2.data.length === 0) {
    throw new Error('Nenhuma viagem liberada para hoje');
  }

  var senhaLimpa = String(senha).replace(/\D/g, '').trim();
  var route = null;
  for (var i = 0; i < res2.data.length; i++) {
    var r = res2.data[i];
    var ultimos3 = String(r.trip_number || '').replace(/\D/g, '').slice(-3);
    if (ultimos3 === senhaLimpa) { route = r; break; }
  }
  if (!route) throw new Error('Senha incorreta. Use os 3 últimos dígitos da viagem.');

  if (route.stops) {
    route.stops = route.stops.sort(function(a, b) { return (a.sequence||0) - (b.sequence||0); });
  }
  return { driver: driver, route: route };
};

// ─── ROTAS ────────────────────────────────────────────────────────────────────
export var getRouteWithStops = async function(routeId) {
  var res = await supabase.from('routes').select('*, stops(*)').eq('id', routeId).single();
  if (res.error) throw res.error;
  var stops = (res.data.stops || []).sort(function(a, b) { return (a.sequence||0) - (b.sequence||0); });
  return Object.assign({}, res.data, { stops: stops });
};

export var updateRouteStatus = async function(routeId, status, extras) {
  var updates = Object.assign({ status: status, updated_at: agora() }, extras || {});
  var res = await supabase.from('routes').update(updates).eq('id', routeId);
  if (res.error) throw res.error;
};

// ─── GPS ──────────────────────────────────────────────────────────────────────
export var updateGPSMotorista = async function(routeId, lat, lng) {
  // Atualiza posição atual na rota
  await supabase.from('routes').update({
    current_lat: lat,
    current_lng: lng,
    gps_updated_at: agora(),
  }).eq('id', routeId);

  // Registra log de GPS
  await supabase.from('gps_logs').insert({
    route_id: routeId,
    lat: lat,
    lng: lng,
    recorded_at: agora(),
  });
};

// ─── STOPS ────────────────────────────────────────────────────────────────────
export var updateStop = async function(stopId, updates) {
  var payload = Object.assign({}, updates, { updated_at: agora() });
  var res = await supabase.from('stops').update(payload).eq('stop_id', stopId).select().single();
  if (res.error) throw res.error;
  return res.data;
};

// ─── UPLOAD DE FOTO ──────────────────────────────────────────────────────────
export var uploadFotoStop = async function(stopId, tipo, uri) {
  // tipo: 'nf' | 'canhoto' | 'outros' | 'boleto' | 'ocorrencia'
  try {
    var ext       = 'jpg';
    var path      = stopId + '/' + tipo + '_' + Date.now() + '.' + ext;
    var response  = await fetch(uri);
    var blob      = await response.blob();

    var { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) throw error;

    var { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    var url = urlData.publicUrl;

    // Mapeia tipo para coluna no banco
    var coluna = {
      'nf':         'nf_url',
      'canhoto':    'canhoto_url',
      'outros':     'outros_url',
      'boleto':     'photo_boleto',
      'ocorrencia': 'ocorrencia_url',
    }[tipo] || 'outros_url';

    await supabase.from('stops').update({ [coluna]: url, updated_at: agora() }).eq('stop_id', stopId);
    return url;
  } catch (e) {
    console.warn('Erro upload foto:', e.message);
    return null;
  }
};

// ─── REGISTRAR CHEGADA ───────────────────────────────────────────────────────
export var registrarChegada = async function(stopId, lat, lng) {
  return updateStop(stopId, {
    status:                  'in_progress',
    ata:                     agora(),
    atendimento_iniciado_at: agora(),
    lat_ata:                 lat || null,
    lng_ata:                 lng || null,
  });
};

// ─── REGISTRAR ENTREGA ───────────────────────────────────────────────────────
export var registrarEntrega = async function(stopId, dados) {
  // dados: { tempoMin, lat, lng, obs, fotoNfUrl, fotoCanhotoUrl, fotoOutrosUrl }
  return updateStop(stopId, {
    status:                    'delivered',
    atd:                       agora(),
    atendimento_finalizado_at: agora(),
    tempo_atendimento_min:     dados.tempoMin    || null,
    lat_atd:                   dados.lat         || null,
    lng_atd:                   dados.lng         || null,
    notes:                     dados.obs         || null,
    nf_url:                    dados.fotoNfUrl   || null,
    canhoto_url:               dados.fotoCanhotoUrl || null,
    outros_url:                dados.fotoOutrosUrl  || null,
  });
};

// ─── REGISTRAR RECUSA ────────────────────────────────────────────────────────
export var registrarRecusa = async function(stopId, dados) {
  // dados: { motivo, tempoMin, lat, lng, obs, fotoUrl, vendaLocal, codparcVendaLocal }
  return updateStop(stopId, {
    status:                    'failed',
    atd:                       agora(),
    atendimento_finalizado_at: agora(),
    tempo_atendimento_min:     dados.tempoMin || null,
    failure_reason:            dados.motivo   || null,
    lat_atd:                   dados.lat      || null,
    lng_atd:                   dados.lng      || null,
    notes:                     dados.obs      || null,
    ocorrencia_url:            dados.fotoUrl  || null,
    venda_local:               dados.vendaLocal || false,
    codparc_venda_local:       dados.codparcVendaLocal || null,
  });
};

// ─── REGISTRAR REENTREGA ─────────────────────────────────────────────────────
export var registrarReentrega = async function(stopId, dados) {
  return updateStop(stopId, {
    status:                    'rescheduled',
    atd:                       agora(),
    atendimento_finalizado_at: agora(),
    tempo_atendimento_min:     dados.tempoMin || null,
    failure_reason:            dados.motivo   || null,
    lat_atd:                   dados.lat      || null,
    lng_atd:                   dados.lng      || null,
    notes:                     dados.obs      || null,
    ocorrencia_url:            dados.fotoUrl  || null,
    venda_local:               dados.vendaLocal || false,
    codparc_venda_local:       dados.codparcVendaLocal || null,
  });
};

// ─── REGISTRAR TROCA ─────────────────────────────────────────────────────────
export var registrarTroca = async function(stopId, dados) {
  // dados: { tempoMin, lat, lng, obs, fotoCanhotoUrl, fotoOutrosUrl }
  return updateStop(stopId, {
    status:                    'delivered',
    atd:                       agora(),
    atendimento_finalizado_at: agora(),
    tempo_atendimento_min:     dados.tempoMin       || null,
    lat_atd:                   dados.lat            || null,
    lng_atd:                   dados.lng            || null,
    notes:                     dados.obs            || null,
    canhoto_url:               dados.fotoCanhotoUrl || null,
    outros_url:                dados.fotoOutrosUrl  || null,
  });
};

// ─── SALVAR STOP ITEMS (quantidades por produto) ─────────────────────────────
export var salvarStopItems = async function(stopId, items) {
  // items: [{ order_id, order_item_id, item_name, item_type, top_app,
  //           qty_planejada, qty_entregue, qty_devolvida, qty_trocada,
  //           motivo_devolucao, destino_retorno, status_troca,
  //           invoice_number, weight_unit }]
  if (!items || items.length === 0) return;

  // Apagar items antigos deste stop
  await supabase.from('stop_items').delete().eq('stop_id', stopId);

  // Inserir novos
  var rows = items.map(function(item) {
    return Object.assign({}, item, {
      stop_id:    stopId,
      created_at: agora(),
      updated_at: agora(),
    });
  });

  var res = await supabase.from('stop_items').insert(rows);
  if (res.error) throw res.error;
  return res.data;
};

// ─── REGISTRAR OCORRÊNCIA ────────────────────────────────────────────────────
export var registrarOcorrencia = async function(dados) {
  // dados: { route_id, stop_id, tipo, descricao, lat, lng, fotoUrl }
  var res = await supabase.from('ocorrencias_sistema').insert({
    route_id:    dados.route_id   || null,
    stop_id:     dados.stop_id    || null,
    tipo:        dados.tipo       || 'geral',
    descricao:   dados.descricao  || null,
    lat:         dados.lat        || null,
    lng:         dados.lng        || null,
    foto_url:    dados.fotoUrl    || null,
    created_at:  agora(),
  });
  if (res.error) console.warn('Erro ocorrência:', res.error.message);
};

// ─── ENCERRAR VIAGEM ─────────────────────────────────────────────────────────
export var encerrarViagem = async function(routeId, kmFinal) {
  var now = agora();
  var res = await supabase.from('routes').update({
    status:           'completed',
    km_end:           parseInt(kmFinal),
    completed_at:     now,
    updated_at:       now,
    checklist_pending: true,
  }).eq('id', routeId);
  if (res.error) throw res.error;
  return true;
};
