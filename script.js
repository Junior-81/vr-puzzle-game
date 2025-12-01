/**
 * Esse é um projeto de quebra-cabeça 3D em realidade aumentada
 * utilizando A-Frame e Three.js
 * O objetivo é criar um quebra-cabeça interativo onde
 * o usuário pode montar as peças em um ambiente de RA
 * as peças são geradas com lados que se encaixam
 * e o usuário pode selecionar e mover as peças para montar o quebra-cabeça
 * o projeto inclui:
 * - Geração de peças com lados que se encaixam
 * - Embaralhamento das peças
 * - Renderização das peças na cena
 * - Interação do usuário para selecionar e mover peças
 * - Validação do encaixe das peças
 * - Feedback visual para erros de encaixe
 * - Indicação de conclusão do quebra-cabeça
 *
 * Alguns termos utilizados para documentar:
 * - Peça: cada parte individual do quebra-cabeça
 * - Lado: cada uma das quatro bordas de uma peça
 * - Encaixe: a ação de colocar uma peça na posição correta
 * - Esqueleto(skeleton): guia visual para posicionamento das peças
 * - Lixeira: área onde peças podem ser descartadas
 *
 * Conceitos complexos usados:
 * - Geometria 3D com THREE.ExtrudeGeometry, geração das peças com lados personalizados
 * - Interação com A-Frame, manipulação de eventos de mouse e clique
 * - Geração de esqueleto (skeleton) para posicionamento das peças
 * - Validação de encaixe das peças com base nos lados
 * - Raycasting para detecção de interseções
 */

/* ========== INFOS ========== */

/**
 * Com intuito de ajudar na leitura do codigo estou utilizando JSDoc
 * abaixo estou criando alguns tipos que vou utilizar durante a documentação
 */

/**
 * @typedef {0 | 1 | 2} SideType
 * Formato de lado da peça do quebra-cabeça:
 * - 0 = reto
 * - 1 = para dentro (reentrante)
 * - 2 = para fora (saliente)
 */

/**
 * @typedef {Object} SideShapes
 * @property {SideType} top - Formato do lado superior
 * @property {SideType} right - Formato do lado direito
 * @property {SideType} bottom - Formato do lado inferior
 * @property {SideType} left - Formato do lado esquerdo
 */

/**
 * @typedef {Object} Position3D
 * @property {number} x - Posição no eixo X
 * @property {number} y - Posição no eixo Y
 * @property {number} z - Posição no eixo Z
 */

/**
 * @typedef {Object} PuzzlePieceBase
 * @property {string} id - Identificador único da peça
 * @property {SideShapes} sides - Formatos dos lados da peça
 */

/**
 * @typedef {PuzzlePieceBase & { position: Position3D, name: string }} PuzzlePiece
 * Extensão de PuzzlePieceBase que inclui a posição 3D da peça
 */

/* ========== CLASSES ========== */
/**
 * Classe para controle da linha de seleção
 * @class Line
 * @property {boolean} active - Indica se a linha está ativa
 * @property {HTMLElement} element - Elemento HTML da linha
 * @property {string|null} initalElementName - Nome do elemento inicial selecionado
 * @property {HTMLElement|null} selectedElement - Elemento HTML atualmente selecionado
 * @method setStart(position, name, element) - Define o ponto inicial da linha
 * @method setEnd(position) - Define o ponto final da linha
 * @method reset() - Reseta a linha para o estado inicial
 */
/**
 * Classe para controle da linha de seleção
 * @class Line
 * @property {boolean} active - Indica se a linha está ativa
 * @property {HTMLElement} element - Elemento HTML da linha
 * @property {string|null} initalElementName - Nome do elemento inicial selecionado
 * @property {HTMLElement|null} selectedElement - Elemento HTML atualmente selecionado
 * @method setStart(position) - Define o ponto inicial da linha
 * @method setEnd(position) - Define o ponto final da linha
 * @method reset() - Reseta a linha para o estado inicial
 */

// Captura o código do usuário da URL e salva no localStorage
document.addEventListener("DOMContentLoaded", function () {
  // Pega o código da URL atual (formato: ?code=AA9999)
  const urlParams = new URLSearchParams(window.location.search);
  let userCode = urlParams.get("code");

  // Se não tiver 'code=', tenta pegar o parâmetro direto
  if (!userCode) {
    userCode = window.location.search.replace("?", "");
  }

  console.log("Código capturado:", userCode);

  // Salva no localStorage
  if (userCode) {
    localStorage.setItem("userCode", userCode);
    console.log("✅ Código do usuário salvo:", userCode);
  }

  // Atualizar o display do código na interface
  updateUserCodeDisplay();
});

/**
 * Atualiza o display visual do código do usuário na interface
 */
function updateUserCodeDisplay() {
  const codeDisplay = document.getElementById("code-value");
  const userCode = localStorage.getItem("userCode");

  if (codeDisplay) {
    if (userCode) {
      codeDisplay.textContent = userCode;
      codeDisplay.parentElement.style.background = "#d4edda";
      codeDisplay.parentElement.style.color = "#155724";
    } else {
      codeDisplay.textContent = "Nenhum código";
      codeDisplay.parentElement.style.background = "#f8d7da";
      codeDisplay.parentElement.style.color = "#721c24";
    }
  }
}

// Variável global para pontuação
let pontos = 0;

// ========== SISTEMA DE TIMER E RANKING ==========
let timerStarted = false;
let startTime = 0;
let timerInterval = null;
let currentPuzzleIndex = 0;

/**
 * Formata segundos em MM:SS
 * @param {number} seconds - Segundos a formatar
 * @returns {string} - Tempo formatado
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Inicia o timer quando o usuário faz a primeira jogada
 */
function startTimer() {
  if (!timerStarted) {
    timerStarted = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    console.log("⏱️ Timer iniciado!");
  }
}

/**
 * Atualiza o display do timer
 */
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById("timer-display").textContent =
    "⏱️ " + formatTime(elapsed);
}

