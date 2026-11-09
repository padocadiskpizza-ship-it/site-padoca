const { getStore } = require('@netlify/blobs');

// ============================================================
// PADOCA DISK PIZZAS - API (Netlify Function)
// Substitui o server.js (Express) para rodar 100% no Netlify.
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

const SENHA_CADASTRO = process.env.SENHA_CADASTRO || "170923";
const SENHA_PAINEL = process.env.SENHA_PAINEL || "Padoca";

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

const fs = require('fs');
const path = require('path');

// Armazenamento híbrido: Netlify Blobs em produção, filesystem em dev local.
function useBlobs() {
  return !!(process.env.NETLIFY_BLOBS_CONTEXT || (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) || process.env.NETLIFY);
}

function fsPath(key) {
  const dir = path.join(process.cwd(), 'dados');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  return path.join(dir, key + '.json');
}

async function getJSON(key, fallback) {
  // Tenta Blobs primeiro se disponível
  if (useBlobs()) {
    try {
      const s = getStore('padoca');
      const v = await s.get(key, { type: 'json' });
      return v == null ? fallback : v;
    } catch (e) {
      // cai para filesystem
    }
  }
  try {
    const raw = fs.readFileSync(fsPath(key), 'utf8');
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}

async function setJSON(key, value) {
  if (useBlobs()) {
    try {
      const s = getStore('padoca');
      await s.setJSON(key, value);
      return;
    } catch (e) {
      // cai para filesystem
    }
  }
  try {
    const dir = path.dirname(fsPath(key));
    fs.mkdirSync(dir, { recursive: true });
    const tmp = fsPath(key) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, fsPath(key));
  } catch (e) { console.error('Falha ao salvar', key, e.message); }
}

async function getSiteOnline() {
  const v = await getJSON('siteOnline', null);
  return v == null ? true : !!v;
}
async function setSiteOnline(v) {
  await setJSON('siteOnline', !!v);
}

async function getPromocao() {
  const v = await getJSON('promocao', null);
  return v == null ? "Ganhe uma bebida na compra de duas pizzas inteiras!" : v;
}
async function setPromocao(t) {
  await setJSON('promocao', t);
}

async function getIndisponiveis() {
  const v = await getJSON('indisponiveis', null);
  return Array.isArray(v) ? v : [];
}
async function setIndisponiveis(v) {
  await setJSON('indisponiveis', v);
}

async function getPedidosData() {
  const v = await getJSON('pedidos', null);
  if (v && Array.isArray(v.pedidos)) return v;
  return { pedidos: [], proximoId: 1 };
}
async function setPedidosData(v) {
  await setJSON('pedidos', v);
}

let webpush = null;
try { webpush = require('web-push'); } catch (e) { webpush = null; }

async function getVapid() {
  let v = await getJSON('vapid', null);
  if (!v && webpush) {
    v = webpush.generateVAPIDKeys();
    await setJSON('vapid', v);
  }
  if (v && webpush) {
    try { webpush.setVapidDetails('mailto:contato@padoca.local', v.publicKey, v.privateKey); } catch (e) {}
  }
  return v;
}
async function getPushSubs() {
  const v = await getJSON('pushSubs', null);
  return Array.isArray(v) ? v : [];
}
async function setPushSubs(v) {
  await setJSON('pushSubs', v);
}

