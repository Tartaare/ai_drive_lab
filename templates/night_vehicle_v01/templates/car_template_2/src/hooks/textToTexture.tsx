// export default function SpriteFromText(text: string) {
//   const canvas = document.createElement("canvas");
//   canvas.width = 256;
//   canvas.height = 256;

//   const ctx = canvas.getContext("2d");
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   ctx.font = "30pt Arial";
//   ctx.fillStyle = "white";
//   ctx.textAlign = "center";
//   ctx.fillText("textontexture", 0, 30);

//   const tex = new THREE.Texture(canvas);
//   tex.needsUpdate = true;

//   const spriteMat = new THREE.SpriteMaterial({ map: tex });
//   const sprite = new THREE.Sprite(spriteMat);

//   return sprite;
// }
