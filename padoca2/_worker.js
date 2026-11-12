// ============================================================
// PADOCA DISK PIZZAS - Cloudflare Pages Worker
// Roteamento por host + API + persistência em KV
// ============================================================

const CARDAPPIO = [
  { id: 1, categoria: "mais-pedidas", nome: "01 Mussarela", preco: 55.00, ingredientes: "Mussarela, tomate, orégano e azeitonas." },
  { id: 2, categoria: "mais-pedidas", nome: "02 Calabresa", preco: 55.00, ingredientes: "Mussarela, calabresa, cebola roxa, orégano e azeitonas." },
  { id: 3, categoria: "mais-pedidas", nome: "03 Marguerita", preco: 55.00, ingredientes: "Mussarela, parmesão, tomate, manjericão, orégano e azeitonas." },
  { id: 4, categoria: "mais-pedidas", nome: "04 Presunto", preco: 55.00, ingredientes: "Mussarela, presunto, tomate, orégano e azeitonas." },
  { id: 5, categoria: "mais-pedidas", nome: "05 Frango c/ Catupiry", preco: 60.00, ingredientes: "Mussarela, frango, Catupiry, orégano e azeitonas." },
  { id: 6, categoria: "mais-pedidas", nome: "06 Frango Bacon", preco: 64.00, ingredientes: "Mussarela, frango, bacon, Catupiry, orégano e azeitonas." },
  { id: 8, categoria: "tradicionais", nome: "07 Provolombo", preco: 64.00, ingredientes: "Mussarela, lombo, provolone, Catupiry, orégano e azeitonas." },
  { id: 9, categoria: "tradicionais", nome: "08 Portuguesa", preco: 60.00, ingredientes: "Mussarela, presunto, ervilha, palmito, ovo, tomate, orégano e azeitonas." },
  { id: 10, categoria: "tradicionais", nome: "09 Palmito", preco: 60.00, ingredientes: "Mussarela, palmito, Catupiry, orégano e azeitonas." },
  { id: 11, categoria: "tradicionais", nome: "10 Tropical", preco: 60.00, ingredientes: "Mussarela, frango, milho verde, ervilha, ovo, tomate, orégano e azeitonas." },
  { id: 12, categoria: "tradicionais", nome: "11 Canadense", preco: 60.00, ingredientes: "Mussarela, lombo, Catupiry, orégano e azeitonas." },
  { id: 13, categoria: "tradicionais", nome: "12 Atum", preco: 60.00, ingredientes: "Mussarela, atum, cebola roxa, orégano e azeitonas." },
  { id: 14, categoria: "tradicionais", nome: "13 Calapiry", preco: 60.00, ingredientes: "Mussarela, calabresa, Catupiry, orégano e azeitonas." },
  { id: 15, categoria: "especiais", nome: "14 Bacon", preco: 60.00, ingredientes: "Mussarela, bacon, tomate, orégano e azeitonas." },
  { id: 16, categoria: "especiais", nome: "15 Mineira", preco: 60.00, ingredientes: "Mussarela, frango, milho verde, bacon, tomate, orégano e azeitonas." },
  { id: 17, categoria: "especiais", nome: "16 Romana", preco: 60.00, ingredientes: "Mussarela, champignon, bacon, Catupiry, orégano e azeitonas." },
  { id: 18, categoria: "especiais", nome: "17 Pepperoni", preco: 60.00, ingredientes: "Mussarela, pepperoni, orégano e azeitonas." },
  { id: 20, categoria: "especiais", nome: "18 Baiana", preco: 60.00, ingredientes: "Mussarela, calabresa, cebola roxa, pimenta calabresa, orégano e azeitonas." },
  { id: 21, categoria: "especiais", nome: "19 Dois Queijos", preco: 55.00, ingredientes: "Mussarela, provolone, orégano e azeitonas." },
  { id: 22, categoria: "outros", nome: "20 Três Queijos", preco: 60.00, ingredientes: "Mussarela, provolone, parmesão, orégano e azeitonas." },
  { id: 23, categoria: "outros", nome: "21 Quatro Queijos", preco: 65.00, ingredientes: "Mussarela, provolone, parmesão, Catupiry, orégano e azeitonas." },
  { id: 24, categoria: "outros", nome: "22 Brócolis", preco: 65.00, ingredientes: "Mussarela, brócolis, bacon, alho frito, orégano e azeitonas." },
  { id: 25, categoria: "outros", nome: "23 Carne Seca", preco: 64.00, ingredientes: "Mussarela, carne seca, cebola roxa, tomate, orégano e azeitonas." },
  { id: 27, categoria: "outros", nome: "24 Americana", preco: 60.00, ingredientes: "Mussarela, presunto, bacon, tomate, cebola roxa, orégano e azeitonas." },
  { id: 28, categoria: "outros", nome: "25 Escarola", preco: 60.00, ingredientes: "Mussarela, escarola, bacon, tomate, cebola roxa, orégano e azeitonas." }
];

