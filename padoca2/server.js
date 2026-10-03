const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8080; // Porta estável de alto desempenho da Padoca

app.use(express.json());

// ==========================================
// 🔒 Impede baixar arquivos internos pelo túnel (server.js tem a senha, dados/ tem os clientes)
// ==========================================
app.use((req, res, next) => {
    let caminho;
    try { caminho = decodeURIComponent(req.path); } catch (e) { return res.status(400).end(); }
    if (/^\/(server\.js|package(-lock)?\.json|dados|node_modules)(\/|$)/i.test(caminho)) return res.status(404).end();
    next();
});

// ==========================================
// 🚀 ENGINE REPARADORA DE EXTENSÕES DUPLICADAS (.JPG.JPG)
// ==========================================
const pastaImg = path.join(__dirname, 'img');

// Intercepta os pedidos de imagem do celular e entrega o arquivo real .jpg.jpg da pasta
app.get('/img/img:id.jpg', (req, res) => {
    const id = req.params.id;
    const caminhoDuplicado = path.join(pastaImg, `img${id}.jpg.jpg`);
    const caminhoNormal = path.join(pastaImg, `img${id}.jpg`);

    if (fs.existsSync(caminhoDuplicado)) {
        return res.sendFile(caminhoDuplicado);
    } else if (fs.existsSync(caminhoNormal)) {
        return res.sendFile(caminhoNormal);
    }

    // Fallback de segurança para não quebrar o layout
    res.redirect('https://unsplash.com');
});

// Liberação de tráfego estático para as rotas do projeto
app.use('/img', express.static(pastaImg));
app.use('/imgs', express.static(pastaImg));
app.use(express.static(path.join(__dirname)));

let siteOnline = true;

// ==========================================
// 💾 Pedidos salvos em disco (dados/pedidos.json) — o histórico sobrevive a reinícios
// ==========================================
const PASTA_DADOS = path.join(__dirname, 'dados');
const ARQ_PEDIDOS = path.join(PASTA_DADOS, 'pedidos.json');
let listaPedidos = [];
let proximoIdPedido = 1;

try {
    const salvo = JSON.parse(fs.readFileSync(ARQ_PEDIDOS, 'utf8'));
    if (Array.isArray(salvo.pedidos)) listaPedidos = salvo.pedidos;
    proximoIdPedido = salvo.proximoId || (listaPedidos.reduce((m, p) => Math.max(m, p.id), 0) + 1);
} catch (e) { /* primeira execução: ainda não existe arquivo */ }

function salvarPedidos() {
    try {
        fs.mkdirSync(PASTA_DADOS, { recursive: true });
        const tmp = ARQ_PEDIDOS + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify({ pedidos: listaPedidos, proximoId: proximoIdPedido }));
        fs.renameSync(tmp, ARQ_PEDIDOS);
    } catch (e) { console.error('Falha ao salvar pedidos:', e.message); }
}

// ==========================================
// 🚫 Pizzas marcadas como indisponíveis pelo painel (dados/indisponiveis.json)
// ==========================================
const ARQ_INDISPONIVEIS = path.join(PASTA_DADOS, 'indisponiveis.json');
let pizzasIndisponiveis = [];

try {
    const salvo = JSON.parse(fs.readFileSync(ARQ_INDISPONIVEIS, 'utf8'));
    if (Array.isArray(salvo)) pizzasIndisponiveis = salvo;
} catch (e) { /* ainda não existe arquivo */ }

function salvarIndisponiveis() {
    try {
        fs.mkdirSync(PASTA_DADOS, { recursive: true });
        const tmp = ARQ_INDISPONIVEIS + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(pizzasIndisponiveis));
        fs.renameSync(tmp, ARQ_INDISPONIVEIS);
    } catch (e) { console.error('Falha ao salvar indisponíveis:', e.message); }
}

// Identifica o mesmo cliente entre pedidos (nome + telefone só com números)
function chaveCliente(o) {
    return `${String(o.nome || '').trim().toLowerCase()}|${String(o.telefone || '').replace(/\D/g, '')}`;
}

// ==========================================
// 🔔 NOTIFICAÇÃO DO SISTEMA (Web Push) — avisa o painel mesmo com a aba
// minimizada ou fechada em segundo plano, sem depender de truque de áudio.
// Precisa do pacote "web-push" instalado (npm install web-push).
// ==========================================
let webpush = null;
try { webpush = require('web-push'); }
catch (e) { console.log("⚠️  Pacote 'web-push' não instalado. Rode 'npm install web-push' para ativar notificações do sistema."); }

