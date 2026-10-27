var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/canvas.ts
function pixelRatio() {
  return typeof window !== "undefined" && window.devicePixelRatio || 1;
}
function applyCanvasOptions(canvas, options) {
  if (options.className !== void 0) canvas.className = options.className;
  if (options.fallbackHtml !== void 0)
    canvas.innerHTML = options.fallbackHtml;
}
function createHiDpiCanvas(width, height, ratio = pixelRatio(), options = {}) {
  const canvas = document.createElement("canvas");
  applyCanvasOptions(canvas, options);
  updateCanvasSize(canvas, width, height, ratio);
  return canvas;
}
function updateCanvasSize(canvas, width, height, ratio = 1) {
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function mousePosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}
function normalizedMousePosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const position = mousePosition(canvas, event);
  return {
    x: position.x / rect.width,
    y: position.y / rect.height
  };
}

// src/core/errors.ts
function formatMessage(domain, method, message) {
  return `${domain}${method ? `#${method}` : ""}: ${message}`;
}
var BlotterError = class extends Error {
  constructor(domain, method, message) {
    super(formatMessage(domain, method, message));
    this.name = "BlotterError";
    this.domain = domain;
    this.method = method;
  }
};
function logError(domain, method, message) {
  console.error(formatMessage(domain, method, message));
}
function logWarning(domain, method, message) {
  console.warn(formatMessage(domain, method, message));
}

// src/core/event-emitter.ts
var Emitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  on(event, listener) {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = [];
      this.listeners.set(event, bucket);
    }
    bucket.push(listener);
    return () => this.off(event, listener);
  }
  off(event, listener) {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    const index = bucket.indexOf(listener);
    if (index !== -1) bucket.splice(index, 1);
  }
  emit(event, ...args) {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    const count = bucket.length;
    for (let i = 0; i < count && i < bucket.length; i++) {
      bucket[i](...args);
    }
  }
  removeAllListeners() {
    this.listeners.clear();
  }
};

// src/core/uniforms.ts
var UNIFORM_TYPES = ["1f", "2f", "3f", "4f"];
var COMPONENT_COUNTS = {
  "1f": 1,
  "2f": 2,
  "3f": 3,
  "4f": 4
};
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isValidUniformValue(type, value) {
  if (type === "1f") return isFiniteNumber(value);
  return Array.isArray(value) && value.length === COMPONENT_COUNTS[type] && value.every(isFiniteNumber);
}
function glslDataType(type) {
  switch (type) {
    case "1f":
      return "float";
    case "2f":
      return "vec2";
    case "3f":
      return "vec3";
    case "4f":
      return "vec4";
  }
}
function glslSwizzle(type) {
  switch (type) {
    case "1f":
      return "x";
    case "2f":
      return "xy";
    case "3f":
      return "xyz";
    case "4f":
      return "xyzw";
  }
}
function extractValidUniforms(uniforms) {
  const result = {};
  for (const [name, descriptor] of Object.entries(uniforms ?? {})) {
    if (!UNIFORM_TYPES.includes(descriptor.type)) {
      logError(
        "blotter",
        "extractValidUniforms",
        `uniforms must be one of type: ${UNIFORM_TYPES.join(", ")}`
      );
      continue;
    }
    if (!isValidUniformValue(descriptor.type, descriptor.value)) {
      logError(
        "blotter",
        "extractValidUniforms",
        `uniform value for ${name} is incorrect for type: ${descriptor.type}`
      );
      continue;
    }
    result[name] = {
      type: descriptor.type,
      value: descriptor.value
    };
  }
  return result;
}
function createDefaultUniforms(pixelRatio2 = 1) {
  return {
    uResolution: { type: "2f", value: [0, 0] },
    uGlobalTime: { type: "1f", value: 0 },
    uTimeDelta: { type: "1f", value: 0 },
    uBlendColor: { type: "4f", value: [1, 1, 1, 1] },
    uPixelRatio: { type: "1f", value: pixelRatio2 }
  };
}
var DEFAULT_UNIFORM_NAMES = [
  "uResolution",
  "uGlobalTime",
  "uTimeDelta",
  "uBlendColor",
  "uPixelRatio"
];
function hasRequiredDefaultUniforms(uniforms) {
  return DEFAULT_UNIFORM_NAMES.every((name) => name in uniforms);
}
function ensureHasRequiredDefaultUniforms(uniforms, domain, method) {
  if (!hasRequiredDefaultUniforms(uniforms)) {
    throw new BlotterError(
      domain,
      method,
      "uniforms object is missing required default uniforms"
    );
  }
}