async function avisarPainelPorPush(pedido) {
  if (!webpush) return;
  const vapid = await getVapid();
  if (!vapid) return;
  const subs = await getPushSubs();
  if (subs.length === 0) return;
  const payload = JSON.stringify({
    titulo: '🍕 Novo pedido na Padoca!',
    corpo: `${pedido.nome || 'Cliente'} ${pedido.sobrenome || ''} — pedido #${pedido.id}`.trim()
  });
  const sobreviventes = [];
  for (const inscricao of subs) {
    try {
      await webpush.sendNotification(inscricao, payload);
      sobreviventes.push(inscricao);
    } catch (e) {
      if (e.statusCode !== 404 && e.statusCode !== 410) sobreviventes.push(inscricao);
    }
  }
  if (sobreviventes.length !== subs.length) {
    await setPushSubs(sobreviventes);
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  try { return event.body ? JSON.parse(event.body) : {}; } catch (e) { return {}; }
}

function getPath(event) {
  // event.path pode ser "/.netlify/functions/api/api/status" ou "/api/status"
  let p = event.path || '';
  p = p.replace(/^\/\.netlify\/functions\/api/, '');
  // também remove prefixo duplicado
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }, body: '' };
  }

  const method = event.httpMethod;
  const path = getPath(event);

  try {
    console.log('API request:', method, path);
    // ---------- STATUS ----------
    if (path === '/api/status' && method === 'GET') {
      return json(200, { online: await getSiteOnline() });
    }
    if (path === '/api/status' && method === 'POST') {
      const b = parseBody(event);
      await setSiteOnline(!!b.online);
      return json(200, { success: true });
    }

    // ---------- PROMOÇÃO ----------
    if (path === '/api/promocao' && method === 'GET') {
      return json(200, { texto: await getPromocao() });
    }
    if (path === '/api/promocao' && method === 'POST') {
      const b = parseBody(event);
      await setPromocao(sanitizar(b.texto || ''));
      return json(200, { success: true });
    }

    // ---------- CARDÁPIO ----------
    if (path === '/api/cardapio' && method === 'GET') {
      return json(200, CARDAPPIO);
    }

    // ---------- INDISPONÍVEIS ----------
    if (path === '/api/indisponiveis' && method === 'GET') {
      return json(200, await getIndisponiveis());
    }
    if (path === '/api/indisponiveis/alternar' && method === 'POST') {
      const b = parseBody(event);
      const id = parseInt(b.id);
      if (!id) return json(400, { error: 'id inválido' });
      let lista = await getIndisponiveis();
      if (lista.includes(id)) lista = lista.filter(i => i !== id);
      else lista.push(id);
      await setIndisponiveis(lista);
      return json(200, { success: true, indisponiveis: lista });
    }

    // ---------- CADASTRO ----------
    if (path === '/api/cadastro/verificar-senha' && method === 'POST') {
      const b = parseBody(event);
      if (b.senha === SENHA_CADASTRO) return json(200, { success: true });
      return json(401, { success: false });
    }
    if (path === '/api/cadastro/excluir' && method === 'POST') {
      const b = parseBody(event);
      const data = await getPedidosData();
      if (b.nome !== undefined || b.telefone !== undefined) {
        const chave = chaveCliente(b);
        data.pedidos = data.pedidos.filter(p => chaveCliente(p) !== chave);
      } else if (b.id) {
        data.pedidos = data.pedidos.filter(p => p.id !== parseInt(b.id));
      }
      await setPedidosData(data);
      return json(200, { success: true });
    }

    // ---------- PEDIDOS ----------
    if (path === '/api/pedidos' && method === 'GET') {
      const data = await getPedidosData();
      return json(200, data.pedidos);
    }

    if (path === '/api/pedidos/novo' && method === 'POST') {
      const b = parseBody(event);
      const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 50).map(i => {
        i = i || {};
        return {
          tipo: i.tipo === 'metade' ? 'metade' : 'inteira',
          sabores: (Array.isArray(i.sabores) ? i.sabores : []).slice(0, 2).map(s => sanitizar(String(s))),
          preco: parseFloat(i.preco) || 0
        };
      });
      const data = await getPedidosData();
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
      await setPedidosData(data);
      // push (não bloqueia)
      avisarPainelPorPush(novoPedido).catch(() => {});
      return json(200, { success: true, pedidoId: novoPedido.id });
    }

    if (path === '/api/pedidos/status' && method === 'POST') {
      const b = parseBody(event);
      const data = await getPedidosData();
      const pedido = data.pedidos.find(p => p.id === parseInt(b.id));
      if (pedido) {
        pedido.status = b.status;
        if (b.motivoRecusa) pedido.motivoRecusa = sanitizar(b.motivoRecusa);
        await setPedidosData(data);
        return json(200, { success: true });
      }
      return json(404, { error: 'Não encontrado.' });
    }

    const statusMatch = path.match(/^\/api\/pedidos\/status\/(\d+)$/);
    if (statusMatch && method === 'GET') {
      const id = parseInt(statusMatch[1]);
      const data = await getPedidosData();
      const pedido = data.pedidos.find(p => p.id === id);
      if (pedido) return json(200, { status: pedido.status, motivoRecusa: pedido.motivoRecusa || '' });
      return json(200, { status: 'concluido' });
    }

    if (path === '/api/pedidos/concluir' && method === 'POST') {
      const b = parseBody(event);
      const data = await getPedidosData();
      const pedido = data.pedidos.find(p => p.id === parseInt(b.id));
      if (pedido) {
        pedido.status = 'concluido';
        await setPedidosData(data);
        return json(200, { success: true });
      }
      return json(404, { error: 'Não encontrado.' });
    }

    // ---------- PUSH ----------
    if (path === '/api/push/chave-publica' && method === 'GET') {
      if (!webpush) return json(503, { error: 'web-push não instalado' });
      const vapid = await getVapid();
      return json(200, { chave: vapid.publicKey });
    }
    if (path === '/api/push/inscrever' && method === 'POST') {
      if (!webpush) return json(503, { error: 'web-push não instalado' });
      const inscricao = parseBody(event);
      if (!inscricao || !inscricao.endpoint) return json(400, { error: 'Inscrição inválida' });
      const subs = await getPushSubs();
      if (!subs.some(i => i.endpoint === inscricao.endpoint)) {
        subs.push(inscricao);
        await setPushSubs(subs);
      }
      return json(200, { success: true });
    }
    if (path === '/api/push/desinscrever' && method === 'POST') {
      const b = parseBody(event);
      const endpoint = b && b.endpoint;
      const subs = (await getPushSubs()).filter(i => i.endpoint !== endpoint);
      await setPushSubs(subs);
      return json(200, { success: true });
    }

    // ---------- DEBUG ----------
    if (path === '/api/debug' && method === 'GET') {
      const envInfo = {
        NETLIFY: process.env.NETLIFY || null,
        NETLIFY_BLOBS_CONTEXT: !!process.env.NETLIFY_BLOBS_CONTEXT,
        NETLIFY_SITE_ID: !!process.env.NETLIFY_SITE_ID,
        NETLIFY_AUTH_TOKEN: !!process.env.NETLIFY_AUTH_TOKEN,
        useBlobs: useBlobs()
      };
      let blobTest = 'not tested';
      try {
        const s = getStore('padoca');
        await s.setJSON('__test__', { ok: true, ts: Date.now() });
        const v = await s.get('__test__', { type: 'json' });
        blobTest = v && v.ok ? 'OK (read/write works)' : 'FAIL (read mismatch)';
      } catch (e) {
        blobTest = 'ERROR: ' + (e.message || e);
      }
      return json(200, { env: envInfo, blobTest });
    }

    return json(404, { error: 'Rota não encontrada: ' + path });
  } catch (e) {
    console.error('Erro na function:', e);
    return json(500, { error: 'Erro interno: ' + (e.message || e) });
  }
};