import { Emitter, logWarning, createHiDpiCanvas, updateCanvasSize, normalizedMousePosition, UniformInterface, BlotterError, pixelRatio, logError, Material, ensureHasRequiredDefaultUniforms, extractValidUniforms, glslSwizzle, glslDataType, blending } from './chunk-CXYC3ZAY.js';
export { Material, UniformInterface, pixelRatio, shaders_exports as shaders } from './chunk-CXYC3ZAY.js';
import * as THREE6 from 'three';

// src/utils/text-measurement.ts
var DEFAULT_TEXT_PROPERTIES = {
  family: "sans-serif",
  size: 12,
  leading: 1.5,
  fill: "#000",
  style: "normal",
  weight: 400,
  padding: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0
};
function ensurePropertyValues(properties = {}) {
  return { ...DEFAULT_TEXT_PROPERTIES, ...properties };
}
function stringifiedPadding(properties = {}) {
  const p = ensurePropertyValues(properties);
  const top = p.paddingTop || p.padding;
  const right = p.paddingRight || p.padding;
  const bottom = p.paddingBottom || p.padding;
  const left = p.paddingLeft || p.padding;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}
function lineHeightPixels(size, leading = DEFAULT_TEXT_PROPERTIES.leading) {
  if (typeof leading === "number") {
    return size * leading;
  }
  if (leading.includes("px")) {
    return Number.parseInt(leading, 10);
  }
  if (leading.includes("%")) {
    return Number.parseInt(leading, 10) / 100 * size;
  }
  const numeric = Number.parseFloat(leading);
  return Number.isNaN(numeric) ? size : size * numeric;
}
function sizeForText(textValue, properties = {}) {
  const p = ensurePropertyValues(properties);
  const el = document.createElement("span");
  el.textContent = textValue;
  el.style.display = "inline-block";
  el.style.fontFamily = p.family;
  el.style.fontSize = `${p.size}px`;
  el.style.fontWeight = String(p.weight);
  el.style.fontStyle = p.style;
  el.style.lineHeight = String(p.leading);
  el.style.maxWidth = "none";
  el.style.padding = stringifiedPadding(p);
  el.style.position = "absolute";
  el.style.width = "auto";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const size = { w: el.offsetWidth, h: el.offsetHeight };
  document.body.removeChild(el);
  return size;
}

// src/mapping/mapping.ts
var Mapping = class {
  constructor(texts, textBounds, width, height) {
    this._ratio = 1;
    this.texts = texts;
    this.textBounds = textBounds;
    this._width = width;
    this._height = height;
  }
  get ratio() {
    return this._ratio;
  }
  set ratio(ratio) {
    this._ratio = ratio || 1;
  }
  get width() {
    return this._width * this._ratio;
  }
  get height() {
    return this._height * this._ratio;
  }
  boundsForText(text) {
    const bounds = this.textBounds[text.id];
    if (!bounds) return void 0;
    return {
      w: bounds.w * this._ratio,
      h: bounds.h * this._ratio,
      x: bounds.x * this._ratio,
      y: bounds.y * this._ratio
    };
  }
  /**
   * Draws all texts into a canvas, Y-flipped for WebGL upload (same output
   * as the legacy dataURL round-trip, but synchronous via a second canvas).
   */
  toCanvas() {
    const canvas = createHiDpiCanvas(this._width, this._height, this._ratio);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new BlotterError("Mapping", "toCanvas", "2d context unavailable");
    }
    ctx.textBaseline = "middle";
    for (const text of this.texts) {
      const bounds = this.textBounds[text.id];
      if (!bounds) continue;
      const properties = text.properties;
      const halfLineHeight = lineHeightPixels(properties.size, properties.leading) / 2;
      ctx.font = `${properties.style} ${properties.weight} ${properties.size}px ${properties.family}`;
      ctx.save();
      ctx.translate(
        bounds.x + properties.paddingLeft,
        this._height - (bounds.y + bounds.h) + properties.paddingTop
      );
      ctx.fillStyle = properties.fill;
      ctx.fillText(text.value, 0, Math.round(halfLineHeight));
      ctx.restore();
    }
    const flipped = createHiDpiCanvas(this._width, this._height, this._ratio);
    const flippedCtx = flipped.getContext("2d", { alpha: false });
    if (!flippedCtx) {
      throw new BlotterError("Mapping", "toCanvas", "2d context unavailable");
    }
    flippedCtx.save();
    flippedCtx.scale(1, -1);
    flippedCtx.drawImage(
      canvas,
      0,
      this._height * -1,
      this._width,
      this._height
    );
    flippedCtx.restore();
    return flipped;
  }
};