const ARQ_VAPID = path.join(PASTA_DADOS, 'vapid.json');
const ARQ_INSCRICOES = path.join(PASTA_DADOS, 'push-inscricoes.json');
let chavesVapid = null;
let inscricoesPush = [];

if (webpush) {
    try {
        chavesVapid = JSON.parse(fs.readFileSync(ARQ_VAPID, 'utf8'));
    } catch (e) {
        // Primeira execução: gera as chaves uma vez e guarda em disco.
        // (se as chaves mudarem depois, os painéis precisam se inscrever de novo)
        chavesVapid = webpush.generateVAPIDKeys();
        try {
            fs.mkdirSync(PASTA_DADOS, { recursive: true });
            fs.writeFileSync(ARQ_VAPID, JSON.stringify(chavesVapid));
        } catch (e2) { console.error('Falha ao salvar chaves VAPID:', e2.message); }
    }
    webpush.setVapidDetails('mailto:contato@padoca.local', chavesVapid.publicKey, chavesVapid.privateKey);

    try {
        const salvo = JSON.parse(fs.readFileSync(ARQ_INSCRICOES, 'utf8'));
        if (Array.isArray(salvo)) inscricoesPush = salvo;
    } catch (e) { /* ainda não existe arquivo */ }
}

function salvarInscricoesPush() {
    try {
        fs.mkdirSync(PASTA_DADOS, { recursive: true });
        fs.writeFileSync(ARQ_INSCRICOES, JSON.stringify(inscricoesPush));
    } catch (e) { console.error('Falha ao salvar inscrições push:', e.message); }
}

async function avisarPainelPorPush(pedido) {
    if (!webpush || inscricoesPush.length === 0) return;
    const payload = JSON.stringify({
        titulo: '🍕 Novo pedido na Padoca!',
        corpo: `${pedido.nome || 'Cliente'} ${pedido.sobrenome || ''} — pedido #${pedido.id}`.trim()
    });
    const sobreviventes = [];
    for (const inscricao of inscricoesPush) {
        try {
            await webpush.sendNotification(inscricao, payload);
            sobreviventes.push(inscricao);
        } catch (e) {
            // 404/410 = inscrição expirada (painel fechado/desinstalado); descarta.
            if (e.statusCode !== 404 && e.statusCode !== 410) sobreviventes.push(inscricao);
        }
    }
    if (sobreviventes.length !== inscricoesPush.length) {
        inscricoesPush = sobreviventes;
        salvarInscricoesPush();
    }
}

app.get('/api/push/chave-publica', (req, res) => {
    if (!webpush) return res.status(503).json({ error: 'web-push não instalado no servidor' });
    res.json({ chave: chavesVapid.publicKey });
});

app.post('/api/push/inscrever', (req, res) => {
    if (!webpush) return res.status(503).json({ error: 'web-push não instalado no servidor' });
    const inscricao = req.body;
    if (!inscricao || !inscricao.endpoint) return res.status(400).json({ error: 'Inscrição inválida' });
    if (!inscricoesPush.some(i => i.endpoint === inscricao.endpoint)) {
        inscricoesPush.push(inscricao);
        salvarInscricoesPush();
    }
    res.json({ success: true });
});

app.post('/api/push/desinscrever', (req, res) => {
    const endpoint = req.body && req.body.endpoint;
    inscricoesPush = inscricoesPush.filter(i => i.endpoint !== endpoint);
    salvarInscricoesPush();
    res.json({ success: true });
});

let promocaoAtual = "Ganhe uma bebida na compra de duas pizzas inteiras!";
const SENHA_FIXA_CADASTRO = "0905";

function removerEmojis(texto) {
    if (typeof texto !== 'string') return texto;
    return texto.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
}

// Middleware sanitizador de segurança contra emojis
app.use((req, res, next) => {
    if (req.path.includes('/api/cadastro') || req.path === '/api/status') return next();
    if (req.body) {
        for (let chave in req.body) {
            if (typeof req.body[chave] === 'string') req.body[chave] = removerEmojis(req.body[chave]);
        }
    }
    next();
});