/**
 * Para o timer e retorna o tempo final
 * @returns {number} - Tempo decorrido em segundos
 */
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Reseta o timer para 00:00
 */
function resetTimer() {
  stopTimer();
  timerStarted = false;
  startTime = 0;
  document.getElementById("timer-display").textContent = "⏱️ 00:00";
}

/**
 * Chamado quando o puzzle é completado
 */
function onPuzzleComplete() {
  const finalTime = stopTimer();
  document.getElementById("final-time").textContent = formatTime(finalTime);
  document.getElementById("completion-modal").classList.add("show");
  console.log("🎉 Puzzle completo em " + formatTime(finalTime));
}

/**
 * Salva a pontuação do usuário no ranking local e na API
 */
function submitScore() {
  const userCode = localStorage.getItem("userCode");

  if (!userCode) {
    alert(
      "Código do usuário não encontrado! Por favor, acesse via link com código."
    );
    return;
  }

  const finalTime = Math.floor((Date.now() - startTime) / 1000);

  // Buscar dados do usuário na API
  console.log("🔍 Buscando usuário com código:", userCode);

  fetch(`https://base-presentation-vrar.onrender.com/users?code=${userCode}`)
    .then((res) => res.json())
    .then((users) => {
      if (!users || users.length === 0) {
        console.error("❌ Usuário não encontrado com o código:", userCode);
        alert("Usuário não encontrado! Verifique seu código de acesso.");
        return;
      }

      const user = users[0];
      const playerName = user.name || userCode;

      console.log("✅ Usuário encontrado:", user);

      const score = {
        name: playerName,
        userCode: userCode,
        time: finalTime,
        date: new Date().toISOString(),
        puzzleIndex: currentPuzzleIndex,
      };

      // Salvar no localStorage
      const rankingKey = `puzzle_ranking_${currentPuzzleIndex}`;
      let rankings = JSON.parse(localStorage.getItem(rankingKey) || "[]");
      rankings.push(score);
      rankings.sort((a, b) => a.time - b.time); // Ordena por tempo crescente
      rankings = rankings.slice(0, 10); // Mantém apenas top 10
      localStorage.setItem(rankingKey, JSON.stringify(rankings));

      console.log("💾 Pontuação salva localmente:", score);

      // Enviar pontuação para a API
      const scoreData = {
        userId: user.id,
        experienceId: 1, // ID da experiência VR Puzzle Game
        score: pontos,
        time: finalTime,
        puzzleIndex: currentPuzzleIndex,
      };

      console.log("📤 Enviando pontuação para API:", scoreData);

      fetch("https://base-presentation-vrar.onrender.com/experienceScores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scoreData),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("✅ Pontuação salva na API com sucesso:", data);

          // Fechar modal e mostrar ranking
          closeModal();
          showRanking();

          // Chamar saveScores para o fluxo original (que redireciona)
          saveScores();
        })
        .catch((error) => {
          console.error("❌ Erro ao salvar pontuação na API:", error);

          // Mesmo com erro, mostra o ranking local
          closeModal();
          showRanking();

          // Tenta salvar com o método antigo
          saveScores();
        });
    })
    .catch((error) => {
      console.error("❌ Erro ao buscar usuário:", error);
      alert("Erro ao conectar com o servidor. Tente novamente.");
    });
}

/**
 * Fecha o modal de conclusão
 */
function closeModal() {
  document.getElementById("completion-modal").classList.remove("show");
}

/**
 * Mostra o modal de ranking
 */
function showRanking() {
  document.getElementById("ranking-modal").classList.add("show");
  showRankingTab(currentPuzzleIndex);
}

/**
 * Fecha o modal de ranking
 */
function closeRanking() {
  document.getElementById("ranking-modal").classList.remove("show");
}

/**
 * Mostra uma aba específica do ranking
 * @param {number} puzzleIndex - Índice do puzzle (0, 1 ou 2)
 */
function showRankingTab(puzzleIndex) {
  // Atualizar tabs ativos
  const tabs = document.querySelectorAll(".ranking-tabs button");
  tabs.forEach((tab, index) => {
    tab.classList.toggle("active", index === puzzleIndex);
  });

  // Carregar ranking do localStorage
  const rankingKey = `puzzle_ranking_${puzzleIndex}`;
  const rankings = JSON.parse(localStorage.getItem(rankingKey) || "[]");
  const rankingList = document.getElementById("ranking-list");

  if (rankings.length === 0) {
    rankingList.innerHTML =
      '<li style="text-align: center; padding: 20px; color: #999;">Nenhum registro ainda</li>';
    return;
  }

  rankingList.innerHTML = rankings
    .map((score, index) => {
      const topClass =
        index === 0
          ? "top-1"
          : index === 1
          ? "top-2"
          : index === 2
          ? "top-3"
          : "";
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
      return `
      <li class="ranking-item ${topClass}">
        <span class="ranking-position">${medal} ${index + 1}º</span>
        <span class="ranking-name">${score.name}</span>
        <span class="ranking-time">${formatTime(score.time)}</span>
      </li>
    `;
    })
    .join("");
}

/**
 * Seleciona um puzzle específico
 * @param {number} index - Índice do puzzle
 */
function selectPuzzle(index) {
  currentPuzzleIndex = index;
  loadPuzzleTexture(availableImages[index]);
  resetPuzzle();
  resetTimer();
}

// ========== FIM DO SISTEMA DE TIMER E RANKING ==========

/**
 * Salva a pontuação do usuário no sistema de rank
 * Segue o padrão da API do exemplo fornecido
 * Esta função é chamada apenas para fazer o redirecionamento final
 */
function saveScores() {
  console.log("🔄 Redirecionando para o dashboard...");

  // Redireciona após 10 segundos
  setTimeout(() => {
    window.location.href =
      "https://base-presentation-vrar.onrender.com/pages/auth";
  }, 10000);
}
class Line {
  constructor() {
    this.active = false;
    this.element = document.querySelector("#line");
    this.initalElementName = null;
    this.selectedElement = null;
  }

