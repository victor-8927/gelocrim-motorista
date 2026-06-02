DEST = r'C:\gelocrim-motorista\screens\AssistenteGelocrim.js'

with open(DEST, encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "Speech.speak(texto, { language: 'pt-BR', pitch: 1.0, rate: 0.9 })",
    "Speech.speak(texto, { language: 'pt-BR', pitch: 0.6, rate: 0.85 })"
)

with open(DEST, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK! Voz masculina aplicada!')
