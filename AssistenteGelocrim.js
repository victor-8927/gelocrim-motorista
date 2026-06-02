import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, Modal, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';

var ANTHROPIC_KEY = 'ANTHROPIC_KEY_AQUI';

var AVATARES = {
  neutral:   require('../assets/images/avatar_neutral.jpg'),
  chegada:   require('../assets/images/avatar_chegada.jpg'),
  briefing:  require('../assets/images/avatar_briefing.jpg'),
  checklist: require('../assets/images/avatar_checklist.jpg'),
  auditores: require('../assets/images/avatar_auditores.jpg'),
  crise:     require('../assets/images/avatar_crise.jpg'),
  sucesso:   require('../assets/images/avatar_sucesso.jpg'),
};

// Frases educativas fixas — usadas como fallback
var FRASES = {
  inicio: [
    'Bom dia! Lembre de fotografar a NF e o canhoto em cada entrega.',
    'Boa viagem! Clique em Navegar para ver a rota até cada cliente.',
    'Antes de sair, confirme o KM inicial na tela de pré-viagem.',
  ],
  chegada500m: [
    'Chegando! Prepare a nota fiscal antes de parar.',
    'A menos de 500 metros. Procure o local de descarga.',
    'Quase lá! Verifique se os volumes estão organizados para entrega.',
  ],
  chegada100m: [
    'No destino! Tire as fotos da NF e do canhoto após entregar.',
    'Chegou! Após a entrega, clique em Confirmar Entrega no app.',
    'Portão à frente! Não esqueça de registrar a entrega no sistema.',
  ],
  sucesso: [
    'Entrega registrada! Clique em Navegar para ir ao próximo cliente.',
    'Ótimo trabalho! Próxima parada aguarda no app.',
    'Entrega confirmada no sistema. Continue assim!',
  ],
  crise: [
    'Ocorrência registrada. A central foi notificada automaticamente.',
    'Problema registrado. Continue para o próximo cliente.',
    'Anotado no sistema. Siga em frente.',
  ],
};

function fraseAleatoria(tipo) {
  var lista = FRASES[tipo] || FRASES.chegada100m;
  return lista[Math.floor(Math.random() * lista.length)];
}

async function gerarFraseIA(tipo, vars) {
  try {
    var prompts = {
      chegada500m: 'O motorista ' + (vars.motorista||'') + ' está chegando em ' + (vars.cliente||'') + ' a ' + (vars.dist||'') + ' metros. Gere UMA frase curta de chegada focada em procedimento (máx 15 palavras). Ex: "Victor, chegamos ao Nova Era. Separe o canhoto e verifique a câmara."',
      chegada100m: 'O motorista chegou ao portão de ' + (vars.cliente||'') + '. Gere UMA frase focada em conferir a quantidade de sacos e documentos (máx 15 palavras).',
      foto:        'O motorista vai tirar foto do canhoto em ' + (vars.cliente||'') + '. Gere UMA dica de qualidade de foto (máx 15 palavras). Ex: "Enquadre bem e garanta que a assinatura esteja legível."',
      rota:        'Rota atualizada. Próxima parada: ' + (vars.cliente||'') + '. Gere UMA dica de segurança ou conservação da carga (máx 15 palavras).',
      sucesso:     'Entrega concluída em ' + (vars.cliente||'') + '. Gere UMA frase motivadora sobre próximo passo no app (máx 15 palavras).',
      inicio:      'Motorista ' + (vars.motorista||'') + ' inicia rota com ' + (vars.total||'') + ' entregas em Manaus. Frase motivadora e educativa sobre o app (máx 15 palavras).',
      crise:       'Ocorrência em ' + (vars.cliente||'') + ': ' + (vars.motivo||'') + '. Frase de suporte curta para o motorista (máx 15 palavras).',
    };
    var prompt = prompts[tipo] || prompts.chegada100m;
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        system: 'Você é o assistente de voz da GELOCRIM INDUSTRIA DE GELO LTDA em Manaus. Responda APENAS com uma frase direta e educativa. Sem explicações, sem prefixos como "Resposta:" ou "Frase:". Máximo 15 palavras.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    var data = await res.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim();
    }
    return null;
  } catch(e) { return null; }
}