  setStart(position, name, element) {
    this.element.setAttribute("line", { start: position });
    this.initalElementName = name;
    this.active = true;
    this.selectedElement = element;
  }

  setEnd(position) {
    this.element.setAttribute("line", { end: position });
    this.active = true;
  }

  reset() {
    this.element.setAttribute("line", { start: "0 0 0", end: "0 0 0" });
    this.active = false;
    this.initalElementName = null;
    this.selectedElement = null;
  }
}

/* ========== CONSTANTES GLOBAIS ========== */
const lineSelection = new Line();
const cursor = document.querySelector("#cursor");
const pieceSize = 1;
const pieceDepth = 1;
// Configuração do puzzle: 4 linhas x 4 colunas = 16 peças
const rows = 4;
const cols = 4;
const totalPieces = rows * cols;
const puzzleSize = 4; // mantido para compatibilidade
const zOffset = -6;
const heightInitGlobal = 1;
const widthInitGlobal = -1.5;

//Configuração de imagens do puzzle
const availableImages = [
  "images/puzzle1.jpg",
  "images/puzzle2.jpeg",
  "images/puzzle3.jpg",
];
let currentPuzzle = "puzzle1";
let currentLevel = 1;
let currentTexture = null;

// Controle de rotação
let isRotateKeyPressed = false;

// Detectar tecla R para rotação
document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    isRotateKeyPressed = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "r" || e.key === "R") {
    isRotateKeyPressed = false;
  }
});

/* ========== INICIALIZAÇÃO ========== */
/**
 * Array que armazena as peças com id e forma
 * @type {Array<PuzzlePieceBase>}
 */
let pieces = generatePieces();

/**
 * Array que armazena os slots (posições corretas) do tabuleiro
 * @type {Array<Object>}
 */
let slots = createSlots();

/**
 * Array que armazena as peças com id, forma, posição e nome
 * @type {Array<{PuzzlePiece}>}
 */
let piecesForRender = definePiecePositions();

/**
 * Array que armazena as peças que já foram posicionados pelo usuário
 * @type {Array<PuzzlePieceBase>}
 */
let piecesUserMounted = new Array(totalPieces).fill(null);

// Carregar textura padrão na inicialização
loadPuzzleTexture("images/puzzle1.jpg");

mountPuzzleSkeleton();
renderPieces();
/* ========== AREA DE TESTES (executar funções no inicio para testar o codigo) ========== */

/* === EM DESENVOLVIMENTO === */

/* === FUNCOES DE INICIAIS (metodos que devem ser chamados na inicialização) === */

/**
 * Carrega a textura do puzzle
 * @param {string} imageUrl - URL da imagem a ser carregada
 */
function loadPuzzleTexture(imageUrl) {
  const loader = new THREE.TextureLoader();
  loader.load(
    imageUrl,
    (texture) => {
      currentTexture = texture;
      // Configuração correta da textura
      currentTexture.wrapS = currentTexture.wrapT = THREE.ClampToEdgeWrapping;
      currentTexture.minFilter = THREE.LinearFilter;
      currentTexture.magFilter = THREE.LinearFilter;
      currentTexture.flipY = false;
      console.log(`Textura carregada: ${imageUrl}`);

      // Atualizar material de todas as peças existentes
      updatePiecesTexture();
    },
    undefined,
    (error) => {
      console.warn(`Erro ao carregar textura ${imageUrl}:`, error);
      console.log("Usando cor padrão para as peças");
    }
  );
}

/**
 * Atualiza a textura de todas as peças na cena
 */
function updatePiecesTexture() {
  if (!currentTexture) return;

  piecesForRender.forEach((piece) => {
    const element = document.querySelector(`#${piece.name}`);
    if (element) {
      // Buscar o mesh no object3D
      const mesh = element.getObject3D("mesh");
      if (mesh && mesh.material) {
        mesh.material.map = currentTexture;
        mesh.material.color.set(0xffffff); // Branco para não tingir a textura
        mesh.material.needsUpdate = true;
      }
    }
  });
}

/**
 * Reseta o puzzle atual - reembaralha SEM gerar novas peças
 * IMPORTANTE: Mantém texturas fixas, apenas reposiciona
 */
function resetPuzzle() {
  // Remover todas as peças existentes
  piecesForRender.forEach((piece) => {
    const element = document.querySelector(`#${piece.name}`);
    if (element) {
      element.parentNode.removeChild(element);
    }
  });

  // Limpar array de peças montadas
  piecesUserMounted.fill(null);

  // Remover skeleton
  const skeletonPieces = document.querySelectorAll('[id^="skeleton-"]');
  skeletonPieces.forEach((el) => el.parentNode.removeChild(el));

  // Recriar slots
  slots = createSlots();

  // IMPORTANTE: Reembaralhar APENAS posições, manter textura original de cada peça
  piecesForRender = definePiecePositions();

  mountPuzzleSkeleton();
  renderPieces();
}

/** Gera as peças do quebra-cabeça com lados que se encaixam
 * essa função cria as peças do quebra-cabeça e define os lados
 * de cada peça para que elas possam se encaixar corretamente
 * IMPORTANTE: Cada peça mantém seu índice correto (correctIndex)
 * @returns {Array} - Array de peças com lados definidos
 */
function generatePieces() {
  let count = 0;

  const pieces = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      count++;

      const topSide = row === rows - 1 ? 0 : randomSideShape();
      const rightSide = col === cols - 1 ? 0 : randomSideShape();
      // o calculo dentro dos arrays "[]" serve para pegar o lado oposto da peça vizinha
      // precisa de tudo isso pois calcula a posição corrita no array
      const bottomSide =
        row === 0 ? 0 : pieces[(row - 1) * cols + col].sides.top === 1 ? 2 : 1;
      const leftSide =
        col === 0
          ? 0
          : pieces[row * cols + (col - 1)].sides.right === 1
          ? 2
          : 1;

      const piece = {
        id: crypto.randomUUID(),
        correctIndex: index, // Índice correto na solução final
        correctRow: row, // Linha correta
        correctCol: col, // Coluna correta
        sides: {
          top: topSide,
          right: rightSide,
          bottom: bottomSide,
          left: leftSide,
        },
      };

      pieces.push(piece);
    }
  }

  return pieces;
}