// src/core/uniform-interface.ts
var UniformInterface = class extends Emitter {
  constructor(descriptor, context = "blotter") {
    super();
    this.type = descriptor.type;
    this._value = descriptor.value;
    this.context = context;
  }
  get value() {
    return this._value;
  }
  set value(value) {
    if (!isValidUniformValue(this.type, value)) {
      logError(
        this.context,
        void 0,
        `uniform value not valid for uniform type: ${this.type}`
      );
      return;
    }
    this._value = value;
    this.emit("update");
  }
  toDescriptor() {
    return { type: this.type, value: this._value };
  }
};

// src/shaders/index.ts
var shaders_exports = {};
__export(shaders_exports, {
  blending: () => blending,
  blinnPhongSpecular: () => blinnPhongSpecular,
  easing: () => easing,
  gamma: () => gamma,
  inf: () => inf,
  lineMath: () => lineMath,
  map: () => map,
  noise: () => noise,
  noise2d: () => noise2d,
  noise3d: () => noise3d,
  noise4d: () => noise4d,
  pi: () => pi,
  random: () => random
});

// src/shaders/blending.ts
var blending = (
  /* glsl */
  `
//
// Author : Bradley Griffith
// License : Distributed under the MIT License.
//

// Returns the resulting blend color by blending a top color over a base color
highp vec4 normalBlend(highp vec4 topColor, highp vec4 baseColor) {
  highp vec4 blend = vec4(0.0);
  // HACK
  // Cant divide by 0 (see the 'else' alpha) and after a lot of attempts
  // this simply seems like the only solution Im going to be able to come up with to get alpha back.
  if (baseColor.a == 1.0) {
    baseColor.a = 0.9999999;
  };
  if (topColor.a >= 1.0) {
    blend.a = topColor.a;
    blend.r = topColor.r;
    blend.g = topColor.g;
    blend.b = topColor.b;
  } else if (topColor.a == 0.0) {
    blend.a = baseColor.a;
    blend.r = baseColor.r;
    blend.g = baseColor.g;
    blend.b = baseColor.b;
  } else {
    blend.a = 1.0 - (1.0 - topColor.a) * (1.0 - baseColor.a); // alpha
    blend.r = (topColor.r * topColor.a / blend.a) + (baseColor.r * baseColor.a * (1.0 - topColor.a) / blend.a);
    blend.g = (topColor.g * topColor.a / blend.a) + (baseColor.g * baseColor.a * (1.0 - topColor.a) / blend.a);
    blend.b = (topColor.b * topColor.a / blend.a) + (baseColor.b * baseColor.a * (1.0 - topColor.a) / blend.a);
  }
  return blend;
}
// Returns a vec4 representing the original top color that would have been needed to blend
//  against a passed in base color in order to result in the passed in blend color.
highp vec4 normalUnblend(highp vec4 blendColor, highp vec4 baseColor) {
  highp vec4 unblend = vec4(0.0);
  // HACKY
  // Cant divide by 0 (see alpha) and after a lot of attempts
  // this simply seems like the only solution Im going to be able to come up with to get alpha back.
  if (baseColor.a == 1.0) {
    baseColor.a = 0.9999999;
  }
  unblend.a = 1.0 - ((1.0 - blendColor.a) / (1.0 - baseColor.a));
  // Round to two decimal places
  unblend.a = (sign(100.0 * unblend.a) * floor(abs(100.0 * unblend.a) + 0.5)) / 100.0;
  if (unblend.a >= 1.0) {
    unblend.r = blendColor.r;
    unblend.g = blendColor.g;
    unblend.b = blendColor.b;
  } else if (unblend.a == 0.0) {
    unblend.r = baseColor.r;
    unblend.g = baseColor.g;
    unblend.b = baseColor.b;
  } else {
    unblend.r = (blendColor.r - (baseColor.r * baseColor.a * (1.0 - unblend.a) / blendColor.a)) / (unblend.a / blendColor.a);
    unblend.g = (blendColor.g - (baseColor.g * baseColor.a * (1.0 - unblend.a) / blendColor.a)) / (unblend.a / blendColor.a);
    unblend.b = (blendColor.b - (baseColor.b * baseColor.a * (1.0 - unblend.a) / blendColor.a)) / (unblend.a / blendColor.a);
  }
  return unblend;
}
`
);