// src/utils/id.ts
function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id;
}

// src/text.ts
var Text = class extends Emitter {
  constructor(value, properties = {}) {
    super();
    this.id = createId();
    this._value = value;
    this._properties = ensurePropertyValues(properties);
  }
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
    this.update();
  }
  get properties() {
    return this._properties;
  }
  set properties(properties) {
    this._properties = ensurePropertyValues(properties);
    this.update();
  }
  // Notify observers (a Blotter instance) that this text changed. Value and
  // properties writes call it automatically; call directly after bulk edits.
  update() {
    this.emit("update");
  }
};
function filterTexts(texts) {
  const array = texts instanceof Text ? [texts] : Array.from(texts ?? []);
  return array.filter((text) => {
    const isText = text instanceof Text;
    if (!isText) {
      logWarning("blotter", "filterTexts", "object must be instance of Text");
    }
    return isText;
  });
}

// src/utils/growing-packer.ts
var GrowingPacker = class {
  constructor() {
    this.root = { x: 0, y: 0, w: 0, h: 0 };
  }
  fit(blocks) {
    const first = blocks[0];
    this.root = { x: 0, y: 0, w: first?.w ?? 0, h: first?.h ?? 0 };
    for (const block of blocks) {
      const node = this.findNode(this.root, block.w, block.h);
      block.fit = node ? this.splitNode(node, block.w, block.h) : this.growNode(block.w, block.h);
    }
  }
  findNode(root, w, h) {
    if (root.used) {
      return root.right && this.findNode(root.right, w, h) || root.down && this.findNode(root.down, w, h) || null;
    }
    if (w <= root.w && h <= root.h) return root;
    return null;
  }
  splitNode(node, w, h) {
    node.used = true;
    node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
    node.right = { x: node.x + w, y: node.y, w: node.w - w, h };
    return node;
  }
  growNode(w, h) {
    const canGrowDown = w <= this.root.w;
    const canGrowRight = h <= this.root.h;
    const shouldGrowRight = canGrowRight && this.root.h >= this.root.w + w;
    const shouldGrowDown = canGrowDown && this.root.w >= this.root.h + h;
    if (shouldGrowRight) return this.growRight(w, h);
    if (shouldGrowDown) return this.growDown(w, h);
    if (canGrowRight) return this.growRight(w, h);
    if (canGrowDown) return this.growDown(w, h);
    return null;
  }
  growRight(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w + w,
      h: this.root.h,
      down: this.root,
      right: { x: this.root.w, y: 0, w, h: this.root.h }
    };
    const node = this.findNode(this.root, w, h);
    return node ? this.splitNode(node, w, h) : null;
  }
  growDown(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w,
      h: this.root.h + h,
      down: { x: 0, y: this.root.h, w: this.root.w, h },
      right: this.root
    };
    const node = this.findNode(this.root, w, h);
    return node ? this.splitNode(node, w, h) : null;
  }
};

