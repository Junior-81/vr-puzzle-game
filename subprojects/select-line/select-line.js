class Line {
  constructor() {
    this.active = false;
    this.element = document.querySelector("#line");
    this.initalElementName = null;
  }

  setStart(position, name) {
    this.element.setAttribute("line", { start: position });
    this.initalElementName = name;
    this.active = true;
  }

  setEnd(position) {
    this.element.setAttribute("line", { end: position });
    this.active = true;
  }

  reset() {
    this.element.setAttribute("line", { start: "0 0 0", end: "0 0 0" });
    this.active = false;
    this.initalElementName = null;
  }
}

const lineSelection = new Line();
const cursor = document.querySelector("#cursor");
const box2 = document.querySelector("#box2");
const box1 = document.querySelector("#box1");

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

AFRAME.registerComponent("component", {
  dependencies: ["raycaster"],
  schema: { type: "string", default: "none" },

  init: function () {
    const currentPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(currentPosition);

    this.el.addEventListener("click", () => {
      // log de debug
      console.log("Clicou na caixa", this.data);

      if (
        lineSelection.active &&
        lineSelection.initalElementName === this.data
      ) {
        console.log("Mesma caixa");
        lineSelection.reset();
        return;
      }

      if (
        lineSelection.active &&
        lineSelection.initalElementName !== this.data
      ) {
        console.log("Caixa diferente");
        lineSelection.setEnd(currentPosition);
        lineSelection.active = false;
        return;
      }

      if (!lineSelection.active) {
        lineSelection.setStart(currentPosition, this.data);
      }
    });
  },
});