function falar(texto) {
  if (!texto) return;
  try {
    Speech.stop();
    Speech.speak(texto, { language: 'pt-BR', pitch: 0.75, rate: 0.90 });
  } catch(e) {}
}

export default function AssistenteGelocrim({ estado, mensagem, visivel, onFechar }) {
  var [expandido, setExpandido] = useState(false);
  var scaleAnim = useRef(new Animated.Value(0)).current;
  var pulseAnim = useRef(new Animated.Value(1)).current;
  var estadoAtual = estado || 'neutral';
  var msgAtual = mensagem || '';

  useEffect(function() {
    if (visivel) Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
  }, [visivel]);

  useEffect(function() {
    if (estadoAtual !== 'neutral') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])).start();
    } else { pulseAnim.setValue(1); }
  }, [estadoAtual]);

  useEffect(function() {
    if (msgAtual && visivel) falar(msgAtual);
  }, [mensagem, visivel]);

  var corBalao = { neutral:'#001020', chegada:'#00BFFF', briefing:'#00FFEA', checklist:'#FFD700', auditores:'#BF5FFF', crise:'#FF3355', sucesso:'#00FF88' }[estadoAtual] || '#001020';

  if (!visivel) return null;

  if (!expandido) {
    return (
      <Animated.View style={[s.miniContainer, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={function() { setExpandido(true); }} activeOpacity={0.9}>
          <Animated.View style={[s.miniAvatar, { transform: [{ scale: pulseAnim }], borderColor: corBalao }]}>
            <Image source={AVATARES[estadoAtual]} style={s.miniImg} />
          </Animated.View>
          {msgAtual ? <View style={[s.miniBalao, { borderColor: corBalao }]}><Text style={s.miniBalaoTxt} numberOfLines={2}>{msgAtual}</Text></View> : null}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Modal visible={expandido} transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.header}>
            <Text style={s.titulo}>GELOCRIM ASSIST</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity onPress={function() { Speech.stop(); }} style={s.btnAcao}><Text style={{ fontSize:18 }}>🔇</Text></TouchableOpacity>
              <TouchableOpacity onPress={function() { setExpandido(false); }} style={s.btnAcao}><Text style={{ color:'#fff', fontSize:16, fontWeight:'800' }}>✕</Text></TouchableOpacity>
            </View>
          </View>
          <Animated.View style={[s.avatarBox, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={AVATARES[estadoAtual]} style={s.avatarImg} />
          </Animated.View>
          {msgAtual ? (
            <View style={[s.balao, { borderColor: corBalao }]}>
              <Text style={[s.balaoTxt, { color: corBalao }]}>{msgAtual}</Text>
              <TouchableOpacity onPress={function() { falar(msgAtual); }} style={{ alignSelf:'flex-end', marginTop:6 }}>
                <Text style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>🔁 Repetir</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={{ gap:8 }}>
            <Text style={s.acoesLabel}>DICAS RÁPIDAS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { label:'📷 Fotos', msg:'Tire foto da NF e do canhoto em cada entrega para registrar no sistema.' },
                { label:'🗺️ Navegar', msg:'Clique em Navegar para traçar a rota até o próximo cliente.' },
                { label:'✅ Confirmar', msg:'Após entregar, clique em Confirmar Entrega para registrar no sistema.' },
                { label:'⚠️ Ocorrência', msg:'Se houver problema, use o botão de ocorrência para registrar.' },
              ].map(function(item) {
                return (
                  <TouchableOpacity key={item.label} style={[s.acaoBtn, { borderColor: '#00FFEA' }]} onPress={function() { falar(item.msg); }}>
                    <Text style={[s.acaoTxt, { color: '#00FFEA' }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[s.acaoBtn, { borderColor:'#00FF88' }]} onPress={function() { Speech.stop(); setExpandido(false); }}>
                <Text style={[s.acaoTxt, { color:'#00FF88' }]}>OK!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function useAssistente() {
  var [estado, setEstado] = useState('neutral');
  var [mensagem, setMensagem] = useState('');
  var [visivel, setVisivel] = useState(false);
  var ultimaMsgRef = useRef('');
  var ultimaDistRef = useRef(null);
  var jaAnunciouInicioRef = useRef(false);
  var chamandoIARef = useRef(false);

  function mostrar(novoEstado, msg) {
    if (ultimaMsgRef.current === msg) return;
    ultimaMsgRef.current = msg;
    setEstado(novoEstado);
    setMensagem(msg);
    setVisivel(true);
  }

  async function mostrarIA(novoEstado, tipo, vars, fallback) {
    if (chamandoIARef.current) { mostrar(novoEstado, fallback); return; }
    chamandoIARef.current = true;
    var msg = await gerarFraseIA(tipo, vars || {});
    chamandoIARef.current = false;
    mostrar(novoEstado, msg || fallback);
  }

  function anunciarChegada(nomeCliente, distKm, velocidade) {
    var d = parseFloat(distKm);
    if (isNaN(d)) return;
    var ultima = ultimaDistRef.current;

    if (d <= 0.5 && d > 0.1 && (ultima === null || ultima > 0.5)) {
      ultimaDistRef.current = d;
      mostrarIA('chegada', 'chegada500m', { motorista: 'motorista', cliente: nomeCliente, dist: Math.round(d * 1000) }, fraseAleatoria('chegada500m'));
    } else if (d <= 0.1 && (ultima === null || ultima > 0.1)) {
      ultimaDistRef.current = d;
      mostrarIA('chegada', 'chegada100m', { cliente: nomeCliente }, fraseAleatoria('chegada100m'));
    }
  }

  function anunciarInicio(nomeMotorista, totalParadas) {
    if (jaAnunciouInicioRef.current) return;
    jaAnunciouInicioRef.current = true;
    mostrarIA('briefing', 'inicio', { motorista: nomeMotorista, total: totalParadas }, fraseAleatoria('inicio'));
  }

  function anunciarSucesso(nomeCliente) {
    ultimaMsgRef.current = '';
    ultimaDistRef.current = null;
    mostrarIA('sucesso', 'sucesso', { cliente: nomeCliente }, fraseAleatoria('sucesso'));
    setTimeout(function() { setEstado('neutral'); }, 6000);
  }

  function anunciarCrise(motivo) {
    ultimaMsgRef.current = '';
    mostrarIA('crise', 'crise', { motivo: motivo }, fraseAleatoria('crise'));
  }

  function ocultar() { setVisivel(false); }

  return { estado, mensagem, visivel, mostrar, ocultar, anunciarChegada, anunciarInicio, anunciarSucesso, anunciarCrise };
}

var s = StyleSheet.create({
  miniContainer:  { position:'absolute', top:100, right:12, zIndex:999, alignItems:'flex-end' },
  miniAvatar:     { width:68, height:68, borderRadius:34, overflow:'hidden', borderWidth:3, elevation:10 },
  miniImg:        { width:'100%', height:'100%' },
  miniBalao:      { maxWidth:190, backgroundColor:'rgba(0,10,25,0.97)', borderRadius:12, padding:8, marginBottom:6, borderWidth:1.5 },
  miniBalaoTxt:   { color:'#fff', fontSize:11, fontWeight:'600', lineHeight:16 },
  overlay:        { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'flex-end' },
  box:            { backgroundColor:'#000d1a', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom:40, borderWidth:1.5, borderColor:'rgba(0,255,234,0.25)', gap:14 },
  header:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  titulo:         { color:'#00FFEA', fontSize:14, fontWeight:'900', letterSpacing:2 },
  btnAcao:        { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  avatarBox:      { alignItems:'center' },
  avatarImg:      { width:160, height:160, borderRadius:20, borderWidth:2.5, borderColor:'#00FFEA' },
  balao:          { backgroundColor:'rgba(0,20,40,0.95)', borderRadius:16, padding:16, borderWidth:1.5 },
  balaoTxt:       { fontSize:14, fontWeight:'700', lineHeight:22 },
  acoesLabel:     { color:'rgba(255,255,255,0.3)', fontSize:10, fontWeight:'800', letterSpacing:2 },
  acaoBtn:        { alignItems:'center', backgroundColor:'rgba(0,20,40,0.8)', borderRadius:12, padding:12, marginRight:8, borderWidth:1.5, minWidth:80 },
  acaoTxt:        { fontSize:12, fontWeight:'700' },
});
