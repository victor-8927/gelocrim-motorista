path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Renomeia res2 para resStops onde conflita
content = content.replace(
    '      const res2 = await fetch(`${API_URL}/routes/${rota.route_id}/stops`, { headers });\n      const stopsData = await res2.json();',
    '      const resStops = await fetch(`${API_URL}/routes/${rota.route_id}/stops`, { headers });\n      const stopsData = await resStops.json();'
)

# Tambem renomeia rotas1/rotas2 para evitar conflitos
content = content.replace(
    'const [res1, res2] = await Promise.all([',
    'const [resHoje, resOntem] = await Promise.all(['
)
content = content.replace(
    'const [rotas1, rotas2] = await Promise.all([res1.json(), res2.json()]);',
    'const [rotas1, rotas2] = await Promise.all([resHoje.json(), resOntem.json()]);'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Erro corrigido! Pressione r no Expo.')