// src/utils/scheduling.ts
function yieldToMain() {
  const scheduler = globalThis.scheduler;
  if (scheduler?.yield) {
    return scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// src/builders/mapping-builder.ts
async function buildMapping(texts) {
  await yieldToMain();
  const filtered = filterTexts(texts);
  const blocks = filtered.map((text) => {
    const size = sizeForText(text.value, text.properties);
    return { text, w: size.w, h: size.h };
  });
  blocks.sort((a, b) => b.w * b.h - a.w * a.h);
  const packer = new GrowingPacker();
  packer.fit(blocks);
  const textBounds = {};
  for (const block of blocks) {
    if (!block.fit) continue;
    textBounds[block.text.id] = {
      w: block.w,
      h: block.h,
      x: block.fit.x,
      y: packer.root.h - (block.fit.y + block.h)
    };
  }
  return new Mapping(filtered, textBounds, packer.root.w, packer.root.h);
}

// src/mapping/mapping-material.ts
function setValueAtIndex(data, i, descriptor) {
  const base = 4 * i;
  const value = descriptor.type === "1f" ? [descriptor.value] : descriptor.value;
  data[base] = value[0] ?? 0;
  data[base + 1] = value[1] ?? 0;
  data[base + 2] = value[2] ?? 0;
  data[base + 3] = value[3] ?? 0;
}
var MappingMaterial = class {
  constructor(mapping, material, shaderMaterial, userUniformDataTextureObjects) {
    this.mapping = mapping;
    this.material = material;
    this.shaderMaterial = shaderMaterial;
    const { data, texture, userUniforms } = userUniformDataTextureObjects;
    this.textUniformInterface = {};
    mapping.texts.forEach((text, textIndex) => {
      const interfaces = {};
      for (const [uniformName, entry] of Object.entries(userUniforms)) {
        const uniformIndex = entry.position + textIndex;
        const uniformInterface = new UniformInterface(
          entry.descriptor,
          "MappingMaterial"
        );
        uniformInterface.on("update", () => {
          setValueAtIndex(data, uniformIndex, uniformInterface.toDescriptor());
          texture.needsUpdate = true;
        });
        uniformInterface.value = entry.descriptor.value;
        interfaces[uniformName] = uniformInterface;
      }
      this.textUniformInterface[text.id] = interfaces;
    });
    this.uniformInterface = {};
    for (const [uniformName, entry] of Object.entries(userUniforms)) {
      const uniformInterface = new UniformInterface(
        entry.descriptor,
        "MappingMaterial"
      );
      uniformInterface.on("update", () => {
        for (const text of mapping.texts) {
          const textInterface = this.textUniformInterface[text.id]?.[uniformName];
          if (textInterface) textInterface.value = uniformInterface.value;
        }
        texture.needsUpdate = true;
      });
      this.uniformInterface[uniformName] = uniformInterface;
    }
  }
  get uniforms() {
    return this.material.uniforms;
  }
  get mainImage() {
    return this.material.mainImage;
  }
  get width() {
    return this.mapping.width;
  }
  get height() {
    return this.mapping.height;
  }
  get ratio() {
    return this.mapping.ratio;
  }
  boundsForText(text) {
    return this.mapping.boundsForText(text);
  }
};
function boundsDataForMapping(mapping) {
  const texts = mapping.texts;
  const data = new Float32Array(texts.length * 4);
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) continue;
    const bounds = mapping.boundsForText(text);
    if (!bounds) continue;
    data[4 * i] = bounds.x;
    data[4 * i + 1] = mapping.height - (bounds.y + bounds.h);
    data[4 * i + 2] = bounds.w;
    data[4 * i + 3] = bounds.h;
  }
  return data;
}
async function buildBoundsDataTexture(mapping) {
  await yieldToMain();
  const data = boundsDataForMapping(mapping);
  const texture = new THREE6.DataTexture(
    data,
    mapping.texts.length,
    1,
    THREE6.RGBAFormat,
    THREE6.FloatType
  );
  texture.colorSpace = THREE6.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// src/builders/fragment-source.ts
function buildVertexSource() {
  return (
    /* glsl */
    `
varying vec2 _vTexCoord;

void main() {
  _vTexCoord = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
  );
}
function buildFragmentSource(args) {
  const { userUniforms, textsLength, textureWidth, mainImage } = args;
  const halfPixel = textureWidth > 0 ? (1 / (textureWidth * 4) / 2).toFixed(20) : "0.0";
  const textureWidthStr = textureWidth.toFixed(1);
  const textsLengthStr = textsLength.toFixed(1);
  let publicUniformDeclarations = "";
  let publicUniformDefinitions = "";
  for (const [uniformName, entry] of Object.entries(userUniforms)) {
    const swizzle = glslSwizzle(entry.descriptor.type);
    const dataType = glslDataType(entry.descriptor.type);
    const samplePosition = `((${entry.position.toFixed(1)} + ((textIndex - ((1.0 / ${textsLengthStr}) / 2.0)) * ${textsLengthStr})) / ${textureWidthStr}) + ${halfPixel}`;
    publicUniformDeclarations += `${dataType} ${uniformName};
`;
    publicUniformDefinitions += `   ${uniformName} = texture2D(_userUniformsTexture, vec2(${samplePosition}, 0.5)).${swizzle};
`;
  }
  return [
    blending,
    // Private blotter defined uniforms.
    "uniform sampler2D _uSampler;",
    "uniform vec2 _uCanvasResolution;",
    "uniform sampler2D _uTextIndicesTexture;",
    "uniform sampler2D _uTextBoundsTexture;",
    // Private texCoord and bounds information.
    "varying vec2 _vTexCoord;",
    "vec4 _textBounds;",
    // Private storage for user defined and default uniform values.
    "uniform sampler2D _userUniformsTexture;",
    // Public versions of user defined and default uniform declarations.
    publicUniformDeclarations,
    /* glsl */
    `
// Helper used by user programs to retrieve texel color information within
// the bounds of any given text. Use instead of texture2D in mainImage.
vec4 textTexture(vec2 coord) {
   vec2 adjustedFragCoord = _textBounds.xy + vec2((_textBounds.z * coord.x), (_textBounds.w * coord.y));
   vec2 uv = adjustedFragCoord.xy / _uCanvasResolution;

   //  If adjustedFragCoord falls outside the bounds of the current texel's text, return vec4(0.0).
   if (adjustedFragCoord.x < _textBounds.x ||
       adjustedFragCoord.x > _textBounds.x + _textBounds.z ||
       adjustedFragCoord.y < _textBounds.y ||
       adjustedFragCoord.y > _textBounds.y + _textBounds.w) {
     return vec4(0.0);
   }

   return texture2D(_uSampler, uv);
}

void mainImage(out vec4 mainImage, in vec2 fragCoord);
`,
    mainImage,
    "void main(void) {",
    //  Retrieve text index and text alpha for the bounds containing this texel.
    "   vec4 textIndexData = texture2D(_uTextIndicesTexture, _vTexCoord);",
    "   float textIndex = textIndexData.r;",
    "   float textAlpha = textIndexData.a;",
    //  Make bounds for the current text globally visible.
    "   _textBounds = texture2D(_uTextBoundsTexture, vec2(textIndex, 0.5));",
    //  Set "uniform" values visible to user.
    publicUniformDefinitions,
    "   uResolution = _textBounds.zw;",
    //  Set fragment coordinate in respect to position within text bounds.
    "   vec2 fragCoord = gl_FragCoord.xy - _textBounds.xy;",
    "   vec4 outColor;",
    "   mainImage(outColor, fragCoord);",
    //  Zero alpha for texels outside every text area.
    "   outColor.a = outColor.a * textAlpha;",
    "   gl_FragColor = outColor;",
    "}"
  ].join("\n");
}
var SAMPLE_ACCURACY = 0.5;
function indicesDataForMapping(mapping, width, height, sampleAccuracy) {
  const ratio = mapping.ratio;
  const points = new Float32Array(width * height * 4);
  const indicesOffset = 1 / mapping.texts.length / 2;
  const boundsList = mapping.texts.map((text) => mapping.boundsForText(text));
  for (let i = 1; i < points.length / 4; i++) {
    const y = Math.ceil(i / width);
    const x = i - width * (y - 1);
    let refIndex = 0;
    let alpha = 0;
    for (let k = 0; k < boundsList.length; k++) {
      const bounds = boundsList[k];
      if (!bounds) continue;
      const bW = bounds.w / ratio * sampleAccuracy;
      const bH = bounds.h / ratio * sampleAccuracy;
      const bX = bounds.x / ratio * sampleAccuracy;
      const bY = bounds.y / ratio * sampleAccuracy;
      if (y >= bY && y <= bY + bH && x >= bX && x <= bX + bW) {
        refIndex = k / mapping.texts.length + indicesOffset;
        alpha = 1;
        break;
      }
    }
    const flippedIndex = (height - y) * width + (x - 1);
    points[4 * flippedIndex] = refIndex;
    points[4 * flippedIndex + 1] = 0;
    points[4 * flippedIndex + 2] = 0;
    points[4 * flippedIndex + 3] = alpha;
  }
  return points;
}
async function buildIndicesDataTexture(mapping) {
  await yieldToMain();
  const width = Math.floor(mapping.width / mapping.ratio * SAMPLE_ACCURACY);
  const height = Math.floor(mapping.height / mapping.ratio * SAMPLE_ACCURACY);
  const data = indicesDataForMapping(mapping, width, height, SAMPLE_ACCURACY);
  const texture = new THREE6.DataTexture(
    data,
    width,
    height,
    THREE6.RGBAFormat,
    THREE6.FloatType
  );
  texture.flipY = false;
  texture.colorSpace = THREE6.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
async function buildTextTexture(mapping) {
  const texture = new THREE6.CanvasTexture(mapping.toCanvas());
  texture.minFilter = THREE6.LinearFilter;
  texture.magFilter = THREE6.LinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = true;
  texture.colorSpace = THREE6.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// src/builders/mapping-material-builder.ts
function buildUserUniformDataTextureObjects(validUniforms, textsLength) {
  const names = Object.keys(validUniforms);
  const dataLength = names.length * textsLength;
  const data = new Float32Array(dataLength * 4);
  const texture = new THREE6.DataTexture(
    data,
    dataLength,
    1,
    THREE6.RGBAFormat,
    THREE6.FloatType
  );
  texture.colorSpace = THREE6.NoColorSpace;
  texture.needsUpdate = true;
  const userUniforms = {};
  names.forEach((name, index) => {
    const descriptor = validUniforms[name];
    if (!descriptor) return;
    userUniforms[name] = { descriptor, position: index * textsLength };
  });
  return { data, texture, userUniforms };
}
async function buildMappingMaterial(mapping, material) {
  const descriptors = {};
  for (const [name, uniformInterface] of Object.entries(material.uniforms)) {
    descriptors[name] = uniformInterface.toDescriptor();
  }
  ensureHasRequiredDefaultUniforms(
    descriptors,
    "blotter",
    "buildMappingMaterial"
  );
  const validUniforms = extractValidUniforms(descriptors);
  const [textTexture, indicesTexture, boundsTexture] = await Promise.all([
    buildTextTexture(mapping),
    buildIndicesDataTexture(mapping),
    buildBoundsDataTexture(mapping)
  ]);
  const userUniformDataTextureObjects = buildUserUniformDataTextureObjects(
    validUniforms,
    mapping.texts.length
  );
  const fragmentUniforms = {};
  for (const [name, entry] of Object.entries(
    userUniformDataTextureObjects.userUniforms
  )) {
    fragmentUniforms[name] = entry;
  }
  const threeMaterial = new THREE6.ShaderMaterial({
    vertexShader: buildVertexSource(),
    fragmentShader: buildFragmentSource({
      userUniforms: fragmentUniforms,
      textsLength: mapping.texts.length,
      textureWidth: userUniformDataTextureObjects.texture.image.width,
      mainImage: material.mainImage
    }),
    uniforms: {
      _uSampler: { value: textTexture },
      _uCanvasResolution: { value: [mapping.width, mapping.height] },
      _uTextIndicesTexture: { value: indicesTexture },
      _uTextBoundsTexture: { value: boundsTexture },
      _userUniformsTexture: { value: userUniformDataTextureObjects.texture }
    }
  });
  threeMaterial.depthTest = false;
  threeMaterial.depthWrite = false;
  threeMaterial.premultipliedAlpha = false;
  return new MappingMaterial(
    mapping,
    material,
    threeMaterial,
    userUniformDataTextureObjects
  );
}

// src/rendering/render-scope.ts
var MOUSE_EVENTS = [
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseenter",
  "mouseleave"
];
var RenderScope = class extends Emitter {
  constructor(text, blotter) {
    super();
    this.timeDelta = 0;
    this.frameCount = 0;
    this.uniformUnsubscribers = [];
    this.text = text;
    this.blotter = blotter;
    this.mappingMaterial = blotter.mappingMaterial;
    this.playing = blotter.autoplay;
    this.material = {
      mainImage: blotter.material.mainImage,
      uniforms: {}
    };
    this.domElement = createHiDpiCanvas(0, 0, blotter.ratio, {
      className: "b-canvas"
    });
    this.domElement.textContent = text.value;
    this.context = this.domElement.getContext("2d");
  }
  /**
   * @internal Re-derive canvas size, bounds, and uniform interfaces from
   * the current mapping material. Called by Blotter after each rebuild.
   */
  applyMapping() {
    const mappingMaterial = this.mappingMaterial;
    if (!mappingMaterial) return;
    const bounds = this.scopeBounds(mappingMaterial);
    if (!bounds) return;
    updateCanvasSize(
      this.domElement,
      bounds.w / this.blotter.ratio,
      bounds.h / this.blotter.ratio,
      this.blotter.ratio
    );
    this.domElement.textContent = this.text.value;
    this.bounds = bounds;
    const previousUniforms = this.material.uniforms;
    this.material.uniforms = this.buildUniformInterfaces(
      mappingMaterial.uniforms
    );
    this.material.mainImage = mappingMaterial.mainImage;
    this.transferInterfaceValues(previousUniforms, this.material.uniforms);
    this.emit(this.lastUpdated ? "update" : "ready");
    this.lastUpdated = Date.now();
  }
  play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  /** @internal Copy this text's atlas rectangle into the canvas. */
  render() {
    if (!this.bounds || !this.context) return;
    const imageData = this.blotter.imageData;
    if (!imageData) return;
    const now = Date.now();
    this.frameCount += 1;
    this.timeDelta = (now - (this.lastDrawTime || now)) / 1e3;
    this.lastDrawTime = now;
    this.context.clearRect(0, 0, this.domElement.width, this.domElement.height);
    this.context.putImageData(imageData, this.bounds.x, this.bounds.y);
    this.emit("render", this.frameCount);
  }
  appendTo(element) {
    element.appendChild(this.domElement);
    for (const eventName of MOUSE_EVENTS) {
      this.domElement.addEventListener(eventName, (event) => {
        this.emit(
          eventName,
          normalizedMousePosition(this.domElement, event)
        );
      });
    }
    return this;
  }
  scopeBounds(mappingMaterial) {
    const bounds = mappingMaterial.boundsForText(this.text);
    if (!bounds) return void 0;
    return {
      w: bounds.w,
      h: bounds.h,
      x: -1 * Math.floor(bounds.x),
      y: -1 * Math.floor(mappingMaterial.height - (bounds.y + bounds.h))
    };
  }
  buildUniformInterfaces(uniforms) {
    for (const unsubscribe of this.uniformUnsubscribers) unsubscribe();
    this.uniformUnsubscribers = [];
    const interfaces = {};
    for (const [uniformName, source] of Object.entries(uniforms)) {
      const uniformInterface = new UniformInterface(
        source.toDescriptor(),
        "RenderScope"
      );
      this.uniformUnsubscribers.push(
        uniformInterface.on(
          "update",
          () => this.emit("update:uniform", uniformName)
        )
      );
      interfaces[uniformName] = uniformInterface;
    }
    return interfaces;
  }
  // Carry user-set per-text values across a rebuild.
  transferInterfaceValues(previous, next) {
    for (const [uniformName, oldInterface] of Object.entries(previous)) {
      const newInterface = next[uniformName];
      if (newInterface && newInterface.type === oldInterface.type && newInterface.value !== oldInterface.value) {
        newInterface.value = oldInterface.value;
      }
    }
  }
};
var renderer = null;
function sharedRenderer() {
  if (!renderer) {
    renderer = new THREE6.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });
  }
  return renderer;
}
function isWebGLSupported() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

// src/rendering/renderer.ts
var Renderer = class extends Emitter {
  constructor() {
    super();
    this.scene = new THREE6.Scene();
    this.camera = new THREE6.OrthographicCamera(0.5, 0.5, 0.5, 0.5, 0, 100);
    this._width = 1;
    this._height = 1;
    this.animationFrame = null;
    this.loop = () => {
      const gl = sharedRenderer();
      gl.setRenderTarget(this.renderTarget);
      gl.render(this.scene, this.camera);
      gl.readRenderTargetPixels(
        this.renderTarget,
        0,
        0,
        this._width,
        this._height,
        this.imageDataArray
      );
      gl.setRenderTarget(null);
      this.emit("render");
      this.animationFrame = requestAnimationFrame(this.loop);
    };
    this.mesh = new THREE6.Mesh(
      new THREE6.PlaneGeometry(1, 1),
      new THREE6.MeshBasicMaterial()
      // Stub until a mapping material lands.
    );
    this.scene.add(this.mesh);
    this.setSize(1, 1);
  }
  set material(material) {
    if (material instanceof THREE6.Material) {
      this.mesh.material = material;
    }
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  setSize(width, height) {
    this._width = Math.trunc(width) || 1;
    this._height = Math.trunc(height) || 1;
    this.mesh.scale.set(this._width, this._height, 1);
    this.camera.left = this._width / -2;
    this.camera.right = this._width / 2;
    this.camera.top = this._height / 2;
    this.camera.bottom = this._height / -2;
    this.camera.updateProjectionMatrix();
    this.renderTarget?.dispose();
    this.renderTarget = new THREE6.WebGLRenderTarget(this._width, this._height, {
      minFilter: THREE6.LinearFilter,
      magFilter: THREE6.LinearFilter,
      format: THREE6.RGBAFormat,
      type: THREE6.UnsignedByteType
    });
    this.renderTarget.texture.generateMipmaps = false;
    const viewBuffer = new ArrayBuffer(this._width * this._height * 4);
    this.imageDataArray = new Uint8Array(viewBuffer);
    this.imageData = new ImageData(
      new Uint8ClampedArray(viewBuffer),
      this._width,
      this._height
    );
  }
  start() {
    if (this.animationFrame === null) {
      this.loop();
    }
  }
  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  teardown() {
    this.stop();
    this.renderTarget.dispose();
  }
};

// src/blotter.ts
var Blotter = class extends Emitter {
  constructor(material, options = {}) {
    super();
    this._texts = [];
    this.scopes = {};
    this.renderer = new Renderer();
    this.startTime = 0;
    this.lastDrawTime = 0;
    this.lastUpdated = 0;
    this.textUnsubscribers = {};
    this.materialUnsubscribers = [];
    this.buildPromise = null;
    this.buildQueued = false;
    if (!isWebGLSupported()) {
      throw new BlotterError(
        "Blotter",
        void 0,
        "device does not support webgl"
      );
    }
    this.ratio = options.ratio ?? pixelRatio();
    this.autobuild = options.autobuild ?? true;
    this.autostart = options.autostart ?? true;
    this.autoplay = options.autoplay ?? true;
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.setMaterial(material);
    this.addTexts(options.texts ?? []);
    this.renderer.on("render", () => this.onRendered());
    if (this.autobuild) {
      this.update().catch((error) => {
        logError("Blotter", "update", String(error));
      });
    }
    if (this.autostart) {
      this.start();
    }
  }
  get material() {
    return this._material;
  }
  set material(material) {
    this.setMaterial(material);
  }
  get texts() {
    return this._texts;
  }
  get imageData() {
    return this.renderer.imageData;
  }
  setMaterial(material) {
    if (!(material instanceof Material)) {
      throw new BlotterError(
        "Blotter",
        "setMaterial",
        "argument must be an instance of Material"
      );
    }
    for (const unsubscribe of this.materialUnsubscribers) unsubscribe();
    this._material = material;
    this.materialUnsubscribers = [
      material.on("update", () => {
        void this.update();
      }),
      material.on(
        "update:uniform",
        (uniformName) => this.updateUniformValue(uniformName)
      )
    ];
  }
  addText(text) {
    this.addTexts(text);
  }
  addTexts(texts) {
    const filtered = filterTexts(texts);
    const newTexts = filtered.filter((text) => !this._texts.includes(text));
    for (const text of newTexts) {
      this._texts.push(text);
      const scope = new RenderScope(text, this);
      this.scopes[text.id] = scope;
      this.textUnsubscribers[text.id] = [
        text.on("update", () => {
          void this.update();
        }),
        scope.on(
          "update:uniform",
          (uniformName) => this.updateTextUniformValue(text.id, uniformName)
        )
      ];
    }
  }
  removeText(text) {
    this.removeTexts(text);
  }
  removeTexts(texts) {
    const filtered = filterTexts(texts);
    const removed = this._texts.filter((text) => filtered.includes(text));
    for (const text of removed) {
      this._texts = this._texts.filter((existing) => existing !== text);
      for (const unsubscribe of this.textUnsubscribers[text.id] ?? []) {
        unsubscribe();
      }
      delete this.textUnsubscribers[text.id];
      delete this.scopes[text.id];
    }
  }
  /**
   * Rebuild the atlas and shader from the current texts and material.
   * Concurrent calls coalesce: one build runs at a time, with at most one
   * trailing rebuild queued. Emits "ready" on the first completion,
   * "update" on later ones.
   */
  update() {
    if (this.buildPromise) {
      this.buildQueued = true;
      return this.buildPromise;
    }
    this.buildPromise = (async () => {
      try {
        do {
          this.buildQueued = false;
          await this.build();
        } while (this.buildQueued);
      } finally {
        this.buildPromise = null;
      }
    })();
    return this.buildPromise;
  }
  start() {
    this.autostart = true;
    this.startTime = Date.now();
    this.renderer.start();
  }
  stop() {
    this.autostart = false;
    this.renderer.stop();
  }
  teardown() {
    this.renderer.teardown();
    for (const unsubscribe of this.materialUnsubscribers) unsubscribe();
    for (const unsubscribers of Object.values(this.textUnsubscribers)) {
      for (const unsubscribe of unsubscribers) unsubscribe();
    }
    this.textUnsubscribers = {};
    this.removeAllListeners();
  }
  forText(text) {
    const scope = this.scopes[text.id];
    if (!scope) {
      logError("Blotter", "forText", "Text object not found in blotter");
      return void 0;
    }
    return scope;
  }
  boundsForText(text) {
    if (!this.scopes[text.id]) {
      logError("Blotter", "boundsForText", "Text object not found in blotter");
      return void 0;
    }
    return this.mappingMaterial?.boundsForText(text);
  }
  async build() {
    const mapping = await buildMapping(this._texts);
    mapping.ratio = this.ratio;
    const mappingMaterial = await buildMappingMaterial(mapping, this._material);
    this.mappingMaterial = mappingMaterial;
    this.renderer.stop();
    for (const scope of Object.values(this.scopes)) {
      scope.mappingMaterial = mappingMaterial;
      scope.applyMapping();
    }
    this.renderer.material = mappingMaterial.shaderMaterial;
    this.renderer.setSize(mapping.width, mapping.height);
    if (this.autostart) {
      this.start();
    }
    if (this.lastUpdated) {
      this.emit("update");
    } else {
      this.emit("ready");
      this.resolveReady(this);
    }
    this.lastUpdated = Date.now();
  }
  onRendered() {
    const now = Date.now();
    const uniforms = this._material.uniforms;
    if (uniforms.uTimeDelta) {
      uniforms.uTimeDelta.value = (now - (this.lastDrawTime || now)) / 1e3;
    }
    if (uniforms.uGlobalTime) {
      uniforms.uGlobalTime.value = (now - this.startTime) / 1e3;
    }
    this.lastDrawTime = now;
    for (const scope of Object.values(this.scopes)) {
      if (scope.playing) {
        scope.render();
      }
    }
    this.emit("render");
  }
  updateUniformValue(uniformName) {
    const target = this.mappingMaterial?.uniformInterface[uniformName];
    const source = this._material.uniforms[uniformName];
    if (target && source) {
      target.value = source.value;
    }
  }
  updateTextUniformValue(textId, uniformName) {
    const target = this.mappingMaterial?.textUniformInterface[textId]?.[uniformName];
    const source = this.scopes[textId]?.material.uniforms[uniformName];
    if (target && source) {
      target.value = source.value;
    }
  }
};

// src/shader-material.ts
var ShaderMaterial2 = class extends Material {
  constructor(mainImage, options = {}) {
    super({ ...options, mainImage });
  }
};

export { Blotter, RenderScope, ShaderMaterial2 as ShaderMaterial, Text, filterTexts, isWebGLSupported };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map