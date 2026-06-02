f = "C:/gelocrim-motorista/screens/AssistenteGelocrim.js"
c = open(f, encoding="utf-8").read()

old = """export function useAssistente() {
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
}"""

new = """export function useAssistente() {
  const [estado, setEstado]     = useState('neutral');
  const [mensagem, setMensagem] = useState('');
  const [visivel, setVisivel]   = useState(false);
  const ultimaMsgRef            = React.useRef('');
  const ultimaDistRef           = React.useRef(null);
  const jaAnunciouInicioRef     = React.useRef(false);

  function mostrar(novoEstado, msg) {
    if (ultimaMsgRef.current === msg) return;
    ultimaMsgRef.current = msg;
    setEstado(novoEstado);
    setMensagem(msg);
    setVisivel(true);
  }

  function anunciarChegada(nome, distKm, velocidade) {
    var d = parseFloat(distKm);
    if (isNaN(d)) return;
    var limiar = velocidade > 40 ? 1.0 : 0.5;
    var ultima = ultimaDistRef.current;
    if (d <= limiar && d > 0.1 && (ultima === null || ultima > limiar)) {
      ultimaDistRef.current = d;
      mostrar('chegada', 'Atencao: ' + nome + ' a ' + Math.round(d * 1000) + ' metros.');
    } else if (d <= 0.1 && (ultima === null || ultima > 0.1)) {
      ultimaDistRef.current = d;
      mostrar('chegada', 'Chegando em ' + nome + '. Prepare o local de descarga.');
    }
  }

  function anunciarBriefing(peso, notas, resumo) {
    mostrar('briefing', notas + ' nota nesta parada. Peso total: ' + peso + ' quilos. ' + resumo);
  }

  function anunciarSucesso(nome) {
    ultimaMsgRef.current = '';
    ultimaDistRef.current = null;
    mostrar('sucesso', 'Entrega concluida em ' + nome + '! Otimo trabalho!');
    setTimeout(() => setEstado('neutral'), 5000);
  }

  function anunciarCrise(motivo) {
    ultimaMsgRef.current = '';
    mostrar('crise', 'Ocorrencia registrada: ' + motivo + '. Torre de controle notificada.');
  }

  function anunciarInicio(nome, total) {
    if (jaAnunciouInicioRef.current) return;
    jaAnunciouInicioRef.current = true;
    mostrar('briefing', nome + ', voce tem ' + total + ' entregas hoje. Boa viagem!');
  }

  function anunciarKmInicial() {
    mostrar('checklist', 'Informe o quilometro inicial do veiculo para iniciar a operacao.');
  }

  function ocultar() { setVisivel(false); }

  return { estado, mensagem, visivel, mostrar, ocultar, anunciarChegada, anunciarBriefing, anunciarSucesso, anunciarCrise, anunciarInicio, anunciarKmInicial };
}"""

c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")