// src/shaders/blinn-phong-specular.ts
var blinnPhongSpecular = (
  /* glsl */
  `
//
// Author : Reza Ali
// License : Distributed under the MIT License.
//

float blinnPhongSpecular( vec3 lightDirection, vec3 viewDirection, vec3 surfaceNormal, float shininess ) {

  //Calculate Blinn-Phong power
  vec3 H = normalize(viewDirection + lightDirection);
  return pow(max(0.0, dot(surfaceNormal, H)), shininess);
}
`
);

// src/shaders/easing.ts
var easing = (
  /* glsl */
  `
//
// Author : Reza Ali
// License : Distributed under the MIT License.
//

float linear( float t, float b, float c, float d )
{
    return t * ( c / d ) + b;
}

float linear( float t )
{
    return t;
}

float inQuad( float t, float b, float c, float d )
{
    return c * ( t /= d ) * t + b;
}

float inQuad( float t )
{
    return t * t;
}

float outQuad( float t, float b, float c, float d )
{
    return -c * ( t /= d ) * ( t - 2.0 ) + b;
}

float outQuad( float t )
{
    return - ( t -= 1.0 ) * t + 1.0;
}

float inOutQuad( float t, float b, float c, float d )
{
    if( ( t /= d / 2.0 ) < 1.0 ) {
      return c / 2.0 * t * t + b;
    }
    return - c / 2.0 * ( ( --t ) * ( t - 2.0 ) - 1.0 ) + b;
}

float inOutQuad( float t )
{
    if( ( t /= 0.5 ) < 1.0 ) return 0.5 * t * t;
    return -0.5 * ( ( --t ) * ( t-2 ) - 1 );
}

float inCubic( float t, float b, float c, float d )
{
    return c * ( t /= d ) * t * t + b;
}

float inCubic( float t )
{
    return t * t * t;
}

float outCubic( float t, float b, float c, float d )
{
    return c * ( ( t = t/d - 1.0 ) * t * t + 1.0 ) + b;
}

float outCubic( float t )
{
    return ( ( --t ) * t * t + 1.0 );
}

float inOutCubic( float t, float b, float c, float d )
{
    if( ( t /= d / 2.0 ) < 1.0 ) return  c / 2.0 * t * t * t + b;
    return c / 2.0 * ( ( t -= 2.0 ) * t * t + 2.0 ) + b;
}

float inOutCubic( float t )
{
    if( ( t /= 0.5 ) < 1.0 ) return 0.5 * t * t * t;
    return 0.5 * ( ( t -= 2.0 ) * t * t + 2.0 );
}

float inQuart( float t, float b, float c, float d )
{
    return c * ( t /= d ) * t * t * t + b;
}

float inQuart( float t )
{
    return t * t * t * t;
}

float outQuart( float t, float b, float c, float d )
{
    return -c * ( ( t = t/d - 1.0 ) * t * t * t - 1.0 ) + b;
}

float outQuart( float t )
{
    return - ( ( --t ) * t * t * t - 1.0 );
}

float inOutQuart( float t, float b, float c, float d )
{
    if ( ( t /= d / 2.0 ) < 1.0 ) return c / 2.0 * t * t * t * t + b;
    return -c / 2.0 * ( ( t -= 2.0 ) * t * t * t - 2.0 ) + b;
}

float inOutQuart( float t )
{
    if ( (t /= 0.5 ) < 1.0 ) return 0.5 * t * t * t * t;
    return -0.5 * ( ( t -= 2.0 ) * t * t * t - 2.0 );
}

float inQuint( float t, float b, float c, float d )
{
    return c * ( t /= d ) * t * t * t * t + b;
}

float inQuint( float t )
{
    return t * t * t * t * t;
}

float outQuint( float t, float b, float c, float d )
{
    return c * ( ( t = t/d - 1.0) * t * t * t * t + 1.0 ) + b;
}

float outQuint( float t )
{
    return ( ( --t ) * t * t * t * t + 1.0 );
}

float inOutQuint( float t, float b, float c, float d )
{
    if( ( t /= d /2.0 ) < 1.0 ) return  c / 2.0 * t * t * t * t * t + b;
    return c / 2.0 * ( ( t -= 2.0 ) * t * t * t * t + 2.0) + b;
}

float inOutQuint( float t )
{
    if ( ( t /= 0.5 ) < 1.0 ) return 0.5 * t * t * t * t * t;
    return 0.5 * ( ( t -= 2 ) * t * t * t * t + 2.0 );
}

float inSine( float t, float b, float c, float d )
{
    return -c * cos( t / d * ( 1.5707963268 ) ) + c + b;
}

float inSine( float t )
{
    return -1.0 * cos( t * ( 1.5707963268 ) ) + 1.0;
}

float outSine( float t, float b, float c, float d )
{
    return c * sin( t / d * ( 1.5707963268 ) ) + b;
}

float outSine( float t )
{
    return sin( t * ( 1.5707963268 ) );
}

float inOutSine( float t, float b, float c, float d )
{
    return - c / 2.0 * ( cos( 3.1415926536 * t / d ) - 1.0 ) + b;
}

float inOutSine( float t )
{
    return -0.5 * ( cos( 3.1415926536 * t ) - 1.0 );
}

float inExpo( float t, float b, float c, float d )
{
    return ( t == 0.0 ) ? b : c * pow( 2.0, 10.0 * ( t / d - 1.0 ) ) + b;
}

float inExpo( float t )
{
    return ( t == 0 ) ? 0.0 : pow( 2.0, 10.0 * ( t - 1.0 ) );
}

float outExpo( float t, float b, float c, float d )
{
    return ( t == d ) ? b + c : c * ( - pow( 2.0, -10.0 * t / d ) + 1.0 ) + b;
}

float outExpo( float t )
{
    return ( t == 1.0 ) ? 1.0 : ( - pow( 2.0, -10.0 * t ) + 1.0 );
}

float inOutExpo( float t, float b, float c, float d )
{
    if( t == 0 ) return b;
    if( t == d ) return b + c;
    if(( t /= d / 2.0 ) < 1.0 ) return c / 2.0 * pow( 2.0, 10.0 * ( t - 1.0 ) ) + b;
    return c / 2.0 * ( - pow( 2.0, -10.0 * --t ) + 2.0 ) + b;
}

float inOutExpo( float t )
{
    if( t == 0.0 ) return 0.0;
    if( t == 1.0 ) return 1.0;
    if( ( t /= 0.5 ) < 1.0 ) return 0.5 * pow( 2.0, 10.0 * ( t - 1.0 ) );
    return 0.5 * ( - pow( 2.0, -10.0 * --t ) + 2.0 );
}

float inCirc( float t, float b, float c, float d )
{
    return -c * ( sqrt( 1.0 - (t/=d)*t) - 1) + b;
}

float inCirc( float t )
{
    return - ( sqrt( 1.0 - t*t) - 1);
}

float outCirc( float t, float b, float c, float d )
{
    return c * sqrt( 1.0 - (t=t/d-1)*t) + b;
}

float outCirc( float t )
{
    return sqrt( 1.0 - (--t)*t);
}

float inOutCirc( float t, float b, float c, float d )
{
    if ( ( t /= d / 2.0 ) < 1 ) return - c / 2.0 * ( sqrt( 1.0 - t * t ) - 1.0 ) + b;
    return c / 2.0 * ( sqrt( 1.0 - ( t -= 2.0 ) * t ) + 1.0 ) + b;
}

float inOutCirc( float t )
{
    if( ( t /= 0.5 ) < 1.0 ) return -0.5 * ( sqrt( 1.0 - t * t ) - 1.0 );
    return 0.5 * ( sqrt( 1.0 - ( t -= 2.0 ) * t ) + 1.0 );
}

float inElastic( float t, float b, float c, float d )
{
    float s = 1.70158; float p = 0.0; float a = c;
    if( t == 0 ) return b;  if( ( t /= d ) == 1 ) return b + c;
    p = d * 0.3;
    if( a < abs( c ) ) { a = c; float s = p / 4.0; }
    else s = 0.1591549431 * p / ( 6.2831853072 ) * asin( c / a );
    return -( a * pow( 2.0, 10.0 * ( t -= 1.0 ) ) * sin( ( t * d - s ) * ( 6.2831853072 ) / p ) )  + b;
}

float inElastic( float t )
{
    float s = 1.70158; float p = 0.0; float a = 1.0;
    if( t == 0.0 ) return 0.0;
    if( t == 1.0 ) return 1.0;
    p = 0.3;
    s = p / ( 6.2831853072 ) * asin( 1.0 / a );
    return -( a * pow( 2.0, 10.0 * ( t -= 1.0 ) ) * sin( ( t - s ) * ( 6.2831853072 ) / p ) );
}

float outElastic( float t, float b, float c, float d )
{
    float s = 1.70158; float p = 0.0; float a = c;
    if( t == 0.0 ) return b;
    if( (t /= d ) == 1.0 ) return b + c;
    p = d * 0.3;
    if( a < abs( c ) ) { a = c; s = p / 4.0; }
    else { s = p / ( 6.2831853072 ) * asin( c / a ); }
    return a * pow( 2.0, -10.0 * t ) * sin( ( t * d - s ) * ( 6.2831853072 ) / p ) + c + b;
}

float outElastic( float t )
{
    float s = 1.70158; float p = 0.0 ; float a = 1.0;
    if( t == 0.0 ) return 0.0;  if( t == 1.0 ) return 1.0;
    p = 0.3;
    s = p / ( 6.2831853072 ) * asin( 1.0 / a );
    return a * pow( 2.0, -10.0 * t ) * sin( ( t - s ) * ( 6.2831853072 ) / p ) + 1.0;
}

float inOutElastic( float t, float b, float c, float d )
{
    float s = 1.70158; float p = 0.0; float a = c;
    if( t == 0.0 ) return b;
    if( ( t /= d / 2.0 ) == 2.0 ) return b + c;
    p = d * ( 0.3 * 1.5 );
    if( a < abs( c ) ) { a = c; s = p / 4.0; }
    else { s = p / ( 6.2831853072 ) * asin( c / a ); }
    if( t < 1.0 ) return -0.5 * ( a * pow( 2.0, 10.0 * ( t -= 1.0 ) ) * sin( ( t * d - s ) * ( 6.2831853072 ) / p ) ) + b;
    return a * pow( 2.0, -10.0 * ( t -= 1.0 ) ) * sin( ( t * d - s ) * ( 6.2831853072 ) / p ) * 0.5 + c + b;
}

float inOutElastic( float t )
{
    float s = 1.70158; float p = 0; float a = 1.0;
    if( t == 0 ) return 0.0;
    if( ( t /= 0.5 ) == 2.0 ) return 1.0;
    p = ( 0.3 * 1.5 );
    s = p / ( 6.2831853072 ) * asin( 1.0 / a );
    if( t < 1.0 ) return -0.5 * ( a * pow( 2.0, 10.0 * ( t -= 1.0 ) ) * sin( ( t - s ) * ( 6.2831853072 ) / p ) );
    return a * pow( 2.0, -10.0 * ( t -= 1.0 ) ) * sin( ( t - s ) * ( 6.2831853072 ) / p ) * 0.5 + 1.0;
}

float inBack( float t, float b, float c, float d )
{
    float s = 1.70158;
    return c * ( t /= d ) * t * ( ( s + 1.0 ) * t - s ) + b;
}

float inBack( float t )
{
    float s = 1.70158;
    return t * t * ( ( s + 1.0 ) * t - s);
}

float outBack( float t,  float b,  float c,  float d )
{
    float s = 1.70158;
    return c * ( ( t = t / d - 1.0 ) * t * ( ( s + 1.0 ) * t + s ) + 1.0 ) + b;
}

float outBack( float t )
{
    float s = 1.70158;
    return ( ( --t ) * t * ( ( s + 1.0 ) * t + s ) + 1.0);
}

float inOutBack( float t, float b, float c, float d )
{
    float s = 1.70158;
    if( ( t /= d / 2.0 ) < 1.0 ) return c / 2.0 * ( t * t * ( ( ( s *= 1.525 ) + 1.0 ) * t - s ) ) + b;
    return c / 2.0 * ( ( t -= 2.0 ) * t * ( ( ( s *= ( 1.525 ) ) + 1.0 ) * t + s ) + 2.0 ) + b;
}

float inOutBack( float t )
{
    float s = 1.70158;
    if( ( t /= 0.5 ) < 1.0 ) return 0.5 * ( t * t * ( ( ( s *= 1.525 ) + 1.0 ) * t - s ) );
    return 0.5 * ( ( t -= 2 ) * t * ( ( ( s *= ( 1.525 ) ) + 1.0 ) * t + s ) + 2.0 );
}

float outBounce( float t, float b, float c, float d )
{
    if( ( t /= d ) < ( 1.0 / 2.75 ) ) {
        return c * ( 7.5625 * t * t ) + b;
    } else if ( t < ( 2.0 / 2.75 ) ) {
        return c * ( 7.5625 * ( t -= ( 1.5 / 2.75 ) ) * t + 0.75 ) + b;
    } else if ( t < ( 2.5 / 2.75 ) ) {
        return c * ( 7.5625 * ( t -= ( 2.25 / 2.75 ) ) * t + 0.9375 ) + b;
    } else {
        return c * ( 7.5625 * ( t -= ( 2.625 / 2.75 ) ) * t + 0.984375 ) + b;
    }
}

float outBounce( float t )
{
    if( t < ( 1.0 / 2.75 ) ) {
        return ( 7.5625 * t * t );
    } else if ( t < ( 2.0 / 2.75 ) ) {
        return ( 7.5625 * ( t-= ( 1.5 / 2.75 ) ) * t + .75 );
    } else if ( t < ( 2.5 / 2.75 ) ) {
        return ( 7.5625 * ( t -= ( 2.25 / 2.75 ) ) * t + 0.9375 );
    } else {
        return ( 7.5625 * ( t -= ( 2.625 / 2.75 ) ) * t + 0.984375 );
    }
}

float inBounce( float t, float b, float c, float d )
{
    return c - outBounce( d - t, 0.0, c, d ) + b;
}

float inBounce( float t )
{
    return 1.0 - outBounce( 1.0 - t);
}

float inOutBounce( float t, float b, float c, float d )
{
    if ( t < d /2.0 ) return inBounce ( t * 2.0, 0.0, c, d ) * 0.5 + b;
    return outBounce ( t * 2.0 - d, 0, c, d ) * 0.5 + c * 0.5 + b;
}

float inOutBounce( float t )
{
    if ( t < 0.5 ) return inBounce( t * 2.0 ) * 0.5;
    return outBounce( t * 2.0 - 1.0 ) * 0.5 + 0.5;
}
`
);

