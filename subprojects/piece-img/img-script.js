AFRAME.registerComponent("triangulo", {
  init: function () {
    const triangulo = new THREE.Shape();
    const depth = 1;

    triangulo.lineTo(0, 0.8);
    triangulo.quadraticCurveTo(0, 1, 0.2, 1);
    triangulo.lineTo(1, 1);

    const extrudeSettings = {
      steps: 1,
      depth: depth,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(triangulo, extrudeSettings);

    // Material padrão
    const material = new THREE.MeshStandardMaterial({
      color: 0x156289,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.el.setObject3D("mesh", mesh);
  },
});

function applyPuzzleUV(geometry, shape, row, col, gridSize) {
  geometry.computeBoundingBox();

  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  const bb = geometry.boundingBox;

  const pieceSizeX = bb.max.x - bb.min.x;
  const pieceSizeY = bb.max.y - bb.min.y;

  const offsetU = col / gridSize;
  const offsetV = row / gridSize;
  const scale = 1 / gridSize;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    const u = ((x - bb.min.x) / pieceSizeX) * scale + offsetU;
    const v = ((y - bb.min.y) / pieceSizeY) * scale + offsetV;

    uv.setXY(i, u, v);
  }

  uv.needsUpdate = true;
}

AFRAME.registerComponent("cubo-peca", {
  schema: {
    top: { type: "int", default: 0 },
    left: { type: "int", default: 0 },
    bottom: { type: "int", default: 0 },
    right: { type: "int", default: 0 },

    row: { type: "int", default: 0 }, // 0 = linha superior
    col: { type: "int", default: 0 }, // 0 = coluna esquerda
    grid: { type: "int", default: 4 }, // puzzle NxN (ex: 4)
    size: { type: "number", default: 1 }, // tamanho base da peça (o mesmo usado internamente)
    depth: { type: "number", default: 0.3 }, // profundidade da extrusão
    textureSrc: { type: "string", default: "../../images/puzzle1.jpg" }, // caminho da imagem
  },

  init: function () {
    const size = this.data.size;
    const depth = this.data.depth;
    const grid = this.data.grid;
    const row = this.data.row;
    const col = this.data.col;
    const textureSrc = this.data.textureSrc;

    // -------------------------------
    // 1) Construção do Shape (sua lógica)
    // -------------------------------
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);

    // face de baixo
    if (this.data.bottom === 1 || this.data.bottom === 2) {
      const bottomCurve = this.data.bottom;
      const yCurve = bottomCurve === 1 ? size * 0.3 : -size * 0.3;
      shape.lineTo(size * 0.3, 0);
      shape.bezierCurveTo(
        size * 0.3,
        yCurve,
        size * 0.7,
        yCurve,
        size * 0.7,
        0
      );
    }
    shape.lineTo(size, 0);

    // face direita
    if (this.data.right === 1 || this.data.right === 2) {
      const rightCurve = this.data.right;
      const xCurve = rightCurve === 1 ? size * 1.3 : size * 0.7;
      shape.lineTo(size, size * 0.3);
      shape.bezierCurveTo(
        xCurve,
        size * 0.3,
        xCurve,
        size * 0.7,
        size,
        size * 0.7
      );
    }
    shape.lineTo(size, size);

    // face de cima
    if (this.data.top === 1 || this.data.top === 2) {
      const topCurve = this.data.top;
      const yCurve = topCurve === 1 ? size * 1.3 : size * 0.7;
      shape.lineTo(size * 0.7, size);
      shape.bezierCurveTo(
        size * 0.7,
        yCurve,
        size * 0.3,
        yCurve,
        size * 0.3,
        size
      );
    }
    shape.lineTo(0, size);

    // face esquerda
    if (this.data.left === 1 || this.data.left === 2) {
      const leftCurve = this.data.left;
      const xCurve = leftCurve === 1 ? -size * 0.3 : size * 0.3;
      shape.lineTo(0, size * 0.7);
      shape.bezierCurveTo(
        xCurve,
        size * 0.7,
        xCurve,
        size * 0.3,
        0,
        size * 0.3
      );
    }

    shape.lineTo(0, 0);

    // -------------------------------
    // 2) Criar extrude geometry
    // -------------------------------
    const extrudeSettings = {
      steps: 1,
      depth: depth,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // -------------------------------
    // 3) Garantir groups: extrude pode não ter groups — recria se necessário
    //    (0 = frente, 1 = laterais, 2 = trás)
    // -------------------------------
    if (!geometry.groups || geometry.groups.length === 0) {
      // triangula o shape 2D para descobrir quantos triângulos na tampa
      const shapePoints = shape.extractPoints().shape;
      const trianglesFront = THREE.ShapeUtils.triangulateShape(shapePoints, []);
      const frontCount = trianglesFront.length * 3; // 3 indices por triângulo

      const backCount = frontCount;
      const totalVertices = geometry.attributes.position.count;
      const sideCount = totalVertices - frontCount - backCount;

      geometry.clearGroups();
      geometry.addGroup(0, frontCount, 0); // front
      geometry.addGroup(frontCount, sideCount, 1); // sides
      geometry.addGroup(frontCount + sideCount, backCount, 2); // back
    }
    // se já existirem groups, vamos mantê-los (assumimos que seguem a ordem padrão).

    // -------------------------------
    // 4) Reescrever UVs usando COORDENADA GLOBAL do quebra-cabeça
    //    (assim protrusões/reflexões amostram a região correta da imagem)
    // -------------------------------
    // Observação de coordenadas:
    // - Cada peça localmente tem x ∈ [minX, maxX] (pode ir além de 0..size por saliências)
    // - O "globalX" é: col * size + x_local
    // - Para Y: assumimos row = 0 é a linha superior do puzzle.
    //   Como o espaço y cresce para cima, calculamos globalY de modo que row 0 esteja no topo:
    //   globalY = (grid - 1 - row) * size + y_local
    // - UV final: u = globalX / (grid * size)
    //             v = globalY / (grid * size)
    //   (v = 0 => fundo da imagem, v = 1 => topo)
    // Ajuste se sua imagem estiver invertida verticalmente.

    const posAttr = geometry.attributes.position;
    let uvAttr = geometry.attributes.uv;

    if (!uvAttr) {
      const uvArray = new Float32Array(posAttr.count * 2);
      geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
      uvAttr = geometry.attributes.uv;
    }

    const totalPuzzleSize = grid * size;

    for (let i = 0; i < posAttr.count; i++) {
      const xLocal = posAttr.getX(i);
      const yLocal = posAttr.getY(i);

      const globalX = col * size + xLocal;

      // row = 0 agora é a base
      const globalY = row * size + yLocal;

      const u = globalX / totalPuzzleSize;
      const v = globalY / totalPuzzleSize;
      // Se precisar inverter verticalmente:
      // const v = 1 - (globalY / totalPuzzleSize);

      uvAttr.setXY(i, u, v);
    }

    uvAttr.needsUpdate = true;

    // -------------------------------
    // 5) Carregar textura e criar materiais
    // -------------------------------
    const loader = new THREE.TextureLoader();
    const texture = loader.load(textureSrc);
    // melhorar filtragem para evitar seams em junções finas
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;

    const materialFront = new THREE.MeshStandardMaterial({
      map: texture,
      // só desenha nas faces que tiverem materialIndex correspondente
      // as tampas terão o materialIndex 0 (conforme groups)
      transparent: false,
    });

    const materialSide = new THREE.MeshStandardMaterial({
      color: 0x156289,
      flatShading: true,
    });

    const materialBack = new THREE.MeshStandardMaterial({
      color: 0x333333,
      flatShading: true,
    });

    // Se o extrude gerar apenas 2 materiais por padrão (front + sides),
    // ainda podemos passar 3; Three usará indices conforme groups.
    const materials = [materialFront, materialSide, materialBack];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // opcional: centrar pivô no meio do puzzle (se você quiser)
    // mesh.position.set(- (grid*size)/2, - (grid*size)/2, 0);

    this.el.setObject3D("mesh", mesh);
  },
});
