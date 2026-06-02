path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona constante da chave e funcao de decodificacao
new_consts = """const API_URL  = 'http://11.0.1.72:8000/api/v1';
const GMAPS_KEY = 'AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';
const DEPOSITO = { latitude: -3.093544, longitude: -60.075812 };"""

content = content.replace(
    "const API_URL  = 'http://11.0.1.72:8000/api/v1';\nconst DEPOSITO = { latitude: -3.093544, longitude: -60.075812 };",
    new_consts
)

# Adiciona funcao decodePolyline e buscarRotaRuas antes do export default
decode_fn = """
function decodePolyline(encoded) {
  const poly = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

async function buscarRotaRuas(waypoints) {
  try {
    if (waypoints.length < 2) return null;
    const origem  = waypoints[0].latitude + ',' + waypoints[0].longitude;
    const destino = waypoints[waypoints.length-1].latitude + ',' + waypoints[waypoints.length-1].longitude;
    const wps = waypoints.slice(1,-1).slice(0,23).map(p => p.latitude + ',' + p.longitude).join('|');
    const url = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + origem +
      '&destination=' + destino +
      (wps ? '&waypoints=' + wps : '') +
      '&mode=driving&region=br&language=pt-BR&key=' + GMAPS_KEY;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return null;
    const pts = [];
    data.routes[0].legs.forEach(leg => leg.steps.forEach(s => pts.push(...decodePolyline(s.polyline.points))));
    return pts;
  } catch { return null; }
}

"""

content = content.replace(
    'export default function RotaScreen',
    decode_fn + 'export default function RotaScreen'
)

# Adiciona state para rotaCoords
old_state = "  const [modoLista, setModoLista] = useState(false);"
new_state = "  const [modoLista, setModoLista] = useState(false);\n  const [rotaCoords, setRotaCoords] = useState([]);"
content = content.replace(old_state, new_state)

# Adiciona chamada para buscar rota pelas ruas apos carregar stops
old_sorted = """        setStops(sorted);

        // Centraliza mapa"""
new_sorted = """        setStops(sorted);

        // Busca rota pelas ruas em background
        const waypoints = [
          DEPOSITO,
          ...sorted.map(s => ({ latitude: parseFloat(s.lat), longitude: parseFloat(s.lng) })).filter(p => p.latitude && p.longitude),
          DEPOSITO,
        ];
        buscarRotaRuas(waypoints).then(pts => {
          if (pts && pts.length > 0) setRotaCoords(pts);
        });

        // Centraliza mapa"""
content = content.replace(old_sorted, new_sorted)

# Usa rotaCoords na polyline
old_poly = """        <Polyline coordinates={rotaCoords} strokeColor="#64B4FF" strokeWidth={3} />"""
new_poly = """        {rotaCoords.length > 1 && (
          <Polyline coordinates={rotaCoords} strokeColor="#64B4FF" strokeWidth={4} lineCap="round" lineJoin="round" />
        )}"""
content = content.replace(old_poly, new_poly)

# Remove o rotaCoords antigo (linha reta)
old_linha_reta = """  const rotaCoords = [
    DEPOSITO,
    ...stops.map(s => ({ latitude: parseFloat(s.lat) || 0, longitude: parseFloat(s.lng) || 0 })).filter(p => p.latitude && p.longitude),
    DEPOSITO,
  ];"""
content = content.replace(old_linha_reta, "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Directions API adicionada!')
print('Pressione r no Expo - a rota vai aparecer pelas ruas reais de Manaus!')