// src/shaders/gamma.ts
var gamma = (
  /* glsl */
  `
//
// Author : Reza Ali
// License : Distributed under the MIT License.
//

const vec3 cGammaCorrection = vec3( 0.4545454545 );

vec3 gamma( in vec3 color )
{
  return pow( color, cGammaCorrection );
}

vec4 gamma( in vec4 color )
{
  return vec4( gamma( color.rgb ), color.a );
}
`
);

// src/shaders/inf.ts
var inf = (
  /* glsl */
  `
//
// Author : Bradley Griffith
// License : Distributed under the MIT License.
//
bool blotterIsInf(float val) {
    return (val != 0.0 && val * 2.0 == val) ? true : false;
}
`
);

// src/shaders/line-math.ts
var lineMath = (
  /* glsl */
  `
//
// Author : Bradley Griffith
// License : Distributed under the MIT License.
//
bool blotterIsInf(float val) {
    return (val != 0.0 && val * 2.0 == val) ? true : false;
}

//
// Author : Bradley Griffith
// License : Distributed under the MIT License.
//

// Returns the slope of a line given the degrees of the angle on which that line is rotated;
float slopeForDegrees(float deg) {
    // Ensure degrees stay withing 0.0 - 360.0
    deg = mod(deg, 360.0);
    float radians = deg * (PI / 180.0);
    return tan(radians);
}
// Given x, a slope, and another point, find y for x.
float yForXOnSlope(float x, float slope, vec2 p2) {
    return -1.0 * ((slope * (p2.x - x)) - p2.y);
}
// Given y, a slope, and another point, find x for y.
float xForYOnSlope(float y, float slope, vec2 p2) {
    return ((y - p2.y) + (slope * p2.x)) / slope;
}
// Returns slope adjusted for screen ratio.
float normalizedSlope(float slope, vec2 resolution) {
    vec2 p = vec2(1.0) / resolution;
    return ((slope * 100.0) / p.x) / (100.0 / p.x);
}
// Returns offsets (+/-) for any coordinate at distance given slope.
//   Note: This function does not normalize distance.
//   Note: This function does not adjust slope for screen ratio.
vec2 offsetsForCoordAtDistanceOnSlope(float d, float slope) {
    return vec2(
        (d * cos(atan(slope))),
        (d * sin(atan(slope)))
    );
}
// Returns a boolean designating whether or not an infinite line intersects with an infinite line, and sets an \`out\` variable for the intersection point if it is found.
//   Note: This function does not adjust slope for screen ratio.
bool lineLineIntersection (out vec2 intersect, in vec2 p1, in float m1, in vec2 p2, in float m2) {
    // See: http://gamedev.stackexchange.com/questions/44720/line-intersection-from-parametric-equation
    //      http://stackoverflow.com/questions/41687083/formula-to-determine-if-an-infinite-line-and-a-line-segment-intersect/41687904#41687904
    bool isIntersecting = false;
    float dx = 1.0;
    float dy = m1;
    float dxx = 1.0;
    float dyy = m2;
    float denominator = ((dxx * dy) - (dyy * dx));
    if (denominator == 0.0) {
        // Lines are parallel
        return isIntersecting;
    }
    if (blotterIsInf(dy)) {
        float y = yForXOnSlope(p1.x, m2, p2);
        isIntersecting = true;
        intersect = vec2(p1.x, y);
        return isIntersecting;
    }
    if (blotterIsInf(dyy)) {
        float y = yForXOnSlope(p2.x, m1, p1);
        isIntersecting = true;
        intersect = vec2(p2.x, y);
        return isIntersecting;
    }
    float u = ((dx * (p2.y - p1.y)) + (dy * (p1.x - p2.x))) / denominator;
    isIntersecting = true;
    intersect = p2 + (u * vec2(dxx, dyy));
    return isIntersecting;
}
// Returns a boolean designating whether or not an infinite line intersects with a line segment, and sets an \`out\` variable for the intersection point if it is found.
//   Note: This function does not adjust slope for screen ratio.
bool lineLineSegmentIntersection (out vec2 intersect, in vec2 point, in float m, in vec2 pA, in vec2 pB) {
    // See: http://gamedev.stackexchange.com/questions/44720/line-intersection-from-parametric-equation
    //      http://stackoverflow.com/questions/41687083/formula-to-determine-if-an-infinite-line-and-a-line-segment-intersect/41687904#41687904
    bool isIntersecting = false;
    float dx = 1.0;
    float dy = m;
    float dxx = pB.x - pA.x;
    float dyy = pB.y - pA.y;
    float denominator = ((dxx * dy) - (dyy * dx));
    if (denominator == 0.0 || (blotterIsInf(dyy / dxx) && blotterIsInf(dy))) {
        // Lines are parallel
        return isIntersecting;
    }
    if (blotterIsInf(dy)) {
        float m2 = dyy / dxx;
        float y = yForXOnSlope(point.x, m2, pB);
        isIntersecting = true;
        intersect = vec2(point.x, y);
        return isIntersecting;
    }
    float u = ((dx * (pA.y - point.y)) + (dy * (point.x - pA.x))) / denominator;
    if (u >= 0.0 && u <= 1.0) {
        // Intersection occured on line segment
        isIntersecting = true;
        intersect = pA + (u * vec2(dxx, dyy));
    }
    return isIntersecting;
}
// Dev Note: Terrible code. Needs refactor. Just trying to find 
//   which two edges of the rect the intersections occur at.
void intersectsOnRectForLine(out vec2 iA, out vec2 iB, in vec2 rMinXY, in vec2 rMaxXY, in vec2 point, in float slope) {
    bool firstIntersectFound = false;
    vec2 intersectLeft = vec2(0.0);
    vec2 intersectTop = vec2(0.0);
    vec2 intersectRight = vec2(0.0);
    vec2 intersectBottom = vec2(0.0);
    bool intersectsLeft = lineLineSegmentIntersection(intersectLeft, point, slope, rMinXY, vec2(rMinXY.x, rMaxXY.y));
    bool intersectsTop = lineLineSegmentIntersection(intersectTop, point, slope, vec2(rMinXY.x, rMaxXY.y), rMaxXY);
    bool intersectsRight = lineLineSegmentIntersection(intersectRight, point, slope, rMaxXY, vec2(rMaxXY.x, rMinXY.y));
    bool intersectsBottom = lineLineSegmentIntersection(intersectBottom, point, slope, rMinXY, vec2(rMaxXY.x, rMinXY.y));
    if (intersectsLeft) {
        if (firstIntersectFound) {
            iB = intersectLeft;
        }
        else {
            iA = intersectLeft;
            firstIntersectFound = true;
        }
    }
    if (intersectsTop) {
        if (firstIntersectFound) {
            iB = intersectTop;
        }
        else {
            iA = intersectTop;
            firstIntersectFound = true;
        }
    }
    if (intersectsRight) {
        if (firstIntersectFound) {
            iB = intersectRight;
        }
        else {
            iA = intersectRight;
            firstIntersectFound = true;
        }
    }
    if (intersectsBottom) {
        if (firstIntersectFound) {
            iB = intersectBottom;
        }
        else {
            iA = intersectBottom;
        }
    }
}
`
);

