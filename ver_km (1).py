data = open(r'C:\gelocrim-motorista\screens\RotaScreen.js', encoding='utf-8', errors='ignore').read()
idx = data.find('async function finalizarViagem')
print(data[idx:idx+600])
