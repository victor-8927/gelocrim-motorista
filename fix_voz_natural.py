DEST = r'C:\gelocrim-motorista\screens\AssistenteGelocrim.js'

with open(DEST, encoding='utf-8') as f:
    content = f.read()

# Pitch mais alto = menos grave, rate mais alto = mais rapido
content = content.replace('pitch: 0.55', 'pitch: 0.80')
content = content.replace('rate: 0.82', 'rate: 0.95')

# Tambem ajustar o fallback
content = content.replace(
    "Speech.speak(texto, { language: 'pt-BR', pitch: 0.55, rate: 0.82 })",
    "Speech.speak(texto, { language: 'pt-BR', pitch: 0.80, rate: 0.95 })"
)

with open(DEST, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK! Voz ajustada - mais natural e fluida!')