// src/shaders/map.ts
var map = (
  /* glsl */
  `
//
// Author : Reza Ali
// License : Distributed under the MIT License.
//

float map( float value, float inMin, float inMax, float outMin, float outMax )
{
    return ( (value - inMin) / ( inMax - inMin ) * ( outMax - outMin ) ) + outMin;
}
`
);

// src/shaders/noise.ts
var noise = (
  /* glsl */
  `
//
// Author : Patricio Gonzalez Vivo and Jen Lowe
// License : Distributed under the MIT License.
// Source : https://github.com/patriciogonzalezvivo/thebookofshaders
//
float random (in float _x) {
    return fract(sin(_x)*1e4);
}

float random (in vec2 co) {
    return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}

float noise (in float _x) {
    float i = floor(_x);
    float f = fract(_x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(random(i), random(i + 1.0), u);
}

float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);
    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + 
            (c - a)* u.y * (1.0 - u.x) + 
            (d - b) * u.x * u.y;
}
`
);

// src/shaders/noise2d.ts
var noise2d = (
  /* glsl */
  `
//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec2 n2mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 n2mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 n2mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return n2mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = n2mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
   + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`
);

// src/shaders/noise3d.ts
var noise3d = (
  /* glsl */
  `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec2 n3mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 n3mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 n3mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return n3mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = n3mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`
);

