path = r'C:\fleet-cloud\gelocrim_v1.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona JS para autorizar viagem
new_js = '''
// ── AUTORIZAR VIAGEM ─────────────────────────────────────────────
async function autorizarViagem(routeId, vehiclePlate) {
  if (!confirm(`Autorizar viagem do veiculo ${vehiclePlate}?\\nO sistema vai calcular a margem financeira.`)) return;

  try {
    const res  = await api('POST', `/routes/${routeId}/autorizar`);
    const fin  = res.financeiro;
    const emoji = fin.semaforo === 'verde' ? '🟢' : fin.semaforo === 'amarelo' ? '🟡' : '🔴';
    const cor   = fin.semaforo === 'verde' ? '#16a34a' : fin.semaforo === 'amarelo' ? '#d97706' : '#dc2626';

    // Modal com resultado financeiro
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="text-align:center;margin-bottom:16px">
          <span style="font-size:48px">${emoji}</span>
          <div style="font-size:20px;font-weight:800;color:${cor};margin-top:8px">Margem: ${fin.margem_pct}%</div>
          <div style="font-size:13px;color:#888">${fin.semaforo === 'verde' ? 'Viagem lucrativa' : fin.semaforo === 'amarelo' ? 'Margem baixa' : 'Margem negativa'}</div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px;font-size:13px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#888">Receita Bruta</span><span style="font-weight:600">R$ ${fin.receita_bruta.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#888">ICMS + PIS/COFINS</span><span style="color:#dc2626">- R$ ${(fin.icms + fin.pis_cofins).toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#888">Receita Líquida</span><span style="font-weight:600">R$ ${fin.receita_liquida.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#888">Equipe</span><span style="color:#dc2626">- R$ ${fin.custo_equipe.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#888">Diesel (${fin.litros_diesel}L)</span><span style="color:#dc2626">- R$ ${fin.custo_diesel.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#888">VDA</span><span style="color:#dc2626">- R$ ${fin.custo_vda.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px">
            <span style="font-weight:700">Lucro</span>
            <span style="font-weight:800;color:${fin.lucro >= 0 ? '#16a34a' : '#dc2626'}">R$ ${fin.lucro.toFixed(2)}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="this.closest('[style*=fixed]').remove()"
            style="flex:1;padding:12px;border:2px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-weight:600">
            Cancelar
          </button>
          <button onclick="confirmarAutorizacao('${routeId}', '${vehiclePlate}', this)"
            style="flex:1;padding:12px;background:${cor};color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700">
            ✅ Confirmar Liberação
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

  } catch(e) {
    toast('Erro ao autorizar: ' + e.message, 'error');
  }
}

async function confirmarAutorizacao(routeId, placa, btn) {
  btn.closest('[style*=fixed]').remove();
  toast(`🚛 Viagem ${placa} autorizada! Motorista pode iniciar.`, 'success');
  loadRoutes();
  loadTorreControle && loadTorreControle();
}
'''

# Injeta JS
last_script = content.rfind('</script>')
if last_script != -1 and 'autorizarViagem' not in content:
    content = content[:last_script] + new_js + '\n' + content[last_script:]
    print('JS autorizarViagem adicionado!')

# Adiciona botao Autorizar na lista de rotas
# Procura o padrao do card de rota na secao de rotas
old_badge = '''<span class="badge ${r.status}">${r.status}</span>'''
new_badge = '''<span class="badge ${r.status}">${r.status}</span>
              ${r.status === 'optimized' ? `<button onclick="autorizarViagem('${r.route_id}','${r.vehicle_plate}')" style="margin-left:8px;background:#16a34a;color:#fff;border:none;padding:3px 10px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600">✅ Autorizar</button>` : ''}
              ${r.status === 'released' ? `<span style="margin-left:8px;background:#2563eb;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600">🔵 Liberada</span>` : ''}'''

content = content.replace(old_badge, new_badge)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Botao Autorizar Viagem adicionado no HTML!')
print('Faca Ctrl+Shift+R no navegador.')