// ==========================================
// 🍕 CARDÁPIO — sincronizado com o index.html (25 sabores)
// Frango Cheddar, Champignon e Pepperoni Especial foram descontinuados.
// ==========================================
const cardapio = [
    { id: 1, categoria: "mais-pedidas", nome: "01 Mussarela", preco: 55.00, ingredientes: "Mussarela, tomate, orégano e azeitonas." },
    { id: 2, categoria: "mais-pedidas", nome: "02 Calabresa", preco: 55.00, ingredientes: "Mussarela, calabresa, cebola roxa, orégano e azeitonas." },
    { id: 3, categoria: "mais-pedidas", nome: "03 Marguerita", preco: 55.00, ingredientes: "Mussarela, parmesão, tomate, manjericão, orégano e azeitonas." },
    { id: 4, categoria: "mais-pedidas", nome: "04 Presunto", preco: 55.00, ingredientes: "Mussarela, presunto, tomate, orégano e azeitonas." },
    { id: 5, categoria: "mais-pedidas", nome: "05 Frango c/ Catupiry", preco: 60.00, ingredientes: "Mussarela, frango, Catupiry, orégano e azeitonas." },
    { id: 6, categoria: "mais-pedidas", nome: "06 Frango Bacon", preco: 64.00, ingredientes: "Mussarela, frango, bacon, Catupiry, orégano e azeitonas." },
    { id: 8, categoria: "tradicionais", nome: "08 Provolombo", preco: 64.00, ingredientes: "Mussarela, lombo, provolone, Catupiry, orégano e azeitonas." },
    { id: 9, categoria: "tradicionais", nome: "09 Portuguesa", preco: 60.00, ingredientes: "Mussarela, presunto, ervilha, palmito, ovo, tomate, orégano e azeitonas." },
    { id: 10, categoria: "tradicionais", nome: "10 Palmito", preco: 60.00, ingredientes: "Mussarela, palmito, Catupiry, orégano e azeitonas." },
    { id: 11, categoria: "tradicionais", nome: "11 Tropical", preco: 60.00, ingredientes: "Mussarela, frango, milho verde, ervilha, ovo, tomate, orégano e azeitonas." },
    { id: 12, categoria: "tradicionais", nome: "12 Canadense", preco: 60.00, ingredientes: "Mussarela, lombo, Catupiry, orégano e azeitonas." },
    { id: 13, categoria: "tradicionais", nome: "13 Atum", preco: 60.00, ingredientes: "Mussarela, atum, cebola roxa, orégano e azeitonas." },
    { id: 14, categoria: "tradicionais", nome: "14 Calapiry", preco: 60.00, ingredientes: "Mussarela, calabresa, Catupiry, orégano e azeitonas." },
    { id: 15, categoria: "especiais", nome: "15 Bacon", preco: 60.00, ingredientes: "Mussarela, bacon, tomate, orégano e azeitonas." },
    { id: 16, categoria: "especiais", nome: "16 Mineira", preco: 60.00, ingredientes: "Mussarela, frango, milho verde, bacon, tomate, orégano e azeitonas." },
    { id: 17, categoria: "especiais", nome: "17 Romana", preco: 60.00, ingredientes: "Mussarela, champignon, bacon, Catupiry, orégano e azeitonas." },
    { id: 18, categoria: "especiais", nome: "18 Pepperoni", preco: 60.00, ingredientes: "Mussarela, pepperoni, orégano e azeitonas." },
    { id: 20, categoria: "especiais", nome: "20 Baiana", preco: 60.00, ingredientes: "Mussarela, calabresa, cebola roxa, pimenta calabresa, orégano e azeitonas." },
    { id: 21, categoria: "especiais", nome: "21 Dois Queijos", preco: 55.00, ingredientes: "Mussarela, provolone, orégano e azeitonas." },
    { id: 22, categoria: "outros", nome: "22 Três Queijos", preco: 60.00, ingredientes: "Mussarela, provolone, parmesão, orégano e azeitonas." },
    { id: 23, categoria: "outros", nome: "23 Quatro Queijos", preco: 65.00, ingredientes: "Mussarela, provolone, parmesão, Catupiry, orégano e azeitonas." },
    { id: 24, categoria: "outros", nome: "24 Brócolis", preco: 65.00, ingredientes: "Mussarela, brócolis, bacon, alho frito, orégano e azeitonas." },
    { id: 25, categoria: "outros", nome: "25 Carne Seca", preco: 64.00, ingredientes: "Mussarela, carne seca, cebola roxa, tomate, orégano e azeitonas." },
    { id: 27, categoria: "outros", nome: "27 Americana", preco: 60.00, ingredientes: "Mussarela, presunto, bacon, tomate, cebola roxa, orégano e azeitonas." },
    { id: 28, categoria: "outros", nome: "28 Escarola", preco: 60.00, ingredientes: "Mussarela, escarola, bacon, tomate, cebola roxa, orégano e azeitonas." }
];