const SENHA_CADASTRO = "170923";
const SENHA_PAINEL = "Padoca";

function removerEmojis(texto) {
  if (typeof texto !== 'string') return texto;
  return texto.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
}
function sanitizar(texto) {
  if (typeof texto !== 'string') return texto;
  return removerEmojis(texto).replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
}

function chaveCliente(o) {
  return `${String(o.nome || '').trim().toLowerCase()}|${String(o.telefone || '').replace(/\D/g, '')}`;
}

// KV helpers
async function kvGet(env, key, fallback) {
  try {
    if (env.PADOCA_KV) {
      const v = await env.PADOCA_KV.get(key, 'json');
      return v == null ? fallback : v;
    }
  } catch (e) {}
  return fallback;
}

async function kvSet(env, key, value) {
  try {
    if (env.PADOCA_KV) {
      await env.PADOCA_KV.put(key, JSON.stringify(value));
    }
  } catch (e) {}
}

async function getSiteOnline(env) { const v = await kvGet(env, 'siteOnline', null); return v == null ? true : !!v; }
async function setSiteOnline(env, v) { await kvSet(env, 'siteOnline', !!v); }

async function getPromocao(env) { const v = await kvGet(env, 'promocao', null); return v == null ? "Ganhe uma bebida na compra de duas pizzas inteiras!" : v; }
async function setPromocao(env, t) { await kvSet(env, 'promocao', t); }

async function getIndisponiveis(env) { const v = await kvGet(env, 'indisponiveis', null); return Array.isArray(v) ? v : []; }
async function setIndisponiveis(env, v) { await kvSet(env, 'indisponiveis', v); }

async function getPedidosData(env) { const v = await kvGet(env, 'pedidos', null); if (v && Array.isArray(v.pedidos)) return v; return { pedidos: [], proximoId: 1 }; }
async function setPedidosData(env, v) { await kvSet(env, 'pedidos', v); }

async function getPushSubs(env) { const v = await kvGet(env, 'pushSubs', null); return Array.isArray(v) ? v : []; }
async function setPushSubs(env, v) { await kvSet(env, 'pushSubs', v); }

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }
  });
}