/**
 * Cria os slots invisíveis do tabuleiro (posições corretas)
 * @returns {Array} - Array de objetos representando slots
 */
function createSlots() {
  const slots = [];
  const heightInit = heightInitGlobal;
  const widthInit = widthInitGlobal;
  const gap = pieceSize;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const slot = {
        index: index,
        position: {
          x: widthInit + col * gap,
          y: heightInit + row * gap,
          z: zOffset,
        },
      };
      slots.push(slot);
    }
  }

  return slots;
}

/**
 * Embaralha as peças e define suas posições iniciais adicionando o nome
 * IMPORTANTE: Embaralha apenas POSIÇÕES (distribuição espacial), nunca texturas
 * Cada peça mantém sua imagem original através de correctRow/correctCol
 */
function definePiecePositions() {
  const heightInit = heightInitGlobal;
  const widthInit = widthInitGlobal;
  const gap = pieceSize * 1.5;
  const piecesForRender = [];

  // Criar array de posições disponíveis: 2 colunas à ESQUERDA + 2 colunas à DIREITA
  const positions = [];

  // LADO ESQUERDO: 2 colunas (cols 0 e 1)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 2; col++) {
      positions.push({
        x: widthInit - gap * (3 - col), // Afastado à esquerda
        y: heightInit + row * gap,
        z: zOffset,
      });
    }
  }

  // LADO DIREITO: 2 colunas (cols 2 e 3)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 2; col++) {
      positions.push({
        x: widthInit + cols * pieceSize + gap * (col + 1), // Afastado à direita
        y: heightInit + row * gap,
        z: zOffset,
      });
    }
  }

  // CORREÇÃO: EMBARALHAR as posições antes de atribuir
  const shuffledPositions = embaralharArray(positions);

  // Atribuir posições embaralhadas mantendo textura original
  for (let i = 0; i < pieces.length; i++) {
    const originalPiece = pieces[i]; // mantém correctRow/correctCol

    piecesForRender.push({
      ...originalPiece,
      name: `piece-${i + 1}`,
      position: shuffledPositions[i], // posição EMBARALHADA
    });
  }

  console.log("Posições embaralhadas:", shuffledPositions.slice(0, 3));

  return piecesForRender;
}

/**
 * Renderiza as peças do quebra-cabeça na cena
 * embaralhadas e com nome na cena
 * IMPORTANTE: Usa correctRow e correctCol para manter textura fixa
 */
function renderPieces() {
  piecesForRender.forEach((piece, index) => {
    // Usar correctRow e correctCol da própria peça
    mountPuzzlePiece(
      `piece-${index + 1}`,
      piece.sides,
      piece.position,
      piece.correctRow,
      piece.correctCol,
      piece.correctIndex
    );
  });
}

/** Monta o esqueleto do quebra-cabeça na cena
 * Esse metodo vai ser utilizado para criar o guia visual
 * ele chama o metodo de criação passando os parametros de nome e posição
 */
function mountPuzzleSkeleton() {
  const heightInit = heightInitGlobal;
  const widthInit = widthInitGlobal;
  const gap = pieceSize; // Gap padrão para skeleton centralizado
  const finalHeight = heightInit + rows * gap;

  let count = 0;

  // Criar skeleton baseado em rows x cols
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      count++;
      const position = {
        x: widthInit + col * gap,
        y: heightInit + row * gap,
        z: zOffset,
      };
      skeletonSphere(`skeleton-${count}`, position);
    }
  }

  mountTrashBox(finalHeight);

  for (let col = 0; col < cols - 1; col++) {
    count++;
    const position = {
      x: widthInit + col * (gap + 0.5),
      y: finalHeight + 0.5,
      z: zOffset,
    };
    skeletonSphere(`trash-${count}`, position);
  }
}

/* === FUNCOES DE CRIACAO (criação de componentes a partir de parametros) === */
/**
 * Monta uma esfera do esqueleto na cena
 * Esqueleto serve como guia para o posicionamento das peças
 * ele vai ser o ponto central de cada peça e vai definir a posição
 * correta de cada uma
 * @param {string} name - Nome da esfera
 * @param {Position3D} position - Posição inicial da esfera
 */
function skeletonSphere(name, position = { x: 1, y: 1, z: -3 }) {
  const sceneEl = document.querySelector("a-scene");
  const puzzleGroup = document.createElement("a-sphere");
  puzzleGroup.setAttribute("id", name);
  puzzleGroup.setAttribute("puzzle-skeleton", "");
  puzzleGroup.setAttribute("puzzle-component", name);
  puzzleGroup.setAttribute("radius", "0.1");
  puzzleGroup.setAttribute("color", "#EF2D5E");
  puzzleGroup.setAttribute("class", "clickable");

  if (name.startsWith("trash")) {
    puzzleGroup.setAttribute("color", "#c7c7c7");
  }

  puzzleGroup.setAttribute(
    "position",
    `${position.x} ${position.y} ${position.z}`
  );
  sceneEl.appendChild(puzzleGroup);
}

/**
 * Monta uma peça do quebra-cabeça na cena
 * essa função cria um entity do A-Frame e adiciona os componentes
 * necessários para a peça funcionar
 * @param {string} name - Nome da peça
 * @param {SideShapes} sideShapes - Formatos dos lados da peça
 * @param {Position3D} position - Posição inicial da peça
 * @param {number} row - Linha da peça no grid original
 * @param {number} col - Coluna da peça no grid original
 * @param {number} correctIndex - Índice correto da peça na solução
 */