// ==========================================
// PÁGINAS
// ==========================================
app.get('/painel', (req, res) => res.sendFile(path.join(__dirname, 'painel.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'clientes.html')));
app.get('/clientes', (req, res) => res.sendFile(path.join(__dirname, 'clientes.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ==========================================
// CARDÁPIO / STATUS / PROMOÇÃO
// ==========================================
app.get('/api/cardapio', (req, res) => res.json(cardapio));

// Lista de ids de pizzas indisponíveis + alternar (marcar/desmarcar) uma pizza
app.get('/api/indisponiveis', (req, res) => res.json(pizzasIndisponiveis));

app.post('/api/indisponiveis/alternar', (req, res) => {
    const id = parseInt(req.body.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    if (pizzasIndisponiveis.includes(id)) {
        pizzasIndisponiveis = pizzasIndisponiveis.filter(i => i !== id);
    } else {
        pizzasIndisponiveis.push(id);
    }
    salvarIndisponiveis();
    res.json({ success: true, indisponiveis: pizzasIndisponiveis });
});
app.get('/api/status', (req, res) => res.json({ online: siteOnline }));
app.post('/api/status', (req, res) => { siteOnline = !!req.body.online; res.json({ success: true }); });
app.get('/api/promocao', (req, res) => res.json({ texto: promocaoAtual }));
app.post('/api/promocao', (req, res) => { promocaoAtual = req.body.texto; res.json({ success: true }); });

// ==========================================
// CADASTROS (usado pelo clientes.html)
// ==========================================
app.post('/api/cadastro/verificar-senha', (req, res) => {
    if (req.body.senha === SENHA_FIXA_CADASTRO) return res.json({ success: true });
    res.status(401).json({ success: false });
});

app.post('/api/cadastro/excluir', (req, res) => {
    if (req.body.nome !== undefined || req.body.telefone !== undefined) {
        // Apaga TODOS os pedidos do cliente (senão o pedido anterior "voltaria" na lista)
        const chave = chaveCliente(req.body);
        listaPedidos = listaPedidos.filter(p => chaveCliente(p) !== chave);
    } else {
        listaPedidos = listaPedidos.filter(p => p.id !== parseInt(req.body.id));
    }
    salvarPedidos();
    res.json({ success: true });
});

// ==========================================
// PEDIDOS
// ==========================================
app.get('/api/pedidos', (req, res) => res.json(listaPedidos));

app.post('/api/pedidos/novo', (req, res) => {
    // Itens estruturados (usados no histórico do clientes.html)
    const itens = (Array.isArray(req.body.itens) ? req.body.itens : []).slice(0, 50).map(i => {
        i = i || {};
        return {
            tipo: i.tipo === 'metade' ? 'metade' : 'inteira',
            sabores: (Array.isArray(i.sabores) ? i.sabores : []).slice(0, 2).map(s => removerEmojis(String(s))),
            preco: parseFloat(i.preco) || 0
        };
    });
    const agora = new Date();
    const novoPedido = {
        id: proximoIdPedido++,
        nome: req.body.nome || 'Cliente',
        sobrenome: req.body.sobrenome || '',
        telefone: req.body.telefone || '',
        endereco: req.body.endereco || '',
        detalhe: req.body.detalhe || '',
        borda: req.body.borda || 'Sem borda',
        extras: req.body.extras || 'Nenhum',
        observacoes: req.body.observacoes || 'Nenhuma',
        pagamento: req.body.pagamento || 'Pix',
        total: parseFloat(req.body.total) || 0,
        tipoCadastro: req.body.tipoCadastro || 'simples',
        // Placeholder até existir uma análise de segurança real do pedido
        seguranca: 'Média (não analisado)',
        itens,
        status: 'pendente',
        dataHora: agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        criadoEm: agora.toISOString()
    };
    listaPedidos.push(novoPedido);
    salvarPedidos();
    avisarPainelPorPush(novoPedido);
    res.json({ success: true, pedidoId: novoPedido.id });
});

app.post('/api/pedidos/status', (req, res) => {
    const pedido = listaPedidos.find(p => p.id === req.body.id);
    if (pedido) {
        pedido.status = req.body.status;
        if (req.body.motivoRecusa) pedido.motivoRecusa = req.body.motivoRecusa;
        salvarPedidos();
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Não encontrado." });
});

app.get('/api/pedidos/status/:id', (req, res) => {
    const pedido = listaPedidos.find(p => p.id === parseInt(req.params.id));
    if (pedido) return res.json({ status: pedido.status, motivoRecusa: pedido.motivoRecusa || '' });
    res.json({ status: 'concluido' });
});

// Usado pelo botão "Despachar (Concluir)" do painel.html
app.post('/api/pedidos/concluir', (req, res) => {
    const pedido = listaPedidos.find(p => p.id === req.body.id);
    if (pedido) {
        pedido.status = 'concluido';
        salvarPedidos();
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Não encontrado." });
});

app.listen(PORT, () => console.log("🚀 Servidor da Padoca ativo na porta " + PORT));