async function handleAPI(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
  }

  const getBody = async () => { try { return await request.json(); } catch (e) { return {}; } };

  // STATUS
  if (path === '/api/status' && method === 'GET') return json({ online: await getSiteOnline(env) });
  if (path === '/api/status' && method === 'POST') {
    const b = await getBody();
    await setSiteOnline(env, !!b.online);
    return json({ success: true });
  }

  // PROMOÇÃO
  if (path === '/api/promocao' && method === 'GET') return json({ texto: await getPromocao(env) });
  if (path === '/api/promocao' && method === 'POST') {
    const b = await getBody();
    await setPromocao(env, sanitizar(b.texto || ''));
    return json({ success: true });
  }

  // CARDÁPIO
  if (path === '/api/cardapio' && method === 'GET') return json(CARDAPPIO);

  // INDISPONÍVEIS
  if (path === '/api/indisponiveis' && method === 'GET') return json(await getIndisponiveis(env));
  if (path === '/api/indisponiveis/alternar' && method === 'POST') {
    const b = await getBody();
    const id = parseInt(b.id);
    if (!id) return json({ error: 'id inválido' }, 400);
    let lista = await getIndisponiveis(env);
    if (lista.includes(id)) lista = lista.filter(i => i !== id);
    else lista.push(id);
    await setIndisponiveis(env, lista);
    return json({ success: true, indisponiveis: lista });
  }

  // CADASTRO
  if (path === '/api/cadastro/verificar-senha' && method === 'POST') {
    const b = await getBody();
    if (b.senha === SENHA_CADASTRO) return json({ success: true });
    return json({ success: false }, 401);
  }
  if (path === '/api/cadastro/excluir' && method === 'POST') {
    const b = await getBody();
    const data = await getPedidosData(env);
    if (b.nome !== undefined || b.telefone !== undefined) {
      const chave = chaveCliente(b);
      data.pedidos = data.pedidos.filter(p => chaveCliente(p) !== chave);
    } else if (b.id) {
      data.pedidos = data.pedidos.filter(p => p.id !== parseInt(b.id));
    }
    await setPedidosData(env, data);
    return json({ success: true });
  }

  // PEDIDOS
  if (path === '/api/pedidos' && method === 'GET') {
    const data = await getPedidosData(env);
    return json(data.pedidos);
  }

  if (path === '/api/pedidos/novo' && method === 'POST') {
    const b = await getBody();
    const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 50).map(i => {
      i = i || {};
      return { tipo: i.tipo === 'metade' ? 'metade' : 'inteira', sabores: (Array.isArray(i.sabores) ? i.sabores : []).slice(0, 2).map(s => sanitizar(String(s))), preco: parseFloat(i.preco) || 0 };
    });
    const data = await getPedidosData(env);
    const agora = new Date();
    const novoPedido = {
      id: data.proximoId++,
      nome: sanitizar(b.nome || 'Cliente'),
      sobrenome: sanitizar(b.sobrenome || ''),
      telefone: sanitizar(b.telefone || ''),
      endereco: sanitizar(b.endereco || ''),
      detalhe: sanitizar(b.detalhe || ''),
      borda: sanitizar(b.borda || 'Sem borda'),
      extras: sanitizar(b.extras || 'Nenhum'),
      observacoes: sanitizar(b.observacoes || 'Nenhuma'),
      pagamento: sanitizar(b.pagamento || 'Pix'),
      total: parseFloat(b.total) || 0,
      tipoCadastro: b.tipoCadastro || 'simples',
      seguranca: 'Média (não analisado)',
      itens,
      status: 'pendente',
      dataHora: agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      criadoEm: agora.toISOString()
    };
    data.pedidos.push(novoPedido);
    await setPedidosData(env, data);
    return json({ success: true, pedidoId: novoPedido.id });
  }

  if (path === '/api/pedidos/status' && method === 'POST') {
    const b = await getBody();
    const data = await getPedidosData(env);
    const pedido = data.pedidos.find(p => p.id === parseInt(b.id));
    if (pedido) {
      pedido.status = b.status;
      if (b.motivoRecusa) pedido.motivoRecusa = sanitizar(b.motivoRecusa);
      await setPedidosData(env, data);
      return json({ success: true });
    }
    return json({ error: 'Não encontrado.' }, 404);
  }

  const statusMatch = path.match(/^\/api\/pedidos\/status\/(\d+)$/);
  if (statusMatch && method === 'GET') {
    const id = parseInt(statusMatch[1]);
    const data = await getPedidosData(env);
    const pedido = data.pedidos.find(p => p.id === id);
    if (pedido) return json({ status: pedido.status, motivoRecusa: pedido.motivoRecusa || '' });
    return json({ status: 'concluido' });
  }

  if (path === '/api/pedidos/concluir' && method === 'POST') {
    const b = await getBody();
    const data = await getPedidosData(env);
    const pedido = data.pedidos.find(p => p.id === parseInt(b.id));
    if (pedido) {
      pedido.status = 'concluido';
      await setPedidosData(env, data);
      return json({ success: true });
    }
    return json({ error: 'Não encontrado.' }, 404);
  }

  // DEBUG
  if (path === '/api/debug' && method === 'GET') {
    return json({ env: { hasKV: !!env.PADOCA_KV }, ok: true });
  }

  return json({ error: 'Rota não encontrada: ' + path }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = (url.hostname || '').toLowerCase();

    // Roteamento por host (subdomínio)
    if (host === 'painel.padocadiskpizza.com.br' && (url.pathname === '/' || url.pathname === '')) {
      return new Response(null, { status: 302, headers: { Location: '/painel.html' } });
    }
    if (host === 'clientes.padocadiskpizza.com.br' && (url.pathname === '/' || url.pathname === '')) {
      return new Response(null, { status: 302, headers: { Location: '/clientes.html' } });
    }
    if (host === 'site.padocadiskpizza.com.br' && (url.pathname === '/' || url.pathname === '')) {
      return new Response(null, { status: 302, headers: { Location: '/site.html' } });
    }

    // Paths curtos
    if (url.pathname === '/painel') {
      return new Response(null, { status: 302, headers: { Location: '/painel.html' } });
    }
    if (url.pathname === '/clientes') {
      return new Response(null, { status: 302, headers: { Location: '/clientes.html' } });
    }

    // API
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }

    // Arquivos estáticos (deixar o Cloudflare servir)
    return fetch(request);
  }
};