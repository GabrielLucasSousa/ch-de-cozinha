/**
 * Back-end da lista de presentes (lista.html) usando uma Planilha Google.
 *
 * Como instalar:
 *  1. Crie uma Planilha Google (ex.: "Chá dos Noivos - Reservas").
 *  2. Menu Extensões > Apps Script. Apague o conteúdo e cole este arquivo inteiro.
 *  3. Configurações do projeto (engrenagem) > Propriedades do script > Adicionar:
 *       SENHA_NOIVOS = <senha da área dos noivos>
 *  4. Implantar > Nova implantação > tipo "App da Web":
 *       Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
 *     Autorize o acesso e copie a URL que termina em /exec.
 *  5. Cole essa URL em PLANILHA_URL, no lista.html.
 *
 * Ao alterar este código, use Implantar > Gerenciar implantações > Editar > Nova versão
 * (assim a URL /exec continua a mesma).
 */

const ABA = 'Reservas';
const CABECALHO = ['ID', 'Presente', 'Valor', 'Convidado', 'Recado', 'Data'];

function aba_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(ABA);
  if (!aba) {
    aba = planilha.insertSheet(ABA);
    aba.appendRow(CABECALHO);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, CABECALHO.length).setFontWeight('bold');
  }
  return aba;
}

function reservas_() {
  const aba = aba_();
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  return aba.getRange(2, 1, ultima - 1, CABECALHO.length).getValues()
    .map((r, i) => ({
      linha: i + 2,
      id: Number(r[0]),
      nome: String(r[3]),
      recado: String(r[4]),
      data: r[5] instanceof Date ? r[5].toISOString() : String(r[5]),
    }))
    .filter(r => r.id);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function senhaOk_(senha) {
  const certa = PropertiesService.getScriptProperties().getProperty('SENHA_NOIVOS');
  return Boolean(certa) && String(senha) === certa;
}

// Evita que um texto começando com = + - @ vire fórmula na planilha.
function texto_(valor, max) {
  const t = String(valor || '').trim().slice(0, max);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function comLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Público: quais presentes já foram escolhidos e por quem (sem os recados). */
function doGet() {
  return json_({ ok: true, reservas: reservas_().map(r => ({ id: r.id, nome: r.nome })) });
}

function doPost(e) {
  let dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (_) {
    return json_({ ok: false, erro: 'pedido_invalido' });
  }

  if (dados.acao === 'reservar') {
    const id = Number(dados.id);
    const nome = texto_(dados.nome, 80);
    if (!id || !nome) return json_({ ok: false, erro: 'dados_incompletos' });
    return comLock_(() => {
      const atual = reservas_().find(r => r.id === id);
      if (atual) return json_({ ok: false, erro: 'ja_reservado', nome: atual.nome });
      aba_().appendRow([id, texto_(dados.presente, 200), Number(dados.valor) || '', nome,
                        texto_(dados.recado, 500), new Date()]);
      return json_({ ok: true });
    });
  }

  if (dados.acao === 'admin') {
    if (!senhaOk_(dados.senha)) return json_({ ok: false, erro: 'senha' });
    return json_({ ok: true, reservas: reservas_().map(({ linha, ...r }) => r) });
  }

  if (dados.acao === 'reabrir') {
    if (!senhaOk_(dados.senha)) return json_({ ok: false, erro: 'senha' });
    return comLock_(() => {
      const aba = aba_();
      reservas_().filter(r => r.id === Number(dados.id)).reverse()
        .forEach(r => aba.deleteRow(r.linha));
      return json_({ ok: true });
    });
  }

  return json_({ ok: false, erro: 'acao_desconhecida' });
}
