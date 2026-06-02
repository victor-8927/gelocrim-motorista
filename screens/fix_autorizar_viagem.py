path = r'C:\fleet-cloud\app\routers\routes.py'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoints = '''

@router.post("/{route_id}/autorizar")
def autorizar_viagem(route_id: str, db=Depends(get_db)):
    """Calcula margem e autoriza viagem — muda status para released"""
    from app.db_compat import now_str
    ts = now_str()

    # Busca dados da rota
    rota = db.execute(text("""
        SELECT r.*, v.capacity_kg, v.avg_consumption_km_l
        FROM routes r
        LEFT JOIN vehicles v ON v.id = r.vehicle_id
        WHERE r.id = :id
    """), {"id": route_id}).fetchone()

    if not rota:
        from fastapi import HTTPException
        raise HTTPException(404, "Rota nao encontrada")

    # Busca pedidos da rota
    pedidos = db.execute(text("""
        SELECT o.weight_kg,
               COALESCE((SELECT SUM(oi.vlr_total) FROM order_items oi WHERE oi.order_id = o.id), o.weight_kg * 2) as vlr_total,
               COALESCE((SELECT SUM(oi.vlr_icms) FROM order_items oi WHERE oi.order_id = o.id), 0) as vlr_icms
        FROM stops s
        JOIN orders o ON o.id = s.order_id
        WHERE s.route_id = :rid
    """), {"rid": route_id}).fetchall()

    # Calculo financeiro
    receita_bruta = sum(float(p.vlr_total or 0) for p in pedidos)
    icms          = sum(float(p.vlr_icms or 0) for p in pedidos)
    pis_cofins    = receita_bruta * 0.0365  # PIS 0.65% + COFINS 3%
    receita_liq   = receita_bruta - icms - pis_cofins

    # Custo equipe (motorista + 2 ajudantes)
    custo_motorista  = 150.0
    custo_ajudante1  = 80.0
    custo_ajudante2  = 80.0
    custo_equipe     = custo_motorista + custo_ajudante1 + custo_ajudante2

    # Custo diesel
    distancia_km     = float(rota.total_distance_km or 50)
    consumo_medio    = float(rota.avg_consumption_km_l or 4.0)  # km/l
    preco_diesel     = 6.50  # R$/litro
    litros_usados    = distancia_km / consumo_medio
    custo_diesel     = litros_usados * preco_diesel

    # Custo VDA (depreciacao + manutencao)
    custo_vda_km     = 0.85  # R$/km
    custo_vda        = distancia_km * custo_vda_km

    # Total custos e margem
    custo_total      = custo_equipe + custo_diesel + custo_vda
    lucro            = receita_liq - custo_total
    margem_pct       = (lucro / receita_bruta * 100) if receita_bruta > 0 else 0

    # Semaforo
    if margem_pct >= 20:
        semaforo = "verde"
    elif margem_pct >= 10:
        semaforo = "amarelo"
    else:
        semaforo = "vermelho"

    # Atualiza status para released
    db.execute(text("""
        UPDATE routes SET
            status = 'released',
            updated_at = :ts
        WHERE id = :id
    """), {"ts": ts, "id": route_id})
    db.commit()

    return {
        "ok": True,
        "route_id": route_id,
        "status": "released",
        "financeiro": {
            "receita_bruta": round(receita_bruta, 2),
            "icms": round(icms, 2),
            "pis_cofins": round(pis_cofins, 2),
            "receita_liquida": round(receita_liq, 2),
            "custo_equipe": round(custo_equipe, 2),
            "custo_diesel": round(custo_diesel, 2),
            "custo_vda": round(custo_vda, 2),
            "custo_total": round(custo_total, 2),
            "lucro": round(lucro, 2),
            "margem_pct": round(margem_pct, 1),
            "semaforo": semaforo,
            "litros_diesel": round(litros_usados, 1),
        }
    }


@router.post("/{route_id}/iniciar")
def iniciar_viagem(route_id: str, db=Depends(get_db)):
    """Motorista inicia a viagem — muda status para executing"""
    from app.db_compat import now_str
    db.execute(text("UPDATE routes SET status='executing', updated_at=:ts WHERE id=:id"),
               {"ts": now_str(), "id": route_id})
    db.commit()
    return {"ok": True, "status": "executing"}


@router.post("/{route_id}/finalizar")
def finalizar_viagem(route_id: str, db=Depends(get_db)):
    """Motorista finaliza a viagem — muda status para done"""
    from app.db_compat import now_str
    db.execute(text("UPDATE routes SET status='done', updated_at=:ts WHERE id=:id"),
               {"ts": now_str(), "id": route_id})
    db.commit()
    return {"ok": True, "status": "done"}
'''

if '/autorizar' not in content:
    content = content + new_endpoints
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Endpoints autorizar/iniciar/finalizar adicionados!')
else:
    print('Endpoints ja existem!')

print('Reinicie a API!')
