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

AFRAME.registerComponent("cubo-peca", {
  schema: {
    top: { type: "int", default: 0 },
    left: { type: "int", default: 0 },
    bottom: { type: "int", default: 0 },
    right: { type: "int", default: 0 },
  },

  init: function () {
    const size = 1;
    const depth = 1;
    const hearthShape = new THREE.Shape();

    // face de baixo
    if (this.data.bottom === 1 || this.data.bottom === 2) {
      const bottomCurve = this.data.bottom;
      const yCurveCalc = size * 0.3;
      const ycurvepoints = bottomCurve === 1 ? yCurveCalc : -yCurveCalc;

      hearthShape.lineTo(size * 0.3, 0);
      hearthShape.bezierCurveTo(
        // ponto 1da
        size * 0.3,
        ycurvepoints,
        // ponto 2
        size * 0.7,
        ycurvepoints,
        // ponto 3d
        size * 0.7,
        0
      );
    }

    hearthShape.lineTo(size, 0);

    // face direita
    if (this.data.right === 1 || this.data.right === 2) {
      const rightCurve = this.data.right;
      const xcurvepoints = rightCurve === 1 ? size * 0.7 : size * 1.3;

      hearthShape.lineTo(size, size * 0.3);
      hearthShape.bezierCurveTo(
        // ponto 1
        xcurvepoints,
        size * 0.3,
        // ponto 2
        xcurvepoints,
        size * 0.7,
        // ponto 3d
        size,
        size * 0.7
      );
      hearthShape.lineTo(size, size);
    }

    hearthShape.lineTo(size, size);

    // face de cima
    if (this.data.top === 1 || this.data.top === 2) {
      const topCurve = this.data.top;
      const ycurvepoints = topCurve === 1 ? size * 0.7 : size * 1.3;

      hearthShape.lineTo(size * 0.7, size);
      hearthShape.bezierCurveTo(
        // ponto 1
        size * 0.7,
        ycurvepoints,
        // ponto 2
        size * 0.3,
        ycurvepoints,
        // ponto 3d
        size * 0.3,
        size
      );
    }

    hearthShape.lineTo(0, size);

    // face esquerda
    if (this.data.left === 1 || this.data.left === 2) {
      const bottomCurve = this.data.left;
      const xCurveCalc = size * 0.3;
      const xcurvepoints = bottomCurve === 1 ? xCurveCalc : -xCurveCalc;

      hearthShape.lineTo(0, size * 0.7);
      hearthShape.bezierCurveTo(
        // ponto 1
        xcurvepoints,
        size * 0.7,
        // ponto 2
        xcurvepoints,
        size * 0.3,
        // ponto 3d
        0,
        size * 0.3
      );
    }

    hearthShape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: depth,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(hearthShape, extrudeSettings);

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
