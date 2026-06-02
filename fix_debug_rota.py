path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona debug na funcao carregarRota
old_load = '''    try {
      const res   = await fetch(`${API_URL}/routes?date=${hoje}`, { headers });
      const rotas = await res.json();
      const validas = rotas.filter(r => r.status === 'released' || r.status === 'executing');
      if (!validas || validas.length === 0) { setSemRota(true); setLoading(false); return; }'''

new_load = '''    try {
      console.log('Buscando rotas para:', hoje);
      console.log('Token:', token ? token.slice(0,20) + '...' : 'NULO');
      const res   = await fetch(`${API_URL}/routes?date=${hoje}`, { headers });
      console.log('Status HTTP:', res.status);
      const rotas = await res.json();
      console.log('Rotas recebidas:', JSON.stringify(rotas).slice(0,200));
      const validas = rotas.filter(r => r.status === 'released' || r.status === 'executing');
      console.log('Rotas validas:', validas.length);
      if (!validas || validas.length === 0) { setSemRota(true); setLoading(false); return; }'''

if old_load in content:
    content = content.replace(old_load, new_load)
    print('Debug adicionado!')
else:
    print('Padrao nao encontrado!')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Pressione r no Expo e depois j para ver os logs!')