function mountPuzzlePiece(
  name,
  sideShapes,
  position = { x: 0, y: 0, z: zOffset },
  row = 0,
  col = 0,
  correctIndex = 0
) {
  const sideShapesFormatted = `top:${sideShapes.top};left:${sideShapes.left};bottom:${sideShapes.bottom};right:${sideShapes.right};row:${row};col:${col};correctIndex:${correctIndex}`;

  const sceneEl = document.querySelector("a-scene");
  const puzzleGroup = document.createElement("a-entity");
  puzzleGroup.setAttribute("id", name);
  puzzleGroup.setAttribute("puzzle-component", name);
  puzzleGroup.setAttribute("puzzle-piece", sideShapesFormatted);
  puzzleGroup.setAttribute("position", position);
  puzzleGroup.setAttribute("shadow", "cast:true;receive:true");
  puzzleGroup.setAttribute("class", "clickable");
  sceneEl.appendChild(puzzleGroup);
}

/**
 * Monta um background para os skeletons que serve como lixeira
 * @param {number} finalHeight - Altura final
 */
function mountTrashBox(finalHeight) {
  const ascene = document.querySelector("a-scene");
  const trashContainer = document.createElement("a-box");
  trashContainer.setAttribute("id", "trash-container");
  trashContainer.setAttribute("position", {
    x: 0,
    y: finalHeight + pieceSize / 2,
    z: zOffset - pieceDepth / 2,
  });
  trashContainer.setAttribute("width", pieceSize * cols + 0.5);
  trashContainer.setAttribute("height", pieceSize + 0.5);
  trashContainer.setAttribute("color", "red");
  trashContainer.setAttribute("opacity", "0.5");
  trashContainer.setAttribute("depth", "0.5");
  ascene.appendChild(trashContainer);
}

/**
 * Cria a forma da peça do quebra-cabeça com base nos formatos dos lados
 * IMPORTANTE: UV mapping fixo por peça - cada peça mostra apenas sua parte da imagem
 * @param {SideShapes} borderShapes - Formatos dos lados da peça
 * @param {number} row - Linha da peça no grid
 * @param {number} col - Coluna da peça no grid
 * @returns {THREE.Mesh} - Mesh 3D da peça do quebra-cabeça
 */
