import os, base64

DEST = r'C:\gelocrim-motorista\screens\AssistenteGelocrim.js'

# Imagens do avatar em base64
avatares = ['neutral','crise','sucesso','auditores','chegada','briefing','checklist']
img_dir = r'C:\gelocrim-motorista\assets\images'

CONTEUDO = '''import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Modal, ScrollView
} from 'react-native';
import * as Speech from 'expo-speech';

const AVATARES = {
  neutral:   require('../assets/images/avatar_neutral.jpg'),
  chegada:   require('../assets/images/avatar_chegada.jpg'),
  briefing:  require('../assets/images/avatar_briefing.jpg'),
  checklist: require('../assets/images/avatar_checklist.jpg'),
  auditores: require('../assets/images/avatar_auditores.jpg'),
  crise:     require('../assets/images/avatar_crise.jpg'),
  sucesso:   require('../assets/images/avatar_sucesso.jpg'),
};

function falar(texto) {
  Speech.stop();
  Speech.speak(texto, { language: 'pt-BR', pitch: 1.0, rate: 0.9 });
}

export default function AssistenteGelocrim({ estado, mensagem, visivel, onFechar }) {
  const [expandido, setExpandido] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const estadoAtual = estado || 'neutral';
  const msgAtual = mensagem || '';

  useEffect(() => {
    if (visivel) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
    }
  }, [visivel]);

  useEffect(() => {
    if (estadoAtual !== 'neutral') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [estadoAtual]);

  useEffect(() => {
    if (msgAtual && visivel) falar(msgAtual);
  }, [mensagem, visivel]);

  const corBalao = {
    neutral:'#001020', chegada:'#00BFFF', briefing:'#00FFEA',
    checklist:'#FFD700', auditores:'#BF5FFF', crise:'#FF3355', sucesso:'#00FF88',
  }[estadoAtual] || '#001020';

  if (!visivel) return null;

  if (!expandido) {
    return (
      <Animated.View style={[s.miniContainer, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={() => setExpandido(true)} activeOpacity={0.9}>
          <Animated.View style={[s.miniAvatar, { transform: [{ scale: pulseAnim }], borderColor: corBalao }]}>
            <Image source={AVATARES[estadoAtual]} style={s.miniImg} />
          </Animated.View>
          {msgAtual ? (
            <View style={[s.miniBalao, { borderColor: corBalao }]}>
              <Text style={s.miniBalaoTxt} numberOfLines={2}>{msgAtual}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Modal visible={expandido} transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.header}>
            <Text style={s.titulo}>Assistente Gelocrim</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity onPress={() => Speech.stop()} style={s.btnAcao}>
                <Text style={{ fontSize:18 }}>Mudo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setExpandido(false)} style={s.btnAcao}>
                <Text style={{ color:'#fff', fontSize:16, fontWeight:'800' }}>X</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={[s.avatarBox, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={AVATARES[estadoAtual]} style={s.avatarImg} />
          </Animated.View>

          {msgAtual ? (
            <View style={[s.balao, { borderColor: corBalao }]}>
              <Text style={[s.balaoTxt, { color: corBalao }]}>{msgAtual}</Text>
              <TouchableOpacity onPress={() => falar(msgAtual)} style={{ alignSelf:'flex-end', marginTop:6 }}>
                <Text style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Repetir</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ gap:8 }}>
            <Text style={s.acoesLabel}>ACOES RAPIDAS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { label:'Checklist', cor:'#FFD700', msg:'Confirme a nota fiscal, colete o canhoto e verifique o comodato antes de sair.' },
                { label:'Documentos', cor:'#BF5FFF', msg:'Documentos necessarios: Nota Fiscal, Canhoto, Boleto e Comodato.' },
                { label:'Ocorrencia', cor:'#FF3355', msg:'Registre a ocorrencia na tela de entrega.' },
              ].map(function(item) {
                return (
                  <TouchableOpacity key={item.label} style={[s.acaoBtn, { borderColor: item.cor }]}
                    onPress={() => falar(item.msg)}>
                    <Text style={[s.acaoTxt, { color: item.cor }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[s.acaoBtn, { borderColor:'#00FF88' }]} onPress={() => { Speech.stop(); setExpandido(false); }}>
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
  const [estado, setEstado]     = useState('neutral');
  const [mensagem, setMensagem] = useState('');
  const [visivel, setVisivel]   = useState(false);

  function mostrar(novoEstado, msg) {
    setEstado(novoEstado);
    setMensagem(msg);
    setVisivel(true);
  }

  function anunciarChegada(nome, dist, eta) {
    mostrar('chegada', 'Proxima parada: ' + nome + '. Distancia: ' + dist + ' quilometros. Previsao: ' + eta);
  }

  function anunciarBriefing(peso, notas, resumo) {
    mostrar('briefing', notas + ' nota nesta parada. Peso total: ' + peso + ' quilos. ' + resumo);
  }

  function anunciarSucesso(nome) {
    mostrar('sucesso', 'Entrega concluida com sucesso em ' + nome + '! Otimo trabalho!');
    setTimeout(() => setEstado('neutral'), 5000);
  }

  function anunciarCrise(motivo) {
    mostrar('crise', 'Ocorrencia registrada: ' + motivo + '. Torre de controle notificada.');
  }

  function anunciarInicio(nome, total) {
    mostrar('briefing', 'Bom dia ' + nome + '! Voce tem ' + total + ' entregas hoje. Vamos comecar!');
  }

  function anunciarKmInicial() {
    mostrar('checklist', 'Bom dia! Informe o quilometro inicial do veiculo para iniciarmos a operacao.');
  }

  function ocultar() { setVisivel(false); }

  return { estado, mensagem, visivel, mostrar, ocultar, anunciarChegada, anunciarBriefing, anunciarSucesso, anunciarCrise, anunciarInicio, anunciarKmInicial };
}

const s = StyleSheet.create({
  miniContainer:  { position:'absolute', bottom:100, right:12, zIndex:999, alignItems:'flex-end' },
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
'''

with open(DEST, 'w', encoding='utf-8') as f:
    f.write(CONTEUDO)

print('OK! AssistenteGelocrim.js criado!')
print('Tamanho:', os.path.getsize(DEST), 'bytes')
