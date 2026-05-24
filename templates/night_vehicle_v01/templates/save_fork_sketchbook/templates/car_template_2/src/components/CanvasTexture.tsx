import { Texture } from "three";

class CanvasTexture {
  private _canvas: HTMLCanvasElement;
  private _context2D: CanvasRenderingContext2D;

  private _parentTextures: Texture[]; // todo replace on Map with key (Texture.id / Texture.uuid)

  private _background: HTMLImageElement;

  private _crossX: number = 0;
  private _crossY: number = 0;
  private _crossRadius: number = 50;
  private _crossMax: number = 47;
  private _crossMin: number = 4;
  private _crossThickness: number = 4;

  constructor(
    parentTexture: Texture = undefined,
    width: number = 1024,
    height: number = 1024
  ) {
    this._canvas = document.createElement("canvas");
    this._canvas.width = width;
    this._canvas.height = height;
    this._context2D = this._canvas.getContext("2d");

    // if (parentTexture) {
    //   this._parentTexture.push(parentTexture);
    //   parentTexture.image = this._canvas;
    // }
    this.addParentTexture(parentTexture);

    this._background = document.createElement("img");
    this._background.addEventListener("load", () => this._onImageLoad());
    this._background.crossOrigin = "";
    this._background.src = "/textures/uv_grid_opengl.jpg";

    this._draw();
  }

  private _onImageLoad() {
    this._canvas.width = this._background.naturalWidth;
    this._canvas.height = this._background.naturalHeight;

    this._crossRadius = Math.ceil(
      Math.min((this._canvas.width, this._canvas.height / 30))
    );
    this._crossMax = Math.ceil(0.70710678 * this._crossRadius);
    this._crossMin = Math.ceil(this._crossMax / 10);
    this._crossThickness = Math.ceil(this._crossMax / 10);

    this._draw();
  }

  private _draw() {
    if (!this._context2D) {
      return;
    }

    const c = this._context2D;

    c.clearRect(0, 0, this._canvas.width, this._canvas.height);

    c.drawImage(this._background, 0, 0);

    this._drawCross();

    for (let i = 0; i < this._parentTextures.length; i++) {
      this._parentTextures[i].needsUpdate = true;
    }
  }

  addParentTexture(parentTexture: Texture) {
    if (this._parentTextures.indexOf(parentTexture) === -1) {
      this._parentTextures.push(parentTexture);
      parentTexture.image = this._canvas;
    }
  }

  removeParentTexture(parentTexture: Texture) {
    const textureIndex = this._parentTextures.indexOf(parentTexture);

    if (textureIndex === -1) {
      return;
    }

    this._parentTextures.slice(textureIndex, 1);
    parentTexture.image = undefined;
  }

  setCrossPosition(x: number, y: number) {
    this._crossX = x * this._canvas.width;
    this._crossY = y * this._canvas.height;

    this._draw();
  }

  private _drawCross() {
    if (!this._context2D) {
      return;
    }

    const c = this._context2D;

    c.lineWidth = this._crossThickness * 3;
    c.strokeStyle = "#ffff00";

    c.beginPath();

    // top left line
    c.moveTo(
      this._crossX - this._crossMax - 2,
      this._crossY - this._crossMax - 2
    );
    c.lineTo(this._crossX - this._crossMin, this._crossY - this._crossMin);

    // bottom right line
    c.moveTo(this._crossX + this._crossMin, this._crossY + this._crossMin);
    c.lineTo(
      this._crossX + this._crossMax + 2,
      this._crossY + this._crossMax + 2
    );

    // bottom left line
    c.moveTo(
      this._crossX - this._crossMax - 2,
      this._crossY + this._crossMax + 2
    );
    c.lineTo(this._crossX - this._crossMin, this._crossY + this._crossMin);

    // top right line
    c.moveTo(this._crossX + this._crossMin, this._crossY - this._crossMin);
    c.lineTo(
      this._crossX + this._crossMax + 2,
      this._crossY - this._crossMax - 2
    );

    c.stroke();
  }
}