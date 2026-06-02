data = open(r'C:\gelocrim-motorista\screens\RotaScreen.js', encoding='utf-8', errors='ignore').read()
idx = data.find('setRouteCoords')
print(data[max(0,idx-100):idx+300])