// src/shaders/noise4d.ts
var noise4d = (
  /* glsl */
  `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip)
  {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

  return p;
  }

// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float snoise(vec4 v)
  {
  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                       -0.447213595499958); // -1 + 4 * G4

// First corner
  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C.xxxx
  //  x1 = x0 - i1  + 1.0 * C.xxxx
  //  x2 = x0 - i2  + 2.0 * C.xxxx
  //  x3 = x0 - i3  + 3.0 * C.xxxx
  //  x4 = x0 - 1.0 + 4.0 * C.xxxx
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

// Permutations
  i = mod289(i);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

  }
`
);

// src/shaders/pi.ts
var pi = (
  /* glsl */
  `
//
// Author : Reza Ali
// License : Distributed under the MIT License.
//

#define TWO_PI 6.2831853072
#define PI 3.14159265359
#define HALF_PI 1.57079632679
`
);

// src/shaders/random.ts
var random = (
  /* glsl */
  `
//
// Author : Patricio Gonzalez Vivo and Jen Lowe
// License : Distributed under the MIT License.
// Source : https://github.com/patriciogonzalezvivo/thebookofshaders
//

float random (in float _x) {
    return fract(sin(_x)*1e4);
}

float random (in vec2 co) {
    return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}
`
);

// src/material.ts
var DEFAULT_MAIN_IMAGE = (
  /* glsl */
  `
void mainImage( out vec4 mainImage, in vec2 fragCoord ) {
    mainImage = textTexture(fragCoord / uResolution);
}
`
);
var Material = class extends Emitter {
  constructor(options = {}) {
    super();
    this.uniformUnsubscribers = [];
    this.mainImage = options.mainImage;
    this.uniforms = options.uniforms ?? {};
  }
  get mainImage() {
    return this._mainImage;
  }
  // Shadertoy-style fragment body. Falsy restores the default passthrough.
  set mainImage(mainImage) {
    this._mainImage = mainImage || DEFAULT_MAIN_IMAGE;
  }
  get uniforms() {
    return this._uniforms;
  }
  // Replaces all uniform interfaces. Required defaults (uResolution etc.)
  // always overwrite same-named user uniforms, matching legacy behavior —
  // their values are driven by the render pipeline.
  set uniforms(uniforms) {
    for (const unsubscribe of this.uniformUnsubscribers) unsubscribe();
    this.uniformUnsubscribers = [];
    const valid = extractValidUniforms({
      ...uniforms,
      ...createDefaultUniforms(pixelRatio())
    });
    const interfaces = {};
    for (const [name, descriptor] of Object.entries(valid)) {
      const uniformInterface = new UniformInterface(descriptor, "Material");
      this.uniformUnsubscribers.push(
        uniformInterface.on("update", () => this.emit("update:uniform", name))
      );
      interfaces[name] = uniformInterface;
    }
    this._uniforms = interfaces;
  }
  // Notify observers that the material changed structurally (e.g. after
  // assigning a new mainImage) so they rebuild their shader.
  update() {
    this.emit("update");
  }
};

export { BlotterError, Emitter, Material, UniformInterface, blending, createHiDpiCanvas, ensureHasRequiredDefaultUniforms, extractValidUniforms, glslDataType, glslSwizzle, lineMath, logError, logWarning, noise, noise3d, normalizedMousePosition, pi, pixelRatio, random, shaders_exports, updateCanvasSize };
//# sourceMappingURL=chunk-CXYC3ZAY.js.map
//# sourceMappingURL=chunk-CXYC3ZAY.js.map