function createShape(borderShapes, row = 0, col = 0) {
  const pieceShape = new THREE.Shape();

  // face de baixo
  if (borderShapes.bottom === 1 || borderShapes.bottom === 2) {
    const bottomCurve = borderShapes.bottom;
    const yCurveCalc = pieceSize * 0.3;
    const ycurvepoints = bottomCurve === 1 ? yCurveCalc : -yCurveCalc;

    pieceShape.lineTo(pieceSize * 0.3, 0);
    pieceShape.bezierCurveTo(
      // ponto 1da
      pieceSize * 0.3,
      ycurvepoints,
      // ponto 2
      pieceSize * 0.7,
      ycurvepoints,
      // ponto 3d
      pieceSize * 0.7,
      0
    );
  }

  pieceShape.lineTo(pieceSize, 0);

  // face direita
  if (borderShapes.right === 1 || borderShapes.right === 2) {
    const rightCurve = borderShapes.right;
    const xcurvepoints = rightCurve === 1 ? pieceSize * 0.7 : pieceSize * 1.3;

    pieceShape.lineTo(pieceSize, pieceSize * 0.3);
    pieceShape.bezierCurveTo(
      // ponto 1
      xcurvepoints,
      pieceSize * 0.3,
      // ponto 2
      xcurvepoints,
      pieceSize * 0.7,
      // ponto 3d
      pieceSize,
      pieceSize * 0.7
    );
    pieceShape.lineTo(pieceSize, pieceSize);
  }

  pieceShape.lineTo(pieceSize, pieceSize);

  // face de cima
  if (borderShapes.top === 1 || borderShapes.top === 2) {
    const topCurve = borderShapes.top;
    const ycurvepoints = topCurve === 1 ? pieceSize * 0.7 : pieceSize * 1.3;

    pieceShape.lineTo(pieceSize * 0.7, pieceSize);
    pieceShape.bezierCurveTo(
      // ponto 1
      pieceSize * 0.7,
      ycurvepoints,
      // ponto 2
      pieceSize * 0.3,
      ycurvepoints,
      // ponto 3d
      pieceSize * 0.3,
      pieceSize
    );
  }

  pieceShape.lineTo(0, pieceSize);

  // face esquerda
  if (borderShapes.left === 1 || borderShapes.left === 2) {
    const leftCurve = borderShapes.left;
    const xCurveCalc = pieceSize * 0.3;
    const xcurvepoints = leftCurve === 1 ? xCurveCalc : -xCurveCalc;

    pieceShape.lineTo(0, pieceSize * 0.7);
    pieceShape.bezierCurveTo(
      // ponto 1
      xcurvepoints,
      pieceSize * 0.7,
      // ponto 2
      xcurvepoints,
      pieceSize * 0.3,
      // ponto 3d
      0,
      pieceSize * 0.3
    );
  }

  pieceShape.lineTo(0, 0);

  const extrudeSettings = {
    steps: 1,
    depth: pieceDepth,
    bevelEnabled: false,
  };
  const geometry = new THREE.ExtrudeGeometry(pieceShape, extrudeSettings);

  // Garantir grupos de materiais (frente, laterais, trás)
  if (!geometry.groups || geometry.groups.length === 0) {
    const shapePoints = pieceShape.extractPoints().shape;
    const trianglesFront = THREE.ShapeUtils.triangulateShape(shapePoints, []);
    const frontCount = trianglesFront.length * 3;
    const backCount = frontCount;
    const totalVertices = geometry.attributes.position.count;
    const sideCount = totalVertices - frontCount - backCount;

    geometry.clearGroups();
    geometry.addGroup(0, frontCount, 0); // frente com textura
    geometry.addGroup(frontCount, sideCount, 1); // laterais coloridas
    geometry.addGroup(frontCount + sideCount, backCount, 2); // trás
  }

  // Aplicar UV mapping global para esta peça
  applyUVMapping(geometry, row, col);

  // Criar materiais diferentes para cada grupo
  const materialFront = new THREE.MeshStandardMaterial({
    map: currentTexture || null,
    color: currentTexture ? 0xffffff : 0x156289,
    metalness: 0.1,
    roughness: 0.8,
  });

  const materialSide = new THREE.MeshStandardMaterial({
    color: 0x156289,
    flatShading: true,
  });

  const materialBack = new THREE.MeshStandardMaterial({
    color: 0x333333,
    flatShading: true,
  });

  const materials = [materialFront, materialSide, materialBack];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Aplica mapeamento UV para dividir a textura entre as peças
 * IMPORTANTE: Usa coordenadas globais do puzzle para mapeamento correto
 * incluindo protrusões e reentrâncias
 * @param {THREE.ExtrudeGeometry} geometry - Geometria da peça
 * @param {number} row - Linha da peça no grid
 * @param {number} col - Coluna da peça no grid
 */
function applyUVMapping(geometry, row, col) {
  const positionAttribute = geometry.getAttribute("position");
  let uvAttribute = geometry.getAttribute("uv");

  if (!positionAttribute) {
    console.warn("❌ Atributo de posição não encontrado");
    return;
  }

  // Criar atributo UV se não existir
  if (!uvAttribute) {
    const uvArray = new Float32Array(positionAttribute.count * 2);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
    uvAttribute = geometry.attributes.uv;
  }

  // Tamanho total do puzzle (grid completo)
  const totalPuzzleSize = rows * pieceSize;

  // Mapear COORDENADAS GLOBAIS para UV
  // Cada vértice local da peça é convertido em coordenada global do puzzle
  for (let i = 0; i < positionAttribute.count; i++) {
    const xLocal = positionAttribute.getX(i);
    const yLocal = positionAttribute.getY(i);

    // Converter para coordenada global do puzzle
    const globalX = col * pieceSize + xLocal;
    const globalY = row * pieceSize + yLocal;

    // Normalizar para UV (0 a 1)
    const u = globalX / totalPuzzleSize;
    // INVERTER V para corrigir orientação (row 0 deve estar no topo da imagem)
    const v = 1.0 - globalY / totalPuzzleSize;

    uvAttribute.setXY(i, u, v);
  }

  uvAttribute.needsUpdate = true;

  console.log(
    `✅ UV global aplicado: peça [${row}, ${col}] → tamanho total: ${totalPuzzleSize.toFixed(
      2
    )}`
  );
}

/* === FUNCOES UTILITÁRIAS (criadas para ajudar na criação de outros metodos e do funcionamento) === */
/**
 * Gera um formato de lado aleatório (1 ou 2)
 * essa função ta limitada a retornar 1 ou 2 pois vai ser
 * usada para gerar lados que precisam de encaixe
 * @returns {SideType} - Formato do lado (1 ou 2)
 */
function randomSideShape() {
  return Math.random() > 0.5 ? 1 : 2;
}

/**
 * Gera array de índices embaralhados sem modificar os dados originais
 * @param {number} total - Quantidade total de elementos
 * @returns {Array<number>} - Array de índices embaralhados
 */
function getShuffledOrder(total) {
  const arr = [...Array(total).keys()];
  return embaralharArray(arr);
}

/**
 * Embaralha um array utilizando o algoritmo de Fisher-Yates
 * esse método cria uma cópia do array original para manter
 * o array original intacto
 * @param {Array} array - Array a ser embaralhado
 * @returns {Array} - Novo array embaralhado
 */
function embaralharArray(array) {
  const copia = [...array]; // cria uma cópia para manter o original intacto

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

/**
 * Mostra uma mensagem de erro na tela por 2 segundos
 */
function showErrorMessage() {
  const error = document.querySelector("#error");
  error.setAttribute("visible", "true");

  setTimeout(() => {
    error.setAttribute("visible", "false");
  }, 2000);
}

/**
 * Valida se duas peças de quebra-cabeça se encaixam
 * @param {SideType} sideA - Lado da peça A
 * @param {SideType} sideB - Lado da peça B
 * @returns {boolean} - Retorna verdadeiro se as peças se encaixam, falso caso contrário
 */
function validatePiecesFit(sideA, sideB) {
  return (
    (sideA === 1 && sideB === 2) ||
    (sideA === 2 && sideB === 1) ||
    (sideA === 0 && sideB === 0) ||
    (sideA === 1 && sideB === 1) ||
    (sideA === 0 && sideB === 1) ||
    (sideA === 1 && sideB === 0)
  );
}

/**
 * Tenta encaixar a peça no slot correto baseado em distância
 * @param {AFRAME.Element} pieceElement - Elemento da peça
 * @returns {boolean} - True se encaixou, false caso contrário
 */
function trySnap(pieceElement) {
  if (pieceElement.userData && pieceElement.userData.locked) {
    return false;
  }

  const correctIndex = pieceElement.userData.correctIndex;
  const slot = slots[correctIndex];

  const piecePos = pieceElement.getAttribute("position");
  const slotPos = slot.position;

  // Ajustar para considerar o offset da peça (centro vs canto)
  const adjustedSlotPos = {
    x: slotPos.x - pieceSize / 2,
    y: slotPos.y - pieceSize / 2,
    z: slotPos.z - pieceDepth / 2,
  };

  const distance = Math.sqrt(
    Math.pow(piecePos.x - adjustedSlotPos.x, 2) +
      Math.pow(piecePos.y - adjustedSlotPos.y, 2) +
      Math.pow(piecePos.z - adjustedSlotPos.z, 2)
  );

  // Se distância menor que threshold, encaixar
  if (distance < 0.5) {
    snap(pieceElement, adjustedSlotPos);
    return true;
  }

  return false;
}

/**
 * Encaixa a peça na posição correta
 * @param {AFRAME.Element} pieceElement - Elemento da peça
 * @param {Object} slotPosition - Posição do slot
 */
function snap(pieceElement, slotPosition) {
  pieceElement.setAttribute("position", slotPosition);
  pieceElement.setAttribute("rotation", { x: 0, y: 0, z: 0 });
  pieceElement.userData.locked = true;

  console.log(`Peça encaixada no slot ${pieceElement.userData.correctIndex}`);

  // Verificar se puzzle está completo
  checkPuzzleCompletion();
}

/**
 * Verifica se o puzzle está completo
 */
function checkPuzzleCompletion() {
  let completed = 0;
  const allPieces = document.querySelectorAll("[puzzle-piece]");

  allPieces.forEach((piece) => {
    if (piece.userData && piece.userData.locked) {
      completed++;
    }
  });

  if (completed === totalPieces) {
    console.log("🎉 Parabéns! Puzzle completo!");
    // Aqui você pode adicionar efeitos visuais, som, etc.
  }
}

/**
 * Move uma peça para uma posição específica no espaço 3D
 * @param {AFRAME.Element} pieceElement - O elemento A-Frame que representa a peça do quebra-cabeça.
 * @param {THREE.Vector3} skeletonPosition - A posição alvo no espaço 3D.
 * @param {string} skeletonName - O nome do esqueleto para o qual a peça está sendo movida.
 * @returns {void}
 */
function movePieceToPosition(pieceElement, skeletonPosition, skeletonName) {
  // Iniciar o timer na primeira jogada
  startTimer();

  const skeleton = skeletonName.split("-");
  const skeletonType = skeleton[0];
  const mountedArrayIndex = skeleton[1] - 1;
  const pieceName = pieceElement.getAttribute("puzzle-component");
  const pieceSelectedId = piecesForRender.find((p) => p.name === pieceName).id;
  const piece = pieces.find((p) => p.id === pieceSelectedId);

  // Se mover para a lixeira, remover a peça do array de peças posicionadas
  if (skeletonType === "trash") {
    const previousIndex = piecesUserMounted.findIndex(
      (p) => p && p.id === piece.id
    );
    if (previousIndex !== -1) {
      piecesUserMounted[previousIndex] = null;
    }
    // Garantir que não fique marcada como travada
    if (pieceElement.userData) {
      pieceElement.userData.locked = false;
    }
  }

  if (skeletonType === "skeleton") {
    const topPiece = piecesUserMounted[mountedArrayIndex + cols];
    const bottomPiece = piecesUserMounted[mountedArrayIndex - cols];
    const leftPiece = piecesUserMounted[mountedArrayIndex - 1];
    const rightPiece = piecesUserMounted[mountedArrayIndex + 1];

    // Ignora a própria peça ao validar encaixes (caso esteja sendo movida de outro slot)
    const invalidTop =
      topPiece &&
      topPiece.id !== piece.id &&
      !validatePiecesFit(piece.sides.top, topPiece.sides.bottom);
    const invalidRight =
      rightPiece &&
      rightPiece.id !== piece.id &&
      !validatePiecesFit(piece.sides.right, rightPiece.sides.left);
    const invalidBottom =
      bottomPiece &&
      bottomPiece.id !== piece.id &&
      !validatePiecesFit(piece.sides.bottom, bottomPiece.sides.top);
    const invalidLeft =
      leftPiece &&
      leftPiece.id !== piece.id &&
      !validatePiecesFit(piece.sides.left, leftPiece.sides.right);

    if (invalidTop || invalidRight || invalidBottom || invalidLeft) {
      showErrorMessage();
      return;
    }

    piecesUserMounted[mountedArrayIndex] = piece;
  }

  pieceElement.setAttribute("position", {
    x: skeletonPosition.x - pieceSize / 2,
    y: skeletonPosition.y - pieceSize / 2,
    z: skeletonPosition.z - pieceDepth / 2,
  });

  // Tentar encaixe automático
  trySnap(pieceElement);

  const fill = piecesUserMounted.includes(null);

  if (!fill) {
    console.log("🧩 Puzzle completo! Verificando...");

    console.log("piecesUserMounted", piecesUserMounted);
    console.log("piecesForRender", pieces);

    const isValid = piecesUserMounted.every((p, index) => {
      return p.id === pieces[index].id;
    });

    if (isValid) {
      console.log("🎉 Parabéns! Você completou o quebra-cabeça!");

      // Calcula pontos baseado no número de peças (100 pontos por peça)
      pontos = totalPieces * 100;
      console.log("🏆 Pontos obtidos:", pontos);

      // Mostrar modal de conclusão
      onPuzzleComplete();
    } else {
      console.log("❌ Quebra-cabeça incorreto, tente novamente!");
    }
  }
}

/* ========== COMPONENTES A-FRAME ========== */

/**
 * Componente A-Frame para criar uma peça de quebra-cabeça com lados personalizados
 * esse componente utiliza o THREE.ExtrudeGeometry para criar a geometria 3D
 * baseado nos formatos dos lados fornecidos.
 * @component puzzle-piece
 * @property {SideType} top - Formato do lado superior
 * @property {SideType} left - Formato do lado esquerdo
 * @property {SideType} bottom - Formato do lado inferior
 * @property {SideType} right - Formato do lado direito
 */
AFRAME.registerComponent("puzzle-piece", {
  schema: {
    top: { type: "int", default: 0 },
    left: { type: "int", default: 0 },
    bottom: { type: "int", default: 0 },
    right: { type: "int", default: 0 },
    row: { type: "int", default: 0 },
    col: { type: "int", default: 0 },
    correctIndex: { type: "int", default: 0 },
  },

  init: function () {
    const size = pieceSize;
    const depth = pieceDepth;
    const pieceShape = createShape(this.data, this.data.row, this.data.col);
    const position = this.el.getAttribute("position");

    console.log(
      `Criando peça: row=${this.data.row}, col=${
        this.data.col
      }, textura=${!!currentTexture}`
    );

    // Armazenar correctIndex no userData para verificação de encaixe
    this.el.userData = this.el.userData || {};
    this.el.userData.correctIndex = this.data.correctIndex;
    this.el.userData.locked = false;

    this.el.setObject3D("mesh", pieceShape);
    this.el.setAttribute("position", {
      x: position.x - size / 2,
      y: position.y - size / 2,
      z: position.z - depth / 2,
    });
  },
});

/**
 * Componente A-Frame para gerenciar a interação com peças do quebra-cabeça
 * e esferas do esqueleto. Permite selecionar e mover peças com base na lógica
 * de seleção de linha.
 * @component puzzle-component
 * @property {string} - Nome do componente, usado para identificar peças e esferas
 * @requires raycaster - Dependência para detecção de cliques
 */
AFRAME.registerComponent("puzzle-component", {
  dependencies: ["raycaster"],
  schema: { type: "string", default: "none" },

  init: function () {
    let clickTimeoutId = null;

    this.el.addEventListener("mouseenter", () => {
      this.handleMouseEnter(this.el, this.data);
    });

    this.el.addEventListener("mouseleave", () => {
      this.handleMouseLeave();
    });

    this.el.addEventListener("click", () => {
      this.handleMouseClick();
    });

    // this.el.addEventListener("click", () => {
    //   const prefixName = this.data.split("-")[0];

    //   if (
    //     lineSelection.active &&
    //     prefixName === "piece" &&
    //     lineSelection.initalElementName !== this.data
    //   ) {
    //     return;
    //   }

    //   if (
    //     lineSelection.active &&
    //     lineSelection.initalElementName === this.data
    //   ) {
    //     lineSelection.reset();
    //     return;
    //   }

    //   if (
    //     lineSelection.active &&
    //     lineSelection.initalElementName !== this.data
    //   ) {
    //     movePieceToPosition(
    //       lineSelection.selectedElement,
    //       currentPosition,
    //       this.data
    //     );
    //     lineSelection.reset();
    //     return;
    //   }

    //   if (!lineSelection.active && prefixName === "piece") {
    //     lineSelection.setStart(
    //       {
    //         x: currentPosition.x + pieceSize / 2,
    //         y: currentPosition.y + pieceSize / 2,
    //         z: currentPosition.z + pieceDepth / 2,
    //       },
    //       this.data,
    //       this.el
    //     );
    //   }
    // });
  },
  /**
   * Manipula o evento de mouseenter na peça, iniciando um timeout de clique
   * e atualizando a aparência do cursor.
   * @param {HTMLElement} element
   * @param {string} name
   */
  handleMouseEnter: function () {
    const timeoutDuration = piecesUserMounted.find(
      (piece) => piece?.name === this.data
    )
      ? 1000
      : 500;

    cursor.setAttribute("animation__fill", {
      property: "geometry.radiusInner",
      to: "0",
      dur: timeoutDuration,
      easing: "linear",
    });

    if (this.clickTimeoutId) {
      clearTimeout(this.clickTimeoutId);
    }

    this.clickTimeoutId = setTimeout(() => {
      this.el.emit("click");
      this.clickTimeoutId = null;
    }, timeoutDuration);
  },
  /**
   * Manipula o evento de mouseleave na peça, cancelando o timeout de clique
   * e resetando a aparência do cursor.
   */
  handleMouseLeave: function () {
    if (this.clickTimeoutId) {
      clearTimeout(this.clickTimeoutId);
      this.clickTimeoutId = null;
    }

    cursor.removeAttribute("animation__fill");
    cursor.setAttribute("geometry", {
      primitive: "ring",
      radiusInner: 0.015,
      radiusOuter: 0.02,
    });
  },
  /**
   * Lógica que ocorre quando a peça é clicada
   */
  handleMouseClick: function () {
    const currentPosition = this.el.getAttribute("position");
    const prefixName = this.data.split("-")[0];

    // Se R está pressionado e é uma peça, rotacionar
    if (isRotateKeyPressed && prefixName === "piece") {
      const currentRotation = this.el.getAttribute("rotation");
      this.el.setAttribute("rotation", {
        x: currentRotation.x,
        y: currentRotation.y,
        z: currentRotation.z + 90,
      });
      return;
    }

    if (
      lineSelection.active &&
      prefixName === "piece" &&
      lineSelection.initalElementName !== this.data
    ) {
      return;
    }

    if (lineSelection.active && lineSelection.initalElementName === this.data) {
      lineSelection.reset();
      return;
    }

    if (lineSelection.active && lineSelection.initalElementName !== this.data) {
      movePieceToPosition(
        lineSelection.selectedElement,
        currentPosition,
        this.data
      );
      lineSelection.reset();
      return;
    }

    if (!lineSelection.active && prefixName === "piece") {
      lineSelection.setStart(
        {
          x: currentPosition.x + pieceSize / 2,
          y: currentPosition.y + pieceSize / 2,
          z: currentPosition.z + pieceDepth / 2,
        },
        this.data,
        this.el
      );
    }
  },
});

/**
 * Componente A-Frame para gerenciar a posição do cursor e atualizar a linha de seleção
 * conforme o cursor se move. Se uma linha de seleção estiver ativa, o ponto final
 * da linha será atualizado para a posição atual do cursor.
 * @component cursor-ring
 * @requires raycaster - Dependência para detecção de interseções
 */
AFRAME.registerComponent("cursor-ring", {
  init: function () {
    this.lastPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(this.lastPosition);
  },
  tick: function () {
    const currentPosition = new THREE.Vector3();

    this.el.object3D.getWorldPosition(currentPosition);

    if (lineSelection.active) {
      lineSelection.setEnd(currentPosition);
    }
  },
});
