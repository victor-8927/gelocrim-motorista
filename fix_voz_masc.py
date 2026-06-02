DEST = r'C:\gelocrim-motorista\screens\AssistenteGelocrim.js'

with open(DEST, encoding='utf-8') as f:
    content = f.read()

# Substituir a funcao falar para usar voz masculina
OLD = """function falar(texto) {
  Speech.stop();
  Speech.speak(texto, { language: 'pt-BR', pitch: 0.6, rate: 0.85 });
}"""

NEW = """async function falar(texto) {
  try {
    Speech.stop();
    // Buscar vozes disponiveis e preferir masculina
    const vozes = await Speech.getAvailableVoicesAsync();
    // Vozes masculinas brasileiras comuns no Android
    const masculinas = vozes.filter(function(v) {
      const id = (v.identifier || v.name || '').toLowerCase();
      const lang = (v.language || '').toLowerCase();
      const isBR = lang.includes('pt-br') || lang.includes('pt_br') || lang.includes('por');
      const isMasc = id.includes('male') || id.includes('masc') || id.includes('_m_') || id.includes('-m-') || id.includes('luciano') || id.includes('ricardo') || id.includes('carlos');
      return isBR && isMasc;
    });
    // Se nao encontrar masculina, pegar qualquer voz pt-BR
    const vozBR = vozes.filter(function(v) {
      const lang = (v.language || '').toLowerCase();
      return lang.includes('pt-br') || lang.includes('pt_br');
    });
    const voz = masculinas[0] || null;
    const opts = {
      language: 'pt-BR',
      pitch: 0.55,
      rate: 0.82,
    };
    if (voz) opts.voice = voz.identifier;
    Speech.speak(texto, opts);
  } catch(e) {
    Speech.speak(texto, { language: 'pt-BR', pitch: 0.55, rate: 0.82 });
  }
}"""

if OLD in content:
    content = content.replace(OLD, NEW)
    print("OK! Voz masculina forcada!")
else:
    # Tentar substituicao mais simples
    content = content.replace(
        "Speech.speak(texto, { language: 'pt-BR', pitch: 0.6, rate: 0.85 })",
        "Speech.speak(texto, { language: 'pt-BR', pitch: 0.55, rate: 0.82 })"
    )
    print("OK! Pitch ajustado para mais grave!")

with open(DEST, 'w', encoding='utf-8') as f:
    f.write(content)
