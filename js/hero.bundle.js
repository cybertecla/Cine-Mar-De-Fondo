(() => {
  // lib/paper-shaders/dist/vertex-shader.js
  var vertexShaderSource = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`;

  // lib/paper-shaders/dist/shader-mount.js
  var DEFAULT_MAX_PIXEL_COUNT = 1920 * 1080 * 4;
  var ShaderMount = class {
    parentElement;
    canvasElement;
    gl;
    program = null;
    uniformLocations = {};
    /** The fragment shader that we are using */
    fragmentShader;
    /** Stores the RAF for the render loop */
    rafId = null;
    /** Time of the last rendered frame */
    lastRenderTime = 0;
    /** Total time that we have played any animation, passed as a uniform to the shader for time-based VFX */
    currentFrame = 0;
    /** The speed that we progress through animation time (multiplies by delta time every update). Allows negatives to play in reverse. If set to 0, rAF will stop entirely so static shaders have no recurring performance costs */
    speed = 0;
    /** Actual speed used that accounts for visibility: we pause the shader if the tab is hidden or the element out of the viewport */
    currentSpeed = 0;
    /** Uniforms that are provided by the user for the specific shader being mounted (not including uniforms that this Mount adds, like time and resolution) */
    providedUniforms;
    /** Names of the uniforms that should have mipmaps generated for them */
    mipmaps = [];
    /** Just a sanity check to make sure frames don't run after we're disposed */
    hasBeenDisposed = false;
    /** If the resolution of the canvas has changed since the last render */
    resolutionChanged = true;
    /** Store textures that are provided by the user */
    textures = /* @__PURE__ */ new Map();
    minPixelRatio;
    maxPixelCount;
    isSafari = isSafari();
    uniformCache = {};
    textureUnitMap = /* @__PURE__ */ new Map();
    ownerDocument;
    constructor(parentElement, fragmentShader, uniforms, webGlContextAttributes, speed = 0, frame = 0, minPixelRatio = 2, maxPixelCount = DEFAULT_MAX_PIXEL_COUNT, mipmaps = []) {
      if (parentElement?.nodeType === 1) {
        this.parentElement = parentElement;
      } else {
        throw new Error("Paper Shaders: parent element must be an HTMLElement");
      }
      this.ownerDocument = parentElement.ownerDocument;
      if (!this.ownerDocument.querySelector("style[data-paper-shader]")) {
        const styleElement = this.ownerDocument.createElement("style");
        styleElement.innerHTML = defaultStyle;
        styleElement.setAttribute("data-paper-shader", "");
        this.ownerDocument.head.prepend(styleElement);
      }
      const canvasElement = this.ownerDocument.createElement("canvas");
      this.canvasElement = canvasElement;
      this.parentElement.prepend(canvasElement);
      this.fragmentShader = fragmentShader;
      this.providedUniforms = uniforms;
      this.mipmaps = mipmaps;
      this.currentFrame = frame;
      this.minPixelRatio = minPixelRatio;
      this.maxPixelCount = maxPixelCount;
      const gl2 = canvasElement.getContext("webgl2", {
        antialias: false,
        depth: false,
        stencil: false,
        ...webGlContextAttributes
      });
      if (!gl2) {
        throw new Error("Paper Shaders: WebGL is not supported in this browser");
      }
      this.gl = gl2;
      this.initProgram();
      this.setupPositionAttribute();
      this.setupUniforms();
      this.setUniformValues(this.providedUniforms);
      this.setupResizeObserver();
      visualViewport?.addEventListener("resize", this.handleVisualViewportChange);
      this.setupIntersectionObserver();
      this.setSpeed(speed);
      this.parentElement.setAttribute("data-paper-shader", "");
      this.parentElement.paperShaderMount = this;
      this.ownerDocument.addEventListener("visibilitychange", this.handleDocumentVisibilityChange);
    }
    initProgram = () => {
      const program = createProgram(this.gl, vertexShaderSource, this.fragmentShader);
      if (!program) return;
      this.program = program;
      this.gl.useProgram(program);
    };
    setupPositionAttribute = () => {
      const positionAttributeLocation = this.gl.getAttribLocation(this.program, "a_position");
      const positionBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
      const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
      this.gl.enableVertexAttribArray(positionAttributeLocation);
      this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);
    };
    setupUniforms = () => {
      const uniformLocations = {
        u_time: this.gl.getUniformLocation(this.program, "u_time"),
        u_pixelRatio: this.gl.getUniformLocation(this.program, "u_pixelRatio"),
        u_resolution: this.gl.getUniformLocation(this.program, "u_resolution")
      };
      Object.entries(this.providedUniforms).forEach(([key, value]) => {
        uniformLocations[key] = this.gl.getUniformLocation(this.program, key);
        if (value instanceof HTMLImageElement) {
          const aspectRatioUniformName = `${key}AspectRatio`;
          uniformLocations[aspectRatioUniformName] = this.gl.getUniformLocation(this.program, aspectRatioUniformName);
        }
      });
      this.uniformLocations = uniformLocations;
    };
    /**
     * The scale that we should render at.
     * - Used to target 2x rendering even on 1x screens for better antialiasing
     * - Prevents the virtual resolution from going beyond the maximum resolution
     * - Accounts for the page zoom level so we render in physical device pixels rather than CSS pixels
     */
    renderScale = 1;
    parentWidth = 0;
    parentHeight = 0;
    parentDevicePixelWidth = 0;
    parentDevicePixelHeight = 0;
    devicePixelsSupported = false;
    intersectionObserver = null;
    isInViewport = true;
    resizeObserver = null;
    setupResizeObserver = () => {
      this.resizeObserver = new ResizeObserver(([entry]) => {
        if (entry?.borderBoxSize[0]) {
          const physicalPixelSize = entry.devicePixelContentBoxSize?.[0];
          if (physicalPixelSize !== void 0) {
            this.devicePixelsSupported = true;
            this.parentDevicePixelWidth = physicalPixelSize.inlineSize;
            this.parentDevicePixelHeight = physicalPixelSize.blockSize;
          }
          this.parentWidth = entry.borderBoxSize[0].inlineSize;
          this.parentHeight = entry.borderBoxSize[0].blockSize;
        }
        this.handleResize();
      });
      this.resizeObserver.observe(this.parentElement);
    };
    setupIntersectionObserver = () => {
      const view = this.ownerDocument.defaultView;
      if (!view?.IntersectionObserver) return;
      this.intersectionObserver = new view.IntersectionObserver(([entry]) => {
        this.isInViewport = entry?.isIntersecting ?? true;
        this.updateCurrentSpeed();
      });
      this.intersectionObserver.observe(this.parentElement);
    };
    // Visual viewport resize handler, mainly used to react to browser zoom changes.
    // Resize observer by itself does not react to pinch zoom, and although it usually
    // reacts to classic browser zoom, it's not guaranteed in edge cases.
    // Since timing between visual viewport changes and resize observer is complex
    // and because we'd like to know the device pixel sizes of elements, we just restart
    // the observer to get a guaranteed fresh callback regardless if it would have triggered or not.
    handleVisualViewportChange = () => {
      this.resizeObserver?.disconnect();
      this.setupResizeObserver();
    };
    /** Resize handler for when the container div changes size or the max pixel count changes and we want to resize our canvas to match */
    handleResize = () => {
      let targetPixelWidth = 0;
      let targetPixelHeight = 0;
      const dpr = Math.max(1, window.devicePixelRatio);
      const pinchZoom = visualViewport?.scale ?? 1;
      if (this.devicePixelsSupported) {
        const scaleToMeetMinPixelRatio = Math.max(1, this.minPixelRatio / dpr);
        targetPixelWidth = this.parentDevicePixelWidth * scaleToMeetMinPixelRatio * pinchZoom;
        targetPixelHeight = this.parentDevicePixelHeight * scaleToMeetMinPixelRatio * pinchZoom;
      } else {
        let targetRenderScale = Math.max(dpr, this.minPixelRatio) * pinchZoom;
        if (this.isSafari) {
          const zoomLevel = bestGuessBrowserZoom(this.ownerDocument);
          targetRenderScale *= Math.max(1, zoomLevel);
        }
        targetPixelWidth = Math.round(this.parentWidth) * targetRenderScale;
        targetPixelHeight = Math.round(this.parentHeight) * targetRenderScale;
      }
      const maxPixelCountHeadroom = Math.sqrt(this.maxPixelCount) / Math.sqrt(targetPixelWidth * targetPixelHeight);
      const scaleToMeetMaxPixelCount = Math.min(1, maxPixelCountHeadroom);
      const newWidth = Math.round(targetPixelWidth * scaleToMeetMaxPixelCount);
      const newHeight = Math.round(targetPixelHeight * scaleToMeetMaxPixelCount);
      const newRenderScale = newWidth / Math.round(this.parentWidth);
      if (this.canvasElement.width !== newWidth || this.canvasElement.height !== newHeight || this.renderScale !== newRenderScale) {
        this.renderScale = newRenderScale;
        this.canvasElement.width = newWidth;
        this.canvasElement.height = newHeight;
        this.resolutionChanged = true;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.render(performance.now());
      }
    };
    render = (currentTime) => {
      if (this.hasBeenDisposed) return;
      if (this.program === null) {
        console.warn("Tried to render before program or gl was initialized");
        return;
      }
      const dt2 = currentTime - this.lastRenderTime;
      this.lastRenderTime = currentTime;
      if (this.currentSpeed !== 0) {
        this.currentFrame += dt2 * this.currentSpeed;
      }
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.uniform1f(this.uniformLocations.u_time, this.currentFrame * 1e-3);
      if (this.resolutionChanged) {
        this.gl.uniform2f(this.uniformLocations.u_resolution, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform1f(this.uniformLocations.u_pixelRatio, this.renderScale);
        this.resolutionChanged = false;
      }
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
      if (this.currentSpeed !== 0) {
        this.requestRender();
      } else {
        this.rafId = null;
      }
    };
    requestRender = () => {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = requestAnimationFrame(this.render);
    };
    /** Creates a texture from an image and sets it into a uniform value */
    setTextureUniform = (uniformName, image) => {
      if (!image.complete || image.naturalWidth === 0) {
        throw new Error(`Paper Shaders: image for uniform ${uniformName} must be fully loaded`);
      }
      const existingTexture = this.textures.get(uniformName);
      if (existingTexture) {
        this.gl.deleteTexture(existingTexture);
      }
      if (!this.textureUnitMap.has(uniformName)) {
        this.textureUnitMap.set(uniformName, this.textureUnitMap.size);
      }
      const textureUnit = this.textureUnitMap.get(uniformName);
      this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
      if (this.mipmaps.includes(uniformName)) {
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
      }
      const error = this.gl.getError();
      if (error !== this.gl.NO_ERROR || texture === null) {
        console.error("Paper Shaders: WebGL error when uploading texture:", error);
        return;
      }
      this.textures.set(uniformName, texture);
      const location = this.uniformLocations[uniformName];
      if (location) {
        this.gl.uniform1i(location, textureUnit);
        const aspectRatioUniformName = `${uniformName}AspectRatio`;
        const aspectRatioLocation = this.uniformLocations[aspectRatioUniformName];
        if (aspectRatioLocation) {
          const aspectRatio = image.naturalWidth / image.naturalHeight;
          this.gl.uniform1f(aspectRatioLocation, aspectRatio);
        }
      }
    };
    /** Utility: recursive equality test for all the uniforms */
    areUniformValuesEqual = (a, b) => {
      if (a === b) return true;
      if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
        return a.every((val, i) => this.areUniformValuesEqual(val, b[i]));
      }
      return false;
    };
    /** Sets the provided uniform values into the WebGL program, can be a partial list of uniforms that have changed */
    setUniformValues = (updatedUniforms) => {
      Object.entries(updatedUniforms).forEach(([key, value]) => {
        let cacheValue = value;
        if (value instanceof HTMLImageElement) {
          cacheValue = `${value.src.slice(0, 200)}|${value.naturalWidth}x${value.naturalHeight}`;
        }
        if (this.areUniformValuesEqual(this.uniformCache[key], cacheValue)) return;
        this.uniformCache[key] = cacheValue;
        const location = this.uniformLocations[key];
        if (!location) {
          console.warn(`Uniform location for ${key} not found`);
          return;
        }
        if (value instanceof HTMLImageElement) {
          this.setTextureUniform(key, value);
        } else if (Array.isArray(value)) {
          let flatArray = null;
          let valueLength = null;
          if (value[0] !== void 0 && Array.isArray(value[0])) {
            const firstChildLength = value[0].length;
            if (value.every((arr) => arr.length === firstChildLength)) {
              flatArray = value.flat();
              valueLength = firstChildLength;
            } else {
              console.warn(`All child arrays must be the same length for ${key}`);
              return;
            }
          } else {
            flatArray = value;
            valueLength = flatArray.length;
          }
          switch (valueLength) {
            case 2:
              this.gl.uniform2fv(location, flatArray);
              break;
            case 3:
              this.gl.uniform3fv(location, flatArray);
              break;
            case 4:
              this.gl.uniform4fv(location, flatArray);
              break;
            case 9:
              this.gl.uniformMatrix3fv(location, false, flatArray);
              break;
            case 16:
              this.gl.uniformMatrix4fv(location, false, flatArray);
              break;
            default:
              console.warn(`Unsupported uniform array length: ${valueLength}`);
          }
        } else if (typeof value === "number") {
          this.gl.uniform1f(location, value);
        } else if (typeof value === "boolean") {
          this.gl.uniform1i(location, value ? 1 : 0);
        } else {
          console.warn(`Unsupported uniform type for ${key}: ${typeof value}`);
        }
      });
    };
    /** Gets the current total animation time from 0ms */
    getCurrentFrame = () => {
      return this.currentFrame;
    };
    /** Set a frame to get a deterministic result, frames are literally just milliseconds from zero since the animation started */
    setFrame = (newFrame) => {
      this.currentFrame = newFrame;
      this.lastRenderTime = performance.now();
      this.renderUnlessAnimating();
    };
    /** Set an animation speed (or 0 to stop animation) */
    setSpeed = (newSpeed = 1) => {
      this.speed = newSpeed;
      this.updateCurrentSpeed();
    };
    /** Apply the target speed, pausing (0) while the tab is hidden or the element is out of the viewport */
    updateCurrentSpeed = () => {
      this.setCurrentSpeed(this.ownerDocument.hidden || !this.isInViewport ? 0 : this.speed);
    };
    setCurrentSpeed = (newSpeed) => {
      this.currentSpeed = newSpeed;
      if (this.rafId === null && newSpeed !== 0) {
        this.lastRenderTime = performance.now();
        this.rafId = requestAnimationFrame(this.render);
      }
      if (this.rafId !== null && newSpeed === 0) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    };
    /** Set the maximum pixel count for the shader, this will limit the number of pixels that will be rendered */
    setMaxPixelCount = (newMaxPixelCount = DEFAULT_MAX_PIXEL_COUNT) => {
      this.maxPixelCount = newMaxPixelCount;
      this.handleResize();
    };
    /** Set the minimum pixel ratio for the shader */
    setMinPixelRatio = (newMinPixelRatio = 2) => {
      this.minPixelRatio = newMinPixelRatio;
      this.handleResize();
    };
    /** Update the uniforms that are provided by the outside shader, can be a partial set with only the uniforms that have changed */
    setUniforms = (newUniforms) => {
      this.setUniformValues(newUniforms);
      this.providedUniforms = { ...this.providedUniforms, ...newUniforms };
      this.renderUnlessAnimating();
    };
    /** Render right away only when the rAF loop isn't running */
    renderUnlessAnimating = () => {
      if (this.rafId === null) {
        this.render(performance.now());
      }
    };
    handleDocumentVisibilityChange = () => {
      this.updateCurrentSpeed();
    };
    /** Dispose of the shader mount, cleaning up all of the WebGL resources */
    dispose = () => {
      this.hasBeenDisposed = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.gl && this.program) {
        this.textures.forEach((texture) => {
          this.gl.deleteTexture(texture);
        });
        this.textures.clear();
        this.gl.deleteProgram(this.program);
        this.program = null;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.getError();
      }
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
      }
      visualViewport?.removeEventListener("resize", this.handleVisualViewportChange);
      this.ownerDocument.removeEventListener("visibilitychange", this.handleDocumentVisibilityChange);
      this.uniformLocations = {};
      this.canvasElement.remove();
      delete this.parentElement.paperShaderMount;
    };
  };
  function createShader(gl2, type, source) {
    const shader = gl2.createShader(type);
    if (!shader) return null;
    gl2.shaderSource(shader, source);
    gl2.compileShader(shader);
    if (!gl2.getShaderParameter(shader, gl2.COMPILE_STATUS)) {
      console.error("An error occurred compiling the shaders: " + gl2.getShaderInfoLog(shader));
      gl2.deleteShader(shader);
      return null;
    }
    return shader;
  }
  function createProgram(gl2, vertexShaderSource2, fragmentShaderSource) {
    const format = gl2.getShaderPrecisionFormat(gl2.FRAGMENT_SHADER, gl2.MEDIUM_FLOAT);
    const precision = format ? format.precision : null;
    if (precision && precision < 23) {
      vertexShaderSource2 = vertexShaderSource2.replace(/precision\s+(lowp|mediump)\s+float;/g, "precision highp float;");
      fragmentShaderSource = fragmentShaderSource.replace(/precision\s+(lowp|mediump)\s+float/g, "precision highp float").replace(/\b(uniform|varying|attribute)\s+(lowp|mediump)\s+(\w+)/g, "$1 highp $3");
    }
    const vertexShader = createShader(gl2, gl2.VERTEX_SHADER, vertexShaderSource2);
    const fragmentShader = createShader(gl2, gl2.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return null;
    const program = gl2.createProgram();
    if (!program) return null;
    gl2.attachShader(program, vertexShader);
    gl2.attachShader(program, fragmentShader);
    gl2.linkProgram(program);
    if (!gl2.getProgramParameter(program, gl2.LINK_STATUS)) {
      console.error("Unable to initialize the shader program: " + gl2.getProgramInfoLog(program));
      gl2.deleteProgram(program);
      gl2.deleteShader(vertexShader);
      gl2.deleteShader(fragmentShader);
      return null;
    }
    gl2.detachShader(program, vertexShader);
    gl2.detachShader(program, fragmentShader);
    gl2.deleteShader(vertexShader);
    gl2.deleteShader(fragmentShader);
    return program;
  }
  var defaultStyle = `@layer paper-shaders {
  :where([data-paper-shader]) {
    isolation: isolate;
    position: relative;

    & canvas {
      contain: strict;
      display: block;
      position: absolute;
      inset: 0;
      z-index: -1;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      corner-shape: inherit;
    }
  }
}`;
  function isSafari() {
    const ua2 = navigator.userAgent.toLowerCase();
    return ua2.includes("safari") && !ua2.includes("chrome") && !ua2.includes("android");
  }
  function bestGuessBrowserZoom(doc) {
    const viewportScale = visualViewport?.scale ?? 1;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const scrollbarWidth = window.innerWidth - doc.documentElement.clientWidth;
    const innerWidth = viewportScale * viewportWidth + scrollbarWidth;
    const ratio = outerWidth / innerWidth;
    const zoomPercentageRounded = Math.round(100 * ratio);
    if (zoomPercentageRounded % 5 === 0) {
      return zoomPercentageRounded / 100;
    }
    if (zoomPercentageRounded === 33) {
      return 1 / 3;
    }
    if (zoomPercentageRounded === 67) {
      return 2 / 3;
    }
    if (zoomPercentageRounded === 133) {
      return 4 / 3;
    }
    return ratio;
  }

  // lib/paper-shaders/dist/shader-utils.js
  var declarePI = `
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`;
  var rotation2 = `
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`;
  var proceduralHash11 = `
  float hash11(float p) {
    p = fract(p * 0.3183099) + 0.1;
    p *= p + 19.19;
    return fract(p * p);
  }
`;
  var proceduralHash21 = `
  float hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
`;
  var textureRandomizerR = `
  float randomR(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).r;
  }
`;
  var colorBandingFix = `
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`;
  var simplexNoise = `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

  // lib/paper-shaders/dist/shaders/god-rays.js
  var godRaysMeta = {
    maxColorCount: 5
  };
  var godRaysFragmentShader = `#version 300 es
precision mediump float;

uniform float u_time;

uniform sampler2D u_noiseTexture;

uniform vec4 u_colorBack;
uniform vec4 u_colorBloom;
uniform vec4 u_colors[${godRaysMeta.maxColorCount}];
uniform float u_colorsCount;

uniform float u_density;
uniform float u_spotty;
uniform float u_midSize;
uniform float u_midIntensity;
uniform float u_intensity;
uniform float u_bloom;

in vec2 v_objectUV;

out vec4 fragColor;

${declarePI}
${rotation2}
${textureRandomizerR}
float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

${proceduralHash11}

float raysShape(vec2 uv, float r, float freq, float intensity, float radius) {
  float a = atan(uv.y, uv.x);
  vec2 left = vec2(a * freq, r);
  vec2 right = vec2(fract(a / TWO_PI) * TWO_PI * freq, r);
  float n_left = pow(valueNoise(left), intensity);
  float n_right = pow(valueNoise(right), intensity);
  float shape = mix(n_right, n_left, smoothstep(-.15, .15, uv.x));
  return shape;
}

void main() {
  vec2 shape_uv = v_objectUV;

  float t = .2 * u_time;

  float radius = length(shape_uv);
  float spots = 6.5 * abs(u_spotty);

  float intensity = 4. - 3. * clamp(u_intensity, 0., 1.);

  float delta = 1. - smoothstep(0., 1., radius);

  float midSize = 10. * abs(u_midSize);
  float ms_lo = 0.02 * midSize;
  float ms_hi = max(midSize, 1e-6);
  float middleShape = pow(u_midIntensity, 0.3) * (1. - smoothstep(ms_lo, ms_hi, 3.0 * radius));
  middleShape = pow(middleShape, 5.0);

  vec3 accumColor = vec3(0.0);
  float accumAlpha = 0.0;

  for (int i = 0; i < ${godRaysMeta.maxColorCount}; i++) {
    if (i >= int(u_colorsCount)) break;

    vec2 rotatedUV = rotate(shape_uv, float(i) + 1.0);

    float r1 = radius * (1.0 + 0.4 * float(i)) - 3.0 * t;
    float r2 = 0.5 * radius * (1.0 + spots) - 2.0 * t;
    float density = 6. * u_density + step(.5, u_density) * pow(4.5 * (u_density - .5), 4.);
    float f = mix(1.0, 3.0 + 0.5 * float(i), hash11(float(i) * 15.)) * density;

    float ray = raysShape(rotatedUV, r1, 5.0 * f, intensity, radius);
    ray *= raysShape(rotatedUV, r2, 4.0 * f, intensity, radius);
    ray += (1. + 4. * ray) * middleShape;
    ray = clamp(ray, 0.0, 1.0);

    float srcAlpha = u_colors[i].a * ray;
    vec3 srcColor = u_colors[i].rgb * srcAlpha;

    vec3 alphaBlendColor = accumColor + (1.0 - accumAlpha) * srcColor;
    float alphaBlendAlpha = accumAlpha + (1.0 - accumAlpha) * srcAlpha;

    vec3 addBlendColor = accumColor + srcColor;
    float addBlendAlpha = accumAlpha + srcAlpha;

    accumColor = mix(alphaBlendColor, addBlendColor, u_bloom);
    accumAlpha = mix(alphaBlendAlpha, addBlendAlpha, u_bloom);
  }

  float overlayAlpha = u_colorBloom.a;
  vec3 overlayColor = u_colorBloom.rgb * overlayAlpha;

  vec3 colorWithOverlay = accumColor + accumAlpha * overlayColor;
  accumColor = mix(accumColor, colorWithOverlay, u_bloom);

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;

  vec3 color = accumColor + (1. - accumAlpha) * bgColor;
  float opacity = accumAlpha + (1. - accumAlpha) * u_colorBack.a;
  color = clamp(color, 0., 1.);
  opacity = clamp(opacity, 0., 1.);

  ${colorBandingFix}

  fragColor = vec4(color, opacity);
}
`;

  // lib/paper-shaders/dist/get-shader-color-from-string.js
  function getShaderColorFromString(colorString) {
    if (Array.isArray(colorString)) {
      if (colorString.length === 4) return colorString;
      if (colorString.length === 3) return [...colorString, 1];
      return fallbackColor;
    }
    if (typeof colorString !== "string") {
      return fallbackColor;
    }
    let r, g, b, a = 1;
    if (colorString.startsWith("#")) {
      [r, g, b, a] = hexToRgba(colorString);
    } else if (colorString.startsWith("rgb")) {
      const rgba = parseRgba(colorString);
      if (rgba === null) return fallbackColor;
      [r, g, b, a] = rgba;
    } else if (colorString.startsWith("hsl")) {
      const hsla = parseHsla(colorString);
      if (hsla === null) return fallbackColor;
      [r, g, b, a] = hslaToRgba(hsla);
    } else {
      console.error("Unsupported color format", colorString);
      return fallbackColor;
    }
    return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), clamp(a, 0, 1)];
  }
  function hexToRgba(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map((char) => char + char).join("");
    }
    if (hex.length === 6) {
      hex = hex + "ff";
    }
    if (!/^[0-9a-f]{8}$/i.test(hex)) {
      console.warn("Invalid hex color");
      return fallbackColor;
    }
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return [r, g, b, a];
  }
  function parseRgba(rgba) {
    const match = rgba.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i);
    if (!match) return null;
    return [
      parseInt(match[1] ?? "0") / 255,
      parseInt(match[2] ?? "0") / 255,
      parseInt(match[3] ?? "0") / 255,
      match[4] === void 0 ? 1 : parseFloat(match[4])
    ];
  }
  function parseHsla(hsla) {
    const match = hsla.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i);
    if (!match) return null;
    return [
      parseInt(match[1] ?? "0"),
      parseInt(match[2] ?? "0"),
      parseInt(match[3] ?? "0"),
      match[4] === void 0 ? 1 : parseFloat(match[4])
    ];
  }
  function hslaToRgba(hsla) {
    const [h, s, l, a] = hsla;
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = lDecimal;
    } else {
      const hue2rgb = (p22, q22, t2) => {
        if (t2 < 0) t2 += 1;
        if (t2 > 1) t2 -= 1;
        if (t2 < 1 / 6) return p22 + (q22 - p22) * 6 * t2;
        if (t2 < 1 / 2) return q22;
        if (t2 < 2 / 3) return p22 + (q22 - p22) * (2 / 3 - t2) * 6;
        return p22;
      };
      const q2 = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
      const p2 = 2 * lDecimal - q2;
      r = hue2rgb(p2, q2, hDecimal + 1 / 3);
      g = hue2rgb(p2, q2, hDecimal);
      b = hue2rgb(p2, q2, hDecimal - 1 / 3);
    }
    return [r, g, b, a];
  }
  var clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  var fallbackColor = [0.5, 0.5, 0.5, 1];

  // lib/paper-shaders/dist/get-shader-noise-texture.js
  function getShaderNoiseTexture() {
    if (typeof window === "undefined") {
      return void 0;
    }
    const img = new Image();
    img.src = noiseSrc;
    return img;
  }
  var noiseSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAADAFBMVEUCAQMBAf7/AgMD/wID//7+/wT+A/4FAmYIAqIKnw7+//4EAisEAUgGBIYIewkFVhEJjAoFAuEFA8GWAv6T/gz+AzER/25z/wu1/w1nAggL/049BQUC/y39BrckAQQp/wr+AZYNOvx9AQkN/pELUvMFaAZTBAgIRgsO/7cJNQT+YgkLwRELIf5O/wlP/v79/q4IGAYLK4+kAQ1tAv4IdMpc/4xNMBF2/lQN2vTFAws9BLf9/3kJJgsMRF3+HwkLxfv9BVL8BHEN/9gMsg7cA/13/vv9OAqWA0sOofP9TAsIe/4FQqoF4Q/aAgsQwnKQAwa5BP0JW21NqgmY/f3Z/wkI7whGjAr7oAkLrGGf/JH8jg4zAj4R0Qr+xQ8VZv1Y/8O6//wfA/5bAT79/lQ1AGn8egkKdom0BgYOsfjtBAVDBoz9/zG0A238P/tsbQ/+A9rIig/HCEtvIgrM/1lwBWgIlmr62Q5qA5FndnEIXa+PthUMrqiRfw6SAodE/0cQm6UOirP5swuMCrEOjvo/dBVSA/79KvCgSBL9M1E/TwjUag/e//2WdPZ2TQ9ZMvfPxRD7aPpmOFqXSPu3pww5B/wR00wTgVf3y6dXW137ffv3c7GNj/icJG+4xvYQ61++CZOVll8p//uXzgyTKg6m/1L47w3cAY8EI1T7xvgKbkr7UsGBJPNsB7xL2wuvd5z3svmDmgipcGT8jez8oP0R6bNYuVpUxRn9LZVkqIijYxK7K/dZBtjH/71ZT/1myfz52fVm2WBfk0vxUFj+Vfv9/9plbfz3yl6VUl+flbNijrpfpfz5TZSGRKAI15X14pSt4vwQKMHOTQlKifz1sKW6A9u2A7R65waprffGcfeY/8iyUsFh3rn4lGERMUHJolveAs+PBdb5iZFuX8S8SH7Ekfe8Lwy0t5cLwsD3s2TzbHXa/478nLtNQ6NtstW15QvaKgr25FJm4vyXwFlPInIPId79dUr77fmr18BGdLHIS/mGx6dKw64L7v6k32XMJrWl8ELA3C70AAAgAElEQVR42gTBCTyUeQMA4P97zIx3ZjDvHGaMYQxjhhm33BGTY8h95sodkaNkXVGhKGdUri+SIxQ6nG36VUhS0rnZ6tsVfR2ibKlta7/d5wH7kMaTxlOVozEoHgU29/ayNC9YlrZdyVT+Lf/dAsDDc/xfzX+MLBa2LK23goK0aXhCxZ8qIAdXYj+c8zviDOtRkhEtRxNajHWLuCtdcfQqV2mgRlpDD6wJpKpBrGON27qa4nNeQOU8ViU0pZ2eCMN5mWO7bfR17Q9ItpsqgZJNJcJSq6cSWiV4q1zIDMmkqzAdpqT8gI5G3qm3YEyliPPG9kiwF7P99ghNn7zLs9EXFvFdLmlOdKBAp2ZyGTcI4JuBPYrWyGCYwgFwOhTmHeYC0zEDSp1iX3W71cqoW332M++OAYJUrEySVX0c5lzmDgLcAQ1yFVVOgQ5l+j1k6TEBidTUek7OF4T2kDYo2eVGwOrglKyGBXYyBrxFv9ptR16B+BJ0IFCsryJve0ZEuzNjLeEcw/0aK/kyku6JW0BiicnCBFptKAQRRNRrtmUV/YOn6GNMHXddsFf1YZCHMnFWgcyp2gnLOWTTBcVQVvM/FTgJAHl0NWHHzL0eqzuRXTDCEO03DoThV3kezhrtpNqKW0Bb3MSSAJMmmVnLEpexS8JrmYOr4KXz1cUmByty3N/sbEzBSP8tfGSCJ3caYDhymsPdGbwO4HAl/+PYDCZNf+H6kofkNk4N4Zn6NM4y1lJD7Tt2gyklnrR48dgbfHXgd9uzHvpamm3wKhcaLcawXWxL5T97dL7MeW3aZ7NDWksVZyZv8VQyjm94CDU7UjtbedqOCvB2DdE+wFC6a5JcEIgkKRJ8cfTGmW/2jMS5LEWWKiGY0BFaDNQ++2+sOifPMQ7CcHeFx+PPpcbzRoy4IKmVwHg/1842BwoGc2qlRVoNjCF59oXsrcBgVEP4u1GIX7jshIMqqPdbGTRJzMXcyyyiNG5fr5qFrUVntrktt4QdJugkr1kzNJCK1roWpTraix9JVMpZcsxGYsJlGiSyEgOFZzHy6YVlilnicmxUVkdX/PetzMBk92PNJNkIaLhmA30XPCrMuncWxOZK9kpLnqpYOOsLFFmaf2Mk8OH+BbwPH7HBX2KGI0Ns80gleH+Y6k0YZcF0sWgpoJA30BBbG59XaKyBHoxFtc2p9sFvyXqo2v2aRKN+1HLPshCibfZESAESYsLXmz3tT4wNMp0Wali+VPN93JIJaQ0AcXGrNMnSS0YASPcaNh32NhO0sWHKPhrNVpCBzyk4EWR/PnmKE+3s2cDO+YF6OddPNx7G4AIrZBPldw6tcss4bqzb6hBy6ccf3YaBSNRBFELueRFp7DXWNMFVAT9J1LNTntEyEI2gJS64oyKMKvSRrbpPQGE0rEEmHyqCl2oQravq51FwJXG0m/pPdRA6Xp3sSLdwGwNytaLg3g3VEE2eFESy/GijQPwmYPjwJT+bH/ax0dNT0NZAFQxyIqKzET00vUDuJ+T25QGCclaGZiJBxsjtz3YMZ0PPsq751h0ldwbZstMgHfnauk/7n1eZxEmYIPf5wPt0KJvg2V9bcYWGgua/Lvn/xG5q98tPLcGzHaac2+Cbs3niyPtGgfYgBT2OHgxvhGxzApoPxPoCOtUNCXX+ojW0ug7DOuyrOOG5GkWhaAzx6ZyGE8qbCPS1oxzPjcWSrG/ICNaNMKsra8bIlQVvmRQ/FY4WiHhnrVz/VfdOiOu6u66gG3NKogJ/0rGdbC+iPN1pbZ4HQAZODS+mC2z9dNBqSzd6mTQWKq+EI3fXgJQdqfqz6jY6Fbs4sWT/QkaLUOBnMhWRmSdrpTy769BcCql1UOmaqtFbDA9d7qEox8Lpa+TPXX+xm40jrB7EBK1lwu6IMud9xh7NBZCbq6PNN/QdTu0BVa2neF+s8b1dGns5tMGxQIP/+fiY60jZNp9n5D9MLm4NLWO2gXVG4xwDXHeHXMFEAITOVUGJRoBUwOV3miiTEPPzLrwDm74zFsW9zkfCASQvPi2RaF9qJ2HHWMJNxCHzDym6tNfXiEe28ZnjmHVGwlSvfgBo4afqcoTh4NNq7QQ1KrPJW+1uHEK1VvTghGa0DAePo8D6D1NCYgEPY239D/RQSUMxWJsAIi5KEp/3/9LH1wSTwl8/mfekwWyIhAwMPErzWxVSL7sFnFT1NqJ+Zb8hX4cqwyucXdUVkaqNeVL7abNtJV++aASn/d+Fw9qlVwplz4SqpVw5CBK7nq483nxbZ8p/8TtFwr8oD5uhq+lxfovd0x4+MHo1Wv14SJzqBo9Un1KCZ8NWfbA7jLeoMjnCcS8bjtKuxii0+0RPZlLS6NdhNKHeN2NSdCswa+K+aGFUTD9MLW9R7mhPT5i88TZvV5rWtuek07W/vBev9eJznPGkM8FrCZ53AB8+Ig7vKms99yRb5fpyoQssijTwz0i22O+HvjsjyGXpqseb4t4j6YW86PfJF2cnjmy8EKVF8sIomGUdVGBquOIDIlHsrgPkJEzw7KovqHB/kS+NPgs9nG9FkG1MJiA0GNwTyj5dRS0uiWTfSLf7jpL0ioLExajL/OJPkUbA6CIdKjpU6XrSY/6mE5Z1IDBoHX7tGx9fFkJZQPrPIW49pj9oUEykkiolzaein8mBh/C/0eAzYoFXHWJxYZWrv/ayPmcWsjfWyDy8ndnmPTldcJ05MaxOoIHWPcND2SOan44Wc1Oxyk59KHbiXwbrxB3qvAEA+Pd3zc3MkDFmxjG3K4ZxjHHfFXKNI691kyRLjmRCUmTQWnQo6XS8JNFBsTkqiRQpijalraTe1VPbpa1394/4PM+naUIl5jb9OQw4tXHsFyAoD/x8vmlYJu23hfowcTnJOXSMUdKum4IqKUd4HJguRiprd/Etw9K/NJ+UKE+T2v39ms2JRGhtNDxShw6kmZEdsr6fwVSzZUCgj/xK8CaD46MMqjtVmEE0DTPS7yo7so402lkAAr5A9TA8YbapYO+4tLHK+uBAqCsdrmkNB/tSNQxgrZRiBjhVSt904TQbBmEDW36UhZEwZN9TbWh1vtrLVYdkQKayJHgjO5aVftyaOhbtIVFjq0gImWcFJbXqPp+aGTaOzHzPptvWbli/tEz5BHs2WdU4y01sOWIdG+CPWbxSDnQ/KbYgddG1ggtPPUFvXeLdNH2EoslAveJl8GUVaLs6WWsoo3G2Q8KnvSkrNV13rJm4fF2jG2NKE3FMgjWPyCyVVZXDxk0WKQyzIcdGvhovfXwvS237WZN3PvX9Dh50V1CMuemc5AkPWBJzzlg8giqz/M3mICBajNsO3PSuByw3zV51gCTybHlfu/R+zXwVekhzN1C0gZCgqc3x8EUR5Mt8LndPRv3AbLnf2ZMLJ2TZBapthY8hSsIET5/vpH1T7/l1IKZl4pTp2eMVFT8J+1JyElnizM32GmBQTaTDJOwuvPCV3QDonD/6xjwgR6SA92MF+v+Xlo/BDyOZJpkM7QFh73uKxzX9hlDol/x5HVESyPM/HNyF6MwCg866UWXm9Jd2xsjrXyEKgjl11K41nEwzFzjyP0V9T87dStAustB/MkOwBaQoOCNG0+6dfSw2YIL2d+aAFbtewoPIATWJC+6il2nDFDx8Vlxg2a22oZG4My48gnrQEcDxOuE71wz51mkfvC3B8gjF04baNRpg6SGoHIAc+zB2Qqqn9yEzCXfpmpdN2kxdkiMQ/W/X7iT/RzkpBGvlGrx2Bs4pl3s8Akl3mRTsubk3x+CQH47r1ZNgECzf7IP0nV8lRUj1XqsW9+wNI0+oAx/lOGVsHcmalqdAqT/Rb+rp3wthEPxjXI6irxhTZc9U20OHSbYAJCX6MKHYW/P8XRlyam7KHfk5VTu8Tmebd889NmQ7hiuPb6bQu8inM/FOXkO7iEWd9hgyBVEErR+8P+Om2lFcXGp8DGe734LHfS2Pk7/pzSwPvdrkd7/NgVo0V8s5ir4NYME0CzGbOVoiygQKh+vexBN5PkUBa1bYInKhFqBi7f3FP9xdy5wmH5ByEL6YmlsN4H+lvQJBG8TSvwBmhcGUafV9uPlIYlkx7S81YuG+rzfC3Eb07PGLSnvKO1ujlkiGMoliWkYJ6XYpHzhP4z5odeImZqKxZT1hFN+arPz5Dw2e00ODXsBCGrf4jB+45ZT7UrN7VBRUYgrUJx0WkxNyMCSxRCIYwgyqxP8Zv9VC+6aiUgB0eIt08YI0fh2ZFRqSilUuRRvmt5jejdoSCjfaRFSca6RXh9kVAjX/OeC8Fbgdo+Ffx9K0zF8p4sLEk27kG2vWNThL82M/h1BScI2Kr8fOKkYdh+WXxAYVPhsD11sx5SDIEyx5CGwE1cQ3osdYdlEP3/AZPwvH8oc1WdqXU/OM6fdPELtY9JRSNHEepmC3ZWgsLZss2H2qwq00xxA81SAexVdwbL1ektQlJeVMZAGObIMXLK5lkb95dhjMzkc/Lq17iiAPa1uAovfIZZLe/kaNzRCUCr39gjN5YW18DwBEKdQkVriaJc5BKEHi5s3DEMukQIe9bStXDHyciJ0Xv84FSgb6OW6WuhFqtyjdjWTw/jt87MnpqzC9LTP5d6vqhMo3Y4u6dwfNAzL++6ah0G8ahltlcWiZPeGtcG104UJ67f4QMwOqq/jMIFw8leQ9VsbOhuOtjYqx9cXIaiBcng3fueAQPIz7hl+NJ2ltWAECQIyl81LAaRwlbECUyuuxtH/i/nb25kFilIsdm9q0qzIVxbO2/dyBPwsOdwI/A1NIhXctIgDDfKCMOLIhEHXE0TYiDRDEMkzWtQ9aBbO3WRIhTdI8MGpPh+xE3SEvZM3TsaSkSwo8aIp7vcBPSpNIUWc9dx2ihGIUfcCMA6h6H0sgzlYo2LzwzsSBG/vPLUKBRAIDClNo2hylJMPNHUF6/FyCi7vsPpUBU5f1Zryco/9dyqeIEYzdzRL4fhRqyDTW1lv0jlQjuBtfaUaKBPI7Hr/G7RcawKWd8xytCCHq0tGrABFlLf+tFnXvcFRUS9SdsaU+DOI67yy47KiS86yVHnkbvbnhw7R5+QMX6efQ0ueOVdVkKZ5o+0GzRYPc72WXnZ220/EEPvQ2mJs9umccvaJ9JQDlWujkWdH+bCuOl6OBriPwtt/6D57aofIHy0JVbraWRZDo7xiUeThF4JL+APjur4ftrBDOoDbMmJGGRvnl0iv71YPgcPgMSa8PT1ZvFkRgx3zPM6BFff0dTJbRNIHNd92hlQTTuYNVd2W6Pu7Myx+NgVOiFPeih7aHHc/Dn2tVtPIQZTLWhr1BSVJzNpZo72uzoDQW1D6KG7aCPz+193FdMxFtZ/hYE8idJqfsq7jHo6USnTep5tp8D4LWtSPqIJS9+U4cc8Ym8lJ94wuv8uj5DlIsflhtItJUoeNhAnkdEmUMIsLbGt6thjaw5suLGIwXg96aII8ttrigpcKpcdmqmOegLraj5h8AAQj+90zF3YhqscELTAFaWZuUAQMThYiUb/FNHAlDUttdbQAyP0iCmwvBlXj3bwwGkEZxh7Y8fY1TB+UUdVfjDXKAaoLYaWGWCmVzzxQxUQK7wSFq7btNyjcmKx2vXgKNSocDI3W0q3gacABoST1YfO0NC0OZ3VJ2PUAwXIcsOj7fJ6GGGw3hkT0GAMOIASUuHGB1NI2BNAAuhQtFj2vT4FWOBwA8AZQCJQw8v+fPYq97G8tFNng/7Ieg+y8KHAcI5wACkQOUMBG9bgUsiYNGzPHqgpWonRw8Fzw7aDForw4oGUkSvQQ4H18ev2sHhEVc+aMCAykFFh8LmGKQVJKhIlOdALmkAKIDBkf5txoCxwKdUAz0ToWOJaUGAeneA3pOjwFyZwApO7V3akpwjkl8oyOFoQqEjYfUC0cBHVCoAzuMMH42EggBKSJqxhsQWwBEu1doBqQKAktnbzMzwTSck8w4yPZwGjYeKiAjDxSHIz0HE3EjHAUOAk5RLXQHqIsOrysqUAHM8BmGZRVNw6Mi1QOeAQRaLLABABIkQAM0yABTbYCxYAC+HWBJ00xdN0r3YZU7ubbjAi0CrjFHxLMzaNEjFLz+4ScStCg4r358a5kbAtifbaHcTY18qVrMIdEEISdanHgWFdkBnM8/SEkTKfoHaS1aNTmZvNwAflsqqgZLAjBXyAMFyrIpbAVGV6oAKrCcPqAr45KYS/sfi9mObGiSlB0D+wALckOOCGOriDK83ywNfxUfTw5tHzwDGiJaJ4SU9holF5fx3X6qZhsRAQeNjT8E/kvHIKvUY1sAUZAea4Onlj9sE68EoEUB458HLCDmAB8MIw6JSiQAN73SPLEOfGU31KMYEYrTousmiyRtBTQ7ClaT3ANP6uFYKL84ahsIP6ssogAAK2ks+AYESgB6V3UYAypGWgKVqngClwwJ4MMim9fqCAHJWh0U5DQ7OVAdSk8dtdOMDCrNkgSBo/c0qyIuBDEFbkh0SUHxE+47GQEo0sga4YD6zesDkgAXwjKzLArVShiyFFWSYXkS3iSlNQsBUb4kAQKUESNv4bFLCMoBtfxJAAAACsmEpW4PjIM0DDK2ZbpZmBCz6FoZBgXsbtnLKab9EAxgAVmSeUimBgihp8IvMSfWAwTyz2AE0IhEJxVzmmrwNT0PncoCGQXQtXwua50xk3uPDI1DfqKHdklTBVYAioGcInu/CGIX1GcrkE1cTAHQHxBAprY2Ib/AxT4WBxZveQAd5CwBQsaMPgkdmgYbVQpqCW6JAP29BmFQDW+aDAMuXCMvfT9WrGXn00cmaaaXZvgDOV/4nwXQKgfTiEmisC6eemBCMrpfiElpnHRef3auBiVEA0qLWeFLEAUBBa5BCblqmQV/CgAZ1UEFS2EgCvpyuAMpGyc9BVooZsCBADmIoACXkboDAEwGNNmnABevAQcGNhceIVFDux3uWIIEPQAsjr5l1g8ClQpMAwJsOVsOFi0Uvq4cDl8PEVl0AAdaC6mFaVQiDNeeA9ECv47hpTZ7Qk1VRRwbdRax8vFXryTiYolAIwprBlZ0pa+KKl5wBU1lQRMCjFIw0l0YdXYDC6i9MgDUC6kp3+A48fLH86hBDQILLQBhZJ5hWwInm3QIHgYZEWvbV70xWqoFLAPERDLK4HM5/cWVKbX8bAMEE7o/Am2aue5ZF6OcLqqvVu8EC6f8aJbYBZOWXW5xKyBANEqjA6AskyIoAf5MBQGnKBpoPTABR+0/oFUHAU1VAKsOqV5NYgBBHwZZh1rUncwDCp7sSWwDQTYKBQdpCzmIrMgNN5QDEbEvW2QFgmmkKFOns0WDQamWLPHDNVGTniIfRQ5HqfKsg8Uue/ER8pZHd+ebUSOm7KgF63WiTIhrWg6oJYgEMYc0LhWELTvncXdcgScC3S+BnrjLYYsZK1PXQ4GJZugCuQAClGncjGcMCJwGMHx8c7mRwoVCQAMJPQO/MQBbcs68Zz2lDQgs/R85PVvPAzRJwGkC7MYIF/UDBRoHd1GhwYuAEoXDO6sFqIIUr3wOHGmZFK1zH11Bh8iGFWc8HgEoQwXvQRxHJDEUBTF/AplEfWUmWSMJpiEUvAcghlFGEQtETwA/BxQAeDBBt1IYKa4cADo6WpUuAAMg0w4DBroB1hgTiAJ/RN9REX0qcIM3Fb7b2AEEm+mOawIEXgFg1ne8ByE6fvMKVpI3IjdsAQETBiWUmjZGDQhjQTF8FgldAgNRNiACM16kCBXhkWoUp+4SP+hEEghL9k9wZjlmc6scT6cUqAASj5U5aTAbAwOEl3ICCG25JR4ffsEKYfUNKIkoY2UMcAkXDqEhrGQ2b2RrqaXjAx81CAUWeXVrAI4mGDm6bXtoAwYVMi4GSk5PUVtclscH8gIhvXQ9UiUA1unQH3gHBwkwq/5SRAaUD0GYbE0QL2MAiQbzlasuGxcYAwE0vhmvfgAe3CW/9BQfAiZ8Tnxx5COM3BRtf6U+K/tpYA+lJQO+LQPteW4WmCHRYyCQALcpWAIX8w0S5CQPI1seMBmCcEAegczCb/8FJpCzbAWD3H5NorMaMENXbcyM+SqnzMa1KAA9KRESUQB+C5mbhqFe5lVYhRtCGAK/a7AxcRIgu2O0PwDuLixjUViaEgz3FA0zqDci2tBRCSARPgRBM/NkGRlZeCFnHlEiyaQrgIgQyl66REcXNJslVzwimlyANCOKfrhClEyKOdFL7hiibMlFBQQg1jaLPAADCPz3BFXbRsbE1+oiTTkKCl8XnvRMQbUbRUgqR+ICSw/lJnACx3kIAhaIfB8W/BnkAGo4MoPAYEEA7RTnB5Sg3RinVnQRBQYS8wR+CaYzXT07BdYMDs8Gu44ABtULIyJHDl9wejIEAGo6jg0VoCpEOI0/YewzCgIzcEmGYDY8+rhtRfEyZQblSwUeDSI/X7sFhPM8FQbc4nCqKe0BtEIkeVqJcscyajxYOUfpyk2ANDYfAOmZD6zJTRSBDpgL/N5wnUqyClKcYB05MI1UBooALCvUhuAcyf9sJiv8GyJRzX/IQQCyC3ZBSzwcO9sXB4AIlRE2vh0HBpcF5grsAQPnqAA7obcALildiZ92TM224bdMmAwPQINWrPd+RCgHJxgDfwMv0YKRlEBHJnpxkJytDXXpANUtIEdWWmUSBAcJCSPkZZ0GEy8MDKof72cdh+oTQjqaLH0McSmDa3cQnJ6lQ0N/+aitLGabIwgrEzCvmmp/o49p5V0GNlRLPRbu2UehI31oa8rgCQhEB6mYuZpU0KMCA2URBW47L4EFCEEgFz8IC8xlQBN3t0iRJY+oxFKsIMEPAMBxbQZ5ChYjF24zfKVBA5UGcHmAAsQ3Zgwn9mMueQ53L9/rahkcB2PJEpl5AIasYhP/UBsSETYp00xgawArAIQDBEgPegICAY7xP353eEuT/Ty9fCWnKMRFNQQACMlLA661MINMsM2jlS7bJr8GyFo0bmasanYGCDqsgIONKQqkAGeBYAkHowDYzhhEM59lCAFQLOH9SCzwQAl9AQZI8AdUPFsoFXJbAAEoFp1vvyL6CQ8nDsdymYQNX0B+FM0EBi+IBmIX5R0i5ed+S0/eRBB2EQBmGBUDWLTLNyEHJKJOPiJaTmkSDpwQNgYCGQqA1LUHqtAwOYMi/of0CMIHTBipAIYEO2MKkkC1BQPDFD4Ax8nmll9bNkZ7bmwv1wIH6qkQQndEHQYPeXxUrLUnE28cVsctUWoZGjYVKWe9VAI7RFHZnmsoBWVmYD4xTWNtGZ9wFawr+wAASdAIf6sAjAbfucWuRAx4jNliQHDSAII30QYUYqZ4xSGTct2+WT1bCnw+AJcbNXKKSE8ZFR+fPATWLFkeHQcVH4CxT9sDtA1cAFADBk8ZBBaRRpJovyFHBAEoMwPaXYvvOh8bfQxDvxShtHKe4KQeeg/AXhcIJKBkjxwgXgB+PCAtPifdTwusJGdXJibqGQzCPyySkBZJpz9En7iGYiCX83wDeQbt1TdkV6IAAGxhL0wERTmBBzESBRUdFRMctnmVblQLazgBAsJXtHhcHCclXRoeywgpDynhVqyFWAZBYTWCEviIXzaHwMxdN05xDT5FAwDkBC0TbBYFo2ssKCNOTQkodAEG0uYMXix5sMvSBZxfQ3Egc5k+AjwvJQOEN9rFpuYXv4oFPCULWRr5AKprOYWuCATtAAlKBrcGkIICAd6cnwxqtl0lfz/5+hUR6q/mHdbFA68Qz8syO8Gibp8LetHFNF8tRAV0bEYORkJhTRQFxAMdPwUJMicmXlQKBmMsZwKoAMA1DGAAEQEnMhcBtQZgNggLxcHiAoCFFYEMAd91E7K+4vHKXBbOfJrOAG1E1YEkqxGsNwUr0w0pR2MitIQ5BlqXAA1atwMCSgBYnTuUtAxxNg0ApC4fgrhL7D5sQQM+pLcGg2RmHwIZNZPGC/cI+3Dbb8WlBSCJ/uO2txmjCBULLyHgqeRjEBLnACxYAkBvBQE2owNsMXy0kzWqADm6Oh7HbSK2kQ53AIoKAFWwN02IAuhiBIQgP30OBTUCcpQr5T2fJjB+bUd/2g5Go9sMv5CrnFlpfAWsi+mamCLtIz5VFsBrbb4AM42rGna4cyoQ2eMO3z8NN8BeNKCKBQp3jFrOL+zqP9WWCQukQGBjmPsTAChybv4zgnVctaQ+ynQlaFQJtTPSxEAsRLwRAK0pStgs2M0EBQtIBmKomNWHKHU1uDIsAg2kEHvlUc5/AgICJ34VcpskFZHSgGFydLhFCo6nCXFfWXgIGgY6R9CKIkFdswK6euK1SRkYAxdXV1Z+9UWpQQOzIqloZy0FIoAZfxX7FAEasEKHC04pAAbnGP4CkFFkEZniWC3xBD13ADNArAFjkW8nICQKAOvmzBI8y+QwMBUgcrY0WJdtSxl0hFiiptgP3hDTlmpdVwDTCwZ0BDrZS0eTQt5GALQLQQJcPsQNOkguZZwCIMTEeadTAyR+ijoz4Qo4VzZZAAAlkSVs6VUcZJepUq0Svzx14BNIbWLpMC7XFJGvfVpoWr+cAI4twmWi2I9wqgwAaiwDPtB9E7z2SlYSA4hvaKQ1nAZ/MnZ2kRZ5P60FIq16lCYDVwVsKAx1BqPRgzsOZvKTPIoBn9kCKTDuDtMFqtp2nRYWNRw6ZBc0MvZ2DYu0CLhiWBeCK9jSZwBQ2CySAafnVwKo3rdJXGWGUQv5gHlWsQQUAFUmWXi4AQNX/oqvEnkEUKG6tlZ9QkzDT1jLpmR9fWCg4wByAi0AWeNCBgYJ12ItvmMCNwrVZkYzcU5GBs8aT0XcqZ04IN6FTgQuL9dZDbIa1W0ER64dUb07oB0eE80fZ8/do84xBFGBcwGbppkJq530TW9GuGMsjLJLNAWrBU0KAKYedUoDH3QB0iGTAE7OOxuOVL8BIAMPUxKLA7HUBjHBHEQvFD87HYE40ZqAAXEF3+EI/FQAACAASURBVAA5VAcYSqwlTR4TFY8AFHwtHQXQhYMABwj490xjbrxCQRY1FA0MBmQdfy8KK5JQK5jIhiNb0AgjOAP7zB0TqcsihQUwRXSdVE4CD0RhWQx6EEYLhhYAeoE3P05iEwbgIiTEHEUiq1SOJcmGFl7Xv0dlavCgAliw5QDiemOUAuaucf5lhTXGhc5AoiqoZFu0WZDr+oQYAoJy3YAB2FsNETiWuCXLoc1tIQasfWYAMgQUTgYARFslHwpiRDUs1hBRoB0bQ7+s0NKTRd1E/RCeHiCeUK9JN5EAdJfznAEq8htHb5ADuUQCf8tY/UgQKaRCDSYrhAiA7UateS9WPksK2cYTfUrVpCTmA0SUrFBkXh0Am/veTf7P7Lb4DU8aKbKXz0zdwW3XchzRimAwkx59hHaKO2GnMbYaFW0YBYkNxWp1SEXiNNCm5g3DNIMgtw+ShZNpOpYq/Q8AswmkIiOEHX99N+JMMAC+JKYI7yrXvJWhZgcNbtz2wQA+bk7APAHTMxnOjSWcrcbzX+OZWahITJEaSlVq6X0QGs2kD7jsDlU8ixd3KQOKAgHdAVMANmNMOIuMjEusSjd7Aw4HHBUmlmJgCkxWYk4Veq5jVQ9CFDiuddoVjHF4dDYARDwtTkEhkSROFdWSdDsWaCj4BExuaA8OTiCxBNJIORyAAoMOTk1iT5wDLiZJBrs7VV4uAKKQCxESEKAfymPGhzOP0pVhBGA8ol5iCxpyOoZZFCJJRRXFTm8sA7PfEnuAEgFx0kBskwNQZhyzMLaesB4SdgBuQAKmhMetRhYAICQAP7EL9S9J8rk7xDAYgIxMIlDWBG0DAW8BYAdGkayHGwwrAi4b/r5sA0rCezgdXjtnijaFR5eSBAz/aVQ+mggCDxmYem6hDQtN369pqjuUEgAYD0BSUCT2CaA0BkkSSiDM6jOEQDOFjTDiIQAVX1TPI7bMwK6hF1sFT16bBoFTnVAAFcgndTYODzc/52xpHRZyNxDDkQBPhGMNhklGAbYDJLs3NFGGnC8lCpbuAl06ZWbRM0QQJgfnBAVVCyqR6L9SLIHQDAVNGpYiAIc1AJk8AIAA0TfDOzNArLrhf7hEtVMnMAEBCT81VCmAL7wJ+AKFpQS0Xx0tbQDcQgEJZzcdBW4AOQB2yAAFEeGWwhWAatIHABBbsCfCPlQAikYBjxdYEHgjNAUNL8OWdGkAXgMfOQDJ05gDZyTItT4pIibKF7+xXSp4Shfkxy9Vylsra8P4h50uKHAGw0KZJbkH2GZs1xvMPI3ddzg1sNxcsWHdA6IsCN0GeRJtVDCuDUWwaQAlQj0Ad2Ca6wMJA8+cfEoKOwP0EoXGHg6EdQUZaed7cUveOVMeswMfGy++GDwFsSsb6S9ehSIqVZF71JbZh6LBFLIRDiAACUrQGh3yN1sIIYIkUOeTKl1MTeQYCiMBFATQgh+ynTsCSAOav9AxNUF/AClE0gY7BIsUJiVNABBFJRT2FwgAslkF4mtM9lMDI6AGHrsDBEMhcPQBAnwmdg8o7YkIzxJYkJ77A35vQ2M8AOfeGivv6N1CumQj+RUGPQOXLeEAqgIp1Ig6o3nGdRl8PTUJyQFDEAJ/KNdr3gkIBywcNHDoiAfNW0CHClyw+AbbsU+ruOwbBAncmpU0WePmFgtJd4UAHD+zLgBSQQAugirUKWA8ERwyAjfDPLchDh3EdJRQgbHANWS4bDX2QWzJ2mJZh18YFTBxVgJsBe9gFSoE7VZXKLlzBo5G6q7l1hLxmQMMA6MLWH9PJUb3QgGZC4SBAx0BINreFj822QBjNwMgk00EK/kAtPUvcwxhc8cPRQBSsLgAbRwSGiMBLa5gDN0OekNWCnc1aV9sqeReuiznCC+PLMjJAh4xhq9iAwgOI3IvvyBg2TibaC5IlpM0Lkp8BdcGL9/LB3D9u3oJVwBZDSkkPQIITsjVS5NtqzukBoSUItLaLUeGQlRph9bxmRwAOCK8upGsTd/aP9AhFkwjBnErDQYAAT28k+5LG8IaPTLcvCciEHIbDW8PS3F7ZABuCV2xjgQ+9MHk5jktIvwbTCddCpWOGVBD4QIOfa+MURkdX70FKoRNAA08ttApUKfTq7tHm6YZAJYNRtEWHxgn4AKWIzQrKipAgSK8tk9aOQpky24DUkQGZnVQoRUBP0NDRI/UwgIAMfAoEBSLZDEgLRO1Br6SV38EF7rXIx/JAQ8E3EALBQcSgN0AFFDXMM+Lcw4EFpWDb2knRW/mRYYdfAUdfQLwWhkUCJQyms1ksgTMpHhbAHil+gEBS7anHDTwiRpCrmULHlgkaWl2VL1GDsrg1apysgeLQcKytiGpZUOcDMqz7zAAQwIiuAc+MjjuBK+JmoanK95NcXD4JyZd2Nh5dmU8IRLLDQdeCTYLvtBn6g+P6dw9JTYeVpoGi4ogu1N/K1HYkQC/YBpZAtrEZABeIfY1qIPPzFLFqQ4DDANRwxLNOQFjDca2WfiWsYh/pDePNz8H8AwduiJsSFkTWQRoen8WGw4Ahh81nyQBP5AGhR0E26ZwQ6DHcrwHTrJhA8yogTgLH9PiAFsgFGUJZgB2SLsyWzN9ASa5CB0yXwEJCam2WKEPNT54YlMBn+0OZwAdDwgEA9SnqxNDFoEDQT0NGaOFEHRADFm8F23JWUQQGhMCArWvLhNCfHChBBcNC6QNK40boQEAO+lRHA2CUxLhZyStpJ7pkDc/Cj5S9VMYHgC1PkR/KyVZmwEdKqJACDEcjSYbdxq+AKHVJUhxUMLPdHUdbAACCP33H9UAA8AELkYySGs1NZFvoAsnLu86CBTGMDtrpS3xOIHVHOVVSwUjxA3XFS3diDMPLbOzB9k7Wc9QwVJ5rhsB6E8S1AAGLXom2BIGMhblrl1bFXIYjQSmRiUtBVEKRbNsx4GKS0NiJC+HPpi9LQ76mjyf6OVwqBcGUmYEXgMTd2A6HWqzv7eGEQxBjkcBU/NVLCeshKpDLHJlq2tKGXeSSwFCJS0yAwEd0QEQYULiWW5o1uMgCv2UbVQVInoFKCv7FzYEEgB+31t4HjUs6mheCcGtRwxkMsMlBBHf1b0ADh8dZLtXOJM2kDUSjgxbWZmpAjISVgRbC4sCJugEjdR31gAp7hMAnkgTM5YXSQOZPGsHOAKwefkwknwPEBMqfn0NhJUI15ICbM0TWmmseAWuYeBQiaoWCRAA1AKbxAo92wPXEUQw7wDfnSIrnG4CGV3YXaBnPavwW4OXApQBfZxDwQ1iC6MENCEJAOKZqDFUARg48iFDTDLhNwWjqH4WHAE7PALJFQV7EwMBmYl4Mx4WDqsCAVgA3AQC/Ncp2LMA2aotBnxeNApPDKe9EVSiGS9JMEtKwJUIlwMUDac5oIEPRnapEikLMwAhzQUgJ3QiA/CiOgqWe23hYA0ZAglKDSQZOAEOC72KBJoavjfOPF3IWRciaEYtEzhLKwC2bklkNZgpRwI6WBtPAw+npsDsD6wU0TJ18JCbBy4aNIHPCstFAhRbFzkDOiYSlyULWoWJuUmHMaMPQhe5B3kbXkVL5bZfW0cOMzb+WAAAkGLfDwBkZAAVpGI4umrpsOchSIGKAzcBIjSXoBNokAlDLAFxFpsCbPTQTw5xswgtiyR9QVUGBDzWTAaVDqEAbCsATiO9za1IUezkU2NfcW/LHFaJ0Z8ACSpJVAV9AnL57hOjBs+jBFaPVyvne8dqLUfbF8GOEKVCDVsBLgxdJgBoClkAqUMmZS9cZrUUCgko/DTSHhYGPC75Dm1CIhnzGV44TgJ57DncEMTOEBWMAIEzFCASqi8BMQDtz2WwAChwVFEFYF5qEVJU837Uyx7fUGxE1YBGgu1N0nEsGiYBARCJGiv7nw4CCctmfyoGrnruhwzdwJUyHQMCWypq8T6caAAE20uVHZAlymbvOgSEAwDthEIcfAVjEQBvBRkXkhxrAm2ikI8RNt45FNuOoFokRRdegaaQOtexKJK1HiUAJWEDJgZz22IINjqFaReWG/QEzfsCRBPGyDdYRgcCrzIksE9ZRSXiAdKtH2VYAuzuqgMa3rADi5QGUH9vDzLeOQIEWwAJV4ubXVPDh5EkEzIVBjBkdMcxmAdVxQcDjxzkZr7HeTUzAQ3p9AaLaZGNHWb007EKkvOzc+9NfzgpIllL5myLFbQLygM4XgYF1J2Tvk0uFwIOEtlkSmFFA/yLJ80NAoMAXcbeHgxwl1jcouxbixCh2lPHTFx3qtaG2fp20wrwOgAL5yMrCgRJvQQtg38vXwf6doIW284PZBpHpsBJPzedw5AHCAEMS7YabRQzbkW6L7ndADPqNCkhAZiLdAMYfiZIPOYjGAwGD9Y6vGuiItqzLShPPJ6nT1V7ZoqepyOwL/dvFVxifBwAiHaMARYTQUxgAgACKxRvBh4kjk4AAwUq3gAAEeZC8yAMw5i22C0+GDtgBDwBXg98AwkROUA8S8YCBF903leViZjUa90cdTEOBrwDXHw1Bg8SIAD9EsSgIQwFDEcasGfBcl/3AGhtMD6YjLVaO7gLSl0BA32wU8o5AecqKYOtbh4BdQNIjo0geknWgXWS7wGzHxZ0A3NqHQEBcwCtNqlyt+c0AOkASngGAApBSYNSsGARwxoqz0NA/ggLh2AmkXEAlkauySUDu3QbBNpQUzkdYm+uYokbAjUmTZkCjHh5Zg4uAQ1OY2Z3mUl9vCwNoKYnFjSlbmiP4RmPUKK7eZ0DPgnn0ZqDmJDuA98yAQ+aL1PCSm9NBjcyE3BMmwCmEOyvBOilD8z03gZJS04dEK5yxwBKUnLULgA795xy0+1MXWEPe0MSTWdOSllnH4JfHofxViJmgMVAnbIMYSY+wAUMGScQ1g8AYqARnwEBAwBI5pMFeFOj84MHBNMeuweIjvkDExPKh9omslGCSVgAiN7YEB44Qpp2LiBjPdarEADOBIQdaOdMeA1XMJ8TpvwQ2tGMe61kiAcdEAoCrtBNJ2/Rhs5WfILCBiM/lIG64B5EVH5MfuQS8x03Za2ACu7cEw7NMQ8fIgA9EhYzJYmjV4svwhdqDI+guRTTWvBAXB1UdpDG1QI4DIY3NMjq48cHAg/PbAeQEFlY8rE5ClIACwBx5RxSJp0jQxFhGENVSjUQBQw2iMOKTHxkGjWS9SnbArELcrY0rwyMZT8ShykQV+FwUJMuUgaIWSeyRBZdbRACRCCiiSAml2AEGGImDUh7HGwsHG5KaxaGKsADQ18qC6KJsaYtDUsAATMPnDFfNa8EAH09YH2HsN5GykhFWAxNkwAGCSh0Vh/nMSOlhmUY7RVMBADQmDc6QPpXOVQoBbAMOyECuunUyxPgsQ0ETnBwRXQBAD4Z9IYX3tRMpbUBBbEOtydiCAIYue+9ssJjHgR/2AeVIIGbAmlLYUymQyRwZQTXBlCWmgNl48hVM7QSIL0CdJNSu2lFnk8fiZUZPRFODQCEH0ExjxJKSHJHTWlhSvJmIZZqczI+ADBfRQ6D4Q78UtkAAwsBw2I4MWsZlxhDLwD/BwD4WAUGCne4shiGGyeronSUAQXP5UkAOZ+BfwIRRANQS2eyNSEDcP67cPQAAA5dPwTl5Eg5FHSFGiQZF6BZBxttv2GoyEQFB0xSNBUW/EssG1aRABX0L0oXTk9w9P/nm+ZVMmhBQhcIGxhYOHHoHwNzJldxFQB0KHapYgBDkY+WKIQBBS3cJQYOvmYAR0qKAE8GApuhVQDTKawrE0mPBQG0gt28GoU0YHBDwfqHHhjbkDpoSWVWA6kEs0e1jAIvmkyegpM6G1IBXUzELwUOM2kAISwmADRsQ0MwYxeYL/A6RQABzliwKBgSK4MIxgogDTzGA86dDMa+XUMCLkazOuVDGApvbCfg4CQac2iJU8SvkQMoMrD+PQICV+oinEEdBm0iJT4MyAhTZgFYEnkWnG9xn0y74ilvXe25Jbli4UIJQAJDDjXiA4QDDSiVdiMi/rXIbh7VAPAPxA4UU/bFj9kDQwQKkZtHAlmRGwAt1n4c5uKmg4kORgd5WBq/V17bNiFuAu4AXIauVmwyb1tJ3gLMkljMvYJpCGEM79RBkhofAX06o1gaLwLwTDaMDQEFuzw6UlE9ASVc4VhyijlwMBC8q5TXBwY+MsgHe0VJoAJjlgAUvh8zAAcyNgUYl0e7u2JdGR5GbEOPBQRZBIQBZnrZAvJGzYKVQg8nTwskXgRp1hvgBRwEizz0V35fMqtosBADNwJ5EsGJBAriES8rADV+1ohgBwcBL3YBFAiISgIAAaiaHtpdDgh2Oj1Dg8G1gzdxdGkYQwW7CQCTNDW1GGtT5qJptqfhAAM2bhqP/YwZCWvDU8wVZmt9qQ2yMo6+KHLZ/dslAgWy5BanAIcBnb5hcjI7WBZ6AqTuASP9LHZRiHh0WQ1dJzgqMXGNqSWF7duSohXEqt3EAck4ZwUVVX45ChZEIBYeFnpOC5wPIwA/Gt0cIcKsoqTJPZ1UTRMBWA9OMqWcK8/YAIvfnzBhEwXifwgthgYgEecXBAsQZSVfVQ0ER3w4TgE8iE6ZEIwoFTYzUwGwt2El03Wp4Q2IALsOJnVYBGZdKCUBwQAqAFqlQEZJRbtrwqcgXlIIUx2NcEShuvIBbgq0XVCNBAKhUT4JQB/OBgqIf3FzY6V7OyKAOAoBASg2GU9GAA4AfSMKojG0m5gyqAe3MXWTUgDAAgxFtBcbx3gCmAYBRCEIaWdBmXYDgQdPhQMSeVkjt+IFTuC6Ij8N8+cIOhMxFvN0DJU7rf6eCTpJ9QNR1LoQQQMgEY26fApxVC5HOGr9sKU9GORpdSRjAW4rUEs3GgRFo9IJvYmKIxn3EuAwADMMjc+dCqyePSGpQbkhEXoVHwb9SJ5eMR3zbXZ4JW2BqZVw2l7pIXRrAhSAEAVRS84yK4rNO2l2wNVcCFW7FQwbADpohDhH+ALV5AgD4rQpGReMQ9tkmLIzbxPPHStlIdXCbS1hCEj4yktcH8cO9QspuSFFc2sfFMjhw8WBfwH4AL00SwUDOthSQB54xEsG0i0ACE7WuddaHtLJZxcCSUEYrDRF7xRceFE3AC2x0k8HnShj+8mn1AICDQvHh7yrNLLpdSMBOF7XG0MIKTpg3XePZSgxj4EUDQW6ERczAmkHACMqRzp7jwLBHE1J+9rgGE0jMKR9eAC3iUeONakBJAvMALJ5jyVnHDpo4HcqIQQqJDKFNBhoGQpAAb6m34tpMCwA0p2et1pv9wIkr2yOkSgpxQLKc1IqDDsWJgQWiFnICOdG5B2pQ1FQEqBk2k0FSQ8oLkFGe38tCE61lDAABt0AMaACES7m5uDMWkOQJp0/Hg41dp5mhRNyv+xrYjkRExpXAACXB7ToUYIOVBcRGpltVbe8OYgfXFsByY4hGhkpkyoB7hcF6K0uvEqfZ3griUwBA1c/lD66CQFPcuK8UwRxQHrjeyZEa4w1vRQqYTgxzxgQEhpdGRUUHRNnf4vqR4ObYGCWlrtDMwhWI0ZhExohPDYcfbYDowruYrcukRU+j0IGABZOTatOWA6DbwRHWnODFRc4PImVa24k7ATGb0kbQpcSsL4YFbkgARWhBHl6vFpBPRSyVmOdTmIXefPQCLgLUWUpNV+MAwdW3p10p0eu5BxC504BVIXy9c4JWFeJA2BjBxPZAnIBVQAZhQU1ADH4DjnMGeNHLOhzGY0L6yQtbYoXAJyb6u1PF7UZ5yAt4JwGYldYBd0VembYLQBnVTpvhSA/ckID5KwqDCHKBp0YAiR0oOcfXFD5GQY+oUJH5JqHAR8UBB9QqIcTPwQDE/cukJsaOVIbAuUBaxEVKvd3i2+Q8BAfV8nGOwKY/DtMAgkLMOnoHpCTARcGXgIUhPyYDnVrAExDQSJ1gGIMGgtYAytm5mAuUxtoB58TXTtv6wUAa0NdRSmbkMUEc15QPzEmWRQCSiw5cA1VoRQfWtxc+T0F03kr1T9b7QirrbwAXiw9TpIQLwMRz1BPIlLVz2C9KLQez0US9jMGnUkwCDWWKKWkjQlmXDZjQFxL7nsoey5VQwonAARTHV+7T2o2FlIjAghKc4pLVFWlP5YBH+iWBrccMUpWvxfLgF2Uc3GlpxBgKSA1C26DD6lECOuPBZ1vBhzxaoJkOfOGBXEfH4SpqLmcqQgHLqpA2FJvoLGFBTTtEVwPgIAWD5czgF1YKwbKK0omhid9pnsG3sdBFgMCnWEwrAt/AAxsDcl3PWYuBXYZt/VAEHZFRyu9ERMlZA7aGdcCBgAJCPb3D2AtAxKrHCcRQEh3PMxxSgZzhpKkABTYngRSabRPLwAEwOdIZ7q4CXUDSQBW4y0NAs3GAJEzApI+A3ch8L5wJxDHl31utHwtomsfuOkYFHczQFQ9YpEkspI90XQaQREGQDYArfYUTT1n+WnEVRlkMK0YFEehewNFXB9Qf7NnPPRJozTB8ggFWhokACEeqsVTFD4NFOtfQSlGkYutE1BndA5zBjM1zCAsKWfDYBYCKsZanqqU8mgF3ANrEAI/HOsHDjgi8oycUYmlahbDEym+E2RZoJ7CuZQvFIZ+Jo+CNsk+dvgAXSsCovgCRS0tyH+aFYaA2V8ApQLIFAW2ZfgiAlIEuwIO4Ap2I1xnL9wAdig3UgIGf6YE6DbBBHsBdxUYPHjSAHNWkIRV4yToTJo9fHKeIa32X0luKS0KMxP3Ko1eRBJCWkIMxCT0QmGFVau4JCE8fyjMBrtGXRFQD0ey3ylvRggAFQMds0jrARM9SsnGPBPwES6Nxm00yQBywllTABaqCdwPMUoO5Qd85Skqddq+OgvwnB0cAXVO92EWHA4IdbRkNjHKtgz1P9igRVKWJTcjwZrR8wLfBG0HCOFOoHq8bxdTQkAxKg8nE1DGHtA3kQgro0sY9PUYwjnZqgN5FQeHiEMAFRkElNIELGVYpCzs7psuagceOx6VnFMNPy/MDQe9BwEqPVUNBAhc0tpXAFewAxZ+AKsGSriss+52JIsIOj6JVHuNtiQnblFpaV8ED8LHvw4EmBgHL1UP5gNrBQ0SQdz+AxUBqnMDNuBtmgbCMweoGxIq9AbOQIyvOd0DVEUOXzQAcJCuFF52j5Jz5aHRQ5YwMny8QQJcFYgAF1sGkRMQBTDDzDdfK4SKytaorCm44gSOswA1lc1IVWqFuh+6x3LnBSUAE2QIWigFHb3YC1BVDwWdb4eIFzrNRimjqSKpwzltIIWEdI49Mh06XQYKBw41oWjUAHwgEoKXEKItKQEDAAsANWhxAN8K2QR2g1UjAts3mDkh2jA/LHK7BM5OEQ6oBqLLHj0aA3U3MX2Kb1wEBNIHNul/ogAnOGEERQWVVxvZA01dshtiBA9sUJqjJEs0APzrxA5TLhld+ImbOIIBSAJ5CsWQ9nwDE4EAmwYAFsoF28p6D1uFMYMFfgYtE6qkNwAATiwqvE9QADoAAQBqF4wG3QAumBeeN0klpFMCJGmFA9QrBAiYUiAsAFvNnm/HCXOBHKIZXyFlQikDC34xeT4IqQES+kh8NAMYAUEAvgB0HiVoCiMIbI4DGSYNQndiOymW01MRHDwWzs/FkmNBosBbZlMJj0LSAQJUiguvPQAHSxcATgAEbkceKlAmA966PQGGvYaul2NcZG64cOS55stIjxIVAZyuYlwBAVoJLrV6cSQeOwLpDQQb3gMFBUOMOKCAHgTAJd/0fsZGRCZz9eoBhQZ9Lx+BmQgjUNWgNZEbkzIzJz7Kn22XMHV5p49UihqXk6EAeqS6kDqzQcAcjElhAwsAIw4bkjXuBXHmkwJFAT8NLgCQSA9fAmoWAII8yBinKIFM5qNFDVITCBY3q1P2BKNnIPIJoA1wSGtOVkMVL0wuW3qGmRItFEJdIwMNRwI4VlZyFA5ntqYu3bk8FuzvX73m+0e8MiSObrkfXIS3PqwgW30csgKb+sNWNAqkAUAHHBcAHisPF8KyNVwdjib4CQEEqB8BBk3RmxoOcAYqEdnBQnikHk+GCzazSTmuSQXIjV1IPVWWBJEz61wSEA0AQA89r+DVIWexHfEtWzwaxWhXkAxh4jFolqsEVsMROEk9ijfAAR5jTmj6exsBtYRyIiMoZ/4tVhPlPMTKWBfLMQIxUwEAmQxJGCMFSwPjJwj2GUxYFhcWg5u0ntEASB9dCwNnhlcp7wADVo2t9ZEqG8wJWw3bW4IBpoWxDiGWcPxTjgYaN78JGGW0oA4BFsFpqTAKAAQ80REueg8DlcPFnx1jXTAK5NnxwgEb60cNmUb1gDo4IDUGyQgCAW8uBE8AClg+kQEACiJyVT5uW8RBG87AFApFlOwHAicmhoIYJ5YKAQzVZCfCeuuSnEUSeZckEiordDgJUX3LlPazKnfNjiIeqMxVZAZZADTEEkZ8EXGL+gFGwrjaTHyCEb//H6AY7NQKJgsWLAEZPFuLZnZGRnQtp1EuJRVuJTGdca2pHwCthB51+ZgAuXp+lRMyJ2SAgrYB6m0Q+/4YDM6aKGi/fSuVCQVuWtMBKztbqWEoa85PVdo7zihmsFxiXjnaYQAUn5bbKOh6s08RBhjdaU82QD8htgUalV8OGmIHAFTgUJyiMgTgxg8fON4ZAaBIgnxJeaqd1gRvBBMITAdGJWRKWx0lAVHR0j4AdvYAdQNaQJUDRHlHml5cSLMjaYxAqHmbAaTZAZcZ5s6JLJGip7sCXaw2LCRnK1YMO4sFRAgVWgfXMfc+zt038JeI6lkCDQU5yCGeZRBOA9aMG3e0AZ7cmQmKjgeCWvmJnn7yAwY8uoEEL1wLBADizps1VFIzm5UYtBHFT5Qy46UAsQTBZCwPgljNPekNGEwdic0FR1JmP5AAhShTl4MCWwq2By1NKlUqzQQGAidkywDoSgYGtQ8JRdefJLqPjw5YsD85GiBWlRsDZ2GzVDkCvRSyUzIq16YUXEBLd2kGn+rLIwAAAK1JREFUf54DD3C0WwmGPi9OSjpCA0A7fFwUZTm0ktDZLl5VXmbFDDQACl7+QSry5QCM2bfNC+WAFj1LAzLsiwEBaQCW/1EGcMN/tG8OViQtylulBUxRADYm5SEBRAcAARkeMC5iRNgZhOoxnz4oHApa6gD3ASdbmF188wxpDZVKUL4RUhTSSRvrQAZLDcgauImabgJzkXIaALePAXot1j6Bdwe3AXoQAnXMFVuCApGWbjuRvTu7AAAAAElFTkSuQmCC";

  // js/hero-fx.js
  var PRESETS = {
    /* «abismo»: teal profundo, el color del sitio, sala a oscuras */
    abismo: {
      colorBack: "#020608",
      colorBloom: "#0d5b73",
      colors: ["#0a4a63f2", "#1b87a3e6", "#26b5ceff", "#8fe7f5"],
      density: 0.32,
      spotty: 0.28,
      midSize: 0.22,
      midIntensity: 0.55,
      intensity: 1,
      bloom: 0.6,
      speed: 0.45
    },
    /* «estreno»: cálido, luz de proyector encendido */
    estreno: {
      colorBack: "#07070a",
      colorBloom: "#ff7a2f",
      colors: ["#ffb35ccc", "#ff5e3ae6", "#fff1d6", "#ff9a3c88"],
      density: 0.32,
      spotty: 0.28,
      midSize: 0.22,
      midIntensity: 0.55,
      intensity: 0.9,
      bloom: 0.55,
      speed: 0.6
    }
  };
  function prefiereMenosMovimiento() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function montarShader(caja, preset) {
    return new Promise((resolve) => {
      if (!caja) {
        resolve(null);
        return;
      }
      const retoques = window.HERO_AJUSTES && window.HERO_AJUSTES.rayos || {};
      preset = Object.assign({}, preset, retoques);
      let ruido = null;
      try {
        ruido = getShaderNoiseTexture();
      } catch (error) {
        ruido = null;
      }
      const fallar3 = (error) => {
        const motivo = String(error && error.message || error || "error desconocido").slice(0, 160);
        caja.dataset.estado = /webgl/i.test(motivo) ? "sin-webgl" : "fallo";
        caja.dataset.motivo = motivo;
        caja.classList.add("sin-shader");
        console.warn("Hero: no se pudo crear el shader \xB7", motivo);
        resolve(null);
      };
      const montar = () => {
        try {
          const uniforms = {
            u_colorBack: getShaderColorFromString(preset.colorBack),
            u_colorBloom: getShaderColorFromString(preset.colorBloom),
            u_colors: preset.colors.map((color) => getShaderColorFromString(color)),
            u_colorsCount: preset.colors.length,
            u_density: preset.density,
            u_spotty: preset.spotty,
            u_midSize: preset.midSize,
            u_midIntensity: preset.midIntensity,
            u_intensity: preset.intensity,
            u_bloom: preset.bloom,
            u_noiseTexture: ruido
          };
          const velocidad = prefiereMenosMovimiento() ? 0 : preset.speed;
          const mount = new ShaderMount(caja, godRaysFragmentShader, uniforms, void 0, velocidad, 0, 2, 1920 * 1080 * 2);
          caja.dataset.estado = "ok";
          try {
            const dbg = mount.gl.getExtension("WEBGL_debug_renderer_info");
            caja.dataset.renderer = String(
              dbg && mount.gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || mount.gl.getParameter(mount.gl.RENDERER) || ""
            );
          } catch (error) {
            caja.dataset.renderer = "";
          }
          resolve(mount);
        } catch (error) {
          fallar3(error);
        }
      };
      if (ruido && !ruido.complete) {
        ruido.addEventListener("load", montar, { once: true });
        ruido.addEventListener("error", montar, { once: true });
      } else {
        montar();
      }
    });
  }
  function buscarGsap() {
    const gsap = window.gsap;
    if (!gsap) {
      return null;
    }
    return {
      gsap,
      SplitText: window.SplitText || gsap.SplitText,
      ScrambleTextPlugin: window.ScrambleTextPlugin || gsap.ScrambleTextPlugin
    };
  }
  function animarTitulo(elemento) {
    const lib = buscarGsap();
    if (!elemento || !lib || !lib.SplitText) {
      return null;
    }
    const gsap = lib.gsap;
    const SplitText = lib.SplitText;
    gsap.registerPlugin(SplitText);
    let reproducir = null;
    let primeraVez = true;
    try {
      SplitText.create(elemento, {
        type: "lines,words,chars",
        mask: "lines",
        autoSplit: true,
        onSplit: (instancia) => {
          reproducir = () => gsap.fromTo(
            instancia.chars,
            { yPercent: 115, rotate: 8 },
            { yPercent: 0, rotate: 0, duration: 0.9, ease: "expo.out", stagger: 0.022 }
          );
          if (!primeraVez) {
            return null;
          }
          primeraVez = false;
          return reproducir();
        }
      });
    } catch (error) {
      console.warn("Hero: SplitText no disponible.", error);
      return null;
    }
    return {
      reproducir: () => {
        if (reproducir) {
          reproducir();
        }
      }
    };
  }
  function animarSubtitulo(elemento, retardo) {
    const lib = buscarGsap();
    if (!elemento || !lib || !lib.ScrambleTextPlugin) {
      return;
    }
    const gsap = lib.gsap;
    gsap.registerPlugin(lib.ScrambleTextPlugin);
    const textoFinal = elemento.textContent;
    gsap.set(elemento, { autoAlpha: 0 });
    gsap.to(elemento, {
      autoAlpha: 1,
      duration: 1.1,
      delay: retardo,
      scrambleText: {
        text: textoFinal,
        chars: "A\xC1BCDE\xC9FGHI\xCDJKLMNOPQRSTU\xDAVWXYZ\xB7\u2014/",
        revealDelay: 0.4,
        speed: 0.45
      }
    });
  }

  // lib/webgl-fluid/webgl-fluid.mjs
  function e(e2, t2) {
    let n = e2;
    ke(), t2 = {
      IMMEDIATE: true,
      TRIGGER: "hover",
      AUTO: false,
      INTERVAL: 3e3,
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      CAPTURE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 1,
      VELOCITY_DISSIPATION: 0.2,
      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 30,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6e3,
      SPLAT_COUNT: Number.parseInt(Math.random() * 20) + 5,
      SPLAT_COLOR: void 0,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 10,
      PAUSED: false,
      BACK_COLOR: {
        r: 0,
        g: 0,
        b: 0
      },
      TRANSPARENT: false,
      BLOOM: true,
      BLOOM_ITERATIONS: 8,
      BLOOM_RESOLUTION: 256,
      BLOOM_INTENSITY: 0.8,
      BLOOM_THRESHOLD: 0.6,
      BLOOM_SOFT_KNEE: 0.7,
      SUNRAYS: true,
      SUNRAYS_RESOLUTION: 196,
      SUNRAYS_WEIGHT: 1,
      ...t2
    };
    function r() {
      this.id = -1, this.texcoordX = 0, this.texcoordY = 0, this.prevTexcoordX = 0, this.prevTexcoordY = 0, this.deltaX = 0, this.deltaY = 0, this.down = false, this.moved = false, this.color = Z();
    }
    let i = [], a = [], o = [];
    i.push(new r());
    let { gl: s, ext: c } = l(n);
    te2() && (t2.DYE_RESOLUTION = 512), c.supportLinearFiltering || (t2.DYE_RESOLUTION = 512, t2.SHADING = false, t2.BLOOM = false, t2.SUNRAYS = false);
    function l(e3) {
      let t3 = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false
      }, n2 = e3.getContext("webgl2", t3), r2 = !!n2;
      r2 || (n2 = e3.getContext("webgl", t3) || e3.getContext("experimental-webgl", t3));
      let i2, a2;
      r2 ? (n2.getExtension("EXT_color_buffer_float"), a2 = n2.getExtension("OES_texture_float_linear")) : (i2 = n2.getExtension("OES_texture_half_float"), a2 = n2.getExtension("OES_texture_half_float_linear")), n2.clearColor(0, 0, 0, 1);
      let o2 = r2 ? n2.HALF_FLOAT : i2.HALF_FLOAT_OES, s2, c2, l2;
      return r2 ? (s2 = u2(n2, n2.RGBA16F, n2.RGBA, o2), c2 = u2(n2, n2.RG16F, n2.RG, o2), l2 = u2(n2, n2.R16F, n2.RED, o2)) : (s2 = u2(n2, n2.RGBA, n2.RGBA, o2), c2 = u2(n2, n2.RGBA, n2.RGBA, o2), l2 = u2(n2, n2.RGBA, n2.RGBA, o2)), {
        gl: n2,
        ext: {
          formatRGBA: s2,
          formatRG: c2,
          formatR: l2,
          halfFloatTexType: o2,
          supportLinearFiltering: a2
        }
      };
    }
    function u2(e3, t3, n2, r2) {
      if (!ee2(e3, t3, n2, r2)) switch (t3) {
        case e3.R16F:
          return u2(e3, e3.RG16F, e3.RG, r2);
        case e3.RG16F:
          return u2(e3, e3.RGBA16F, e3.RGBA, r2);
        default:
          return null;
      }
      return {
        internalFormat: t3,
        format: n2
      };
    }
    function ee2(e3, t3, n2, r2) {
      let i2 = e3.createTexture();
      e3.bindTexture(e3.TEXTURE_2D, i2), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_MIN_FILTER, e3.NEAREST), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_MAG_FILTER, e3.NEAREST), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_WRAP_S, e3.CLAMP_TO_EDGE), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_WRAP_T, e3.CLAMP_TO_EDGE), e3.texImage2D(e3.TEXTURE_2D, 0, t3, 4, 4, 0, n2, r2, null);
      let a2 = e3.createFramebuffer();
      return e3.bindFramebuffer(e3.FRAMEBUFFER, a2), e3.framebufferTexture2D(e3.FRAMEBUFFER, e3.COLOR_ATTACHMENT0, e3.TEXTURE_2D, i2, 0), e3.checkFramebufferStatus(e3.FRAMEBUFFER) === e3.FRAMEBUFFER_COMPLETE;
    }
    function te2() {
      return /Mobi|Android/i.test(navigator.userAgent);
    }
    class ne2 {
      constructor(e3, t3) {
        this.vertexShader = e3, this.fragmentShaderSource = t3, this.programs = [], this.activeProgram = null, this.uniforms = [];
      }
      setKeywords(e3) {
        let t3 = 0;
        for (let n3 = 0; n3 < e3.length; n3++) t3 += et(e3[n3]);
        let n2 = this.programs[t3];
        if (!n2) {
          let r2 = m(s.FRAGMENT_SHADER, this.fragmentShaderSource, e3);
          n2 = f(this.vertexShader, r2), this.programs[t3] = n2;
        }
        n2 !== this.activeProgram && (this.uniforms = p2(n2), this.activeProgram = n2);
      }
      bind() {
        s.useProgram(this.activeProgram);
      }
    }
    class d2 {
      constructor(e3, t3) {
        this.uniforms = {}, this.program = f(e3, t3), this.uniforms = p2(this.program);
      }
      bind() {
        s.useProgram(this.program);
      }
    }
    function f(e3, t3) {
      let n2 = s.createProgram();
      if (s.attachShader(n2, e3), s.attachShader(n2, t3), s.linkProgram(n2), !s.getProgramParameter(n2, s.LINK_STATUS)) throw s.getProgramInfoLog(n2);
      return n2;
    }
    function p2(e3) {
      let t3 = [], n2 = s.getProgramParameter(e3, s.ACTIVE_UNIFORMS);
      for (let r2 = 0; r2 < n2; r2++) {
        let n3 = s.getActiveUniform(e3, r2).name;
        t3[n3] = s.getUniformLocation(e3, n3);
      }
      return t3;
    }
    function m(e3, t3, n2) {
      t3 = re2(t3, n2);
      let r2 = s.createShader(e3);
      if (s.shaderSource(r2, t3), s.compileShader(r2), !s.getShaderParameter(r2, s.COMPILE_STATUS)) throw s.getShaderInfoLog(r2);
      return r2;
    }
    function re2(e3, t3) {
      if (!t3) return e3;
      let n2 = "";
      return t3.forEach((e4) => {
        n2 += `#define ${e4}
`;
      }), n2 + e3;
    }
    let h = m(s.VERTEX_SHADER, "\n    precision highp float;\n    attribute vec2 aPosition;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform vec2 texelSize;\n    void main () {\n        vUv = aPosition * 0.5 + 0.5;\n        vL = vUv - vec2(texelSize.x, 0.0);\n        vR = vUv + vec2(texelSize.x, 0.0);\n        vT = vUv + vec2(0.0, texelSize.y);\n        vB = vUv - vec2(0.0, texelSize.y);\n        gl_Position = vec4(aPosition, 0.0, 1.0);\n    }\n"), ie2 = m(s.VERTEX_SHADER, "\n    precision highp float;\n    attribute vec2 aPosition;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    uniform vec2 texelSize;\n    void main () {\n        vUv = aPosition * 0.5 + 0.5;\n        float offset = 1.33333333;\n        vL = vUv - texelSize * offset;\n        vR = vUv + texelSize * offset;\n        gl_Position = vec4(aPosition, 0.0, 1.0);\n    }\n"), ae2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    uniform sampler2D uTexture;\n    void main () {\n        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;\n        sum += texture2D(uTexture, vL) * 0.35294117;\n        sum += texture2D(uTexture, vR) * 0.35294117;\n        gl_FragColor = sum;\n    }\n"), oe2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying highp vec2 vUv;\n    uniform sampler2D uTexture;\n    void main () {\n        gl_FragColor = texture2D(uTexture, vUv);\n    }\n"), se2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying highp vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float value;\n    void main () {\n        gl_FragColor = value * texture2D(uTexture, vUv);\n    }\n"), ce2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    uniform vec4 color;\n    void main () {\n        gl_FragColor = color;\n    }\n"), le2 = m(s.FRAGMENT_SHADER, t2.TRANSPARENT ? "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float aspectRatio;\n    #define SCALE 25.0\n    void main () {\n        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));\n        float v = mod(uv.x + uv.y, 2.0);\n        v = v * 0.1 + 0.8;\n        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n    }\n" : "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float aspectRatio;\n    #define SCALE 25.0\n    void main () {\n        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));\n        float v = mod(uv.x + uv.y, 2.0);\n        v = v * 0.1 + 0.8;\n        gl_FragColor = vec4(vec3(v), 1.0);\n    }\n"), ue2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform vec3 curve;\n    uniform float threshold;\n    void main () {\n        vec3 c = texture2D(uTexture, vUv).rgb;\n        float br = max(c.r, max(c.g, c.b));\n        float rq = clamp(br - curve.x, 0.0, curve.y);\n        rq = curve.z * rq * rq;\n        c *= max(rq, br - threshold) / max(br, 0.0001);\n        gl_FragColor = vec4(c, 0.0);\n    }\n"), de2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uTexture;\n    void main () {\n        vec4 sum = vec4(0.0);\n        sum += texture2D(uTexture, vL);\n        sum += texture2D(uTexture, vR);\n        sum += texture2D(uTexture, vT);\n        sum += texture2D(uTexture, vB);\n        sum *= 0.25;\n        gl_FragColor = sum;\n    }\n"), fe2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uTexture;\n    uniform float intensity;\n    void main () {\n        vec4 sum = vec4(0.0);\n        sum += texture2D(uTexture, vL);\n        sum += texture2D(uTexture, vR);\n        sum += texture2D(uTexture, vT);\n        sum += texture2D(uTexture, vB);\n        sum *= 0.25;\n        gl_FragColor = sum * intensity;\n    }\n"), pe2 = m(s.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    void main () {\n        vec4 c = texture2D(uTexture, vUv);\n        float br = max(c.r, max(c.g, c.b));\n        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);\n        gl_FragColor = c;\n    }\n"), me2 = m(s.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float weight;\n    #define ITERATIONS 16\n    void main () {\n        float Density = 0.3;\n        float Decay = 0.95;\n        float Exposure = 0.7;\n        vec2 coord = vUv;\n        vec2 dir = vUv - 0.5;\n        dir *= 1.0 / float(ITERATIONS) * Density;\n        float illuminationDecay = 1.0;\n        float color = texture2D(uTexture, vUv).a;\n        for (int i = 0; i < ITERATIONS; i++)\n        {\n            coord -= dir;\n            float col = texture2D(uTexture, coord).a;\n            color += col * illuminationDecay * weight;\n            illuminationDecay *= Decay;\n        }\n        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);\n    }\n"), he2 = m(s.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uTarget;\n    uniform float aspectRatio;\n    uniform vec3 color;\n    uniform vec2 point;\n    uniform float radius;\n    void main () {\n        vec2 p = vUv - point.xy;\n        p.x *= aspectRatio;\n        vec3 splat = exp(-dot(p, p) / radius) * color;\n        vec3 base = texture2D(uTarget, vUv).xyz;\n        gl_FragColor = vec4(base + splat, 1.0);\n    }\n"), ge2 = m(s.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    uniform sampler2D uVelocity;\n    uniform sampler2D uSource;\n    uniform vec2 texelSize;\n    uniform vec2 dyeTexelSize;\n    uniform float dt;\n    uniform float dissipation;\n    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {\n        vec2 st = uv / tsize - 0.5;\n        vec2 iuv = floor(st);\n        vec2 fuv = fract(st);\n        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);\n        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);\n        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);\n        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);\n        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);\n    }\n    void main () {\n    #ifdef MANUAL_FILTERING\n        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;\n        vec4 result = bilerp(uSource, coord, dyeTexelSize);\n    #else\n        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\n        vec4 result = texture2D(uSource, coord);\n    #endif\n        float decay = 1.0 + dissipation * dt;\n        gl_FragColor = result / decay;\n    }", c.supportLinearFiltering ? null : ["MANUAL_FILTERING"]), _e2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uVelocity;\n    void main () {\n        float L = texture2D(uVelocity, vL).x;\n        float R = texture2D(uVelocity, vR).x;\n        float T = texture2D(uVelocity, vT).y;\n        float B = texture2D(uVelocity, vB).y;\n        vec2 C = texture2D(uVelocity, vUv).xy;\n        if (vL.x < 0.0) { L = -C.x; }\n        if (vR.x > 1.0) { R = -C.x; }\n        if (vT.y > 1.0) { T = -C.y; }\n        if (vB.y < 0.0) { B = -C.y; }\n        float div = 0.5 * (R - L + T - B);\n        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);\n    }\n"), ve2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uVelocity;\n    void main () {\n        float L = texture2D(uVelocity, vL).y;\n        float R = texture2D(uVelocity, vR).y;\n        float T = texture2D(uVelocity, vT).x;\n        float B = texture2D(uVelocity, vB).x;\n        float vorticity = R - L - T + B;\n        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);\n    }\n"), ye2 = m(s.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uVelocity;\n    uniform sampler2D uCurl;\n    uniform float curl;\n    uniform float dt;\n    void main () {\n        float L = texture2D(uCurl, vL).x;\n        float R = texture2D(uCurl, vR).x;\n        float T = texture2D(uCurl, vT).x;\n        float B = texture2D(uCurl, vB).x;\n        float C = texture2D(uCurl, vUv).x;\n        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));\n        force /= length(force) + 0.0001;\n        force *= curl * C;\n        force.y *= -1.0;\n        vec2 vel = texture2D(uVelocity, vUv).xy;\n        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);\n    }\n"), be2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uPressure;\n    uniform sampler2D uDivergence;\n    void main () {\n        float L = texture2D(uPressure, vL).x;\n        float R = texture2D(uPressure, vR).x;\n        float T = texture2D(uPressure, vT).x;\n        float B = texture2D(uPressure, vB).x;\n        float C = texture2D(uPressure, vUv).x;\n        float divergence = texture2D(uDivergence, vUv).x;\n        float pressure = (L + R + B + T - divergence) * 0.25;\n        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);\n    }\n"), xe2 = m(s.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uPressure;\n    uniform sampler2D uVelocity;\n    void main () {\n        float L = texture2D(uPressure, vL).x;\n        float R = texture2D(uPressure, vR).x;\n        float T = texture2D(uPressure, vT).x;\n        float B = texture2D(uPressure, vB).x;\n        vec2 velocity = texture2D(uVelocity, vUv).xy;\n        velocity.xy -= vec2(R - L, T - B);\n        gl_FragColor = vec4(velocity, 0.0, 1.0);\n    }\n"), g = (s.bindBuffer(s.ARRAY_BUFFER, s.createBuffer()), s.bufferData(s.ARRAY_BUFFER, new Float32Array([
      -1,
      -1,
      -1,
      1,
      1,
      1,
      1,
      -1
    ]), s.STATIC_DRAW), s.bindBuffer(s.ELEMENT_ARRAY_BUFFER, s.createBuffer()), s.bufferData(s.ELEMENT_ARRAY_BUFFER, new Uint16Array([
      0,
      1,
      2,
      0,
      2,
      3
    ]), s.STATIC_DRAW), s.vertexAttribPointer(0, 2, s.FLOAT, false, 0, 0), s.enableVertexAttribArray(0), (e3) => {
      s.bindFramebuffer(s.FRAMEBUFFER, e3), s.drawElements(s.TRIANGLES, 6, s.UNSIGNED_SHORT, 0);
    }), _, v, y2, b, x, S2, C2, w2, T = Te2(), E2 = new d2(ie2, ae2), D2 = new d2(h, oe2), O2 = new d2(h, se2), k2 = new d2(h, ce2), A2 = new d2(h, le2), j2 = new d2(h, ue2), M2 = new d2(h, de2), N2 = new d2(h, fe2), P2 = new d2(h, pe2), F2 = new d2(h, me2), I2 = new d2(h, he2), L2 = new d2(h, ge2), R2 = new d2(h, _e2), z2 = new d2(h, ve2), B2 = new d2(h, ye2), V2 = new d2(h, be2), H2 = new d2(h, xe2), U2 = new ne2(h, "\n    precision highp float;\n    precision highp sampler2D;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uTexture;\n    uniform sampler2D uBloom;\n    uniform sampler2D uSunrays;\n    uniform sampler2D uDithering;\n    uniform vec2 ditherScale;\n    uniform vec2 texelSize;\n    vec3 linearToGamma (vec3 color) {\n        color = max(color, vec3(0));\n        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));\n    }\n    void main () {\n        vec3 c = texture2D(uTexture, vUv).rgb;\n    #ifdef SHADING\n        vec3 lc = texture2D(uTexture, vL).rgb;\n        vec3 rc = texture2D(uTexture, vR).rgb;\n        vec3 tc = texture2D(uTexture, vT).rgb;\n        vec3 bc = texture2D(uTexture, vB).rgb;\n        float dx = length(rc) - length(lc);\n        float dy = length(tc) - length(bc);\n        vec3 n = normalize(vec3(dx, dy, length(texelSize)));\n        vec3 l = vec3(0.0, 0.0, 1.0);\n        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);\n        c *= diffuse;\n    #endif\n    #ifdef BLOOM\n        vec3 bloom = texture2D(uBloom, vUv).rgb;\n    #endif\n    #ifdef SUNRAYS\n        float sunrays = texture2D(uSunrays, vUv).r;\n        c *= sunrays;\n    #ifdef BLOOM\n        bloom *= sunrays;\n    #endif\n    #endif\n    #ifdef BLOOM\n        float noise = texture2D(uDithering, vUv * ditherScale).r;\n        noise = noise * 2.0 - 1.0;\n        bloom += noise / 255.0;\n        bloom = linearToGamma(bloom);\n        c += bloom;\n    #endif\n        float a = max(c.r, max(c.g, c.b));\n        gl_FragColor = vec4(c, a);\n    }\n");
    function W2() {
      let e3 = Q(t2.SIM_RESOLUTION), n2 = Q(t2.DYE_RESOLUTION), r2 = c.halfFloatTexType, i2 = c.formatRGBA, a2 = c.formatRG, o2 = c.formatR, l2 = c.supportLinearFiltering ? s.LINEAR : s.NEAREST;
      _ = _ ? q2(_, n2.width, n2.height, i2.internalFormat, i2.format, r2, l2) : K(n2.width, n2.height, i2.internalFormat, i2.format, r2, l2), v = v ? q2(v, e3.width, e3.height, a2.internalFormat, a2.format, r2, l2) : K(e3.width, e3.height, a2.internalFormat, a2.format, r2, l2), y2 = G2(e3.width, e3.height, o2.internalFormat, o2.format, r2, s.NEAREST), b = G2(e3.width, e3.height, o2.internalFormat, o2.format, r2, s.NEAREST), x = K(e3.width, e3.height, o2.internalFormat, o2.format, r2, s.NEAREST), Se2(), Ce();
    }
    function Se2() {
      let e3 = Q(t2.BLOOM_RESOLUTION), n2 = c.halfFloatTexType, r2 = c.formatRGBA, i2 = c.supportLinearFiltering ? s.LINEAR : s.NEAREST;
      S2 = G2(e3.width, e3.height, r2.internalFormat, r2.format, n2, i2), o.length = 0;
      for (let a2 = 0; a2 < t2.BLOOM_ITERATIONS; a2++) {
        let t3 = e3.width >> a2 + 1, s2 = e3.height >> a2 + 1;
        if (t3 < 2 || s2 < 2) break;
        let c2 = G2(t3, s2, r2.internalFormat, r2.format, n2, i2);
        o.push(c2);
      }
    }
    function Ce() {
      let e3 = Q(t2.SUNRAYS_RESOLUTION), n2 = c.halfFloatTexType, r2 = c.formatR, i2 = c.supportLinearFiltering ? s.LINEAR : s.NEAREST;
      C2 = G2(e3.width, e3.height, r2.internalFormat, r2.format, n2, i2), w2 = G2(e3.width, e3.height, r2.internalFormat, r2.format, n2, i2);
    }
    function G2(e3, t3, n2, r2, i2, a2) {
      s.activeTexture(s.TEXTURE0);
      let o2 = s.createTexture();
      s.bindTexture(s.TEXTURE_2D, o2), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MIN_FILTER, a2), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MAG_FILTER, a2), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_S, s.CLAMP_TO_EDGE), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_T, s.CLAMP_TO_EDGE), s.texImage2D(s.TEXTURE_2D, 0, n2, e3, t3, 0, r2, i2, null);
      let c2 = s.createFramebuffer();
      return s.bindFramebuffer(s.FRAMEBUFFER, c2), s.framebufferTexture2D(s.FRAMEBUFFER, s.COLOR_ATTACHMENT0, s.TEXTURE_2D, o2, 0), s.viewport(0, 0, e3, t3), s.clear(s.COLOR_BUFFER_BIT), {
        texture: o2,
        fbo: c2,
        width: e3,
        height: t3,
        texelSizeX: 1 / e3,
        texelSizeY: 1 / t3,
        attach(e4) {
          return s.activeTexture(s.TEXTURE0 + e4), s.bindTexture(s.TEXTURE_2D, o2), e4;
        }
      };
    }
    function K(e3, t3, n2, r2, i2, a2) {
      let o2 = G2(e3, t3, n2, r2, i2, a2), s2 = G2(e3, t3, n2, r2, i2, a2);
      return {
        width: e3,
        height: t3,
        texelSizeX: o2.texelSizeX,
        texelSizeY: o2.texelSizeY,
        get read() {
          return o2;
        },
        set read(e4) {
          o2 = e4;
        },
        get write() {
          return s2;
        },
        set write(e4) {
          s2 = e4;
        },
        swap() {
          let e4 = o2;
          o2 = s2, s2 = e4;
        }
      };
    }
    function we2(e3, t3, n2, r2, i2, a2, o2) {
      let c2 = G2(t3, n2, r2, i2, a2, o2);
      return D2.bind(), s.uniform1i(D2.uniforms.uTexture, e3.attach(0)), g(c2.fbo), c2;
    }
    function q2(e3, t3, n2, r2, i2, a2, o2) {
      return e3.width === t3 && e3.height === n2 ? e3 : (e3.read = we2(e3.read, t3, n2, r2, i2, a2, o2), e3.write = G2(t3, n2, r2, i2, a2, o2), e3.width = t3, e3.height = n2, e3.texelSizeX = 1 / t3, e3.texelSizeY = 1 / n2, e3);
    }
    function Te2(e3) {
      let t3 = s.createTexture();
      s.bindTexture(s.TEXTURE_2D, t3), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MIN_FILTER, s.LINEAR), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MAG_FILTER, s.LINEAR), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_S, s.REPEAT), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_T, s.REPEAT), s.texImage2D(s.TEXTURE_2D, 0, s.RGB, 1, 1, 0, s.RGB, s.UNSIGNED_BYTE, new Uint8Array([
        255,
        255,
        255
      ]));
      let n2 = {
        texture: t3,
        width: 1,
        height: 1,
        attach(e4) {
          return s.activeTexture(s.TEXTURE0 + e4), s.bindTexture(s.TEXTURE_2D, t3), e4;
        }
      }, r2 = new Image();
      return r2.onload = () => {
        n2.width = r2.width, n2.height = r2.height, s.bindTexture(s.TEXTURE_2D, t3), s.texImage2D(s.TEXTURE_2D, 0, s.RGB, s.RGB, s.UNSIGNED_BYTE, r2);
      }, e3 && (r2.src = e3), n2;
    }
    function Ee2() {
      let e3 = [];
      t2.SHADING && e3.push("SHADING"), t2.BLOOM && e3.push("BLOOM"), t2.SUNRAYS && e3.push("SUNRAYS"), U2.setKeywords(e3);
    }
    Ee2(), W2(), t2.IMMEDIATE && Ve(t2.SPLAT_COUNT);
    function J() {
      t2.AUTO && t2.INTERVAL && !t2.PAUSED && a.push(t2.SPLAT_COUNT), setTimeout(J, t2.INTERVAL);
    }
    setTimeout(J, t2.INTERVAL);
    let Y = Date.now(), X2 = 0;
    De2();
    function De2() {
      let e3 = Oe2();
      ke() && W2(), Ae2(e3), je(), t2.PAUSED || Me2(e3), Ne2(null), requestAnimationFrame(De2);
    }
    function Oe2() {
      let e3 = Date.now(), t3 = (e3 - Y) / 1e3;
      return t3 = Math.min(t3, 0.016666), Y = e3, t3;
    }
    function ke() {
      let e3 = $(n.clientWidth), t3 = $(n.clientHeight);
      return n.width !== e3 || n.height !== t3 ? (n.width = e3, n.height = t3, true) : false;
    }
    function Ae2(e3) {
      t2.COLORFUL && (X2 += e3 * t2.COLOR_UPDATE_SPEED, X2 >= 1 && (X2 = Qe2(X2, 0, 1), i.forEach((e4) => {
        e4.color = Z();
      })));
    }
    function je() {
      a.length > 0 && Ve(a.pop()), i.forEach((e3) => {
        e3.moved && (e3.moved = false, Be(e3));
      });
    }
    function Me2(e3) {
      s.disable(s.BLEND), s.viewport(0, 0, v.width, v.height), z2.bind(), s.uniform2f(z2.uniforms.texelSize, v.texelSizeX, v.texelSizeY), s.uniform1i(z2.uniforms.uVelocity, v.read.attach(0)), g(b.fbo), B2.bind(), s.uniform2f(B2.uniforms.texelSize, v.texelSizeX, v.texelSizeY), s.uniform1i(B2.uniforms.uVelocity, v.read.attach(0)), s.uniform1i(B2.uniforms.uCurl, b.attach(1)), s.uniform1f(B2.uniforms.curl, t2.CURL), s.uniform1f(B2.uniforms.dt, e3), g(v.write.fbo), v.swap(), R2.bind(), s.uniform2f(R2.uniforms.texelSize, v.texelSizeX, v.texelSizeY), s.uniform1i(R2.uniforms.uVelocity, v.read.attach(0)), g(y2.fbo), O2.bind(), s.uniform1i(O2.uniforms.uTexture, x.read.attach(0)), s.uniform1f(O2.uniforms.value, t2.PRESSURE), g(x.write.fbo), x.swap(), V2.bind(), s.uniform2f(V2.uniforms.texelSize, v.texelSizeX, v.texelSizeY), s.uniform1i(V2.uniforms.uDivergence, y2.attach(0));
      for (let e4 = 0; e4 < t2.PRESSURE_ITERATIONS; e4++) s.uniform1i(V2.uniforms.uPressure, x.read.attach(1)), g(x.write.fbo), x.swap();
      H2.bind(), s.uniform2f(H2.uniforms.texelSize, v.texelSizeX, v.texelSizeY), s.uniform1i(H2.uniforms.uPressure, x.read.attach(0)), s.uniform1i(H2.uniforms.uVelocity, v.read.attach(1)), g(v.write.fbo), v.swap(), L2.bind(), s.uniform2f(L2.uniforms.texelSize, v.texelSizeX, v.texelSizeY), c.supportLinearFiltering || s.uniform2f(L2.uniforms.dyeTexelSize, v.texelSizeX, v.texelSizeY);
      let n2 = v.read.attach(0);
      s.uniform1i(L2.uniforms.uVelocity, n2), s.uniform1i(L2.uniforms.uSource, n2), s.uniform1f(L2.uniforms.dt, e3), s.uniform1f(L2.uniforms.dissipation, t2.VELOCITY_DISSIPATION), g(v.write.fbo), v.swap(), s.viewport(0, 0, _.width, _.height), c.supportLinearFiltering || s.uniform2f(L2.uniforms.dyeTexelSize, _.texelSizeX, _.texelSizeY), s.uniform1i(L2.uniforms.uVelocity, v.read.attach(0)), s.uniform1i(L2.uniforms.uSource, _.read.attach(1)), s.uniform1f(L2.uniforms.dissipation, t2.DENSITY_DISSIPATION), g(_.write.fbo), _.swap();
    }
    function Ne2(e3) {
      t2.BLOOM && Le2(_.read, S2), t2.SUNRAYS && (Re2(_.read, _.write, C2), ze(C2, w2, 1)), !e3 || !t2.TRANSPARENT ? (s.blendFunc(s.ONE, s.ONE_MINUS_SRC_ALPHA), s.enable(s.BLEND)) : s.disable(s.BLEND);
      let n2 = e3 ? e3.width : s.drawingBufferWidth, r2 = e3 ? e3.height : s.drawingBufferHeight;
      s.viewport(0, 0, n2, r2);
      let i2 = e3 ? e3.fbo : null;
      t2.TRANSPARENT || Pe(i2, Ze2(t2.BACK_COLOR)), !e3 && t2.TRANSPARENT && Fe2(i2), Ie(i2, n2, r2);
    }
    function Pe(e3, t3) {
      k2.bind(), s.uniform4f(k2.uniforms.color, t3.r, t3.g, t3.b, 1), g(e3);
    }
    function Fe2(e3) {
      A2.bind(), s.uniform1f(A2.uniforms.aspectRatio, n.width / n.height), g(e3);
    }
    function Ie(e3, n2, r2) {
      if (U2.bind(), t2.SHADING && s.uniform2f(U2.uniforms.texelSize, 1 / n2, 1 / r2), s.uniform1i(U2.uniforms.uTexture, _.read.attach(0)), t2.BLOOM) {
        s.uniform1i(U2.uniforms.uBloom, S2.attach(1)), s.uniform1i(U2.uniforms.uDithering, T.attach(2));
        let e4 = $e2(T, n2, r2);
        s.uniform2f(U2.uniforms.ditherScale, e4.x, e4.y);
      }
      t2.SUNRAYS && s.uniform1i(U2.uniforms.uSunrays, C2.attach(3)), g(e3);
    }
    function Le2(e3, n2) {
      if (o.length < 2) return;
      let r2 = n2;
      s.disable(s.BLEND), j2.bind();
      let i2 = t2.BLOOM_THRESHOLD * t2.BLOOM_SOFT_KNEE + 1e-4, a2 = t2.BLOOM_THRESHOLD - i2, c2 = i2 * 2, l2 = 0.25 / i2;
      s.uniform3f(j2.uniforms.curve, a2, c2, l2), s.uniform1f(j2.uniforms.threshold, t2.BLOOM_THRESHOLD), s.uniform1i(j2.uniforms.uTexture, e3.attach(0)), s.viewport(0, 0, r2.width, r2.height), g(r2.fbo), M2.bind();
      for (let e4 = 0; e4 < o.length; e4++) {
        let t3 = o[e4];
        s.uniform2f(M2.uniforms.texelSize, r2.texelSizeX, r2.texelSizeY), s.uniform1i(M2.uniforms.uTexture, r2.attach(0)), s.viewport(0, 0, t3.width, t3.height), g(t3.fbo), r2 = t3;
      }
      s.blendFunc(s.ONE, s.ONE), s.enable(s.BLEND);
      for (let e4 = o.length - 2; e4 >= 0; e4--) {
        let t3 = o[e4];
        s.uniform2f(M2.uniforms.texelSize, r2.texelSizeX, r2.texelSizeY), s.uniform1i(M2.uniforms.uTexture, r2.attach(0)), s.viewport(0, 0, t3.width, t3.height), g(t3.fbo), r2 = t3;
      }
      s.disable(s.BLEND), N2.bind(), s.uniform2f(N2.uniforms.texelSize, r2.texelSizeX, r2.texelSizeY), s.uniform1i(N2.uniforms.uTexture, r2.attach(0)), s.uniform1f(N2.uniforms.intensity, t2.BLOOM_INTENSITY), s.viewport(0, 0, n2.width, n2.height), g(n2.fbo);
    }
    function Re2(e3, n2, r2) {
      s.disable(s.BLEND), P2.bind(), s.uniform1i(P2.uniforms.uTexture, e3.attach(0)), s.viewport(0, 0, n2.width, n2.height), g(n2.fbo), F2.bind(), s.uniform1f(F2.uniforms.weight, t2.SUNRAYS_WEIGHT), s.uniform1i(F2.uniforms.uTexture, n2.attach(0)), s.viewport(0, 0, r2.width, r2.height), g(r2.fbo);
    }
    function ze(e3, t3, n2) {
      E2.bind();
      for (let r2 = 0; r2 < n2; r2++) s.uniform2f(E2.uniforms.texelSize, e3.texelSizeX, 0), s.uniform1i(E2.uniforms.uTexture, e3.attach(0)), g(t3.fbo), s.uniform2f(E2.uniforms.texelSize, 0, e3.texelSizeY), s.uniform1i(E2.uniforms.uTexture, t3.attach(0)), g(e3.fbo);
    }
    function Be(e3) {
      let n2 = e3.deltaX * t2.SPLAT_FORCE, r2 = e3.deltaY * t2.SPLAT_FORCE;
      He(e3.texcoordX, e3.texcoordY, n2, r2, e3.color);
    }
    function Ve(e3) {
      for (let n2 = 0; n2 < e3; n2++) {
        let e4 = Z();
        t2.SPLAT_COLOR || (e4.r *= 10, e4.g *= 10, e4.b *= 10), He(Math.random(), Math.random(), 1e3 * (Math.random() - 0.5), 1e3 * (Math.random() - 0.5), e4);
      }
    }
    function He(e3, r2, i2, a2, o2) {
      s.viewport(0, 0, v.width, v.height), I2.bind(), s.uniform1i(I2.uniforms.uTarget, v.read.attach(0)), s.uniform1f(I2.uniforms.aspectRatio, n.width / n.height), s.uniform2f(I2.uniforms.point, e3, r2), s.uniform3f(I2.uniforms.color, i2, a2, 0), s.uniform1f(I2.uniforms.radius, Ue2(t2.SPLAT_RADIUS / 100)), g(v.write.fbo), v.swap(), s.viewport(0, 0, _.width, _.height), s.uniform1i(I2.uniforms.uTarget, _.read.attach(0)), s.uniform3f(I2.uniforms.color, o2.r, o2.g, o2.b), g(_.write.fbo), _.swap();
    }
    function Ue2(e3) {
      let t3 = n.width / n.height;
      return t3 > 1 && (e3 *= t3), e3;
    }
    n.addEventListener("mousedown", (e3) => {
      let t3 = $(e3.offsetX), n2 = $(e3.offsetY), a2 = i.find((e4) => e4.id === -1);
      a2 || (a2 = new r()), We(a2, -1, t3, n2);
    }), setTimeout(() => {
      n.addEventListener("mousemove", (e3) => {
        let t3 = $(e3.offsetX), n2 = $(e3.offsetY);
        Ge(i[0], t3, n2);
      });
    }, 500), window.addEventListener("mouseup", () => {
      Ke2(i[0]);
    }), n.addEventListener("touchstart", (e3) => {
      e3.preventDefault();
      let t3 = e3.targetTouches;
      for (; t3.length >= i.length; ) i.push(new r());
      for (let e4 = 0; e4 < t3.length; e4++) {
        let n2 = $(t3[e4].pageX), r2 = $(t3[e4].pageY);
        We(i[e4 + 1], t3[e4].identifier, n2, r2);
      }
    }), n.addEventListener("touchmove", (e3) => {
      e3.preventDefault();
      let t3 = e3.targetTouches;
      for (let e4 = 0; e4 < t3.length; e4++) {
        let n2 = $(t3[e4].pageX), r2 = $(t3[e4].pageY);
        Ge(i[e4 + 1], n2, r2);
      }
    }, false), window.addEventListener("touchend", (e3) => {
      let t3 = e3.changedTouches;
      for (let e4 = 0; e4 < t3.length; e4++) Ke2(i.find((n2) => n2.id === t3[e4].identifier));
    }), window.addEventListener("keydown", (e3) => {
      e3.code === "KeyP" && (t2.PAUSED = !t2.PAUSED), e3.key === " " && a.push(Number.parseInt(Math.random() * 20) + 5);
    });
    function We(e3, r2, i2, a2) {
      e3.id = r2, e3.down = true, e3.moved = false, e3.texcoordX = i2 / n.width, e3.texcoordY = 1 - a2 / n.height, e3.prevTexcoordX = e3.texcoordX, e3.prevTexcoordY = e3.texcoordY, e3.deltaX = 0, e3.deltaY = 0, t2.COLORFUL && (e3.color = Z());
    }
    function Ge(e3, r2, i2) {
      t2.TRIGGER === "click" && (e3.moved = e3.down), e3.prevTexcoordX = e3.texcoordX, e3.prevTexcoordY = e3.texcoordY, e3.texcoordX = r2 / n.width, e3.texcoordY = 1 - i2 / n.height, e3.deltaX = qe(e3.texcoordX - e3.prevTexcoordX), e3.deltaY = Je2(e3.texcoordY - e3.prevTexcoordY), t2.TRIGGER === "hover" && (e3.moved = Math.abs(e3.deltaX) > 0 || Math.abs(e3.deltaY) > 0);
    }
    function Ke2(e3) {
      e3.down = false;
    }
    function qe(e3) {
      let t3 = n.width / n.height;
      return t3 < 1 && (e3 *= t3), e3;
    }
    function Je2(e3) {
      let t3 = n.width / n.height;
      return t3 > 1 && (e3 /= t3), e3;
    }
    function Ye() {
      let e3 = Xe(Math.random(), 1, 1);
      return e3.r *= 0.15, e3.g *= 0.15, e3.b *= 0.15, e3;
    }
    function Z() {
      let e3 = t2.SPLAT_COLOR || Ye();
      return {
        r: e3.r,
        g: e3.g,
        b: e3.b
      };
    }
    function Xe(e3, t3, n2) {
      let r2, i2, a2, o2 = Math.floor(e3 * 6), s2 = e3 * 6 - o2, c2 = n2 * (1 - t3), l2 = n2 * (1 - s2 * t3), u3 = n2 * (1 - (1 - s2) * t3);
      switch (o2 % 6) {
        case 0:
          r2 = n2, i2 = u3, a2 = c2;
          break;
        case 1:
          r2 = l2, i2 = n2, a2 = c2;
          break;
        case 2:
          r2 = c2, i2 = n2, a2 = u3;
          break;
        case 3:
          r2 = c2, i2 = l2, a2 = n2;
          break;
        case 4:
          r2 = u3, i2 = c2, a2 = n2;
          break;
        case 5:
          r2 = n2, i2 = c2, a2 = l2;
          break;
      }
      return {
        r: r2,
        g: i2,
        b: a2
      };
    }
    function Ze2(e3) {
      return {
        r: e3.r / 255,
        g: e3.g / 255,
        b: e3.b / 255
      };
    }
    function Qe2(e3, t3, n2) {
      let r2 = n2 - t3;
      return r2 === 0 ? t3 : (e3 - t3) % r2 + t3;
    }
    function Q(e3) {
      let t3 = s.drawingBufferWidth / s.drawingBufferHeight;
      t3 < 1 && (t3 = 1 / t3);
      let n2 = Math.round(e3), r2 = Math.round(e3 * t3);
      return s.drawingBufferWidth > s.drawingBufferHeight ? {
        width: r2,
        height: n2
      } : {
        width: n2,
        height: r2
      };
    }
    function $e2(e3, t3, n2) {
      return {
        x: t3 / e3.width,
        y: n2 / e3.height
      };
    }
    function $(e3) {
      let t3 = window.devicePixelRatio || 1;
      return Math.floor(e3 * t3);
    }
    function et(e3) {
      if (e3.length === 0) return 0;
      let t3 = 0;
      for (let n2 = 0; n2 < e3.length; n2++) t3 = (t3 << 5) - t3 + e3.charCodeAt(n2), t3 |= 0;
      return t3;
    }
  }

  // js/hero-fluid.js
  var OPCIONES_FLUIDO = {
    TRIGGER: "hover",
    IMMEDIATE: true,
    AUTO: true,
    INTERVAL: 2600,
    DENSITY_DISSIPATION: 0.9,
    CURL: 38,
    SPLAT_RADIUS: 0.28,
    BACK_COLOR: { r: 2, g: 6, b: 8 },
    BLOOM: true,
    SUNRAYS: true
  };
  function fallar(caja, motivo) {
    caja.dataset.estado = /webgl/i.test(motivo) ? "sin-webgl" : "fallo";
    caja.dataset.motivo = motivo;
    caja.classList.add("sin-shader");
    console.warn("Hero: no se pudo montar la tinta l\xEDquida \xB7", motivo);
  }
  function montarFluido(caja, opciones) {
    return new Promise((resolve) => {
      if (!caja) {
        resolve(null);
        return;
      }
      const hayWebGL = (() => {
        try {
          const prueba = document.createElement("canvas");
          return !!(prueba.getContext("webgl2") || prueba.getContext("webgl"));
        } catch (error) {
          return false;
        }
      })();
      if (!hayWebGL) {
        fallar(caja, "este navegador no tiene WebGL");
        resolve(null);
        return;
      }
      const retoques = window.HERO_AJUSTES && window.HERO_AJUSTES.fluido || {};
      const ajustes2 = Object.assign({}, OPCIONES_FLUIDO, opciones || {}, retoques);
      if (prefiereMenosMovimiento()) {
        ajustes2.AUTO = false;
      }
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;";
      caja.appendChild(canvas);
      try {
        e(canvas, ajustes2);
        caja.dataset.estado = "ok";
        resolve(canvas);
      } catch (error) {
        fallar(caja, String(error && error.message || error || "error desconocido").slice(0, 160));
        resolve(null);
      }
    });
  }

  // lib/paper-shaders/dist/shaders/dithering.js
  var ditheringFragmentShader = `#version 300 es
precision mediump float;

uniform float u_time;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform float u_pxSize;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_shape;
uniform float u_type;

out vec4 fragColor;

${simplexNoise}
${declarePI}
${proceduralHash11}
${proceduralHash21}

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));

  return noise;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
0, 8, 2, 10,
12, 4, 14, 6,
3, 11, 1, 9,
15, 7, 13, 5
);

const int bayer8x8[64] = int[64](
0, 32, 8, 40, 2, 34, 10, 42,
48, 16, 56, 24, 50, 18, 58, 26,
12, 44, 4, 36, 14, 46, 6, 38,
60, 28, 52, 20, 62, 30, 54, 22,
3, 35, 11, 43, 1, 33, 9, 41,
51, 19, 59, 27, 49, 17, 57, 25,
15, 47, 7, 39, 13, 45, 5, 37,
63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}


void main() {
  float t = .5 * u_time;

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec2 shapeUV = normalizedUV;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 boxSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  
  if (u_shape > 3.5) {
    vec2 objectBoxSize = vec2(0.);
    // fit = none
    objectBoxSize.x = min(boxSize.x, boxSize.y);
    if (u_fit == 1.) { // fit = contain
      objectBoxSize.x = min(u_resolution.x, u_resolution.y);
    } else if (u_fit == 2.) { // fit = cover
      objectBoxSize.x = max(u_resolution.x, u_resolution.y);
    }
    objectBoxSize.y = objectBoxSize.x;
    vec2 objectWorldScale = u_resolution.xy / objectBoxSize;

    shapeUV *= objectWorldScale;
    shapeUV += boxOrigin * (objectWorldScale - 1.);
    shapeUV += vec2(-u_offsetX, u_offsetY);
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
  } else {
    vec2 patternBoxSize = vec2(0.);
    // fit = none
    patternBoxSize.x = patternBoxRatio * min(boxSize.x / patternBoxRatio, boxSize.y);
    float patternWorldNoFitBoxWidth = patternBoxSize.x;
    if (u_fit == 1.) { // fit = contain
      patternBoxSize.x = patternBoxRatio * min(u_resolution.x / patternBoxRatio, u_resolution.y);
    } else if (u_fit == 2.) { // fit = cover
      patternBoxSize.x = patternBoxRatio * max(u_resolution.x / patternBoxRatio, u_resolution.y);
    }
    patternBoxSize.y = patternBoxSize.x / patternBoxRatio;
    vec2 patternWorldScale = u_resolution.xy / patternBoxSize;

    shapeUV += vec2(-u_offsetX, u_offsetY) / patternWorldScale;
    shapeUV += boxOrigin;
    shapeUV -= boxOrigin / patternWorldScale;
    shapeUV *= u_resolution.xy;
    shapeUV /= u_pixelRatio;
    if (u_fit > 0.) {
      shapeUV *= (patternWorldNoFitBoxWidth / patternBoxSize.x);
    }
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
    shapeUV += boxOrigin / patternWorldScale;
    shapeUV -= boxOrigin;
    shapeUV += .5;
  }

  float shape = 0.;
  if (u_shape < 1.5) {
    // Simplex noise
    shapeUV *= .001;

    shape = 0.5 + 0.5 * getSimplexNoise(shapeUV, t);
    shape = smoothstep(0.3, 0.9, shape);

  } else if (u_shape < 2.5) {
    // Warp
    shapeUV *= .003;

    for (float i = 1.0; i < 6.0; i++) {
      shapeUV.x += 0.6 / i * cos(i * 2.5 * shapeUV.y + t);
      shapeUV.y += 0.6 / i * cos(i * 1.5 * shapeUV.x + t);
    }

    shape = .15 / max(0.001, abs(sin(t - shapeUV.y - shapeUV.x)));
    shape = smoothstep(0.02, 1., shape);

  } else if (u_shape < 3.5) {
    // Dots
    shapeUV *= .05;

    float stripeIdx = floor(2. * shapeUV.x / TWO_PI);
    float rand = hash11(stripeIdx * 10.);
    rand = sign(rand - .5) * pow(.1 + abs(rand), .4);
    shape = sin(shapeUV.x) * cos(shapeUV.y - 5. * rand * t);
    shape = pow(abs(shape), 6.);

  } else if (u_shape < 4.5) {
    // Sine wave
    shapeUV *= 4.;

    float wave = cos(.5 * shapeUV.x - 2. * t) * sin(1.5 * shapeUV.x + t) * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shapeUV.y + wave);

  } else if (u_shape < 5.5) {
    // Ripple

    float dist = length(shapeUV);
    float waves = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
    shape = waves;

  } else if (u_shape < 6.5) {
    // Swirl

    float l = length(shapeUV);
    float angle = 6. * atan(shapeUV.y, shapeUV.x) + 4. * t;
    float twist = 1.2;
    float offset = 1. / pow(max(l, 1e-6), twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(l, twist));
    shape = mix(0., fract(offset), mid);

  } else {
    // Sphere
    shapeUV *= 2.;

    float d = 1. - pow(length(shapeUV), 2.);
    vec3 pos = vec3(shapeUV, sqrt(max(0., d)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }


  int type = int(floor(u_type));
  float dithering = 0.0;

  switch (type) {
    case 1: {
      dithering = step(hash21(ditheringNoiseUV), shape);
    } break;
    case 2:
    dithering = getBayerValue(pxSizeUV, 2);
    break;
    case 3:
    dithering = getBayerValue(pxSizeUV, 4);
    break;
    default :
    dithering = getBayerValue(pxSizeUV, 8);
    break;
  }

  dithering -= .5;
  float res = step(.5, shape + dithering);

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);

  fragColor = vec4(color, opacity);
}
`;
  var DitheringShapes = {
    simplex: 1,
    warp: 2,
    dots: 3,
    wave: 4,
    ripple: 5,
    swirl: 6,
    sphere: 7
  };
  var DitheringTypes = {
    "random": 1,
    "2x2": 2,
    "4x4": 3,
    "8x8": 4
  };

  // js/hero-dither.js
  var OPCIONES_DITHER = {
    colorBack: "#020608",
    colorFront: "#26b5ce",
    shape: "warp",
    type: "8x8",
    size: 2,
    speed: 1,
    steer: 0.15
  };
  function fallar2(caja, motivo) {
    caja.dataset.estado = /webgl/i.test(motivo) ? "sin-webgl" : "fallo";
    caja.dataset.motivo = motivo;
    caja.classList.add("sin-shader");
    console.warn("Hero: no se pudo montar el dither \xB7", motivo);
  }
  function conectarRaton(escucha, caja, mount, fuerza) {
    let objetivoX = 0;
    let objetivoY = 0;
    let actualX = 0;
    let actualY = 0;
    let rafId = null;
    const paso = () => {
      rafId = null;
      actualX += (objetivoX - actualX) * 0.08;
      actualY += (objetivoY - actualY) * 0.08;
      mount.setUniforms({ u_offsetX: actualX, u_offsetY: actualY });
      if (Math.abs(objetivoX - actualX) + Math.abs(objetivoY - actualY) > 5e-4) {
        rafId = requestAnimationFrame(paso);
      }
    };
    escucha.addEventListener("pointermove", (evento) => {
      const caja2 = caja.getBoundingClientRect();
      if (!caja2.width || !caja2.height) {
        return;
      }
      objetivoX = ((evento.clientX - caja2.left) / caja2.width - 0.5) * fuerza;
      objetivoY = ((evento.clientY - caja2.top) / caja2.height - 0.5) * fuerza;
      if (rafId === null) {
        rafId = requestAnimationFrame(paso);
      }
    });
  }
  function montarDither(caja, preset) {
    return new Promise((resolve) => {
      if (!caja) {
        resolve(null);
        return;
      }
      const retoques = window.HERO_AJUSTES && window.HERO_AJUSTES.dither || {};
      const ajustes2 = Object.assign({}, OPCIONES_DITHER, preset || {}, retoques);
      try {
        const uniforms = {
          u_colorBack: getShaderColorFromString(ajustes2.colorBack),
          u_colorFront: getShaderColorFromString(ajustes2.colorFront),
          u_shape: DitheringShapes[ajustes2.shape] || DitheringShapes.warp,
          u_type: DitheringTypes[ajustes2.type] || DitheringTypes["8x8"],
          u_pxSize: ajustes2.size,
          /* OJO: estos no pueden quedarse a cero. El shader divide
             por u_scale y usa el origen para centrar la forma. */
          u_scale: 1,
          u_rotation: 0,
          u_offsetX: 0,
          u_offsetY: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_worldWidth: 0,
          u_worldHeight: 0,
          u_fit: 0
        };
        const sinMovimiento3 = prefiereMenosMovimiento();
        const mount = new ShaderMount(
          caja,
          ditheringFragmentShader,
          uniforms,
          void 0,
          sinMovimiento3 ? 0 : ajustes2.speed,
          0,
          2,
          1920 * 1080 * 2
        );
        caja.dataset.estado = "ok";
        try {
          const dbg = mount.gl.getExtension("WEBGL_debug_renderer_info");
          caja.dataset.renderer = String(
            dbg && mount.gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || mount.gl.getParameter(mount.gl.RENDERER) || ""
          );
        } catch (error) {
          caja.dataset.renderer = "";
        }
        if (!sinMovimiento3 && ajustes2.steer > 0) {
          conectarRaton(caja.parentElement || caja, caja, mount, ajustes2.steer);
        }
        resolve(mount);
      } catch (error) {
        fallar2(caja, String(error && error.message || error || "error desconocido").slice(0, 160));
        resolve(null);
      }
    });
  }

  // lib/blotter/chunk-CXYC3ZAY.js
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
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
    set mainImage(mainImage6) {
      this._mainImage = mainImage6 || DEFAULT_MAIN_IMAGE;
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

  // lib/three/three.module.min.js
  var t = "170";
  var u = 0;
  var d = 1;
  var p = 2;
  var y = 100;
  var M = 101;
  var S = 102;
  var w = 200;
  var E = 201;
  var A = 202;
  var R = 203;
  var C = 204;
  var I = 205;
  var P = 206;
  var L = 207;
  var U = 208;
  var D = 209;
  var N = 210;
  var O = 211;
  var F = 212;
  var B = 213;
  var z = 214;
  var k = 0;
  var V = 1;
  var H = 2;
  var G = 3;
  var W = 4;
  var X = 5;
  var j = 6;
  var q = 7;
  var ot = 300;
  var lt = 301;
  var ct = 302;
  var ht = 303;
  var ut = 304;
  var dt = 306;
  var pt = 1e3;
  var mt = 1001;
  var ft = 1002;
  var gt = 1003;
  var vt = 1004;
  var xt = 1005;
  var Mt = 1006;
  var St = 1007;
  var Tt = 1008;
  var Et = 1009;
  var At = 1010;
  var Rt = 1011;
  var Ct = 1012;
  var It = 1013;
  var Pt = 1014;
  var Lt = 1015;
  var Ut = 1016;
  var Dt = 1017;
  var Nt = 1018;
  var Ot = 1020;
  var Ft = 35902;
  var Bt = 1021;
  var zt = 1022;
  var kt = 1023;
  var Vt = 1024;
  var Ht = 1025;
  var Gt = 1026;
  var Wt = 1027;
  var Xt = 1028;
  var jt = 1029;
  var qt = 1030;
  var Yt = 1031;
  var Jt = 1033;
  var Kt = 33776;
  var $t = 33777;
  var Qt = 33778;
  var te = 33779;
  var ee = 35840;
  var ne = 35841;
  var ie = 35842;
  var re = 35843;
  var se = 36196;
  var ae = 37492;
  var oe = 37496;
  var le = 37808;
  var ce = 37809;
  var he = 37810;
  var ue = 37811;
  var de = 37812;
  var pe = 37813;
  var me = 37814;
  var fe = 37815;
  var ge = 37816;
  var ve = 37817;
  var _e = 37818;
  var xe = 37819;
  var ye = 37820;
  var Me = 37821;
  var Se = 36492;
  var be = 36494;
  var Te = 36495;
  var we = 36283;
  var Ee = 36284;
  var Ae = 36285;
  var Re = 36286;
  var Le = 2300;
  var Ue = 2301;
  var De = 2302;
  var Ne = 2400;
  var Oe = 2401;
  var Fe = 2402;
  var Ze = "";
  var Je = "srgb";
  var Ke = "srgb-linear";
  var $e = "linear";
  var Qe = "srgb";
  var en = 7680;
  var vn = 512;
  var _n = 513;
  var xn = 514;
  var yn = 515;
  var Mn = 516;
  var Sn = 517;
  var bn = 518;
  var Tn = 519;
  var wn = 35044;
  var Nn = "300 es";
  var On = 2e3;
  var Fn = 2001;
  var Bn = class {
    addEventListener(t2, e2) {
      void 0 === this._listeners && (this._listeners = {});
      const n = this._listeners;
      void 0 === n[t2] && (n[t2] = []), -1 === n[t2].indexOf(e2) && n[t2].push(e2);
    }
    hasEventListener(t2, e2) {
      if (void 0 === this._listeners) return false;
      const n = this._listeners;
      return void 0 !== n[t2] && -1 !== n[t2].indexOf(e2);
    }
    removeEventListener(t2, e2) {
      if (void 0 === this._listeners) return;
      const n = this._listeners[t2];
      if (void 0 !== n) {
        const t3 = n.indexOf(e2);
        -1 !== t3 && n.splice(t3, 1);
      }
    }
    dispatchEvent(t2) {
      if (void 0 === this._listeners) return;
      const e2 = this._listeners[t2.type];
      if (void 0 !== e2) {
        t2.target = this;
        const n = e2.slice(0);
        for (let e3 = 0, i = n.length; e3 < i; e3++) n[e3].call(this, t2);
        t2.target = null;
      }
    }
  };
  var zn = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf", "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df", "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef", "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"];
  var Vn = Math.PI / 180;
  var Hn = 180 / Math.PI;
  function Gn() {
    const t2 = 4294967295 * Math.random() | 0, e2 = 4294967295 * Math.random() | 0, n = 4294967295 * Math.random() | 0, i = 4294967295 * Math.random() | 0;
    return (zn[255 & t2] + zn[t2 >> 8 & 255] + zn[t2 >> 16 & 255] + zn[t2 >> 24 & 255] + "-" + zn[255 & e2] + zn[e2 >> 8 & 255] + "-" + zn[e2 >> 16 & 15 | 64] + zn[e2 >> 24 & 255] + "-" + zn[63 & n | 128] + zn[n >> 8 & 255] + "-" + zn[n >> 16 & 255] + zn[n >> 24 & 255] + zn[255 & i] + zn[i >> 8 & 255] + zn[i >> 16 & 255] + zn[i >> 24 & 255]).toLowerCase();
  }
  function Wn(t2, e2, n) {
    return Math.max(e2, Math.min(n, t2));
  }
  function Xn(t2, e2) {
    return (t2 % e2 + e2) % e2;
  }
  function jn(t2, e2, n) {
    return (1 - n) * t2 + n * e2;
  }
  function qn(t2, e2) {
    switch (e2.constructor) {
      case Float32Array:
        return t2;
      case Uint32Array:
        return t2 / 4294967295;
      case Uint16Array:
        return t2 / 65535;
      case Uint8Array:
        return t2 / 255;
      case Int32Array:
        return Math.max(t2 / 2147483647, -1);
      case Int16Array:
        return Math.max(t2 / 32767, -1);
      case Int8Array:
        return Math.max(t2 / 127, -1);
      default:
        throw new Error("Invalid component type.");
    }
  }
  function Yn(t2, e2) {
    switch (e2.constructor) {
      case Float32Array:
        return t2;
      case Uint32Array:
        return Math.round(4294967295 * t2);
      case Uint16Array:
        return Math.round(65535 * t2);
      case Uint8Array:
        return Math.round(255 * t2);
      case Int32Array:
        return Math.round(2147483647 * t2);
      case Int16Array:
        return Math.round(32767 * t2);
      case Int8Array:
        return Math.round(127 * t2);
      default:
        throw new Error("Invalid component type.");
    }
  }
  var Jn = class _Jn {
    constructor(t2 = 0, e2 = 0) {
      _Jn.prototype.isVector2 = true, this.x = t2, this.y = e2;
    }
    get width() {
      return this.x;
    }
    set width(t2) {
      this.x = t2;
    }
    get height() {
      return this.y;
    }
    set height(t2) {
      this.y = t2;
    }
    set(t2, e2) {
      return this.x = t2, this.y = e2, this;
    }
    setScalar(t2) {
      return this.x = t2, this.y = t2, this;
    }
    setX(t2) {
      return this.x = t2, this;
    }
    setY(t2) {
      return this.y = t2, this;
    }
    setComponent(t2, e2) {
      switch (t2) {
        case 0:
          this.x = e2;
          break;
        case 1:
          this.y = e2;
          break;
        default:
          throw new Error("index is out of range: " + t2);
      }
      return this;
    }
    getComponent(t2) {
      switch (t2) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        default:
          throw new Error("index is out of range: " + t2);
      }
    }
    clone() {
      return new this.constructor(this.x, this.y);
    }
    copy(t2) {
      return this.x = t2.x, this.y = t2.y, this;
    }
    add(t2) {
      return this.x += t2.x, this.y += t2.y, this;
    }
    addScalar(t2) {
      return this.x += t2, this.y += t2, this;
    }
    addVectors(t2, e2) {
      return this.x = t2.x + e2.x, this.y = t2.y + e2.y, this;
    }
    addScaledVector(t2, e2) {
      return this.x += t2.x * e2, this.y += t2.y * e2, this;
    }
    sub(t2) {
      return this.x -= t2.x, this.y -= t2.y, this;
    }
    subScalar(t2) {
      return this.x -= t2, this.y -= t2, this;
    }
    subVectors(t2, e2) {
      return this.x = t2.x - e2.x, this.y = t2.y - e2.y, this;
    }
    multiply(t2) {
      return this.x *= t2.x, this.y *= t2.y, this;
    }
    multiplyScalar(t2) {
      return this.x *= t2, this.y *= t2, this;
    }
    divide(t2) {
      return this.x /= t2.x, this.y /= t2.y, this;
    }
    divideScalar(t2) {
      return this.multiplyScalar(1 / t2);
    }
    applyMatrix3(t2) {
      const e2 = this.x, n = this.y, i = t2.elements;
      return this.x = i[0] * e2 + i[3] * n + i[6], this.y = i[1] * e2 + i[4] * n + i[7], this;
    }
    min(t2) {
      return this.x = Math.min(this.x, t2.x), this.y = Math.min(this.y, t2.y), this;
    }
    max(t2) {
      return this.x = Math.max(this.x, t2.x), this.y = Math.max(this.y, t2.y), this;
    }
    clamp(t2, e2) {
      return this.x = Math.max(t2.x, Math.min(e2.x, this.x)), this.y = Math.max(t2.y, Math.min(e2.y, this.y)), this;
    }
    clampScalar(t2, e2) {
      return this.x = Math.max(t2, Math.min(e2, this.x)), this.y = Math.max(t2, Math.min(e2, this.y)), this;
    }
    clampLength(t2, e2) {
      const n = this.length();
      return this.divideScalar(n || 1).multiplyScalar(Math.max(t2, Math.min(e2, n)));
    }
    floor() {
      return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
    }
    ceil() {
      return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
    }
    round() {
      return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
    }
    roundToZero() {
      return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
    }
    negate() {
      return this.x = -this.x, this.y = -this.y, this;
    }
    dot(t2) {
      return this.x * t2.x + this.y * t2.y;
    }
    cross(t2) {
      return this.x * t2.y - this.y * t2.x;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y);
    }
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    angle() {
      return Math.atan2(-this.y, -this.x) + Math.PI;
    }
    angleTo(t2) {
      const e2 = Math.sqrt(this.lengthSq() * t2.lengthSq());
      if (0 === e2) return Math.PI / 2;
      const n = this.dot(t2) / e2;
      return Math.acos(Wn(n, -1, 1));
    }
    distanceTo(t2) {
      return Math.sqrt(this.distanceToSquared(t2));
    }
    distanceToSquared(t2) {
      const e2 = this.x - t2.x, n = this.y - t2.y;
      return e2 * e2 + n * n;
    }
    manhattanDistanceTo(t2) {
      return Math.abs(this.x - t2.x) + Math.abs(this.y - t2.y);
    }
    setLength(t2) {
      return this.normalize().multiplyScalar(t2);
    }
    lerp(t2, e2) {
      return this.x += (t2.x - this.x) * e2, this.y += (t2.y - this.y) * e2, this;
    }
    lerpVectors(t2, e2, n) {
      return this.x = t2.x + (e2.x - t2.x) * n, this.y = t2.y + (e2.y - t2.y) * n, this;
    }
    equals(t2) {
      return t2.x === this.x && t2.y === this.y;
    }
    fromArray(t2, e2 = 0) {
      return this.x = t2[e2], this.y = t2[e2 + 1], this;
    }
    toArray(t2 = [], e2 = 0) {
      return t2[e2] = this.x, t2[e2 + 1] = this.y, t2;
    }
    fromBufferAttribute(t2, e2) {
      return this.x = t2.getX(e2), this.y = t2.getY(e2), this;
    }
    rotateAround(t2, e2) {
      const n = Math.cos(e2), i = Math.sin(e2), r = this.x - t2.x, s = this.y - t2.y;
      return this.x = r * n - s * i + t2.x, this.y = r * i + s * n + t2.y, this;
    }
    random() {
      return this.x = Math.random(), this.y = Math.random(), this;
    }
    *[Symbol.iterator]() {
      yield this.x, yield this.y;
    }
  };
  var Kn = class _Kn {
    constructor(t2, e2, n, i, r, s, a, o, l) {
      _Kn.prototype.isMatrix3 = true, this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1], void 0 !== t2 && this.set(t2, e2, n, i, r, s, a, o, l);
    }
    set(t2, e2, n, i, r, s, a, o, l) {
      const c = this.elements;
      return c[0] = t2, c[1] = i, c[2] = a, c[3] = e2, c[4] = r, c[5] = o, c[6] = n, c[7] = s, c[8] = l, this;
    }
    identity() {
      return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this;
    }
    copy(t2) {
      const e2 = this.elements, n = t2.elements;
      return e2[0] = n[0], e2[1] = n[1], e2[2] = n[2], e2[3] = n[3], e2[4] = n[4], e2[5] = n[5], e2[6] = n[6], e2[7] = n[7], e2[8] = n[8], this;
    }
    extractBasis(t2, e2, n) {
      return t2.setFromMatrix3Column(this, 0), e2.setFromMatrix3Column(this, 1), n.setFromMatrix3Column(this, 2), this;
    }
    setFromMatrix4(t2) {
      const e2 = t2.elements;
      return this.set(e2[0], e2[4], e2[8], e2[1], e2[5], e2[9], e2[2], e2[6], e2[10]), this;
    }
    multiply(t2) {
      return this.multiplyMatrices(this, t2);
    }
    premultiply(t2) {
      return this.multiplyMatrices(t2, this);
    }
    multiplyMatrices(t2, e2) {
      const n = t2.elements, i = e2.elements, r = this.elements, s = n[0], a = n[3], o = n[6], l = n[1], c = n[4], h = n[7], u2 = n[2], d2 = n[5], p2 = n[8], m = i[0], f = i[3], g = i[6], v = i[1], _ = i[4], x = i[7], y2 = i[2], M2 = i[5], S2 = i[8];
      return r[0] = s * m + a * v + o * y2, r[3] = s * f + a * _ + o * M2, r[6] = s * g + a * x + o * S2, r[1] = l * m + c * v + h * y2, r[4] = l * f + c * _ + h * M2, r[7] = l * g + c * x + h * S2, r[2] = u2 * m + d2 * v + p2 * y2, r[5] = u2 * f + d2 * _ + p2 * M2, r[8] = u2 * g + d2 * x + p2 * S2, this;
    }
    multiplyScalar(t2) {
      const e2 = this.elements;
      return e2[0] *= t2, e2[3] *= t2, e2[6] *= t2, e2[1] *= t2, e2[4] *= t2, e2[7] *= t2, e2[2] *= t2, e2[5] *= t2, e2[8] *= t2, this;
    }
    determinant() {
      const t2 = this.elements, e2 = t2[0], n = t2[1], i = t2[2], r = t2[3], s = t2[4], a = t2[5], o = t2[6], l = t2[7], c = t2[8];
      return e2 * s * c - e2 * a * l - n * r * c + n * a * o + i * r * l - i * s * o;
    }
    invert() {
      const t2 = this.elements, e2 = t2[0], n = t2[1], i = t2[2], r = t2[3], s = t2[4], a = t2[5], o = t2[6], l = t2[7], c = t2[8], h = c * s - a * l, u2 = a * o - c * r, d2 = l * r - s * o, p2 = e2 * h + n * u2 + i * d2;
      if (0 === p2) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      const m = 1 / p2;
      return t2[0] = h * m, t2[1] = (i * l - c * n) * m, t2[2] = (a * n - i * s) * m, t2[3] = u2 * m, t2[4] = (c * e2 - i * o) * m, t2[5] = (i * r - a * e2) * m, t2[6] = d2 * m, t2[7] = (n * o - l * e2) * m, t2[8] = (s * e2 - n * r) * m, this;
    }
    transpose() {
      let t2;
      const e2 = this.elements;
      return t2 = e2[1], e2[1] = e2[3], e2[3] = t2, t2 = e2[2], e2[2] = e2[6], e2[6] = t2, t2 = e2[5], e2[5] = e2[7], e2[7] = t2, this;
    }
    getNormalMatrix(t2) {
      return this.setFromMatrix4(t2).invert().transpose();
    }
    transposeIntoArray(t2) {
      const e2 = this.elements;
      return t2[0] = e2[0], t2[1] = e2[3], t2[2] = e2[6], t2[3] = e2[1], t2[4] = e2[4], t2[5] = e2[7], t2[6] = e2[2], t2[7] = e2[5], t2[8] = e2[8], this;
    }
    setUvTransform(t2, e2, n, i, r, s, a) {
      const o = Math.cos(r), l = Math.sin(r);
      return this.set(n * o, n * l, -n * (o * s + l * a) + s + t2, -i * l, i * o, -i * (-l * s + o * a) + a + e2, 0, 0, 1), this;
    }
    scale(t2, e2) {
      return this.premultiply($n.makeScale(t2, e2)), this;
    }
    rotate(t2) {
      return this.premultiply($n.makeRotation(-t2)), this;
    }
    translate(t2, e2) {
      return this.premultiply($n.makeTranslation(t2, e2)), this;
    }
    makeTranslation(t2, e2) {
      return t2.isVector2 ? this.set(1, 0, t2.x, 0, 1, t2.y, 0, 0, 1) : this.set(1, 0, t2, 0, 1, e2, 0, 0, 1), this;
    }
    makeRotation(t2) {
      const e2 = Math.cos(t2), n = Math.sin(t2);
      return this.set(e2, -n, 0, n, e2, 0, 0, 0, 1), this;
    }
    makeScale(t2, e2) {
      return this.set(t2, 0, 0, 0, e2, 0, 0, 0, 1), this;
    }
    equals(t2) {
      const e2 = this.elements, n = t2.elements;
      for (let t3 = 0; t3 < 9; t3++) if (e2[t3] !== n[t3]) return false;
      return true;
    }
    fromArray(t2, e2 = 0) {
      for (let n = 0; n < 9; n++) this.elements[n] = t2[n + e2];
      return this;
    }
    toArray(t2 = [], e2 = 0) {
      const n = this.elements;
      return t2[e2] = n[0], t2[e2 + 1] = n[1], t2[e2 + 2] = n[2], t2[e2 + 3] = n[3], t2[e2 + 4] = n[4], t2[e2 + 5] = n[5], t2[e2 + 6] = n[6], t2[e2 + 7] = n[7], t2[e2 + 8] = n[8], t2;
    }
    clone() {
      return new this.constructor().fromArray(this.elements);
    }
  };
  var $n = new Kn();
  function Qn(t2) {
    for (let e2 = t2.length - 1; e2 >= 0; --e2) if (t2[e2] >= 65535) return true;
    return false;
  }
  function ni(t2) {
    return document.createElementNS("http://www.w3.org/1999/xhtml", t2);
  }
  function ii() {
    const t2 = ni("canvas");
    return t2.style.display = "block", t2;
  }
  var ri = {};
  function si(t2) {
    t2 in ri || (ri[t2] = true, console.warn(t2));
  }
  var ai = { enabled: true, workingColorSpace: Ke, spaces: {}, convert: function(t2, e2, n) {
    return false !== this.enabled && e2 !== n && e2 && n ? (this.spaces[e2].transfer === Qe && (t2.r = oi(t2.r), t2.g = oi(t2.g), t2.b = oi(t2.b)), this.spaces[e2].primaries !== this.spaces[n].primaries && (t2.applyMatrix3(this.spaces[e2].toXYZ), t2.applyMatrix3(this.spaces[n].fromXYZ)), this.spaces[n].transfer === Qe && (t2.r = li(t2.r), t2.g = li(t2.g), t2.b = li(t2.b)), t2) : t2;
  }, fromWorkingColorSpace: function(t2, e2) {
    return this.convert(t2, this.workingColorSpace, e2);
  }, toWorkingColorSpace: function(t2, e2) {
    return this.convert(t2, e2, this.workingColorSpace);
  }, getPrimaries: function(t2) {
    return this.spaces[t2].primaries;
  }, getTransfer: function(t2) {
    return t2 === Ze ? $e : this.spaces[t2].transfer;
  }, getLuminanceCoefficients: function(t2, e2 = this.workingColorSpace) {
    return t2.fromArray(this.spaces[e2].luminanceCoefficients);
  }, define: function(t2) {
    Object.assign(this.spaces, t2);
  }, _getMatrix: function(t2, e2, n) {
    return t2.copy(this.spaces[e2].toXYZ).multiply(this.spaces[n].fromXYZ);
  }, _getDrawingBufferColorSpace: function(t2) {
    return this.spaces[t2].outputColorSpaceConfig.drawingBufferColorSpace;
  }, _getUnpackColorSpace: function(t2 = this.workingColorSpace) {
    return this.spaces[t2].workingColorSpaceConfig.unpackColorSpace;
  } };
  function oi(t2) {
    return t2 < 0.04045 ? 0.0773993808 * t2 : Math.pow(0.9478672986 * t2 + 0.0521327014, 2.4);
  }
  function li(t2) {
    return t2 < 31308e-7 ? 12.92 * t2 : 1.055 * Math.pow(t2, 0.41666) - 0.055;
  }
  var ci = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06];
  var hi = [0.2126, 0.7152, 0.0722];
  var ui = [0.3127, 0.329];
  var di = new Kn().set(0.4123908, 0.3575843, 0.1804808, 0.212639, 0.7151687, 0.0721923, 0.0193308, 0.1191948, 0.9505322);
  var pi2 = new Kn().set(3.2409699, -1.5373832, -0.4986108, -0.9692436, 1.8759675, 0.0415551, 0.0556301, -0.203977, 1.0569715);
  var mi;
  ai.define({ [Ke]: { primaries: ci, whitePoint: ui, transfer: $e, toXYZ: di, fromXYZ: pi2, luminanceCoefficients: hi, workingColorSpaceConfig: { unpackColorSpace: Je }, outputColorSpaceConfig: { drawingBufferColorSpace: Je } }, [Je]: { primaries: ci, whitePoint: ui, transfer: Qe, toXYZ: di, fromXYZ: pi2, luminanceCoefficients: hi, outputColorSpaceConfig: { drawingBufferColorSpace: Je } } });
  var fi = class {
    static getDataURL(t2) {
      if (/^data:/i.test(t2.src)) return t2.src;
      if ("undefined" == typeof HTMLCanvasElement) return t2.src;
      let e2;
      if (t2 instanceof HTMLCanvasElement) e2 = t2;
      else {
        void 0 === mi && (mi = ni("canvas")), mi.width = t2.width, mi.height = t2.height;
        const n = mi.getContext("2d");
        t2 instanceof ImageData ? n.putImageData(t2, 0, 0) : n.drawImage(t2, 0, 0, t2.width, t2.height), e2 = mi;
      }
      return e2.width > 2048 || e2.height > 2048 ? (console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons", t2), e2.toDataURL("image/jpeg", 0.6)) : e2.toDataURL("image/png");
    }
    static sRGBToLinear(t2) {
      if ("undefined" != typeof HTMLImageElement && t2 instanceof HTMLImageElement || "undefined" != typeof HTMLCanvasElement && t2 instanceof HTMLCanvasElement || "undefined" != typeof ImageBitmap && t2 instanceof ImageBitmap) {
        const e2 = ni("canvas");
        e2.width = t2.width, e2.height = t2.height;
        const n = e2.getContext("2d");
        n.drawImage(t2, 0, 0, t2.width, t2.height);
        const i = n.getImageData(0, 0, t2.width, t2.height), r = i.data;
        for (let t3 = 0; t3 < r.length; t3++) r[t3] = 255 * oi(r[t3] / 255);
        return n.putImageData(i, 0, 0), e2;
      }
      if (t2.data) {
        const e2 = t2.data.slice(0);
        for (let t3 = 0; t3 < e2.length; t3++) e2 instanceof Uint8Array || e2 instanceof Uint8ClampedArray ? e2[t3] = Math.floor(255 * oi(e2[t3] / 255)) : e2[t3] = oi(e2[t3]);
        return { data: e2, width: t2.width, height: t2.height };
      }
      return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), t2;
    }
  };
  var gi = 0;
  var vi = class {
    constructor(t2 = null) {
      this.isSource = true, Object.defineProperty(this, "id", { value: gi++ }), this.uuid = Gn(), this.data = t2, this.dataReady = true, this.version = 0;
    }
    set needsUpdate(t2) {
      true === t2 && this.version++;
    }
    toJSON(t2) {
      const e2 = void 0 === t2 || "string" == typeof t2;
      if (!e2 && void 0 !== t2.images[this.uuid]) return t2.images[this.uuid];
      const n = { uuid: this.uuid, url: "" }, i = this.data;
      if (null !== i) {
        let t3;
        if (Array.isArray(i)) {
          t3 = [];
          for (let e3 = 0, n2 = i.length; e3 < n2; e3++) i[e3].isDataTexture ? t3.push(_i(i[e3].image)) : t3.push(_i(i[e3]));
        } else t3 = _i(i);
        n.url = t3;
      }
      return e2 || (t2.images[this.uuid] = n), n;
    }
  };
  function _i(t2) {
    return "undefined" != typeof HTMLImageElement && t2 instanceof HTMLImageElement || "undefined" != typeof HTMLCanvasElement && t2 instanceof HTMLCanvasElement || "undefined" != typeof ImageBitmap && t2 instanceof ImageBitmap ? fi.getDataURL(t2) : t2.data ? { data: Array.from(t2.data), width: t2.width, height: t2.height, type: t2.data.constructor.name } : (console.warn("THREE.Texture: Unable to serialize Texture."), {});
  }
  var xi = 0;
  var yi = class _yi extends Bn {
    constructor(t2 = _yi.DEFAULT_IMAGE, e2 = _yi.DEFAULT_MAPPING, n = 1001, i = 1001, r = 1006, s = 1008, a = 1023, o = 1009, l = _yi.DEFAULT_ANISOTROPY, c = "") {
      super(), this.isTexture = true, Object.defineProperty(this, "id", { value: xi++ }), this.uuid = Gn(), this.name = "", this.source = new vi(t2), this.mipmaps = [], this.mapping = e2, this.channel = 0, this.wrapS = n, this.wrapT = i, this.magFilter = r, this.minFilter = s, this.anisotropy = l, this.format = a, this.internalFormat = null, this.type = o, this.offset = new Jn(0, 0), this.repeat = new Jn(1, 1), this.center = new Jn(0, 0), this.rotation = 0, this.matrixAutoUpdate = true, this.matrix = new Kn(), this.generateMipmaps = true, this.premultiplyAlpha = false, this.flipY = true, this.unpackAlignment = 4, this.colorSpace = c, this.userData = {}, this.version = 0, this.onUpdate = null, this.isRenderTargetTexture = false, this.pmremVersion = 0;
    }
    get image() {
      return this.source.data;
    }
    set image(t2 = null) {
      this.source.data = t2;
    }
    updateMatrix() {
      this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      return this.name = t2.name, this.source = t2.source, this.mipmaps = t2.mipmaps.slice(0), this.mapping = t2.mapping, this.channel = t2.channel, this.wrapS = t2.wrapS, this.wrapT = t2.wrapT, this.magFilter = t2.magFilter, this.minFilter = t2.minFilter, this.anisotropy = t2.anisotropy, this.format = t2.format, this.internalFormat = t2.internalFormat, this.type = t2.type, this.offset.copy(t2.offset), this.repeat.copy(t2.repeat), this.center.copy(t2.center), this.rotation = t2.rotation, this.matrixAutoUpdate = t2.matrixAutoUpdate, this.matrix.copy(t2.matrix), this.generateMipmaps = t2.generateMipmaps, this.premultiplyAlpha = t2.premultiplyAlpha, this.flipY = t2.flipY, this.unpackAlignment = t2.unpackAlignment, this.colorSpace = t2.colorSpace, this.userData = JSON.parse(JSON.stringify(t2.userData)), this.needsUpdate = true, this;
    }
    toJSON(t2) {
      const e2 = void 0 === t2 || "string" == typeof t2;
      if (!e2 && void 0 !== t2.textures[this.uuid]) return t2.textures[this.uuid];
      const n = { metadata: { version: 4.6, type: "Texture", generator: "Texture.toJSON" }, uuid: this.uuid, name: this.name, image: this.source.toJSON(t2).uuid, mapping: this.mapping, channel: this.channel, repeat: [this.repeat.x, this.repeat.y], offset: [this.offset.x, this.offset.y], center: [this.center.x, this.center.y], rotation: this.rotation, wrap: [this.wrapS, this.wrapT], format: this.format, internalFormat: this.internalFormat, type: this.type, colorSpace: this.colorSpace, minFilter: this.minFilter, magFilter: this.magFilter, anisotropy: this.anisotropy, flipY: this.flipY, generateMipmaps: this.generateMipmaps, premultiplyAlpha: this.premultiplyAlpha, unpackAlignment: this.unpackAlignment };
      return Object.keys(this.userData).length > 0 && (n.userData = this.userData), e2 || (t2.textures[this.uuid] = n), n;
    }
    dispose() {
      this.dispatchEvent({ type: "dispose" });
    }
    transformUv(t2) {
      if (this.mapping !== ot) return t2;
      if (t2.applyMatrix3(this.matrix), t2.x < 0 || t2.x > 1) switch (this.wrapS) {
        case pt:
          t2.x = t2.x - Math.floor(t2.x);
          break;
        case mt:
          t2.x = t2.x < 0 ? 0 : 1;
          break;
        case ft:
          1 === Math.abs(Math.floor(t2.x) % 2) ? t2.x = Math.ceil(t2.x) - t2.x : t2.x = t2.x - Math.floor(t2.x);
      }
      if (t2.y < 0 || t2.y > 1) switch (this.wrapT) {
        case pt:
          t2.y = t2.y - Math.floor(t2.y);
          break;
        case mt:
          t2.y = t2.y < 0 ? 0 : 1;
          break;
        case ft:
          1 === Math.abs(Math.floor(t2.y) % 2) ? t2.y = Math.ceil(t2.y) - t2.y : t2.y = t2.y - Math.floor(t2.y);
      }
      return this.flipY && (t2.y = 1 - t2.y), t2;
    }
    set needsUpdate(t2) {
      true === t2 && (this.version++, this.source.needsUpdate = true);
    }
    set needsPMREMUpdate(t2) {
      true === t2 && this.pmremVersion++;
    }
  };
  yi.DEFAULT_IMAGE = null, yi.DEFAULT_MAPPING = ot, yi.DEFAULT_ANISOTROPY = 1;
  var Mi = class _Mi {
    constructor(t2 = 0, e2 = 0, n = 0, i = 1) {
      _Mi.prototype.isVector4 = true, this.x = t2, this.y = e2, this.z = n, this.w = i;
    }
    get width() {
      return this.z;
    }
    set width(t2) {
      this.z = t2;
    }
    get height() {
      return this.w;
    }
    set height(t2) {
      this.w = t2;
    }
    set(t2, e2, n, i) {
      return this.x = t2, this.y = e2, this.z = n, this.w = i, this;
    }
    setScalar(t2) {
      return this.x = t2, this.y = t2, this.z = t2, this.w = t2, this;
    }
    setX(t2) {
      return this.x = t2, this;
    }
    setY(t2) {
      return this.y = t2, this;
    }
    setZ(t2) {
      return this.z = t2, this;
    }
    setW(t2) {
      return this.w = t2, this;
    }
    setComponent(t2, e2) {
      switch (t2) {
        case 0:
          this.x = e2;
          break;
        case 1:
          this.y = e2;
          break;
        case 2:
          this.z = e2;
          break;
        case 3:
          this.w = e2;
          break;
        default:
          throw new Error("index is out of range: " + t2);
      }
      return this;
    }
    getComponent(t2) {
      switch (t2) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        case 2:
          return this.z;
        case 3:
          return this.w;
        default:
          throw new Error("index is out of range: " + t2);
      }
    }
    clone() {
      return new this.constructor(this.x, this.y, this.z, this.w);
    }
    copy(t2) {
      return this.x = t2.x, this.y = t2.y, this.z = t2.z, this.w = void 0 !== t2.w ? t2.w : 1, this;
    }
    add(t2) {
      return this.x += t2.x, this.y += t2.y, this.z += t2.z, this.w += t2.w, this;
    }
    addScalar(t2) {
      return this.x += t2, this.y += t2, this.z += t2, this.w += t2, this;
    }
    addVectors(t2, e2) {
      return this.x = t2.x + e2.x, this.y = t2.y + e2.y, this.z = t2.z + e2.z, this.w = t2.w + e2.w, this;
    }
    addScaledVector(t2, e2) {
      return this.x += t2.x * e2, this.y += t2.y * e2, this.z += t2.z * e2, this.w += t2.w * e2, this;
    }
    sub(t2) {
      return this.x -= t2.x, this.y -= t2.y, this.z -= t2.z, this.w -= t2.w, this;
    }
    subScalar(t2) {
      return this.x -= t2, this.y -= t2, this.z -= t2, this.w -= t2, this;
    }
    subVectors(t2, e2) {
      return this.x = t2.x - e2.x, this.y = t2.y - e2.y, this.z = t2.z - e2.z, this.w = t2.w - e2.w, this;
    }
    multiply(t2) {
      return this.x *= t2.x, this.y *= t2.y, this.z *= t2.z, this.w *= t2.w, this;
    }
    multiplyScalar(t2) {
      return this.x *= t2, this.y *= t2, this.z *= t2, this.w *= t2, this;
    }
    applyMatrix4(t2) {
      const e2 = this.x, n = this.y, i = this.z, r = this.w, s = t2.elements;
      return this.x = s[0] * e2 + s[4] * n + s[8] * i + s[12] * r, this.y = s[1] * e2 + s[5] * n + s[9] * i + s[13] * r, this.z = s[2] * e2 + s[6] * n + s[10] * i + s[14] * r, this.w = s[3] * e2 + s[7] * n + s[11] * i + s[15] * r, this;
    }
    divide(t2) {
      return this.x /= t2.x, this.y /= t2.y, this.z /= t2.z, this.w /= t2.w, this;
    }
    divideScalar(t2) {
      return this.multiplyScalar(1 / t2);
    }
    setAxisAngleFromQuaternion(t2) {
      this.w = 2 * Math.acos(t2.w);
      const e2 = Math.sqrt(1 - t2.w * t2.w);
      return e2 < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = t2.x / e2, this.y = t2.y / e2, this.z = t2.z / e2), this;
    }
    setAxisAngleFromRotationMatrix(t2) {
      let e2, n, i, r;
      const s = 0.01, a = 0.1, o = t2.elements, l = o[0], c = o[4], h = o[8], u2 = o[1], d2 = o[5], p2 = o[9], m = o[2], f = o[6], g = o[10];
      if (Math.abs(c - u2) < s && Math.abs(h - m) < s && Math.abs(p2 - f) < s) {
        if (Math.abs(c + u2) < a && Math.abs(h + m) < a && Math.abs(p2 + f) < a && Math.abs(l + d2 + g - 3) < a) return this.set(1, 0, 0, 0), this;
        e2 = Math.PI;
        const t3 = (l + 1) / 2, o2 = (d2 + 1) / 2, v2 = (g + 1) / 2, _ = (c + u2) / 4, x = (h + m) / 4, y2 = (p2 + f) / 4;
        return t3 > o2 && t3 > v2 ? t3 < s ? (n = 0, i = 0.707106781, r = 0.707106781) : (n = Math.sqrt(t3), i = _ / n, r = x / n) : o2 > v2 ? o2 < s ? (n = 0.707106781, i = 0, r = 0.707106781) : (i = Math.sqrt(o2), n = _ / i, r = y2 / i) : v2 < s ? (n = 0.707106781, i = 0.707106781, r = 0) : (r = Math.sqrt(v2), n = x / r, i = y2 / r), this.set(n, i, r, e2), this;
      }
      let v = Math.sqrt((f - p2) * (f - p2) + (h - m) * (h - m) + (u2 - c) * (u2 - c));
      return Math.abs(v) < 1e-3 && (v = 1), this.x = (f - p2) / v, this.y = (h - m) / v, this.z = (u2 - c) / v, this.w = Math.acos((l + d2 + g - 1) / 2), this;
    }
    setFromMatrixPosition(t2) {
      const e2 = t2.elements;
      return this.x = e2[12], this.y = e2[13], this.z = e2[14], this.w = e2[15], this;
    }
    min(t2) {
      return this.x = Math.min(this.x, t2.x), this.y = Math.min(this.y, t2.y), this.z = Math.min(this.z, t2.z), this.w = Math.min(this.w, t2.w), this;
    }
    max(t2) {
      return this.x = Math.max(this.x, t2.x), this.y = Math.max(this.y, t2.y), this.z = Math.max(this.z, t2.z), this.w = Math.max(this.w, t2.w), this;
    }
    clamp(t2, e2) {
      return this.x = Math.max(t2.x, Math.min(e2.x, this.x)), this.y = Math.max(t2.y, Math.min(e2.y, this.y)), this.z = Math.max(t2.z, Math.min(e2.z, this.z)), this.w = Math.max(t2.w, Math.min(e2.w, this.w)), this;
    }
    clampScalar(t2, e2) {
      return this.x = Math.max(t2, Math.min(e2, this.x)), this.y = Math.max(t2, Math.min(e2, this.y)), this.z = Math.max(t2, Math.min(e2, this.z)), this.w = Math.max(t2, Math.min(e2, this.w)), this;
    }
    clampLength(t2, e2) {
      const n = this.length();
      return this.divideScalar(n || 1).multiplyScalar(Math.max(t2, Math.min(e2, n)));
    }
    floor() {
      return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
    }
    ceil() {
      return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
    }
    round() {
      return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
    }
    roundToZero() {
      return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
    }
    negate() {
      return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
    }
    dot(t2) {
      return this.x * t2.x + this.y * t2.y + this.z * t2.z + this.w * t2.w;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
    }
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    setLength(t2) {
      return this.normalize().multiplyScalar(t2);
    }
    lerp(t2, e2) {
      return this.x += (t2.x - this.x) * e2, this.y += (t2.y - this.y) * e2, this.z += (t2.z - this.z) * e2, this.w += (t2.w - this.w) * e2, this;
    }
    lerpVectors(t2, e2, n) {
      return this.x = t2.x + (e2.x - t2.x) * n, this.y = t2.y + (e2.y - t2.y) * n, this.z = t2.z + (e2.z - t2.z) * n, this.w = t2.w + (e2.w - t2.w) * n, this;
    }
    equals(t2) {
      return t2.x === this.x && t2.y === this.y && t2.z === this.z && t2.w === this.w;
    }
    fromArray(t2, e2 = 0) {
      return this.x = t2[e2], this.y = t2[e2 + 1], this.z = t2[e2 + 2], this.w = t2[e2 + 3], this;
    }
    toArray(t2 = [], e2 = 0) {
      return t2[e2] = this.x, t2[e2 + 1] = this.y, t2[e2 + 2] = this.z, t2[e2 + 3] = this.w, t2;
    }
    fromBufferAttribute(t2, e2) {
      return this.x = t2.getX(e2), this.y = t2.getY(e2), this.z = t2.getZ(e2), this.w = t2.getW(e2), this;
    }
    random() {
      return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
    }
    *[Symbol.iterator]() {
      yield this.x, yield this.y, yield this.z, yield this.w;
    }
  };
  var Si = class extends Bn {
    constructor(t2 = 1, e2 = 1, n = {}) {
      super(), this.isRenderTarget = true, this.width = t2, this.height = e2, this.depth = 1, this.scissor = new Mi(0, 0, t2, e2), this.scissorTest = false, this.viewport = new Mi(0, 0, t2, e2);
      const i = { width: t2, height: e2, depth: 1 };
      n = Object.assign({ generateMipmaps: false, internalFormat: null, minFilter: Mt, depthBuffer: true, stencilBuffer: false, resolveDepthBuffer: true, resolveStencilBuffer: true, depthTexture: null, samples: 0, count: 1 }, n);
      const r = new yi(i, n.mapping, n.wrapS, n.wrapT, n.magFilter, n.minFilter, n.format, n.type, n.anisotropy, n.colorSpace);
      r.flipY = false, r.generateMipmaps = n.generateMipmaps, r.internalFormat = n.internalFormat, this.textures = [];
      const s = n.count;
      for (let t3 = 0; t3 < s; t3++) this.textures[t3] = r.clone(), this.textures[t3].isRenderTargetTexture = true;
      this.depthBuffer = n.depthBuffer, this.stencilBuffer = n.stencilBuffer, this.resolveDepthBuffer = n.resolveDepthBuffer, this.resolveStencilBuffer = n.resolveStencilBuffer, this.depthTexture = n.depthTexture, this.samples = n.samples;
    }
    get texture() {
      return this.textures[0];
    }
    set texture(t2) {
      this.textures[0] = t2;
    }
    setSize(t2, e2, n = 1) {
      if (this.width !== t2 || this.height !== e2 || this.depth !== n) {
        this.width = t2, this.height = e2, this.depth = n;
        for (let i = 0, r = this.textures.length; i < r; i++) this.textures[i].image.width = t2, this.textures[i].image.height = e2, this.textures[i].image.depth = n;
        this.dispose();
      }
      this.viewport.set(0, 0, t2, e2), this.scissor.set(0, 0, t2, e2);
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      this.width = t2.width, this.height = t2.height, this.depth = t2.depth, this.scissor.copy(t2.scissor), this.scissorTest = t2.scissorTest, this.viewport.copy(t2.viewport), this.textures.length = 0;
      for (let e3 = 0, n = t2.textures.length; e3 < n; e3++) this.textures[e3] = t2.textures[e3].clone(), this.textures[e3].isRenderTargetTexture = true;
      const e2 = Object.assign({}, t2.texture.image);
      return this.texture.source = new vi(e2), this.depthBuffer = t2.depthBuffer, this.stencilBuffer = t2.stencilBuffer, this.resolveDepthBuffer = t2.resolveDepthBuffer, this.resolveStencilBuffer = t2.resolveStencilBuffer, null !== t2.depthTexture && (this.depthTexture = t2.depthTexture.clone()), this.samples = t2.samples, this;
    }
    dispose() {
      this.dispatchEvent({ type: "dispose" });
    }
  };
  var bi = class extends Si {
    constructor(t2 = 1, e2 = 1, n = {}) {
      super(t2, e2, n), this.isWebGLRenderTarget = true;
    }
  };
  var Ti = class extends yi {
    constructor(t2 = null, e2 = 1, n = 1, i = 1) {
      super(null), this.isDataArrayTexture = true, this.image = { data: t2, width: e2, height: n, depth: i }, this.magFilter = gt, this.minFilter = gt, this.wrapR = mt, this.generateMipmaps = false, this.flipY = false, this.unpackAlignment = 1, this.layerUpdates = /* @__PURE__ */ new Set();
    }
    addLayerUpdate(t2) {
      this.layerUpdates.add(t2);
    }
    clearLayerUpdates() {
      this.layerUpdates.clear();
    }
  };
  var Ei = class extends yi {
    constructor(t2 = null, e2 = 1, n = 1, i = 1) {
      super(null), this.isData3DTexture = true, this.image = { data: t2, width: e2, height: n, depth: i }, this.magFilter = gt, this.minFilter = gt, this.wrapR = mt, this.generateMipmaps = false, this.flipY = false, this.unpackAlignment = 1;
    }
  };
  var Ri = class {
    constructor(t2 = 0, e2 = 0, n = 0, i = 1) {
      this.isQuaternion = true, this._x = t2, this._y = e2, this._z = n, this._w = i;
    }
    static slerpFlat(t2, e2, n, i, r, s, a) {
      let o = n[i + 0], l = n[i + 1], c = n[i + 2], h = n[i + 3];
      const u2 = r[s + 0], d2 = r[s + 1], p2 = r[s + 2], m = r[s + 3];
      if (0 === a) return t2[e2 + 0] = o, t2[e2 + 1] = l, t2[e2 + 2] = c, void (t2[e2 + 3] = h);
      if (1 === a) return t2[e2 + 0] = u2, t2[e2 + 1] = d2, t2[e2 + 2] = p2, void (t2[e2 + 3] = m);
      if (h !== m || o !== u2 || l !== d2 || c !== p2) {
        let t3 = 1 - a;
        const e3 = o * u2 + l * d2 + c * p2 + h * m, n2 = e3 >= 0 ? 1 : -1, i2 = 1 - e3 * e3;
        if (i2 > Number.EPSILON) {
          const r3 = Math.sqrt(i2), s2 = Math.atan2(r3, e3 * n2);
          t3 = Math.sin(t3 * s2) / r3, a = Math.sin(a * s2) / r3;
        }
        const r2 = a * n2;
        if (o = o * t3 + u2 * r2, l = l * t3 + d2 * r2, c = c * t3 + p2 * r2, h = h * t3 + m * r2, t3 === 1 - a) {
          const t4 = 1 / Math.sqrt(o * o + l * l + c * c + h * h);
          o *= t4, l *= t4, c *= t4, h *= t4;
        }
      }
      t2[e2] = o, t2[e2 + 1] = l, t2[e2 + 2] = c, t2[e2 + 3] = h;
    }
    static multiplyQuaternionsFlat(t2, e2, n, i, r, s) {
      const a = n[i], o = n[i + 1], l = n[i + 2], c = n[i + 3], h = r[s], u2 = r[s + 1], d2 = r[s + 2], p2 = r[s + 3];
      return t2[e2] = a * p2 + c * h + o * d2 - l * u2, t2[e2 + 1] = o * p2 + c * u2 + l * h - a * d2, t2[e2 + 2] = l * p2 + c * d2 + a * u2 - o * h, t2[e2 + 3] = c * p2 - a * h - o * u2 - l * d2, t2;
    }
    get x() {
      return this._x;
    }
    set x(t2) {
      this._x = t2, this._onChangeCallback();
    }
    get y() {
      return this._y;
    }
    set y(t2) {
      this._y = t2, this._onChangeCallback();
    }
    get z() {
      return this._z;
    }
    set z(t2) {
      this._z = t2, this._onChangeCallback();
    }
    get w() {
      return this._w;
    }
    set w(t2) {
      this._w = t2, this._onChangeCallback();
    }
    set(t2, e2, n, i) {
      return this._x = t2, this._y = e2, this._z = n, this._w = i, this._onChangeCallback(), this;
    }
    clone() {
      return new this.constructor(this._x, this._y, this._z, this._w);
    }
    copy(t2) {
      return this._x = t2.x, this._y = t2.y, this._z = t2.z, this._w = t2.w, this._onChangeCallback(), this;
    }
    setFromEuler(t2, e2 = true) {
      const n = t2._x, i = t2._y, r = t2._z, s = t2._order, a = Math.cos, o = Math.sin, l = a(n / 2), c = a(i / 2), h = a(r / 2), u2 = o(n / 2), d2 = o(i / 2), p2 = o(r / 2);
      switch (s) {
        case "XYZ":
          this._x = u2 * c * h + l * d2 * p2, this._y = l * d2 * h - u2 * c * p2, this._z = l * c * p2 + u2 * d2 * h, this._w = l * c * h - u2 * d2 * p2;
          break;
        case "YXZ":
          this._x = u2 * c * h + l * d2 * p2, this._y = l * d2 * h - u2 * c * p2, this._z = l * c * p2 - u2 * d2 * h, this._w = l * c * h + u2 * d2 * p2;
          break;
        case "ZXY":
          this._x = u2 * c * h - l * d2 * p2, this._y = l * d2 * h + u2 * c * p2, this._z = l * c * p2 + u2 * d2 * h, this._w = l * c * h - u2 * d2 * p2;
          break;
        case "ZYX":
          this._x = u2 * c * h - l * d2 * p2, this._y = l * d2 * h + u2 * c * p2, this._z = l * c * p2 - u2 * d2 * h, this._w = l * c * h + u2 * d2 * p2;
          break;
        case "YZX":
          this._x = u2 * c * h + l * d2 * p2, this._y = l * d2 * h + u2 * c * p2, this._z = l * c * p2 - u2 * d2 * h, this._w = l * c * h - u2 * d2 * p2;
          break;
        case "XZY":
          this._x = u2 * c * h - l * d2 * p2, this._y = l * d2 * h - u2 * c * p2, this._z = l * c * p2 + u2 * d2 * h, this._w = l * c * h + u2 * d2 * p2;
          break;
        default:
          console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: " + s);
      }
      return true === e2 && this._onChangeCallback(), this;
    }
    setFromAxisAngle(t2, e2) {
      const n = e2 / 2, i = Math.sin(n);
      return this._x = t2.x * i, this._y = t2.y * i, this._z = t2.z * i, this._w = Math.cos(n), this._onChangeCallback(), this;
    }
    setFromRotationMatrix(t2) {
      const e2 = t2.elements, n = e2[0], i = e2[4], r = e2[8], s = e2[1], a = e2[5], o = e2[9], l = e2[2], c = e2[6], h = e2[10], u2 = n + a + h;
      if (u2 > 0) {
        const t3 = 0.5 / Math.sqrt(u2 + 1);
        this._w = 0.25 / t3, this._x = (c - o) * t3, this._y = (r - l) * t3, this._z = (s - i) * t3;
      } else if (n > a && n > h) {
        const t3 = 2 * Math.sqrt(1 + n - a - h);
        this._w = (c - o) / t3, this._x = 0.25 * t3, this._y = (i + s) / t3, this._z = (r + l) / t3;
      } else if (a > h) {
        const t3 = 2 * Math.sqrt(1 + a - n - h);
        this._w = (r - l) / t3, this._x = (i + s) / t3, this._y = 0.25 * t3, this._z = (o + c) / t3;
      } else {
        const t3 = 2 * Math.sqrt(1 + h - n - a);
        this._w = (s - i) / t3, this._x = (r + l) / t3, this._y = (o + c) / t3, this._z = 0.25 * t3;
      }
      return this._onChangeCallback(), this;
    }
    setFromUnitVectors(t2, e2) {
      let n = t2.dot(e2) + 1;
      return n < Number.EPSILON ? (n = 0, Math.abs(t2.x) > Math.abs(t2.z) ? (this._x = -t2.y, this._y = t2.x, this._z = 0, this._w = n) : (this._x = 0, this._y = -t2.z, this._z = t2.y, this._w = n)) : (this._x = t2.y * e2.z - t2.z * e2.y, this._y = t2.z * e2.x - t2.x * e2.z, this._z = t2.x * e2.y - t2.y * e2.x, this._w = n), this.normalize();
    }
    angleTo(t2) {
      return 2 * Math.acos(Math.abs(Wn(this.dot(t2), -1, 1)));
    }
    rotateTowards(t2, e2) {
      const n = this.angleTo(t2);
      if (0 === n) return this;
      const i = Math.min(1, e2 / n);
      return this.slerp(t2, i), this;
    }
    identity() {
      return this.set(0, 0, 0, 1);
    }
    invert() {
      return this.conjugate();
    }
    conjugate() {
      return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
    }
    dot(t2) {
      return this._x * t2._x + this._y * t2._y + this._z * t2._z + this._w * t2._w;
    }
    lengthSq() {
      return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
    }
    length() {
      return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
    }
    normalize() {
      let t2 = this.length();
      return 0 === t2 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (t2 = 1 / t2, this._x = this._x * t2, this._y = this._y * t2, this._z = this._z * t2, this._w = this._w * t2), this._onChangeCallback(), this;
    }
    multiply(t2) {
      return this.multiplyQuaternions(this, t2);
    }
    premultiply(t2) {
      return this.multiplyQuaternions(t2, this);
    }
    multiplyQuaternions(t2, e2) {
      const n = t2._x, i = t2._y, r = t2._z, s = t2._w, a = e2._x, o = e2._y, l = e2._z, c = e2._w;
      return this._x = n * c + s * a + i * l - r * o, this._y = i * c + s * o + r * a - n * l, this._z = r * c + s * l + n * o - i * a, this._w = s * c - n * a - i * o - r * l, this._onChangeCallback(), this;
    }
    slerp(t2, e2) {
      if (0 === e2) return this;
      if (1 === e2) return this.copy(t2);
      const n = this._x, i = this._y, r = this._z, s = this._w;
      let a = s * t2._w + n * t2._x + i * t2._y + r * t2._z;
      if (a < 0 ? (this._w = -t2._w, this._x = -t2._x, this._y = -t2._y, this._z = -t2._z, a = -a) : this.copy(t2), a >= 1) return this._w = s, this._x = n, this._y = i, this._z = r, this;
      const o = 1 - a * a;
      if (o <= Number.EPSILON) {
        const t3 = 1 - e2;
        return this._w = t3 * s + e2 * this._w, this._x = t3 * n + e2 * this._x, this._y = t3 * i + e2 * this._y, this._z = t3 * r + e2 * this._z, this.normalize(), this;
      }
      const l = Math.sqrt(o), c = Math.atan2(l, a), h = Math.sin((1 - e2) * c) / l, u2 = Math.sin(e2 * c) / l;
      return this._w = s * h + this._w * u2, this._x = n * h + this._x * u2, this._y = i * h + this._y * u2, this._z = r * h + this._z * u2, this._onChangeCallback(), this;
    }
    slerpQuaternions(t2, e2, n) {
      return this.copy(t2).slerp(e2, n);
    }
    random() {
      const t2 = 2 * Math.PI * Math.random(), e2 = 2 * Math.PI * Math.random(), n = Math.random(), i = Math.sqrt(1 - n), r = Math.sqrt(n);
      return this.set(i * Math.sin(t2), i * Math.cos(t2), r * Math.sin(e2), r * Math.cos(e2));
    }
    equals(t2) {
      return t2._x === this._x && t2._y === this._y && t2._z === this._z && t2._w === this._w;
    }
    fromArray(t2, e2 = 0) {
      return this._x = t2[e2], this._y = t2[e2 + 1], this._z = t2[e2 + 2], this._w = t2[e2 + 3], this._onChangeCallback(), this;
    }
    toArray(t2 = [], e2 = 0) {
      return t2[e2] = this._x, t2[e2 + 1] = this._y, t2[e2 + 2] = this._z, t2[e2 + 3] = this._w, t2;
    }
    fromBufferAttribute(t2, e2) {
      return this._x = t2.getX(e2), this._y = t2.getY(e2), this._z = t2.getZ(e2), this._w = t2.getW(e2), this._onChangeCallback(), this;
    }
    toJSON() {
      return this.toArray();
    }
    _onChange(t2) {
      return this._onChangeCallback = t2, this;
    }
    _onChangeCallback() {
    }
    *[Symbol.iterator]() {
      yield this._x, yield this._y, yield this._z, yield this._w;
    }
  };
  var Ci = class _Ci {
    constructor(t2 = 0, e2 = 0, n = 0) {
      _Ci.prototype.isVector3 = true, this.x = t2, this.y = e2, this.z = n;
    }
    set(t2, e2, n) {
      return void 0 === n && (n = this.z), this.x = t2, this.y = e2, this.z = n, this;
    }
    setScalar(t2) {
      return this.x = t2, this.y = t2, this.z = t2, this;
    }
    setX(t2) {
      return this.x = t2, this;
    }
    setY(t2) {
      return this.y = t2, this;
    }
    setZ(t2) {
      return this.z = t2, this;
    }
    setComponent(t2, e2) {
      switch (t2) {
        case 0:
          this.x = e2;
          break;
        case 1:
          this.y = e2;
          break;
        case 2:
          this.z = e2;
          break;
        default:
          throw new Error("index is out of range: " + t2);
      }
      return this;
    }
    getComponent(t2) {
      switch (t2) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        case 2:
          return this.z;
        default:
          throw new Error("index is out of range: " + t2);
      }
    }
    clone() {
      return new this.constructor(this.x, this.y, this.z);
    }
    copy(t2) {
      return this.x = t2.x, this.y = t2.y, this.z = t2.z, this;
    }
    add(t2) {
      return this.x += t2.x, this.y += t2.y, this.z += t2.z, this;
    }
    addScalar(t2) {
      return this.x += t2, this.y += t2, this.z += t2, this;
    }
    addVectors(t2, e2) {
      return this.x = t2.x + e2.x, this.y = t2.y + e2.y, this.z = t2.z + e2.z, this;
    }
    addScaledVector(t2, e2) {
      return this.x += t2.x * e2, this.y += t2.y * e2, this.z += t2.z * e2, this;
    }
    sub(t2) {
      return this.x -= t2.x, this.y -= t2.y, this.z -= t2.z, this;
    }
    subScalar(t2) {
      return this.x -= t2, this.y -= t2, this.z -= t2, this;
    }
    subVectors(t2, e2) {
      return this.x = t2.x - e2.x, this.y = t2.y - e2.y, this.z = t2.z - e2.z, this;
    }
    multiply(t2) {
      return this.x *= t2.x, this.y *= t2.y, this.z *= t2.z, this;
    }
    multiplyScalar(t2) {
      return this.x *= t2, this.y *= t2, this.z *= t2, this;
    }
    multiplyVectors(t2, e2) {
      return this.x = t2.x * e2.x, this.y = t2.y * e2.y, this.z = t2.z * e2.z, this;
    }
    applyEuler(t2) {
      return this.applyQuaternion(Pi.setFromEuler(t2));
    }
    applyAxisAngle(t2, e2) {
      return this.applyQuaternion(Pi.setFromAxisAngle(t2, e2));
    }
    applyMatrix3(t2) {
      const e2 = this.x, n = this.y, i = this.z, r = t2.elements;
      return this.x = r[0] * e2 + r[3] * n + r[6] * i, this.y = r[1] * e2 + r[4] * n + r[7] * i, this.z = r[2] * e2 + r[5] * n + r[8] * i, this;
    }
    applyNormalMatrix(t2) {
      return this.applyMatrix3(t2).normalize();
    }
    applyMatrix4(t2) {
      const e2 = this.x, n = this.y, i = this.z, r = t2.elements, s = 1 / (r[3] * e2 + r[7] * n + r[11] * i + r[15]);
      return this.x = (r[0] * e2 + r[4] * n + r[8] * i + r[12]) * s, this.y = (r[1] * e2 + r[5] * n + r[9] * i + r[13]) * s, this.z = (r[2] * e2 + r[6] * n + r[10] * i + r[14]) * s, this;
    }
    applyQuaternion(t2) {
      const e2 = this.x, n = this.y, i = this.z, r = t2.x, s = t2.y, a = t2.z, o = t2.w, l = 2 * (s * i - a * n), c = 2 * (a * e2 - r * i), h = 2 * (r * n - s * e2);
      return this.x = e2 + o * l + s * h - a * c, this.y = n + o * c + a * l - r * h, this.z = i + o * h + r * c - s * l, this;
    }
    project(t2) {
      return this.applyMatrix4(t2.matrixWorldInverse).applyMatrix4(t2.projectionMatrix);
    }
    unproject(t2) {
      return this.applyMatrix4(t2.projectionMatrixInverse).applyMatrix4(t2.matrixWorld);
    }
    transformDirection(t2) {
      const e2 = this.x, n = this.y, i = this.z, r = t2.elements;
      return this.x = r[0] * e2 + r[4] * n + r[8] * i, this.y = r[1] * e2 + r[5] * n + r[9] * i, this.z = r[2] * e2 + r[6] * n + r[10] * i, this.normalize();
    }
    divide(t2) {
      return this.x /= t2.x, this.y /= t2.y, this.z /= t2.z, this;
    }
    divideScalar(t2) {
      return this.multiplyScalar(1 / t2);
    }
    min(t2) {
      return this.x = Math.min(this.x, t2.x), this.y = Math.min(this.y, t2.y), this.z = Math.min(this.z, t2.z), this;
    }
    max(t2) {
      return this.x = Math.max(this.x, t2.x), this.y = Math.max(this.y, t2.y), this.z = Math.max(this.z, t2.z), this;
    }
    clamp(t2, e2) {
      return this.x = Math.max(t2.x, Math.min(e2.x, this.x)), this.y = Math.max(t2.y, Math.min(e2.y, this.y)), this.z = Math.max(t2.z, Math.min(e2.z, this.z)), this;
    }
    clampScalar(t2, e2) {
      return this.x = Math.max(t2, Math.min(e2, this.x)), this.y = Math.max(t2, Math.min(e2, this.y)), this.z = Math.max(t2, Math.min(e2, this.z)), this;
    }
    clampLength(t2, e2) {
      const n = this.length();
      return this.divideScalar(n || 1).multiplyScalar(Math.max(t2, Math.min(e2, n)));
    }
    floor() {
      return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
    }
    ceil() {
      return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
    }
    round() {
      return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
    }
    roundToZero() {
      return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
    }
    negate() {
      return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
    }
    dot(t2) {
      return this.x * t2.x + this.y * t2.y + this.z * t2.z;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
    }
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    setLength(t2) {
      return this.normalize().multiplyScalar(t2);
    }
    lerp(t2, e2) {
      return this.x += (t2.x - this.x) * e2, this.y += (t2.y - this.y) * e2, this.z += (t2.z - this.z) * e2, this;
    }
    lerpVectors(t2, e2, n) {
      return this.x = t2.x + (e2.x - t2.x) * n, this.y = t2.y + (e2.y - t2.y) * n, this.z = t2.z + (e2.z - t2.z) * n, this;
    }
    cross(t2) {
      return this.crossVectors(this, t2);
    }
    crossVectors(t2, e2) {
      const n = t2.x, i = t2.y, r = t2.z, s = e2.x, a = e2.y, o = e2.z;
      return this.x = i * o - r * a, this.y = r * s - n * o, this.z = n * a - i * s, this;
    }
    projectOnVector(t2) {
      const e2 = t2.lengthSq();
      if (0 === e2) return this.set(0, 0, 0);
      const n = t2.dot(this) / e2;
      return this.copy(t2).multiplyScalar(n);
    }
    projectOnPlane(t2) {
      return Ii.copy(this).projectOnVector(t2), this.sub(Ii);
    }
    reflect(t2) {
      return this.sub(Ii.copy(t2).multiplyScalar(2 * this.dot(t2)));
    }
    angleTo(t2) {
      const e2 = Math.sqrt(this.lengthSq() * t2.lengthSq());
      if (0 === e2) return Math.PI / 2;
      const n = this.dot(t2) / e2;
      return Math.acos(Wn(n, -1, 1));
    }
    distanceTo(t2) {
      return Math.sqrt(this.distanceToSquared(t2));
    }
    distanceToSquared(t2) {
      const e2 = this.x - t2.x, n = this.y - t2.y, i = this.z - t2.z;
      return e2 * e2 + n * n + i * i;
    }
    manhattanDistanceTo(t2) {
      return Math.abs(this.x - t2.x) + Math.abs(this.y - t2.y) + Math.abs(this.z - t2.z);
    }
    setFromSpherical(t2) {
      return this.setFromSphericalCoords(t2.radius, t2.phi, t2.theta);
    }
    setFromSphericalCoords(t2, e2, n) {
      const i = Math.sin(e2) * t2;
      return this.x = i * Math.sin(n), this.y = Math.cos(e2) * t2, this.z = i * Math.cos(n), this;
    }
    setFromCylindrical(t2) {
      return this.setFromCylindricalCoords(t2.radius, t2.theta, t2.y);
    }
    setFromCylindricalCoords(t2, e2, n) {
      return this.x = t2 * Math.sin(e2), this.y = n, this.z = t2 * Math.cos(e2), this;
    }
    setFromMatrixPosition(t2) {
      const e2 = t2.elements;
      return this.x = e2[12], this.y = e2[13], this.z = e2[14], this;
    }
    setFromMatrixScale(t2) {
      const e2 = this.setFromMatrixColumn(t2, 0).length(), n = this.setFromMatrixColumn(t2, 1).length(), i = this.setFromMatrixColumn(t2, 2).length();
      return this.x = e2, this.y = n, this.z = i, this;
    }
    setFromMatrixColumn(t2, e2) {
      return this.fromArray(t2.elements, 4 * e2);
    }
    setFromMatrix3Column(t2, e2) {
      return this.fromArray(t2.elements, 3 * e2);
    }
    setFromEuler(t2) {
      return this.x = t2._x, this.y = t2._y, this.z = t2._z, this;
    }
    setFromColor(t2) {
      return this.x = t2.r, this.y = t2.g, this.z = t2.b, this;
    }
    equals(t2) {
      return t2.x === this.x && t2.y === this.y && t2.z === this.z;
    }
    fromArray(t2, e2 = 0) {
      return this.x = t2[e2], this.y = t2[e2 + 1], this.z = t2[e2 + 2], this;
    }
    toArray(t2 = [], e2 = 0) {
      return t2[e2] = this.x, t2[e2 + 1] = this.y, t2[e2 + 2] = this.z, t2;
    }
    fromBufferAttribute(t2, e2) {
      return this.x = t2.getX(e2), this.y = t2.getY(e2), this.z = t2.getZ(e2), this;
    }
    random() {
      return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
    }
    randomDirection() {
      const t2 = Math.random() * Math.PI * 2, e2 = 2 * Math.random() - 1, n = Math.sqrt(1 - e2 * e2);
      return this.x = n * Math.cos(t2), this.y = e2, this.z = n * Math.sin(t2), this;
    }
    *[Symbol.iterator]() {
      yield this.x, yield this.y, yield this.z;
    }
  };
  var Ii = new Ci();
  var Pi = new Ri();
  var Li = class {
    constructor(t2 = new Ci(1 / 0, 1 / 0, 1 / 0), e2 = new Ci(-1 / 0, -1 / 0, -1 / 0)) {
      this.isBox3 = true, this.min = t2, this.max = e2;
    }
    set(t2, e2) {
      return this.min.copy(t2), this.max.copy(e2), this;
    }
    setFromArray(t2) {
      this.makeEmpty();
      for (let e2 = 0, n = t2.length; e2 < n; e2 += 3) this.expandByPoint(Di.fromArray(t2, e2));
      return this;
    }
    setFromBufferAttribute(t2) {
      this.makeEmpty();
      for (let e2 = 0, n = t2.count; e2 < n; e2++) this.expandByPoint(Di.fromBufferAttribute(t2, e2));
      return this;
    }
    setFromPoints(t2) {
      this.makeEmpty();
      for (let e2 = 0, n = t2.length; e2 < n; e2++) this.expandByPoint(t2[e2]);
      return this;
    }
    setFromCenterAndSize(t2, e2) {
      const n = Di.copy(e2).multiplyScalar(0.5);
      return this.min.copy(t2).sub(n), this.max.copy(t2).add(n), this;
    }
    setFromObject(t2, e2 = false) {
      return this.makeEmpty(), this.expandByObject(t2, e2);
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      return this.min.copy(t2.min), this.max.copy(t2.max), this;
    }
    makeEmpty() {
      return this.min.x = this.min.y = this.min.z = 1 / 0, this.max.x = this.max.y = this.max.z = -1 / 0, this;
    }
    isEmpty() {
      return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }
    getCenter(t2) {
      return this.isEmpty() ? t2.set(0, 0, 0) : t2.addVectors(this.min, this.max).multiplyScalar(0.5);
    }
    getSize(t2) {
      return this.isEmpty() ? t2.set(0, 0, 0) : t2.subVectors(this.max, this.min);
    }
    expandByPoint(t2) {
      return this.min.min(t2), this.max.max(t2), this;
    }
    expandByVector(t2) {
      return this.min.sub(t2), this.max.add(t2), this;
    }
    expandByScalar(t2) {
      return this.min.addScalar(-t2), this.max.addScalar(t2), this;
    }
    expandByObject(t2, e2 = false) {
      t2.updateWorldMatrix(false, false);
      const n = t2.geometry;
      if (void 0 !== n) {
        const i2 = n.getAttribute("position");
        if (true === e2 && void 0 !== i2 && true !== t2.isInstancedMesh) for (let e3 = 0, n2 = i2.count; e3 < n2; e3++) true === t2.isMesh ? t2.getVertexPosition(e3, Di) : Di.fromBufferAttribute(i2, e3), Di.applyMatrix4(t2.matrixWorld), this.expandByPoint(Di);
        else void 0 !== t2.boundingBox ? (null === t2.boundingBox && t2.computeBoundingBox(), Ni.copy(t2.boundingBox)) : (null === n.boundingBox && n.computeBoundingBox(), Ni.copy(n.boundingBox)), Ni.applyMatrix4(t2.matrixWorld), this.union(Ni);
      }
      const i = t2.children;
      for (let t3 = 0, n2 = i.length; t3 < n2; t3++) this.expandByObject(i[t3], e2);
      return this;
    }
    containsPoint(t2) {
      return t2.x >= this.min.x && t2.x <= this.max.x && t2.y >= this.min.y && t2.y <= this.max.y && t2.z >= this.min.z && t2.z <= this.max.z;
    }
    containsBox(t2) {
      return this.min.x <= t2.min.x && t2.max.x <= this.max.x && this.min.y <= t2.min.y && t2.max.y <= this.max.y && this.min.z <= t2.min.z && t2.max.z <= this.max.z;
    }
    getParameter(t2, e2) {
      return e2.set((t2.x - this.min.x) / (this.max.x - this.min.x), (t2.y - this.min.y) / (this.max.y - this.min.y), (t2.z - this.min.z) / (this.max.z - this.min.z));
    }
    intersectsBox(t2) {
      return t2.max.x >= this.min.x && t2.min.x <= this.max.x && t2.max.y >= this.min.y && t2.min.y <= this.max.y && t2.max.z >= this.min.z && t2.min.z <= this.max.z;
    }
    intersectsSphere(t2) {
      return this.clampPoint(t2.center, Di), Di.distanceToSquared(t2.center) <= t2.radius * t2.radius;
    }
    intersectsPlane(t2) {
      let e2, n;
      return t2.normal.x > 0 ? (e2 = t2.normal.x * this.min.x, n = t2.normal.x * this.max.x) : (e2 = t2.normal.x * this.max.x, n = t2.normal.x * this.min.x), t2.normal.y > 0 ? (e2 += t2.normal.y * this.min.y, n += t2.normal.y * this.max.y) : (e2 += t2.normal.y * this.max.y, n += t2.normal.y * this.min.y), t2.normal.z > 0 ? (e2 += t2.normal.z * this.min.z, n += t2.normal.z * this.max.z) : (e2 += t2.normal.z * this.max.z, n += t2.normal.z * this.min.z), e2 <= -t2.constant && n >= -t2.constant;
    }
    intersectsTriangle(t2) {
      if (this.isEmpty()) return false;
      this.getCenter(Hi), Gi.subVectors(this.max, Hi), Oi.subVectors(t2.a, Hi), Fi.subVectors(t2.b, Hi), Bi.subVectors(t2.c, Hi), zi.subVectors(Fi, Oi), ki.subVectors(Bi, Fi), Vi.subVectors(Oi, Bi);
      let e2 = [0, -zi.z, zi.y, 0, -ki.z, ki.y, 0, -Vi.z, Vi.y, zi.z, 0, -zi.x, ki.z, 0, -ki.x, Vi.z, 0, -Vi.x, -zi.y, zi.x, 0, -ki.y, ki.x, 0, -Vi.y, Vi.x, 0];
      return !!ji(e2, Oi, Fi, Bi, Gi) && (e2 = [1, 0, 0, 0, 1, 0, 0, 0, 1], !!ji(e2, Oi, Fi, Bi, Gi) && (Wi.crossVectors(zi, ki), e2 = [Wi.x, Wi.y, Wi.z], ji(e2, Oi, Fi, Bi, Gi)));
    }
    clampPoint(t2, e2) {
      return e2.copy(t2).clamp(this.min, this.max);
    }
    distanceToPoint(t2) {
      return this.clampPoint(t2, Di).distanceTo(t2);
    }
    getBoundingSphere(t2) {
      return this.isEmpty() ? t2.makeEmpty() : (this.getCenter(t2.center), t2.radius = 0.5 * this.getSize(Di).length()), t2;
    }
    intersect(t2) {
      return this.min.max(t2.min), this.max.min(t2.max), this.isEmpty() && this.makeEmpty(), this;
    }
    union(t2) {
      return this.min.min(t2.min), this.max.max(t2.max), this;
    }
    applyMatrix4(t2) {
      return this.isEmpty() || (Ui[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(t2), Ui[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(t2), Ui[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(t2), Ui[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(t2), Ui[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(t2), Ui[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(t2), Ui[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(t2), Ui[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(t2), this.setFromPoints(Ui)), this;
    }
    translate(t2) {
      return this.min.add(t2), this.max.add(t2), this;
    }
    equals(t2) {
      return t2.min.equals(this.min) && t2.max.equals(this.max);
    }
  };
  var Ui = [new Ci(), new Ci(), new Ci(), new Ci(), new Ci(), new Ci(), new Ci(), new Ci()];
  var Di = new Ci();
  var Ni = new Li();
  var Oi = new Ci();
  var Fi = new Ci();
  var Bi = new Ci();
  var zi = new Ci();
  var ki = new Ci();
  var Vi = new Ci();
  var Hi = new Ci();
  var Gi = new Ci();
  var Wi = new Ci();
  var Xi = new Ci();
  function ji(t2, e2, n, i, r) {
    for (let s = 0, a = t2.length - 3; s <= a; s += 3) {
      Xi.fromArray(t2, s);
      const a2 = r.x * Math.abs(Xi.x) + r.y * Math.abs(Xi.y) + r.z * Math.abs(Xi.z), o = e2.dot(Xi), l = n.dot(Xi), c = i.dot(Xi);
      if (Math.max(-Math.max(o, l, c), Math.min(o, l, c)) > a2) return false;
    }
    return true;
  }
  var qi = new Li();
  var Yi = new Ci();
  var Zi = new Ci();
  var Ji = class {
    constructor(t2 = new Ci(), e2 = -1) {
      this.isSphere = true, this.center = t2, this.radius = e2;
    }
    set(t2, e2) {
      return this.center.copy(t2), this.radius = e2, this;
    }
    setFromPoints(t2, e2) {
      const n = this.center;
      void 0 !== e2 ? n.copy(e2) : qi.setFromPoints(t2).getCenter(n);
      let i = 0;
      for (let e3 = 0, r = t2.length; e3 < r; e3++) i = Math.max(i, n.distanceToSquared(t2[e3]));
      return this.radius = Math.sqrt(i), this;
    }
    copy(t2) {
      return this.center.copy(t2.center), this.radius = t2.radius, this;
    }
    isEmpty() {
      return this.radius < 0;
    }
    makeEmpty() {
      return this.center.set(0, 0, 0), this.radius = -1, this;
    }
    containsPoint(t2) {
      return t2.distanceToSquared(this.center) <= this.radius * this.radius;
    }
    distanceToPoint(t2) {
      return t2.distanceTo(this.center) - this.radius;
    }
    intersectsSphere(t2) {
      const e2 = this.radius + t2.radius;
      return t2.center.distanceToSquared(this.center) <= e2 * e2;
    }
    intersectsBox(t2) {
      return t2.intersectsSphere(this);
    }
    intersectsPlane(t2) {
      return Math.abs(t2.distanceToPoint(this.center)) <= this.radius;
    }
    clampPoint(t2, e2) {
      const n = this.center.distanceToSquared(t2);
      return e2.copy(t2), n > this.radius * this.radius && (e2.sub(this.center).normalize(), e2.multiplyScalar(this.radius).add(this.center)), e2;
    }
    getBoundingBox(t2) {
      return this.isEmpty() ? (t2.makeEmpty(), t2) : (t2.set(this.center, this.center), t2.expandByScalar(this.radius), t2);
    }
    applyMatrix4(t2) {
      return this.center.applyMatrix4(t2), this.radius = this.radius * t2.getMaxScaleOnAxis(), this;
    }
    translate(t2) {
      return this.center.add(t2), this;
    }
    expandByPoint(t2) {
      if (this.isEmpty()) return this.center.copy(t2), this.radius = 0, this;
      Yi.subVectors(t2, this.center);
      const e2 = Yi.lengthSq();
      if (e2 > this.radius * this.radius) {
        const t3 = Math.sqrt(e2), n = 0.5 * (t3 - this.radius);
        this.center.addScaledVector(Yi, n / t3), this.radius += n;
      }
      return this;
    }
    union(t2) {
      return t2.isEmpty() ? this : this.isEmpty() ? (this.copy(t2), this) : (true === this.center.equals(t2.center) ? this.radius = Math.max(this.radius, t2.radius) : (Zi.subVectors(t2.center, this.center).setLength(t2.radius), this.expandByPoint(Yi.copy(t2.center).add(Zi)), this.expandByPoint(Yi.copy(t2.center).sub(Zi))), this);
    }
    equals(t2) {
      return t2.center.equals(this.center) && t2.radius === this.radius;
    }
    clone() {
      return new this.constructor().copy(this);
    }
  };
  var Ki = new Ci();
  var $i = new Ci();
  var Qi = new Ci();
  var tr = new Ci();
  var er = new Ci();
  var nr = new Ci();
  var ir = new Ci();
  var rr = class {
    constructor(t2 = new Ci(), e2 = new Ci(0, 0, -1)) {
      this.origin = t2, this.direction = e2;
    }
    set(t2, e2) {
      return this.origin.copy(t2), this.direction.copy(e2), this;
    }
    copy(t2) {
      return this.origin.copy(t2.origin), this.direction.copy(t2.direction), this;
    }
    at(t2, e2) {
      return e2.copy(this.origin).addScaledVector(this.direction, t2);
    }
    lookAt(t2) {
      return this.direction.copy(t2).sub(this.origin).normalize(), this;
    }
    recast(t2) {
      return this.origin.copy(this.at(t2, Ki)), this;
    }
    closestPointToPoint(t2, e2) {
      e2.subVectors(t2, this.origin);
      const n = e2.dot(this.direction);
      return n < 0 ? e2.copy(this.origin) : e2.copy(this.origin).addScaledVector(this.direction, n);
    }
    distanceToPoint(t2) {
      return Math.sqrt(this.distanceSqToPoint(t2));
    }
    distanceSqToPoint(t2) {
      const e2 = Ki.subVectors(t2, this.origin).dot(this.direction);
      return e2 < 0 ? this.origin.distanceToSquared(t2) : (Ki.copy(this.origin).addScaledVector(this.direction, e2), Ki.distanceToSquared(t2));
    }
    distanceSqToSegment(t2, e2, n, i) {
      $i.copy(t2).add(e2).multiplyScalar(0.5), Qi.copy(e2).sub(t2).normalize(), tr.copy(this.origin).sub($i);
      const r = 0.5 * t2.distanceTo(e2), s = -this.direction.dot(Qi), a = tr.dot(this.direction), o = -tr.dot(Qi), l = tr.lengthSq(), c = Math.abs(1 - s * s);
      let h, u2, d2, p2;
      if (c > 0) if (h = s * o - a, u2 = s * a - o, p2 = r * c, h >= 0) if (u2 >= -p2) if (u2 <= p2) {
        const t3 = 1 / c;
        h *= t3, u2 *= t3, d2 = h * (h + s * u2 + 2 * a) + u2 * (s * h + u2 + 2 * o) + l;
      } else u2 = r, h = Math.max(0, -(s * u2 + a)), d2 = -h * h + u2 * (u2 + 2 * o) + l;
      else u2 = -r, h = Math.max(0, -(s * u2 + a)), d2 = -h * h + u2 * (u2 + 2 * o) + l;
      else u2 <= -p2 ? (h = Math.max(0, -(-s * r + a)), u2 = h > 0 ? -r : Math.min(Math.max(-r, -o), r), d2 = -h * h + u2 * (u2 + 2 * o) + l) : u2 <= p2 ? (h = 0, u2 = Math.min(Math.max(-r, -o), r), d2 = u2 * (u2 + 2 * o) + l) : (h = Math.max(0, -(s * r + a)), u2 = h > 0 ? r : Math.min(Math.max(-r, -o), r), d2 = -h * h + u2 * (u2 + 2 * o) + l);
      else u2 = s > 0 ? -r : r, h = Math.max(0, -(s * u2 + a)), d2 = -h * h + u2 * (u2 + 2 * o) + l;
      return n && n.copy(this.origin).addScaledVector(this.direction, h), i && i.copy($i).addScaledVector(Qi, u2), d2;
    }
    intersectSphere(t2, e2) {
      Ki.subVectors(t2.center, this.origin);
      const n = Ki.dot(this.direction), i = Ki.dot(Ki) - n * n, r = t2.radius * t2.radius;
      if (i > r) return null;
      const s = Math.sqrt(r - i), a = n - s, o = n + s;
      return o < 0 ? null : a < 0 ? this.at(o, e2) : this.at(a, e2);
    }
    intersectsSphere(t2) {
      return this.distanceSqToPoint(t2.center) <= t2.radius * t2.radius;
    }
    distanceToPlane(t2) {
      const e2 = t2.normal.dot(this.direction);
      if (0 === e2) return 0 === t2.distanceToPoint(this.origin) ? 0 : null;
      const n = -(this.origin.dot(t2.normal) + t2.constant) / e2;
      return n >= 0 ? n : null;
    }
    intersectPlane(t2, e2) {
      const n = this.distanceToPlane(t2);
      return null === n ? null : this.at(n, e2);
    }
    intersectsPlane(t2) {
      const e2 = t2.distanceToPoint(this.origin);
      if (0 === e2) return true;
      return t2.normal.dot(this.direction) * e2 < 0;
    }
    intersectBox(t2, e2) {
      let n, i, r, s, a, o;
      const l = 1 / this.direction.x, c = 1 / this.direction.y, h = 1 / this.direction.z, u2 = this.origin;
      return l >= 0 ? (n = (t2.min.x - u2.x) * l, i = (t2.max.x - u2.x) * l) : (n = (t2.max.x - u2.x) * l, i = (t2.min.x - u2.x) * l), c >= 0 ? (r = (t2.min.y - u2.y) * c, s = (t2.max.y - u2.y) * c) : (r = (t2.max.y - u2.y) * c, s = (t2.min.y - u2.y) * c), n > s || r > i ? null : ((r > n || isNaN(n)) && (n = r), (s < i || isNaN(i)) && (i = s), h >= 0 ? (a = (t2.min.z - u2.z) * h, o = (t2.max.z - u2.z) * h) : (a = (t2.max.z - u2.z) * h, o = (t2.min.z - u2.z) * h), n > o || a > i ? null : ((a > n || n != n) && (n = a), (o < i || i != i) && (i = o), i < 0 ? null : this.at(n >= 0 ? n : i, e2)));
    }
    intersectsBox(t2) {
      return null !== this.intersectBox(t2, Ki);
    }
    intersectTriangle(t2, e2, n, i, r) {
      er.subVectors(e2, t2), nr.subVectors(n, t2), ir.crossVectors(er, nr);
      let s, a = this.direction.dot(ir);
      if (a > 0) {
        if (i) return null;
        s = 1;
      } else {
        if (!(a < 0)) return null;
        s = -1, a = -a;
      }
      tr.subVectors(this.origin, t2);
      const o = s * this.direction.dot(nr.crossVectors(tr, nr));
      if (o < 0) return null;
      const l = s * this.direction.dot(er.cross(tr));
      if (l < 0) return null;
      if (o + l > a) return null;
      const c = -s * tr.dot(ir);
      return c < 0 ? null : this.at(c / a, r);
    }
    applyMatrix4(t2) {
      return this.origin.applyMatrix4(t2), this.direction.transformDirection(t2), this;
    }
    equals(t2) {
      return t2.origin.equals(this.origin) && t2.direction.equals(this.direction);
    }
    clone() {
      return new this.constructor().copy(this);
    }
  };
  var sr = class _sr {
    constructor(t2, e2, n, i, r, s, a, o, l, c, h, u2, d2, p2, m, f) {
      _sr.prototype.isMatrix4 = true, this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], void 0 !== t2 && this.set(t2, e2, n, i, r, s, a, o, l, c, h, u2, d2, p2, m, f);
    }
    set(t2, e2, n, i, r, s, a, o, l, c, h, u2, d2, p2, m, f) {
      const g = this.elements;
      return g[0] = t2, g[4] = e2, g[8] = n, g[12] = i, g[1] = r, g[5] = s, g[9] = a, g[13] = o, g[2] = l, g[6] = c, g[10] = h, g[14] = u2, g[3] = d2, g[7] = p2, g[11] = m, g[15] = f, this;
    }
    identity() {
      return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
    }
    clone() {
      return new _sr().fromArray(this.elements);
    }
    copy(t2) {
      const e2 = this.elements, n = t2.elements;
      return e2[0] = n[0], e2[1] = n[1], e2[2] = n[2], e2[3] = n[3], e2[4] = n[4], e2[5] = n[5], e2[6] = n[6], e2[7] = n[7], e2[8] = n[8], e2[9] = n[9], e2[10] = n[10], e2[11] = n[11], e2[12] = n[12], e2[13] = n[13], e2[14] = n[14], e2[15] = n[15], this;
    }
    copyPosition(t2) {
      const e2 = this.elements, n = t2.elements;
      return e2[12] = n[12], e2[13] = n[13], e2[14] = n[14], this;
    }
    setFromMatrix3(t2) {
      const e2 = t2.elements;
      return this.set(e2[0], e2[3], e2[6], 0, e2[1], e2[4], e2[7], 0, e2[2], e2[5], e2[8], 0, 0, 0, 0, 1), this;
    }
    extractBasis(t2, e2, n) {
      return t2.setFromMatrixColumn(this, 0), e2.setFromMatrixColumn(this, 1), n.setFromMatrixColumn(this, 2), this;
    }
    makeBasis(t2, e2, n) {
      return this.set(t2.x, e2.x, n.x, 0, t2.y, e2.y, n.y, 0, t2.z, e2.z, n.z, 0, 0, 0, 0, 1), this;
    }
    extractRotation(t2) {
      const e2 = this.elements, n = t2.elements, i = 1 / ar.setFromMatrixColumn(t2, 0).length(), r = 1 / ar.setFromMatrixColumn(t2, 1).length(), s = 1 / ar.setFromMatrixColumn(t2, 2).length();
      return e2[0] = n[0] * i, e2[1] = n[1] * i, e2[2] = n[2] * i, e2[3] = 0, e2[4] = n[4] * r, e2[5] = n[5] * r, e2[6] = n[6] * r, e2[7] = 0, e2[8] = n[8] * s, e2[9] = n[9] * s, e2[10] = n[10] * s, e2[11] = 0, e2[12] = 0, e2[13] = 0, e2[14] = 0, e2[15] = 1, this;
    }
    makeRotationFromEuler(t2) {
      const e2 = this.elements, n = t2.x, i = t2.y, r = t2.z, s = Math.cos(n), a = Math.sin(n), o = Math.cos(i), l = Math.sin(i), c = Math.cos(r), h = Math.sin(r);
      if ("XYZ" === t2.order) {
        const t3 = s * c, n2 = s * h, i2 = a * c, r2 = a * h;
        e2[0] = o * c, e2[4] = -o * h, e2[8] = l, e2[1] = n2 + i2 * l, e2[5] = t3 - r2 * l, e2[9] = -a * o, e2[2] = r2 - t3 * l, e2[6] = i2 + n2 * l, e2[10] = s * o;
      } else if ("YXZ" === t2.order) {
        const t3 = o * c, n2 = o * h, i2 = l * c, r2 = l * h;
        e2[0] = t3 + r2 * a, e2[4] = i2 * a - n2, e2[8] = s * l, e2[1] = s * h, e2[5] = s * c, e2[9] = -a, e2[2] = n2 * a - i2, e2[6] = r2 + t3 * a, e2[10] = s * o;
      } else if ("ZXY" === t2.order) {
        const t3 = o * c, n2 = o * h, i2 = l * c, r2 = l * h;
        e2[0] = t3 - r2 * a, e2[4] = -s * h, e2[8] = i2 + n2 * a, e2[1] = n2 + i2 * a, e2[5] = s * c, e2[9] = r2 - t3 * a, e2[2] = -s * l, e2[6] = a, e2[10] = s * o;
      } else if ("ZYX" === t2.order) {
        const t3 = s * c, n2 = s * h, i2 = a * c, r2 = a * h;
        e2[0] = o * c, e2[4] = i2 * l - n2, e2[8] = t3 * l + r2, e2[1] = o * h, e2[5] = r2 * l + t3, e2[9] = n2 * l - i2, e2[2] = -l, e2[6] = a * o, e2[10] = s * o;
      } else if ("YZX" === t2.order) {
        const t3 = s * o, n2 = s * l, i2 = a * o, r2 = a * l;
        e2[0] = o * c, e2[4] = r2 - t3 * h, e2[8] = i2 * h + n2, e2[1] = h, e2[5] = s * c, e2[9] = -a * c, e2[2] = -l * c, e2[6] = n2 * h + i2, e2[10] = t3 - r2 * h;
      } else if ("XZY" === t2.order) {
        const t3 = s * o, n2 = s * l, i2 = a * o, r2 = a * l;
        e2[0] = o * c, e2[4] = -h, e2[8] = l * c, e2[1] = t3 * h + r2, e2[5] = s * c, e2[9] = n2 * h - i2, e2[2] = i2 * h - n2, e2[6] = a * c, e2[10] = r2 * h + t3;
      }
      return e2[3] = 0, e2[7] = 0, e2[11] = 0, e2[12] = 0, e2[13] = 0, e2[14] = 0, e2[15] = 1, this;
    }
    makeRotationFromQuaternion(t2) {
      return this.compose(lr, t2, cr);
    }
    lookAt(t2, e2, n) {
      const i = this.elements;
      return dr.subVectors(t2, e2), 0 === dr.lengthSq() && (dr.z = 1), dr.normalize(), hr.crossVectors(n, dr), 0 === hr.lengthSq() && (1 === Math.abs(n.z) ? dr.x += 1e-4 : dr.z += 1e-4, dr.normalize(), hr.crossVectors(n, dr)), hr.normalize(), ur.crossVectors(dr, hr), i[0] = hr.x, i[4] = ur.x, i[8] = dr.x, i[1] = hr.y, i[5] = ur.y, i[9] = dr.y, i[2] = hr.z, i[6] = ur.z, i[10] = dr.z, this;
    }
    multiply(t2) {
      return this.multiplyMatrices(this, t2);
    }
    premultiply(t2) {
      return this.multiplyMatrices(t2, this);
    }
    multiplyMatrices(t2, e2) {
      const n = t2.elements, i = e2.elements, r = this.elements, s = n[0], a = n[4], o = n[8], l = n[12], c = n[1], h = n[5], u2 = n[9], d2 = n[13], p2 = n[2], m = n[6], f = n[10], g = n[14], v = n[3], _ = n[7], x = n[11], y2 = n[15], M2 = i[0], S2 = i[4], b = i[8], T = i[12], w2 = i[1], E2 = i[5], A2 = i[9], R2 = i[13], C2 = i[2], I2 = i[6], P2 = i[10], L2 = i[14], U2 = i[3], D2 = i[7], N2 = i[11], O2 = i[15];
      return r[0] = s * M2 + a * w2 + o * C2 + l * U2, r[4] = s * S2 + a * E2 + o * I2 + l * D2, r[8] = s * b + a * A2 + o * P2 + l * N2, r[12] = s * T + a * R2 + o * L2 + l * O2, r[1] = c * M2 + h * w2 + u2 * C2 + d2 * U2, r[5] = c * S2 + h * E2 + u2 * I2 + d2 * D2, r[9] = c * b + h * A2 + u2 * P2 + d2 * N2, r[13] = c * T + h * R2 + u2 * L2 + d2 * O2, r[2] = p2 * M2 + m * w2 + f * C2 + g * U2, r[6] = p2 * S2 + m * E2 + f * I2 + g * D2, r[10] = p2 * b + m * A2 + f * P2 + g * N2, r[14] = p2 * T + m * R2 + f * L2 + g * O2, r[3] = v * M2 + _ * w2 + x * C2 + y2 * U2, r[7] = v * S2 + _ * E2 + x * I2 + y2 * D2, r[11] = v * b + _ * A2 + x * P2 + y2 * N2, r[15] = v * T + _ * R2 + x * L2 + y2 * O2, this;
    }
    multiplyScalar(t2) {
      const e2 = this.elements;
      return e2[0] *= t2, e2[4] *= t2, e2[8] *= t2, e2[12] *= t2, e2[1] *= t2, e2[5] *= t2, e2[9] *= t2, e2[13] *= t2, e2[2] *= t2, e2[6] *= t2, e2[10] *= t2, e2[14] *= t2, e2[3] *= t2, e2[7] *= t2, e2[11] *= t2, e2[15] *= t2, this;
    }
    determinant() {
      const t2 = this.elements, e2 = t2[0], n = t2[4], i = t2[8], r = t2[12], s = t2[1], a = t2[5], o = t2[9], l = t2[13], c = t2[2], h = t2[6], u2 = t2[10], d2 = t2[14];
      return t2[3] * (+r * o * h - i * l * h - r * a * u2 + n * l * u2 + i * a * d2 - n * o * d2) + t2[7] * (+e2 * o * d2 - e2 * l * u2 + r * s * u2 - i * s * d2 + i * l * c - r * o * c) + t2[11] * (+e2 * l * h - e2 * a * d2 - r * s * h + n * s * d2 + r * a * c - n * l * c) + t2[15] * (-i * a * c - e2 * o * h + e2 * a * u2 + i * s * h - n * s * u2 + n * o * c);
    }
    transpose() {
      const t2 = this.elements;
      let e2;
      return e2 = t2[1], t2[1] = t2[4], t2[4] = e2, e2 = t2[2], t2[2] = t2[8], t2[8] = e2, e2 = t2[6], t2[6] = t2[9], t2[9] = e2, e2 = t2[3], t2[3] = t2[12], t2[12] = e2, e2 = t2[7], t2[7] = t2[13], t2[13] = e2, e2 = t2[11], t2[11] = t2[14], t2[14] = e2, this;
    }
    setPosition(t2, e2, n) {
      const i = this.elements;
      return t2.isVector3 ? (i[12] = t2.x, i[13] = t2.y, i[14] = t2.z) : (i[12] = t2, i[13] = e2, i[14] = n), this;
    }
    invert() {
      const t2 = this.elements, e2 = t2[0], n = t2[1], i = t2[2], r = t2[3], s = t2[4], a = t2[5], o = t2[6], l = t2[7], c = t2[8], h = t2[9], u2 = t2[10], d2 = t2[11], p2 = t2[12], m = t2[13], f = t2[14], g = t2[15], v = h * f * l - m * u2 * l + m * o * d2 - a * f * d2 - h * o * g + a * u2 * g, _ = p2 * u2 * l - c * f * l - p2 * o * d2 + s * f * d2 + c * o * g - s * u2 * g, x = c * m * l - p2 * h * l + p2 * a * d2 - s * m * d2 - c * a * g + s * h * g, y2 = p2 * h * o - c * m * o - p2 * a * u2 + s * m * u2 + c * a * f - s * h * f, M2 = e2 * v + n * _ + i * x + r * y2;
      if (0 === M2) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      const S2 = 1 / M2;
      return t2[0] = v * S2, t2[1] = (m * u2 * r - h * f * r - m * i * d2 + n * f * d2 + h * i * g - n * u2 * g) * S2, t2[2] = (a * f * r - m * o * r + m * i * l - n * f * l - a * i * g + n * o * g) * S2, t2[3] = (h * o * r - a * u2 * r - h * i * l + n * u2 * l + a * i * d2 - n * o * d2) * S2, t2[4] = _ * S2, t2[5] = (c * f * r - p2 * u2 * r + p2 * i * d2 - e2 * f * d2 - c * i * g + e2 * u2 * g) * S2, t2[6] = (p2 * o * r - s * f * r - p2 * i * l + e2 * f * l + s * i * g - e2 * o * g) * S2, t2[7] = (s * u2 * r - c * o * r + c * i * l - e2 * u2 * l - s * i * d2 + e2 * o * d2) * S2, t2[8] = x * S2, t2[9] = (p2 * h * r - c * m * r - p2 * n * d2 + e2 * m * d2 + c * n * g - e2 * h * g) * S2, t2[10] = (s * m * r - p2 * a * r + p2 * n * l - e2 * m * l - s * n * g + e2 * a * g) * S2, t2[11] = (c * a * r - s * h * r - c * n * l + e2 * h * l + s * n * d2 - e2 * a * d2) * S2, t2[12] = y2 * S2, t2[13] = (c * m * i - p2 * h * i + p2 * n * u2 - e2 * m * u2 - c * n * f + e2 * h * f) * S2, t2[14] = (p2 * a * i - s * m * i - p2 * n * o + e2 * m * o + s * n * f - e2 * a * f) * S2, t2[15] = (s * h * i - c * a * i + c * n * o - e2 * h * o - s * n * u2 + e2 * a * u2) * S2, this;
    }
    scale(t2) {
      const e2 = this.elements, n = t2.x, i = t2.y, r = t2.z;
      return e2[0] *= n, e2[4] *= i, e2[8] *= r, e2[1] *= n, e2[5] *= i, e2[9] *= r, e2[2] *= n, e2[6] *= i, e2[10] *= r, e2[3] *= n, e2[7] *= i, e2[11] *= r, this;
    }
    getMaxScaleOnAxis() {
      const t2 = this.elements, e2 = t2[0] * t2[0] + t2[1] * t2[1] + t2[2] * t2[2], n = t2[4] * t2[4] + t2[5] * t2[5] + t2[6] * t2[6], i = t2[8] * t2[8] + t2[9] * t2[9] + t2[10] * t2[10];
      return Math.sqrt(Math.max(e2, n, i));
    }
    makeTranslation(t2, e2, n) {
      return t2.isVector3 ? this.set(1, 0, 0, t2.x, 0, 1, 0, t2.y, 0, 0, 1, t2.z, 0, 0, 0, 1) : this.set(1, 0, 0, t2, 0, 1, 0, e2, 0, 0, 1, n, 0, 0, 0, 1), this;
    }
    makeRotationX(t2) {
      const e2 = Math.cos(t2), n = Math.sin(t2);
      return this.set(1, 0, 0, 0, 0, e2, -n, 0, 0, n, e2, 0, 0, 0, 0, 1), this;
    }
    makeRotationY(t2) {
      const e2 = Math.cos(t2), n = Math.sin(t2);
      return this.set(e2, 0, n, 0, 0, 1, 0, 0, -n, 0, e2, 0, 0, 0, 0, 1), this;
    }
    makeRotationZ(t2) {
      const e2 = Math.cos(t2), n = Math.sin(t2);
      return this.set(e2, -n, 0, 0, n, e2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
    }
    makeRotationAxis(t2, e2) {
      const n = Math.cos(e2), i = Math.sin(e2), r = 1 - n, s = t2.x, a = t2.y, o = t2.z, l = r * s, c = r * a;
      return this.set(l * s + n, l * a - i * o, l * o + i * a, 0, l * a + i * o, c * a + n, c * o - i * s, 0, l * o - i * a, c * o + i * s, r * o * o + n, 0, 0, 0, 0, 1), this;
    }
    makeScale(t2, e2, n) {
      return this.set(t2, 0, 0, 0, 0, e2, 0, 0, 0, 0, n, 0, 0, 0, 0, 1), this;
    }
    makeShear(t2, e2, n, i, r, s) {
      return this.set(1, n, r, 0, t2, 1, s, 0, e2, i, 1, 0, 0, 0, 0, 1), this;
    }
    compose(t2, e2, n) {
      const i = this.elements, r = e2._x, s = e2._y, a = e2._z, o = e2._w, l = r + r, c = s + s, h = a + a, u2 = r * l, d2 = r * c, p2 = r * h, m = s * c, f = s * h, g = a * h, v = o * l, _ = o * c, x = o * h, y2 = n.x, M2 = n.y, S2 = n.z;
      return i[0] = (1 - (m + g)) * y2, i[1] = (d2 + x) * y2, i[2] = (p2 - _) * y2, i[3] = 0, i[4] = (d2 - x) * M2, i[5] = (1 - (u2 + g)) * M2, i[6] = (f + v) * M2, i[7] = 0, i[8] = (p2 + _) * S2, i[9] = (f - v) * S2, i[10] = (1 - (u2 + m)) * S2, i[11] = 0, i[12] = t2.x, i[13] = t2.y, i[14] = t2.z, i[15] = 1, this;
    }
    decompose(t2, e2, n) {
      const i = this.elements;
      let r = ar.set(i[0], i[1], i[2]).length();
      const s = ar.set(i[4], i[5], i[6]).length(), a = ar.set(i[8], i[9], i[10]).length();
      this.determinant() < 0 && (r = -r), t2.x = i[12], t2.y = i[13], t2.z = i[14], or.copy(this);
      const o = 1 / r, l = 1 / s, c = 1 / a;
      return or.elements[0] *= o, or.elements[1] *= o, or.elements[2] *= o, or.elements[4] *= l, or.elements[5] *= l, or.elements[6] *= l, or.elements[8] *= c, or.elements[9] *= c, or.elements[10] *= c, e2.setFromRotationMatrix(or), n.x = r, n.y = s, n.z = a, this;
    }
    makePerspective(t2, e2, n, i, r, s, a = 2e3) {
      const o = this.elements, l = 2 * r / (e2 - t2), c = 2 * r / (n - i), h = (e2 + t2) / (e2 - t2), u2 = (n + i) / (n - i);
      let d2, p2;
      if (a === On) d2 = -(s + r) / (s - r), p2 = -2 * s * r / (s - r);
      else {
        if (a !== Fn) throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + a);
        d2 = -s / (s - r), p2 = -s * r / (s - r);
      }
      return o[0] = l, o[4] = 0, o[8] = h, o[12] = 0, o[1] = 0, o[5] = c, o[9] = u2, o[13] = 0, o[2] = 0, o[6] = 0, o[10] = d2, o[14] = p2, o[3] = 0, o[7] = 0, o[11] = -1, o[15] = 0, this;
    }
    makeOrthographic(t2, e2, n, i, r, s, a = 2e3) {
      const o = this.elements, l = 1 / (e2 - t2), c = 1 / (n - i), h = 1 / (s - r), u2 = (e2 + t2) * l, d2 = (n + i) * c;
      let p2, m;
      if (a === On) p2 = (s + r) * h, m = -2 * h;
      else {
        if (a !== Fn) throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + a);
        p2 = r * h, m = -1 * h;
      }
      return o[0] = 2 * l, o[4] = 0, o[8] = 0, o[12] = -u2, o[1] = 0, o[5] = 2 * c, o[9] = 0, o[13] = -d2, o[2] = 0, o[6] = 0, o[10] = m, o[14] = -p2, o[3] = 0, o[7] = 0, o[11] = 0, o[15] = 1, this;
    }
    equals(t2) {
      const e2 = this.elements, n = t2.elements;
      for (let t3 = 0; t3 < 16; t3++) if (e2[t3] !== n[t3]) return false;
      return true;
    }
    fromArray(t2, e2 = 0) {
      for (let n = 0; n < 16; n++) this.elements[n] = t2[n + e2];
      return this;
    }
    toArray(t2 = [], e2 = 0) {
      const n = this.elements;
      return t2[e2] = n[0], t2[e2 + 1] = n[1], t2[e2 + 2] = n[2], t2[e2 + 3] = n[3], t2[e2 + 4] = n[4], t2[e2 + 5] = n[5], t2[e2 + 6] = n[6], t2[e2 + 7] = n[7], t2[e2 + 8] = n[8], t2[e2 + 9] = n[9], t2[e2 + 10] = n[10], t2[e2 + 11] = n[11], t2[e2 + 12] = n[12], t2[e2 + 13] = n[13], t2[e2 + 14] = n[14], t2[e2 + 15] = n[15], t2;
    }
  };
  var ar = new Ci();
  var or = new sr();
  var lr = new Ci(0, 0, 0);
  var cr = new Ci(1, 1, 1);
  var hr = new Ci();
  var ur = new Ci();
  var dr = new Ci();
  var pr = new sr();
  var mr = new Ri();
  var fr = class _fr {
    constructor(t2 = 0, e2 = 0, n = 0, i = _fr.DEFAULT_ORDER) {
      this.isEuler = true, this._x = t2, this._y = e2, this._z = n, this._order = i;
    }
    get x() {
      return this._x;
    }
    set x(t2) {
      this._x = t2, this._onChangeCallback();
    }
    get y() {
      return this._y;
    }
    set y(t2) {
      this._y = t2, this._onChangeCallback();
    }
    get z() {
      return this._z;
    }
    set z(t2) {
      this._z = t2, this._onChangeCallback();
    }
    get order() {
      return this._order;
    }
    set order(t2) {
      this._order = t2, this._onChangeCallback();
    }
    set(t2, e2, n, i = this._order) {
      return this._x = t2, this._y = e2, this._z = n, this._order = i, this._onChangeCallback(), this;
    }
    clone() {
      return new this.constructor(this._x, this._y, this._z, this._order);
    }
    copy(t2) {
      return this._x = t2._x, this._y = t2._y, this._z = t2._z, this._order = t2._order, this._onChangeCallback(), this;
    }
    setFromRotationMatrix(t2, e2 = this._order, n = true) {
      const i = t2.elements, r = i[0], s = i[4], a = i[8], o = i[1], l = i[5], c = i[9], h = i[2], u2 = i[6], d2 = i[10];
      switch (e2) {
        case "XYZ":
          this._y = Math.asin(Wn(a, -1, 1)), Math.abs(a) < 0.9999999 ? (this._x = Math.atan2(-c, d2), this._z = Math.atan2(-s, r)) : (this._x = Math.atan2(u2, l), this._z = 0);
          break;
        case "YXZ":
          this._x = Math.asin(-Wn(c, -1, 1)), Math.abs(c) < 0.9999999 ? (this._y = Math.atan2(a, d2), this._z = Math.atan2(o, l)) : (this._y = Math.atan2(-h, r), this._z = 0);
          break;
        case "ZXY":
          this._x = Math.asin(Wn(u2, -1, 1)), Math.abs(u2) < 0.9999999 ? (this._y = Math.atan2(-h, d2), this._z = Math.atan2(-s, l)) : (this._y = 0, this._z = Math.atan2(o, r));
          break;
        case "ZYX":
          this._y = Math.asin(-Wn(h, -1, 1)), Math.abs(h) < 0.9999999 ? (this._x = Math.atan2(u2, d2), this._z = Math.atan2(o, r)) : (this._x = 0, this._z = Math.atan2(-s, l));
          break;
        case "YZX":
          this._z = Math.asin(Wn(o, -1, 1)), Math.abs(o) < 0.9999999 ? (this._x = Math.atan2(-c, l), this._y = Math.atan2(-h, r)) : (this._x = 0, this._y = Math.atan2(a, d2));
          break;
        case "XZY":
          this._z = Math.asin(-Wn(s, -1, 1)), Math.abs(s) < 0.9999999 ? (this._x = Math.atan2(u2, l), this._y = Math.atan2(a, r)) : (this._x = Math.atan2(-c, d2), this._y = 0);
          break;
        default:
          console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: " + e2);
      }
      return this._order = e2, true === n && this._onChangeCallback(), this;
    }
    setFromQuaternion(t2, e2, n) {
      return pr.makeRotationFromQuaternion(t2), this.setFromRotationMatrix(pr, e2, n);
    }
    setFromVector3(t2, e2 = this._order) {
      return this.set(t2.x, t2.y, t2.z, e2);
    }
    reorder(t2) {
      return mr.setFromEuler(this), this.setFromQuaternion(mr, t2);
    }
    equals(t2) {
      return t2._x === this._x && t2._y === this._y && t2._z === this._z && t2._order === this._order;
    }
    fromArray(t2) {
      return this._x = t2[0], this._y = t2[1], this._z = t2[2], void 0 !== t2[3] && (this._order = t2[3]), this._onChangeCallback(), this;
    }
    toArray(t2 = [], e2 = 0) {
      return t2[e2] = this._x, t2[e2 + 1] = this._y, t2[e2 + 2] = this._z, t2[e2 + 3] = this._order, t2;
    }
    _onChange(t2) {
      return this._onChangeCallback = t2, this;
    }
    _onChangeCallback() {
    }
    *[Symbol.iterator]() {
      yield this._x, yield this._y, yield this._z, yield this._order;
    }
  };
  fr.DEFAULT_ORDER = "XYZ";
  var gr = class {
    constructor() {
      this.mask = 1;
    }
    set(t2) {
      this.mask = 1 << t2 >>> 0;
    }
    enable(t2) {
      this.mask |= 1 << t2;
    }
    enableAll() {
      this.mask = -1;
    }
    toggle(t2) {
      this.mask ^= 1 << t2;
    }
    disable(t2) {
      this.mask &= ~(1 << t2);
    }
    disableAll() {
      this.mask = 0;
    }
    test(t2) {
      return !!(this.mask & t2.mask);
    }
    isEnabled(t2) {
      return !!(this.mask & 1 << t2);
    }
  };
  var vr = 0;
  var _r = new Ci();
  var xr = new Ri();
  var yr = new sr();
  var Mr = new Ci();
  var Sr = new Ci();
  var br = new Ci();
  var Tr = new Ri();
  var wr = new Ci(1, 0, 0);
  var Er = new Ci(0, 1, 0);
  var Ar = new Ci(0, 0, 1);
  var Rr = { type: "added" };
  var Cr = { type: "removed" };
  var Ir = { type: "childadded", child: null };
  var Pr = { type: "childremoved", child: null };
  var Lr = class _Lr extends Bn {
    constructor() {
      super(), this.isObject3D = true, Object.defineProperty(this, "id", { value: vr++ }), this.uuid = Gn(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = _Lr.DEFAULT_UP.clone();
      const t2 = new Ci(), e2 = new fr(), n = new Ri(), i = new Ci(1, 1, 1);
      e2._onChange((function() {
        n.setFromEuler(e2, false);
      })), n._onChange((function() {
        e2.setFromQuaternion(n, void 0, false);
      })), Object.defineProperties(this, { position: { configurable: true, enumerable: true, value: t2 }, rotation: { configurable: true, enumerable: true, value: e2 }, quaternion: { configurable: true, enumerable: true, value: n }, scale: { configurable: true, enumerable: true, value: i }, modelViewMatrix: { value: new sr() }, normalMatrix: { value: new Kn() } }), this.matrix = new sr(), this.matrixWorld = new sr(), this.matrixAutoUpdate = _Lr.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = _Lr.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = false, this.layers = new gr(), this.visible = true, this.castShadow = false, this.receiveShadow = false, this.frustumCulled = true, this.renderOrder = 0, this.animations = [], this.userData = {};
    }
    onBeforeShadow() {
    }
    onAfterShadow() {
    }
    onBeforeRender() {
    }
    onAfterRender() {
    }
    applyMatrix4(t2) {
      this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(t2), this.matrix.decompose(this.position, this.quaternion, this.scale);
    }
    applyQuaternion(t2) {
      return this.quaternion.premultiply(t2), this;
    }
    setRotationFromAxisAngle(t2, e2) {
      this.quaternion.setFromAxisAngle(t2, e2);
    }
    setRotationFromEuler(t2) {
      this.quaternion.setFromEuler(t2, true);
    }
    setRotationFromMatrix(t2) {
      this.quaternion.setFromRotationMatrix(t2);
    }
    setRotationFromQuaternion(t2) {
      this.quaternion.copy(t2);
    }
    rotateOnAxis(t2, e2) {
      return xr.setFromAxisAngle(t2, e2), this.quaternion.multiply(xr), this;
    }
    rotateOnWorldAxis(t2, e2) {
      return xr.setFromAxisAngle(t2, e2), this.quaternion.premultiply(xr), this;
    }
    rotateX(t2) {
      return this.rotateOnAxis(wr, t2);
    }
    rotateY(t2) {
      return this.rotateOnAxis(Er, t2);
    }
    rotateZ(t2) {
      return this.rotateOnAxis(Ar, t2);
    }
    translateOnAxis(t2, e2) {
      return _r.copy(t2).applyQuaternion(this.quaternion), this.position.add(_r.multiplyScalar(e2)), this;
    }
    translateX(t2) {
      return this.translateOnAxis(wr, t2);
    }
    translateY(t2) {
      return this.translateOnAxis(Er, t2);
    }
    translateZ(t2) {
      return this.translateOnAxis(Ar, t2);
    }
    localToWorld(t2) {
      return this.updateWorldMatrix(true, false), t2.applyMatrix4(this.matrixWorld);
    }
    worldToLocal(t2) {
      return this.updateWorldMatrix(true, false), t2.applyMatrix4(yr.copy(this.matrixWorld).invert());
    }
    lookAt(t2, e2, n) {
      t2.isVector3 ? Mr.copy(t2) : Mr.set(t2, e2, n);
      const i = this.parent;
      this.updateWorldMatrix(true, false), Sr.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? yr.lookAt(Sr, Mr, this.up) : yr.lookAt(Mr, Sr, this.up), this.quaternion.setFromRotationMatrix(yr), i && (yr.extractRotation(i.matrixWorld), xr.setFromRotationMatrix(yr), this.quaternion.premultiply(xr.invert()));
    }
    add(t2) {
      if (arguments.length > 1) {
        for (let t3 = 0; t3 < arguments.length; t3++) this.add(arguments[t3]);
        return this;
      }
      return t2 === this ? (console.error("THREE.Object3D.add: object can't be added as a child of itself.", t2), this) : (t2 && t2.isObject3D ? (t2.removeFromParent(), t2.parent = this, this.children.push(t2), t2.dispatchEvent(Rr), Ir.child = t2, this.dispatchEvent(Ir), Ir.child = null) : console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", t2), this);
    }
    remove(t2) {
      if (arguments.length > 1) {
        for (let t3 = 0; t3 < arguments.length; t3++) this.remove(arguments[t3]);
        return this;
      }
      const e2 = this.children.indexOf(t2);
      return -1 !== e2 && (t2.parent = null, this.children.splice(e2, 1), t2.dispatchEvent(Cr), Pr.child = t2, this.dispatchEvent(Pr), Pr.child = null), this;
    }
    removeFromParent() {
      const t2 = this.parent;
      return null !== t2 && t2.remove(this), this;
    }
    clear() {
      return this.remove(...this.children);
    }
    attach(t2) {
      return this.updateWorldMatrix(true, false), yr.copy(this.matrixWorld).invert(), null !== t2.parent && (t2.parent.updateWorldMatrix(true, false), yr.multiply(t2.parent.matrixWorld)), t2.applyMatrix4(yr), t2.removeFromParent(), t2.parent = this, this.children.push(t2), t2.updateWorldMatrix(false, true), t2.dispatchEvent(Rr), Ir.child = t2, this.dispatchEvent(Ir), Ir.child = null, this;
    }
    getObjectById(t2) {
      return this.getObjectByProperty("id", t2);
    }
    getObjectByName(t2) {
      return this.getObjectByProperty("name", t2);
    }
    getObjectByProperty(t2, e2) {
      if (this[t2] === e2) return this;
      for (let n = 0, i = this.children.length; n < i; n++) {
        const i2 = this.children[n].getObjectByProperty(t2, e2);
        if (void 0 !== i2) return i2;
      }
    }
    getObjectsByProperty(t2, e2, n = []) {
      this[t2] === e2 && n.push(this);
      const i = this.children;
      for (let r = 0, s = i.length; r < s; r++) i[r].getObjectsByProperty(t2, e2, n);
      return n;
    }
    getWorldPosition(t2) {
      return this.updateWorldMatrix(true, false), t2.setFromMatrixPosition(this.matrixWorld);
    }
    getWorldQuaternion(t2) {
      return this.updateWorldMatrix(true, false), this.matrixWorld.decompose(Sr, t2, br), t2;
    }
    getWorldScale(t2) {
      return this.updateWorldMatrix(true, false), this.matrixWorld.decompose(Sr, Tr, t2), t2;
    }
    getWorldDirection(t2) {
      this.updateWorldMatrix(true, false);
      const e2 = this.matrixWorld.elements;
      return t2.set(e2[8], e2[9], e2[10]).normalize();
    }
    raycast() {
    }
    traverse(t2) {
      t2(this);
      const e2 = this.children;
      for (let n = 0, i = e2.length; n < i; n++) e2[n].traverse(t2);
    }
    traverseVisible(t2) {
      if (false === this.visible) return;
      t2(this);
      const e2 = this.children;
      for (let n = 0, i = e2.length; n < i; n++) e2[n].traverseVisible(t2);
    }
    traverseAncestors(t2) {
      const e2 = this.parent;
      null !== e2 && (t2(e2), e2.traverseAncestors(t2));
    }
    updateMatrix() {
      this.matrix.compose(this.position, this.quaternion, this.scale), this.matrixWorldNeedsUpdate = true;
    }
    updateMatrixWorld(t2) {
      this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || t2) && (true === this.matrixWorldAutoUpdate && (null === this.parent ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = false, t2 = true);
      const e2 = this.children;
      for (let n = 0, i = e2.length; n < i; n++) {
        e2[n].updateMatrixWorld(t2);
      }
    }
    updateWorldMatrix(t2, e2) {
      const n = this.parent;
      if (true === t2 && null !== n && n.updateWorldMatrix(true, false), this.matrixAutoUpdate && this.updateMatrix(), true === this.matrixWorldAutoUpdate && (null === this.parent ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), true === e2) {
        const t3 = this.children;
        for (let e3 = 0, n2 = t3.length; e3 < n2; e3++) {
          t3[e3].updateWorldMatrix(false, true);
        }
      }
    }
    toJSON(t2) {
      const e2 = void 0 === t2 || "string" == typeof t2, n = {};
      e2 && (t2 = { geometries: {}, materials: {}, textures: {}, images: {}, shapes: {}, skeletons: {}, animations: {}, nodes: {} }, n.metadata = { version: 4.6, type: "Object", generator: "Object3D.toJSON" });
      const i = {};
      function r(e3, n2) {
        return void 0 === e3[n2.uuid] && (e3[n2.uuid] = n2.toJSON(t2)), n2.uuid;
      }
      if (i.uuid = this.uuid, i.type = this.type, "" !== this.name && (i.name = this.name), true === this.castShadow && (i.castShadow = true), true === this.receiveShadow && (i.receiveShadow = true), false === this.visible && (i.visible = false), false === this.frustumCulled && (i.frustumCulled = false), 0 !== this.renderOrder && (i.renderOrder = this.renderOrder), Object.keys(this.userData).length > 0 && (i.userData = this.userData), i.layers = this.layers.mask, i.matrix = this.matrix.toArray(), i.up = this.up.toArray(), false === this.matrixAutoUpdate && (i.matrixAutoUpdate = false), this.isInstancedMesh && (i.type = "InstancedMesh", i.count = this.count, i.instanceMatrix = this.instanceMatrix.toJSON(), null !== this.instanceColor && (i.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (i.type = "BatchedMesh", i.perObjectFrustumCulled = this.perObjectFrustumCulled, i.sortObjects = this.sortObjects, i.drawRanges = this._drawRanges, i.reservedRanges = this._reservedRanges, i.visibility = this._visibility, i.active = this._active, i.bounds = this._bounds.map(((t3) => ({ boxInitialized: t3.boxInitialized, boxMin: t3.box.min.toArray(), boxMax: t3.box.max.toArray(), sphereInitialized: t3.sphereInitialized, sphereRadius: t3.sphere.radius, sphereCenter: t3.sphere.center.toArray() }))), i.maxInstanceCount = this._maxInstanceCount, i.maxVertexCount = this._maxVertexCount, i.maxIndexCount = this._maxIndexCount, i.geometryInitialized = this._geometryInitialized, i.geometryCount = this._geometryCount, i.matricesTexture = this._matricesTexture.toJSON(t2), null !== this._colorsTexture && (i.colorsTexture = this._colorsTexture.toJSON(t2)), null !== this.boundingSphere && (i.boundingSphere = { center: i.boundingSphere.center.toArray(), radius: i.boundingSphere.radius }), null !== this.boundingBox && (i.boundingBox = { min: i.boundingBox.min.toArray(), max: i.boundingBox.max.toArray() })), this.isScene) this.background && (this.background.isColor ? i.background = this.background.toJSON() : this.background.isTexture && (i.background = this.background.toJSON(t2).uuid)), this.environment && this.environment.isTexture && true !== this.environment.isRenderTargetTexture && (i.environment = this.environment.toJSON(t2).uuid);
      else if (this.isMesh || this.isLine || this.isPoints) {
        i.geometry = r(t2.geometries, this.geometry);
        const e3 = this.geometry.parameters;
        if (void 0 !== e3 && void 0 !== e3.shapes) {
          const n2 = e3.shapes;
          if (Array.isArray(n2)) for (let e4 = 0, i2 = n2.length; e4 < i2; e4++) {
            const i3 = n2[e4];
            r(t2.shapes, i3);
          }
          else r(t2.shapes, n2);
        }
      }
      if (this.isSkinnedMesh && (i.bindMode = this.bindMode, i.bindMatrix = this.bindMatrix.toArray(), void 0 !== this.skeleton && (r(t2.skeletons, this.skeleton), i.skeleton = this.skeleton.uuid)), void 0 !== this.material) if (Array.isArray(this.material)) {
        const e3 = [];
        for (let n2 = 0, i2 = this.material.length; n2 < i2; n2++) e3.push(r(t2.materials, this.material[n2]));
        i.material = e3;
      } else i.material = r(t2.materials, this.material);
      if (this.children.length > 0) {
        i.children = [];
        for (let e3 = 0; e3 < this.children.length; e3++) i.children.push(this.children[e3].toJSON(t2).object);
      }
      if (this.animations.length > 0) {
        i.animations = [];
        for (let e3 = 0; e3 < this.animations.length; e3++) {
          const n2 = this.animations[e3];
          i.animations.push(r(t2.animations, n2));
        }
      }
      if (e2) {
        const e3 = s(t2.geometries), i2 = s(t2.materials), r2 = s(t2.textures), a = s(t2.images), o = s(t2.shapes), l = s(t2.skeletons), c = s(t2.animations), h = s(t2.nodes);
        e3.length > 0 && (n.geometries = e3), i2.length > 0 && (n.materials = i2), r2.length > 0 && (n.textures = r2), a.length > 0 && (n.images = a), o.length > 0 && (n.shapes = o), l.length > 0 && (n.skeletons = l), c.length > 0 && (n.animations = c), h.length > 0 && (n.nodes = h);
      }
      return n.object = i, n;
      function s(t3) {
        const e3 = [];
        for (const n2 in t3) {
          const i2 = t3[n2];
          delete i2.metadata, e3.push(i2);
        }
        return e3;
      }
    }
    clone(t2) {
      return new this.constructor().copy(this, t2);
    }
    copy(t2, e2 = true) {
      if (this.name = t2.name, this.up.copy(t2.up), this.position.copy(t2.position), this.rotation.order = t2.rotation.order, this.quaternion.copy(t2.quaternion), this.scale.copy(t2.scale), this.matrix.copy(t2.matrix), this.matrixWorld.copy(t2.matrixWorld), this.matrixAutoUpdate = t2.matrixAutoUpdate, this.matrixWorldAutoUpdate = t2.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = t2.matrixWorldNeedsUpdate, this.layers.mask = t2.layers.mask, this.visible = t2.visible, this.castShadow = t2.castShadow, this.receiveShadow = t2.receiveShadow, this.frustumCulled = t2.frustumCulled, this.renderOrder = t2.renderOrder, this.animations = t2.animations.slice(), this.userData = JSON.parse(JSON.stringify(t2.userData)), true === e2) for (let e3 = 0; e3 < t2.children.length; e3++) {
        const n = t2.children[e3];
        this.add(n.clone());
      }
      return this;
    }
  };
  Lr.DEFAULT_UP = new Ci(0, 1, 0), Lr.DEFAULT_MATRIX_AUTO_UPDATE = true, Lr.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;
  var Ur = new Ci();
  var Dr = new Ci();
  var Nr = new Ci();
  var Or = new Ci();
  var Fr = new Ci();
  var Br = new Ci();
  var zr = new Ci();
  var kr = new Ci();
  var Vr = new Ci();
  var Hr = new Ci();
  var Gr = new Mi();
  var Wr = new Mi();
  var Xr = new Mi();
  var jr = class _jr {
    constructor(t2 = new Ci(), e2 = new Ci(), n = new Ci()) {
      this.a = t2, this.b = e2, this.c = n;
    }
    static getNormal(t2, e2, n, i) {
      i.subVectors(n, e2), Ur.subVectors(t2, e2), i.cross(Ur);
      const r = i.lengthSq();
      return r > 0 ? i.multiplyScalar(1 / Math.sqrt(r)) : i.set(0, 0, 0);
    }
    static getBarycoord(t2, e2, n, i, r) {
      Ur.subVectors(i, e2), Dr.subVectors(n, e2), Nr.subVectors(t2, e2);
      const s = Ur.dot(Ur), a = Ur.dot(Dr), o = Ur.dot(Nr), l = Dr.dot(Dr), c = Dr.dot(Nr), h = s * l - a * a;
      if (0 === h) return r.set(0, 0, 0), null;
      const u2 = 1 / h, d2 = (l * o - a * c) * u2, p2 = (s * c - a * o) * u2;
      return r.set(1 - d2 - p2, p2, d2);
    }
    static containsPoint(t2, e2, n, i) {
      return null !== this.getBarycoord(t2, e2, n, i, Or) && (Or.x >= 0 && Or.y >= 0 && Or.x + Or.y <= 1);
    }
    static getInterpolation(t2, e2, n, i, r, s, a, o) {
      return null === this.getBarycoord(t2, e2, n, i, Or) ? (o.x = 0, o.y = 0, "z" in o && (o.z = 0), "w" in o && (o.w = 0), null) : (o.setScalar(0), o.addScaledVector(r, Or.x), o.addScaledVector(s, Or.y), o.addScaledVector(a, Or.z), o);
    }
    static getInterpolatedAttribute(t2, e2, n, i, r, s) {
      return Gr.setScalar(0), Wr.setScalar(0), Xr.setScalar(0), Gr.fromBufferAttribute(t2, e2), Wr.fromBufferAttribute(t2, n), Xr.fromBufferAttribute(t2, i), s.setScalar(0), s.addScaledVector(Gr, r.x), s.addScaledVector(Wr, r.y), s.addScaledVector(Xr, r.z), s;
    }
    static isFrontFacing(t2, e2, n, i) {
      return Ur.subVectors(n, e2), Dr.subVectors(t2, e2), Ur.cross(Dr).dot(i) < 0;
    }
    set(t2, e2, n) {
      return this.a.copy(t2), this.b.copy(e2), this.c.copy(n), this;
    }
    setFromPointsAndIndices(t2, e2, n, i) {
      return this.a.copy(t2[e2]), this.b.copy(t2[n]), this.c.copy(t2[i]), this;
    }
    setFromAttributeAndIndices(t2, e2, n, i) {
      return this.a.fromBufferAttribute(t2, e2), this.b.fromBufferAttribute(t2, n), this.c.fromBufferAttribute(t2, i), this;
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      return this.a.copy(t2.a), this.b.copy(t2.b), this.c.copy(t2.c), this;
    }
    getArea() {
      return Ur.subVectors(this.c, this.b), Dr.subVectors(this.a, this.b), 0.5 * Ur.cross(Dr).length();
    }
    getMidpoint(t2) {
      return t2.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
    }
    getNormal(t2) {
      return _jr.getNormal(this.a, this.b, this.c, t2);
    }
    getPlane(t2) {
      return t2.setFromCoplanarPoints(this.a, this.b, this.c);
    }
    getBarycoord(t2, e2) {
      return _jr.getBarycoord(t2, this.a, this.b, this.c, e2);
    }
    getInterpolation(t2, e2, n, i, r) {
      return _jr.getInterpolation(t2, this.a, this.b, this.c, e2, n, i, r);
    }
    containsPoint(t2) {
      return _jr.containsPoint(t2, this.a, this.b, this.c);
    }
    isFrontFacing(t2) {
      return _jr.isFrontFacing(this.a, this.b, this.c, t2);
    }
    intersectsBox(t2) {
      return t2.intersectsTriangle(this);
    }
    closestPointToPoint(t2, e2) {
      const n = this.a, i = this.b, r = this.c;
      let s, a;
      Fr.subVectors(i, n), Br.subVectors(r, n), kr.subVectors(t2, n);
      const o = Fr.dot(kr), l = Br.dot(kr);
      if (o <= 0 && l <= 0) return e2.copy(n);
      Vr.subVectors(t2, i);
      const c = Fr.dot(Vr), h = Br.dot(Vr);
      if (c >= 0 && h <= c) return e2.copy(i);
      const u2 = o * h - c * l;
      if (u2 <= 0 && o >= 0 && c <= 0) return s = o / (o - c), e2.copy(n).addScaledVector(Fr, s);
      Hr.subVectors(t2, r);
      const d2 = Fr.dot(Hr), p2 = Br.dot(Hr);
      if (p2 >= 0 && d2 <= p2) return e2.copy(r);
      const m = d2 * l - o * p2;
      if (m <= 0 && l >= 0 && p2 <= 0) return a = l / (l - p2), e2.copy(n).addScaledVector(Br, a);
      const f = c * p2 - d2 * h;
      if (f <= 0 && h - c >= 0 && d2 - p2 >= 0) return zr.subVectors(r, i), a = (h - c) / (h - c + (d2 - p2)), e2.copy(i).addScaledVector(zr, a);
      const g = 1 / (f + m + u2);
      return s = m * g, a = u2 * g, e2.copy(n).addScaledVector(Fr, s).addScaledVector(Br, a);
    }
    equals(t2) {
      return t2.a.equals(this.a) && t2.b.equals(this.b) && t2.c.equals(this.c);
    }
  };
  var qr = { aliceblue: 15792383, antiquewhite: 16444375, aqua: 65535, aquamarine: 8388564, azure: 15794175, beige: 16119260, bisque: 16770244, black: 0, blanchedalmond: 16772045, blue: 255, blueviolet: 9055202, brown: 10824234, burlywood: 14596231, cadetblue: 6266528, chartreuse: 8388352, chocolate: 13789470, coral: 16744272, cornflowerblue: 6591981, cornsilk: 16775388, crimson: 14423100, cyan: 65535, darkblue: 139, darkcyan: 35723, darkgoldenrod: 12092939, darkgray: 11119017, darkgreen: 25600, darkgrey: 11119017, darkkhaki: 12433259, darkmagenta: 9109643, darkolivegreen: 5597999, darkorange: 16747520, darkorchid: 10040012, darkred: 9109504, darksalmon: 15308410, darkseagreen: 9419919, darkslateblue: 4734347, darkslategray: 3100495, darkslategrey: 3100495, darkturquoise: 52945, darkviolet: 9699539, deeppink: 16716947, deepskyblue: 49151, dimgray: 6908265, dimgrey: 6908265, dodgerblue: 2003199, firebrick: 11674146, floralwhite: 16775920, forestgreen: 2263842, fuchsia: 16711935, gainsboro: 14474460, ghostwhite: 16316671, gold: 16766720, goldenrod: 14329120, gray: 8421504, green: 32768, greenyellow: 11403055, grey: 8421504, honeydew: 15794160, hotpink: 16738740, indianred: 13458524, indigo: 4915330, ivory: 16777200, khaki: 15787660, lavender: 15132410, lavenderblush: 16773365, lawngreen: 8190976, lemonchiffon: 16775885, lightblue: 11393254, lightcoral: 15761536, lightcyan: 14745599, lightgoldenrodyellow: 16448210, lightgray: 13882323, lightgreen: 9498256, lightgrey: 13882323, lightpink: 16758465, lightsalmon: 16752762, lightseagreen: 2142890, lightskyblue: 8900346, lightslategray: 7833753, lightslategrey: 7833753, lightsteelblue: 11584734, lightyellow: 16777184, lime: 65280, limegreen: 3329330, linen: 16445670, magenta: 16711935, maroon: 8388608, mediumaquamarine: 6737322, mediumblue: 205, mediumorchid: 12211667, mediumpurple: 9662683, mediumseagreen: 3978097, mediumslateblue: 8087790, mediumspringgreen: 64154, mediumturquoise: 4772300, mediumvioletred: 13047173, midnightblue: 1644912, mintcream: 16121850, mistyrose: 16770273, moccasin: 16770229, navajowhite: 16768685, navy: 128, oldlace: 16643558, olive: 8421376, olivedrab: 7048739, orange: 16753920, orangered: 16729344, orchid: 14315734, palegoldenrod: 15657130, palegreen: 10025880, paleturquoise: 11529966, palevioletred: 14381203, papayawhip: 16773077, peachpuff: 16767673, peru: 13468991, pink: 16761035, plum: 14524637, powderblue: 11591910, purple: 8388736, rebeccapurple: 6697881, red: 16711680, rosybrown: 12357519, royalblue: 4286945, saddlebrown: 9127187, salmon: 16416882, sandybrown: 16032864, seagreen: 3050327, seashell: 16774638, sienna: 10506797, silver: 12632256, skyblue: 8900331, slateblue: 6970061, slategray: 7372944, slategrey: 7372944, snow: 16775930, springgreen: 65407, steelblue: 4620980, tan: 13808780, teal: 32896, thistle: 14204888, tomato: 16737095, turquoise: 4251856, violet: 15631086, wheat: 16113331, white: 16777215, whitesmoke: 16119285, yellow: 16776960, yellowgreen: 10145074 };
  var Yr = { h: 0, s: 0, l: 0 };
  var Zr = { h: 0, s: 0, l: 0 };
  function Jr(t2, e2, n) {
    return n < 0 && (n += 1), n > 1 && (n -= 1), n < 1 / 6 ? t2 + 6 * (e2 - t2) * n : n < 0.5 ? e2 : n < 2 / 3 ? t2 + 6 * (e2 - t2) * (2 / 3 - n) : t2;
  }
  var Kr = class {
    constructor(t2, e2, n) {
      return this.isColor = true, this.r = 1, this.g = 1, this.b = 1, this.set(t2, e2, n);
    }
    set(t2, e2, n) {
      if (void 0 === e2 && void 0 === n) {
        const e3 = t2;
        e3 && e3.isColor ? this.copy(e3) : "number" == typeof e3 ? this.setHex(e3) : "string" == typeof e3 && this.setStyle(e3);
      } else this.setRGB(t2, e2, n);
      return this;
    }
    setScalar(t2) {
      return this.r = t2, this.g = t2, this.b = t2, this;
    }
    setHex(t2, e2 = Je) {
      return t2 = Math.floor(t2), this.r = (t2 >> 16 & 255) / 255, this.g = (t2 >> 8 & 255) / 255, this.b = (255 & t2) / 255, ai.toWorkingColorSpace(this, e2), this;
    }
    setRGB(t2, e2, n, i = ai.workingColorSpace) {
      return this.r = t2, this.g = e2, this.b = n, ai.toWorkingColorSpace(this, i), this;
    }
    setHSL(t2, e2, n, i = ai.workingColorSpace) {
      if (t2 = Xn(t2, 1), e2 = Wn(e2, 0, 1), n = Wn(n, 0, 1), 0 === e2) this.r = this.g = this.b = n;
      else {
        const i2 = n <= 0.5 ? n * (1 + e2) : n + e2 - n * e2, r = 2 * n - i2;
        this.r = Jr(r, i2, t2 + 1 / 3), this.g = Jr(r, i2, t2), this.b = Jr(r, i2, t2 - 1 / 3);
      }
      return ai.toWorkingColorSpace(this, i), this;
    }
    setStyle(t2, e2 = Je) {
      function n(e3) {
        void 0 !== e3 && parseFloat(e3) < 1 && console.warn("THREE.Color: Alpha component of " + t2 + " will be ignored.");
      }
      let i;
      if (i = /^(\w+)\(([^\)]*)\)/.exec(t2)) {
        let r;
        const s = i[1], a = i[2];
        switch (s) {
          case "rgb":
          case "rgba":
            if (r = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)) return n(r[4]), this.setRGB(Math.min(255, parseInt(r[1], 10)) / 255, Math.min(255, parseInt(r[2], 10)) / 255, Math.min(255, parseInt(r[3], 10)) / 255, e2);
            if (r = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)) return n(r[4]), this.setRGB(Math.min(100, parseInt(r[1], 10)) / 100, Math.min(100, parseInt(r[2], 10)) / 100, Math.min(100, parseInt(r[3], 10)) / 100, e2);
            break;
          case "hsl":
          case "hsla":
            if (r = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)) return n(r[4]), this.setHSL(parseFloat(r[1]) / 360, parseFloat(r[2]) / 100, parseFloat(r[3]) / 100, e2);
            break;
          default:
            console.warn("THREE.Color: Unknown color model " + t2);
        }
      } else if (i = /^\#([A-Fa-f\d]+)$/.exec(t2)) {
        const n2 = i[1], r = n2.length;
        if (3 === r) return this.setRGB(parseInt(n2.charAt(0), 16) / 15, parseInt(n2.charAt(1), 16) / 15, parseInt(n2.charAt(2), 16) / 15, e2);
        if (6 === r) return this.setHex(parseInt(n2, 16), e2);
        console.warn("THREE.Color: Invalid hex color " + t2);
      } else if (t2 && t2.length > 0) return this.setColorName(t2, e2);
      return this;
    }
    setColorName(t2, e2 = Je) {
      const n = qr[t2.toLowerCase()];
      return void 0 !== n ? this.setHex(n, e2) : console.warn("THREE.Color: Unknown color " + t2), this;
    }
    clone() {
      return new this.constructor(this.r, this.g, this.b);
    }
    copy(t2) {
      return this.r = t2.r, this.g = t2.g, this.b = t2.b, this;
    }
    copySRGBToLinear(t2) {
      return this.r = oi(t2.r), this.g = oi(t2.g), this.b = oi(t2.b), this;
    }
    copyLinearToSRGB(t2) {
      return this.r = li(t2.r), this.g = li(t2.g), this.b = li(t2.b), this;
    }
    convertSRGBToLinear() {
      return this.copySRGBToLinear(this), this;
    }
    convertLinearToSRGB() {
      return this.copyLinearToSRGB(this), this;
    }
    getHex(t2 = Je) {
      return ai.fromWorkingColorSpace($r.copy(this), t2), 65536 * Math.round(Wn(255 * $r.r, 0, 255)) + 256 * Math.round(Wn(255 * $r.g, 0, 255)) + Math.round(Wn(255 * $r.b, 0, 255));
    }
    getHexString(t2 = Je) {
      return ("000000" + this.getHex(t2).toString(16)).slice(-6);
    }
    getHSL(t2, e2 = ai.workingColorSpace) {
      ai.fromWorkingColorSpace($r.copy(this), e2);
      const n = $r.r, i = $r.g, r = $r.b, s = Math.max(n, i, r), a = Math.min(n, i, r);
      let o, l;
      const c = (a + s) / 2;
      if (a === s) o = 0, l = 0;
      else {
        const t3 = s - a;
        switch (l = c <= 0.5 ? t3 / (s + a) : t3 / (2 - s - a), s) {
          case n:
            o = (i - r) / t3 + (i < r ? 6 : 0);
            break;
          case i:
            o = (r - n) / t3 + 2;
            break;
          case r:
            o = (n - i) / t3 + 4;
        }
        o /= 6;
      }
      return t2.h = o, t2.s = l, t2.l = c, t2;
    }
    getRGB(t2, e2 = ai.workingColorSpace) {
      return ai.fromWorkingColorSpace($r.copy(this), e2), t2.r = $r.r, t2.g = $r.g, t2.b = $r.b, t2;
    }
    getStyle(t2 = Je) {
      ai.fromWorkingColorSpace($r.copy(this), t2);
      const e2 = $r.r, n = $r.g, i = $r.b;
      return t2 !== Je ? `color(${t2} ${e2.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})` : `rgb(${Math.round(255 * e2)},${Math.round(255 * n)},${Math.round(255 * i)})`;
    }
    offsetHSL(t2, e2, n) {
      return this.getHSL(Yr), this.setHSL(Yr.h + t2, Yr.s + e2, Yr.l + n);
    }
    add(t2) {
      return this.r += t2.r, this.g += t2.g, this.b += t2.b, this;
    }
    addColors(t2, e2) {
      return this.r = t2.r + e2.r, this.g = t2.g + e2.g, this.b = t2.b + e2.b, this;
    }
    addScalar(t2) {
      return this.r += t2, this.g += t2, this.b += t2, this;
    }
    sub(t2) {
      return this.r = Math.max(0, this.r - t2.r), this.g = Math.max(0, this.g - t2.g), this.b = Math.max(0, this.b - t2.b), this;
    }
    multiply(t2) {
      return this.r *= t2.r, this.g *= t2.g, this.b *= t2.b, this;
    }
    multiplyScalar(t2) {
      return this.r *= t2, this.g *= t2, this.b *= t2, this;
    }
    lerp(t2, e2) {
      return this.r += (t2.r - this.r) * e2, this.g += (t2.g - this.g) * e2, this.b += (t2.b - this.b) * e2, this;
    }
    lerpColors(t2, e2, n) {
      return this.r = t2.r + (e2.r - t2.r) * n, this.g = t2.g + (e2.g - t2.g) * n, this.b = t2.b + (e2.b - t2.b) * n, this;
    }
    lerpHSL(t2, e2) {
      this.getHSL(Yr), t2.getHSL(Zr);
      const n = jn(Yr.h, Zr.h, e2), i = jn(Yr.s, Zr.s, e2), r = jn(Yr.l, Zr.l, e2);
      return this.setHSL(n, i, r), this;
    }
    setFromVector3(t2) {
      return this.r = t2.x, this.g = t2.y, this.b = t2.z, this;
    }
    applyMatrix3(t2) {
      const e2 = this.r, n = this.g, i = this.b, r = t2.elements;
      return this.r = r[0] * e2 + r[3] * n + r[6] * i, this.g = r[1] * e2 + r[4] * n + r[7] * i, this.b = r[2] * e2 + r[5] * n + r[8] * i, this;
    }
    equals(t2) {
      return t2.r === this.r && t2.g === this.g && t2.b === this.b;
    }
    fromArray(t2, e2 = 0) {
      return this.r = t2[e2], this.g = t2[e2 + 1], this.b = t2[e2 + 2], this;
    }
    toArray(t2 = [], e2 = 0) {
      return t2[e2] = this.r, t2[e2 + 1] = this.g, t2[e2 + 2] = this.b, t2;
    }
    fromBufferAttribute(t2, e2) {
      return this.r = t2.getX(e2), this.g = t2.getY(e2), this.b = t2.getZ(e2), this;
    }
    toJSON() {
      return this.getHex();
    }
    *[Symbol.iterator]() {
      yield this.r, yield this.g, yield this.b;
    }
  };
  var $r = new Kr();
  Kr.NAMES = qr;
  var Qr = 0;
  var ts = class extends Bn {
    static get type() {
      return "Material";
    }
    get type() {
      return this.constructor.type;
    }
    set type(t2) {
    }
    constructor() {
      super(), this.isMaterial = true, Object.defineProperty(this, "id", { value: Qr++ }), this.uuid = Gn(), this.name = "", this.blending = 1, this.side = 0, this.vertexColors = false, this.opacity = 1, this.transparent = false, this.alphaHash = false, this.blendSrc = C, this.blendDst = I, this.blendEquation = y, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new Kr(0, 0, 0), this.blendAlpha = 0, this.depthFunc = 3, this.depthTest = true, this.depthWrite = true, this.stencilWriteMask = 255, this.stencilFunc = 519, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = en, this.stencilZFail = en, this.stencilZPass = en, this.stencilWrite = false, this.clippingPlanes = null, this.clipIntersection = false, this.clipShadows = false, this.shadowSide = null, this.colorWrite = true, this.precision = null, this.polygonOffset = false, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = false, this.alphaToCoverage = false, this.premultipliedAlpha = false, this.forceSinglePass = false, this.visible = true, this.toneMapped = true, this.userData = {}, this.version = 0, this._alphaTest = 0;
    }
    get alphaTest() {
      return this._alphaTest;
    }
    set alphaTest(t2) {
      this._alphaTest > 0 != t2 > 0 && this.version++, this._alphaTest = t2;
    }
    onBeforeRender() {
    }
    onBeforeCompile() {
    }
    customProgramCacheKey() {
      return this.onBeforeCompile.toString();
    }
    setValues(t2) {
      if (void 0 !== t2) for (const e2 in t2) {
        const n = t2[e2];
        if (void 0 === n) {
          console.warn(`THREE.Material: parameter '${e2}' has value of undefined.`);
          continue;
        }
        const i = this[e2];
        void 0 !== i ? i && i.isColor ? i.set(n) : i && i.isVector3 && n && n.isVector3 ? i.copy(n) : this[e2] = n : console.warn(`THREE.Material: '${e2}' is not a property of THREE.${this.type}.`);
      }
    }
    toJSON(t2) {
      const e2 = void 0 === t2 || "string" == typeof t2;
      e2 && (t2 = { textures: {}, images: {} });
      const n = { metadata: { version: 4.6, type: "Material", generator: "Material.toJSON" } };
      function i(t3) {
        const e3 = [];
        for (const n2 in t3) {
          const i2 = t3[n2];
          delete i2.metadata, e3.push(i2);
        }
        return e3;
      }
      if (n.uuid = this.uuid, n.type = this.type, "" !== this.name && (n.name = this.name), this.color && this.color.isColor && (n.color = this.color.getHex()), void 0 !== this.roughness && (n.roughness = this.roughness), void 0 !== this.metalness && (n.metalness = this.metalness), void 0 !== this.sheen && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), void 0 !== this.sheenRoughness && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), void 0 !== this.emissiveIntensity && 1 !== this.emissiveIntensity && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), void 0 !== this.specularIntensity && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), void 0 !== this.shininess && (n.shininess = this.shininess), void 0 !== this.clearcoat && (n.clearcoat = this.clearcoat), void 0 !== this.clearcoatRoughness && (n.clearcoatRoughness = this.clearcoatRoughness), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(t2).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(t2).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(t2).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), void 0 !== this.dispersion && (n.dispersion = this.dispersion), void 0 !== this.iridescence && (n.iridescence = this.iridescence), void 0 !== this.iridescenceIOR && (n.iridescenceIOR = this.iridescenceIOR), void 0 !== this.iridescenceThicknessRange && (n.iridescenceThicknessRange = this.iridescenceThicknessRange), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(t2).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(t2).uuid), void 0 !== this.anisotropy && (n.anisotropy = this.anisotropy), void 0 !== this.anisotropyRotation && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(t2).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(t2).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(t2).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(t2).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(t2).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(t2).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(t2).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(t2).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(t2).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(t2).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(t2).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(t2).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(t2).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(t2).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(t2).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(t2).uuid, void 0 !== this.combine && (n.combine = this.combine)), void 0 !== this.envMapRotation && (n.envMapRotation = this.envMapRotation.toArray()), void 0 !== this.envMapIntensity && (n.envMapIntensity = this.envMapIntensity), void 0 !== this.reflectivity && (n.reflectivity = this.reflectivity), void 0 !== this.refractionRatio && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(t2).uuid), void 0 !== this.transmission && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(t2).uuid), void 0 !== this.thickness && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(t2).uuid), void 0 !== this.attenuationDistance && this.attenuationDistance !== 1 / 0 && (n.attenuationDistance = this.attenuationDistance), void 0 !== this.attenuationColor && (n.attenuationColor = this.attenuationColor.getHex()), void 0 !== this.size && (n.size = this.size), null !== this.shadowSide && (n.shadowSide = this.shadowSide), void 0 !== this.sizeAttenuation && (n.sizeAttenuation = this.sizeAttenuation), 1 !== this.blending && (n.blending = this.blending), 0 !== this.side && (n.side = this.side), true === this.vertexColors && (n.vertexColors = true), this.opacity < 1 && (n.opacity = this.opacity), true === this.transparent && (n.transparent = true), this.blendSrc !== C && (n.blendSrc = this.blendSrc), this.blendDst !== I && (n.blendDst = this.blendDst), this.blendEquation !== y && (n.blendEquation = this.blendEquation), null !== this.blendSrcAlpha && (n.blendSrcAlpha = this.blendSrcAlpha), null !== this.blendDstAlpha && (n.blendDstAlpha = this.blendDstAlpha), null !== this.blendEquationAlpha && (n.blendEquationAlpha = this.blendEquationAlpha), this.blendColor && this.blendColor.isColor && (n.blendColor = this.blendColor.getHex()), 0 !== this.blendAlpha && (n.blendAlpha = this.blendAlpha), 3 !== this.depthFunc && (n.depthFunc = this.depthFunc), false === this.depthTest && (n.depthTest = this.depthTest), false === this.depthWrite && (n.depthWrite = this.depthWrite), false === this.colorWrite && (n.colorWrite = this.colorWrite), 255 !== this.stencilWriteMask && (n.stencilWriteMask = this.stencilWriteMask), 519 !== this.stencilFunc && (n.stencilFunc = this.stencilFunc), 0 !== this.stencilRef && (n.stencilRef = this.stencilRef), 255 !== this.stencilFuncMask && (n.stencilFuncMask = this.stencilFuncMask), this.stencilFail !== en && (n.stencilFail = this.stencilFail), this.stencilZFail !== en && (n.stencilZFail = this.stencilZFail), this.stencilZPass !== en && (n.stencilZPass = this.stencilZPass), true === this.stencilWrite && (n.stencilWrite = this.stencilWrite), void 0 !== this.rotation && 0 !== this.rotation && (n.rotation = this.rotation), true === this.polygonOffset && (n.polygonOffset = true), 0 !== this.polygonOffsetFactor && (n.polygonOffsetFactor = this.polygonOffsetFactor), 0 !== this.polygonOffsetUnits && (n.polygonOffsetUnits = this.polygonOffsetUnits), void 0 !== this.linewidth && 1 !== this.linewidth && (n.linewidth = this.linewidth), void 0 !== this.dashSize && (n.dashSize = this.dashSize), void 0 !== this.gapSize && (n.gapSize = this.gapSize), void 0 !== this.scale && (n.scale = this.scale), true === this.dithering && (n.dithering = true), this.alphaTest > 0 && (n.alphaTest = this.alphaTest), true === this.alphaHash && (n.alphaHash = true), true === this.alphaToCoverage && (n.alphaToCoverage = true), true === this.premultipliedAlpha && (n.premultipliedAlpha = true), true === this.forceSinglePass && (n.forceSinglePass = true), true === this.wireframe && (n.wireframe = true), this.wireframeLinewidth > 1 && (n.wireframeLinewidth = this.wireframeLinewidth), "round" !== this.wireframeLinecap && (n.wireframeLinecap = this.wireframeLinecap), "round" !== this.wireframeLinejoin && (n.wireframeLinejoin = this.wireframeLinejoin), true === this.flatShading && (n.flatShading = true), false === this.visible && (n.visible = false), false === this.toneMapped && (n.toneMapped = false), false === this.fog && (n.fog = false), Object.keys(this.userData).length > 0 && (n.userData = this.userData), e2) {
        const e3 = i(t2.textures), r = i(t2.images);
        e3.length > 0 && (n.textures = e3), r.length > 0 && (n.images = r);
      }
      return n;
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      this.name = t2.name, this.blending = t2.blending, this.side = t2.side, this.vertexColors = t2.vertexColors, this.opacity = t2.opacity, this.transparent = t2.transparent, this.blendSrc = t2.blendSrc, this.blendDst = t2.blendDst, this.blendEquation = t2.blendEquation, this.blendSrcAlpha = t2.blendSrcAlpha, this.blendDstAlpha = t2.blendDstAlpha, this.blendEquationAlpha = t2.blendEquationAlpha, this.blendColor.copy(t2.blendColor), this.blendAlpha = t2.blendAlpha, this.depthFunc = t2.depthFunc, this.depthTest = t2.depthTest, this.depthWrite = t2.depthWrite, this.stencilWriteMask = t2.stencilWriteMask, this.stencilFunc = t2.stencilFunc, this.stencilRef = t2.stencilRef, this.stencilFuncMask = t2.stencilFuncMask, this.stencilFail = t2.stencilFail, this.stencilZFail = t2.stencilZFail, this.stencilZPass = t2.stencilZPass, this.stencilWrite = t2.stencilWrite;
      const e2 = t2.clippingPlanes;
      let n = null;
      if (null !== e2) {
        const t3 = e2.length;
        n = new Array(t3);
        for (let i = 0; i !== t3; ++i) n[i] = e2[i].clone();
      }
      return this.clippingPlanes = n, this.clipIntersection = t2.clipIntersection, this.clipShadows = t2.clipShadows, this.shadowSide = t2.shadowSide, this.colorWrite = t2.colorWrite, this.precision = t2.precision, this.polygonOffset = t2.polygonOffset, this.polygonOffsetFactor = t2.polygonOffsetFactor, this.polygonOffsetUnits = t2.polygonOffsetUnits, this.dithering = t2.dithering, this.alphaTest = t2.alphaTest, this.alphaHash = t2.alphaHash, this.alphaToCoverage = t2.alphaToCoverage, this.premultipliedAlpha = t2.premultipliedAlpha, this.forceSinglePass = t2.forceSinglePass, this.visible = t2.visible, this.toneMapped = t2.toneMapped, this.userData = JSON.parse(JSON.stringify(t2.userData)), this;
    }
    dispose() {
      this.dispatchEvent({ type: "dispose" });
    }
    set needsUpdate(t2) {
      true === t2 && this.version++;
    }
    onBuild() {
      console.warn("Material: onBuild() has been removed.");
    }
  };
  var es = class extends ts {
    static get type() {
      return "MeshBasicMaterial";
    }
    constructor(t2) {
      super(), this.isMeshBasicMaterial = true, this.color = new Kr(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new fr(), this.combine = 0, this.reflectivity = 1, this.refractionRatio = 0.98, this.wireframe = false, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = true, this.setValues(t2);
    }
    copy(t2) {
      return super.copy(t2), this.color.copy(t2.color), this.map = t2.map, this.lightMap = t2.lightMap, this.lightMapIntensity = t2.lightMapIntensity, this.aoMap = t2.aoMap, this.aoMapIntensity = t2.aoMapIntensity, this.specularMap = t2.specularMap, this.alphaMap = t2.alphaMap, this.envMap = t2.envMap, this.envMapRotation.copy(t2.envMapRotation), this.combine = t2.combine, this.reflectivity = t2.reflectivity, this.refractionRatio = t2.refractionRatio, this.wireframe = t2.wireframe, this.wireframeLinewidth = t2.wireframeLinewidth, this.wireframeLinecap = t2.wireframeLinecap, this.wireframeLinejoin = t2.wireframeLinejoin, this.fog = t2.fog, this;
    }
  };
  var ns = is();
  function is() {
    const t2 = new ArrayBuffer(4), e2 = new Float32Array(t2), n = new Uint32Array(t2), i = new Uint32Array(512), r = new Uint32Array(512);
    for (let t3 = 0; t3 < 256; ++t3) {
      const e3 = t3 - 127;
      e3 < -27 ? (i[t3] = 0, i[256 | t3] = 32768, r[t3] = 24, r[256 | t3] = 24) : e3 < -14 ? (i[t3] = 1024 >> -e3 - 14, i[256 | t3] = 1024 >> -e3 - 14 | 32768, r[t3] = -e3 - 1, r[256 | t3] = -e3 - 1) : e3 <= 15 ? (i[t3] = e3 + 15 << 10, i[256 | t3] = e3 + 15 << 10 | 32768, r[t3] = 13, r[256 | t3] = 13) : e3 < 128 ? (i[t3] = 31744, i[256 | t3] = 64512, r[t3] = 24, r[256 | t3] = 24) : (i[t3] = 31744, i[256 | t3] = 64512, r[t3] = 13, r[256 | t3] = 13);
    }
    const s = new Uint32Array(2048), a = new Uint32Array(64), o = new Uint32Array(64);
    for (let t3 = 1; t3 < 1024; ++t3) {
      let e3 = t3 << 13, n2 = 0;
      for (; !(8388608 & e3); ) e3 <<= 1, n2 -= 8388608;
      e3 &= -8388609, n2 += 947912704, s[t3] = e3 | n2;
    }
    for (let t3 = 1024; t3 < 2048; ++t3) s[t3] = 939524096 + (t3 - 1024 << 13);
    for (let t3 = 1; t3 < 31; ++t3) a[t3] = t3 << 23;
    a[31] = 1199570944, a[32] = 2147483648;
    for (let t3 = 33; t3 < 63; ++t3) a[t3] = 2147483648 + (t3 - 32 << 23);
    a[63] = 3347054592;
    for (let t3 = 1; t3 < 64; ++t3) 32 !== t3 && (o[t3] = 1024);
    return { floatView: e2, uint32View: n, baseTable: i, shiftTable: r, mantissaTable: s, exponentTable: a, offsetTable: o };
  }
  var os = new Ci();
  var ls = new Jn();
  var cs = class {
    constructor(t2, e2, n = false) {
      if (Array.isArray(t2)) throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
      this.isBufferAttribute = true, this.name = "", this.array = t2, this.itemSize = e2, this.count = void 0 !== t2 ? t2.length / e2 : 0, this.normalized = n, this.usage = wn, this.updateRanges = [], this.gpuType = Lt, this.version = 0;
    }
    onUploadCallback() {
    }
    set needsUpdate(t2) {
      true === t2 && this.version++;
    }
    setUsage(t2) {
      return this.usage = t2, this;
    }
    addUpdateRange(t2, e2) {
      this.updateRanges.push({ start: t2, count: e2 });
    }
    clearUpdateRanges() {
      this.updateRanges.length = 0;
    }
    copy(t2) {
      return this.name = t2.name, this.array = new t2.array.constructor(t2.array), this.itemSize = t2.itemSize, this.count = t2.count, this.normalized = t2.normalized, this.usage = t2.usage, this.gpuType = t2.gpuType, this;
    }
    copyAt(t2, e2, n) {
      t2 *= this.itemSize, n *= e2.itemSize;
      for (let i = 0, r = this.itemSize; i < r; i++) this.array[t2 + i] = e2.array[n + i];
      return this;
    }
    copyArray(t2) {
      return this.array.set(t2), this;
    }
    applyMatrix3(t2) {
      if (2 === this.itemSize) for (let e2 = 0, n = this.count; e2 < n; e2++) ls.fromBufferAttribute(this, e2), ls.applyMatrix3(t2), this.setXY(e2, ls.x, ls.y);
      else if (3 === this.itemSize) for (let e2 = 0, n = this.count; e2 < n; e2++) os.fromBufferAttribute(this, e2), os.applyMatrix3(t2), this.setXYZ(e2, os.x, os.y, os.z);
      return this;
    }
    applyMatrix4(t2) {
      for (let e2 = 0, n = this.count; e2 < n; e2++) os.fromBufferAttribute(this, e2), os.applyMatrix4(t2), this.setXYZ(e2, os.x, os.y, os.z);
      return this;
    }
    applyNormalMatrix(t2) {
      for (let e2 = 0, n = this.count; e2 < n; e2++) os.fromBufferAttribute(this, e2), os.applyNormalMatrix(t2), this.setXYZ(e2, os.x, os.y, os.z);
      return this;
    }
    transformDirection(t2) {
      for (let e2 = 0, n = this.count; e2 < n; e2++) os.fromBufferAttribute(this, e2), os.transformDirection(t2), this.setXYZ(e2, os.x, os.y, os.z);
      return this;
    }
    set(t2, e2 = 0) {
      return this.array.set(t2, e2), this;
    }
    getComponent(t2, e2) {
      let n = this.array[t2 * this.itemSize + e2];
      return this.normalized && (n = qn(n, this.array)), n;
    }
    setComponent(t2, e2, n) {
      return this.normalized && (n = Yn(n, this.array)), this.array[t2 * this.itemSize + e2] = n, this;
    }
    getX(t2) {
      let e2 = this.array[t2 * this.itemSize];
      return this.normalized && (e2 = qn(e2, this.array)), e2;
    }
    setX(t2, e2) {
      return this.normalized && (e2 = Yn(e2, this.array)), this.array[t2 * this.itemSize] = e2, this;
    }
    getY(t2) {
      let e2 = this.array[t2 * this.itemSize + 1];
      return this.normalized && (e2 = qn(e2, this.array)), e2;
    }
    setY(t2, e2) {
      return this.normalized && (e2 = Yn(e2, this.array)), this.array[t2 * this.itemSize + 1] = e2, this;
    }
    getZ(t2) {
      let e2 = this.array[t2 * this.itemSize + 2];
      return this.normalized && (e2 = qn(e2, this.array)), e2;
    }
    setZ(t2, e2) {
      return this.normalized && (e2 = Yn(e2, this.array)), this.array[t2 * this.itemSize + 2] = e2, this;
    }
    getW(t2) {
      let e2 = this.array[t2 * this.itemSize + 3];
      return this.normalized && (e2 = qn(e2, this.array)), e2;
    }
    setW(t2, e2) {
      return this.normalized && (e2 = Yn(e2, this.array)), this.array[t2 * this.itemSize + 3] = e2, this;
    }
    setXY(t2, e2, n) {
      return t2 *= this.itemSize, this.normalized && (e2 = Yn(e2, this.array), n = Yn(n, this.array)), this.array[t2 + 0] = e2, this.array[t2 + 1] = n, this;
    }
    setXYZ(t2, e2, n, i) {
      return t2 *= this.itemSize, this.normalized && (e2 = Yn(e2, this.array), n = Yn(n, this.array), i = Yn(i, this.array)), this.array[t2 + 0] = e2, this.array[t2 + 1] = n, this.array[t2 + 2] = i, this;
    }
    setXYZW(t2, e2, n, i, r) {
      return t2 *= this.itemSize, this.normalized && (e2 = Yn(e2, this.array), n = Yn(n, this.array), i = Yn(i, this.array), r = Yn(r, this.array)), this.array[t2 + 0] = e2, this.array[t2 + 1] = n, this.array[t2 + 2] = i, this.array[t2 + 3] = r, this;
    }
    onUpload(t2) {
      return this.onUploadCallback = t2, this;
    }
    clone() {
      return new this.constructor(this.array, this.itemSize).copy(this);
    }
    toJSON() {
      const t2 = { itemSize: this.itemSize, type: this.array.constructor.name, array: Array.from(this.array), normalized: this.normalized };
      return "" !== this.name && (t2.name = this.name), this.usage !== wn && (t2.usage = this.usage), t2;
    }
  };
  var ms = class extends cs {
    constructor(t2, e2, n) {
      super(new Uint16Array(t2), e2, n);
    }
  };
  var gs = class extends cs {
    constructor(t2, e2, n) {
      super(new Uint32Array(t2), e2, n);
    }
  };
  var _s = class extends cs {
    constructor(t2, e2, n) {
      super(new Float32Array(t2), e2, n);
    }
  };
  var xs = 0;
  var ys = new sr();
  var Ms = new Lr();
  var Ss = new Ci();
  var bs = new Li();
  var Ts = new Li();
  var ws = new Ci();
  var Es = class _Es extends Bn {
    constructor() {
      super(), this.isBufferGeometry = true, Object.defineProperty(this, "id", { value: xs++ }), this.uuid = Gn(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = false, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = { start: 0, count: 1 / 0 }, this.userData = {};
    }
    getIndex() {
      return this.index;
    }
    setIndex(t2) {
      return Array.isArray(t2) ? this.index = new (Qn(t2) ? gs : ms)(t2, 1) : this.index = t2, this;
    }
    setIndirect(t2) {
      return this.indirect = t2, this;
    }
    getIndirect() {
      return this.indirect;
    }
    getAttribute(t2) {
      return this.attributes[t2];
    }
    setAttribute(t2, e2) {
      return this.attributes[t2] = e2, this;
    }
    deleteAttribute(t2) {
      return delete this.attributes[t2], this;
    }
    hasAttribute(t2) {
      return void 0 !== this.attributes[t2];
    }
    addGroup(t2, e2, n = 0) {
      this.groups.push({ start: t2, count: e2, materialIndex: n });
    }
    clearGroups() {
      this.groups = [];
    }
    setDrawRange(t2, e2) {
      this.drawRange.start = t2, this.drawRange.count = e2;
    }
    applyMatrix4(t2) {
      const e2 = this.attributes.position;
      void 0 !== e2 && (e2.applyMatrix4(t2), e2.needsUpdate = true);
      const n = this.attributes.normal;
      if (void 0 !== n) {
        const e3 = new Kn().getNormalMatrix(t2);
        n.applyNormalMatrix(e3), n.needsUpdate = true;
      }
      const i = this.attributes.tangent;
      return void 0 !== i && (i.transformDirection(t2), i.needsUpdate = true), null !== this.boundingBox && this.computeBoundingBox(), null !== this.boundingSphere && this.computeBoundingSphere(), this;
    }
    applyQuaternion(t2) {
      return ys.makeRotationFromQuaternion(t2), this.applyMatrix4(ys), this;
    }
    rotateX(t2) {
      return ys.makeRotationX(t2), this.applyMatrix4(ys), this;
    }
    rotateY(t2) {
      return ys.makeRotationY(t2), this.applyMatrix4(ys), this;
    }
    rotateZ(t2) {
      return ys.makeRotationZ(t2), this.applyMatrix4(ys), this;
    }
    translate(t2, e2, n) {
      return ys.makeTranslation(t2, e2, n), this.applyMatrix4(ys), this;
    }
    scale(t2, e2, n) {
      return ys.makeScale(t2, e2, n), this.applyMatrix4(ys), this;
    }
    lookAt(t2) {
      return Ms.lookAt(t2), Ms.updateMatrix(), this.applyMatrix4(Ms.matrix), this;
    }
    center() {
      return this.computeBoundingBox(), this.boundingBox.getCenter(Ss).negate(), this.translate(Ss.x, Ss.y, Ss.z), this;
    }
    setFromPoints(t2) {
      const e2 = this.getAttribute("position");
      if (void 0 === e2) {
        const e3 = [];
        for (let n = 0, i = t2.length; n < i; n++) {
          const i2 = t2[n];
          e3.push(i2.x, i2.y, i2.z || 0);
        }
        this.setAttribute("position", new _s(e3, 3));
      } else {
        for (let n = 0, i = e2.count; n < i; n++) {
          const i2 = t2[n];
          e2.setXYZ(n, i2.x, i2.y, i2.z || 0);
        }
        t2.length > e2.count && console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."), e2.needsUpdate = true;
      }
      return this;
    }
    computeBoundingBox() {
      null === this.boundingBox && (this.boundingBox = new Li());
      const t2 = this.attributes.position, e2 = this.morphAttributes.position;
      if (t2 && t2.isGLBufferAttribute) return console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this), void this.boundingBox.set(new Ci(-1 / 0, -1 / 0, -1 / 0), new Ci(1 / 0, 1 / 0, 1 / 0));
      if (void 0 !== t2) {
        if (this.boundingBox.setFromBufferAttribute(t2), e2) for (let t3 = 0, n = e2.length; t3 < n; t3++) {
          const n2 = e2[t3];
          bs.setFromBufferAttribute(n2), this.morphTargetsRelative ? (ws.addVectors(this.boundingBox.min, bs.min), this.boundingBox.expandByPoint(ws), ws.addVectors(this.boundingBox.max, bs.max), this.boundingBox.expandByPoint(ws)) : (this.boundingBox.expandByPoint(bs.min), this.boundingBox.expandByPoint(bs.max));
        }
      } else this.boundingBox.makeEmpty();
      (isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.', this);
    }
    computeBoundingSphere() {
      null === this.boundingSphere && (this.boundingSphere = new Ji());
      const t2 = this.attributes.position, e2 = this.morphAttributes.position;
      if (t2 && t2.isGLBufferAttribute) return console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this), void this.boundingSphere.set(new Ci(), 1 / 0);
      if (t2) {
        const n = this.boundingSphere.center;
        if (bs.setFromBufferAttribute(t2), e2) for (let t3 = 0, n2 = e2.length; t3 < n2; t3++) {
          const n3 = e2[t3];
          Ts.setFromBufferAttribute(n3), this.morphTargetsRelative ? (ws.addVectors(bs.min, Ts.min), bs.expandByPoint(ws), ws.addVectors(bs.max, Ts.max), bs.expandByPoint(ws)) : (bs.expandByPoint(Ts.min), bs.expandByPoint(Ts.max));
        }
        bs.getCenter(n);
        let i = 0;
        for (let e3 = 0, r = t2.count; e3 < r; e3++) ws.fromBufferAttribute(t2, e3), i = Math.max(i, n.distanceToSquared(ws));
        if (e2) for (let r = 0, s = e2.length; r < s; r++) {
          const s2 = e2[r], a = this.morphTargetsRelative;
          for (let e3 = 0, r2 = s2.count; e3 < r2; e3++) ws.fromBufferAttribute(s2, e3), a && (Ss.fromBufferAttribute(t2, e3), ws.add(Ss)), i = Math.max(i, n.distanceToSquared(ws));
        }
        this.boundingSphere.radius = Math.sqrt(i), isNaN(this.boundingSphere.radius) && console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.', this);
      }
    }
    computeTangents() {
      const t2 = this.index, e2 = this.attributes;
      if (null === t2 || void 0 === e2.position || void 0 === e2.normal || void 0 === e2.uv) return void console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
      const n = e2.position, i = e2.normal, r = e2.uv;
      false === this.hasAttribute("tangent") && this.setAttribute("tangent", new cs(new Float32Array(4 * n.count), 4));
      const s = this.getAttribute("tangent"), a = [], o = [];
      for (let t3 = 0; t3 < n.count; t3++) a[t3] = new Ci(), o[t3] = new Ci();
      const l = new Ci(), c = new Ci(), h = new Ci(), u2 = new Jn(), d2 = new Jn(), p2 = new Jn(), m = new Ci(), f = new Ci();
      function g(t3, e3, i2) {
        l.fromBufferAttribute(n, t3), c.fromBufferAttribute(n, e3), h.fromBufferAttribute(n, i2), u2.fromBufferAttribute(r, t3), d2.fromBufferAttribute(r, e3), p2.fromBufferAttribute(r, i2), c.sub(l), h.sub(l), d2.sub(u2), p2.sub(u2);
        const s2 = 1 / (d2.x * p2.y - p2.x * d2.y);
        isFinite(s2) && (m.copy(c).multiplyScalar(p2.y).addScaledVector(h, -d2.y).multiplyScalar(s2), f.copy(h).multiplyScalar(d2.x).addScaledVector(c, -p2.x).multiplyScalar(s2), a[t3].add(m), a[e3].add(m), a[i2].add(m), o[t3].add(f), o[e3].add(f), o[i2].add(f));
      }
      let v = this.groups;
      0 === v.length && (v = [{ start: 0, count: t2.count }]);
      for (let e3 = 0, n2 = v.length; e3 < n2; ++e3) {
        const n3 = v[e3], i2 = n3.start;
        for (let e4 = i2, r2 = i2 + n3.count; e4 < r2; e4 += 3) g(t2.getX(e4 + 0), t2.getX(e4 + 1), t2.getX(e4 + 2));
      }
      const _ = new Ci(), x = new Ci(), y2 = new Ci(), M2 = new Ci();
      function S2(t3) {
        y2.fromBufferAttribute(i, t3), M2.copy(y2);
        const e3 = a[t3];
        _.copy(e3), _.sub(y2.multiplyScalar(y2.dot(e3))).normalize(), x.crossVectors(M2, e3);
        const n2 = x.dot(o[t3]) < 0 ? -1 : 1;
        s.setXYZW(t3, _.x, _.y, _.z, n2);
      }
      for (let e3 = 0, n2 = v.length; e3 < n2; ++e3) {
        const n3 = v[e3], i2 = n3.start;
        for (let e4 = i2, r2 = i2 + n3.count; e4 < r2; e4 += 3) S2(t2.getX(e4 + 0)), S2(t2.getX(e4 + 1)), S2(t2.getX(e4 + 2));
      }
    }
    computeVertexNormals() {
      const t2 = this.index, e2 = this.getAttribute("position");
      if (void 0 !== e2) {
        let n = this.getAttribute("normal");
        if (void 0 === n) n = new cs(new Float32Array(3 * e2.count), 3), this.setAttribute("normal", n);
        else for (let t3 = 0, e3 = n.count; t3 < e3; t3++) n.setXYZ(t3, 0, 0, 0);
        const i = new Ci(), r = new Ci(), s = new Ci(), a = new Ci(), o = new Ci(), l = new Ci(), c = new Ci(), h = new Ci();
        if (t2) for (let u2 = 0, d2 = t2.count; u2 < d2; u2 += 3) {
          const d3 = t2.getX(u2 + 0), p2 = t2.getX(u2 + 1), m = t2.getX(u2 + 2);
          i.fromBufferAttribute(e2, d3), r.fromBufferAttribute(e2, p2), s.fromBufferAttribute(e2, m), c.subVectors(s, r), h.subVectors(i, r), c.cross(h), a.fromBufferAttribute(n, d3), o.fromBufferAttribute(n, p2), l.fromBufferAttribute(n, m), a.add(c), o.add(c), l.add(c), n.setXYZ(d3, a.x, a.y, a.z), n.setXYZ(p2, o.x, o.y, o.z), n.setXYZ(m, l.x, l.y, l.z);
        }
        else for (let t3 = 0, a2 = e2.count; t3 < a2; t3 += 3) i.fromBufferAttribute(e2, t3 + 0), r.fromBufferAttribute(e2, t3 + 1), s.fromBufferAttribute(e2, t3 + 2), c.subVectors(s, r), h.subVectors(i, r), c.cross(h), n.setXYZ(t3 + 0, c.x, c.y, c.z), n.setXYZ(t3 + 1, c.x, c.y, c.z), n.setXYZ(t3 + 2, c.x, c.y, c.z);
        this.normalizeNormals(), n.needsUpdate = true;
      }
    }
    normalizeNormals() {
      const t2 = this.attributes.normal;
      for (let e2 = 0, n = t2.count; e2 < n; e2++) ws.fromBufferAttribute(t2, e2), ws.normalize(), t2.setXYZ(e2, ws.x, ws.y, ws.z);
    }
    toNonIndexed() {
      function t2(t3, e3) {
        const n2 = t3.array, i2 = t3.itemSize, r2 = t3.normalized, s2 = new n2.constructor(e3.length * i2);
        let a = 0, o = 0;
        for (let r3 = 0, l = e3.length; r3 < l; r3++) {
          a = t3.isInterleavedBufferAttribute ? e3[r3] * t3.data.stride + t3.offset : e3[r3] * i2;
          for (let t4 = 0; t4 < i2; t4++) s2[o++] = n2[a++];
        }
        return new cs(s2, i2, r2);
      }
      if (null === this.index) return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
      const e2 = new _Es(), n = this.index.array, i = this.attributes;
      for (const r2 in i) {
        const s2 = t2(i[r2], n);
        e2.setAttribute(r2, s2);
      }
      const r = this.morphAttributes;
      for (const i2 in r) {
        const s2 = [], a = r[i2];
        for (let e3 = 0, i3 = a.length; e3 < i3; e3++) {
          const i4 = t2(a[e3], n);
          s2.push(i4);
        }
        e2.morphAttributes[i2] = s2;
      }
      e2.morphTargetsRelative = this.morphTargetsRelative;
      const s = this.groups;
      for (let t3 = 0, n2 = s.length; t3 < n2; t3++) {
        const n3 = s[t3];
        e2.addGroup(n3.start, n3.count, n3.materialIndex);
      }
      return e2;
    }
    toJSON() {
      const t2 = { metadata: { version: 4.6, type: "BufferGeometry", generator: "BufferGeometry.toJSON" } };
      if (t2.uuid = this.uuid, t2.type = this.type, "" !== this.name && (t2.name = this.name), Object.keys(this.userData).length > 0 && (t2.userData = this.userData), void 0 !== this.parameters) {
        const e3 = this.parameters;
        for (const n2 in e3) void 0 !== e3[n2] && (t2[n2] = e3[n2]);
        return t2;
      }
      t2.data = { attributes: {} };
      const e2 = this.index;
      null !== e2 && (t2.data.index = { type: e2.array.constructor.name, array: Array.prototype.slice.call(e2.array) });
      const n = this.attributes;
      for (const e3 in n) {
        const i2 = n[e3];
        t2.data.attributes[e3] = i2.toJSON(t2.data);
      }
      const i = {};
      let r = false;
      for (const e3 in this.morphAttributes) {
        const n2 = this.morphAttributes[e3], s2 = [];
        for (let e4 = 0, i2 = n2.length; e4 < i2; e4++) {
          const i3 = n2[e4];
          s2.push(i3.toJSON(t2.data));
        }
        s2.length > 0 && (i[e3] = s2, r = true);
      }
      r && (t2.data.morphAttributes = i, t2.data.morphTargetsRelative = this.morphTargetsRelative);
      const s = this.groups;
      s.length > 0 && (t2.data.groups = JSON.parse(JSON.stringify(s)));
      const a = this.boundingSphere;
      return null !== a && (t2.data.boundingSphere = { center: a.center.toArray(), radius: a.radius }), t2;
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      this.index = null, this.attributes = {}, this.morphAttributes = {}, this.groups = [], this.boundingBox = null, this.boundingSphere = null;
      const e2 = {};
      this.name = t2.name;
      const n = t2.index;
      null !== n && this.setIndex(n.clone(e2));
      const i = t2.attributes;
      for (const t3 in i) {
        const n2 = i[t3];
        this.setAttribute(t3, n2.clone(e2));
      }
      const r = t2.morphAttributes;
      for (const t3 in r) {
        const n2 = [], i2 = r[t3];
        for (let t4 = 0, r2 = i2.length; t4 < r2; t4++) n2.push(i2[t4].clone(e2));
        this.morphAttributes[t3] = n2;
      }
      this.morphTargetsRelative = t2.morphTargetsRelative;
      const s = t2.groups;
      for (let t3 = 0, e3 = s.length; t3 < e3; t3++) {
        const e4 = s[t3];
        this.addGroup(e4.start, e4.count, e4.materialIndex);
      }
      const a = t2.boundingBox;
      null !== a && (this.boundingBox = a.clone());
      const o = t2.boundingSphere;
      return null !== o && (this.boundingSphere = o.clone()), this.drawRange.start = t2.drawRange.start, this.drawRange.count = t2.drawRange.count, this.userData = t2.userData, this;
    }
    dispose() {
      this.dispatchEvent({ type: "dispose" });
    }
  };
  var As = new sr();
  var Rs = new rr();
  var Cs = new Ji();
  var Is = new Ci();
  var Ps = new Ci();
  var Ls = new Ci();
  var Us = new Ci();
  var Ds = new Ci();
  var Ns = new Ci();
  var Os = new Ci();
  var Fs = new Ci();
  var Bs = class extends Lr {
    constructor(t2 = new Es(), e2 = new es()) {
      super(), this.isMesh = true, this.type = "Mesh", this.geometry = t2, this.material = e2, this.updateMorphTargets();
    }
    copy(t2, e2) {
      return super.copy(t2, e2), void 0 !== t2.morphTargetInfluences && (this.morphTargetInfluences = t2.morphTargetInfluences.slice()), void 0 !== t2.morphTargetDictionary && (this.morphTargetDictionary = Object.assign({}, t2.morphTargetDictionary)), this.material = Array.isArray(t2.material) ? t2.material.slice() : t2.material, this.geometry = t2.geometry, this;
    }
    updateMorphTargets() {
      const t2 = this.geometry.morphAttributes, e2 = Object.keys(t2);
      if (e2.length > 0) {
        const n = t2[e2[0]];
        if (void 0 !== n) {
          this.morphTargetInfluences = [], this.morphTargetDictionary = {};
          for (let t3 = 0, e3 = n.length; t3 < e3; t3++) {
            const e4 = n[t3].name || String(t3);
            this.morphTargetInfluences.push(0), this.morphTargetDictionary[e4] = t3;
          }
        }
      }
    }
    getVertexPosition(t2, e2) {
      const n = this.geometry, i = n.attributes.position, r = n.morphAttributes.position, s = n.morphTargetsRelative;
      e2.fromBufferAttribute(i, t2);
      const a = this.morphTargetInfluences;
      if (r && a) {
        Ns.set(0, 0, 0);
        for (let n2 = 0, i2 = r.length; n2 < i2; n2++) {
          const i3 = a[n2], o = r[n2];
          0 !== i3 && (Ds.fromBufferAttribute(o, t2), s ? Ns.addScaledVector(Ds, i3) : Ns.addScaledVector(Ds.sub(e2), i3));
        }
        e2.add(Ns);
      }
      return e2;
    }
    raycast(t2, e2) {
      const n = this.geometry, i = this.material, r = this.matrixWorld;
      if (void 0 !== i) {
        if (null === n.boundingSphere && n.computeBoundingSphere(), Cs.copy(n.boundingSphere), Cs.applyMatrix4(r), Rs.copy(t2.ray).recast(t2.near), false === Cs.containsPoint(Rs.origin)) {
          if (null === Rs.intersectSphere(Cs, Is)) return;
          if (Rs.origin.distanceToSquared(Is) > (t2.far - t2.near) ** 2) return;
        }
        As.copy(r).invert(), Rs.copy(t2.ray).applyMatrix4(As), null !== n.boundingBox && false === Rs.intersectsBox(n.boundingBox) || this._computeIntersections(t2, e2, Rs);
      }
    }
    _computeIntersections(t2, e2, n) {
      let i;
      const r = this.geometry, s = this.material, a = r.index, o = r.attributes.position, l = r.attributes.uv, c = r.attributes.uv1, h = r.attributes.normal, u2 = r.groups, d2 = r.drawRange;
      if (null !== a) if (Array.isArray(s)) for (let r2 = 0, o2 = u2.length; r2 < o2; r2++) {
        const o3 = u2[r2], p2 = s[o3.materialIndex];
        for (let r3 = Math.max(o3.start, d2.start), s2 = Math.min(a.count, Math.min(o3.start + o3.count, d2.start + d2.count)); r3 < s2; r3 += 3) {
          i = zs(this, p2, t2, n, l, c, h, a.getX(r3), a.getX(r3 + 1), a.getX(r3 + 2)), i && (i.faceIndex = Math.floor(r3 / 3), i.face.materialIndex = o3.materialIndex, e2.push(i));
        }
      }
      else {
        for (let r2 = Math.max(0, d2.start), o2 = Math.min(a.count, d2.start + d2.count); r2 < o2; r2 += 3) {
          i = zs(this, s, t2, n, l, c, h, a.getX(r2), a.getX(r2 + 1), a.getX(r2 + 2)), i && (i.faceIndex = Math.floor(r2 / 3), e2.push(i));
        }
      }
      else if (void 0 !== o) if (Array.isArray(s)) for (let r2 = 0, a2 = u2.length; r2 < a2; r2++) {
        const a3 = u2[r2], p2 = s[a3.materialIndex];
        for (let r3 = Math.max(a3.start, d2.start), s2 = Math.min(o.count, Math.min(a3.start + a3.count, d2.start + d2.count)); r3 < s2; r3 += 3) {
          i = zs(this, p2, t2, n, l, c, h, r3, r3 + 1, r3 + 2), i && (i.faceIndex = Math.floor(r3 / 3), i.face.materialIndex = a3.materialIndex, e2.push(i));
        }
      }
      else {
        for (let r2 = Math.max(0, d2.start), a2 = Math.min(o.count, d2.start + d2.count); r2 < a2; r2 += 3) {
          i = zs(this, s, t2, n, l, c, h, r2, r2 + 1, r2 + 2), i && (i.faceIndex = Math.floor(r2 / 3), e2.push(i));
        }
      }
    }
  };
  function zs(t2, e2, n, i, r, s, a, o, l, c) {
    t2.getVertexPosition(o, Ps), t2.getVertexPosition(l, Ls), t2.getVertexPosition(c, Us);
    const h = (function(t3, e3, n2, i2, r2, s2, a2, o2) {
      let l2;
      if (l2 = 1 === e3.side ? i2.intersectTriangle(a2, s2, r2, true, o2) : i2.intersectTriangle(r2, s2, a2, 0 === e3.side, o2), null === l2) return null;
      Fs.copy(o2), Fs.applyMatrix4(t3.matrixWorld);
      const c2 = n2.ray.origin.distanceTo(Fs);
      return c2 < n2.near || c2 > n2.far ? null : { distance: c2, point: Fs.clone(), object: t3 };
    })(t2, e2, n, i, Ps, Ls, Us, Os);
    if (h) {
      const t3 = new Ci();
      jr.getBarycoord(Os, Ps, Ls, Us, t3), r && (h.uv = jr.getInterpolatedAttribute(r, o, l, c, t3, new Jn())), s && (h.uv1 = jr.getInterpolatedAttribute(s, o, l, c, t3, new Jn())), a && (h.normal = jr.getInterpolatedAttribute(a, o, l, c, t3, new Ci()), h.normal.dot(i.direction) > 0 && h.normal.multiplyScalar(-1));
      const e3 = { a: o, b: l, c, normal: new Ci(), materialIndex: 0 };
      jr.getNormal(Ps, Ls, Us, e3.normal), h.face = e3, h.barycoord = t3;
    }
    return h;
  }
  var ks = class _ks extends Es {
    constructor(t2 = 1, e2 = 1, n = 1, i = 1, r = 1, s = 1) {
      super(), this.type = "BoxGeometry", this.parameters = { width: t2, height: e2, depth: n, widthSegments: i, heightSegments: r, depthSegments: s };
      const a = this;
      i = Math.floor(i), r = Math.floor(r), s = Math.floor(s);
      const o = [], l = [], c = [], h = [];
      let u2 = 0, d2 = 0;
      function p2(t3, e3, n2, i2, r2, s2, p3, m, f, g, v) {
        const _ = s2 / f, x = p3 / g, y2 = s2 / 2, M2 = p3 / 2, S2 = m / 2, b = f + 1, T = g + 1;
        let w2 = 0, E2 = 0;
        const A2 = new Ci();
        for (let s3 = 0; s3 < T; s3++) {
          const a2 = s3 * x - M2;
          for (let o2 = 0; o2 < b; o2++) {
            const u3 = o2 * _ - y2;
            A2[t3] = u3 * i2, A2[e3] = a2 * r2, A2[n2] = S2, l.push(A2.x, A2.y, A2.z), A2[t3] = 0, A2[e3] = 0, A2[n2] = m > 0 ? 1 : -1, c.push(A2.x, A2.y, A2.z), h.push(o2 / f), h.push(1 - s3 / g), w2 += 1;
          }
        }
        for (let t4 = 0; t4 < g; t4++) for (let e4 = 0; e4 < f; e4++) {
          const n3 = u2 + e4 + b * t4, i3 = u2 + e4 + b * (t4 + 1), r3 = u2 + (e4 + 1) + b * (t4 + 1), s3 = u2 + (e4 + 1) + b * t4;
          o.push(n3, i3, s3), o.push(i3, r3, s3), E2 += 6;
        }
        a.addGroup(d2, E2, v), d2 += E2, u2 += w2;
      }
      p2("z", "y", "x", -1, -1, n, e2, t2, s, r, 0), p2("z", "y", "x", 1, -1, n, e2, -t2, s, r, 1), p2("x", "z", "y", 1, 1, t2, n, e2, i, s, 2), p2("x", "z", "y", 1, -1, t2, n, -e2, i, s, 3), p2("x", "y", "z", 1, -1, t2, e2, n, i, r, 4), p2("x", "y", "z", -1, -1, t2, e2, -n, i, r, 5), this.setIndex(o), this.setAttribute("position", new _s(l, 3)), this.setAttribute("normal", new _s(c, 3)), this.setAttribute("uv", new _s(h, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _ks(t2.width, t2.height, t2.depth, t2.widthSegments, t2.heightSegments, t2.depthSegments);
    }
  };
  function Vs(t2) {
    const e2 = {};
    for (const n in t2) {
      e2[n] = {};
      for (const i in t2[n]) {
        const r = t2[n][i];
        r && (r.isColor || r.isMatrix3 || r.isMatrix4 || r.isVector2 || r.isVector3 || r.isVector4 || r.isTexture || r.isQuaternion) ? r.isRenderTargetTexture ? (console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."), e2[n][i] = null) : e2[n][i] = r.clone() : Array.isArray(r) ? e2[n][i] = r.slice() : e2[n][i] = r;
      }
    }
    return e2;
  }
  function Hs(t2) {
    const e2 = {};
    for (let n = 0; n < t2.length; n++) {
      const i = Vs(t2[n]);
      for (const t3 in i) e2[t3] = i[t3];
    }
    return e2;
  }
  function Gs(t2) {
    const e2 = t2.getRenderTarget();
    return null === e2 ? t2.outputColorSpace : true === e2.isXRRenderTarget ? e2.texture.colorSpace : ai.workingColorSpace;
  }
  var Ws = { clone: Vs, merge: Hs };
  var Xs = class extends ts {
    static get type() {
      return "ShaderMaterial";
    }
    constructor(t2) {
      super(), this.isShaderMaterial = true, this.defines = {}, this.uniforms = {}, this.uniformsGroups = [], this.vertexShader = "void main() {\n	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}", this.fragmentShader = "void main() {\n	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n}", this.linewidth = 1, this.wireframe = false, this.wireframeLinewidth = 1, this.fog = false, this.lights = false, this.clipping = false, this.forceSinglePass = true, this.extensions = { clipCullDistance: false, multiDraw: false }, this.defaultAttributeValues = { color: [1, 1, 1], uv: [0, 0], uv1: [0, 0] }, this.index0AttributeName = void 0, this.uniformsNeedUpdate = false, this.glslVersion = null, void 0 !== t2 && this.setValues(t2);
    }
    copy(t2) {
      return super.copy(t2), this.fragmentShader = t2.fragmentShader, this.vertexShader = t2.vertexShader, this.uniforms = Vs(t2.uniforms), this.uniformsGroups = (function(t3) {
        const e2 = [];
        for (let n = 0; n < t3.length; n++) e2.push(t3[n].clone());
        return e2;
      })(t2.uniformsGroups), this.defines = Object.assign({}, t2.defines), this.wireframe = t2.wireframe, this.wireframeLinewidth = t2.wireframeLinewidth, this.fog = t2.fog, this.lights = t2.lights, this.clipping = t2.clipping, this.extensions = Object.assign({}, t2.extensions), this.glslVersion = t2.glslVersion, this;
    }
    toJSON(t2) {
      const e2 = super.toJSON(t2);
      e2.glslVersion = this.glslVersion, e2.uniforms = {};
      for (const n2 in this.uniforms) {
        const i = this.uniforms[n2].value;
        i && i.isTexture ? e2.uniforms[n2] = { type: "t", value: i.toJSON(t2).uuid } : i && i.isColor ? e2.uniforms[n2] = { type: "c", value: i.getHex() } : i && i.isVector2 ? e2.uniforms[n2] = { type: "v2", value: i.toArray() } : i && i.isVector3 ? e2.uniforms[n2] = { type: "v3", value: i.toArray() } : i && i.isVector4 ? e2.uniforms[n2] = { type: "v4", value: i.toArray() } : i && i.isMatrix3 ? e2.uniforms[n2] = { type: "m3", value: i.toArray() } : i && i.isMatrix4 ? e2.uniforms[n2] = { type: "m4", value: i.toArray() } : e2.uniforms[n2] = { value: i };
      }
      Object.keys(this.defines).length > 0 && (e2.defines = this.defines), e2.vertexShader = this.vertexShader, e2.fragmentShader = this.fragmentShader, e2.lights = this.lights, e2.clipping = this.clipping;
      const n = {};
      for (const t3 in this.extensions) true === this.extensions[t3] && (n[t3] = true);
      return Object.keys(n).length > 0 && (e2.extensions = n), e2;
    }
  };
  var js = class extends Lr {
    constructor() {
      super(), this.isCamera = true, this.type = "Camera", this.matrixWorldInverse = new sr(), this.projectionMatrix = new sr(), this.projectionMatrixInverse = new sr(), this.coordinateSystem = On;
    }
    copy(t2, e2) {
      return super.copy(t2, e2), this.matrixWorldInverse.copy(t2.matrixWorldInverse), this.projectionMatrix.copy(t2.projectionMatrix), this.projectionMatrixInverse.copy(t2.projectionMatrixInverse), this.coordinateSystem = t2.coordinateSystem, this;
    }
    getWorldDirection(t2) {
      return super.getWorldDirection(t2).negate();
    }
    updateMatrixWorld(t2) {
      super.updateMatrixWorld(t2), this.matrixWorldInverse.copy(this.matrixWorld).invert();
    }
    updateWorldMatrix(t2, e2) {
      super.updateWorldMatrix(t2, e2), this.matrixWorldInverse.copy(this.matrixWorld).invert();
    }
    clone() {
      return new this.constructor().copy(this);
    }
  };
  var qs = new Ci();
  var Ys = new Jn();
  var Zs = new Jn();
  var Js = class extends js {
    constructor(t2 = 50, e2 = 1, n = 0.1, i = 2e3) {
      super(), this.isPerspectiveCamera = true, this.type = "PerspectiveCamera", this.fov = t2, this.zoom = 1, this.near = n, this.far = i, this.focus = 10, this.aspect = e2, this.view = null, this.filmGauge = 35, this.filmOffset = 0, this.updateProjectionMatrix();
    }
    copy(t2, e2) {
      return super.copy(t2, e2), this.fov = t2.fov, this.zoom = t2.zoom, this.near = t2.near, this.far = t2.far, this.focus = t2.focus, this.aspect = t2.aspect, this.view = null === t2.view ? null : Object.assign({}, t2.view), this.filmGauge = t2.filmGauge, this.filmOffset = t2.filmOffset, this;
    }
    setFocalLength(t2) {
      const e2 = 0.5 * this.getFilmHeight() / t2;
      this.fov = 2 * Hn * Math.atan(e2), this.updateProjectionMatrix();
    }
    getFocalLength() {
      const t2 = Math.tan(0.5 * Vn * this.fov);
      return 0.5 * this.getFilmHeight() / t2;
    }
    getEffectiveFOV() {
      return 2 * Hn * Math.atan(Math.tan(0.5 * Vn * this.fov) / this.zoom);
    }
    getFilmWidth() {
      return this.filmGauge * Math.min(this.aspect, 1);
    }
    getFilmHeight() {
      return this.filmGauge / Math.max(this.aspect, 1);
    }
    getViewBounds(t2, e2, n) {
      qs.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse), e2.set(qs.x, qs.y).multiplyScalar(-t2 / qs.z), qs.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse), n.set(qs.x, qs.y).multiplyScalar(-t2 / qs.z);
    }
    getViewSize(t2, e2) {
      return this.getViewBounds(t2, Ys, Zs), e2.subVectors(Zs, Ys);
    }
    setViewOffset(t2, e2, n, i, r, s) {
      this.aspect = t2 / e2, null === this.view && (this.view = { enabled: true, fullWidth: 1, fullHeight: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 }), this.view.enabled = true, this.view.fullWidth = t2, this.view.fullHeight = e2, this.view.offsetX = n, this.view.offsetY = i, this.view.width = r, this.view.height = s, this.updateProjectionMatrix();
    }
    clearViewOffset() {
      null !== this.view && (this.view.enabled = false), this.updateProjectionMatrix();
    }
    updateProjectionMatrix() {
      const t2 = this.near;
      let e2 = t2 * Math.tan(0.5 * Vn * this.fov) / this.zoom, n = 2 * e2, i = this.aspect * n, r = -0.5 * i;
      const s = this.view;
      if (null !== this.view && this.view.enabled) {
        const t3 = s.fullWidth, a2 = s.fullHeight;
        r += s.offsetX * i / t3, e2 -= s.offsetY * n / a2, i *= s.width / t3, n *= s.height / a2;
      }
      const a = this.filmOffset;
      0 !== a && (r += t2 * a / this.getFilmWidth()), this.projectionMatrix.makePerspective(r, r + i, e2, e2 - n, t2, this.far, this.coordinateSystem), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
    }
    toJSON(t2) {
      const e2 = super.toJSON(t2);
      return e2.object.fov = this.fov, e2.object.zoom = this.zoom, e2.object.near = this.near, e2.object.far = this.far, e2.object.focus = this.focus, e2.object.aspect = this.aspect, null !== this.view && (e2.object.view = Object.assign({}, this.view)), e2.object.filmGauge = this.filmGauge, e2.object.filmOffset = this.filmOffset, e2;
    }
  };
  var Ks = -90;
  var $s = class extends Lr {
    constructor(t2, e2, n) {
      super(), this.type = "CubeCamera", this.renderTarget = n, this.coordinateSystem = null, this.activeMipmapLevel = 0;
      const i = new Js(Ks, 1, t2, e2);
      i.layers = this.layers, this.add(i);
      const r = new Js(Ks, 1, t2, e2);
      r.layers = this.layers, this.add(r);
      const s = new Js(Ks, 1, t2, e2);
      s.layers = this.layers, this.add(s);
      const a = new Js(Ks, 1, t2, e2);
      a.layers = this.layers, this.add(a);
      const o = new Js(Ks, 1, t2, e2);
      o.layers = this.layers, this.add(o);
      const l = new Js(Ks, 1, t2, e2);
      l.layers = this.layers, this.add(l);
    }
    updateCoordinateSystem() {
      const t2 = this.coordinateSystem, e2 = this.children.concat(), [n, i, r, s, a, o] = e2;
      for (const t3 of e2) this.remove(t3);
      if (t2 === On) n.up.set(0, 1, 0), n.lookAt(1, 0, 0), i.up.set(0, 1, 0), i.lookAt(-1, 0, 0), r.up.set(0, 0, -1), r.lookAt(0, 1, 0), s.up.set(0, 0, 1), s.lookAt(0, -1, 0), a.up.set(0, 1, 0), a.lookAt(0, 0, 1), o.up.set(0, 1, 0), o.lookAt(0, 0, -1);
      else {
        if (t2 !== Fn) throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: " + t2);
        n.up.set(0, -1, 0), n.lookAt(-1, 0, 0), i.up.set(0, -1, 0), i.lookAt(1, 0, 0), r.up.set(0, 0, 1), r.lookAt(0, 1, 0), s.up.set(0, 0, -1), s.lookAt(0, -1, 0), a.up.set(0, -1, 0), a.lookAt(0, 0, 1), o.up.set(0, -1, 0), o.lookAt(0, 0, -1);
      }
      for (const t3 of e2) this.add(t3), t3.updateMatrixWorld();
    }
    update(t2, e2) {
      null === this.parent && this.updateMatrixWorld();
      const { renderTarget: n, activeMipmapLevel: i } = this;
      this.coordinateSystem !== t2.coordinateSystem && (this.coordinateSystem = t2.coordinateSystem, this.updateCoordinateSystem());
      const [r, s, a, o, l, c] = this.children, h = t2.getRenderTarget(), u2 = t2.getActiveCubeFace(), d2 = t2.getActiveMipmapLevel(), p2 = t2.xr.enabled;
      t2.xr.enabled = false;
      const m = n.texture.generateMipmaps;
      n.texture.generateMipmaps = false, t2.setRenderTarget(n, 0, i), t2.render(e2, r), t2.setRenderTarget(n, 1, i), t2.render(e2, s), t2.setRenderTarget(n, 2, i), t2.render(e2, a), t2.setRenderTarget(n, 3, i), t2.render(e2, o), t2.setRenderTarget(n, 4, i), t2.render(e2, l), n.texture.generateMipmaps = m, t2.setRenderTarget(n, 5, i), t2.render(e2, c), t2.setRenderTarget(h, u2, d2), t2.xr.enabled = p2, n.texture.needsPMREMUpdate = true;
    }
  };
  var Qs = class extends yi {
    constructor(t2, e2, n, i, r, s, a, o, l, c) {
      super(t2 = void 0 !== t2 ? t2 : [], e2 = void 0 !== e2 ? e2 : lt, n, i, r, s, a, o, l, c), this.isCubeTexture = true, this.flipY = false;
    }
    get images() {
      return this.image;
    }
    set images(t2) {
      this.image = t2;
    }
  };
  var ta = class extends bi {
    constructor(t2 = 1, e2 = {}) {
      super(t2, t2, e2), this.isWebGLCubeRenderTarget = true;
      const n = { width: t2, height: t2, depth: 1 }, i = [n, n, n, n, n, n];
      this.texture = new Qs(i, e2.mapping, e2.wrapS, e2.wrapT, e2.magFilter, e2.minFilter, e2.format, e2.type, e2.anisotropy, e2.colorSpace), this.texture.isRenderTargetTexture = true, this.texture.generateMipmaps = void 0 !== e2.generateMipmaps && e2.generateMipmaps, this.texture.minFilter = void 0 !== e2.minFilter ? e2.minFilter : Mt;
    }
    fromEquirectangularTexture(t2, e2) {
      this.texture.type = e2.type, this.texture.colorSpace = e2.colorSpace, this.texture.generateMipmaps = e2.generateMipmaps, this.texture.minFilter = e2.minFilter, this.texture.magFilter = e2.magFilter;
      const n = { uniforms: { tEquirect: { value: null } }, vertexShader: "\n\n				varying vec3 vWorldDirection;\n\n				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n\n					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n\n				}\n\n				void main() {\n\n					vWorldDirection = transformDirection( position, modelMatrix );\n\n					#include <begin_vertex>\n					#include <project_vertex>\n\n				}\n			", fragmentShader: "\n\n				uniform sampler2D tEquirect;\n\n				varying vec3 vWorldDirection;\n\n				#include <common>\n\n				void main() {\n\n					vec3 direction = normalize( vWorldDirection );\n\n					vec2 sampleUV = equirectUv( direction );\n\n					gl_FragColor = texture2D( tEquirect, sampleUV );\n\n				}\n			" }, i = new ks(5, 5, 5), r = new Xs({ name: "CubemapFromEquirect", uniforms: Vs(n.uniforms), vertexShader: n.vertexShader, fragmentShader: n.fragmentShader, side: 1, blending: 0 });
      r.uniforms.tEquirect.value = e2;
      const s = new Bs(i, r), a = e2.minFilter;
      e2.minFilter === Tt && (e2.minFilter = Mt);
      return new $s(1, 10, this).update(t2, s), e2.minFilter = a, s.geometry.dispose(), s.material.dispose(), this;
    }
    clear(t2, e2, n, i) {
      const r = t2.getRenderTarget();
      for (let r2 = 0; r2 < 6; r2++) t2.setRenderTarget(this, r2), t2.clear(e2, n, i);
      t2.setRenderTarget(r);
    }
  };
  var ea = new Ci();
  var na = new Ci();
  var ia = new Kn();
  var ra = class {
    constructor(t2 = new Ci(1, 0, 0), e2 = 0) {
      this.isPlane = true, this.normal = t2, this.constant = e2;
    }
    set(t2, e2) {
      return this.normal.copy(t2), this.constant = e2, this;
    }
    setComponents(t2, e2, n, i) {
      return this.normal.set(t2, e2, n), this.constant = i, this;
    }
    setFromNormalAndCoplanarPoint(t2, e2) {
      return this.normal.copy(t2), this.constant = -e2.dot(this.normal), this;
    }
    setFromCoplanarPoints(t2, e2, n) {
      const i = ea.subVectors(n, e2).cross(na.subVectors(t2, e2)).normalize();
      return this.setFromNormalAndCoplanarPoint(i, t2), this;
    }
    copy(t2) {
      return this.normal.copy(t2.normal), this.constant = t2.constant, this;
    }
    normalize() {
      const t2 = 1 / this.normal.length();
      return this.normal.multiplyScalar(t2), this.constant *= t2, this;
    }
    negate() {
      return this.constant *= -1, this.normal.negate(), this;
    }
    distanceToPoint(t2) {
      return this.normal.dot(t2) + this.constant;
    }
    distanceToSphere(t2) {
      return this.distanceToPoint(t2.center) - t2.radius;
    }
    projectPoint(t2, e2) {
      return e2.copy(t2).addScaledVector(this.normal, -this.distanceToPoint(t2));
    }
    intersectLine(t2, e2) {
      const n = t2.delta(ea), i = this.normal.dot(n);
      if (0 === i) return 0 === this.distanceToPoint(t2.start) ? e2.copy(t2.start) : null;
      const r = -(t2.start.dot(this.normal) + this.constant) / i;
      return r < 0 || r > 1 ? null : e2.copy(t2.start).addScaledVector(n, r);
    }
    intersectsLine(t2) {
      const e2 = this.distanceToPoint(t2.start), n = this.distanceToPoint(t2.end);
      return e2 < 0 && n > 0 || n < 0 && e2 > 0;
    }
    intersectsBox(t2) {
      return t2.intersectsPlane(this);
    }
    intersectsSphere(t2) {
      return t2.intersectsPlane(this);
    }
    coplanarPoint(t2) {
      return t2.copy(this.normal).multiplyScalar(-this.constant);
    }
    applyMatrix4(t2, e2) {
      const n = e2 || ia.getNormalMatrix(t2), i = this.coplanarPoint(ea).applyMatrix4(t2), r = this.normal.applyMatrix3(n).normalize();
      return this.constant = -i.dot(r), this;
    }
    translate(t2) {
      return this.constant -= t2.dot(this.normal), this;
    }
    equals(t2) {
      return t2.normal.equals(this.normal) && t2.constant === this.constant;
    }
    clone() {
      return new this.constructor().copy(this);
    }
  };
  var sa = new Ji();
  var aa = new Ci();
  var oa = class {
    constructor(t2 = new ra(), e2 = new ra(), n = new ra(), i = new ra(), r = new ra(), s = new ra()) {
      this.planes = [t2, e2, n, i, r, s];
    }
    set(t2, e2, n, i, r, s) {
      const a = this.planes;
      return a[0].copy(t2), a[1].copy(e2), a[2].copy(n), a[3].copy(i), a[4].copy(r), a[5].copy(s), this;
    }
    copy(t2) {
      const e2 = this.planes;
      for (let n = 0; n < 6; n++) e2[n].copy(t2.planes[n]);
      return this;
    }
    setFromProjectionMatrix(t2, e2 = 2e3) {
      const n = this.planes, i = t2.elements, r = i[0], s = i[1], a = i[2], o = i[3], l = i[4], c = i[5], h = i[6], u2 = i[7], d2 = i[8], p2 = i[9], m = i[10], f = i[11], g = i[12], v = i[13], _ = i[14], x = i[15];
      if (n[0].setComponents(o - r, u2 - l, f - d2, x - g).normalize(), n[1].setComponents(o + r, u2 + l, f + d2, x + g).normalize(), n[2].setComponents(o + s, u2 + c, f + p2, x + v).normalize(), n[3].setComponents(o - s, u2 - c, f - p2, x - v).normalize(), n[4].setComponents(o - a, u2 - h, f - m, x - _).normalize(), e2 === On) n[5].setComponents(o + a, u2 + h, f + m, x + _).normalize();
      else {
        if (e2 !== Fn) throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + e2);
        n[5].setComponents(a, h, m, _).normalize();
      }
      return this;
    }
    intersectsObject(t2) {
      if (void 0 !== t2.boundingSphere) null === t2.boundingSphere && t2.computeBoundingSphere(), sa.copy(t2.boundingSphere).applyMatrix4(t2.matrixWorld);
      else {
        const e2 = t2.geometry;
        null === e2.boundingSphere && e2.computeBoundingSphere(), sa.copy(e2.boundingSphere).applyMatrix4(t2.matrixWorld);
      }
      return this.intersectsSphere(sa);
    }
    intersectsSprite(t2) {
      return sa.center.set(0, 0, 0), sa.radius = 0.7071067811865476, sa.applyMatrix4(t2.matrixWorld), this.intersectsSphere(sa);
    }
    intersectsSphere(t2) {
      const e2 = this.planes, n = t2.center, i = -t2.radius;
      for (let t3 = 0; t3 < 6; t3++) {
        if (e2[t3].distanceToPoint(n) < i) return false;
      }
      return true;
    }
    intersectsBox(t2) {
      const e2 = this.planes;
      for (let n = 0; n < 6; n++) {
        const i = e2[n];
        if (aa.x = i.normal.x > 0 ? t2.max.x : t2.min.x, aa.y = i.normal.y > 0 ? t2.max.y : t2.min.y, aa.z = i.normal.z > 0 ? t2.max.z : t2.min.z, i.distanceToPoint(aa) < 0) return false;
      }
      return true;
    }
    containsPoint(t2) {
      const e2 = this.planes;
      for (let n = 0; n < 6; n++) if (e2[n].distanceToPoint(t2) < 0) return false;
      return true;
    }
    clone() {
      return new this.constructor().copy(this);
    }
  };
  function la() {
    let t2 = null, e2 = false, n = null, i = null;
    function r(e3, s) {
      n(e3, s), i = t2.requestAnimationFrame(r);
    }
    return { start: function() {
      true !== e2 && null !== n && (i = t2.requestAnimationFrame(r), e2 = true);
    }, stop: function() {
      t2.cancelAnimationFrame(i), e2 = false;
    }, setAnimationLoop: function(t3) {
      n = t3;
    }, setContext: function(e3) {
      t2 = e3;
    } };
  }
  function ca(t2) {
    const e2 = /* @__PURE__ */ new WeakMap();
    return { get: function(t3) {
      return t3.isInterleavedBufferAttribute && (t3 = t3.data), e2.get(t3);
    }, remove: function(n) {
      n.isInterleavedBufferAttribute && (n = n.data);
      const i = e2.get(n);
      i && (t2.deleteBuffer(i.buffer), e2.delete(n));
    }, update: function(n, i) {
      if (n.isInterleavedBufferAttribute && (n = n.data), n.isGLBufferAttribute) {
        const t3 = e2.get(n);
        return void ((!t3 || t3.version < n.version) && e2.set(n, { buffer: n.buffer, type: n.type, bytesPerElement: n.elementSize, version: n.version }));
      }
      const r = e2.get(n);
      if (void 0 === r) e2.set(n, (function(e3, n2) {
        const i2 = e3.array, r2 = e3.usage, s = i2.byteLength, a = t2.createBuffer();
        let o;
        if (t2.bindBuffer(n2, a), t2.bufferData(n2, i2, r2), e3.onUploadCallback(), i2 instanceof Float32Array) o = t2.FLOAT;
        else if (i2 instanceof Uint16Array) o = e3.isFloat16BufferAttribute ? t2.HALF_FLOAT : t2.UNSIGNED_SHORT;
        else if (i2 instanceof Int16Array) o = t2.SHORT;
        else if (i2 instanceof Uint32Array) o = t2.UNSIGNED_INT;
        else if (i2 instanceof Int32Array) o = t2.INT;
        else if (i2 instanceof Int8Array) o = t2.BYTE;
        else if (i2 instanceof Uint8Array) o = t2.UNSIGNED_BYTE;
        else {
          if (!(i2 instanceof Uint8ClampedArray)) throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: " + i2);
          o = t2.UNSIGNED_BYTE;
        }
        return { buffer: a, type: o, bytesPerElement: i2.BYTES_PER_ELEMENT, version: e3.version, size: s };
      })(n, i));
      else if (r.version < n.version) {
        if (r.size !== n.array.byteLength) throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
        !(function(e3, n2, i2) {
          const r2 = n2.array, s = n2.updateRanges;
          if (t2.bindBuffer(i2, e3), 0 === s.length) t2.bufferSubData(i2, 0, r2);
          else {
            s.sort(((t3, e5) => t3.start - e5.start));
            let e4 = 0;
            for (let t3 = 1; t3 < s.length; t3++) {
              const n3 = s[e4], i3 = s[t3];
              i3.start <= n3.start + n3.count + 1 ? n3.count = Math.max(n3.count, i3.start + i3.count - n3.start) : (++e4, s[e4] = i3);
            }
            s.length = e4 + 1;
            for (let e5 = 0, n3 = s.length; e5 < n3; e5++) {
              const n4 = s[e5];
              t2.bufferSubData(i2, n4.start * r2.BYTES_PER_ELEMENT, r2, n4.start, n4.count);
            }
            n2.clearUpdateRanges();
          }
          n2.onUploadCallback();
        })(r.buffer, n, i), r.version = n.version;
      }
    } };
  }
  var ha = class _ha extends Es {
    constructor(t2 = 1, e2 = 1, n = 1, i = 1) {
      super(), this.type = "PlaneGeometry", this.parameters = { width: t2, height: e2, widthSegments: n, heightSegments: i };
      const r = t2 / 2, s = e2 / 2, a = Math.floor(n), o = Math.floor(i), l = a + 1, c = o + 1, h = t2 / a, u2 = e2 / o, d2 = [], p2 = [], m = [], f = [];
      for (let t3 = 0; t3 < c; t3++) {
        const e3 = t3 * u2 - s;
        for (let n2 = 0; n2 < l; n2++) {
          const i2 = n2 * h - r;
          p2.push(i2, -e3, 0), m.push(0, 0, 1), f.push(n2 / a), f.push(1 - t3 / o);
        }
      }
      for (let t3 = 0; t3 < o; t3++) for (let e3 = 0; e3 < a; e3++) {
        const n2 = e3 + l * t3, i2 = e3 + l * (t3 + 1), r2 = e3 + 1 + l * (t3 + 1), s2 = e3 + 1 + l * t3;
        d2.push(n2, i2, s2), d2.push(i2, r2, s2);
      }
      this.setIndex(d2), this.setAttribute("position", new _s(p2, 3)), this.setAttribute("normal", new _s(m, 3)), this.setAttribute("uv", new _s(f, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _ha(t2.width, t2.height, t2.widthSegments, t2.heightSegments);
    }
  };
  var ua = { alphahash_fragment: "#ifdef USE_ALPHAHASH\n	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;\n#endif", alphahash_pars_fragment: "#ifdef USE_ALPHAHASH\n	const float ALPHA_HASH_SCALE = 0.05;\n	float hash2D( vec2 value ) {\n		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );\n	}\n	float hash3D( vec3 value ) {\n		return hash2D( vec2( hash2D( value.xy ), value.z ) );\n	}\n	float getAlphaHashThreshold( vec3 position ) {\n		float maxDeriv = max(\n			length( dFdx( position.xyz ) ),\n			length( dFdy( position.xyz ) )\n		);\n		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );\n		vec2 pixScales = vec2(\n			exp2( floor( log2( pixScale ) ) ),\n			exp2( ceil( log2( pixScale ) ) )\n		);\n		vec2 alpha = vec2(\n			hash3D( floor( pixScales.x * position.xyz ) ),\n			hash3D( floor( pixScales.y * position.xyz ) )\n		);\n		float lerpFactor = fract( log2( pixScale ) );\n		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;\n		float a = min( lerpFactor, 1.0 - lerpFactor );\n		vec3 cases = vec3(\n			x * x / ( 2.0 * a * ( 1.0 - a ) ),\n			( x - 0.5 * a ) / ( 1.0 - a ),\n			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )\n		);\n		float threshold = ( x < ( 1.0 - a ) )\n			? ( ( x < a ) ? cases.x : cases.y )\n			: cases.z;\n		return clamp( threshold , 1.0e-6, 1.0 );\n	}\n#endif", alphamap_fragment: "#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\n#endif", alphamap_pars_fragment: "#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif", alphatest_fragment: "#ifdef USE_ALPHATEST\n	#ifdef ALPHA_TO_COVERAGE\n	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );\n	if ( diffuseColor.a == 0.0 ) discard;\n	#else\n	if ( diffuseColor.a < alphaTest ) discard;\n	#endif\n#endif", alphatest_pars_fragment: "#ifdef USE_ALPHATEST\n	uniform float alphaTest;\n#endif", aomap_fragment: "#ifdef USE_AOMAP\n	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;\n	reflectedLight.indirectDiffuse *= ambientOcclusion;\n	#if defined( USE_CLEARCOAT ) \n		clearcoatSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_SHEEN ) \n		sheenSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD )\n		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );\n		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );\n	#endif\n#endif", aomap_pars_fragment: "#ifdef USE_AOMAP\n	uniform sampler2D aoMap;\n	uniform float aoMapIntensity;\n#endif", batching_pars_vertex: "#ifdef USE_BATCHING\n	#if ! defined( GL_ANGLE_multi_draw )\n	#define gl_DrawID _gl_DrawID\n	uniform int _gl_DrawID;\n	#endif\n	uniform highp sampler2D batchingTexture;\n	uniform highp usampler2D batchingIdTexture;\n	mat4 getBatchingMatrix( const in float i ) {\n		int size = textureSize( batchingTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n	float getIndirectIndex( const in int i ) {\n		int size = textureSize( batchingIdTexture, 0 ).x;\n		int x = i % size;\n		int y = i / size;\n		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );\n	}\n#endif\n#ifdef USE_BATCHING_COLOR\n	uniform sampler2D batchingColorTexture;\n	vec3 getBatchingColor( const in float i ) {\n		int size = textureSize( batchingColorTexture, 0 ).x;\n		int j = int( i );\n		int x = j % size;\n		int y = j / size;\n		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;\n	}\n#endif", batching_vertex: "#ifdef USE_BATCHING\n	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );\n#endif", begin_vertex: "vec3 transformed = vec3( position );\n#ifdef USE_ALPHAHASH\n	vPosition = vec3( position );\n#endif", beginnormal_vertex: "vec3 objectNormal = vec3( normal );\n#ifdef USE_TANGENT\n	vec3 objectTangent = vec3( tangent.xyz );\n#endif", bsdfs: "float G_BlinnPhong_Implicit( ) {\n	return 0.25;\n}\nfloat D_BlinnPhong( const in float shininess, const in float dotNH ) {\n	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n}\nvec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( specularColor, 1.0, dotVH );\n	float G = G_BlinnPhong_Implicit( );\n	float D = D_BlinnPhong( shininess, dotNH );\n	return F * ( G * D );\n} // validated", iridescence_fragment: "#ifdef USE_IRIDESCENCE\n	const mat3 XYZ_TO_REC709 = mat3(\n		 3.2404542, -0.9692660,  0.0556434,\n		-1.5371385,  1.8760108, -0.2040259,\n		-0.4985314,  0.0415560,  1.0572252\n	);\n	vec3 Fresnel0ToIor( vec3 fresnel0 ) {\n		vec3 sqrtF0 = sqrt( fresnel0 );\n		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );\n	}\n	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );\n	}\n	float IorToFresnel0( float transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));\n	}\n	vec3 evalSensitivity( float OPD, vec3 shift ) {\n		float phase = 2.0 * PI * OPD * 1.0e-9;\n		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );\n		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );\n		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );\n		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );\n		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );\n		xyz /= 1.0685e-7;\n		vec3 rgb = XYZ_TO_REC709 * xyz;\n		return rgb;\n	}\n	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {\n		vec3 I;\n		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );\n		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );\n		float cosTheta2Sq = 1.0 - sinTheta2Sq;\n		if ( cosTheta2Sq < 0.0 ) {\n			return vec3( 1.0 );\n		}\n		float cosTheta2 = sqrt( cosTheta2Sq );\n		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );\n		float R12 = F_Schlick( R0, 1.0, cosTheta1 );\n		float T121 = 1.0 - R12;\n		float phi12 = 0.0;\n		if ( iridescenceIOR < outsideIOR ) phi12 = PI;\n		float phi21 = PI - phi12;\n		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );\n		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );\n		vec3 phi23 = vec3( 0.0 );\n		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;\n		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;\n		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;\n		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;\n		vec3 phi = vec3( phi21 ) + phi23;\n		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );\n		vec3 r123 = sqrt( R123 );\n		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );\n		vec3 C0 = R12 + Rs;\n		I = C0;\n		vec3 Cm = Rs - T121;\n		for ( int m = 1; m <= 2; ++ m ) {\n			Cm *= r123;\n			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );\n			I += Cm * Sm;\n		}\n		return max( I, vec3( 0.0 ) );\n	}\n#endif", bumpmap_pars_fragment: "#ifdef USE_BUMPMAP\n	uniform sampler2D bumpMap;\n	uniform float bumpScale;\n	vec2 dHdxy_fwd() {\n		vec2 dSTdx = dFdx( vBumpMapUv );\n		vec2 dSTdy = dFdy( vBumpMapUv );\n		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;\n		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;\n		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;\n		return vec2( dBx, dBy );\n	}\n	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {\n		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );\n		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );\n		vec3 vN = surf_norm;\n		vec3 R1 = cross( vSigmaY, vN );\n		vec3 R2 = cross( vN, vSigmaX );\n		float fDet = dot( vSigmaX, R1 ) * faceDirection;\n		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n		return normalize( abs( fDet ) * surf_norm - vGrad );\n	}\n#endif", clipping_planes_fragment: "#if NUM_CLIPPING_PLANES > 0\n	vec4 plane;\n	#ifdef ALPHA_TO_COVERAGE\n		float distanceToPlane, distanceGradient;\n		float clipOpacity = 1.0;\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n			distanceGradient = fwidth( distanceToPlane ) / 2.0;\n			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			if ( clipOpacity == 0.0 ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			float unionClipOpacity = 1.0;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n				distanceGradient = fwidth( distanceToPlane ) / 2.0;\n				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			}\n			#pragma unroll_loop_end\n			clipOpacity *= 1.0 - unionClipOpacity;\n		#endif\n		diffuseColor.a *= clipOpacity;\n		if ( diffuseColor.a == 0.0 ) discard;\n	#else\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			bool clipped = true;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;\n			}\n			#pragma unroll_loop_end\n			if ( clipped ) discard;\n		#endif\n	#endif\n#endif", clipping_planes_pars_fragment: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n#endif", clipping_planes_pars_vertex: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n#endif", clipping_planes_vertex: "#if NUM_CLIPPING_PLANES > 0\n	vClipPosition = - mvPosition.xyz;\n#endif", color_fragment: "#if defined( USE_COLOR_ALPHA )\n	diffuseColor *= vColor;\n#elif defined( USE_COLOR )\n	diffuseColor.rgb *= vColor;\n#endif", color_pars_fragment: "#if defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#elif defined( USE_COLOR )\n	varying vec3 vColor;\n#endif", color_pars_vertex: "#if defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	varying vec3 vColor;\n#endif", color_vertex: "#if defined( USE_COLOR_ALPHA )\n	vColor = vec4( 1.0 );\n#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	vColor = vec3( 1.0 );\n#endif\n#ifdef USE_COLOR\n	vColor *= color;\n#endif\n#ifdef USE_INSTANCING_COLOR\n	vColor.xyz *= instanceColor.xyz;\n#endif\n#ifdef USE_BATCHING_COLOR\n	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );\n	vColor.xyz *= batchingColor.xyz;\n#endif", common: "#define PI 3.141592653589793\n#define PI2 6.283185307179586\n#define PI_HALF 1.5707963267948966\n#define RECIPROCAL_PI 0.3183098861837907\n#define RECIPROCAL_PI2 0.15915494309189535\n#define EPSILON 1e-6\n#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\n#define whiteComplement( a ) ( 1.0 - saturate( a ) )\nfloat pow2( const in float x ) { return x*x; }\nvec3 pow2( const in vec3 x ) { return x*x; }\nfloat pow3( const in float x ) { return x*x*x; }\nfloat pow4( const in float x ) { float x2 = x*x; return x2*x2; }\nfloat max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }\nfloat average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }\nhighp float rand( const in vec2 uv ) {\n	const highp float a = 12.9898, b = 78.233, c = 43758.5453;\n	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );\n	return fract( sin( sn ) * c );\n}\n#ifdef HIGH_PRECISION\n	float precisionSafeLength( vec3 v ) { return length( v ); }\n#else\n	float precisionSafeLength( vec3 v ) {\n		float maxComponent = max3( abs( v ) );\n		return length( v / maxComponent ) * maxComponent;\n	}\n#endif\nstruct IncidentLight {\n	vec3 color;\n	vec3 direction;\n	bool visible;\n};\nstruct ReflectedLight {\n	vec3 directDiffuse;\n	vec3 directSpecular;\n	vec3 indirectDiffuse;\n	vec3 indirectSpecular;\n};\n#ifdef USE_ALPHAHASH\n	varying vec3 vPosition;\n#endif\nvec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n}\nvec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );\n}\nmat3 transposeMat3( const in mat3 m ) {\n	mat3 tmp;\n	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );\n	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );\n	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );\n	return tmp;\n}\nbool isPerspectiveMatrix( mat4 m ) {\n	return m[ 2 ][ 3 ] == - 1.0;\n}\nvec2 equirectUv( in vec3 dir ) {\n	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n	return vec2( u, v );\n}\nvec3 BRDF_Lambert( const in vec3 diffuseColor ) {\n	return RECIPROCAL_PI * diffuseColor;\n}\nvec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n}\nfloat F_Schlick( const in float f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n} // validated", cube_uv_reflection_fragment: "#ifdef ENVMAP_TYPE_CUBE_UV\n	#define cubeUV_minMipLevel 4.0\n	#define cubeUV_minTileSize 16.0\n	float getFace( vec3 direction ) {\n		vec3 absDirection = abs( direction );\n		float face = - 1.0;\n		if ( absDirection.x > absDirection.z ) {\n			if ( absDirection.x > absDirection.y )\n				face = direction.x > 0.0 ? 0.0 : 3.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		} else {\n			if ( absDirection.z > absDirection.y )\n				face = direction.z > 0.0 ? 2.0 : 5.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		}\n		return face;\n	}\n	vec2 getUV( vec3 direction, float face ) {\n		vec2 uv;\n		if ( face == 0.0 ) {\n			uv = vec2( direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 1.0 ) {\n			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );\n		} else if ( face == 2.0 ) {\n			uv = vec2( - direction.x, direction.y ) / abs( direction.z );\n		} else if ( face == 3.0 ) {\n			uv = vec2( - direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 4.0 ) {\n			uv = vec2( - direction.x, direction.z ) / abs( direction.y );\n		} else {\n			uv = vec2( direction.x, direction.y ) / abs( direction.z );\n		}\n		return 0.5 * ( uv + 1.0 );\n	}\n	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {\n		float face = getFace( direction );\n		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );\n		mipInt = max( mipInt, cubeUV_minMipLevel );\n		float faceSize = exp2( mipInt );\n		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;\n		if ( face > 2.0 ) {\n			uv.y += faceSize;\n			face -= 3.0;\n		}\n		uv.x += face * faceSize;\n		uv.x += filterInt * 3.0 * cubeUV_minTileSize;\n		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );\n		uv.x *= CUBEUV_TEXEL_WIDTH;\n		uv.y *= CUBEUV_TEXEL_HEIGHT;\n		#ifdef texture2DGradEXT\n			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;\n		#else\n			return texture2D( envMap, uv ).rgb;\n		#endif\n	}\n	#define cubeUV_r0 1.0\n	#define cubeUV_m0 - 2.0\n	#define cubeUV_r1 0.8\n	#define cubeUV_m1 - 1.0\n	#define cubeUV_r4 0.4\n	#define cubeUV_m4 2.0\n	#define cubeUV_r5 0.305\n	#define cubeUV_m5 3.0\n	#define cubeUV_r6 0.21\n	#define cubeUV_m6 4.0\n	float roughnessToMip( float roughness ) {\n		float mip = 0.0;\n		if ( roughness >= cubeUV_r1 ) {\n			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;\n		} else if ( roughness >= cubeUV_r4 ) {\n			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;\n		} else if ( roughness >= cubeUV_r5 ) {\n			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;\n		} else if ( roughness >= cubeUV_r6 ) {\n			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;\n		} else {\n			mip = - 2.0 * log2( 1.16 * roughness );		}\n		return mip;\n	}\n	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {\n		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );\n		float mipF = fract( mip );\n		float mipInt = floor( mip );\n		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );\n		if ( mipF == 0.0 ) {\n			return vec4( color0, 1.0 );\n		} else {\n			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );\n			return vec4( mix( color0, color1, mipF ), 1.0 );\n		}\n	}\n#endif", defaultnormal_vertex: "vec3 transformedNormal = objectNormal;\n#ifdef USE_TANGENT\n	vec3 transformedTangent = objectTangent;\n#endif\n#ifdef USE_BATCHING\n	mat3 bm = mat3( batchingMatrix );\n	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );\n	transformedNormal = bm * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = bm * transformedTangent;\n	#endif\n#endif\n#ifdef USE_INSTANCING\n	mat3 im = mat3( instanceMatrix );\n	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );\n	transformedNormal = im * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = im * transformedTangent;\n	#endif\n#endif\ntransformedNormal = normalMatrix * transformedNormal;\n#ifdef FLIP_SIDED\n	transformedNormal = - transformedNormal;\n#endif\n#ifdef USE_TANGENT\n	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;\n	#ifdef FLIP_SIDED\n		transformedTangent = - transformedTangent;\n	#endif\n#endif", displacementmap_pars_vertex: "#ifdef USE_DISPLACEMENTMAP\n	uniform sampler2D displacementMap;\n	uniform float displacementScale;\n	uniform float displacementBias;\n#endif", displacementmap_vertex: "#ifdef USE_DISPLACEMENTMAP\n	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );\n#endif", emissivemap_fragment: "#ifdef USE_EMISSIVEMAP\n	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE\n		emissiveColor = sRGBTransferEOTF( emissiveColor );\n	#endif\n	totalEmissiveRadiance *= emissiveColor.rgb;\n#endif", emissivemap_pars_fragment: "#ifdef USE_EMISSIVEMAP\n	uniform sampler2D emissiveMap;\n#endif", colorspace_fragment: "gl_FragColor = linearToOutputTexel( gl_FragColor );", colorspace_pars_fragment: "vec4 LinearTransferOETF( in vec4 value ) {\n	return value;\n}\nvec4 sRGBTransferEOTF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );\n}\nvec4 sRGBTransferOETF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );\n}", envmap_fragment: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vec3 cameraToFrag;\n		if ( isOrthographic ) {\n			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToFrag = normalize( vWorldPosition - cameraPosition );\n		}\n		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vec3 reflectVec = reflect( cameraToFrag, worldNormal );\n		#else\n			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );\n		#endif\n	#else\n		vec3 reflectVec = vReflect;\n	#endif\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );\n	#else\n		vec4 envColor = vec4( 0.0 );\n	#endif\n	#ifdef ENVMAP_BLENDING_MULTIPLY\n		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n	#elif defined( ENVMAP_BLENDING_MIX )\n		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n	#elif defined( ENVMAP_BLENDING_ADD )\n		outgoingLight += envColor.xyz * specularStrength * reflectivity;\n	#endif\n#endif", envmap_common_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float envMapIntensity;\n	uniform float flipEnvMap;\n	uniform mat3 envMapRotation;\n	#ifdef ENVMAP_TYPE_CUBE\n		uniform samplerCube envMap;\n	#else\n		uniform sampler2D envMap;\n	#endif\n	\n#endif", envmap_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float reflectivity;\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		varying vec3 vWorldPosition;\n		uniform float refractionRatio;\n	#else\n		varying vec3 vReflect;\n	#endif\n#endif", envmap_pars_vertex: "#ifdef USE_ENVMAP\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		\n		varying vec3 vWorldPosition;\n	#else\n		varying vec3 vReflect;\n		uniform float refractionRatio;\n	#endif\n#endif", envmap_physical_pars_fragment: "#ifdef USE_ENVMAP\n	vec3 getIBLIrradiance( const in vec3 normal ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );\n			return PI * envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 reflectVec = reflect( - viewDir, normal );\n			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );\n			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n			return envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	#ifdef USE_ANISOTROPY\n		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 bentNormal = cross( bitangent, viewDir );\n				bentNormal = normalize( cross( bentNormal, bitangent ) );\n				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n				return getIBLRadiance( viewDir, bentNormal, roughness );\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n	#endif\n#endif", envmap_vertex: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vWorldPosition = worldPosition.xyz;\n	#else\n		vec3 cameraToVertex;\n		if ( isOrthographic ) {\n			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n		}\n		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vReflect = reflect( cameraToVertex, worldNormal );\n		#else\n			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n		#endif\n	#endif\n#endif", fog_vertex: "#ifdef USE_FOG\n	vFogDepth = - mvPosition.z;\n#endif", fog_pars_vertex: "#ifdef USE_FOG\n	varying float vFogDepth;\n#endif", fog_fragment: "#ifdef USE_FOG\n	#ifdef FOG_EXP2\n		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n	#else\n		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );\n	#endif\n	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif", fog_pars_fragment: "#ifdef USE_FOG\n	uniform vec3 fogColor;\n	varying float vFogDepth;\n	#ifdef FOG_EXP2\n		uniform float fogDensity;\n	#else\n		uniform float fogNear;\n		uniform float fogFar;\n	#endif\n#endif", gradientmap_pars_fragment: "#ifdef USE_GRADIENTMAP\n	uniform sampler2D gradientMap;\n#endif\nvec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {\n	float dotNL = dot( normal, lightDirection );\n	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );\n	#ifdef USE_GRADIENTMAP\n		return vec3( texture2D( gradientMap, coord ).r );\n	#else\n		vec2 fw = fwidth( coord ) * 0.5;\n		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );\n	#endif\n}", lightmap_pars_fragment: "#ifdef USE_LIGHTMAP\n	uniform sampler2D lightMap;\n	uniform float lightMapIntensity;\n#endif", lights_lambert_fragment: "LambertMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularStrength = specularStrength;", lights_lambert_pars_fragment: "varying vec3 vViewPosition;\nstruct LambertMaterial {\n	vec3 diffuseColor;\n	float specularStrength;\n};\nvoid RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Lambert\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert", lights_pars_begin: "uniform bool receiveShadow;\nuniform vec3 ambientLightColor;\n#if defined( USE_LIGHT_PROBES )\n	uniform vec3 lightProbe[ 9 ];\n#endif\nvec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {\n	float x = normal.x, y = normal.y, z = normal.z;\n	vec3 result = shCoefficients[ 0 ] * 0.886227;\n	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;\n	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;\n	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;\n	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;\n	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;\n	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );\n	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;\n	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );\n	return result;\n}\nvec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {\n	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );\n	return irradiance;\n}\nvec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n	vec3 irradiance = ambientLightColor;\n	return irradiance;\n}\nfloat getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n	if ( cutoffDistance > 0.0 ) {\n		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n	}\n	return distanceFalloff;\n}\nfloat getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {\n	return smoothstep( coneCosine, penumbraCosine, angleCosine );\n}\n#if NUM_DIR_LIGHTS > 0\n	struct DirectionalLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];\n	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {\n		light.color = directionalLight.color;\n		light.direction = directionalLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_POINT_LIGHTS > 0\n	struct PointLight {\n		vec3 position;\n		vec3 color;\n		float distance;\n		float decay;\n	};\n	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];\n	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = pointLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float lightDistance = length( lVector );\n		light.color = pointLight.color;\n		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );\n		light.visible = ( light.color != vec3( 0.0 ) );\n	}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n	struct SpotLight {\n		vec3 position;\n		vec3 direction;\n		vec3 color;\n		float distance;\n		float decay;\n		float coneCos;\n		float penumbraCos;\n	};\n	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];\n	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = spotLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float angleCos = dot( light.direction, spotLight.direction );\n		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );\n		if ( spotAttenuation > 0.0 ) {\n			float lightDistance = length( lVector );\n			light.color = spotLight.color * spotAttenuation;\n			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );\n			light.visible = ( light.color != vec3( 0.0 ) );\n		} else {\n			light.color = vec3( 0.0 );\n			light.visible = false;\n		}\n	}\n#endif\n#if NUM_RECT_AREA_LIGHTS > 0\n	struct RectAreaLight {\n		vec3 color;\n		vec3 position;\n		vec3 halfWidth;\n		vec3 halfHeight;\n	};\n	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;\n	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];\n#endif\n#if NUM_HEMI_LIGHTS > 0\n	struct HemisphereLight {\n		vec3 direction;\n		vec3 skyColor;\n		vec3 groundColor;\n	};\n	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];\n	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {\n		float dotNL = dot( normal, hemiLight.direction );\n		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n		return irradiance;\n	}\n#endif", lights_toon_fragment: "ToonMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;", lights_toon_pars_fragment: "varying vec3 vViewPosition;\nstruct ToonMaterial {\n	vec3 diffuseColor;\n};\nvoid RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Toon\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon", lights_phong_fragment: "BlinnPhongMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularColor = specular;\nmaterial.specularShininess = shininess;\nmaterial.specularStrength = specularStrength;", lights_phong_pars_fragment: "varying vec3 vViewPosition;\nstruct BlinnPhongMaterial {\n	vec3 diffuseColor;\n	vec3 specularColor;\n	float specularShininess;\n	float specularStrength;\n};\nvoid RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;\n}\nvoid RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_BlinnPhong\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong", lights_physical_fragment: "PhysicalMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );\nvec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );\nfloat geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );\nmaterial.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;\nmaterial.roughness = min( material.roughness, 1.0 );\n#ifdef IOR\n	material.ior = ior;\n	#ifdef USE_SPECULAR\n		float specularIntensityFactor = specularIntensity;\n		vec3 specularColorFactor = specularColor;\n		#ifdef USE_SPECULAR_COLORMAP\n			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;\n		#endif\n		#ifdef USE_SPECULAR_INTENSITYMAP\n			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;\n		#endif\n		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );\n	#else\n		float specularIntensityFactor = 1.0;\n		vec3 specularColorFactor = vec3( 1.0 );\n		material.specularF90 = 1.0;\n	#endif\n	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );\n#else\n	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );\n	material.specularF90 = 1.0;\n#endif\n#ifdef USE_CLEARCOAT\n	material.clearcoat = clearcoat;\n	material.clearcoatRoughness = clearcoatRoughness;\n	material.clearcoatF0 = vec3( 0.04 );\n	material.clearcoatF90 = 1.0;\n	#ifdef USE_CLEARCOATMAP\n		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;\n	#endif\n	#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;\n	#endif\n	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );\n	material.clearcoatRoughness += geometryRoughness;\n	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );\n#endif\n#ifdef USE_DISPERSION\n	material.dispersion = dispersion;\n#endif\n#ifdef USE_IRIDESCENCE\n	material.iridescence = iridescence;\n	material.iridescenceIOR = iridescenceIOR;\n	#ifdef USE_IRIDESCENCEMAP\n		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;\n	#endif\n	#ifdef USE_IRIDESCENCE_THICKNESSMAP\n		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;\n	#else\n		material.iridescenceThickness = iridescenceThicknessMaximum;\n	#endif\n#endif\n#ifdef USE_SHEEN\n	material.sheenColor = sheenColor;\n	#ifdef USE_SHEEN_COLORMAP\n		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;\n	#endif\n	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	#ifdef USE_ANISOTROPYMAP\n		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );\n		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;\n		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;\n	#else\n		vec2 anisotropyV = anisotropyVector;\n	#endif\n	material.anisotropy = length( anisotropyV );\n	if( material.anisotropy == 0.0 ) {\n		anisotropyV = vec2( 1.0, 0.0 );\n	} else {\n		anisotropyV /= material.anisotropy;\n		material.anisotropy = saturate( material.anisotropy );\n	}\n	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );\n	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;\n	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;\n#endif", lights_physical_pars_fragment: "struct PhysicalMaterial {\n	vec3 diffuseColor;\n	float roughness;\n	vec3 specularColor;\n	float specularF90;\n	float dispersion;\n	#ifdef USE_CLEARCOAT\n		float clearcoat;\n		float clearcoatRoughness;\n		vec3 clearcoatF0;\n		float clearcoatF90;\n	#endif\n	#ifdef USE_IRIDESCENCE\n		float iridescence;\n		float iridescenceIOR;\n		float iridescenceThickness;\n		vec3 iridescenceFresnel;\n		vec3 iridescenceF0;\n	#endif\n	#ifdef USE_SHEEN\n		vec3 sheenColor;\n		float sheenRoughness;\n	#endif\n	#ifdef IOR\n		float ior;\n	#endif\n	#ifdef USE_TRANSMISSION\n		float transmission;\n		float transmissionAlpha;\n		float thickness;\n		float attenuationDistance;\n		vec3 attenuationColor;\n	#endif\n	#ifdef USE_ANISOTROPY\n		float anisotropy;\n		float alphaT;\n		vec3 anisotropyT;\n		vec3 anisotropyB;\n	#endif\n};\nvec3 clearcoatSpecularDirect = vec3( 0.0 );\nvec3 clearcoatSpecularIndirect = vec3( 0.0 );\nvec3 sheenSpecularDirect = vec3( 0.0 );\nvec3 sheenSpecularIndirect = vec3(0.0 );\nvec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {\n    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );\n    float x2 = x * x;\n    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );\n    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );\n}\nfloat V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {\n	float a2 = pow2( alpha );\n	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n	return 0.5 / max( gv + gl, EPSILON );\n}\nfloat D_GGX( const in float alpha, const in float dotNH ) {\n	float a2 = pow2( alpha );\n	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;\n	return RECIPROCAL_PI * a2 / pow2( denom );\n}\n#ifdef USE_ANISOTROPY\n	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {\n		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );\n		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );\n		float v = 0.5 / ( gv + gl );\n		return saturate(v);\n	}\n	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {\n		float a2 = alphaT * alphaB;\n		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );\n		highp float v2 = dot( v, v );\n		float w2 = a2 / v2;\n		return RECIPROCAL_PI * a2 * pow2 ( w2 );\n	}\n#endif\n#ifdef USE_CLEARCOAT\n	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {\n		vec3 f0 = material.clearcoatF0;\n		float f90 = material.clearcoatF90;\n		float roughness = material.clearcoatRoughness;\n		float alpha = pow2( roughness );\n		vec3 halfDir = normalize( lightDir + viewDir );\n		float dotNL = saturate( dot( normal, lightDir ) );\n		float dotNV = saturate( dot( normal, viewDir ) );\n		float dotNH = saturate( dot( normal, halfDir ) );\n		float dotVH = saturate( dot( viewDir, halfDir ) );\n		vec3 F = F_Schlick( f0, f90, dotVH );\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n		return F * ( V * D );\n	}\n#endif\nvec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {\n	vec3 f0 = material.specularColor;\n	float f90 = material.specularF90;\n	float roughness = material.roughness;\n	float alpha = pow2( roughness );\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( f0, f90, dotVH );\n	#ifdef USE_IRIDESCENCE\n		F = mix( F, material.iridescenceFresnel, material.iridescence );\n	#endif\n	#ifdef USE_ANISOTROPY\n		float dotTL = dot( material.anisotropyT, lightDir );\n		float dotTV = dot( material.anisotropyT, viewDir );\n		float dotTH = dot( material.anisotropyT, halfDir );\n		float dotBL = dot( material.anisotropyB, lightDir );\n		float dotBV = dot( material.anisotropyB, viewDir );\n		float dotBH = dot( material.anisotropyB, halfDir );\n		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );\n		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );\n	#else\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n	#endif\n	return F * ( V * D );\n}\nvec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {\n	const float LUT_SIZE = 64.0;\n	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;\n	const float LUT_BIAS = 0.5 / LUT_SIZE;\n	float dotNV = saturate( dot( N, V ) );\n	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );\n	uv = uv * LUT_SCALE + LUT_BIAS;\n	return uv;\n}\nfloat LTC_ClippedSphereFormFactor( const in vec3 f ) {\n	float l = length( f );\n	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );\n}\nvec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {\n	float x = dot( v1, v2 );\n	float y = abs( x );\n	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;\n	float b = 3.4175940 + ( 4.1616724 + y ) * y;\n	float v = a / b;\n	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;\n	return cross( v1, v2 ) * theta_sintheta;\n}\nvec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {\n	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];\n	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];\n	vec3 lightNormal = cross( v1, v2 );\n	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );\n	vec3 T1, T2;\n	T1 = normalize( V - N * dot( V, N ) );\n	T2 = - cross( N, T1 );\n	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );\n	vec3 coords[ 4 ];\n	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );\n	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );\n	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );\n	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );\n	coords[ 0 ] = normalize( coords[ 0 ] );\n	coords[ 1 ] = normalize( coords[ 1 ] );\n	coords[ 2 ] = normalize( coords[ 2 ] );\n	coords[ 3 ] = normalize( coords[ 3 ] );\n	vec3 vectorFormFactor = vec3( 0.0 );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );\n	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );\n	return vec3( result );\n}\n#if defined( USE_SHEEN )\nfloat D_Charlie( float roughness, float dotNH ) {\n	float alpha = pow2( roughness );\n	float invAlpha = 1.0 / alpha;\n	float cos2h = dotNH * dotNH;\n	float sin2h = max( 1.0 - cos2h, 0.0078125 );\n	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );\n}\nfloat V_Neubelt( float dotNV, float dotNL ) {\n	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );\n}\nvec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float D = D_Charlie( sheenRoughness, dotNH );\n	float V = V_Neubelt( dotNV, dotNL );\n	return sheenColor * ( D * V );\n}\n#endif\nfloat IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float r2 = roughness * roughness;\n	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;\n	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;\n	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );\n	return saturate( DG * RECIPROCAL_PI );\n}\nvec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );\n	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );\n	vec4 r = roughness * c0 + c1;\n	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;\n	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;\n	return fab;\n}\nvec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {\n	vec2 fab = DFGApprox( normal, viewDir, roughness );\n	return specularColor * fab.x + specularF90 * fab.y;\n}\n#ifdef USE_IRIDESCENCE\nvoid computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#else\nvoid computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#endif\n	vec2 fab = DFGApprox( normal, viewDir, roughness );\n	#ifdef USE_IRIDESCENCE\n		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );\n	#else\n		vec3 Fr = specularColor;\n	#endif\n	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;\n	float Ess = fab.x + fab.y;\n	float Ems = 1.0 - Ess;\n	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );\n	singleScatter += FssEss;\n	multiScatter += Fms * Ems;\n}\n#if NUM_RECT_AREA_LIGHTS > 0\n	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n		vec3 normal = geometryNormal;\n		vec3 viewDir = geometryViewDir;\n		vec3 position = geometryPosition;\n		vec3 lightPos = rectAreaLight.position;\n		vec3 halfWidth = rectAreaLight.halfWidth;\n		vec3 halfHeight = rectAreaLight.halfHeight;\n		vec3 lightColor = rectAreaLight.color;\n		float roughness = material.roughness;\n		vec3 rectCoords[ 4 ];\n		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;\n		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;\n		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;\n		vec2 uv = LTC_Uv( normal, viewDir, roughness );\n		vec4 t1 = texture2D( ltc_1, uv );\n		vec4 t2 = texture2D( ltc_2, uv );\n		mat3 mInv = mat3(\n			vec3( t1.x, 0, t1.y ),\n			vec3(    0, 1,    0 ),\n			vec3( t1.z, 0, t1.w )\n		);\n		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );\n		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );\n		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );\n	}\n#endif\nvoid RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	#ifdef USE_CLEARCOAT\n		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );\n		vec3 ccIrradiance = dotNLcc * directLight.color;\n		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );\n	#endif\n	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n	#ifdef USE_CLEARCOAT\n		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n	#endif\n	vec3 singleScattering = vec3( 0.0 );\n	vec3 multiScattering = vec3( 0.0 );\n	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );\n	#else\n		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );\n	#endif\n	vec3 totalScattering = singleScattering + multiScattering;\n	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );\n	reflectedLight.indirectSpecular += radiance * singleScattering;\n	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;\n	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;\n}\n#define RE_Direct				RE_Direct_Physical\n#define RE_Direct_RectArea		RE_Direct_RectArea_Physical\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical\n#define RE_IndirectSpecular		RE_IndirectSpecular_Physical\nfloat computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {\n	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n}", lights_fragment_begin: "\nvec3 geometryPosition = - vViewPosition;\nvec3 geometryNormal = normal;\nvec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\nvec3 geometryClearcoatNormal = vec3( 0.0 );\n#ifdef USE_CLEARCOAT\n	geometryClearcoatNormal = clearcoatNormal;\n#endif\n#ifdef USE_IRIDESCENCE\n	float dotNVi = saturate( dot( normal, geometryViewDir ) );\n	if ( material.iridescenceThickness == 0.0 ) {\n		material.iridescence = 0.0;\n	} else {\n		material.iridescence = saturate( material.iridescence );\n	}\n	if ( material.iridescence > 0.0 ) {\n		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );\n		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );\n	}\n#endif\nIncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n	PointLight pointLight;\n	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n		pointLight = pointLights[ i ];\n		getPointLightInfo( pointLight, geometryPosition, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )\n		pointLightShadow = pointLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n	SpotLight spotLight;\n	vec4 spotColor;\n	vec3 spotLightCoord;\n	bool inSpotLightMap;\n	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n		spotLight = spotLights[ i ];\n		getSpotLightInfo( spotLight, geometryPosition, directLight );\n		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX\n		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS\n		#else\n		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#endif\n		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )\n			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;\n			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );\n			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );\n			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;\n		#endif\n		#undef SPOT_LIGHT_MAP_INDEX\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		spotLightShadow = spotLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n	DirectionalLight directionalLight;\n	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n		directionalLight = directionalLights[ i ];\n		getDirectionalLightInfo( directionalLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )\n		directionalLightShadow = directionalLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n	RectAreaLight rectAreaLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n		rectAreaLight = rectAreaLights[ i ];\n		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if defined( RE_IndirectDiffuse )\n	vec3 iblIrradiance = vec3( 0.0 );\n	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n	#if defined( USE_LIGHT_PROBES )\n		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );\n	#endif\n	#if ( NUM_HEMI_LIGHTS > 0 )\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if defined( RE_IndirectSpecular )\n	vec3 radiance = vec3( 0.0 );\n	vec3 clearcoatRadiance = vec3( 0.0 );\n#endif", lights_fragment_maps: "#if defined( RE_IndirectDiffuse )\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;\n		irradiance += lightMapIrradiance;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )\n		iblIrradiance += getIBLIrradiance( geometryNormal );\n	#endif\n#endif\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n	#ifdef USE_ANISOTROPY\n		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n	#else\n		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );\n	#endif\n	#ifdef USE_CLEARCOAT\n		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );\n	#endif\n#endif", lights_fragment_end: "#if defined( RE_IndirectDiffuse )\n	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif\n#if defined( RE_IndirectSpecular )\n	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif", logdepthbuf_fragment: "#if defined( USE_LOGDEPTHBUF )\n	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;\n#endif", logdepthbuf_pars_fragment: "#if defined( USE_LOGDEPTHBUF )\n	uniform float logDepthBufFC;\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif", logdepthbuf_pars_vertex: "#ifdef USE_LOGDEPTHBUF\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif", logdepthbuf_vertex: "#ifdef USE_LOGDEPTHBUF\n	vFragDepth = 1.0 + gl_Position.w;\n	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );\n#endif", map_fragment: "#ifdef USE_MAP\n	vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );\n	#endif\n	diffuseColor *= sampledDiffuseColor;\n#endif", map_pars_fragment: "#ifdef USE_MAP\n	uniform sampler2D map;\n#endif", map_particle_fragment: "#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n	#if defined( USE_POINTS_UV )\n		vec2 uv = vUv;\n	#else\n		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;\n	#endif\n#endif\n#ifdef USE_MAP\n	diffuseColor *= texture2D( map, uv );\n#endif\n#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, uv ).g;\n#endif", map_particle_pars_fragment: "#if defined( USE_POINTS_UV )\n	varying vec2 vUv;\n#else\n	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n		uniform mat3 uvTransform;\n	#endif\n#endif\n#ifdef USE_MAP\n	uniform sampler2D map;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif", metalnessmap_fragment: "float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );\n	metalnessFactor *= texelMetalness.b;\n#endif", metalnessmap_pars_fragment: "#ifdef USE_METALNESSMAP\n	uniform sampler2D metalnessMap;\n#endif", morphinstance_vertex: "#ifdef USE_INSTANCING_MORPH\n	float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;\n	}\n#endif", morphcolor_vertex: "#if defined( USE_MORPHCOLORS )\n	vColor *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		#if defined( USE_COLOR_ALPHA )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];\n		#elif defined( USE_COLOR )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];\n		#endif\n	}\n#endif", morphnormal_vertex: "#ifdef USE_MORPHNORMALS\n	objectNormal *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif", morphtarget_pars_vertex: "#ifdef USE_MORPHTARGETS\n	#ifndef USE_INSTANCING_MORPH\n		uniform float morphTargetBaseInfluence;\n		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	#endif\n	uniform sampler2DArray morphTargetsTexture;\n	uniform ivec2 morphTargetsTextureSize;\n	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {\n		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;\n		int y = texelIndex / morphTargetsTextureSize.x;\n		int x = texelIndex - y * morphTargetsTextureSize.x;\n		ivec3 morphUV = ivec3( x, y, morphTargetIndex );\n		return texelFetch( morphTargetsTexture, morphUV, 0 );\n	}\n#endif", morphtarget_vertex: "#ifdef USE_MORPHTARGETS\n	transformed *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif", normal_fragment_begin: "float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n#ifdef FLAT_SHADED\n	vec3 fdx = dFdx( vViewPosition );\n	vec3 fdy = dFdy( vViewPosition );\n	vec3 normal = normalize( cross( fdx, fdy ) );\n#else\n	vec3 normal = normalize( vNormal );\n	#ifdef DOUBLE_SIDED\n		normal *= faceDirection;\n	#endif\n#endif\n#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )\n	#ifdef USE_TANGENT\n		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn = getTangentFrame( - vViewPosition, normal,\n		#if defined( USE_NORMALMAP )\n			vNormalMapUv\n		#elif defined( USE_CLEARCOAT_NORMALMAP )\n			vClearcoatNormalMapUv\n		#else\n			vUv\n		#endif\n		);\n	#endif\n	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )\n		tbn[0] *= faceDirection;\n		tbn[1] *= faceDirection;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	#ifdef USE_TANGENT\n		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );\n	#endif\n	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )\n		tbn2[0] *= faceDirection;\n		tbn2[1] *= faceDirection;\n	#endif\n#endif\nvec3 nonPerturbedNormal = normal;", normal_fragment_maps: "#ifdef USE_NORMALMAP_OBJECTSPACE\n	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#ifdef FLIP_SIDED\n		normal = - normal;\n	#endif\n	#ifdef DOUBLE_SIDED\n		normal = normal * faceDirection;\n	#endif\n	normal = normalize( normalMatrix * normal );\n#elif defined( USE_NORMALMAP_TANGENTSPACE )\n	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	mapN.xy *= normalScale;\n	normal = normalize( tbn * mapN );\n#elif defined( USE_BUMPMAP )\n	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );\n#endif", normal_pars_fragment: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif", normal_pars_vertex: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif", normal_vertex: "#ifndef FLAT_SHADED\n	vNormal = normalize( transformedNormal );\n	#ifdef USE_TANGENT\n		vTangent = normalize( transformedTangent );\n		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );\n	#endif\n#endif", normalmap_pars_fragment: "#ifdef USE_NORMALMAP\n	uniform sampler2D normalMap;\n	uniform vec2 normalScale;\n#endif\n#ifdef USE_NORMALMAP_OBJECTSPACE\n	uniform mat3 normalMatrix;\n#endif\n#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )\n	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {\n		vec3 q0 = dFdx( eye_pos.xyz );\n		vec3 q1 = dFdy( eye_pos.xyz );\n		vec2 st0 = dFdx( uv.st );\n		vec2 st1 = dFdy( uv.st );\n		vec3 N = surf_norm;\n		vec3 q1perp = cross( q1, N );\n		vec3 q0perp = cross( N, q0 );\n		vec3 T = q1perp * st0.x + q0perp * st1.x;\n		vec3 B = q1perp * st0.y + q0perp * st1.y;\n		float det = max( dot( T, T ), dot( B, B ) );\n		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );\n		return mat3( T * scale, B * scale, N );\n	}\n#endif", clearcoat_normal_fragment_begin: "#ifdef USE_CLEARCOAT\n	vec3 clearcoatNormal = nonPerturbedNormal;\n#endif", clearcoat_normal_fragment_maps: "#ifdef USE_CLEARCOAT_NORMALMAP\n	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;\n	clearcoatMapN.xy *= clearcoatNormalScale;\n	clearcoatNormal = normalize( tbn2 * clearcoatMapN );\n#endif", clearcoat_pars_fragment: "#ifdef USE_CLEARCOATMAP\n	uniform sampler2D clearcoatMap;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform sampler2D clearcoatNormalMap;\n	uniform vec2 clearcoatNormalScale;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform sampler2D clearcoatRoughnessMap;\n#endif", iridescence_pars_fragment: "#ifdef USE_IRIDESCENCEMAP\n	uniform sampler2D iridescenceMap;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform sampler2D iridescenceThicknessMap;\n#endif", opaque_fragment: "#ifdef OPAQUE\ndiffuseColor.a = 1.0;\n#endif\n#ifdef USE_TRANSMISSION\ndiffuseColor.a *= material.transmissionAlpha;\n#endif\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );", packing: "vec3 packNormalToRGB( const in vec3 normal ) {\n	return normalize( normal ) * 0.5 + 0.5;\n}\nvec3 unpackRGBToNormal( const in vec3 rgb ) {\n	return 2.0 * rgb.xyz - 1.0;\n}\nconst float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;\nconst float Inv255 = 1. / 255.;\nconst vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );\nconst vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );\nconst vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );\nconst vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );\nvec4 packDepthToRGBA( const in float v ) {\n	if( v <= 0.0 )\n		return vec4( 0., 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec4( 1., 1., 1., 1. );\n	float vuf;\n	float af = modf( v * PackFactors.a, vuf );\n	float bf = modf( vuf * ShiftRight8, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );\n}\nvec3 packDepthToRGB( const in float v ) {\n	if( v <= 0.0 )\n		return vec3( 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec3( 1., 1., 1. );\n	float vuf;\n	float bf = modf( v * PackFactors.b, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec3( vuf * Inv255, gf * PackUpscale, bf );\n}\nvec2 packDepthToRG( const in float v ) {\n	if( v <= 0.0 )\n		return vec2( 0., 0. );\n	if( v >= 1.0 )\n		return vec2( 1., 1. );\n	float vuf;\n	float gf = modf( v * 256., vuf );\n	return vec2( vuf * Inv255, gf );\n}\nfloat unpackRGBAToDepth( const in vec4 v ) {\n	return dot( v, UnpackFactors4 );\n}\nfloat unpackRGBToDepth( const in vec3 v ) {\n	return dot( v, UnpackFactors3 );\n}\nfloat unpackRGToDepth( const in vec2 v ) {\n	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;\n}\nvec4 pack2HalfToRGBA( const in vec2 v ) {\n	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );\n	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );\n}\nvec2 unpackRGBATo2Half( const in vec4 v ) {\n	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );\n}\nfloat viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( viewZ + near ) / ( near - far );\n}\nfloat orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	return depth * ( near - far ) - near;\n}\nfloat viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );\n}\nfloat perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	return ( near * far ) / ( ( far - near ) * depth - far );\n}", premultiplied_alpha_fragment: "#ifdef PREMULTIPLIED_ALPHA\n	gl_FragColor.rgb *= gl_FragColor.a;\n#endif", project_vertex: "vec4 mvPosition = vec4( transformed, 1.0 );\n#ifdef USE_BATCHING\n	mvPosition = batchingMatrix * mvPosition;\n#endif\n#ifdef USE_INSTANCING\n	mvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition = modelViewMatrix * mvPosition;\ngl_Position = projectionMatrix * mvPosition;", dithering_fragment: "#ifdef DITHERING\n	gl_FragColor.rgb = dithering( gl_FragColor.rgb );\n#endif", dithering_pars_fragment: "#ifdef DITHERING\n	vec3 dithering( vec3 color ) {\n		float grid_position = rand( gl_FragCoord.xy );\n		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );\n		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );\n		return color + dither_shift_RGB;\n	}\n#endif", roughnessmap_fragment: "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n	roughnessFactor *= texelRoughness.g;\n#endif", roughnessmap_pars_fragment: "#ifdef USE_ROUGHNESSMAP\n	uniform sampler2D roughnessMap;\n#endif", shadowmap_pars_fragment: "#if NUM_SPOT_LIGHT_COORDS > 0\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#if NUM_SPOT_LIGHT_MAPS > 0\n	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {\n		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );\n	}\n	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {\n		return unpackRGBATo2Half( texture2D( shadow, uv ) );\n	}\n	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){\n		float occlusion = 1.0;\n		vec2 distribution = texture2DDistribution( shadow, uv );\n		float hard_shadow = step( compare , distribution.x );\n		if (hard_shadow != 1.0 ) {\n			float distance = compare - distribution.x ;\n			float variance = max( 0.00000, distribution.y * distribution.y );\n			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );\n		}\n		return occlusion;\n	}\n	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n		float shadow = 1.0;\n		shadowCoord.xyz /= shadowCoord.w;\n		shadowCoord.z += shadowBias;\n		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n		if ( frustumTest ) {\n		#if defined( SHADOWMAP_TYPE_PCF )\n			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n			float dx0 = - texelSize.x * shadowRadius;\n			float dy0 = - texelSize.y * shadowRadius;\n			float dx1 = + texelSize.x * shadowRadius;\n			float dy1 = + texelSize.y * shadowRadius;\n			float dx2 = dx0 / 2.0;\n			float dy2 = dy0 / 2.0;\n			float dx3 = dx1 / 2.0;\n			float dy3 = dy1 / 2.0;\n			shadow = (\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )\n			) * ( 1.0 / 17.0 );\n		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n			float dx = texelSize.x;\n			float dy = texelSize.y;\n			vec2 uv = shadowCoord.xy;\n			vec2 f = fract( uv * shadowMapSize + 0.5 );\n			uv -= f * texelSize;\n			shadow = (\n				texture2DCompare( shadowMap, uv, shadowCoord.z ) +\n				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),\n					 f.x ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),\n					 f.x ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),\n					 f.y ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),\n					 f.y ) +\n				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),\n						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),\n						  f.x ),\n					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),\n						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),\n						  f.x ),\n					 f.y )\n			) * ( 1.0 / 9.0 );\n		#elif defined( SHADOWMAP_TYPE_VSM )\n			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );\n		#else\n			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );\n		#endif\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	vec2 cubeToUV( vec3 v, float texelSizeY ) {\n		vec3 absV = abs( v );\n		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );\n		absV *= scaleToCube;\n		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );\n		vec2 planar = v.xy;\n		float almostATexel = 1.5 * texelSizeY;\n		float almostOne = 1.0 - almostATexel;\n		if ( absV.z >= almostOne ) {\n			if ( v.z > 0.0 )\n				planar.x = 4.0 - v.x;\n		} else if ( absV.x >= almostOne ) {\n			float signX = sign( v.x );\n			planar.x = v.z * signX + 2.0 * signX;\n		} else if ( absV.y >= almostOne ) {\n			float signY = sign( v.y );\n			planar.x = v.x + 2.0 * signY + 2.0;\n			planar.y = v.z * signY - 2.0;\n		}\n		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );\n	}\n	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		\n		float lightToPositionLength = length( lightToPosition );\n		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {\n			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;\n			vec3 bd3D = normalize( lightToPosition );\n			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );\n			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )\n				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;\n				shadow = (\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )\n				) * ( 1.0 / 9.0 );\n			#else\n				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );\n			#endif\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n#endif", shadowmap_pars_vertex: "#if NUM_SPOT_LIGHT_COORDS > 0\n	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n#endif", shadowmap_vertex: "#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )\n	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\n	vec4 shadowWorldPosition;\n#endif\n#if defined( USE_SHADOWMAP )\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );\n			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );\n			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if NUM_SPOT_LIGHT_COORDS > 0\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {\n		shadowWorldPosition = worldPosition;\n		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;\n		#endif\n		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;\n	}\n	#pragma unroll_loop_end\n#endif", shadowmask_pars_fragment: "float getShadowMask() {\n	float shadow = 1.0;\n	#ifdef USE_SHADOWMAP\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n		directionalLight = directionalLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {\n		spotLight = spotLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n		pointLight = pointLightShadows[ i ];\n		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#endif\n	return shadow;\n}", skinbase_vertex: "#ifdef USE_SKINNING\n	mat4 boneMatX = getBoneMatrix( skinIndex.x );\n	mat4 boneMatY = getBoneMatrix( skinIndex.y );\n	mat4 boneMatZ = getBoneMatrix( skinIndex.z );\n	mat4 boneMatW = getBoneMatrix( skinIndex.w );\n#endif", skinning_pars_vertex: "#ifdef USE_SKINNING\n	uniform mat4 bindMatrix;\n	uniform mat4 bindMatrixInverse;\n	uniform highp sampler2D boneTexture;\n	mat4 getBoneMatrix( const in float i ) {\n		int size = textureSize( boneTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n#endif", skinning_vertex: "#ifdef USE_SKINNING\n	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n	vec4 skinned = vec4( 0.0 );\n	skinned += boneMatX * skinVertex * skinWeight.x;\n	skinned += boneMatY * skinVertex * skinWeight.y;\n	skinned += boneMatZ * skinVertex * skinWeight.z;\n	skinned += boneMatW * skinVertex * skinWeight.w;\n	transformed = ( bindMatrixInverse * skinned ).xyz;\n#endif", skinnormal_vertex: "#ifdef USE_SKINNING\n	mat4 skinMatrix = mat4( 0.0 );\n	skinMatrix += skinWeight.x * boneMatX;\n	skinMatrix += skinWeight.y * boneMatY;\n	skinMatrix += skinWeight.z * boneMatZ;\n	skinMatrix += skinWeight.w * boneMatW;\n	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;\n	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n	#ifdef USE_TANGENT\n		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;\n	#endif\n#endif", specularmap_fragment: "float specularStrength;\n#ifdef USE_SPECULARMAP\n	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );\n	specularStrength = texelSpecular.r;\n#else\n	specularStrength = 1.0;\n#endif", specularmap_pars_fragment: "#ifdef USE_SPECULARMAP\n	uniform sampler2D specularMap;\n#endif", tonemapping_fragment: "#if defined( TONE_MAPPING )\n	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#endif", tonemapping_pars_fragment: "#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\nuniform float toneMappingExposure;\nvec3 LinearToneMapping( vec3 color ) {\n	return saturate( toneMappingExposure * color );\n}\nvec3 ReinhardToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	return saturate( color / ( vec3( 1.0 ) + color ) );\n}\nvec3 CineonToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	color = max( vec3( 0.0 ), color - 0.004 );\n	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );\n}\nvec3 RRTAndODTFit( vec3 v ) {\n	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;\n	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;\n	return a / b;\n}\nvec3 ACESFilmicToneMapping( vec3 color ) {\n	const mat3 ACESInputMat = mat3(\n		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),\n		vec3( 0.04823, 0.01566, 0.83777 )\n	);\n	const mat3 ACESOutputMat = mat3(\n		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),\n		vec3( -0.07367, -0.00605,  1.07602 )\n	);\n	color *= toneMappingExposure / 0.6;\n	color = ACESInputMat * color;\n	color = RRTAndODTFit( color );\n	color = ACESOutputMat * color;\n	return saturate( color );\n}\nconst mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(\n	vec3( 1.6605, - 0.1246, - 0.0182 ),\n	vec3( - 0.5876, 1.1329, - 0.1006 ),\n	vec3( - 0.0728, - 0.0083, 1.1187 )\n);\nconst mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(\n	vec3( 0.6274, 0.0691, 0.0164 ),\n	vec3( 0.3293, 0.9195, 0.0880 ),\n	vec3( 0.0433, 0.0113, 0.8956 )\n);\nvec3 agxDefaultContrastApprox( vec3 x ) {\n	vec3 x2 = x * x;\n	vec3 x4 = x2 * x2;\n	return + 15.5 * x4 * x2\n		- 40.14 * x4 * x\n		+ 31.96 * x4\n		- 6.868 * x2 * x\n		+ 0.4298 * x2\n		+ 0.1191 * x\n		- 0.00232;\n}\nvec3 AgXToneMapping( vec3 color ) {\n	const mat3 AgXInsetMatrix = mat3(\n		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),\n		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),\n		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )\n	);\n	const mat3 AgXOutsetMatrix = mat3(\n		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),\n		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),\n		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )\n	);\n	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;\n	color *= toneMappingExposure;\n	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;\n	color = AgXInsetMatrix * color;\n	color = max( color, 1e-10 );	color = log2( color );\n	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );\n	color = clamp( color, 0.0, 1.0 );\n	color = agxDefaultContrastApprox( color );\n	color = AgXOutsetMatrix * color;\n	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );\n	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;\n	color = clamp( color, 0.0, 1.0 );\n	return color;\n}\nvec3 NeutralToneMapping( vec3 color ) {\n	const float StartCompression = 0.8 - 0.04;\n	const float Desaturation = 0.15;\n	color *= toneMappingExposure;\n	float x = min( color.r, min( color.g, color.b ) );\n	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n	color -= offset;\n	float peak = max( color.r, max( color.g, color.b ) );\n	if ( peak < StartCompression ) return color;\n	float d = 1. - StartCompression;\n	float newPeak = 1. - d * d / ( peak + d - StartCompression );\n	color *= newPeak / peak;\n	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n	return mix( color, vec3( newPeak ), g );\n}\nvec3 CustomToneMapping( vec3 color ) { return color; }", transmission_fragment: "#ifdef USE_TRANSMISSION\n	material.transmission = transmission;\n	material.transmissionAlpha = 1.0;\n	material.thickness = thickness;\n	material.attenuationDistance = attenuationDistance;\n	material.attenuationColor = attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n	#endif\n	vec3 pos = vWorldPosition;\n	vec3 v = normalize( cameraPosition - pos );\n	vec3 n = inverseTransformDirection( normal, viewMatrix );\n	vec4 transmitted = getIBLVolumeRefraction(\n		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,\n		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,\n		material.attenuationColor, material.attenuationDistance );\n	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );\n	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );\n#endif", transmission_pars_fragment: "#ifdef USE_TRANSMISSION\n	uniform float transmission;\n	uniform float thickness;\n	uniform float attenuationDistance;\n	uniform vec3 attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		uniform sampler2D transmissionMap;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		uniform sampler2D thicknessMap;\n	#endif\n	uniform vec2 transmissionSamplerSize;\n	uniform sampler2D transmissionSamplerMap;\n	uniform mat4 modelMatrix;\n	uniform mat4 projectionMatrix;\n	varying vec3 vWorldPosition;\n	float w0( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );\n	}\n	float w1( float a ) {\n		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );\n	}\n	float w2( float a ){\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );\n	}\n	float w3( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * a * a );\n	}\n	float g0( float a ) {\n		return w0( a ) + w1( a );\n	}\n	float g1( float a ) {\n		return w2( a ) + w3( a );\n	}\n	float h0( float a ) {\n		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );\n	}\n	float h1( float a ) {\n		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );\n	}\n	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {\n		uv = uv * texelSize.zw + 0.5;\n		vec2 iuv = floor( uv );\n		vec2 fuv = fract( uv );\n		float g0x = g0( fuv.x );\n		float g1x = g1( fuv.x );\n		float h0x = h0( fuv.x );\n		float h1x = h1( fuv.x );\n		float h0y = h0( fuv.y );\n		float h1y = h1( fuv.y );\n		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +\n			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );\n	}\n	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {\n		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );\n		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );\n		vec2 fLodSizeInv = 1.0 / fLodSize;\n		vec2 cLodSizeInv = 1.0 / cLodSize;\n		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );\n		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );\n		return mix( fSample, cSample, fract( lod ) );\n	}\n	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {\n		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );\n		vec3 modelScale;\n		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );\n		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );\n		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );\n		return normalize( refractionVector ) * thickness * modelScale;\n	}\n	float applyIorToRoughness( const in float roughness, const in float ior ) {\n		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );\n	}\n	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {\n		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );\n		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );\n	}\n	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {\n		if ( isinf( attenuationDistance ) ) {\n			return vec3( 1.0 );\n		} else {\n			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;\n			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;\n		}\n	}\n	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,\n		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,\n		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,\n		const in vec3 attenuationColor, const in float attenuationDistance ) {\n		vec4 transmittedLight;\n		vec3 transmittance;\n		#ifdef USE_DISPERSION\n			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;\n			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );\n			for ( int i = 0; i < 3; i ++ ) {\n				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );\n				vec3 refractedRayExit = position + transmissionRay;\n		\n				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n				vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n				refractionCoords += 1.0;\n				refractionCoords /= 2.0;\n		\n				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );\n				transmittedLight[ i ] = transmissionSample[ i ];\n				transmittedLight.a += transmissionSample.a;\n				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];\n			}\n			transmittedLight.a /= 3.0;\n		\n		#else\n		\n			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );\n			vec3 refractedRayExit = position + transmissionRay;\n			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n			vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n			refractionCoords += 1.0;\n			refractionCoords /= 2.0;\n			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );\n			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );\n		\n		#endif\n		vec3 attenuatedColor = transmittance * transmittedLight.rgb;\n		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );\n		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;\n		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );\n	}\n#endif", uv_pars_fragment: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif", uv_pars_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	uniform mat3 mapTransform;\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform mat3 alphaMapTransform;\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	uniform mat3 lightMapTransform;\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	uniform mat3 aoMapTransform;\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	uniform mat3 bumpMapTransform;\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	uniform mat3 normalMapTransform;\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	uniform mat3 displacementMapTransform;\n	varying vec2 vDisplacementMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	uniform mat3 emissiveMapTransform;\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	uniform mat3 metalnessMapTransform;\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	uniform mat3 roughnessMapTransform;\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	uniform mat3 anisotropyMapTransform;\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	uniform mat3 clearcoatMapTransform;\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform mat3 clearcoatNormalMapTransform;\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform mat3 clearcoatRoughnessMapTransform;\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	uniform mat3 sheenColorMapTransform;\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	uniform mat3 sheenRoughnessMapTransform;\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	uniform mat3 iridescenceMapTransform;\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform mat3 iridescenceThicknessMapTransform;\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	uniform mat3 specularMapTransform;\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	uniform mat3 specularColorMapTransform;\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	uniform mat3 specularIntensityMapTransform;\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif", uv_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	vUv = vec3( uv, 1 ).xy;\n#endif\n#ifdef USE_MAP\n	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ALPHAMAP\n	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_LIGHTMAP\n	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_AOMAP\n	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_BUMPMAP\n	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_NORMALMAP\n	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_EMISSIVEMAP\n	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_METALNESSMAP\n	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOATMAP\n	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULARMAP\n	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_THICKNESSMAP\n	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;\n#endif", worldpos_vertex: "#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n	vec4 worldPosition = vec4( transformed, 1.0 );\n	#ifdef USE_BATCHING\n		worldPosition = batchingMatrix * worldPosition;\n	#endif\n	#ifdef USE_INSTANCING\n		worldPosition = instanceMatrix * worldPosition;\n	#endif\n	worldPosition = modelMatrix * worldPosition;\n#endif", background_vert: "varying vec2 vUv;\nuniform mat3 uvTransform;\nvoid main() {\n	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	gl_Position = vec4( position.xy, 1.0, 1.0 );\n}", background_frag: "uniform sampler2D t2D;\nuniform float backgroundIntensity;\nvarying vec2 vUv;\nvoid main() {\n	vec4 texColor = texture2D( t2D, vUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}", backgroundCube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}", backgroundCube_frag: "#ifdef ENVMAP_TYPE_CUBE\n	uniform samplerCube envMap;\n#elif defined( ENVMAP_TYPE_CUBE_UV )\n	uniform sampler2D envMap;\n#endif\nuniform float flipEnvMap;\nuniform float backgroundBlurriness;\nuniform float backgroundIntensity;\nuniform mat3 backgroundRotation;\nvarying vec3 vWorldDirection;\n#include <cube_uv_reflection_fragment>\nvoid main() {\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );\n	#elif defined( ENVMAP_TYPE_CUBE_UV )\n		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );\n	#else\n		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}", cube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}", cube_frag: "uniform samplerCube tCube;\nuniform float tFlip;\nuniform float opacity;\nvarying vec3 vWorldDirection;\nvoid main() {\n	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );\n	gl_FragColor = texColor;\n	gl_FragColor.a *= opacity;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}", depth_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vHighPrecisionZW = gl_Position.zw;\n}", depth_frag: "#if DEPTH_PACKING == 3200\n	uniform float opacity;\n#endif\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#if DEPTH_PACKING == 3200\n		diffuseColor.a = opacity;\n	#endif\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <logdepthbuf_fragment>\n	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;\n	#if DEPTH_PACKING == 3200\n		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );\n	#elif DEPTH_PACKING == 3201\n		gl_FragColor = packDepthToRGBA( fragCoordZ );\n	#elif DEPTH_PACKING == 3202\n		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );\n	#elif DEPTH_PACKING == 3203\n		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );\n	#endif\n}", distanceRGBA_vert: "#define DISTANCE\nvarying vec3 vWorldPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <worldpos_vertex>\n	#include <clipping_planes_vertex>\n	vWorldPosition = worldPosition.xyz;\n}", distanceRGBA_frag: "#define DISTANCE\nuniform vec3 referencePosition;\nuniform float nearDistance;\nuniform float farDistance;\nvarying vec3 vWorldPosition;\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main () {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	float dist = length( vWorldPosition - referencePosition );\n	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n	dist = saturate( dist );\n	gl_FragColor = packDepthToRGBA( dist );\n}", equirect_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n}", equirect_frag: "uniform sampler2D tEquirect;\nvarying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vec3 direction = normalize( vWorldDirection );\n	vec2 sampleUV = equirectUv( direction );\n	gl_FragColor = texture2D( tEquirect, sampleUV );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}", linedashed_vert: "uniform float scale;\nattribute float lineDistance;\nvarying float vLineDistance;\n#include <common>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	vLineDistance = scale * lineDistance;\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}", linedashed_frag: "uniform vec3 diffuse;\nuniform float opacity;\nuniform float dashSize;\nuniform float totalSize;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	if ( mod( vLineDistance, totalSize ) > dashSize ) {\n		discard;\n	}\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}", meshbasic_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinbase_vertex>\n		#include <skinnormal_vertex>\n		#include <defaultnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <fog_vertex>\n}", meshbasic_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n#endif\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;\n	#else\n		reflectedLight.indirectDiffuse += vec3( 1.0 );\n	#endif\n	#include <aomap_fragment>\n	reflectedLight.indirectDiffuse *= diffuseColor.rgb;\n	vec3 outgoingLight = reflectedLight.indirectDiffuse;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}", meshlambert_vert: "#define LAMBERT\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}", meshlambert_frag: "#define LAMBERT\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_lambert_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_lambert_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}", meshmatcap_vert: "#define MATCAP\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n	vViewPosition = - mvPosition.xyz;\n}", meshmatcap_frag: "#define MATCAP\nuniform vec3 diffuse;\nuniform float opacity;\nuniform sampler2D matcap;\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	vec3 viewDir = normalize( vViewPosition );\n	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );\n	vec3 y = cross( viewDir, x );\n	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;\n	#ifdef USE_MATCAP\n		vec4 matcapColor = texture2D( matcap, uv );\n	#else\n		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );\n	#endif\n	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}", meshnormal_vert: "#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	vViewPosition = - mvPosition.xyz;\n#endif\n}", meshnormal_frag: "#define NORMAL\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <packing>\n#include <uv_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );\n	#ifdef OPAQUE\n		gl_FragColor.a = 1.0;\n	#endif\n}", meshphong_vert: "#define PHONG\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}", meshphong_frag: "#define PHONG\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform vec3 specular;\nuniform float shininess;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_phong_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_phong_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}", meshphysical_vert: "#define STANDARD\nvarying vec3 vViewPosition;\n#ifdef USE_TRANSMISSION\n	varying vec3 vWorldPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n#ifdef USE_TRANSMISSION\n	vWorldPosition = worldPosition.xyz;\n#endif\n}", meshphysical_frag: "#define STANDARD\n#ifdef PHYSICAL\n	#define IOR\n	#define USE_SPECULAR\n#endif\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifdef IOR\n	uniform float ior;\n#endif\n#ifdef USE_SPECULAR\n	uniform float specularIntensity;\n	uniform vec3 specularColor;\n	#ifdef USE_SPECULAR_COLORMAP\n		uniform sampler2D specularColorMap;\n	#endif\n	#ifdef USE_SPECULAR_INTENSITYMAP\n		uniform sampler2D specularIntensityMap;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT\n	uniform float clearcoat;\n	uniform float clearcoatRoughness;\n#endif\n#ifdef USE_DISPERSION\n	uniform float dispersion;\n#endif\n#ifdef USE_IRIDESCENCE\n	uniform float iridescence;\n	uniform float iridescenceIOR;\n	uniform float iridescenceThicknessMinimum;\n	uniform float iridescenceThicknessMaximum;\n#endif\n#ifdef USE_SHEEN\n	uniform vec3 sheenColor;\n	uniform float sheenRoughness;\n	#ifdef USE_SHEEN_COLORMAP\n		uniform sampler2D sheenColorMap;\n	#endif\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		uniform sampler2D sheenRoughnessMap;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	uniform vec2 anisotropyVector;\n	#ifdef USE_ANISOTROPYMAP\n		uniform sampler2D anisotropyMap;\n	#endif\n#endif\nvarying vec3 vViewPosition;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <iridescence_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_physical_pars_fragment>\n#include <transmission_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <clearcoat_pars_fragment>\n#include <iridescence_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <roughnessmap_fragment>\n	#include <metalnessmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <clearcoat_normal_fragment_begin>\n	#include <clearcoat_normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_physical_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;\n	#include <transmission_fragment>\n	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;\n	#ifdef USE_SHEEN\n		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );\n		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;\n	#endif\n	#ifdef USE_CLEARCOAT\n		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );\n		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );\n		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;\n	#endif\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}", meshtoon_vert: "#define TOON\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}", meshtoon_frag: "#define TOON\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <gradientmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_toon_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_toon_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}", points_vert: "uniform float size;\nuniform float scale;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#ifdef USE_POINTS_UV\n	varying vec2 vUv;\n	uniform mat3 uvTransform;\n#endif\nvoid main() {\n	#ifdef USE_POINTS_UV\n		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	#endif\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	gl_PointSize = size;\n	#ifdef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );\n	#endif\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <fog_vertex>\n}", points_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <color_pars_fragment>\n#include <map_particle_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_particle_fragment>\n	#include <color_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}", shadow_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <shadowmap_pars_vertex>\nvoid main() {\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}", shadow_frag: "uniform vec3 color;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <logdepthbuf_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\nvoid main() {\n	#include <logdepthbuf_fragment>\n	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}", sprite_vert: "uniform float rotation;\nuniform vec2 center;\n#include <common>\n#include <uv_pars_vertex>\n#include <fog_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	vec4 mvPosition = modelViewMatrix[ 3 ];\n	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );\n	#ifndef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) scale *= - mvPosition.z;\n	#endif\n	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;\n	vec2 rotatedPosition;\n	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;\n	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;\n	mvPosition.xy += rotatedPosition;\n	gl_Position = projectionMatrix * mvPosition;\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}", sprite_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}" };
  var da = { common: { diffuse: { value: new Kr(16777215) }, opacity: { value: 1 }, map: { value: null }, mapTransform: { value: new Kn() }, alphaMap: { value: null }, alphaMapTransform: { value: new Kn() }, alphaTest: { value: 0 } }, specularmap: { specularMap: { value: null }, specularMapTransform: { value: new Kn() } }, envmap: { envMap: { value: null }, envMapRotation: { value: new Kn() }, flipEnvMap: { value: -1 }, reflectivity: { value: 1 }, ior: { value: 1.5 }, refractionRatio: { value: 0.98 } }, aomap: { aoMap: { value: null }, aoMapIntensity: { value: 1 }, aoMapTransform: { value: new Kn() } }, lightmap: { lightMap: { value: null }, lightMapIntensity: { value: 1 }, lightMapTransform: { value: new Kn() } }, bumpmap: { bumpMap: { value: null }, bumpMapTransform: { value: new Kn() }, bumpScale: { value: 1 } }, normalmap: { normalMap: { value: null }, normalMapTransform: { value: new Kn() }, normalScale: { value: new Jn(1, 1) } }, displacementmap: { displacementMap: { value: null }, displacementMapTransform: { value: new Kn() }, displacementScale: { value: 1 }, displacementBias: { value: 0 } }, emissivemap: { emissiveMap: { value: null }, emissiveMapTransform: { value: new Kn() } }, metalnessmap: { metalnessMap: { value: null }, metalnessMapTransform: { value: new Kn() } }, roughnessmap: { roughnessMap: { value: null }, roughnessMapTransform: { value: new Kn() } }, gradientmap: { gradientMap: { value: null } }, fog: { fogDensity: { value: 25e-5 }, fogNear: { value: 1 }, fogFar: { value: 2e3 }, fogColor: { value: new Kr(16777215) } }, lights: { ambientLightColor: { value: [] }, lightProbe: { value: [] }, directionalLights: { value: [], properties: { direction: {}, color: {} } }, directionalLightShadows: { value: [], properties: { shadowIntensity: 1, shadowBias: {}, shadowNormalBias: {}, shadowRadius: {}, shadowMapSize: {} } }, directionalShadowMap: { value: [] }, directionalShadowMatrix: { value: [] }, spotLights: { value: [], properties: { color: {}, position: {}, direction: {}, distance: {}, coneCos: {}, penumbraCos: {}, decay: {} } }, spotLightShadows: { value: [], properties: { shadowIntensity: 1, shadowBias: {}, shadowNormalBias: {}, shadowRadius: {}, shadowMapSize: {} } }, spotLightMap: { value: [] }, spotShadowMap: { value: [] }, spotLightMatrix: { value: [] }, pointLights: { value: [], properties: { color: {}, position: {}, decay: {}, distance: {} } }, pointLightShadows: { value: [], properties: { shadowIntensity: 1, shadowBias: {}, shadowNormalBias: {}, shadowRadius: {}, shadowMapSize: {}, shadowCameraNear: {}, shadowCameraFar: {} } }, pointShadowMap: { value: [] }, pointShadowMatrix: { value: [] }, hemisphereLights: { value: [], properties: { direction: {}, skyColor: {}, groundColor: {} } }, rectAreaLights: { value: [], properties: { color: {}, position: {}, width: {}, height: {} } }, ltc_1: { value: null }, ltc_2: { value: null } }, points: { diffuse: { value: new Kr(16777215) }, opacity: { value: 1 }, size: { value: 1 }, scale: { value: 1 }, map: { value: null }, alphaMap: { value: null }, alphaMapTransform: { value: new Kn() }, alphaTest: { value: 0 }, uvTransform: { value: new Kn() } }, sprite: { diffuse: { value: new Kr(16777215) }, opacity: { value: 1 }, center: { value: new Jn(0.5, 0.5) }, rotation: { value: 0 }, map: { value: null }, mapTransform: { value: new Kn() }, alphaMap: { value: null }, alphaMapTransform: { value: new Kn() }, alphaTest: { value: 0 } } };
  var pa = { basic: { uniforms: Hs([da.common, da.specularmap, da.envmap, da.aomap, da.lightmap, da.fog]), vertexShader: ua.meshbasic_vert, fragmentShader: ua.meshbasic_frag }, lambert: { uniforms: Hs([da.common, da.specularmap, da.envmap, da.aomap, da.lightmap, da.emissivemap, da.bumpmap, da.normalmap, da.displacementmap, da.fog, da.lights, { emissive: { value: new Kr(0) } }]), vertexShader: ua.meshlambert_vert, fragmentShader: ua.meshlambert_frag }, phong: { uniforms: Hs([da.common, da.specularmap, da.envmap, da.aomap, da.lightmap, da.emissivemap, da.bumpmap, da.normalmap, da.displacementmap, da.fog, da.lights, { emissive: { value: new Kr(0) }, specular: { value: new Kr(1118481) }, shininess: { value: 30 } }]), vertexShader: ua.meshphong_vert, fragmentShader: ua.meshphong_frag }, standard: { uniforms: Hs([da.common, da.envmap, da.aomap, da.lightmap, da.emissivemap, da.bumpmap, da.normalmap, da.displacementmap, da.roughnessmap, da.metalnessmap, da.fog, da.lights, { emissive: { value: new Kr(0) }, roughness: { value: 1 }, metalness: { value: 0 }, envMapIntensity: { value: 1 } }]), vertexShader: ua.meshphysical_vert, fragmentShader: ua.meshphysical_frag }, toon: { uniforms: Hs([da.common, da.aomap, da.lightmap, da.emissivemap, da.bumpmap, da.normalmap, da.displacementmap, da.gradientmap, da.fog, da.lights, { emissive: { value: new Kr(0) } }]), vertexShader: ua.meshtoon_vert, fragmentShader: ua.meshtoon_frag }, matcap: { uniforms: Hs([da.common, da.bumpmap, da.normalmap, da.displacementmap, da.fog, { matcap: { value: null } }]), vertexShader: ua.meshmatcap_vert, fragmentShader: ua.meshmatcap_frag }, points: { uniforms: Hs([da.points, da.fog]), vertexShader: ua.points_vert, fragmentShader: ua.points_frag }, dashed: { uniforms: Hs([da.common, da.fog, { scale: { value: 1 }, dashSize: { value: 1 }, totalSize: { value: 2 } }]), vertexShader: ua.linedashed_vert, fragmentShader: ua.linedashed_frag }, depth: { uniforms: Hs([da.common, da.displacementmap]), vertexShader: ua.depth_vert, fragmentShader: ua.depth_frag }, normal: { uniforms: Hs([da.common, da.bumpmap, da.normalmap, da.displacementmap, { opacity: { value: 1 } }]), vertexShader: ua.meshnormal_vert, fragmentShader: ua.meshnormal_frag }, sprite: { uniforms: Hs([da.sprite, da.fog]), vertexShader: ua.sprite_vert, fragmentShader: ua.sprite_frag }, background: { uniforms: { uvTransform: { value: new Kn() }, t2D: { value: null }, backgroundIntensity: { value: 1 } }, vertexShader: ua.background_vert, fragmentShader: ua.background_frag }, backgroundCube: { uniforms: { envMap: { value: null }, flipEnvMap: { value: -1 }, backgroundBlurriness: { value: 0 }, backgroundIntensity: { value: 1 }, backgroundRotation: { value: new Kn() } }, vertexShader: ua.backgroundCube_vert, fragmentShader: ua.backgroundCube_frag }, cube: { uniforms: { tCube: { value: null }, tFlip: { value: -1 }, opacity: { value: 1 } }, vertexShader: ua.cube_vert, fragmentShader: ua.cube_frag }, equirect: { uniforms: { tEquirect: { value: null } }, vertexShader: ua.equirect_vert, fragmentShader: ua.equirect_frag }, distanceRGBA: { uniforms: Hs([da.common, da.displacementmap, { referencePosition: { value: new Ci() }, nearDistance: { value: 1 }, farDistance: { value: 1e3 } }]), vertexShader: ua.distanceRGBA_vert, fragmentShader: ua.distanceRGBA_frag }, shadow: { uniforms: Hs([da.lights, da.fog, { color: { value: new Kr(0) }, opacity: { value: 1 } }]), vertexShader: ua.shadow_vert, fragmentShader: ua.shadow_frag } };
  pa.physical = { uniforms: Hs([pa.standard.uniforms, { clearcoat: { value: 0 }, clearcoatMap: { value: null }, clearcoatMapTransform: { value: new Kn() }, clearcoatNormalMap: { value: null }, clearcoatNormalMapTransform: { value: new Kn() }, clearcoatNormalScale: { value: new Jn(1, 1) }, clearcoatRoughness: { value: 0 }, clearcoatRoughnessMap: { value: null }, clearcoatRoughnessMapTransform: { value: new Kn() }, dispersion: { value: 0 }, iridescence: { value: 0 }, iridescenceMap: { value: null }, iridescenceMapTransform: { value: new Kn() }, iridescenceIOR: { value: 1.3 }, iridescenceThicknessMinimum: { value: 100 }, iridescenceThicknessMaximum: { value: 400 }, iridescenceThicknessMap: { value: null }, iridescenceThicknessMapTransform: { value: new Kn() }, sheen: { value: 0 }, sheenColor: { value: new Kr(0) }, sheenColorMap: { value: null }, sheenColorMapTransform: { value: new Kn() }, sheenRoughness: { value: 1 }, sheenRoughnessMap: { value: null }, sheenRoughnessMapTransform: { value: new Kn() }, transmission: { value: 0 }, transmissionMap: { value: null }, transmissionMapTransform: { value: new Kn() }, transmissionSamplerSize: { value: new Jn() }, transmissionSamplerMap: { value: null }, thickness: { value: 0 }, thicknessMap: { value: null }, thicknessMapTransform: { value: new Kn() }, attenuationDistance: { value: 0 }, attenuationColor: { value: new Kr(0) }, specularColor: { value: new Kr(1, 1, 1) }, specularColorMap: { value: null }, specularColorMapTransform: { value: new Kn() }, specularIntensity: { value: 1 }, specularIntensityMap: { value: null }, specularIntensityMapTransform: { value: new Kn() }, anisotropyVector: { value: new Jn() }, anisotropyMap: { value: null }, anisotropyMapTransform: { value: new Kn() } }]), vertexShader: ua.meshphysical_vert, fragmentShader: ua.meshphysical_frag };
  var ma = { r: 0, b: 0, g: 0 };
  var fa = new fr();
  var ga = new sr();
  function va(t2, e2, n, i, r, s, a) {
    const o = new Kr(0);
    let l, c, h = true === s ? 0 : 1, u2 = null, d2 = 0, p2 = null;
    function m(t3) {
      let i2 = true === t3.isScene ? t3.background : null;
      if (i2 && i2.isTexture) {
        i2 = (t3.backgroundBlurriness > 0 ? n : e2).get(i2);
      }
      return i2;
    }
    function f(e3, n2) {
      e3.getRGB(ma, Gs(t2)), i.buffers.color.setClear(ma.r, ma.g, ma.b, n2, a);
    }
    return { getClearColor: function() {
      return o;
    }, setClearColor: function(t3, e3 = 1) {
      o.set(t3), h = e3, f(o, h);
    }, getClearAlpha: function() {
      return h;
    }, setClearAlpha: function(t3) {
      h = t3, f(o, h);
    }, render: function(e3) {
      let n2 = false;
      const r2 = m(e3);
      null === r2 ? f(o, h) : r2 && r2.isColor && (f(r2, 1), n2 = true);
      const s2 = t2.xr.getEnvironmentBlendMode();
      "additive" === s2 ? i.buffers.color.setClear(0, 0, 0, 1, a) : "alpha-blend" === s2 && i.buffers.color.setClear(0, 0, 0, 0, a), (t2.autoClear || n2) && (i.buffers.depth.setTest(true), i.buffers.depth.setMask(true), i.buffers.color.setMask(true), t2.clear(t2.autoClearColor, t2.autoClearDepth, t2.autoClearStencil));
    }, addToRenderList: function(e3, n2) {
      const i2 = m(n2);
      i2 && (i2.isCubeTexture || i2.mapping === dt) ? (void 0 === c && (c = new Bs(new ks(1, 1, 1), new Xs({ name: "BackgroundCubeMaterial", uniforms: Vs(pa.backgroundCube.uniforms), vertexShader: pa.backgroundCube.vertexShader, fragmentShader: pa.backgroundCube.fragmentShader, side: 1, depthTest: false, depthWrite: false, fog: false })), c.geometry.deleteAttribute("normal"), c.geometry.deleteAttribute("uv"), c.onBeforeRender = function(t3, e4, n3) {
        this.matrixWorld.copyPosition(n3.matrixWorld);
      }, Object.defineProperty(c.material, "envMap", { get: function() {
        return this.uniforms.envMap.value;
      } }), r.update(c)), fa.copy(n2.backgroundRotation), fa.x *= -1, fa.y *= -1, fa.z *= -1, i2.isCubeTexture && false === i2.isRenderTargetTexture && (fa.y *= -1, fa.z *= -1), c.material.uniforms.envMap.value = i2, c.material.uniforms.flipEnvMap.value = i2.isCubeTexture && false === i2.isRenderTargetTexture ? -1 : 1, c.material.uniforms.backgroundBlurriness.value = n2.backgroundBlurriness, c.material.uniforms.backgroundIntensity.value = n2.backgroundIntensity, c.material.uniforms.backgroundRotation.value.setFromMatrix4(ga.makeRotationFromEuler(fa)), c.material.toneMapped = ai.getTransfer(i2.colorSpace) !== Qe, u2 === i2 && d2 === i2.version && p2 === t2.toneMapping || (c.material.needsUpdate = true, u2 = i2, d2 = i2.version, p2 = t2.toneMapping), c.layers.enableAll(), e3.unshift(c, c.geometry, c.material, 0, 0, null)) : i2 && i2.isTexture && (void 0 === l && (l = new Bs(new ha(2, 2), new Xs({ name: "BackgroundMaterial", uniforms: Vs(pa.background.uniforms), vertexShader: pa.background.vertexShader, fragmentShader: pa.background.fragmentShader, side: 0, depthTest: false, depthWrite: false, fog: false })), l.geometry.deleteAttribute("normal"), Object.defineProperty(l.material, "map", { get: function() {
        return this.uniforms.t2D.value;
      } }), r.update(l)), l.material.uniforms.t2D.value = i2, l.material.uniforms.backgroundIntensity.value = n2.backgroundIntensity, l.material.toneMapped = ai.getTransfer(i2.colorSpace) !== Qe, true === i2.matrixAutoUpdate && i2.updateMatrix(), l.material.uniforms.uvTransform.value.copy(i2.matrix), u2 === i2 && d2 === i2.version && p2 === t2.toneMapping || (l.material.needsUpdate = true, u2 = i2, d2 = i2.version, p2 = t2.toneMapping), l.layers.enableAll(), e3.unshift(l, l.geometry, l.material, 0, 0, null));
    } };
  }
  function _a(t2, e2) {
    const n = t2.getParameter(t2.MAX_VERTEX_ATTRIBS), i = {}, r = c(null);
    let s = r, a = false;
    function o(e3) {
      return t2.bindVertexArray(e3);
    }
    function l(e3) {
      return t2.deleteVertexArray(e3);
    }
    function c(t3) {
      const e3 = [], i2 = [], r2 = [];
      for (let t4 = 0; t4 < n; t4++) e3[t4] = 0, i2[t4] = 0, r2[t4] = 0;
      return { geometry: null, program: null, wireframe: false, newAttributes: e3, enabledAttributes: i2, attributeDivisors: r2, object: t3, attributes: {}, index: null };
    }
    function h() {
      const t3 = s.newAttributes;
      for (let e3 = 0, n2 = t3.length; e3 < n2; e3++) t3[e3] = 0;
    }
    function u2(t3) {
      d2(t3, 0);
    }
    function d2(e3, n2) {
      const i2 = s.newAttributes, r2 = s.enabledAttributes, a2 = s.attributeDivisors;
      i2[e3] = 1, 0 === r2[e3] && (t2.enableVertexAttribArray(e3), r2[e3] = 1), a2[e3] !== n2 && (t2.vertexAttribDivisor(e3, n2), a2[e3] = n2);
    }
    function p2() {
      const e3 = s.newAttributes, n2 = s.enabledAttributes;
      for (let i2 = 0, r2 = n2.length; i2 < r2; i2++) n2[i2] !== e3[i2] && (t2.disableVertexAttribArray(i2), n2[i2] = 0);
    }
    function m(e3, n2, i2, r2, s2, a2, o2) {
      true === o2 ? t2.vertexAttribIPointer(e3, n2, i2, s2, a2) : t2.vertexAttribPointer(e3, n2, i2, r2, s2, a2);
    }
    function f() {
      g(), a = true, s !== r && (s = r, o(s.object));
    }
    function g() {
      r.geometry = null, r.program = null, r.wireframe = false;
    }
    return { setup: function(n2, r2, l2, f2, g2) {
      let v = false;
      const _ = (function(e3, n3, r3) {
        const s2 = true === r3.wireframe;
        let a2 = i[e3.id];
        void 0 === a2 && (a2 = {}, i[e3.id] = a2);
        let o2 = a2[n3.id];
        void 0 === o2 && (o2 = {}, a2[n3.id] = o2);
        let l3 = o2[s2];
        void 0 === l3 && (l3 = c(t2.createVertexArray()), o2[s2] = l3);
        return l3;
      })(f2, l2, r2);
      s !== _ && (s = _, o(s.object)), v = (function(t3, e3, n3, i2) {
        const r3 = s.attributes, a2 = e3.attributes;
        let o2 = 0;
        const l3 = n3.getAttributes();
        for (const e4 in l3) {
          if (l3[e4].location >= 0) {
            const n4 = r3[e4];
            let i3 = a2[e4];
            if (void 0 === i3 && ("instanceMatrix" === e4 && t3.instanceMatrix && (i3 = t3.instanceMatrix), "instanceColor" === e4 && t3.instanceColor && (i3 = t3.instanceColor)), void 0 === n4) return true;
            if (n4.attribute !== i3) return true;
            if (i3 && n4.data !== i3.data) return true;
            o2++;
          }
        }
        return s.attributesNum !== o2 || s.index !== i2;
      })(n2, f2, l2, g2), v && (function(t3, e3, n3, i2) {
        const r3 = {}, a2 = e3.attributes;
        let o2 = 0;
        const l3 = n3.getAttributes();
        for (const e4 in l3) {
          if (l3[e4].location >= 0) {
            let n4 = a2[e4];
            void 0 === n4 && ("instanceMatrix" === e4 && t3.instanceMatrix && (n4 = t3.instanceMatrix), "instanceColor" === e4 && t3.instanceColor && (n4 = t3.instanceColor));
            const i3 = {};
            i3.attribute = n4, n4 && n4.data && (i3.data = n4.data), r3[e4] = i3, o2++;
          }
        }
        s.attributes = r3, s.attributesNum = o2, s.index = i2;
      })(n2, f2, l2, g2), null !== g2 && e2.update(g2, t2.ELEMENT_ARRAY_BUFFER), (v || a) && (a = false, (function(n3, i2, r3, s2) {
        h();
        const a2 = s2.attributes, o2 = r3.getAttributes(), l3 = i2.defaultAttributeValues;
        for (const i3 in o2) {
          const r4 = o2[i3];
          if (r4.location >= 0) {
            let o3 = a2[i3];
            if (void 0 === o3 && ("instanceMatrix" === i3 && n3.instanceMatrix && (o3 = n3.instanceMatrix), "instanceColor" === i3 && n3.instanceColor && (o3 = n3.instanceColor)), void 0 !== o3) {
              const i4 = o3.normalized, a3 = o3.itemSize, l4 = e2.get(o3);
              if (void 0 === l4) continue;
              const c2 = l4.buffer, h2 = l4.type, p3 = l4.bytesPerElement, f3 = h2 === t2.INT || h2 === t2.UNSIGNED_INT || o3.gpuType === It;
              if (o3.isInterleavedBufferAttribute) {
                const e3 = o3.data, l5 = e3.stride, g3 = o3.offset;
                if (e3.isInstancedInterleavedBuffer) {
                  for (let t3 = 0; t3 < r4.locationSize; t3++) d2(r4.location + t3, e3.meshPerAttribute);
                  true !== n3.isInstancedMesh && void 0 === s2._maxInstanceCount && (s2._maxInstanceCount = e3.meshPerAttribute * e3.count);
                } else for (let t3 = 0; t3 < r4.locationSize; t3++) u2(r4.location + t3);
                t2.bindBuffer(t2.ARRAY_BUFFER, c2);
                for (let t3 = 0; t3 < r4.locationSize; t3++) m(r4.location + t3, a3 / r4.locationSize, h2, i4, l5 * p3, (g3 + a3 / r4.locationSize * t3) * p3, f3);
              } else {
                if (o3.isInstancedBufferAttribute) {
                  for (let t3 = 0; t3 < r4.locationSize; t3++) d2(r4.location + t3, o3.meshPerAttribute);
                  true !== n3.isInstancedMesh && void 0 === s2._maxInstanceCount && (s2._maxInstanceCount = o3.meshPerAttribute * o3.count);
                } else for (let t3 = 0; t3 < r4.locationSize; t3++) u2(r4.location + t3);
                t2.bindBuffer(t2.ARRAY_BUFFER, c2);
                for (let t3 = 0; t3 < r4.locationSize; t3++) m(r4.location + t3, a3 / r4.locationSize, h2, i4, a3 * p3, a3 / r4.locationSize * t3 * p3, f3);
              }
            } else if (void 0 !== l3) {
              const e3 = l3[i3];
              if (void 0 !== e3) switch (e3.length) {
                case 2:
                  t2.vertexAttrib2fv(r4.location, e3);
                  break;
                case 3:
                  t2.vertexAttrib3fv(r4.location, e3);
                  break;
                case 4:
                  t2.vertexAttrib4fv(r4.location, e3);
                  break;
                default:
                  t2.vertexAttrib1fv(r4.location, e3);
              }
            }
          }
        }
        p2();
      })(n2, r2, l2, f2), null !== g2 && t2.bindBuffer(t2.ELEMENT_ARRAY_BUFFER, e2.get(g2).buffer));
    }, reset: f, resetDefaultState: g, dispose: function() {
      f();
      for (const t3 in i) {
        const e3 = i[t3];
        for (const t4 in e3) {
          const n2 = e3[t4];
          for (const t5 in n2) l(n2[t5].object), delete n2[t5];
          delete e3[t4];
        }
        delete i[t3];
      }
    }, releaseStatesOfGeometry: function(t3) {
      if (void 0 === i[t3.id]) return;
      const e3 = i[t3.id];
      for (const t4 in e3) {
        const n2 = e3[t4];
        for (const t5 in n2) l(n2[t5].object), delete n2[t5];
        delete e3[t4];
      }
      delete i[t3.id];
    }, releaseStatesOfProgram: function(t3) {
      for (const e3 in i) {
        const n2 = i[e3];
        if (void 0 === n2[t3.id]) continue;
        const r2 = n2[t3.id];
        for (const t4 in r2) l(r2[t4].object), delete r2[t4];
        delete n2[t3.id];
      }
    }, initAttributes: h, enableAttribute: u2, disableUnusedAttributes: p2 };
  }
  function xa(t2, e2, n) {
    let i;
    function r(e3, r2, s) {
      0 !== s && (t2.drawArraysInstanced(i, e3, r2, s), n.update(r2, i, s));
    }
    this.setMode = function(t3) {
      i = t3;
    }, this.render = function(e3, r2) {
      t2.drawArrays(i, e3, r2), n.update(r2, i, 1);
    }, this.renderInstances = r, this.renderMultiDraw = function(t3, r2, s) {
      if (0 === s) return;
      e2.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i, t3, 0, r2, 0, s);
      let a = 0;
      for (let t4 = 0; t4 < s; t4++) a += r2[t4];
      n.update(a, i, 1);
    }, this.renderMultiDrawInstances = function(t3, s, a, o) {
      if (0 === a) return;
      const l = e2.get("WEBGL_multi_draw");
      if (null === l) for (let e3 = 0; e3 < t3.length; e3++) r(t3[e3], s[e3], o[e3]);
      else {
        l.multiDrawArraysInstancedWEBGL(i, t3, 0, s, 0, o, 0, a);
        let e3 = 0;
        for (let t4 = 0; t4 < a; t4++) e3 += s[t4] * o[t4];
        n.update(e3, i, 1);
      }
    };
  }
  function ya(t2, e2, n, i) {
    let r;
    function s(e3) {
      if ("highp" === e3) {
        if (t2.getShaderPrecisionFormat(t2.VERTEX_SHADER, t2.HIGH_FLOAT).precision > 0 && t2.getShaderPrecisionFormat(t2.FRAGMENT_SHADER, t2.HIGH_FLOAT).precision > 0) return "highp";
        e3 = "mediump";
      }
      return "mediump" === e3 && t2.getShaderPrecisionFormat(t2.VERTEX_SHADER, t2.MEDIUM_FLOAT).precision > 0 && t2.getShaderPrecisionFormat(t2.FRAGMENT_SHADER, t2.MEDIUM_FLOAT).precision > 0 ? "mediump" : "lowp";
    }
    let a = void 0 !== n.precision ? n.precision : "highp";
    const o = s(a);
    o !== a && (console.warn("THREE.WebGLRenderer:", a, "not supported, using", o, "instead."), a = o);
    const l = true === n.logarithmicDepthBuffer, c = true === n.reverseDepthBuffer && e2.has("EXT_clip_control"), h = t2.getParameter(t2.MAX_TEXTURE_IMAGE_UNITS), u2 = t2.getParameter(t2.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    return { isWebGL2: true, getMaxAnisotropy: function() {
      if (void 0 !== r) return r;
      if (true === e2.has("EXT_texture_filter_anisotropic")) {
        const n2 = e2.get("EXT_texture_filter_anisotropic");
        r = t2.getParameter(n2.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      } else r = 0;
      return r;
    }, getMaxPrecision: s, textureFormatReadable: function(e3) {
      return e3 === kt || i.convert(e3) === t2.getParameter(t2.IMPLEMENTATION_COLOR_READ_FORMAT);
    }, textureTypeReadable: function(n2) {
      const r2 = n2 === Ut && (e2.has("EXT_color_buffer_half_float") || e2.has("EXT_color_buffer_float"));
      return !(n2 !== Et && i.convert(n2) !== t2.getParameter(t2.IMPLEMENTATION_COLOR_READ_TYPE) && n2 !== Lt && !r2);
    }, precision: a, logarithmicDepthBuffer: l, reverseDepthBuffer: c, maxTextures: h, maxVertexTextures: u2, maxTextureSize: t2.getParameter(t2.MAX_TEXTURE_SIZE), maxCubemapSize: t2.getParameter(t2.MAX_CUBE_MAP_TEXTURE_SIZE), maxAttributes: t2.getParameter(t2.MAX_VERTEX_ATTRIBS), maxVertexUniforms: t2.getParameter(t2.MAX_VERTEX_UNIFORM_VECTORS), maxVaryings: t2.getParameter(t2.MAX_VARYING_VECTORS), maxFragmentUniforms: t2.getParameter(t2.MAX_FRAGMENT_UNIFORM_VECTORS), vertexTextures: u2 > 0, maxSamples: t2.getParameter(t2.MAX_SAMPLES) };
  }
  function Ma(t2) {
    const e2 = this;
    let n = null, i = 0, r = false, s = false;
    const a = new ra(), o = new Kn(), l = { value: null, needsUpdate: false };
    function c(t3, n2, i2, r2) {
      const s2 = null !== t3 ? t3.length : 0;
      let c2 = null;
      if (0 !== s2) {
        if (c2 = l.value, true !== r2 || null === c2) {
          const e3 = i2 + 4 * s2, r3 = n2.matrixWorldInverse;
          o.getNormalMatrix(r3), (null === c2 || c2.length < e3) && (c2 = new Float32Array(e3));
          for (let e4 = 0, n3 = i2; e4 !== s2; ++e4, n3 += 4) a.copy(t3[e4]).applyMatrix4(r3, o), a.normal.toArray(c2, n3), c2[n3 + 3] = a.constant;
        }
        l.value = c2, l.needsUpdate = true;
      }
      return e2.numPlanes = s2, e2.numIntersection = 0, c2;
    }
    this.uniform = l, this.numPlanes = 0, this.numIntersection = 0, this.init = function(t3, e3) {
      const n2 = 0 !== t3.length || e3 || 0 !== i || r;
      return r = e3, i = t3.length, n2;
    }, this.beginShadows = function() {
      s = true, c(null);
    }, this.endShadows = function() {
      s = false;
    }, this.setGlobalState = function(t3, e3) {
      n = c(t3, e3, 0);
    }, this.setState = function(a2, o2, h) {
      const u2 = a2.clippingPlanes, d2 = a2.clipIntersection, p2 = a2.clipShadows, m = t2.get(a2);
      if (!r || null === u2 || 0 === u2.length || s && !p2) s ? c(null) : (function() {
        l.value !== n && (l.value = n, l.needsUpdate = i > 0);
        e2.numPlanes = i, e2.numIntersection = 0;
      })();
      else {
        const t3 = s ? 0 : i, e3 = 4 * t3;
        let r2 = m.clippingState || null;
        l.value = r2, r2 = c(u2, o2, e3, h);
        for (let t4 = 0; t4 !== e3; ++t4) r2[t4] = n[t4];
        m.clippingState = r2, this.numIntersection = d2 ? this.numPlanes : 0, this.numPlanes += t3;
      }
    };
  }
  function Sa(t2) {
    let e2 = /* @__PURE__ */ new WeakMap();
    function n(t3, e3) {
      return e3 === ht ? t3.mapping = lt : e3 === ut && (t3.mapping = ct), t3;
    }
    function i(t3) {
      const n2 = t3.target;
      n2.removeEventListener("dispose", i);
      const r = e2.get(n2);
      void 0 !== r && (e2.delete(n2), r.dispose());
    }
    return { get: function(r) {
      if (r && r.isTexture) {
        const s = r.mapping;
        if (s === ht || s === ut) {
          if (e2.has(r)) {
            return n(e2.get(r).texture, r.mapping);
          }
          {
            const s2 = r.image;
            if (s2 && s2.height > 0) {
              const a = new ta(s2.height);
              return a.fromEquirectangularTexture(t2, r), e2.set(r, a), r.addEventListener("dispose", i), n(a.texture, r.mapping);
            }
            return null;
          }
        }
      }
      return r;
    }, dispose: function() {
      e2 = /* @__PURE__ */ new WeakMap();
    } };
  }
  var ba = class extends js {
    constructor(t2 = -1, e2 = 1, n = 1, i = -1, r = 0.1, s = 2e3) {
      super(), this.isOrthographicCamera = true, this.type = "OrthographicCamera", this.zoom = 1, this.view = null, this.left = t2, this.right = e2, this.top = n, this.bottom = i, this.near = r, this.far = s, this.updateProjectionMatrix();
    }
    copy(t2, e2) {
      return super.copy(t2, e2), this.left = t2.left, this.right = t2.right, this.top = t2.top, this.bottom = t2.bottom, this.near = t2.near, this.far = t2.far, this.zoom = t2.zoom, this.view = null === t2.view ? null : Object.assign({}, t2.view), this;
    }
    setViewOffset(t2, e2, n, i, r, s) {
      null === this.view && (this.view = { enabled: true, fullWidth: 1, fullHeight: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 }), this.view.enabled = true, this.view.fullWidth = t2, this.view.fullHeight = e2, this.view.offsetX = n, this.view.offsetY = i, this.view.width = r, this.view.height = s, this.updateProjectionMatrix();
    }
    clearViewOffset() {
      null !== this.view && (this.view.enabled = false), this.updateProjectionMatrix();
    }
    updateProjectionMatrix() {
      const t2 = (this.right - this.left) / (2 * this.zoom), e2 = (this.top - this.bottom) / (2 * this.zoom), n = (this.right + this.left) / 2, i = (this.top + this.bottom) / 2;
      let r = n - t2, s = n + t2, a = i + e2, o = i - e2;
      if (null !== this.view && this.view.enabled) {
        const t3 = (this.right - this.left) / this.view.fullWidth / this.zoom, e3 = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
        r += t3 * this.view.offsetX, s = r + t3 * this.view.width, a -= e3 * this.view.offsetY, o = a - e3 * this.view.height;
      }
      this.projectionMatrix.makeOrthographic(r, s, a, o, this.near, this.far, this.coordinateSystem), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
    }
    toJSON(t2) {
      const e2 = super.toJSON(t2);
      return e2.object.zoom = this.zoom, e2.object.left = this.left, e2.object.right = this.right, e2.object.top = this.top, e2.object.bottom = this.bottom, e2.object.near = this.near, e2.object.far = this.far, null !== this.view && (e2.object.view = Object.assign({}, this.view)), e2;
    }
  };
  var Ta = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582];
  var wa = 20;
  var Ea = new ba();
  var Aa = new Kr();
  var Ra = null;
  var Ca = 0;
  var Ia = 0;
  var Pa = false;
  var La = (1 + Math.sqrt(5)) / 2;
  var Ua = 1 / La;
  var Da = [new Ci(-La, Ua, 0), new Ci(La, Ua, 0), new Ci(-Ua, 0, La), new Ci(Ua, 0, La), new Ci(0, La, -Ua), new Ci(0, La, Ua), new Ci(-1, 1, -1), new Ci(1, 1, -1), new Ci(-1, 1, 1), new Ci(1, 1, 1)];
  var Na = class {
    constructor(t2) {
      this._renderer = t2, this._pingPongRenderTarget = null, this._lodMax = 0, this._cubeSize = 0, this._lodPlanes = [], this._sizeLods = [], this._sigmas = [], this._blurMaterial = null, this._cubemapMaterial = null, this._equirectMaterial = null, this._compileMaterial(this._blurMaterial);
    }
    fromScene(t2, e2 = 0, n = 0.1, i = 100) {
      Ra = this._renderer.getRenderTarget(), Ca = this._renderer.getActiveCubeFace(), Ia = this._renderer.getActiveMipmapLevel(), Pa = this._renderer.xr.enabled, this._renderer.xr.enabled = false, this._setSize(256);
      const r = this._allocateTargets();
      return r.depthBuffer = true, this._sceneToCubeUV(t2, n, i, r), e2 > 0 && this._blur(r, 0, 0, e2), this._applyPMREM(r), this._cleanup(r), r;
    }
    fromEquirectangular(t2, e2 = null) {
      return this._fromTexture(t2, e2);
    }
    fromCubemap(t2, e2 = null) {
      return this._fromTexture(t2, e2);
    }
    compileCubemapShader() {
      null === this._cubemapMaterial && (this._cubemapMaterial = za(), this._compileMaterial(this._cubemapMaterial));
    }
    compileEquirectangularShader() {
      null === this._equirectMaterial && (this._equirectMaterial = Ba(), this._compileMaterial(this._equirectMaterial));
    }
    dispose() {
      this._dispose(), null !== this._cubemapMaterial && this._cubemapMaterial.dispose(), null !== this._equirectMaterial && this._equirectMaterial.dispose();
    }
    _setSize(t2) {
      this._lodMax = Math.floor(Math.log2(t2)), this._cubeSize = Math.pow(2, this._lodMax);
    }
    _dispose() {
      null !== this._blurMaterial && this._blurMaterial.dispose(), null !== this._pingPongRenderTarget && this._pingPongRenderTarget.dispose();
      for (let t2 = 0; t2 < this._lodPlanes.length; t2++) this._lodPlanes[t2].dispose();
    }
    _cleanup(t2) {
      this._renderer.setRenderTarget(Ra, Ca, Ia), this._renderer.xr.enabled = Pa, t2.scissorTest = false, Fa(t2, 0, 0, t2.width, t2.height);
    }
    _fromTexture(t2, e2) {
      t2.mapping === lt || t2.mapping === ct ? this._setSize(0 === t2.image.length ? 16 : t2.image[0].width || t2.image[0].image.width) : this._setSize(t2.image.width / 4), Ra = this._renderer.getRenderTarget(), Ca = this._renderer.getActiveCubeFace(), Ia = this._renderer.getActiveMipmapLevel(), Pa = this._renderer.xr.enabled, this._renderer.xr.enabled = false;
      const n = e2 || this._allocateTargets();
      return this._textureToCubeUV(t2, n), this._applyPMREM(n), this._cleanup(n), n;
    }
    _allocateTargets() {
      const t2 = 3 * Math.max(this._cubeSize, 112), e2 = 4 * this._cubeSize, n = { magFilter: Mt, minFilter: Mt, generateMipmaps: false, type: Ut, format: kt, colorSpace: Ke, depthBuffer: false }, i = Oa(t2, e2, n);
      if (null === this._pingPongRenderTarget || this._pingPongRenderTarget.width !== t2 || this._pingPongRenderTarget.height !== e2) {
        null !== this._pingPongRenderTarget && this._dispose(), this._pingPongRenderTarget = Oa(t2, e2, n);
        const { _lodMax: i2 } = this;
        ({ sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas } = (function(t3) {
          const e3 = [], n2 = [], i3 = [];
          let r = t3;
          const s = t3 - 4 + 1 + Ta.length;
          for (let a = 0; a < s; a++) {
            const s2 = Math.pow(2, r);
            n2.push(s2);
            let o = 1 / s2;
            a > t3 - 4 ? o = Ta[a - t3 + 4 - 1] : 0 === a && (o = 0), i3.push(o);
            const l = 1 / (s2 - 2), c = -l, h = 1 + l, u2 = [c, c, h, c, h, h, c, c, h, h, c, h], d2 = 6, p2 = 6, m = 3, f = 2, g = 1, v = new Float32Array(m * p2 * d2), _ = new Float32Array(f * p2 * d2), x = new Float32Array(g * p2 * d2);
            for (let t4 = 0; t4 < d2; t4++) {
              const e4 = t4 % 3 * 2 / 3 - 1, n3 = t4 > 2 ? 0 : -1, i4 = [e4, n3, 0, e4 + 2 / 3, n3, 0, e4 + 2 / 3, n3 + 1, 0, e4, n3, 0, e4 + 2 / 3, n3 + 1, 0, e4, n3 + 1, 0];
              v.set(i4, m * p2 * t4), _.set(u2, f * p2 * t4);
              const r2 = [t4, t4, t4, t4, t4, t4];
              x.set(r2, g * p2 * t4);
            }
            const y2 = new Es();
            y2.setAttribute("position", new cs(v, m)), y2.setAttribute("uv", new cs(_, f)), y2.setAttribute("faceIndex", new cs(x, g)), e3.push(y2), r > 4 && r--;
          }
          return { lodPlanes: e3, sizeLods: n2, sigmas: i3 };
        })(i2)), this._blurMaterial = (function(t3, e3, n2) {
          const i3 = new Float32Array(wa), r = new Ci(0, 1, 0), s = new Xs({ name: "SphericalGaussianBlur", defines: { n: wa, CUBEUV_TEXEL_WIDTH: 1 / e3, CUBEUV_TEXEL_HEIGHT: 1 / n2, CUBEUV_MAX_MIP: `${t3}.0` }, uniforms: { envMap: { value: null }, samples: { value: 1 }, weights: { value: i3 }, latitudinal: { value: false }, dTheta: { value: 0 }, mipInt: { value: 0 }, poleAxis: { value: r } }, vertexShader: ka(), fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n			uniform int samples;\n			uniform float weights[ n ];\n			uniform bool latitudinal;\n			uniform float dTheta;\n			uniform float mipInt;\n			uniform vec3 poleAxis;\n\n			#define ENVMAP_TYPE_CUBE_UV\n			#include <cube_uv_reflection_fragment>\n\n			vec3 getSample( float theta, vec3 axis ) {\n\n				float cosTheta = cos( theta );\n				// Rodrigues' axis-angle rotation\n				vec3 sampleDirection = vOutputDirection * cosTheta\n					+ cross( axis, vOutputDirection ) * sin( theta )\n					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );\n\n				return bilinearCubeUV( envMap, sampleDirection, mipInt );\n\n			}\n\n			void main() {\n\n				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );\n\n				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {\n\n					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );\n\n				}\n\n				axis = normalize( axis );\n\n				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );\n\n				for ( int i = 1; i < n; i++ ) {\n\n					if ( i >= samples ) {\n\n						break;\n\n					}\n\n					float theta = dTheta * float( i );\n					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );\n					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );\n\n				}\n\n			}\n		", blending: 0, depthTest: false, depthWrite: false });
          return s;
        })(i2, t2, e2);
      }
      return i;
    }
    _compileMaterial(t2) {
      const e2 = new Bs(this._lodPlanes[0], t2);
      this._renderer.compile(e2, Ea);
    }
    _sceneToCubeUV(t2, e2, n, i) {
      const r = new Js(90, 1, e2, n), s = [1, -1, 1, 1, 1, 1], a = [1, 1, 1, -1, -1, -1], o = this._renderer, l = o.autoClear, c = o.toneMapping;
      o.getClearColor(Aa), o.toneMapping = 0, o.autoClear = false;
      const h = new es({ name: "PMREM.Background", side: 1, depthWrite: false, depthTest: false }), u2 = new Bs(new ks(), h);
      let d2 = false;
      const p2 = t2.background;
      p2 ? p2.isColor && (h.color.copy(p2), t2.background = null, d2 = true) : (h.color.copy(Aa), d2 = true);
      for (let e3 = 0; e3 < 6; e3++) {
        const n2 = e3 % 3;
        0 === n2 ? (r.up.set(0, s[e3], 0), r.lookAt(a[e3], 0, 0)) : 1 === n2 ? (r.up.set(0, 0, s[e3]), r.lookAt(0, a[e3], 0)) : (r.up.set(0, s[e3], 0), r.lookAt(0, 0, a[e3]));
        const l2 = this._cubeSize;
        Fa(i, n2 * l2, e3 > 2 ? l2 : 0, l2, l2), o.setRenderTarget(i), d2 && o.render(u2, r), o.render(t2, r);
      }
      u2.geometry.dispose(), u2.material.dispose(), o.toneMapping = c, o.autoClear = l, t2.background = p2;
    }
    _textureToCubeUV(t2, e2) {
      const n = this._renderer, i = t2.mapping === lt || t2.mapping === ct;
      i ? (null === this._cubemapMaterial && (this._cubemapMaterial = za()), this._cubemapMaterial.uniforms.flipEnvMap.value = false === t2.isRenderTargetTexture ? -1 : 1) : null === this._equirectMaterial && (this._equirectMaterial = Ba());
      const r = i ? this._cubemapMaterial : this._equirectMaterial, s = new Bs(this._lodPlanes[0], r);
      r.uniforms.envMap.value = t2;
      const a = this._cubeSize;
      Fa(e2, 0, 0, 3 * a, 2 * a), n.setRenderTarget(e2), n.render(s, Ea);
    }
    _applyPMREM(t2) {
      const e2 = this._renderer, n = e2.autoClear;
      e2.autoClear = false;
      const i = this._lodPlanes.length;
      for (let e3 = 1; e3 < i; e3++) {
        const n2 = Math.sqrt(this._sigmas[e3] * this._sigmas[e3] - this._sigmas[e3 - 1] * this._sigmas[e3 - 1]), r = Da[(i - e3 - 1) % Da.length];
        this._blur(t2, e3 - 1, e3, n2, r);
      }
      e2.autoClear = n;
    }
    _blur(t2, e2, n, i, r) {
      const s = this._pingPongRenderTarget;
      this._halfBlur(t2, s, e2, n, i, "latitudinal", r), this._halfBlur(s, t2, n, n, i, "longitudinal", r);
    }
    _halfBlur(t2, e2, n, i, r, s, a) {
      const o = this._renderer, l = this._blurMaterial;
      "latitudinal" !== s && "longitudinal" !== s && console.error("blur direction must be either latitudinal or longitudinal!");
      const c = new Bs(this._lodPlanes[i], l), h = l.uniforms, u2 = this._sizeLods[n] - 1, d2 = isFinite(r) ? Math.PI / (2 * u2) : 2 * Math.PI / 39, p2 = r / d2, m = isFinite(r) ? 1 + Math.floor(3 * p2) : wa;
      m > wa && console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to 20`);
      const f = [];
      let g = 0;
      for (let t3 = 0; t3 < wa; ++t3) {
        const e3 = t3 / p2, n2 = Math.exp(-e3 * e3 / 2);
        f.push(n2), 0 === t3 ? g += n2 : t3 < m && (g += 2 * n2);
      }
      for (let t3 = 0; t3 < f.length; t3++) f[t3] = f[t3] / g;
      h.envMap.value = t2.texture, h.samples.value = m, h.weights.value = f, h.latitudinal.value = "latitudinal" === s, a && (h.poleAxis.value = a);
      const { _lodMax: v } = this;
      h.dTheta.value = d2, h.mipInt.value = v - n;
      const _ = this._sizeLods[i];
      Fa(e2, 3 * _ * (i > v - 4 ? i - v + 4 : 0), 4 * (this._cubeSize - _), 3 * _, 2 * _), o.setRenderTarget(e2), o.render(c, Ea);
    }
  };
  function Oa(t2, e2, n) {
    const i = new bi(t2, e2, n);
    return i.texture.mapping = dt, i.texture.name = "PMREM.cubeUv", i.scissorTest = true, i;
  }
  function Fa(t2, e2, n, i, r) {
    t2.viewport.set(e2, n, i, r), t2.scissor.set(e2, n, i, r);
  }
  function Ba() {
    return new Xs({ name: "EquirectangularToCubeUV", uniforms: { envMap: { value: null } }, vertexShader: ka(), fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n\n			#include <common>\n\n			void main() {\n\n				vec3 outputDirection = normalize( vOutputDirection );\n				vec2 uv = equirectUv( outputDirection );\n\n				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );\n\n			}\n		", blending: 0, depthTest: false, depthWrite: false });
  }
  function za() {
    return new Xs({ name: "CubemapToCubeUV", uniforms: { envMap: { value: null }, flipEnvMap: { value: -1 } }, vertexShader: ka(), fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			uniform float flipEnvMap;\n\n			varying vec3 vOutputDirection;\n\n			uniform samplerCube envMap;\n\n			void main() {\n\n				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );\n\n			}\n		", blending: 0, depthTest: false, depthWrite: false });
  }
  function ka() {
    return "\n\n		precision mediump float;\n		precision mediump int;\n\n		attribute float faceIndex;\n\n		varying vec3 vOutputDirection;\n\n		// RH coordinate system; PMREM face-indexing convention\n		vec3 getDirection( vec2 uv, float face ) {\n\n			uv = 2.0 * uv - 1.0;\n\n			vec3 direction = vec3( uv, 1.0 );\n\n			if ( face == 0.0 ) {\n\n				direction = direction.zyx; // ( 1, v, u ) pos x\n\n			} else if ( face == 1.0 ) {\n\n				direction = direction.xzy;\n				direction.xz *= -1.0; // ( -u, 1, -v ) pos y\n\n			} else if ( face == 2.0 ) {\n\n				direction.x *= -1.0; // ( -u, v, 1 ) pos z\n\n			} else if ( face == 3.0 ) {\n\n				direction = direction.zyx;\n				direction.xz *= -1.0; // ( -1, v, -u ) neg x\n\n			} else if ( face == 4.0 ) {\n\n				direction = direction.xzy;\n				direction.xy *= -1.0; // ( -u, -1, v ) neg y\n\n			} else if ( face == 5.0 ) {\n\n				direction.z *= -1.0; // ( u, v, -1 ) neg z\n\n			}\n\n			return direction;\n\n		}\n\n		void main() {\n\n			vOutputDirection = getDirection( uv, faceIndex );\n			gl_Position = vec4( position, 1.0 );\n\n		}\n	";
  }
  function Va(t2) {
    let e2 = /* @__PURE__ */ new WeakMap(), n = null;
    function i(t3) {
      const n2 = t3.target;
      n2.removeEventListener("dispose", i);
      const r = e2.get(n2);
      void 0 !== r && (e2.delete(n2), r.dispose());
    }
    return { get: function(r) {
      if (r && r.isTexture) {
        const s = r.mapping, a = s === ht || s === ut, o = s === lt || s === ct;
        if (a || o) {
          let s2 = e2.get(r);
          const l = void 0 !== s2 ? s2.texture.pmremVersion : 0;
          if (r.isRenderTargetTexture && r.pmremVersion !== l) return null === n && (n = new Na(t2)), s2 = a ? n.fromEquirectangular(r, s2) : n.fromCubemap(r, s2), s2.texture.pmremVersion = r.pmremVersion, e2.set(r, s2), s2.texture;
          if (void 0 !== s2) return s2.texture;
          {
            const l2 = r.image;
            return a && l2 && l2.height > 0 || o && l2 && (function(t3) {
              let e3 = 0;
              const n2 = 6;
              for (let i2 = 0; i2 < n2; i2++) void 0 !== t3[i2] && e3++;
              return e3 === n2;
            })(l2) ? (null === n && (n = new Na(t2)), s2 = a ? n.fromEquirectangular(r) : n.fromCubemap(r), s2.texture.pmremVersion = r.pmremVersion, e2.set(r, s2), r.addEventListener("dispose", i), s2.texture) : null;
          }
        }
      }
      return r;
    }, dispose: function() {
      e2 = /* @__PURE__ */ new WeakMap(), null !== n && (n.dispose(), n = null);
    } };
  }
  function Ha(t2) {
    const e2 = {};
    function n(n2) {
      if (void 0 !== e2[n2]) return e2[n2];
      let i;
      switch (n2) {
        case "WEBGL_depth_texture":
          i = t2.getExtension("WEBGL_depth_texture") || t2.getExtension("MOZ_WEBGL_depth_texture") || t2.getExtension("WEBKIT_WEBGL_depth_texture");
          break;
        case "EXT_texture_filter_anisotropic":
          i = t2.getExtension("EXT_texture_filter_anisotropic") || t2.getExtension("MOZ_EXT_texture_filter_anisotropic") || t2.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
          break;
        case "WEBGL_compressed_texture_s3tc":
          i = t2.getExtension("WEBGL_compressed_texture_s3tc") || t2.getExtension("MOZ_WEBGL_compressed_texture_s3tc") || t2.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");
          break;
        case "WEBGL_compressed_texture_pvrtc":
          i = t2.getExtension("WEBGL_compressed_texture_pvrtc") || t2.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");
          break;
        default:
          i = t2.getExtension(n2);
      }
      return e2[n2] = i, i;
    }
    return { has: function(t3) {
      return null !== n(t3);
    }, init: function() {
      n("EXT_color_buffer_float"), n("WEBGL_clip_cull_distance"), n("OES_texture_float_linear"), n("EXT_color_buffer_half_float"), n("WEBGL_multisampled_render_to_texture"), n("WEBGL_render_shared_exponent");
    }, get: function(t3) {
      const e3 = n(t3);
      return null === e3 && si("THREE.WebGLRenderer: " + t3 + " extension not supported."), e3;
    } };
  }
  function Ga(t2, e2, n, i) {
    const r = {}, s = /* @__PURE__ */ new WeakMap();
    function a(t3) {
      const o2 = t3.target;
      null !== o2.index && e2.remove(o2.index);
      for (const t4 in o2.attributes) e2.remove(o2.attributes[t4]);
      for (const t4 in o2.morphAttributes) {
        const n2 = o2.morphAttributes[t4];
        for (let t5 = 0, i2 = n2.length; t5 < i2; t5++) e2.remove(n2[t5]);
      }
      o2.removeEventListener("dispose", a), delete r[o2.id];
      const l = s.get(o2);
      l && (e2.remove(l), s.delete(o2)), i.releaseStatesOfGeometry(o2), true === o2.isInstancedBufferGeometry && delete o2._maxInstanceCount, n.memory.geometries--;
    }
    function o(t3) {
      const n2 = [], i2 = t3.index, r2 = t3.attributes.position;
      let a2 = 0;
      if (null !== i2) {
        const t4 = i2.array;
        a2 = i2.version;
        for (let e3 = 0, i3 = t4.length; e3 < i3; e3 += 3) {
          const i4 = t4[e3 + 0], r3 = t4[e3 + 1], s2 = t4[e3 + 2];
          n2.push(i4, r3, r3, s2, s2, i4);
        }
      } else {
        if (void 0 === r2) return;
        {
          const t4 = r2.array;
          a2 = r2.version;
          for (let e3 = 0, i3 = t4.length / 3 - 1; e3 < i3; e3 += 3) {
            const t5 = e3 + 0, i4 = e3 + 1, r3 = e3 + 2;
            n2.push(t5, i4, i4, r3, r3, t5);
          }
        }
      }
      const o2 = new (Qn(n2) ? gs : ms)(n2, 1);
      o2.version = a2;
      const l = s.get(t3);
      l && e2.remove(l), s.set(t3, o2);
    }
    return { get: function(t3, e3) {
      return true === r[e3.id] || (e3.addEventListener("dispose", a), r[e3.id] = true, n.memory.geometries++), e3;
    }, update: function(n2) {
      const i2 = n2.attributes;
      for (const n3 in i2) e2.update(i2[n3], t2.ARRAY_BUFFER);
      const r2 = n2.morphAttributes;
      for (const n3 in r2) {
        const i3 = r2[n3];
        for (let n4 = 0, r3 = i3.length; n4 < r3; n4++) e2.update(i3[n4], t2.ARRAY_BUFFER);
      }
    }, getWireframeAttribute: function(t3) {
      const e3 = s.get(t3);
      if (e3) {
        const n2 = t3.index;
        null !== n2 && e3.version < n2.version && o(t3);
      } else o(t3);
      return s.get(t3);
    } };
  }
  function Wa(t2, e2, n) {
    let i, r, s;
    function a(e3, a2, o) {
      0 !== o && (t2.drawElementsInstanced(i, a2, r, e3 * s, o), n.update(a2, i, o));
    }
    this.setMode = function(t3) {
      i = t3;
    }, this.setIndex = function(t3) {
      r = t3.type, s = t3.bytesPerElement;
    }, this.render = function(e3, a2) {
      t2.drawElements(i, a2, r, e3 * s), n.update(a2, i, 1);
    }, this.renderInstances = a, this.renderMultiDraw = function(t3, s2, a2) {
      if (0 === a2) return;
      e2.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i, s2, 0, r, t3, 0, a2);
      let o = 0;
      for (let t4 = 0; t4 < a2; t4++) o += s2[t4];
      n.update(o, i, 1);
    }, this.renderMultiDrawInstances = function(t3, o, l, c) {
      if (0 === l) return;
      const h = e2.get("WEBGL_multi_draw");
      if (null === h) for (let e3 = 0; e3 < t3.length; e3++) a(t3[e3] / s, o[e3], c[e3]);
      else {
        h.multiDrawElementsInstancedWEBGL(i, o, 0, r, t3, 0, c, 0, l);
        let e3 = 0;
        for (let t4 = 0; t4 < l; t4++) e3 += o[t4] * c[t4];
        n.update(e3, i, 1);
      }
    };
  }
  function Xa(t2) {
    const e2 = { frame: 0, calls: 0, triangles: 0, points: 0, lines: 0 };
    return { memory: { geometries: 0, textures: 0 }, render: e2, programs: null, autoReset: true, reset: function() {
      e2.calls = 0, e2.triangles = 0, e2.points = 0, e2.lines = 0;
    }, update: function(n, i, r) {
      switch (e2.calls++, i) {
        case t2.TRIANGLES:
          e2.triangles += r * (n / 3);
          break;
        case t2.LINES:
          e2.lines += r * (n / 2);
          break;
        case t2.LINE_STRIP:
          e2.lines += r * (n - 1);
          break;
        case t2.LINE_LOOP:
          e2.lines += r * n;
          break;
        case t2.POINTS:
          e2.points += r * n;
          break;
        default:
          console.error("THREE.WebGLInfo: Unknown draw mode:", i);
      }
    } };
  }
  function ja(t2, e2, n) {
    const i = /* @__PURE__ */ new WeakMap(), r = new Mi();
    return { update: function(s, a, o) {
      const l = s.morphTargetInfluences, c = a.morphAttributes.position || a.morphAttributes.normal || a.morphAttributes.color, h = void 0 !== c ? c.length : 0;
      let u2 = i.get(a);
      if (void 0 === u2 || u2.count !== h) {
        let T = function() {
          S2.dispose(), i.delete(a), a.removeEventListener("dispose", T);
        };
        void 0 !== u2 && u2.texture.dispose();
        const d2 = void 0 !== a.morphAttributes.position, p2 = void 0 !== a.morphAttributes.normal, m = void 0 !== a.morphAttributes.color, f = a.morphAttributes.position || [], g = a.morphAttributes.normal || [], v = a.morphAttributes.color || [];
        let _ = 0;
        true === d2 && (_ = 1), true === p2 && (_ = 2), true === m && (_ = 3);
        let x = a.attributes.position.count * _, y2 = 1;
        x > e2.maxTextureSize && (y2 = Math.ceil(x / e2.maxTextureSize), x = e2.maxTextureSize);
        const M2 = new Float32Array(x * y2 * 4 * h), S2 = new Ti(M2, x, y2, h);
        S2.type = Lt, S2.needsUpdate = true;
        const b = 4 * _;
        for (let w2 = 0; w2 < h; w2++) {
          const E2 = f[w2], A2 = g[w2], R2 = v[w2], C2 = x * y2 * 4 * w2;
          for (let I2 = 0; I2 < E2.count; I2++) {
            const P2 = I2 * b;
            true === d2 && (r.fromBufferAttribute(E2, I2), M2[C2 + P2 + 0] = r.x, M2[C2 + P2 + 1] = r.y, M2[C2 + P2 + 2] = r.z, M2[C2 + P2 + 3] = 0), true === p2 && (r.fromBufferAttribute(A2, I2), M2[C2 + P2 + 4] = r.x, M2[C2 + P2 + 5] = r.y, M2[C2 + P2 + 6] = r.z, M2[C2 + P2 + 7] = 0), true === m && (r.fromBufferAttribute(R2, I2), M2[C2 + P2 + 8] = r.x, M2[C2 + P2 + 9] = r.y, M2[C2 + P2 + 10] = r.z, M2[C2 + P2 + 11] = 4 === R2.itemSize ? r.w : 1);
          }
        }
        u2 = { count: h, texture: S2, size: new Jn(x, y2) }, i.set(a, u2), a.addEventListener("dispose", T);
      }
      if (true === s.isInstancedMesh && null !== s.morphTexture) o.getUniforms().setValue(t2, "morphTexture", s.morphTexture, n);
      else {
        let L2 = 0;
        for (let D2 = 0; D2 < l.length; D2++) L2 += l[D2];
        const U2 = a.morphTargetsRelative ? 1 : 1 - L2;
        o.getUniforms().setValue(t2, "morphTargetBaseInfluence", U2), o.getUniforms().setValue(t2, "morphTargetInfluences", l);
      }
      o.getUniforms().setValue(t2, "morphTargetsTexture", u2.texture, n), o.getUniforms().setValue(t2, "morphTargetsTextureSize", u2.size);
    } };
  }
  function qa(t2, e2, n, i) {
    let r = /* @__PURE__ */ new WeakMap();
    function s(t3) {
      const e3 = t3.target;
      e3.removeEventListener("dispose", s), n.remove(e3.instanceMatrix), null !== e3.instanceColor && n.remove(e3.instanceColor);
    }
    return { update: function(a) {
      const o = i.render.frame, l = a.geometry, c = e2.get(a, l);
      if (r.get(c) !== o && (e2.update(c), r.set(c, o)), a.isInstancedMesh && (false === a.hasEventListener("dispose", s) && a.addEventListener("dispose", s), r.get(a) !== o && (n.update(a.instanceMatrix, t2.ARRAY_BUFFER), null !== a.instanceColor && n.update(a.instanceColor, t2.ARRAY_BUFFER), r.set(a, o))), a.isSkinnedMesh) {
        const t3 = a.skeleton;
        r.get(t3) !== o && (t3.update(), r.set(t3, o));
      }
      return c;
    }, dispose: function() {
      r = /* @__PURE__ */ new WeakMap();
    } };
  }
  var Ya = class extends yi {
    constructor(t2, e2, n, i, r, s, a, o, l, c = 1026) {
      if (c !== Gt && c !== Wt) throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
      void 0 === n && c === Gt && (n = Pt), void 0 === n && c === Wt && (n = Ot), super(null, i, r, s, a, o, c, n, l), this.isDepthTexture = true, this.image = { width: t2, height: e2 }, this.magFilter = void 0 !== a ? a : gt, this.minFilter = void 0 !== o ? o : gt, this.flipY = false, this.generateMipmaps = false, this.compareFunction = null;
    }
    copy(t2) {
      return super.copy(t2), this.compareFunction = t2.compareFunction, this;
    }
    toJSON(t2) {
      const e2 = super.toJSON(t2);
      return null !== this.compareFunction && (e2.compareFunction = this.compareFunction), e2;
    }
  };
  var Za = new yi();
  var Ja = new Ya(1, 1);
  var Ka = new Ti();
  var $a = new Ei();
  var Qa = new Qs();
  var to = [];
  var eo = [];
  var no = new Float32Array(16);
  var io = new Float32Array(9);
  var ro = new Float32Array(4);
  function so(t2, e2, n) {
    const i = t2[0];
    if (i <= 0 || i > 0) return t2;
    const r = e2 * n;
    let s = to[r];
    if (void 0 === s && (s = new Float32Array(r), to[r] = s), 0 !== e2) {
      i.toArray(s, 0);
      for (let i2 = 1, r2 = 0; i2 !== e2; ++i2) r2 += n, t2[i2].toArray(s, r2);
    }
    return s;
  }
  function ao(t2, e2) {
    if (t2.length !== e2.length) return false;
    for (let n = 0, i = t2.length; n < i; n++) if (t2[n] !== e2[n]) return false;
    return true;
  }
  function oo(t2, e2) {
    for (let n = 0, i = e2.length; n < i; n++) t2[n] = e2[n];
  }
  function lo(t2, e2) {
    let n = eo[e2];
    void 0 === n && (n = new Int32Array(e2), eo[e2] = n);
    for (let i = 0; i !== e2; ++i) n[i] = t2.allocateTextureUnit();
    return n;
  }
  function co(t2, e2) {
    const n = this.cache;
    n[0] !== e2 && (t2.uniform1f(this.addr, e2), n[0] = e2);
  }
  function ho(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y || (t2.uniform2f(this.addr, e2.x, e2.y), n[0] = e2.x, n[1] = e2.y);
    else {
      if (ao(n, e2)) return;
      t2.uniform2fv(this.addr, e2), oo(n, e2);
    }
  }
  function uo(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y && n[2] === e2.z || (t2.uniform3f(this.addr, e2.x, e2.y, e2.z), n[0] = e2.x, n[1] = e2.y, n[2] = e2.z);
    else if (void 0 !== e2.r) n[0] === e2.r && n[1] === e2.g && n[2] === e2.b || (t2.uniform3f(this.addr, e2.r, e2.g, e2.b), n[0] = e2.r, n[1] = e2.g, n[2] = e2.b);
    else {
      if (ao(n, e2)) return;
      t2.uniform3fv(this.addr, e2), oo(n, e2);
    }
  }
  function po(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y && n[2] === e2.z && n[3] === e2.w || (t2.uniform4f(this.addr, e2.x, e2.y, e2.z, e2.w), n[0] = e2.x, n[1] = e2.y, n[2] = e2.z, n[3] = e2.w);
    else {
      if (ao(n, e2)) return;
      t2.uniform4fv(this.addr, e2), oo(n, e2);
    }
  }
  function mo(t2, e2) {
    const n = this.cache, i = e2.elements;
    if (void 0 === i) {
      if (ao(n, e2)) return;
      t2.uniformMatrix2fv(this.addr, false, e2), oo(n, e2);
    } else {
      if (ao(n, i)) return;
      ro.set(i), t2.uniformMatrix2fv(this.addr, false, ro), oo(n, i);
    }
  }
  function fo(t2, e2) {
    const n = this.cache, i = e2.elements;
    if (void 0 === i) {
      if (ao(n, e2)) return;
      t2.uniformMatrix3fv(this.addr, false, e2), oo(n, e2);
    } else {
      if (ao(n, i)) return;
      io.set(i), t2.uniformMatrix3fv(this.addr, false, io), oo(n, i);
    }
  }
  function go(t2, e2) {
    const n = this.cache, i = e2.elements;
    if (void 0 === i) {
      if (ao(n, e2)) return;
      t2.uniformMatrix4fv(this.addr, false, e2), oo(n, e2);
    } else {
      if (ao(n, i)) return;
      no.set(i), t2.uniformMatrix4fv(this.addr, false, no), oo(n, i);
    }
  }
  function vo(t2, e2) {
    const n = this.cache;
    n[0] !== e2 && (t2.uniform1i(this.addr, e2), n[0] = e2);
  }
  function _o(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y || (t2.uniform2i(this.addr, e2.x, e2.y), n[0] = e2.x, n[1] = e2.y);
    else {
      if (ao(n, e2)) return;
      t2.uniform2iv(this.addr, e2), oo(n, e2);
    }
  }
  function xo(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y && n[2] === e2.z || (t2.uniform3i(this.addr, e2.x, e2.y, e2.z), n[0] = e2.x, n[1] = e2.y, n[2] = e2.z);
    else {
      if (ao(n, e2)) return;
      t2.uniform3iv(this.addr, e2), oo(n, e2);
    }
  }
  function yo(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y && n[2] === e2.z && n[3] === e2.w || (t2.uniform4i(this.addr, e2.x, e2.y, e2.z, e2.w), n[0] = e2.x, n[1] = e2.y, n[2] = e2.z, n[3] = e2.w);
    else {
      if (ao(n, e2)) return;
      t2.uniform4iv(this.addr, e2), oo(n, e2);
    }
  }
  function Mo(t2, e2) {
    const n = this.cache;
    n[0] !== e2 && (t2.uniform1ui(this.addr, e2), n[0] = e2);
  }
  function So(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y || (t2.uniform2ui(this.addr, e2.x, e2.y), n[0] = e2.x, n[1] = e2.y);
    else {
      if (ao(n, e2)) return;
      t2.uniform2uiv(this.addr, e2), oo(n, e2);
    }
  }
  function bo(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y && n[2] === e2.z || (t2.uniform3ui(this.addr, e2.x, e2.y, e2.z), n[0] = e2.x, n[1] = e2.y, n[2] = e2.z);
    else {
      if (ao(n, e2)) return;
      t2.uniform3uiv(this.addr, e2), oo(n, e2);
    }
  }
  function To(t2, e2) {
    const n = this.cache;
    if (void 0 !== e2.x) n[0] === e2.x && n[1] === e2.y && n[2] === e2.z && n[3] === e2.w || (t2.uniform4ui(this.addr, e2.x, e2.y, e2.z, e2.w), n[0] = e2.x, n[1] = e2.y, n[2] = e2.z, n[3] = e2.w);
    else {
      if (ao(n, e2)) return;
      t2.uniform4uiv(this.addr, e2), oo(n, e2);
    }
  }
  function wo(t2, e2, n) {
    const i = this.cache, r = n.allocateTextureUnit();
    let s;
    i[0] !== r && (t2.uniform1i(this.addr, r), i[0] = r), this.type === t2.SAMPLER_2D_SHADOW ? (Ja.compareFunction = 515, s = Ja) : s = Za, n.setTexture2D(e2 || s, r);
  }
  function Eo(t2, e2, n) {
    const i = this.cache, r = n.allocateTextureUnit();
    i[0] !== r && (t2.uniform1i(this.addr, r), i[0] = r), n.setTexture3D(e2 || $a, r);
  }
  function Ao(t2, e2, n) {
    const i = this.cache, r = n.allocateTextureUnit();
    i[0] !== r && (t2.uniform1i(this.addr, r), i[0] = r), n.setTextureCube(e2 || Qa, r);
  }
  function Ro(t2, e2, n) {
    const i = this.cache, r = n.allocateTextureUnit();
    i[0] !== r && (t2.uniform1i(this.addr, r), i[0] = r), n.setTexture2DArray(e2 || Ka, r);
  }
  function Co(t2, e2) {
    t2.uniform1fv(this.addr, e2);
  }
  function Io(t2, e2) {
    const n = so(e2, this.size, 2);
    t2.uniform2fv(this.addr, n);
  }
  function Po(t2, e2) {
    const n = so(e2, this.size, 3);
    t2.uniform3fv(this.addr, n);
  }
  function Lo(t2, e2) {
    const n = so(e2, this.size, 4);
    t2.uniform4fv(this.addr, n);
  }
  function Uo(t2, e2) {
    const n = so(e2, this.size, 4);
    t2.uniformMatrix2fv(this.addr, false, n);
  }
  function Do(t2, e2) {
    const n = so(e2, this.size, 9);
    t2.uniformMatrix3fv(this.addr, false, n);
  }
  function No(t2, e2) {
    const n = so(e2, this.size, 16);
    t2.uniformMatrix4fv(this.addr, false, n);
  }
  function Oo(t2, e2) {
    t2.uniform1iv(this.addr, e2);
  }
  function Fo(t2, e2) {
    t2.uniform2iv(this.addr, e2);
  }
  function Bo(t2, e2) {
    t2.uniform3iv(this.addr, e2);
  }
  function zo(t2, e2) {
    t2.uniform4iv(this.addr, e2);
  }
  function ko(t2, e2) {
    t2.uniform1uiv(this.addr, e2);
  }
  function Vo(t2, e2) {
    t2.uniform2uiv(this.addr, e2);
  }
  function Ho(t2, e2) {
    t2.uniform3uiv(this.addr, e2);
  }
  function Go(t2, e2) {
    t2.uniform4uiv(this.addr, e2);
  }
  function Wo(t2, e2, n) {
    const i = this.cache, r = e2.length, s = lo(n, r);
    ao(i, s) || (t2.uniform1iv(this.addr, s), oo(i, s));
    for (let t3 = 0; t3 !== r; ++t3) n.setTexture2D(e2[t3] || Za, s[t3]);
  }
  function Xo(t2, e2, n) {
    const i = this.cache, r = e2.length, s = lo(n, r);
    ao(i, s) || (t2.uniform1iv(this.addr, s), oo(i, s));
    for (let t3 = 0; t3 !== r; ++t3) n.setTexture3D(e2[t3] || $a, s[t3]);
  }
  function jo(t2, e2, n) {
    const i = this.cache, r = e2.length, s = lo(n, r);
    ao(i, s) || (t2.uniform1iv(this.addr, s), oo(i, s));
    for (let t3 = 0; t3 !== r; ++t3) n.setTextureCube(e2[t3] || Qa, s[t3]);
  }
  function qo(t2, e2, n) {
    const i = this.cache, r = e2.length, s = lo(n, r);
    ao(i, s) || (t2.uniform1iv(this.addr, s), oo(i, s));
    for (let t3 = 0; t3 !== r; ++t3) n.setTexture2DArray(e2[t3] || Ka, s[t3]);
  }
  var Yo = class {
    constructor(t2, e2, n) {
      this.id = t2, this.addr = n, this.cache = [], this.type = e2.type, this.setValue = (function(t3) {
        switch (t3) {
          case 5126:
            return co;
          case 35664:
            return ho;
          case 35665:
            return uo;
          case 35666:
            return po;
          case 35674:
            return mo;
          case 35675:
            return fo;
          case 35676:
            return go;
          case 5124:
          case 35670:
            return vo;
          case 35667:
          case 35671:
            return _o;
          case 35668:
          case 35672:
            return xo;
          case 35669:
          case 35673:
            return yo;
          case 5125:
            return Mo;
          case 36294:
            return So;
          case 36295:
            return bo;
          case 36296:
            return To;
          case 35678:
          case 36198:
          case 36298:
          case 36306:
          case 35682:
            return wo;
          case 35679:
          case 36299:
          case 36307:
            return Eo;
          case 35680:
          case 36300:
          case 36308:
          case 36293:
            return Ao;
          case 36289:
          case 36303:
          case 36311:
          case 36292:
            return Ro;
        }
      })(e2.type);
    }
  };
  var Zo = class {
    constructor(t2, e2, n) {
      this.id = t2, this.addr = n, this.cache = [], this.type = e2.type, this.size = e2.size, this.setValue = (function(t3) {
        switch (t3) {
          case 5126:
            return Co;
          case 35664:
            return Io;
          case 35665:
            return Po;
          case 35666:
            return Lo;
          case 35674:
            return Uo;
          case 35675:
            return Do;
          case 35676:
            return No;
          case 5124:
          case 35670:
            return Oo;
          case 35667:
          case 35671:
            return Fo;
          case 35668:
          case 35672:
            return Bo;
          case 35669:
          case 35673:
            return zo;
          case 5125:
            return ko;
          case 36294:
            return Vo;
          case 36295:
            return Ho;
          case 36296:
            return Go;
          case 35678:
          case 36198:
          case 36298:
          case 36306:
          case 35682:
            return Wo;
          case 35679:
          case 36299:
          case 36307:
            return Xo;
          case 35680:
          case 36300:
          case 36308:
          case 36293:
            return jo;
          case 36289:
          case 36303:
          case 36311:
          case 36292:
            return qo;
        }
      })(e2.type);
    }
  };
  var Jo = class {
    constructor(t2) {
      this.id = t2, this.seq = [], this.map = {};
    }
    setValue(t2, e2, n) {
      const i = this.seq;
      for (let r = 0, s = i.length; r !== s; ++r) {
        const s2 = i[r];
        s2.setValue(t2, e2[s2.id], n);
      }
    }
  };
  var Ko = /(\w+)(\])?(\[|\.)?/g;
  function $o(t2, e2) {
    t2.seq.push(e2), t2.map[e2.id] = e2;
  }
  function Qo(t2, e2, n) {
    const i = t2.name, r = i.length;
    for (Ko.lastIndex = 0; ; ) {
      const s = Ko.exec(i), a = Ko.lastIndex;
      let o = s[1];
      const l = "]" === s[2], c = s[3];
      if (l && (o |= 0), void 0 === c || "[" === c && a + 2 === r) {
        $o(n, void 0 === c ? new Yo(o, t2, e2) : new Zo(o, t2, e2));
        break;
      }
      {
        let t3 = n.map[o];
        void 0 === t3 && (t3 = new Jo(o), $o(n, t3)), n = t3;
      }
    }
  }
  var tl = class {
    constructor(t2, e2) {
      this.seq = [], this.map = {};
      const n = t2.getProgramParameter(e2, t2.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; ++i) {
        const n2 = t2.getActiveUniform(e2, i);
        Qo(n2, t2.getUniformLocation(e2, n2.name), this);
      }
    }
    setValue(t2, e2, n, i) {
      const r = this.map[e2];
      void 0 !== r && r.setValue(t2, n, i);
    }
    setOptional(t2, e2, n) {
      const i = e2[n];
      void 0 !== i && this.setValue(t2, n, i);
    }
    static upload(t2, e2, n, i) {
      for (let r = 0, s = e2.length; r !== s; ++r) {
        const s2 = e2[r], a = n[s2.id];
        false !== a.needsUpdate && s2.setValue(t2, a.value, i);
      }
    }
    static seqWithValue(t2, e2) {
      const n = [];
      for (let i = 0, r = t2.length; i !== r; ++i) {
        const r2 = t2[i];
        r2.id in e2 && n.push(r2);
      }
      return n;
    }
  };
  function el(t2, e2, n) {
    const i = t2.createShader(e2);
    return t2.shaderSource(i, n), t2.compileShader(i), i;
  }
  var nl = 0;
  var il = new Kn();
  function rl(t2, e2, n) {
    const i = t2.getShaderParameter(e2, t2.COMPILE_STATUS), r = t2.getShaderInfoLog(e2).trim();
    if (i && "" === r) return "";
    const s = /ERROR: 0:(\d+)/.exec(r);
    if (s) {
      const i2 = parseInt(s[1]);
      return n.toUpperCase() + "\n\n" + r + "\n\n" + (function(t3, e3) {
        const n2 = t3.split("\n"), i3 = [], r2 = Math.max(e3 - 6, 0), s2 = Math.min(e3 + 6, n2.length);
        for (let t4 = r2; t4 < s2; t4++) {
          const r3 = t4 + 1;
          i3.push(`${r3 === e3 ? ">" : " "} ${r3}: ${n2[t4]}`);
        }
        return i3.join("\n");
      })(t2.getShaderSource(e2), i2);
    }
    return r;
  }
  function sl(t2, e2) {
    const n = (function(t3) {
      ai._getMatrix(il, ai.workingColorSpace, t3);
      const e3 = `mat3( ${il.elements.map(((t4) => t4.toFixed(4)))} )`;
      switch (ai.getTransfer(t3)) {
        case $e:
          return [e3, "LinearTransferOETF"];
        case Qe:
          return [e3, "sRGBTransferOETF"];
        default:
          return console.warn("THREE.WebGLProgram: Unsupported color space: ", t3), [e3, "LinearTransferOETF"];
      }
    })(e2);
    return [`vec4 ${t2}( vec4 value ) {`, `	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`, "}"].join("\n");
  }
  function al(t2, e2) {
    let n;
    switch (e2) {
      case 1:
        n = "Linear";
        break;
      case 2:
        n = "Reinhard";
        break;
      case 3:
        n = "Cineon";
        break;
      case 4:
        n = "ACESFilmic";
        break;
      case 6:
        n = "AgX";
        break;
      case 7:
        n = "Neutral";
        break;
      case 5:
        n = "Custom";
        break;
      default:
        console.warn("THREE.WebGLProgram: Unsupported toneMapping:", e2), n = "Linear";
    }
    return "vec3 " + t2 + "( vec3 color ) { return " + n + "ToneMapping( color ); }";
  }
  var ol = new Ci();
  function ll() {
    ai.getLuminanceCoefficients(ol);
    return ["float luminance( const in vec3 rgb ) {", `	const vec3 weights = vec3( ${ol.x.toFixed(4)}, ${ol.y.toFixed(4)}, ${ol.z.toFixed(4)} );`, "	return dot( weights, rgb );", "}"].join("\n");
  }
  function cl(t2) {
    return "" !== t2;
  }
  function hl(t2, e2) {
    const n = e2.numSpotLightShadows + e2.numSpotLightMaps - e2.numSpotLightShadowsWithMaps;
    return t2.replace(/NUM_DIR_LIGHTS/g, e2.numDirLights).replace(/NUM_SPOT_LIGHTS/g, e2.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, e2.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, n).replace(/NUM_RECT_AREA_LIGHTS/g, e2.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, e2.numPointLights).replace(/NUM_HEMI_LIGHTS/g, e2.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g, e2.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, e2.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, e2.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, e2.numPointLightShadows);
  }
  function ul(t2, e2) {
    return t2.replace(/NUM_CLIPPING_PLANES/g, e2.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, e2.numClippingPlanes - e2.numClipIntersection);
  }
  var dl = /^[ \t]*#include +<([\w\d./]+)>/gm;
  function pl(t2) {
    return t2.replace(dl, fl);
  }
  var ml = /* @__PURE__ */ new Map();
  function fl(t2, e2) {
    let n = ua[e2];
    if (void 0 === n) {
      const t3 = ml.get(e2);
      if (void 0 === t3) throw new Error("Can not resolve #include <" + e2 + ">");
      n = ua[t3], console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.', e2, t3);
    }
    return pl(n);
  }
  var gl = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
  function vl(t2) {
    return t2.replace(gl, _l);
  }
  function _l(t2, e2, n, i) {
    let r = "";
    for (let t3 = parseInt(e2); t3 < parseInt(n); t3++) r += i.replace(/\[\s*i\s*\]/g, "[ " + t3 + " ]").replace(/UNROLLED_LOOP_INDEX/g, t3);
    return r;
  }
  function xl(t2) {
    let e2 = `precision ${t2.precision} float;
	precision ${t2.precision} int;
	precision ${t2.precision} sampler2D;
	precision ${t2.precision} samplerCube;
	precision ${t2.precision} sampler3D;
	precision ${t2.precision} sampler2DArray;
	precision ${t2.precision} sampler2DShadow;
	precision ${t2.precision} samplerCubeShadow;
	precision ${t2.precision} sampler2DArrayShadow;
	precision ${t2.precision} isampler2D;
	precision ${t2.precision} isampler3D;
	precision ${t2.precision} isamplerCube;
	precision ${t2.precision} isampler2DArray;
	precision ${t2.precision} usampler2D;
	precision ${t2.precision} usampler3D;
	precision ${t2.precision} usamplerCube;
	precision ${t2.precision} usampler2DArray;
	`;
    return "highp" === t2.precision ? e2 += "\n#define HIGH_PRECISION" : "mediump" === t2.precision ? e2 += "\n#define MEDIUM_PRECISION" : "lowp" === t2.precision && (e2 += "\n#define LOW_PRECISION"), e2;
  }
  function yl(t2, e2, n, i) {
    const r = t2.getContext(), s = n.defines;
    let a = n.vertexShader, o = n.fragmentShader;
    const l = (function(t3) {
      let e3 = "SHADOWMAP_TYPE_BASIC";
      return 1 === t3.shadowMapType ? e3 = "SHADOWMAP_TYPE_PCF" : 2 === t3.shadowMapType ? e3 = "SHADOWMAP_TYPE_PCF_SOFT" : 3 === t3.shadowMapType && (e3 = "SHADOWMAP_TYPE_VSM"), e3;
    })(n), c = (function(t3) {
      let e3 = "ENVMAP_TYPE_CUBE";
      if (t3.envMap) switch (t3.envMapMode) {
        case lt:
        case ct:
          e3 = "ENVMAP_TYPE_CUBE";
          break;
        case dt:
          e3 = "ENVMAP_TYPE_CUBE_UV";
      }
      return e3;
    })(n), h = (function(t3) {
      let e3 = "ENVMAP_MODE_REFLECTION";
      t3.envMap && t3.envMapMode === ct && (e3 = "ENVMAP_MODE_REFRACTION");
      return e3;
    })(n), u2 = (function(t3) {
      let e3 = "ENVMAP_BLENDING_NONE";
      if (t3.envMap) switch (t3.combine) {
        case 0:
          e3 = "ENVMAP_BLENDING_MULTIPLY";
          break;
        case 1:
          e3 = "ENVMAP_BLENDING_MIX";
          break;
        case 2:
          e3 = "ENVMAP_BLENDING_ADD";
      }
      return e3;
    })(n), d2 = (function(t3) {
      const e3 = t3.envMapCubeUVHeight;
      if (null === e3) return null;
      const n2 = Math.log2(e3) - 2, i2 = 1 / e3;
      return { texelWidth: 1 / (3 * Math.max(Math.pow(2, n2), 112)), texelHeight: i2, maxMip: n2 };
    })(n), p2 = (function(t3) {
      return [t3.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "", t3.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""].filter(cl).join("\n");
    })(n), m = (function(t3) {
      const e3 = [];
      for (const n2 in t3) {
        const i2 = t3[n2];
        false !== i2 && e3.push("#define " + n2 + " " + i2);
      }
      return e3.join("\n");
    })(s), f = r.createProgram();
    let g, v, _ = n.glslVersion ? "#version " + n.glslVersion + "\n" : "";
    n.isRawShaderMaterial ? (g = ["#define SHADER_TYPE " + n.shaderType, "#define SHADER_NAME " + n.shaderName, m].filter(cl).join("\n"), g.length > 0 && (g += "\n"), v = ["#define SHADER_TYPE " + n.shaderType, "#define SHADER_NAME " + n.shaderName, m].filter(cl).join("\n"), v.length > 0 && (v += "\n")) : (g = [xl(n), "#define SHADER_TYPE " + n.shaderType, "#define SHADER_NAME " + n.shaderName, m, n.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "", n.batching ? "#define USE_BATCHING" : "", n.batchingColor ? "#define USE_BATCHING_COLOR" : "", n.instancing ? "#define USE_INSTANCING" : "", n.instancingColor ? "#define USE_INSTANCING_COLOR" : "", n.instancingMorph ? "#define USE_INSTANCING_MORPH" : "", n.useFog && n.fog ? "#define USE_FOG" : "", n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "", n.map ? "#define USE_MAP" : "", n.envMap ? "#define USE_ENVMAP" : "", n.envMap ? "#define " + h : "", n.lightMap ? "#define USE_LIGHTMAP" : "", n.aoMap ? "#define USE_AOMAP" : "", n.bumpMap ? "#define USE_BUMPMAP" : "", n.normalMap ? "#define USE_NORMALMAP" : "", n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "", n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "", n.displacementMap ? "#define USE_DISPLACEMENTMAP" : "", n.emissiveMap ? "#define USE_EMISSIVEMAP" : "", n.anisotropy ? "#define USE_ANISOTROPY" : "", n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "", n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "", n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "", n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "", n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "", n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "", n.specularMap ? "#define USE_SPECULARMAP" : "", n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "", n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "", n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "", n.metalnessMap ? "#define USE_METALNESSMAP" : "", n.alphaMap ? "#define USE_ALPHAMAP" : "", n.alphaHash ? "#define USE_ALPHAHASH" : "", n.transmission ? "#define USE_TRANSMISSION" : "", n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "", n.thicknessMap ? "#define USE_THICKNESSMAP" : "", n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "", n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "", n.mapUv ? "#define MAP_UV " + n.mapUv : "", n.alphaMapUv ? "#define ALPHAMAP_UV " + n.alphaMapUv : "", n.lightMapUv ? "#define LIGHTMAP_UV " + n.lightMapUv : "", n.aoMapUv ? "#define AOMAP_UV " + n.aoMapUv : "", n.emissiveMapUv ? "#define EMISSIVEMAP_UV " + n.emissiveMapUv : "", n.bumpMapUv ? "#define BUMPMAP_UV " + n.bumpMapUv : "", n.normalMapUv ? "#define NORMALMAP_UV " + n.normalMapUv : "", n.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + n.displacementMapUv : "", n.metalnessMapUv ? "#define METALNESSMAP_UV " + n.metalnessMapUv : "", n.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + n.roughnessMapUv : "", n.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + n.anisotropyMapUv : "", n.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + n.clearcoatMapUv : "", n.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + n.clearcoatNormalMapUv : "", n.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + n.clearcoatRoughnessMapUv : "", n.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + n.iridescenceMapUv : "", n.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + n.iridescenceThicknessMapUv : "", n.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + n.sheenColorMapUv : "", n.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + n.sheenRoughnessMapUv : "", n.specularMapUv ? "#define SPECULARMAP_UV " + n.specularMapUv : "", n.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + n.specularColorMapUv : "", n.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + n.specularIntensityMapUv : "", n.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + n.transmissionMapUv : "", n.thicknessMapUv ? "#define THICKNESSMAP_UV " + n.thicknessMapUv : "", n.vertexTangents && false === n.flatShading ? "#define USE_TANGENT" : "", n.vertexColors ? "#define USE_COLOR" : "", n.vertexAlphas ? "#define USE_COLOR_ALPHA" : "", n.vertexUv1s ? "#define USE_UV1" : "", n.vertexUv2s ? "#define USE_UV2" : "", n.vertexUv3s ? "#define USE_UV3" : "", n.pointsUvs ? "#define USE_POINTS_UV" : "", n.flatShading ? "#define FLAT_SHADED" : "", n.skinning ? "#define USE_SKINNING" : "", n.morphTargets ? "#define USE_MORPHTARGETS" : "", n.morphNormals && false === n.flatShading ? "#define USE_MORPHNORMALS" : "", n.morphColors ? "#define USE_MORPHCOLORS" : "", n.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + n.morphTextureStride : "", n.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + n.morphTargetsCount : "", n.doubleSided ? "#define DOUBLE_SIDED" : "", n.flipSided ? "#define FLIP_SIDED" : "", n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "", n.shadowMapEnabled ? "#define " + l : "", n.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "", n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "", n.logarithmicDepthBuffer ? "#define USE_LOGDEPTHBUF" : "", n.reverseDepthBuffer ? "#define USE_REVERSEDEPTHBUF" : "", "uniform mat4 modelMatrix;", "uniform mat4 modelViewMatrix;", "uniform mat4 projectionMatrix;", "uniform mat4 viewMatrix;", "uniform mat3 normalMatrix;", "uniform vec3 cameraPosition;", "uniform bool isOrthographic;", "#ifdef USE_INSTANCING", "	attribute mat4 instanceMatrix;", "#endif", "#ifdef USE_INSTANCING_COLOR", "	attribute vec3 instanceColor;", "#endif", "#ifdef USE_INSTANCING_MORPH", "	uniform sampler2D morphTexture;", "#endif", "attribute vec3 position;", "attribute vec3 normal;", "attribute vec2 uv;", "#ifdef USE_UV1", "	attribute vec2 uv1;", "#endif", "#ifdef USE_UV2", "	attribute vec2 uv2;", "#endif", "#ifdef USE_UV3", "	attribute vec2 uv3;", "#endif", "#ifdef USE_TANGENT", "	attribute vec4 tangent;", "#endif", "#if defined( USE_COLOR_ALPHA )", "	attribute vec4 color;", "#elif defined( USE_COLOR )", "	attribute vec3 color;", "#endif", "#ifdef USE_SKINNING", "	attribute vec4 skinIndex;", "	attribute vec4 skinWeight;", "#endif", "\n"].filter(cl).join("\n"), v = [xl(n), "#define SHADER_TYPE " + n.shaderType, "#define SHADER_NAME " + n.shaderName, m, n.useFog && n.fog ? "#define USE_FOG" : "", n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "", n.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "", n.map ? "#define USE_MAP" : "", n.matcap ? "#define USE_MATCAP" : "", n.envMap ? "#define USE_ENVMAP" : "", n.envMap ? "#define " + c : "", n.envMap ? "#define " + h : "", n.envMap ? "#define " + u2 : "", d2 ? "#define CUBEUV_TEXEL_WIDTH " + d2.texelWidth : "", d2 ? "#define CUBEUV_TEXEL_HEIGHT " + d2.texelHeight : "", d2 ? "#define CUBEUV_MAX_MIP " + d2.maxMip + ".0" : "", n.lightMap ? "#define USE_LIGHTMAP" : "", n.aoMap ? "#define USE_AOMAP" : "", n.bumpMap ? "#define USE_BUMPMAP" : "", n.normalMap ? "#define USE_NORMALMAP" : "", n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "", n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "", n.emissiveMap ? "#define USE_EMISSIVEMAP" : "", n.anisotropy ? "#define USE_ANISOTROPY" : "", n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "", n.clearcoat ? "#define USE_CLEARCOAT" : "", n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "", n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "", n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "", n.dispersion ? "#define USE_DISPERSION" : "", n.iridescence ? "#define USE_IRIDESCENCE" : "", n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "", n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "", n.specularMap ? "#define USE_SPECULARMAP" : "", n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "", n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "", n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "", n.metalnessMap ? "#define USE_METALNESSMAP" : "", n.alphaMap ? "#define USE_ALPHAMAP" : "", n.alphaTest ? "#define USE_ALPHATEST" : "", n.alphaHash ? "#define USE_ALPHAHASH" : "", n.sheen ? "#define USE_SHEEN" : "", n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "", n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "", n.transmission ? "#define USE_TRANSMISSION" : "", n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "", n.thicknessMap ? "#define USE_THICKNESSMAP" : "", n.vertexTangents && false === n.flatShading ? "#define USE_TANGENT" : "", n.vertexColors || n.instancingColor || n.batchingColor ? "#define USE_COLOR" : "", n.vertexAlphas ? "#define USE_COLOR_ALPHA" : "", n.vertexUv1s ? "#define USE_UV1" : "", n.vertexUv2s ? "#define USE_UV2" : "", n.vertexUv3s ? "#define USE_UV3" : "", n.pointsUvs ? "#define USE_POINTS_UV" : "", n.gradientMap ? "#define USE_GRADIENTMAP" : "", n.flatShading ? "#define FLAT_SHADED" : "", n.doubleSided ? "#define DOUBLE_SIDED" : "", n.flipSided ? "#define FLIP_SIDED" : "", n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "", n.shadowMapEnabled ? "#define " + l : "", n.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "", n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "", n.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "", n.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "", n.logarithmicDepthBuffer ? "#define USE_LOGDEPTHBUF" : "", n.reverseDepthBuffer ? "#define USE_REVERSEDEPTHBUF" : "", "uniform mat4 viewMatrix;", "uniform vec3 cameraPosition;", "uniform bool isOrthographic;", 0 !== n.toneMapping ? "#define TONE_MAPPING" : "", 0 !== n.toneMapping ? ua.tonemapping_pars_fragment : "", 0 !== n.toneMapping ? al("toneMapping", n.toneMapping) : "", n.dithering ? "#define DITHERING" : "", n.opaque ? "#define OPAQUE" : "", ua.colorspace_pars_fragment, sl("linearToOutputTexel", n.outputColorSpace), ll(), n.useDepthPacking ? "#define DEPTH_PACKING " + n.depthPacking : "", "\n"].filter(cl).join("\n")), a = pl(a), a = hl(a, n), a = ul(a, n), o = pl(o), o = hl(o, n), o = ul(o, n), a = vl(a), o = vl(o), true !== n.isRawShaderMaterial && (_ = "#version 300 es\n", g = [p2, "#define attribute in", "#define varying out", "#define texture2D texture"].join("\n") + "\n" + g, v = ["#define varying in", n.glslVersion === Nn ? "" : "layout(location = 0) out highp vec4 pc_fragColor;", n.glslVersion === Nn ? "" : "#define gl_FragColor pc_fragColor", "#define gl_FragDepthEXT gl_FragDepth", "#define texture2D texture", "#define textureCube texture", "#define texture2DProj textureProj", "#define texture2DLodEXT textureLod", "#define texture2DProjLodEXT textureProjLod", "#define textureCubeLodEXT textureLod", "#define texture2DGradEXT textureGrad", "#define texture2DProjGradEXT textureProjGrad", "#define textureCubeGradEXT textureGrad"].join("\n") + "\n" + v);
    const x = _ + g + a, y2 = _ + v + o, M2 = el(r, r.VERTEX_SHADER, x), S2 = el(r, r.FRAGMENT_SHADER, y2);
    function b(e3) {
      if (t2.debug.checkShaderErrors) {
        const n2 = r.getProgramInfoLog(f).trim(), i2 = r.getShaderInfoLog(M2).trim(), s2 = r.getShaderInfoLog(S2).trim();
        let a2 = true, o2 = true;
        if (false === r.getProgramParameter(f, r.LINK_STATUS)) if (a2 = false, "function" == typeof t2.debug.onShaderError) t2.debug.onShaderError(r, f, M2, S2);
        else {
          const t3 = rl(r, M2, "vertex"), i3 = rl(r, S2, "fragment");
          console.error("THREE.WebGLProgram: Shader Error " + r.getError() + " - VALIDATE_STATUS " + r.getProgramParameter(f, r.VALIDATE_STATUS) + "\n\nMaterial Name: " + e3.name + "\nMaterial Type: " + e3.type + "\n\nProgram Info Log: " + n2 + "\n" + t3 + "\n" + i3);
        }
        else "" !== n2 ? console.warn("THREE.WebGLProgram: Program Info Log:", n2) : "" !== i2 && "" !== s2 || (o2 = false);
        o2 && (e3.diagnostics = { runnable: a2, programLog: n2, vertexShader: { log: i2, prefix: g }, fragmentShader: { log: s2, prefix: v } });
      }
      r.deleteShader(M2), r.deleteShader(S2), T = new tl(r, f), w2 = (function(t3, e4) {
        const n2 = {}, i2 = t3.getProgramParameter(e4, t3.ACTIVE_ATTRIBUTES);
        for (let r2 = 0; r2 < i2; r2++) {
          const i3 = t3.getActiveAttrib(e4, r2), s2 = i3.name;
          let a2 = 1;
          i3.type === t3.FLOAT_MAT2 && (a2 = 2), i3.type === t3.FLOAT_MAT3 && (a2 = 3), i3.type === t3.FLOAT_MAT4 && (a2 = 4), n2[s2] = { type: i3.type, location: t3.getAttribLocation(e4, s2), locationSize: a2 };
        }
        return n2;
      })(r, f);
    }
    let T, w2;
    r.attachShader(f, M2), r.attachShader(f, S2), void 0 !== n.index0AttributeName ? r.bindAttribLocation(f, 0, n.index0AttributeName) : true === n.morphTargets && r.bindAttribLocation(f, 0, "position"), r.linkProgram(f), this.getUniforms = function() {
      return void 0 === T && b(this), T;
    }, this.getAttributes = function() {
      return void 0 === w2 && b(this), w2;
    };
    let E2 = false === n.rendererExtensionParallelShaderCompile;
    return this.isReady = function() {
      return false === E2 && (E2 = r.getProgramParameter(f, 37297)), E2;
    }, this.destroy = function() {
      i.releaseStatesOfProgram(this), r.deleteProgram(f), this.program = void 0;
    }, this.type = n.shaderType, this.name = n.shaderName, this.id = nl++, this.cacheKey = e2, this.usedTimes = 1, this.program = f, this.vertexShader = M2, this.fragmentShader = S2, this;
  }
  var Ml = 0;
  var Sl = class {
    constructor() {
      this.shaderCache = /* @__PURE__ */ new Map(), this.materialCache = /* @__PURE__ */ new Map();
    }
    update(t2) {
      const e2 = t2.vertexShader, n = t2.fragmentShader, i = this._getShaderStage(e2), r = this._getShaderStage(n), s = this._getShaderCacheForMaterial(t2);
      return false === s.has(i) && (s.add(i), i.usedTimes++), false === s.has(r) && (s.add(r), r.usedTimes++), this;
    }
    remove(t2) {
      const e2 = this.materialCache.get(t2);
      for (const t3 of e2) t3.usedTimes--, 0 === t3.usedTimes && this.shaderCache.delete(t3.code);
      return this.materialCache.delete(t2), this;
    }
    getVertexShaderID(t2) {
      return this._getShaderStage(t2.vertexShader).id;
    }
    getFragmentShaderID(t2) {
      return this._getShaderStage(t2.fragmentShader).id;
    }
    dispose() {
      this.shaderCache.clear(), this.materialCache.clear();
    }
    _getShaderCacheForMaterial(t2) {
      const e2 = this.materialCache;
      let n = e2.get(t2);
      return void 0 === n && (n = /* @__PURE__ */ new Set(), e2.set(t2, n)), n;
    }
    _getShaderStage(t2) {
      const e2 = this.shaderCache;
      let n = e2.get(t2);
      return void 0 === n && (n = new bl(t2), e2.set(t2, n)), n;
    }
  };
  var bl = class {
    constructor(t2) {
      this.id = Ml++, this.code = t2, this.usedTimes = 0;
    }
  };
  function Tl(t2, e2, n, i, r, s, a) {
    const o = new gr(), l = new Sl(), c = /* @__PURE__ */ new Set(), h = [], u2 = r.logarithmicDepthBuffer, d2 = r.vertexTextures;
    let p2 = r.precision;
    const m = { MeshDepthMaterial: "depth", MeshDistanceMaterial: "distanceRGBA", MeshNormalMaterial: "normal", MeshBasicMaterial: "basic", MeshLambertMaterial: "lambert", MeshPhongMaterial: "phong", MeshToonMaterial: "toon", MeshStandardMaterial: "physical", MeshPhysicalMaterial: "physical", MeshMatcapMaterial: "matcap", LineBasicMaterial: "basic", LineDashedMaterial: "dashed", PointsMaterial: "points", ShadowMaterial: "shadow", SpriteMaterial: "sprite" };
    function f(t3) {
      return c.add(t3), 0 === t3 ? "uv" : `uv${t3}`;
    }
    return { getParameters: function(s2, o2, h2, g, v) {
      const _ = g.fog, x = v.geometry, y2 = s2.isMeshStandardMaterial ? g.environment : null, M2 = (s2.isMeshStandardMaterial ? n : e2).get(s2.envMap || y2), S2 = M2 && M2.mapping === dt ? M2.image.height : null, b = m[s2.type];
      null !== s2.precision && (p2 = r.getMaxPrecision(s2.precision), p2 !== s2.precision && console.warn("THREE.WebGLProgram.getParameters:", s2.precision, "not supported, using", p2, "instead."));
      const T = x.morphAttributes.position || x.morphAttributes.normal || x.morphAttributes.color, w2 = void 0 !== T ? T.length : 0;
      let E2, A2, R2, C2, I2 = 0;
      if (void 0 !== x.morphAttributes.position && (I2 = 1), void 0 !== x.morphAttributes.normal && (I2 = 2), void 0 !== x.morphAttributes.color && (I2 = 3), b) {
        const t3 = pa[b];
        E2 = t3.vertexShader, A2 = t3.fragmentShader;
      } else E2 = s2.vertexShader, A2 = s2.fragmentShader, l.update(s2), R2 = l.getVertexShaderID(s2), C2 = l.getFragmentShaderID(s2);
      const P2 = t2.getRenderTarget(), L2 = t2.state.buffers.depth.getReversed(), U2 = true === v.isInstancedMesh, D2 = true === v.isBatchedMesh, N2 = !!s2.map, O2 = !!s2.matcap, F2 = !!M2, B2 = !!s2.aoMap, z2 = !!s2.lightMap, k2 = !!s2.bumpMap, V2 = !!s2.normalMap, H2 = !!s2.displacementMap, G2 = !!s2.emissiveMap, W2 = !!s2.metalnessMap, X2 = !!s2.roughnessMap, j2 = s2.anisotropy > 0, q2 = s2.clearcoat > 0, Y = s2.dispersion > 0, Z = s2.iridescence > 0, J = s2.sheen > 0, K = s2.transmission > 0, $ = j2 && !!s2.anisotropyMap, Q = q2 && !!s2.clearcoatMap, tt = q2 && !!s2.clearcoatNormalMap, et = q2 && !!s2.clearcoatRoughnessMap, nt = Z && !!s2.iridescenceMap, it = Z && !!s2.iridescenceThicknessMap, rt = J && !!s2.sheenColorMap, st = J && !!s2.sheenRoughnessMap, at = !!s2.specularMap, ot2 = !!s2.specularColorMap, lt2 = !!s2.specularIntensityMap, ct2 = K && !!s2.transmissionMap, ht2 = K && !!s2.thicknessMap, ut2 = !!s2.gradientMap, pt2 = !!s2.alphaMap, mt2 = s2.alphaTest > 0, ft2 = !!s2.alphaHash, gt2 = !!s2.extensions;
      let vt2 = 0;
      s2.toneMapped && (null !== P2 && true !== P2.isXRRenderTarget || (vt2 = t2.toneMapping));
      const _t = { shaderID: b, shaderType: s2.type, shaderName: s2.name, vertexShader: E2, fragmentShader: A2, defines: s2.defines, customVertexShaderID: R2, customFragmentShaderID: C2, isRawShaderMaterial: true === s2.isRawShaderMaterial, glslVersion: s2.glslVersion, precision: p2, batching: D2, batchingColor: D2 && null !== v._colorsTexture, instancing: U2, instancingColor: U2 && null !== v.instanceColor, instancingMorph: U2 && null !== v.morphTexture, supportsVertexTextures: d2, outputColorSpace: null === P2 ? t2.outputColorSpace : true === P2.isXRRenderTarget ? P2.texture.colorSpace : Ke, alphaToCoverage: !!s2.alphaToCoverage, map: N2, matcap: O2, envMap: F2, envMapMode: F2 && M2.mapping, envMapCubeUVHeight: S2, aoMap: B2, lightMap: z2, bumpMap: k2, normalMap: V2, displacementMap: d2 && H2, emissiveMap: G2, normalMapObjectSpace: V2 && 1 === s2.normalMapType, normalMapTangentSpace: V2 && 0 === s2.normalMapType, metalnessMap: W2, roughnessMap: X2, anisotropy: j2, anisotropyMap: $, clearcoat: q2, clearcoatMap: Q, clearcoatNormalMap: tt, clearcoatRoughnessMap: et, dispersion: Y, iridescence: Z, iridescenceMap: nt, iridescenceThicknessMap: it, sheen: J, sheenColorMap: rt, sheenRoughnessMap: st, specularMap: at, specularColorMap: ot2, specularIntensityMap: lt2, transmission: K, transmissionMap: ct2, thicknessMap: ht2, gradientMap: ut2, opaque: false === s2.transparent && 1 === s2.blending && false === s2.alphaToCoverage, alphaMap: pt2, alphaTest: mt2, alphaHash: ft2, combine: s2.combine, mapUv: N2 && f(s2.map.channel), aoMapUv: B2 && f(s2.aoMap.channel), lightMapUv: z2 && f(s2.lightMap.channel), bumpMapUv: k2 && f(s2.bumpMap.channel), normalMapUv: V2 && f(s2.normalMap.channel), displacementMapUv: H2 && f(s2.displacementMap.channel), emissiveMapUv: G2 && f(s2.emissiveMap.channel), metalnessMapUv: W2 && f(s2.metalnessMap.channel), roughnessMapUv: X2 && f(s2.roughnessMap.channel), anisotropyMapUv: $ && f(s2.anisotropyMap.channel), clearcoatMapUv: Q && f(s2.clearcoatMap.channel), clearcoatNormalMapUv: tt && f(s2.clearcoatNormalMap.channel), clearcoatRoughnessMapUv: et && f(s2.clearcoatRoughnessMap.channel), iridescenceMapUv: nt && f(s2.iridescenceMap.channel), iridescenceThicknessMapUv: it && f(s2.iridescenceThicknessMap.channel), sheenColorMapUv: rt && f(s2.sheenColorMap.channel), sheenRoughnessMapUv: st && f(s2.sheenRoughnessMap.channel), specularMapUv: at && f(s2.specularMap.channel), specularColorMapUv: ot2 && f(s2.specularColorMap.channel), specularIntensityMapUv: lt2 && f(s2.specularIntensityMap.channel), transmissionMapUv: ct2 && f(s2.transmissionMap.channel), thicknessMapUv: ht2 && f(s2.thicknessMap.channel), alphaMapUv: pt2 && f(s2.alphaMap.channel), vertexTangents: !!x.attributes.tangent && (V2 || j2), vertexColors: s2.vertexColors, vertexAlphas: true === s2.vertexColors && !!x.attributes.color && 4 === x.attributes.color.itemSize, pointsUvs: true === v.isPoints && !!x.attributes.uv && (N2 || pt2), fog: !!_, useFog: true === s2.fog, fogExp2: !!_ && _.isFogExp2, flatShading: true === s2.flatShading, sizeAttenuation: true === s2.sizeAttenuation, logarithmicDepthBuffer: u2, reverseDepthBuffer: L2, skinning: true === v.isSkinnedMesh, morphTargets: void 0 !== x.morphAttributes.position, morphNormals: void 0 !== x.morphAttributes.normal, morphColors: void 0 !== x.morphAttributes.color, morphTargetsCount: w2, morphTextureStride: I2, numDirLights: o2.directional.length, numPointLights: o2.point.length, numSpotLights: o2.spot.length, numSpotLightMaps: o2.spotLightMap.length, numRectAreaLights: o2.rectArea.length, numHemiLights: o2.hemi.length, numDirLightShadows: o2.directionalShadowMap.length, numPointLightShadows: o2.pointShadowMap.length, numSpotLightShadows: o2.spotShadowMap.length, numSpotLightShadowsWithMaps: o2.numSpotLightShadowsWithMaps, numLightProbes: o2.numLightProbes, numClippingPlanes: a.numPlanes, numClipIntersection: a.numIntersection, dithering: s2.dithering, shadowMapEnabled: t2.shadowMap.enabled && h2.length > 0, shadowMapType: t2.shadowMap.type, toneMapping: vt2, decodeVideoTexture: N2 && true === s2.map.isVideoTexture && ai.getTransfer(s2.map.colorSpace) === Qe, decodeVideoTextureEmissive: G2 && true === s2.emissiveMap.isVideoTexture && ai.getTransfer(s2.emissiveMap.colorSpace) === Qe, premultipliedAlpha: s2.premultipliedAlpha, doubleSided: 2 === s2.side, flipSided: 1 === s2.side, useDepthPacking: s2.depthPacking >= 0, depthPacking: s2.depthPacking || 0, index0AttributeName: s2.index0AttributeName, extensionClipCullDistance: gt2 && true === s2.extensions.clipCullDistance && i.has("WEBGL_clip_cull_distance"), extensionMultiDraw: (gt2 && true === s2.extensions.multiDraw || D2) && i.has("WEBGL_multi_draw"), rendererExtensionParallelShaderCompile: i.has("KHR_parallel_shader_compile"), customProgramCacheKey: s2.customProgramCacheKey() };
      return _t.vertexUv1s = c.has(1), _t.vertexUv2s = c.has(2), _t.vertexUv3s = c.has(3), c.clear(), _t;
    }, getProgramCacheKey: function(e3) {
      const n2 = [];
      if (e3.shaderID ? n2.push(e3.shaderID) : (n2.push(e3.customVertexShaderID), n2.push(e3.customFragmentShaderID)), void 0 !== e3.defines) for (const t3 in e3.defines) n2.push(t3), n2.push(e3.defines[t3]);
      return false === e3.isRawShaderMaterial && (!(function(t3, e4) {
        t3.push(e4.precision), t3.push(e4.outputColorSpace), t3.push(e4.envMapMode), t3.push(e4.envMapCubeUVHeight), t3.push(e4.mapUv), t3.push(e4.alphaMapUv), t3.push(e4.lightMapUv), t3.push(e4.aoMapUv), t3.push(e4.bumpMapUv), t3.push(e4.normalMapUv), t3.push(e4.displacementMapUv), t3.push(e4.emissiveMapUv), t3.push(e4.metalnessMapUv), t3.push(e4.roughnessMapUv), t3.push(e4.anisotropyMapUv), t3.push(e4.clearcoatMapUv), t3.push(e4.clearcoatNormalMapUv), t3.push(e4.clearcoatRoughnessMapUv), t3.push(e4.iridescenceMapUv), t3.push(e4.iridescenceThicknessMapUv), t3.push(e4.sheenColorMapUv), t3.push(e4.sheenRoughnessMapUv), t3.push(e4.specularMapUv), t3.push(e4.specularColorMapUv), t3.push(e4.specularIntensityMapUv), t3.push(e4.transmissionMapUv), t3.push(e4.thicknessMapUv), t3.push(e4.combine), t3.push(e4.fogExp2), t3.push(e4.sizeAttenuation), t3.push(e4.morphTargetsCount), t3.push(e4.morphAttributeCount), t3.push(e4.numDirLights), t3.push(e4.numPointLights), t3.push(e4.numSpotLights), t3.push(e4.numSpotLightMaps), t3.push(e4.numHemiLights), t3.push(e4.numRectAreaLights), t3.push(e4.numDirLightShadows), t3.push(e4.numPointLightShadows), t3.push(e4.numSpotLightShadows), t3.push(e4.numSpotLightShadowsWithMaps), t3.push(e4.numLightProbes), t3.push(e4.shadowMapType), t3.push(e4.toneMapping), t3.push(e4.numClippingPlanes), t3.push(e4.numClipIntersection), t3.push(e4.depthPacking);
      })(n2, e3), (function(t3, e4) {
        o.disableAll(), e4.supportsVertexTextures && o.enable(0);
        e4.instancing && o.enable(1);
        e4.instancingColor && o.enable(2);
        e4.instancingMorph && o.enable(3);
        e4.matcap && o.enable(4);
        e4.envMap && o.enable(5);
        e4.normalMapObjectSpace && o.enable(6);
        e4.normalMapTangentSpace && o.enable(7);
        e4.clearcoat && o.enable(8);
        e4.iridescence && o.enable(9);
        e4.alphaTest && o.enable(10);
        e4.vertexColors && o.enable(11);
        e4.vertexAlphas && o.enable(12);
        e4.vertexUv1s && o.enable(13);
        e4.vertexUv2s && o.enable(14);
        e4.vertexUv3s && o.enable(15);
        e4.vertexTangents && o.enable(16);
        e4.anisotropy && o.enable(17);
        e4.alphaHash && o.enable(18);
        e4.batching && o.enable(19);
        e4.dispersion && o.enable(20);
        e4.batchingColor && o.enable(21);
        t3.push(o.mask), o.disableAll(), e4.fog && o.enable(0);
        e4.useFog && o.enable(1);
        e4.flatShading && o.enable(2);
        e4.logarithmicDepthBuffer && o.enable(3);
        e4.reverseDepthBuffer && o.enable(4);
        e4.skinning && o.enable(5);
        e4.morphTargets && o.enable(6);
        e4.morphNormals && o.enable(7);
        e4.morphColors && o.enable(8);
        e4.premultipliedAlpha && o.enable(9);
        e4.shadowMapEnabled && o.enable(10);
        e4.doubleSided && o.enable(11);
        e4.flipSided && o.enable(12);
        e4.useDepthPacking && o.enable(13);
        e4.dithering && o.enable(14);
        e4.transmission && o.enable(15);
        e4.sheen && o.enable(16);
        e4.opaque && o.enable(17);
        e4.pointsUvs && o.enable(18);
        e4.decodeVideoTexture && o.enable(19);
        e4.decodeVideoTextureEmissive && o.enable(20);
        e4.alphaToCoverage && o.enable(21);
        t3.push(o.mask);
      })(n2, e3), n2.push(t2.outputColorSpace)), n2.push(e3.customProgramCacheKey), n2.join();
    }, getUniforms: function(t3) {
      const e3 = m[t3.type];
      let n2;
      if (e3) {
        const t4 = pa[e3];
        n2 = Ws.clone(t4.uniforms);
      } else n2 = t3.uniforms;
      return n2;
    }, acquireProgram: function(e3, n2) {
      let i2;
      for (let t3 = 0, e4 = h.length; t3 < e4; t3++) {
        const e5 = h[t3];
        if (e5.cacheKey === n2) {
          i2 = e5, ++i2.usedTimes;
          break;
        }
      }
      return void 0 === i2 && (i2 = new yl(t2, n2, e3, s), h.push(i2)), i2;
    }, releaseProgram: function(t3) {
      if (0 == --t3.usedTimes) {
        const e3 = h.indexOf(t3);
        h[e3] = h[h.length - 1], h.pop(), t3.destroy();
      }
    }, releaseShaderCache: function(t3) {
      l.remove(t3);
    }, programs: h, dispose: function() {
      l.dispose();
    } };
  }
  function wl() {
    let t2 = /* @__PURE__ */ new WeakMap();
    return { has: function(e2) {
      return t2.has(e2);
    }, get: function(e2) {
      let n = t2.get(e2);
      return void 0 === n && (n = {}, t2.set(e2, n)), n;
    }, remove: function(e2) {
      t2.delete(e2);
    }, update: function(e2, n, i) {
      t2.get(e2)[n] = i;
    }, dispose: function() {
      t2 = /* @__PURE__ */ new WeakMap();
    } };
  }
  function El(t2, e2) {
    return t2.groupOrder !== e2.groupOrder ? t2.groupOrder - e2.groupOrder : t2.renderOrder !== e2.renderOrder ? t2.renderOrder - e2.renderOrder : t2.material.id !== e2.material.id ? t2.material.id - e2.material.id : t2.z !== e2.z ? t2.z - e2.z : t2.id - e2.id;
  }
  function Al(t2, e2) {
    return t2.groupOrder !== e2.groupOrder ? t2.groupOrder - e2.groupOrder : t2.renderOrder !== e2.renderOrder ? t2.renderOrder - e2.renderOrder : t2.z !== e2.z ? e2.z - t2.z : t2.id - e2.id;
  }
  function Rl() {
    const t2 = [];
    let e2 = 0;
    const n = [], i = [], r = [];
    function s(n2, i2, r2, s2, a, o) {
      let l = t2[e2];
      return void 0 === l ? (l = { id: n2.id, object: n2, geometry: i2, material: r2, groupOrder: s2, renderOrder: n2.renderOrder, z: a, group: o }, t2[e2] = l) : (l.id = n2.id, l.object = n2, l.geometry = i2, l.material = r2, l.groupOrder = s2, l.renderOrder = n2.renderOrder, l.z = a, l.group = o), e2++, l;
    }
    return { opaque: n, transmissive: i, transparent: r, init: function() {
      e2 = 0, n.length = 0, i.length = 0, r.length = 0;
    }, push: function(t3, e3, a, o, l, c) {
      const h = s(t3, e3, a, o, l, c);
      a.transmission > 0 ? i.push(h) : true === a.transparent ? r.push(h) : n.push(h);
    }, unshift: function(t3, e3, a, o, l, c) {
      const h = s(t3, e3, a, o, l, c);
      a.transmission > 0 ? i.unshift(h) : true === a.transparent ? r.unshift(h) : n.unshift(h);
    }, finish: function() {
      for (let n2 = e2, i2 = t2.length; n2 < i2; n2++) {
        const e3 = t2[n2];
        if (null === e3.id) break;
        e3.id = null, e3.object = null, e3.geometry = null, e3.material = null, e3.group = null;
      }
    }, sort: function(t3, e3) {
      n.length > 1 && n.sort(t3 || El), i.length > 1 && i.sort(e3 || Al), r.length > 1 && r.sort(e3 || Al);
    } };
  }
  function Cl() {
    let t2 = /* @__PURE__ */ new WeakMap();
    return { get: function(e2, n) {
      const i = t2.get(e2);
      let r;
      return void 0 === i ? (r = new Rl(), t2.set(e2, [r])) : n >= i.length ? (r = new Rl(), i.push(r)) : r = i[n], r;
    }, dispose: function() {
      t2 = /* @__PURE__ */ new WeakMap();
    } };
  }
  function Il() {
    const t2 = {};
    return { get: function(e2) {
      if (void 0 !== t2[e2.id]) return t2[e2.id];
      let n;
      switch (e2.type) {
        case "DirectionalLight":
          n = { direction: new Ci(), color: new Kr() };
          break;
        case "SpotLight":
          n = { position: new Ci(), direction: new Ci(), color: new Kr(), distance: 0, coneCos: 0, penumbraCos: 0, decay: 0 };
          break;
        case "PointLight":
          n = { position: new Ci(), color: new Kr(), distance: 0, decay: 0 };
          break;
        case "HemisphereLight":
          n = { direction: new Ci(), skyColor: new Kr(), groundColor: new Kr() };
          break;
        case "RectAreaLight":
          n = { color: new Kr(), position: new Ci(), halfWidth: new Ci(), halfHeight: new Ci() };
      }
      return t2[e2.id] = n, n;
    } };
  }
  var Pl = 0;
  function Ll(t2, e2) {
    return (e2.castShadow ? 2 : 0) - (t2.castShadow ? 2 : 0) + (e2.map ? 1 : 0) - (t2.map ? 1 : 0);
  }
  function Ul(t2) {
    const e2 = new Il(), n = /* @__PURE__ */ (function() {
      const t3 = {};
      return { get: function(e3) {
        if (void 0 !== t3[e3.id]) return t3[e3.id];
        let n2;
        switch (e3.type) {
          case "DirectionalLight":
          case "SpotLight":
            n2 = { shadowIntensity: 1, shadowBias: 0, shadowNormalBias: 0, shadowRadius: 1, shadowMapSize: new Jn() };
            break;
          case "PointLight":
            n2 = { shadowIntensity: 1, shadowBias: 0, shadowNormalBias: 0, shadowRadius: 1, shadowMapSize: new Jn(), shadowCameraNear: 1, shadowCameraFar: 1e3 };
        }
        return t3[e3.id] = n2, n2;
      } };
    })(), i = { version: 0, hash: { directionalLength: -1, pointLength: -1, spotLength: -1, rectAreaLength: -1, hemiLength: -1, numDirectionalShadows: -1, numPointShadows: -1, numSpotShadows: -1, numSpotMaps: -1, numLightProbes: -1 }, ambient: [0, 0, 0], probe: [], directional: [], directionalShadow: [], directionalShadowMap: [], directionalShadowMatrix: [], spot: [], spotLightMap: [], spotShadow: [], spotShadowMap: [], spotLightMatrix: [], rectArea: [], rectAreaLTC1: null, rectAreaLTC2: null, point: [], pointShadow: [], pointShadowMap: [], pointShadowMatrix: [], hemi: [], numSpotLightShadowsWithMaps: 0, numLightProbes: 0 };
    for (let t3 = 0; t3 < 9; t3++) i.probe.push(new Ci());
    const r = new Ci(), s = new sr(), a = new sr();
    return { setup: function(r2) {
      let s2 = 0, a2 = 0, o = 0;
      for (let t3 = 0; t3 < 9; t3++) i.probe[t3].set(0, 0, 0);
      let l = 0, c = 0, h = 0, u2 = 0, d2 = 0, p2 = 0, m = 0, f = 0, g = 0, v = 0, _ = 0;
      r2.sort(Ll);
      for (let t3 = 0, x2 = r2.length; t3 < x2; t3++) {
        const x3 = r2[t3], y2 = x3.color, M2 = x3.intensity, S2 = x3.distance, b = x3.shadow && x3.shadow.map ? x3.shadow.map.texture : null;
        if (x3.isAmbientLight) s2 += y2.r * M2, a2 += y2.g * M2, o += y2.b * M2;
        else if (x3.isLightProbe) {
          for (let t4 = 0; t4 < 9; t4++) i.probe[t4].addScaledVector(x3.sh.coefficients[t4], M2);
          _++;
        } else if (x3.isDirectionalLight) {
          const t4 = e2.get(x3);
          if (t4.color.copy(x3.color).multiplyScalar(x3.intensity), x3.castShadow) {
            const t5 = x3.shadow, e3 = n.get(x3);
            e3.shadowIntensity = t5.intensity, e3.shadowBias = t5.bias, e3.shadowNormalBias = t5.normalBias, e3.shadowRadius = t5.radius, e3.shadowMapSize = t5.mapSize, i.directionalShadow[l] = e3, i.directionalShadowMap[l] = b, i.directionalShadowMatrix[l] = x3.shadow.matrix, p2++;
          }
          i.directional[l] = t4, l++;
        } else if (x3.isSpotLight) {
          const t4 = e2.get(x3);
          t4.position.setFromMatrixPosition(x3.matrixWorld), t4.color.copy(y2).multiplyScalar(M2), t4.distance = S2, t4.coneCos = Math.cos(x3.angle), t4.penumbraCos = Math.cos(x3.angle * (1 - x3.penumbra)), t4.decay = x3.decay, i.spot[h] = t4;
          const r3 = x3.shadow;
          if (x3.map && (i.spotLightMap[g] = x3.map, g++, r3.updateMatrices(x3), x3.castShadow && v++), i.spotLightMatrix[h] = r3.matrix, x3.castShadow) {
            const t5 = n.get(x3);
            t5.shadowIntensity = r3.intensity, t5.shadowBias = r3.bias, t5.shadowNormalBias = r3.normalBias, t5.shadowRadius = r3.radius, t5.shadowMapSize = r3.mapSize, i.spotShadow[h] = t5, i.spotShadowMap[h] = b, f++;
          }
          h++;
        } else if (x3.isRectAreaLight) {
          const t4 = e2.get(x3);
          t4.color.copy(y2).multiplyScalar(M2), t4.halfWidth.set(0.5 * x3.width, 0, 0), t4.halfHeight.set(0, 0.5 * x3.height, 0), i.rectArea[u2] = t4, u2++;
        } else if (x3.isPointLight) {
          const t4 = e2.get(x3);
          if (t4.color.copy(x3.color).multiplyScalar(x3.intensity), t4.distance = x3.distance, t4.decay = x3.decay, x3.castShadow) {
            const t5 = x3.shadow, e3 = n.get(x3);
            e3.shadowIntensity = t5.intensity, e3.shadowBias = t5.bias, e3.shadowNormalBias = t5.normalBias, e3.shadowRadius = t5.radius, e3.shadowMapSize = t5.mapSize, e3.shadowCameraNear = t5.camera.near, e3.shadowCameraFar = t5.camera.far, i.pointShadow[c] = e3, i.pointShadowMap[c] = b, i.pointShadowMatrix[c] = x3.shadow.matrix, m++;
          }
          i.point[c] = t4, c++;
        } else if (x3.isHemisphereLight) {
          const t4 = e2.get(x3);
          t4.skyColor.copy(x3.color).multiplyScalar(M2), t4.groundColor.copy(x3.groundColor).multiplyScalar(M2), i.hemi[d2] = t4, d2++;
        }
      }
      u2 > 0 && (true === t2.has("OES_texture_float_linear") ? (i.rectAreaLTC1 = da.LTC_FLOAT_1, i.rectAreaLTC2 = da.LTC_FLOAT_2) : (i.rectAreaLTC1 = da.LTC_HALF_1, i.rectAreaLTC2 = da.LTC_HALF_2)), i.ambient[0] = s2, i.ambient[1] = a2, i.ambient[2] = o;
      const x = i.hash;
      x.directionalLength === l && x.pointLength === c && x.spotLength === h && x.rectAreaLength === u2 && x.hemiLength === d2 && x.numDirectionalShadows === p2 && x.numPointShadows === m && x.numSpotShadows === f && x.numSpotMaps === g && x.numLightProbes === _ || (i.directional.length = l, i.spot.length = h, i.rectArea.length = u2, i.point.length = c, i.hemi.length = d2, i.directionalShadow.length = p2, i.directionalShadowMap.length = p2, i.pointShadow.length = m, i.pointShadowMap.length = m, i.spotShadow.length = f, i.spotShadowMap.length = f, i.directionalShadowMatrix.length = p2, i.pointShadowMatrix.length = m, i.spotLightMatrix.length = f + g - v, i.spotLightMap.length = g, i.numSpotLightShadowsWithMaps = v, i.numLightProbes = _, x.directionalLength = l, x.pointLength = c, x.spotLength = h, x.rectAreaLength = u2, x.hemiLength = d2, x.numDirectionalShadows = p2, x.numPointShadows = m, x.numSpotShadows = f, x.numSpotMaps = g, x.numLightProbes = _, i.version = Pl++);
    }, setupView: function(t3, e3) {
      let n2 = 0, o = 0, l = 0, c = 0, h = 0;
      const u2 = e3.matrixWorldInverse;
      for (let e4 = 0, d2 = t3.length; e4 < d2; e4++) {
        const d3 = t3[e4];
        if (d3.isDirectionalLight) {
          const t4 = i.directional[n2];
          t4.direction.setFromMatrixPosition(d3.matrixWorld), r.setFromMatrixPosition(d3.target.matrixWorld), t4.direction.sub(r), t4.direction.transformDirection(u2), n2++;
        } else if (d3.isSpotLight) {
          const t4 = i.spot[l];
          t4.position.setFromMatrixPosition(d3.matrixWorld), t4.position.applyMatrix4(u2), t4.direction.setFromMatrixPosition(d3.matrixWorld), r.setFromMatrixPosition(d3.target.matrixWorld), t4.direction.sub(r), t4.direction.transformDirection(u2), l++;
        } else if (d3.isRectAreaLight) {
          const t4 = i.rectArea[c];
          t4.position.setFromMatrixPosition(d3.matrixWorld), t4.position.applyMatrix4(u2), a.identity(), s.copy(d3.matrixWorld), s.premultiply(u2), a.extractRotation(s), t4.halfWidth.set(0.5 * d3.width, 0, 0), t4.halfHeight.set(0, 0.5 * d3.height, 0), t4.halfWidth.applyMatrix4(a), t4.halfHeight.applyMatrix4(a), c++;
        } else if (d3.isPointLight) {
          const t4 = i.point[o];
          t4.position.setFromMatrixPosition(d3.matrixWorld), t4.position.applyMatrix4(u2), o++;
        } else if (d3.isHemisphereLight) {
          const t4 = i.hemi[h];
          t4.direction.setFromMatrixPosition(d3.matrixWorld), t4.direction.transformDirection(u2), h++;
        }
      }
    }, state: i };
  }
  function Dl(t2) {
    const e2 = new Ul(t2), n = [], i = [];
    const r = { lightsArray: n, shadowsArray: i, camera: null, lights: e2, transmissionRenderTarget: {} };
    return { init: function(t3) {
      r.camera = t3, n.length = 0, i.length = 0;
    }, state: r, setupLights: function() {
      e2.setup(n);
    }, setupLightsView: function(t3) {
      e2.setupView(n, t3);
    }, pushLight: function(t3) {
      n.push(t3);
    }, pushShadow: function(t3) {
      i.push(t3);
    } };
  }
  function Nl(t2) {
    let e2 = /* @__PURE__ */ new WeakMap();
    return { get: function(n, i = 0) {
      const r = e2.get(n);
      let s;
      return void 0 === r ? (s = new Dl(t2), e2.set(n, [s])) : i >= r.length ? (s = new Dl(t2), r.push(s)) : s = r[i], s;
    }, dispose: function() {
      e2 = /* @__PURE__ */ new WeakMap();
    } };
  }
  var Ol = class extends ts {
    static get type() {
      return "MeshDepthMaterial";
    }
    constructor(t2) {
      super(), this.isMeshDepthMaterial = true, this.depthPacking = 3200, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = false, this.wireframeLinewidth = 1, this.setValues(t2);
    }
    copy(t2) {
      return super.copy(t2), this.depthPacking = t2.depthPacking, this.map = t2.map, this.alphaMap = t2.alphaMap, this.displacementMap = t2.displacementMap, this.displacementScale = t2.displacementScale, this.displacementBias = t2.displacementBias, this.wireframe = t2.wireframe, this.wireframeLinewidth = t2.wireframeLinewidth, this;
    }
  };
  var Fl = class extends ts {
    static get type() {
      return "MeshDistanceMaterial";
    }
    constructor(t2) {
      super(), this.isMeshDistanceMaterial = true, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.setValues(t2);
    }
    copy(t2) {
      return super.copy(t2), this.map = t2.map, this.alphaMap = t2.alphaMap, this.displacementMap = t2.displacementMap, this.displacementScale = t2.displacementScale, this.displacementBias = t2.displacementBias, this;
    }
  };
  function Bl(t2, e2, n) {
    let i = new oa();
    const r = new Jn(), s = new Jn(), a = new Mi(), o = new Ol({ depthPacking: 3201 }), l = new Fl(), c = {}, h = n.maxTextureSize, m = { [u]: 1, [d]: 0, [p]: 2 }, f = new Xs({ defines: { VSM_SAMPLES: 8 }, uniforms: { shadow_pass: { value: null }, resolution: { value: new Jn() }, radius: { value: 4 } }, vertexShader: "void main() {\n	gl_Position = vec4( position, 1.0 );\n}", fragmentShader: "uniform sampler2D shadow_pass;\nuniform vec2 resolution;\nuniform float radius;\n#include <packing>\nvoid main() {\n	const float samples = float( VSM_SAMPLES );\n	float mean = 0.0;\n	float squared_mean = 0.0;\n	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );\n	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;\n	for ( float i = 0.0; i < samples; i ++ ) {\n		float uvOffset = uvStart + i * uvStride;\n		#ifdef HORIZONTAL_PASS\n			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );\n			mean += distribution.x;\n			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;\n		#else\n			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );\n			mean += depth;\n			squared_mean += depth * depth;\n		#endif\n	}\n	mean = mean / samples;\n	squared_mean = squared_mean / samples;\n	float std_dev = sqrt( squared_mean - mean * mean );\n	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );\n}" }), g = f.clone();
    g.defines.HORIZONTAL_PASS = 1;
    const v = new Es();
    v.setAttribute("position", new cs(new Float32Array([-1, -1, 0.5, 3, -1, 0.5, -1, 3, 0.5]), 3));
    const _ = new Bs(v, f), x = this;
    this.enabled = false, this.autoUpdate = true, this.needsUpdate = false, this.type = 1;
    let y2 = this.type;
    function M2(n2, i2) {
      const s2 = e2.update(_);
      f.defines.VSM_SAMPLES !== n2.blurSamples && (f.defines.VSM_SAMPLES = n2.blurSamples, g.defines.VSM_SAMPLES = n2.blurSamples, f.needsUpdate = true, g.needsUpdate = true), null === n2.mapPass && (n2.mapPass = new bi(r.x, r.y)), f.uniforms.shadow_pass.value = n2.map.texture, f.uniforms.resolution.value = n2.mapSize, f.uniforms.radius.value = n2.radius, t2.setRenderTarget(n2.mapPass), t2.clear(), t2.renderBufferDirect(i2, null, s2, f, _, null), g.uniforms.shadow_pass.value = n2.mapPass.texture, g.uniforms.resolution.value = n2.mapSize, g.uniforms.radius.value = n2.radius, t2.setRenderTarget(n2.map), t2.clear(), t2.renderBufferDirect(i2, null, s2, g, _, null);
    }
    function S2(e3, n2, i2, r2) {
      let s2 = null;
      const a2 = true === i2.isPointLight ? e3.customDistanceMaterial : e3.customDepthMaterial;
      if (void 0 !== a2) s2 = a2;
      else if (s2 = true === i2.isPointLight ? l : o, t2.localClippingEnabled && true === n2.clipShadows && Array.isArray(n2.clippingPlanes) && 0 !== n2.clippingPlanes.length || n2.displacementMap && 0 !== n2.displacementScale || n2.alphaMap && n2.alphaTest > 0 || n2.map && n2.alphaTest > 0) {
        const t3 = s2.uuid, e4 = n2.uuid;
        let i3 = c[t3];
        void 0 === i3 && (i3 = {}, c[t3] = i3);
        let r3 = i3[e4];
        void 0 === r3 && (r3 = s2.clone(), i3[e4] = r3, n2.addEventListener("dispose", T)), s2 = r3;
      }
      if (s2.visible = n2.visible, s2.wireframe = n2.wireframe, s2.side = 3 === r2 ? null !== n2.shadowSide ? n2.shadowSide : n2.side : null !== n2.shadowSide ? n2.shadowSide : m[n2.side], s2.alphaMap = n2.alphaMap, s2.alphaTest = n2.alphaTest, s2.map = n2.map, s2.clipShadows = n2.clipShadows, s2.clippingPlanes = n2.clippingPlanes, s2.clipIntersection = n2.clipIntersection, s2.displacementMap = n2.displacementMap, s2.displacementScale = n2.displacementScale, s2.displacementBias = n2.displacementBias, s2.wireframeLinewidth = n2.wireframeLinewidth, s2.linewidth = n2.linewidth, true === i2.isPointLight && true === s2.isMeshDistanceMaterial) {
        t2.properties.get(s2).light = i2;
      }
      return s2;
    }
    function b(n2, r2, s2, a2, o2) {
      if (false === n2.visible) return;
      if (n2.layers.test(r2.layers) && (n2.isMesh || n2.isLine || n2.isPoints) && (n2.castShadow || n2.receiveShadow && 3 === o2) && (!n2.frustumCulled || i.intersectsObject(n2))) {
        n2.modelViewMatrix.multiplyMatrices(s2.matrixWorldInverse, n2.matrixWorld);
        const i2 = e2.update(n2), l3 = n2.material;
        if (Array.isArray(l3)) {
          const e3 = i2.groups;
          for (let c2 = 0, h2 = e3.length; c2 < h2; c2++) {
            const h3 = e3[c2], u2 = l3[h3.materialIndex];
            if (u2 && u2.visible) {
              const e4 = S2(n2, u2, a2, o2);
              n2.onBeforeShadow(t2, n2, r2, s2, i2, e4, h3), t2.renderBufferDirect(s2, null, i2, e4, n2, h3), n2.onAfterShadow(t2, n2, r2, s2, i2, e4, h3);
            }
          }
        } else if (l3.visible) {
          const e3 = S2(n2, l3, a2, o2);
          n2.onBeforeShadow(t2, n2, r2, s2, i2, e3, null), t2.renderBufferDirect(s2, null, i2, e3, n2, null), n2.onAfterShadow(t2, n2, r2, s2, i2, e3, null);
        }
      }
      const l2 = n2.children;
      for (let t3 = 0, e3 = l2.length; t3 < e3; t3++) b(l2[t3], r2, s2, a2, o2);
    }
    function T(t3) {
      t3.target.removeEventListener("dispose", T);
      for (const e3 in c) {
        const n2 = c[e3], i2 = t3.target.uuid;
        if (i2 in n2) {
          n2[i2].dispose(), delete n2[i2];
        }
      }
    }
    this.render = function(e3, n2, o2) {
      if (false === x.enabled) return;
      if (false === x.autoUpdate && false === x.needsUpdate) return;
      if (0 === e3.length) return;
      const l2 = t2.getRenderTarget(), c2 = t2.getActiveCubeFace(), u2 = t2.getActiveMipmapLevel(), d2 = t2.state;
      d2.setBlending(0), d2.buffers.color.setClear(1, 1, 1, 1), d2.buffers.depth.setTest(true), d2.setScissorTest(false);
      const p2 = 3 !== y2 && 3 === this.type, m2 = 3 === y2 && 3 !== this.type;
      for (let l3 = 0, c3 = e3.length; l3 < c3; l3++) {
        const c4 = e3[l3], u3 = c4.shadow;
        if (void 0 === u3) {
          console.warn("THREE.WebGLShadowMap:", c4, "has no shadow.");
          continue;
        }
        if (false === u3.autoUpdate && false === u3.needsUpdate) continue;
        r.copy(u3.mapSize);
        const f2 = u3.getFrameExtents();
        if (r.multiply(f2), s.copy(u3.mapSize), (r.x > h || r.y > h) && (r.x > h && (s.x = Math.floor(h / f2.x), r.x = s.x * f2.x, u3.mapSize.x = s.x), r.y > h && (s.y = Math.floor(h / f2.y), r.y = s.y * f2.y, u3.mapSize.y = s.y)), null === u3.map || true === p2 || true === m2) {
          const t3 = 3 !== this.type ? { minFilter: gt, magFilter: gt } : {};
          null !== u3.map && u3.map.dispose(), u3.map = new bi(r.x, r.y, t3), u3.map.texture.name = c4.name + ".shadowMap", u3.camera.updateProjectionMatrix();
        }
        t2.setRenderTarget(u3.map), t2.clear();
        const g2 = u3.getViewportCount();
        for (let t3 = 0; t3 < g2; t3++) {
          const e4 = u3.getViewport(t3);
          a.set(s.x * e4.x, s.y * e4.y, s.x * e4.z, s.y * e4.w), d2.viewport(a), u3.updateMatrices(c4, t3), i = u3.getFrustum(), b(n2, o2, u3.camera, c4, this.type);
        }
        true !== u3.isPointLightShadow && 3 === this.type && M2(u3, o2), u3.needsUpdate = false;
      }
      y2 = this.type, x.needsUpdate = false, t2.setRenderTarget(l2, c2, u2);
    };
  }
  var zl = { [k]: 1, [H]: 6, [W]: 7, [G]: 5, [V]: 0, [j]: 2, [q]: 4, [X]: 3 };
  function kl(t2, e2) {
    const n = new function() {
      let e3 = false;
      const n2 = new Mi();
      let i2 = null;
      const r2 = new Mi(0, 0, 0, 0);
      return { setMask: function(n3) {
        i2 === n3 || e3 || (t2.colorMask(n3, n3, n3, n3), i2 = n3);
      }, setLocked: function(t3) {
        e3 = t3;
      }, setClear: function(e4, i3, s2, a2, o2) {
        true === o2 && (e4 *= a2, i3 *= a2, s2 *= a2), n2.set(e4, i3, s2, a2), false === r2.equals(n2) && (t2.clearColor(e4, i3, s2, a2), r2.copy(n2));
      }, reset: function() {
        e3 = false, i2 = null, r2.set(-1, 0, 0, 0);
      } };
    }(), i = new function() {
      let n2 = false, i2 = false, r2 = null, s2 = null, a2 = null;
      return { setReversed: function(t3) {
        if (i2 !== t3) {
          const t4 = e2.get("EXT_clip_control");
          i2 ? t4.clipControlEXT(t4.LOWER_LEFT_EXT, t4.ZERO_TO_ONE_EXT) : t4.clipControlEXT(t4.LOWER_LEFT_EXT, t4.NEGATIVE_ONE_TO_ONE_EXT);
          const n3 = a2;
          a2 = null, this.setClear(n3);
        }
        i2 = t3;
      }, getReversed: function() {
        return i2;
      }, setTest: function(e3) {
        e3 ? rt(t2.DEPTH_TEST) : st(t2.DEPTH_TEST);
      }, setMask: function(e3) {
        r2 === e3 || n2 || (t2.depthMask(e3), r2 = e3);
      }, setFunc: function(e3) {
        if (i2 && (e3 = zl[e3]), s2 !== e3) {
          switch (e3) {
            case 0:
              t2.depthFunc(t2.NEVER);
              break;
            case 1:
              t2.depthFunc(t2.ALWAYS);
              break;
            case 2:
              t2.depthFunc(t2.LESS);
              break;
            case 3:
            default:
              t2.depthFunc(t2.LEQUAL);
              break;
            case 4:
              t2.depthFunc(t2.EQUAL);
              break;
            case 5:
              t2.depthFunc(t2.GEQUAL);
              break;
            case 6:
              t2.depthFunc(t2.GREATER);
              break;
            case 7:
              t2.depthFunc(t2.NOTEQUAL);
          }
          s2 = e3;
        }
      }, setLocked: function(t3) {
        n2 = t3;
      }, setClear: function(e3) {
        a2 !== e3 && (i2 && (e3 = 1 - e3), t2.clearDepth(e3), a2 = e3);
      }, reset: function() {
        n2 = false, r2 = null, s2 = null, a2 = null, i2 = false;
      } };
    }(), r = new function() {
      let e3 = false, n2 = null, i2 = null, r2 = null, s2 = null, a2 = null, o2 = null, l2 = null, c2 = null;
      return { setTest: function(n3) {
        e3 || (n3 ? rt(t2.STENCIL_TEST) : st(t2.STENCIL_TEST));
      }, setMask: function(i3) {
        n2 === i3 || e3 || (t2.stencilMask(i3), n2 = i3);
      }, setFunc: function(e4, n3, a3) {
        i2 === e4 && r2 === n3 && s2 === a3 || (t2.stencilFunc(e4, n3, a3), i2 = e4, r2 = n3, s2 = a3);
      }, setOp: function(e4, n3, i3) {
        a2 === e4 && o2 === n3 && l2 === i3 || (t2.stencilOp(e4, n3, i3), a2 = e4, o2 = n3, l2 = i3);
      }, setLocked: function(t3) {
        e3 = t3;
      }, setClear: function(e4) {
        c2 !== e4 && (t2.clearStencil(e4), c2 = e4);
      }, reset: function() {
        e3 = false, n2 = null, i2 = null, r2 = null, s2 = null, a2 = null, o2 = null, l2 = null, c2 = null;
      } };
    }(), s = /* @__PURE__ */ new WeakMap(), a = /* @__PURE__ */ new WeakMap();
    let o = {}, l = {}, c = /* @__PURE__ */ new WeakMap(), h = [], u2 = null, d2 = false, p2 = null, m = null, f = null, g = null, v = null, _ = null, x = null, b = new Kr(0, 0, 0), T = 0, k2 = false, V2 = null, H2 = null, G2 = null, W2 = null, X2 = null;
    const j2 = t2.getParameter(t2.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    let q2 = false, Y = 0;
    const Z = t2.getParameter(t2.VERSION);
    -1 !== Z.indexOf("WebGL") ? (Y = parseFloat(/^WebGL (\d)/.exec(Z)[1]), q2 = Y >= 1) : -1 !== Z.indexOf("OpenGL ES") && (Y = parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]), q2 = Y >= 2);
    let J = null, K = {};
    const $ = t2.getParameter(t2.SCISSOR_BOX), Q = t2.getParameter(t2.VIEWPORT), tt = new Mi().fromArray($), et = new Mi().fromArray(Q);
    function nt(e3, n2, i2, r2) {
      const s2 = new Uint8Array(4), a2 = t2.createTexture();
      t2.bindTexture(e3, a2), t2.texParameteri(e3, t2.TEXTURE_MIN_FILTER, t2.NEAREST), t2.texParameteri(e3, t2.TEXTURE_MAG_FILTER, t2.NEAREST);
      for (let a3 = 0; a3 < i2; a3++) e3 === t2.TEXTURE_3D || e3 === t2.TEXTURE_2D_ARRAY ? t2.texImage3D(n2, 0, t2.RGBA, 1, 1, r2, 0, t2.RGBA, t2.UNSIGNED_BYTE, s2) : t2.texImage2D(n2 + a3, 0, t2.RGBA, 1, 1, 0, t2.RGBA, t2.UNSIGNED_BYTE, s2);
      return a2;
    }
    const it = {};
    function rt(e3) {
      true !== o[e3] && (t2.enable(e3), o[e3] = true);
    }
    function st(e3) {
      false !== o[e3] && (t2.disable(e3), o[e3] = false);
    }
    it[t2.TEXTURE_2D] = nt(t2.TEXTURE_2D, t2.TEXTURE_2D, 1), it[t2.TEXTURE_CUBE_MAP] = nt(t2.TEXTURE_CUBE_MAP, t2.TEXTURE_CUBE_MAP_POSITIVE_X, 6), it[t2.TEXTURE_2D_ARRAY] = nt(t2.TEXTURE_2D_ARRAY, t2.TEXTURE_2D_ARRAY, 1, 1), it[t2.TEXTURE_3D] = nt(t2.TEXTURE_3D, t2.TEXTURE_3D, 1, 1), n.setClear(0, 0, 0, 1), i.setClear(1), r.setClear(0), rt(t2.DEPTH_TEST), i.setFunc(3), ct2(false), ht2(1), rt(t2.CULL_FACE), lt2(0);
    const at = { [y]: t2.FUNC_ADD, [M]: t2.FUNC_SUBTRACT, [S]: t2.FUNC_REVERSE_SUBTRACT };
    at[103] = t2.MIN, at[104] = t2.MAX;
    const ot2 = { [w]: t2.ZERO, [E]: t2.ONE, [A]: t2.SRC_COLOR, [C]: t2.SRC_ALPHA, [N]: t2.SRC_ALPHA_SATURATE, [U]: t2.DST_COLOR, [P]: t2.DST_ALPHA, [R]: t2.ONE_MINUS_SRC_COLOR, [I]: t2.ONE_MINUS_SRC_ALPHA, [D]: t2.ONE_MINUS_DST_COLOR, [L]: t2.ONE_MINUS_DST_ALPHA, [O]: t2.CONSTANT_COLOR, [F]: t2.ONE_MINUS_CONSTANT_COLOR, [B]: t2.CONSTANT_ALPHA, [z]: t2.ONE_MINUS_CONSTANT_ALPHA };
    function lt2(e3, n2, i2, r2, s2, a2, o2, l2, c2, h2) {
      if (0 !== e3) {
        if (false === d2 && (rt(t2.BLEND), d2 = true), 5 === e3) s2 = s2 || n2, a2 = a2 || i2, o2 = o2 || r2, n2 === m && s2 === v || (t2.blendEquationSeparate(at[n2], at[s2]), m = n2, v = s2), i2 === f && r2 === g && a2 === _ && o2 === x || (t2.blendFuncSeparate(ot2[i2], ot2[r2], ot2[a2], ot2[o2]), f = i2, g = r2, _ = a2, x = o2), false !== l2.equals(b) && c2 === T || (t2.blendColor(l2.r, l2.g, l2.b, c2), b.copy(l2), T = c2), p2 = e3, k2 = false;
        else if (e3 !== p2 || h2 !== k2) {
          if (m === y && v === y || (t2.blendEquation(t2.FUNC_ADD), m = y, v = y), h2) switch (e3) {
            case 1:
              t2.blendFuncSeparate(t2.ONE, t2.ONE_MINUS_SRC_ALPHA, t2.ONE, t2.ONE_MINUS_SRC_ALPHA);
              break;
            case 2:
              t2.blendFunc(t2.ONE, t2.ONE);
              break;
            case 3:
              t2.blendFuncSeparate(t2.ZERO, t2.ONE_MINUS_SRC_COLOR, t2.ZERO, t2.ONE);
              break;
            case 4:
              t2.blendFuncSeparate(t2.ZERO, t2.SRC_COLOR, t2.ZERO, t2.SRC_ALPHA);
              break;
            default:
              console.error("THREE.WebGLState: Invalid blending: ", e3);
          }
          else switch (e3) {
            case 1:
              t2.blendFuncSeparate(t2.SRC_ALPHA, t2.ONE_MINUS_SRC_ALPHA, t2.ONE, t2.ONE_MINUS_SRC_ALPHA);
              break;
            case 2:
              t2.blendFunc(t2.SRC_ALPHA, t2.ONE);
              break;
            case 3:
              t2.blendFuncSeparate(t2.ZERO, t2.ONE_MINUS_SRC_COLOR, t2.ZERO, t2.ONE);
              break;
            case 4:
              t2.blendFunc(t2.ZERO, t2.SRC_COLOR);
              break;
            default:
              console.error("THREE.WebGLState: Invalid blending: ", e3);
          }
          f = null, g = null, _ = null, x = null, b.set(0, 0, 0), T = 0, p2 = e3, k2 = h2;
        }
      } else true === d2 && (st(t2.BLEND), d2 = false);
    }
    function ct2(e3) {
      V2 !== e3 && (e3 ? t2.frontFace(t2.CW) : t2.frontFace(t2.CCW), V2 = e3);
    }
    function ht2(e3) {
      0 !== e3 ? (rt(t2.CULL_FACE), e3 !== H2 && (1 === e3 ? t2.cullFace(t2.BACK) : 2 === e3 ? t2.cullFace(t2.FRONT) : t2.cullFace(t2.FRONT_AND_BACK))) : st(t2.CULL_FACE), H2 = e3;
    }
    function ut2(e3, n2, i2) {
      e3 ? (rt(t2.POLYGON_OFFSET_FILL), W2 === n2 && X2 === i2 || (t2.polygonOffset(n2, i2), W2 = n2, X2 = i2)) : st(t2.POLYGON_OFFSET_FILL);
    }
    return { buffers: { color: n, depth: i, stencil: r }, enable: rt, disable: st, bindFramebuffer: function(e3, n2) {
      return l[e3] !== n2 && (t2.bindFramebuffer(e3, n2), l[e3] = n2, e3 === t2.DRAW_FRAMEBUFFER && (l[t2.FRAMEBUFFER] = n2), e3 === t2.FRAMEBUFFER && (l[t2.DRAW_FRAMEBUFFER] = n2), true);
    }, drawBuffers: function(e3, n2) {
      let i2 = h, r2 = false;
      if (e3) {
        i2 = c.get(n2), void 0 === i2 && (i2 = [], c.set(n2, i2));
        const s2 = e3.textures;
        if (i2.length !== s2.length || i2[0] !== t2.COLOR_ATTACHMENT0) {
          for (let e4 = 0, n3 = s2.length; e4 < n3; e4++) i2[e4] = t2.COLOR_ATTACHMENT0 + e4;
          i2.length = s2.length, r2 = true;
        }
      } else i2[0] !== t2.BACK && (i2[0] = t2.BACK, r2 = true);
      r2 && t2.drawBuffers(i2);
    }, useProgram: function(e3) {
      return u2 !== e3 && (t2.useProgram(e3), u2 = e3, true);
    }, setBlending: lt2, setMaterial: function(e3, s2) {
      2 === e3.side ? st(t2.CULL_FACE) : rt(t2.CULL_FACE);
      let a2 = 1 === e3.side;
      s2 && (a2 = !a2), ct2(a2), 1 === e3.blending && false === e3.transparent ? lt2(0) : lt2(e3.blending, e3.blendEquation, e3.blendSrc, e3.blendDst, e3.blendEquationAlpha, e3.blendSrcAlpha, e3.blendDstAlpha, e3.blendColor, e3.blendAlpha, e3.premultipliedAlpha), i.setFunc(e3.depthFunc), i.setTest(e3.depthTest), i.setMask(e3.depthWrite), n.setMask(e3.colorWrite);
      const o2 = e3.stencilWrite;
      r.setTest(o2), o2 && (r.setMask(e3.stencilWriteMask), r.setFunc(e3.stencilFunc, e3.stencilRef, e3.stencilFuncMask), r.setOp(e3.stencilFail, e3.stencilZFail, e3.stencilZPass)), ut2(e3.polygonOffset, e3.polygonOffsetFactor, e3.polygonOffsetUnits), true === e3.alphaToCoverage ? rt(t2.SAMPLE_ALPHA_TO_COVERAGE) : st(t2.SAMPLE_ALPHA_TO_COVERAGE);
    }, setFlipSided: ct2, setCullFace: ht2, setLineWidth: function(e3) {
      e3 !== G2 && (q2 && t2.lineWidth(e3), G2 = e3);
    }, setPolygonOffset: ut2, setScissorTest: function(e3) {
      e3 ? rt(t2.SCISSOR_TEST) : st(t2.SCISSOR_TEST);
    }, activeTexture: function(e3) {
      void 0 === e3 && (e3 = t2.TEXTURE0 + j2 - 1), J !== e3 && (t2.activeTexture(e3), J = e3);
    }, bindTexture: function(e3, n2, i2) {
      void 0 === i2 && (i2 = null === J ? t2.TEXTURE0 + j2 - 1 : J);
      let r2 = K[i2];
      void 0 === r2 && (r2 = { type: void 0, texture: void 0 }, K[i2] = r2), r2.type === e3 && r2.texture === n2 || (J !== i2 && (t2.activeTexture(i2), J = i2), t2.bindTexture(e3, n2 || it[e3]), r2.type = e3, r2.texture = n2);
    }, unbindTexture: function() {
      const e3 = K[J];
      void 0 !== e3 && void 0 !== e3.type && (t2.bindTexture(e3.type, null), e3.type = void 0, e3.texture = void 0);
    }, compressedTexImage2D: function() {
      try {
        t2.compressedTexImage2D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, compressedTexImage3D: function() {
      try {
        t2.compressedTexImage3D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, texImage2D: function() {
      try {
        t2.texImage2D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, texImage3D: function() {
      try {
        t2.texImage3D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, updateUBOMapping: function(e3, n2) {
      let i2 = a.get(n2);
      void 0 === i2 && (i2 = /* @__PURE__ */ new WeakMap(), a.set(n2, i2));
      let r2 = i2.get(e3);
      void 0 === r2 && (r2 = t2.getUniformBlockIndex(n2, e3.name), i2.set(e3, r2));
    }, uniformBlockBinding: function(e3, n2) {
      const i2 = a.get(n2).get(e3);
      s.get(n2) !== i2 && (t2.uniformBlockBinding(n2, i2, e3.__bindingPointIndex), s.set(n2, i2));
    }, texStorage2D: function() {
      try {
        t2.texStorage2D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, texStorage3D: function() {
      try {
        t2.texStorage3D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, texSubImage2D: function() {
      try {
        t2.texSubImage2D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, texSubImage3D: function() {
      try {
        t2.texSubImage3D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, compressedTexSubImage2D: function() {
      try {
        t2.compressedTexSubImage2D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, compressedTexSubImage3D: function() {
      try {
        t2.compressedTexSubImage3D.apply(t2, arguments);
      } catch (t3) {
        console.error("THREE.WebGLState:", t3);
      }
    }, scissor: function(e3) {
      false === tt.equals(e3) && (t2.scissor(e3.x, e3.y, e3.z, e3.w), tt.copy(e3));
    }, viewport: function(e3) {
      false === et.equals(e3) && (t2.viewport(e3.x, e3.y, e3.z, e3.w), et.copy(e3));
    }, reset: function() {
      t2.disable(t2.BLEND), t2.disable(t2.CULL_FACE), t2.disable(t2.DEPTH_TEST), t2.disable(t2.POLYGON_OFFSET_FILL), t2.disable(t2.SCISSOR_TEST), t2.disable(t2.STENCIL_TEST), t2.disable(t2.SAMPLE_ALPHA_TO_COVERAGE), t2.blendEquation(t2.FUNC_ADD), t2.blendFunc(t2.ONE, t2.ZERO), t2.blendFuncSeparate(t2.ONE, t2.ZERO, t2.ONE, t2.ZERO), t2.blendColor(0, 0, 0, 0), t2.colorMask(true, true, true, true), t2.clearColor(0, 0, 0, 0), t2.depthMask(true), t2.depthFunc(t2.LESS), i.setReversed(false), t2.clearDepth(1), t2.stencilMask(4294967295), t2.stencilFunc(t2.ALWAYS, 0, 4294967295), t2.stencilOp(t2.KEEP, t2.KEEP, t2.KEEP), t2.clearStencil(0), t2.cullFace(t2.BACK), t2.frontFace(t2.CCW), t2.polygonOffset(0, 0), t2.activeTexture(t2.TEXTURE0), t2.bindFramebuffer(t2.FRAMEBUFFER, null), t2.bindFramebuffer(t2.DRAW_FRAMEBUFFER, null), t2.bindFramebuffer(t2.READ_FRAMEBUFFER, null), t2.useProgram(null), t2.lineWidth(1), t2.scissor(0, 0, t2.canvas.width, t2.canvas.height), t2.viewport(0, 0, t2.canvas.width, t2.canvas.height), o = {}, J = null, K = {}, l = {}, c = /* @__PURE__ */ new WeakMap(), h = [], u2 = null, d2 = false, p2 = null, m = null, f = null, g = null, v = null, _ = null, x = null, b = new Kr(0, 0, 0), T = 0, k2 = false, V2 = null, H2 = null, G2 = null, W2 = null, X2 = null, tt.set(0, 0, t2.canvas.width, t2.canvas.height), et.set(0, 0, t2.canvas.width, t2.canvas.height), n.reset(), i.reset(), r.reset();
    } };
  }
  function Vl(t2, e2, n, i) {
    const r = (function(t3) {
      switch (t3) {
        case Et:
        case At:
          return { byteLength: 1, components: 1 };
        case Ct:
        case Rt:
        case Ut:
          return { byteLength: 2, components: 1 };
        case Dt:
        case Nt:
          return { byteLength: 2, components: 4 };
        case Pt:
        case It:
        case Lt:
          return { byteLength: 4, components: 1 };
        case Ft:
          return { byteLength: 4, components: 3 };
      }
      throw new Error(`Unknown texture type ${t3}.`);
    })(i);
    switch (n) {
      case Bt:
      case Vt:
        return t2 * e2;
      case Ht:
        return t2 * e2 * 2;
      case Xt:
      case jt:
        return t2 * e2 / r.components * r.byteLength;
      case qt:
      case Yt:
        return t2 * e2 * 2 / r.components * r.byteLength;
      case zt:
        return t2 * e2 * 3 / r.components * r.byteLength;
      case kt:
      case Jt:
        return t2 * e2 * 4 / r.components * r.byteLength;
      case Kt:
      case $t:
        return Math.floor((t2 + 3) / 4) * Math.floor((e2 + 3) / 4) * 8;
      case Qt:
      case te:
        return Math.floor((t2 + 3) / 4) * Math.floor((e2 + 3) / 4) * 16;
      case ne:
      case re:
        return Math.max(t2, 16) * Math.max(e2, 8) / 4;
      case ee:
      case ie:
        return Math.max(t2, 8) * Math.max(e2, 8) / 2;
      case se:
      case ae:
        return Math.floor((t2 + 3) / 4) * Math.floor((e2 + 3) / 4) * 8;
      case oe:
      case le:
        return Math.floor((t2 + 3) / 4) * Math.floor((e2 + 3) / 4) * 16;
      case ce:
        return Math.floor((t2 + 4) / 5) * Math.floor((e2 + 3) / 4) * 16;
      case he:
        return Math.floor((t2 + 4) / 5) * Math.floor((e2 + 4) / 5) * 16;
      case ue:
        return Math.floor((t2 + 5) / 6) * Math.floor((e2 + 4) / 5) * 16;
      case de:
        return Math.floor((t2 + 5) / 6) * Math.floor((e2 + 5) / 6) * 16;
      case pe:
        return Math.floor((t2 + 7) / 8) * Math.floor((e2 + 4) / 5) * 16;
      case me:
        return Math.floor((t2 + 7) / 8) * Math.floor((e2 + 5) / 6) * 16;
      case fe:
        return Math.floor((t2 + 7) / 8) * Math.floor((e2 + 7) / 8) * 16;
      case ge:
        return Math.floor((t2 + 9) / 10) * Math.floor((e2 + 4) / 5) * 16;
      case ve:
        return Math.floor((t2 + 9) / 10) * Math.floor((e2 + 5) / 6) * 16;
      case _e:
        return Math.floor((t2 + 9) / 10) * Math.floor((e2 + 7) / 8) * 16;
      case xe:
        return Math.floor((t2 + 9) / 10) * Math.floor((e2 + 9) / 10) * 16;
      case ye:
        return Math.floor((t2 + 11) / 12) * Math.floor((e2 + 9) / 10) * 16;
      case Me:
        return Math.floor((t2 + 11) / 12) * Math.floor((e2 + 11) / 12) * 16;
      case Se:
      case be:
      case Te:
        return Math.ceil(t2 / 4) * Math.ceil(e2 / 4) * 16;
      case we:
      case Ee:
        return Math.ceil(t2 / 4) * Math.ceil(e2 / 4) * 8;
      case Ae:
      case Re:
        return Math.ceil(t2 / 4) * Math.ceil(e2 / 4) * 16;
    }
    throw new Error(`Unable to determine texture byte length for ${n} format.`);
  }
  function Gl(t2, e2, n, i, r, s, a) {
    const o = e2.has("WEBGL_multisampled_render_to_texture") ? e2.get("WEBGL_multisampled_render_to_texture") : null, l = "undefined" != typeof navigator && /OculusBrowser/g.test(navigator.userAgent), c = new Jn(), h = /* @__PURE__ */ new WeakMap();
    let u2;
    const d2 = /* @__PURE__ */ new WeakMap();
    let p2 = false;
    try {
      p2 = "undefined" != typeof OffscreenCanvas && null !== new OffscreenCanvas(1, 1).getContext("2d");
    } catch (t3) {
    }
    function m(t3, e3) {
      return p2 ? new OffscreenCanvas(t3, e3) : ni("canvas");
    }
    function f(t3, e3, n2) {
      let i2 = 1;
      const r2 = V2(t3);
      if ((r2.width > n2 || r2.height > n2) && (i2 = n2 / Math.max(r2.width, r2.height)), i2 < 1) {
        if ("undefined" != typeof HTMLImageElement && t3 instanceof HTMLImageElement || "undefined" != typeof HTMLCanvasElement && t3 instanceof HTMLCanvasElement || "undefined" != typeof ImageBitmap && t3 instanceof ImageBitmap || "undefined" != typeof VideoFrame && t3 instanceof VideoFrame) {
          const n3 = Math.floor(i2 * r2.width), s2 = Math.floor(i2 * r2.height);
          void 0 === u2 && (u2 = m(n3, s2));
          const a2 = e3 ? m(n3, s2) : u2;
          a2.width = n3, a2.height = s2;
          return a2.getContext("2d").drawImage(t3, 0, 0, n3, s2), console.warn("THREE.WebGLRenderer: Texture has been resized from (" + r2.width + "x" + r2.height + ") to (" + n3 + "x" + s2 + ")."), a2;
        }
        return "data" in t3 && console.warn("THREE.WebGLRenderer: Image in DataTexture is too big (" + r2.width + "x" + r2.height + ")."), t3;
      }
      return t3;
    }
    function g(t3) {
      return t3.generateMipmaps;
    }
    function v(e3) {
      t2.generateMipmap(e3);
    }
    function _(e3) {
      return e3.isWebGLCubeRenderTarget ? t2.TEXTURE_CUBE_MAP : e3.isWebGL3DRenderTarget ? t2.TEXTURE_3D : e3.isWebGLArrayRenderTarget || e3.isCompressedArrayTexture ? t2.TEXTURE_2D_ARRAY : t2.TEXTURE_2D;
    }
    function x(n2, i2, r2, s2, a2 = false) {
      if (null !== n2) {
        if (void 0 !== t2[n2]) return t2[n2];
        console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '" + n2 + "'");
      }
      let o2 = i2;
      if (i2 === t2.RED && (r2 === t2.FLOAT && (o2 = t2.R32F), r2 === t2.HALF_FLOAT && (o2 = t2.R16F), r2 === t2.UNSIGNED_BYTE && (o2 = t2.R8)), i2 === t2.RED_INTEGER && (r2 === t2.UNSIGNED_BYTE && (o2 = t2.R8UI), r2 === t2.UNSIGNED_SHORT && (o2 = t2.R16UI), r2 === t2.UNSIGNED_INT && (o2 = t2.R32UI), r2 === t2.BYTE && (o2 = t2.R8I), r2 === t2.SHORT && (o2 = t2.R16I), r2 === t2.INT && (o2 = t2.R32I)), i2 === t2.RG && (r2 === t2.FLOAT && (o2 = t2.RG32F), r2 === t2.HALF_FLOAT && (o2 = t2.RG16F), r2 === t2.UNSIGNED_BYTE && (o2 = t2.RG8)), i2 === t2.RG_INTEGER && (r2 === t2.UNSIGNED_BYTE && (o2 = t2.RG8UI), r2 === t2.UNSIGNED_SHORT && (o2 = t2.RG16UI), r2 === t2.UNSIGNED_INT && (o2 = t2.RG32UI), r2 === t2.BYTE && (o2 = t2.RG8I), r2 === t2.SHORT && (o2 = t2.RG16I), r2 === t2.INT && (o2 = t2.RG32I)), i2 === t2.RGB_INTEGER && (r2 === t2.UNSIGNED_BYTE && (o2 = t2.RGB8UI), r2 === t2.UNSIGNED_SHORT && (o2 = t2.RGB16UI), r2 === t2.UNSIGNED_INT && (o2 = t2.RGB32UI), r2 === t2.BYTE && (o2 = t2.RGB8I), r2 === t2.SHORT && (o2 = t2.RGB16I), r2 === t2.INT && (o2 = t2.RGB32I)), i2 === t2.RGBA_INTEGER && (r2 === t2.UNSIGNED_BYTE && (o2 = t2.RGBA8UI), r2 === t2.UNSIGNED_SHORT && (o2 = t2.RGBA16UI), r2 === t2.UNSIGNED_INT && (o2 = t2.RGBA32UI), r2 === t2.BYTE && (o2 = t2.RGBA8I), r2 === t2.SHORT && (o2 = t2.RGBA16I), r2 === t2.INT && (o2 = t2.RGBA32I)), i2 === t2.RGB && r2 === t2.UNSIGNED_INT_5_9_9_9_REV && (o2 = t2.RGB9_E5), i2 === t2.RGBA) {
        const e3 = a2 ? $e : ai.getTransfer(s2);
        r2 === t2.FLOAT && (o2 = t2.RGBA32F), r2 === t2.HALF_FLOAT && (o2 = t2.RGBA16F), r2 === t2.UNSIGNED_BYTE && (o2 = e3 === Qe ? t2.SRGB8_ALPHA8 : t2.RGBA8), r2 === t2.UNSIGNED_SHORT_4_4_4_4 && (o2 = t2.RGBA4), r2 === t2.UNSIGNED_SHORT_5_5_5_1 && (o2 = t2.RGB5_A1);
      }
      return o2 !== t2.R16F && o2 !== t2.R32F && o2 !== t2.RG16F && o2 !== t2.RG32F && o2 !== t2.RGBA16F && o2 !== t2.RGBA32F || e2.get("EXT_color_buffer_float"), o2;
    }
    function y2(e3, n2) {
      let i2;
      return e3 ? null === n2 || n2 === Pt || n2 === Ot ? i2 = t2.DEPTH24_STENCIL8 : n2 === Lt ? i2 = t2.DEPTH32F_STENCIL8 : n2 === Ct && (i2 = t2.DEPTH24_STENCIL8, console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")) : null === n2 || n2 === Pt || n2 === Ot ? i2 = t2.DEPTH_COMPONENT24 : n2 === Lt ? i2 = t2.DEPTH_COMPONENT32F : n2 === Ct && (i2 = t2.DEPTH_COMPONENT16), i2;
    }
    function M2(t3, e3) {
      return true === g(t3) || t3.isFramebufferTexture && t3.minFilter !== gt && t3.minFilter !== Mt ? Math.log2(Math.max(e3.width, e3.height)) + 1 : void 0 !== t3.mipmaps && t3.mipmaps.length > 0 ? t3.mipmaps.length : t3.isCompressedTexture && Array.isArray(t3.image) ? e3.mipmaps.length : 1;
    }
    function S2(t3) {
      const e3 = t3.target;
      e3.removeEventListener("dispose", S2), (function(t4) {
        const e4 = i.get(t4);
        if (void 0 === e4.__webglInit) return;
        const n2 = t4.source, r2 = d2.get(n2);
        if (r2) {
          const i2 = r2[e4.__cacheKey];
          i2.usedTimes--, 0 === i2.usedTimes && T(t4), 0 === Object.keys(r2).length && d2.delete(n2);
        }
        i.remove(t4);
      })(e3), e3.isVideoTexture && h.delete(e3);
    }
    function b(e3) {
      const n2 = e3.target;
      n2.removeEventListener("dispose", b), (function(e4) {
        const n3 = i.get(e4);
        e4.depthTexture && (e4.depthTexture.dispose(), i.remove(e4.depthTexture));
        if (e4.isWebGLCubeRenderTarget) for (let e5 = 0; e5 < 6; e5++) {
          if (Array.isArray(n3.__webglFramebuffer[e5])) for (let i2 = 0; i2 < n3.__webglFramebuffer[e5].length; i2++) t2.deleteFramebuffer(n3.__webglFramebuffer[e5][i2]);
          else t2.deleteFramebuffer(n3.__webglFramebuffer[e5]);
          n3.__webglDepthbuffer && t2.deleteRenderbuffer(n3.__webglDepthbuffer[e5]);
        }
        else {
          if (Array.isArray(n3.__webglFramebuffer)) for (let e5 = 0; e5 < n3.__webglFramebuffer.length; e5++) t2.deleteFramebuffer(n3.__webglFramebuffer[e5]);
          else t2.deleteFramebuffer(n3.__webglFramebuffer);
          if (n3.__webglDepthbuffer && t2.deleteRenderbuffer(n3.__webglDepthbuffer), n3.__webglMultisampledFramebuffer && t2.deleteFramebuffer(n3.__webglMultisampledFramebuffer), n3.__webglColorRenderbuffer) for (let e5 = 0; e5 < n3.__webglColorRenderbuffer.length; e5++) n3.__webglColorRenderbuffer[e5] && t2.deleteRenderbuffer(n3.__webglColorRenderbuffer[e5]);
          n3.__webglDepthRenderbuffer && t2.deleteRenderbuffer(n3.__webglDepthRenderbuffer);
        }
        const r2 = e4.textures;
        for (let e5 = 0, n4 = r2.length; e5 < n4; e5++) {
          const n5 = i.get(r2[e5]);
          n5.__webglTexture && (t2.deleteTexture(n5.__webglTexture), a.memory.textures--), i.remove(r2[e5]);
        }
        i.remove(e4);
      })(n2);
    }
    function T(e3) {
      const n2 = i.get(e3);
      t2.deleteTexture(n2.__webglTexture);
      const r2 = e3.source;
      delete d2.get(r2)[n2.__cacheKey], a.memory.textures--;
    }
    let w2 = 0;
    function E2(e3, r2) {
      const s2 = i.get(e3);
      if (e3.isVideoTexture && (function(t3) {
        const e4 = a.render.frame;
        h.get(t3) !== e4 && (h.set(t3, e4), t3.update());
      })(e3), false === e3.isRenderTargetTexture && e3.version > 0 && s2.__version !== e3.version) {
        const t3 = e3.image;
        if (null === t3) console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");
        else {
          if (false !== t3.complete) return void L2(s2, e3, r2);
          console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");
        }
      }
      n.bindTexture(t2.TEXTURE_2D, s2.__webglTexture, t2.TEXTURE0 + r2);
    }
    const A2 = { [pt]: t2.REPEAT, [mt]: t2.CLAMP_TO_EDGE, [ft]: t2.MIRRORED_REPEAT }, R2 = { [gt]: t2.NEAREST, [vt]: t2.NEAREST_MIPMAP_NEAREST, [xt]: t2.NEAREST_MIPMAP_LINEAR, [Mt]: t2.LINEAR, [St]: t2.LINEAR_MIPMAP_NEAREST, [Tt]: t2.LINEAR_MIPMAP_LINEAR }, C2 = { [vn]: t2.NEVER, [Tn]: t2.ALWAYS, [_n]: t2.LESS, [yn]: t2.LEQUAL, [xn]: t2.EQUAL, [bn]: t2.GEQUAL, [Mn]: t2.GREATER, [Sn]: t2.NOTEQUAL };
    function I2(n2, s2) {
      if (s2.type !== Lt || false !== e2.has("OES_texture_float_linear") || s2.magFilter !== Mt && s2.magFilter !== St && s2.magFilter !== xt && s2.magFilter !== Tt && s2.minFilter !== Mt && s2.minFilter !== St && s2.minFilter !== xt && s2.minFilter !== Tt || console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."), t2.texParameteri(n2, t2.TEXTURE_WRAP_S, A2[s2.wrapS]), t2.texParameteri(n2, t2.TEXTURE_WRAP_T, A2[s2.wrapT]), n2 !== t2.TEXTURE_3D && n2 !== t2.TEXTURE_2D_ARRAY || t2.texParameteri(n2, t2.TEXTURE_WRAP_R, A2[s2.wrapR]), t2.texParameteri(n2, t2.TEXTURE_MAG_FILTER, R2[s2.magFilter]), t2.texParameteri(n2, t2.TEXTURE_MIN_FILTER, R2[s2.minFilter]), s2.compareFunction && (t2.texParameteri(n2, t2.TEXTURE_COMPARE_MODE, t2.COMPARE_REF_TO_TEXTURE), t2.texParameteri(n2, t2.TEXTURE_COMPARE_FUNC, C2[s2.compareFunction])), true === e2.has("EXT_texture_filter_anisotropic")) {
        if (s2.magFilter === gt) return;
        if (s2.minFilter !== xt && s2.minFilter !== Tt) return;
        if (s2.type === Lt && false === e2.has("OES_texture_float_linear")) return;
        if (s2.anisotropy > 1 || i.get(s2).__currentAnisotropy) {
          const a2 = e2.get("EXT_texture_filter_anisotropic");
          t2.texParameterf(n2, a2.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(s2.anisotropy, r.getMaxAnisotropy())), i.get(s2).__currentAnisotropy = s2.anisotropy;
        }
      }
    }
    function P2(e3, n2) {
      let i2 = false;
      void 0 === e3.__webglInit && (e3.__webglInit = true, n2.addEventListener("dispose", S2));
      const r2 = n2.source;
      let s2 = d2.get(r2);
      void 0 === s2 && (s2 = {}, d2.set(r2, s2));
      const o2 = (function(t3) {
        const e4 = [];
        return e4.push(t3.wrapS), e4.push(t3.wrapT), e4.push(t3.wrapR || 0), e4.push(t3.magFilter), e4.push(t3.minFilter), e4.push(t3.anisotropy), e4.push(t3.internalFormat), e4.push(t3.format), e4.push(t3.type), e4.push(t3.generateMipmaps), e4.push(t3.premultiplyAlpha), e4.push(t3.flipY), e4.push(t3.unpackAlignment), e4.push(t3.colorSpace), e4.join();
      })(n2);
      if (o2 !== e3.__cacheKey) {
        void 0 === s2[o2] && (s2[o2] = { texture: t2.createTexture(), usedTimes: 0 }, a.memory.textures++, i2 = true), s2[o2].usedTimes++;
        const r3 = s2[e3.__cacheKey];
        void 0 !== r3 && (s2[e3.__cacheKey].usedTimes--, 0 === r3.usedTimes && T(n2)), e3.__cacheKey = o2, e3.__webglTexture = s2[o2].texture;
      }
      return i2;
    }
    function L2(e3, a2, o2) {
      let l2 = t2.TEXTURE_2D;
      (a2.isDataArrayTexture || a2.isCompressedArrayTexture) && (l2 = t2.TEXTURE_2D_ARRAY), a2.isData3DTexture && (l2 = t2.TEXTURE_3D);
      const c2 = P2(e3, a2), h2 = a2.source;
      n.bindTexture(l2, e3.__webglTexture, t2.TEXTURE0 + o2);
      const u3 = i.get(h2);
      if (h2.version !== u3.__version || true === c2) {
        n.activeTexture(t2.TEXTURE0 + o2);
        const e4 = ai.getPrimaries(ai.workingColorSpace), i2 = a2.colorSpace === Ze ? null : ai.getPrimaries(a2.colorSpace), d3 = a2.colorSpace === Ze || e4 === i2 ? t2.NONE : t2.BROWSER_DEFAULT_WEBGL;
        t2.pixelStorei(t2.UNPACK_FLIP_Y_WEBGL, a2.flipY), t2.pixelStorei(t2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, a2.premultiplyAlpha), t2.pixelStorei(t2.UNPACK_ALIGNMENT, a2.unpackAlignment), t2.pixelStorei(t2.UNPACK_COLORSPACE_CONVERSION_WEBGL, d3);
        let p3 = f(a2.image, false, r.maxTextureSize);
        p3 = k2(a2, p3);
        const m2 = s.convert(a2.format, a2.colorSpace), _2 = s.convert(a2.type);
        let S3, b2 = x(a2.internalFormat, m2, _2, a2.colorSpace, a2.isVideoTexture);
        I2(l2, a2);
        const T2 = a2.mipmaps, w3 = true !== a2.isVideoTexture, E3 = void 0 === u3.__version || true === c2, A3 = h2.dataReady, R3 = M2(a2, p3);
        if (a2.isDepthTexture) b2 = y2(a2.format === Wt, a2.type), E3 && (w3 ? n.texStorage2D(t2.TEXTURE_2D, 1, b2, p3.width, p3.height) : n.texImage2D(t2.TEXTURE_2D, 0, b2, p3.width, p3.height, 0, m2, _2, null));
        else if (a2.isDataTexture) if (T2.length > 0) {
          w3 && E3 && n.texStorage2D(t2.TEXTURE_2D, R3, b2, T2[0].width, T2[0].height);
          for (let e5 = 0, i3 = T2.length; e5 < i3; e5++) S3 = T2[e5], w3 ? A3 && n.texSubImage2D(t2.TEXTURE_2D, e5, 0, 0, S3.width, S3.height, m2, _2, S3.data) : n.texImage2D(t2.TEXTURE_2D, e5, b2, S3.width, S3.height, 0, m2, _2, S3.data);
          a2.generateMipmaps = false;
        } else w3 ? (E3 && n.texStorage2D(t2.TEXTURE_2D, R3, b2, p3.width, p3.height), A3 && n.texSubImage2D(t2.TEXTURE_2D, 0, 0, 0, p3.width, p3.height, m2, _2, p3.data)) : n.texImage2D(t2.TEXTURE_2D, 0, b2, p3.width, p3.height, 0, m2, _2, p3.data);
        else if (a2.isCompressedTexture) if (a2.isCompressedArrayTexture) {
          w3 && E3 && n.texStorage3D(t2.TEXTURE_2D_ARRAY, R3, b2, T2[0].width, T2[0].height, p3.depth);
          for (let e5 = 0, i3 = T2.length; e5 < i3; e5++) if (S3 = T2[e5], a2.format !== kt) if (null !== m2) if (w3) {
            if (A3) if (a2.layerUpdates.size > 0) {
              const i4 = Vl(S3.width, S3.height, a2.format, a2.type);
              for (const r2 of a2.layerUpdates) {
                const s2 = S3.data.subarray(r2 * i4 / S3.data.BYTES_PER_ELEMENT, (r2 + 1) * i4 / S3.data.BYTES_PER_ELEMENT);
                n.compressedTexSubImage3D(t2.TEXTURE_2D_ARRAY, e5, 0, 0, r2, S3.width, S3.height, 1, m2, s2);
              }
              a2.clearLayerUpdates();
            } else n.compressedTexSubImage3D(t2.TEXTURE_2D_ARRAY, e5, 0, 0, 0, S3.width, S3.height, p3.depth, m2, S3.data);
          } else n.compressedTexImage3D(t2.TEXTURE_2D_ARRAY, e5, b2, S3.width, S3.height, p3.depth, 0, S3.data, 0, 0);
          else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
          else w3 ? A3 && n.texSubImage3D(t2.TEXTURE_2D_ARRAY, e5, 0, 0, 0, S3.width, S3.height, p3.depth, m2, _2, S3.data) : n.texImage3D(t2.TEXTURE_2D_ARRAY, e5, b2, S3.width, S3.height, p3.depth, 0, m2, _2, S3.data);
        } else {
          w3 && E3 && n.texStorage2D(t2.TEXTURE_2D, R3, b2, T2[0].width, T2[0].height);
          for (let e5 = 0, i3 = T2.length; e5 < i3; e5++) S3 = T2[e5], a2.format !== kt ? null !== m2 ? w3 ? A3 && n.compressedTexSubImage2D(t2.TEXTURE_2D, e5, 0, 0, S3.width, S3.height, m2, S3.data) : n.compressedTexImage2D(t2.TEXTURE_2D, e5, b2, S3.width, S3.height, 0, S3.data) : console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()") : w3 ? A3 && n.texSubImage2D(t2.TEXTURE_2D, e5, 0, 0, S3.width, S3.height, m2, _2, S3.data) : n.texImage2D(t2.TEXTURE_2D, e5, b2, S3.width, S3.height, 0, m2, _2, S3.data);
        }
        else if (a2.isDataArrayTexture) if (w3) {
          if (E3 && n.texStorage3D(t2.TEXTURE_2D_ARRAY, R3, b2, p3.width, p3.height, p3.depth), A3) if (a2.layerUpdates.size > 0) {
            const e5 = Vl(p3.width, p3.height, a2.format, a2.type);
            for (const i3 of a2.layerUpdates) {
              const r2 = p3.data.subarray(i3 * e5 / p3.data.BYTES_PER_ELEMENT, (i3 + 1) * e5 / p3.data.BYTES_PER_ELEMENT);
              n.texSubImage3D(t2.TEXTURE_2D_ARRAY, 0, 0, 0, i3, p3.width, p3.height, 1, m2, _2, r2);
            }
            a2.clearLayerUpdates();
          } else n.texSubImage3D(t2.TEXTURE_2D_ARRAY, 0, 0, 0, 0, p3.width, p3.height, p3.depth, m2, _2, p3.data);
        } else n.texImage3D(t2.TEXTURE_2D_ARRAY, 0, b2, p3.width, p3.height, p3.depth, 0, m2, _2, p3.data);
        else if (a2.isData3DTexture) w3 ? (E3 && n.texStorage3D(t2.TEXTURE_3D, R3, b2, p3.width, p3.height, p3.depth), A3 && n.texSubImage3D(t2.TEXTURE_3D, 0, 0, 0, 0, p3.width, p3.height, p3.depth, m2, _2, p3.data)) : n.texImage3D(t2.TEXTURE_3D, 0, b2, p3.width, p3.height, p3.depth, 0, m2, _2, p3.data);
        else if (a2.isFramebufferTexture) {
          if (E3) if (w3) n.texStorage2D(t2.TEXTURE_2D, R3, b2, p3.width, p3.height);
          else {
            let e5 = p3.width, i3 = p3.height;
            for (let r2 = 0; r2 < R3; r2++) n.texImage2D(t2.TEXTURE_2D, r2, b2, e5, i3, 0, m2, _2, null), e5 >>= 1, i3 >>= 1;
          }
        } else if (T2.length > 0) {
          if (w3 && E3) {
            const e5 = V2(T2[0]);
            n.texStorage2D(t2.TEXTURE_2D, R3, b2, e5.width, e5.height);
          }
          for (let e5 = 0, i3 = T2.length; e5 < i3; e5++) S3 = T2[e5], w3 ? A3 && n.texSubImage2D(t2.TEXTURE_2D, e5, 0, 0, m2, _2, S3) : n.texImage2D(t2.TEXTURE_2D, e5, b2, m2, _2, S3);
          a2.generateMipmaps = false;
        } else if (w3) {
          if (E3) {
            const e5 = V2(p3);
            n.texStorage2D(t2.TEXTURE_2D, R3, b2, e5.width, e5.height);
          }
          A3 && n.texSubImage2D(t2.TEXTURE_2D, 0, 0, 0, m2, _2, p3);
        } else n.texImage2D(t2.TEXTURE_2D, 0, b2, m2, _2, p3);
        g(a2) && v(l2), u3.__version = h2.version, a2.onUpdate && a2.onUpdate(a2);
      }
      e3.__version = a2.version;
    }
    function U2(e3, r2, a2, l2, c2, h2) {
      const u3 = s.convert(a2.format, a2.colorSpace), d3 = s.convert(a2.type), p3 = x(a2.internalFormat, u3, d3, a2.colorSpace), m2 = i.get(r2), f2 = i.get(a2);
      if (f2.__renderTarget = r2, !m2.__hasExternalTextures) {
        const e4 = Math.max(1, r2.width >> h2), i2 = Math.max(1, r2.height >> h2);
        c2 === t2.TEXTURE_3D || c2 === t2.TEXTURE_2D_ARRAY ? n.texImage3D(c2, h2, p3, e4, i2, r2.depth, 0, u3, d3, null) : n.texImage2D(c2, h2, p3, e4, i2, 0, u3, d3, null);
      }
      n.bindFramebuffer(t2.FRAMEBUFFER, e3), z2(r2) ? o.framebufferTexture2DMultisampleEXT(t2.FRAMEBUFFER, l2, c2, f2.__webglTexture, 0, B2(r2)) : (c2 === t2.TEXTURE_2D || c2 >= t2.TEXTURE_CUBE_MAP_POSITIVE_X && c2 <= t2.TEXTURE_CUBE_MAP_NEGATIVE_Z) && t2.framebufferTexture2D(t2.FRAMEBUFFER, l2, c2, f2.__webglTexture, h2), n.bindFramebuffer(t2.FRAMEBUFFER, null);
    }
    function D2(e3, n2, i2) {
      if (t2.bindRenderbuffer(t2.RENDERBUFFER, e3), n2.depthBuffer) {
        const r2 = n2.depthTexture, s2 = r2 && r2.isDepthTexture ? r2.type : null, a2 = y2(n2.stencilBuffer, s2), l2 = n2.stencilBuffer ? t2.DEPTH_STENCIL_ATTACHMENT : t2.DEPTH_ATTACHMENT, c2 = B2(n2);
        z2(n2) ? o.renderbufferStorageMultisampleEXT(t2.RENDERBUFFER, c2, a2, n2.width, n2.height) : i2 ? t2.renderbufferStorageMultisample(t2.RENDERBUFFER, c2, a2, n2.width, n2.height) : t2.renderbufferStorage(t2.RENDERBUFFER, a2, n2.width, n2.height), t2.framebufferRenderbuffer(t2.FRAMEBUFFER, l2, t2.RENDERBUFFER, e3);
      } else {
        const e4 = n2.textures;
        for (let r2 = 0; r2 < e4.length; r2++) {
          const a2 = e4[r2], l2 = s.convert(a2.format, a2.colorSpace), c2 = s.convert(a2.type), h2 = x(a2.internalFormat, l2, c2, a2.colorSpace), u3 = B2(n2);
          i2 && false === z2(n2) ? t2.renderbufferStorageMultisample(t2.RENDERBUFFER, u3, h2, n2.width, n2.height) : z2(n2) ? o.renderbufferStorageMultisampleEXT(t2.RENDERBUFFER, u3, h2, n2.width, n2.height) : t2.renderbufferStorage(t2.RENDERBUFFER, h2, n2.width, n2.height);
        }
      }
      t2.bindRenderbuffer(t2.RENDERBUFFER, null);
    }
    function N2(e3) {
      const r2 = i.get(e3), s2 = true === e3.isWebGLCubeRenderTarget;
      if (r2.__boundDepthTexture !== e3.depthTexture) {
        const t3 = e3.depthTexture;
        if (r2.__depthDisposeCallback && r2.__depthDisposeCallback(), t3) {
          const e4 = () => {
            delete r2.__boundDepthTexture, delete r2.__depthDisposeCallback, t3.removeEventListener("dispose", e4);
          };
          t3.addEventListener("dispose", e4), r2.__depthDisposeCallback = e4;
        }
        r2.__boundDepthTexture = t3;
      }
      if (e3.depthTexture && !r2.__autoAllocateDepthBuffer) {
        if (s2) throw new Error("target.depthTexture not supported in Cube render targets");
        !(function(e4, r3) {
          if (r3 && r3.isWebGLCubeRenderTarget) throw new Error("Depth Texture with cube render targets is not supported");
          if (n.bindFramebuffer(t2.FRAMEBUFFER, e4), !r3.depthTexture || !r3.depthTexture.isDepthTexture) throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");
          const s3 = i.get(r3.depthTexture);
          s3.__renderTarget = r3, s3.__webglTexture && r3.depthTexture.image.width === r3.width && r3.depthTexture.image.height === r3.height || (r3.depthTexture.image.width = r3.width, r3.depthTexture.image.height = r3.height, r3.depthTexture.needsUpdate = true), E2(r3.depthTexture, 0);
          const a2 = s3.__webglTexture, l2 = B2(r3);
          if (r3.depthTexture.format === Gt) z2(r3) ? o.framebufferTexture2DMultisampleEXT(t2.FRAMEBUFFER, t2.DEPTH_ATTACHMENT, t2.TEXTURE_2D, a2, 0, l2) : t2.framebufferTexture2D(t2.FRAMEBUFFER, t2.DEPTH_ATTACHMENT, t2.TEXTURE_2D, a2, 0);
          else {
            if (r3.depthTexture.format !== Wt) throw new Error("Unknown depthTexture format");
            z2(r3) ? o.framebufferTexture2DMultisampleEXT(t2.FRAMEBUFFER, t2.DEPTH_STENCIL_ATTACHMENT, t2.TEXTURE_2D, a2, 0, l2) : t2.framebufferTexture2D(t2.FRAMEBUFFER, t2.DEPTH_STENCIL_ATTACHMENT, t2.TEXTURE_2D, a2, 0);
          }
        })(r2.__webglFramebuffer, e3);
      } else if (s2) {
        r2.__webglDepthbuffer = [];
        for (let i2 = 0; i2 < 6; i2++) if (n.bindFramebuffer(t2.FRAMEBUFFER, r2.__webglFramebuffer[i2]), void 0 === r2.__webglDepthbuffer[i2]) r2.__webglDepthbuffer[i2] = t2.createRenderbuffer(), D2(r2.__webglDepthbuffer[i2], e3, false);
        else {
          const n2 = e3.stencilBuffer ? t2.DEPTH_STENCIL_ATTACHMENT : t2.DEPTH_ATTACHMENT, s3 = r2.__webglDepthbuffer[i2];
          t2.bindRenderbuffer(t2.RENDERBUFFER, s3), t2.framebufferRenderbuffer(t2.FRAMEBUFFER, n2, t2.RENDERBUFFER, s3);
        }
      } else if (n.bindFramebuffer(t2.FRAMEBUFFER, r2.__webglFramebuffer), void 0 === r2.__webglDepthbuffer) r2.__webglDepthbuffer = t2.createRenderbuffer(), D2(r2.__webglDepthbuffer, e3, false);
      else {
        const n2 = e3.stencilBuffer ? t2.DEPTH_STENCIL_ATTACHMENT : t2.DEPTH_ATTACHMENT, i2 = r2.__webglDepthbuffer;
        t2.bindRenderbuffer(t2.RENDERBUFFER, i2), t2.framebufferRenderbuffer(t2.FRAMEBUFFER, n2, t2.RENDERBUFFER, i2);
      }
      n.bindFramebuffer(t2.FRAMEBUFFER, null);
    }
    const O2 = [], F2 = [];
    function B2(t3) {
      return Math.min(r.maxSamples, t3.samples);
    }
    function z2(t3) {
      const n2 = i.get(t3);
      return t3.samples > 0 && true === e2.has("WEBGL_multisampled_render_to_texture") && false !== n2.__useRenderToTexture;
    }
    function k2(t3, e3) {
      const n2 = t3.colorSpace, i2 = t3.format, r2 = t3.type;
      return true === t3.isCompressedTexture || true === t3.isVideoTexture || n2 !== Ke && n2 !== Ze && (ai.getTransfer(n2) === Qe ? i2 === kt && r2 === Et || console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.") : console.error("THREE.WebGLTextures: Unsupported texture color space:", n2)), e3;
    }
    function V2(t3) {
      return "undefined" != typeof HTMLImageElement && t3 instanceof HTMLImageElement ? (c.width = t3.naturalWidth || t3.width, c.height = t3.naturalHeight || t3.height) : "undefined" != typeof VideoFrame && t3 instanceof VideoFrame ? (c.width = t3.displayWidth, c.height = t3.displayHeight) : (c.width = t3.width, c.height = t3.height), c;
    }
    this.allocateTextureUnit = function() {
      const t3 = w2;
      return t3 >= r.maxTextures && console.warn("THREE.WebGLTextures: Trying to use " + t3 + " texture units while this GPU supports only " + r.maxTextures), w2 += 1, t3;
    }, this.resetTextureUnits = function() {
      w2 = 0;
    }, this.setTexture2D = E2, this.setTexture2DArray = function(e3, r2) {
      const s2 = i.get(e3);
      e3.version > 0 && s2.__version !== e3.version ? L2(s2, e3, r2) : n.bindTexture(t2.TEXTURE_2D_ARRAY, s2.__webglTexture, t2.TEXTURE0 + r2);
    }, this.setTexture3D = function(e3, r2) {
      const s2 = i.get(e3);
      e3.version > 0 && s2.__version !== e3.version ? L2(s2, e3, r2) : n.bindTexture(t2.TEXTURE_3D, s2.__webglTexture, t2.TEXTURE0 + r2);
    }, this.setTextureCube = function(e3, a2) {
      const o2 = i.get(e3);
      e3.version > 0 && o2.__version !== e3.version ? (function(e4, a3, o3) {
        if (6 !== a3.image.length) return;
        const l2 = P2(e4, a3), c2 = a3.source;
        n.bindTexture(t2.TEXTURE_CUBE_MAP, e4.__webglTexture, t2.TEXTURE0 + o3);
        const h2 = i.get(c2);
        if (c2.version !== h2.__version || true === l2) {
          n.activeTexture(t2.TEXTURE0 + o3);
          const e5 = ai.getPrimaries(ai.workingColorSpace), i2 = a3.colorSpace === Ze ? null : ai.getPrimaries(a3.colorSpace), u3 = a3.colorSpace === Ze || e5 === i2 ? t2.NONE : t2.BROWSER_DEFAULT_WEBGL;
          t2.pixelStorei(t2.UNPACK_FLIP_Y_WEBGL, a3.flipY), t2.pixelStorei(t2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, a3.premultiplyAlpha), t2.pixelStorei(t2.UNPACK_ALIGNMENT, a3.unpackAlignment), t2.pixelStorei(t2.UNPACK_COLORSPACE_CONVERSION_WEBGL, u3);
          const d3 = a3.isCompressedTexture || a3.image[0].isCompressedTexture, p3 = a3.image[0] && a3.image[0].isDataTexture, m2 = [];
          for (let t3 = 0; t3 < 6; t3++) m2[t3] = d3 || p3 ? p3 ? a3.image[t3].image : a3.image[t3] : f(a3.image[t3], true, r.maxCubemapSize), m2[t3] = k2(a3, m2[t3]);
          const _2 = m2[0], y3 = s.convert(a3.format, a3.colorSpace), S3 = s.convert(a3.type), b2 = x(a3.internalFormat, y3, S3, a3.colorSpace), T2 = true !== a3.isVideoTexture, w3 = void 0 === h2.__version || true === l2, E3 = c2.dataReady;
          let A3, R3 = M2(a3, _2);
          if (I2(t2.TEXTURE_CUBE_MAP, a3), d3) {
            T2 && w3 && n.texStorage2D(t2.TEXTURE_CUBE_MAP, R3, b2, _2.width, _2.height);
            for (let e6 = 0; e6 < 6; e6++) {
              A3 = m2[e6].mipmaps;
              for (let i3 = 0; i3 < A3.length; i3++) {
                const r2 = A3[i3];
                a3.format !== kt ? null !== y3 ? T2 ? E3 && n.compressedTexSubImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3, 0, 0, r2.width, r2.height, y3, r2.data) : n.compressedTexImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3, b2, r2.width, r2.height, 0, r2.data) : console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()") : T2 ? E3 && n.texSubImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3, 0, 0, r2.width, r2.height, y3, S3, r2.data) : n.texImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3, b2, r2.width, r2.height, 0, y3, S3, r2.data);
              }
            }
          } else {
            if (A3 = a3.mipmaps, T2 && w3) {
              A3.length > 0 && R3++;
              const e6 = V2(m2[0]);
              n.texStorage2D(t2.TEXTURE_CUBE_MAP, R3, b2, e6.width, e6.height);
            }
            for (let e6 = 0; e6 < 6; e6++) if (p3) {
              T2 ? E3 && n.texSubImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, 0, 0, 0, m2[e6].width, m2[e6].height, y3, S3, m2[e6].data) : n.texImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, 0, b2, m2[e6].width, m2[e6].height, 0, y3, S3, m2[e6].data);
              for (let i3 = 0; i3 < A3.length; i3++) {
                const r2 = A3[i3].image[e6].image;
                T2 ? E3 && n.texSubImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3 + 1, 0, 0, r2.width, r2.height, y3, S3, r2.data) : n.texImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3 + 1, b2, r2.width, r2.height, 0, y3, S3, r2.data);
              }
            } else {
              T2 ? E3 && n.texSubImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, 0, 0, 0, y3, S3, m2[e6]) : n.texImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, 0, b2, y3, S3, m2[e6]);
              for (let i3 = 0; i3 < A3.length; i3++) {
                const r2 = A3[i3];
                T2 ? E3 && n.texSubImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3 + 1, 0, 0, y3, S3, r2.image[e6]) : n.texImage2D(t2.TEXTURE_CUBE_MAP_POSITIVE_X + e6, i3 + 1, b2, y3, S3, r2.image[e6]);
              }
            }
          }
          g(a3) && v(t2.TEXTURE_CUBE_MAP), h2.__version = c2.version, a3.onUpdate && a3.onUpdate(a3);
        }
        e4.__version = a3.version;
      })(o2, e3, a2) : n.bindTexture(t2.TEXTURE_CUBE_MAP, o2.__webglTexture, t2.TEXTURE0 + a2);
    }, this.rebindTextures = function(e3, n2, r2) {
      const s2 = i.get(e3);
      void 0 !== n2 && U2(s2.__webglFramebuffer, e3, e3.texture, t2.COLOR_ATTACHMENT0, t2.TEXTURE_2D, 0), void 0 !== r2 && N2(e3);
    }, this.setupRenderTarget = function(e3) {
      const r2 = e3.texture, o2 = i.get(e3), l2 = i.get(r2);
      e3.addEventListener("dispose", b);
      const c2 = e3.textures, h2 = true === e3.isWebGLCubeRenderTarget, u3 = c2.length > 1;
      if (u3 || (void 0 === l2.__webglTexture && (l2.__webglTexture = t2.createTexture()), l2.__version = r2.version, a.memory.textures++), h2) {
        o2.__webglFramebuffer = [];
        for (let e4 = 0; e4 < 6; e4++) if (r2.mipmaps && r2.mipmaps.length > 0) {
          o2.__webglFramebuffer[e4] = [];
          for (let n2 = 0; n2 < r2.mipmaps.length; n2++) o2.__webglFramebuffer[e4][n2] = t2.createFramebuffer();
        } else o2.__webglFramebuffer[e4] = t2.createFramebuffer();
      } else {
        if (r2.mipmaps && r2.mipmaps.length > 0) {
          o2.__webglFramebuffer = [];
          for (let e4 = 0; e4 < r2.mipmaps.length; e4++) o2.__webglFramebuffer[e4] = t2.createFramebuffer();
        } else o2.__webglFramebuffer = t2.createFramebuffer();
        if (u3) for (let e4 = 0, n2 = c2.length; e4 < n2; e4++) {
          const n3 = i.get(c2[e4]);
          void 0 === n3.__webglTexture && (n3.__webglTexture = t2.createTexture(), a.memory.textures++);
        }
        if (e3.samples > 0 && false === z2(e3)) {
          o2.__webglMultisampledFramebuffer = t2.createFramebuffer(), o2.__webglColorRenderbuffer = [], n.bindFramebuffer(t2.FRAMEBUFFER, o2.__webglMultisampledFramebuffer);
          for (let n2 = 0; n2 < c2.length; n2++) {
            const i2 = c2[n2];
            o2.__webglColorRenderbuffer[n2] = t2.createRenderbuffer(), t2.bindRenderbuffer(t2.RENDERBUFFER, o2.__webglColorRenderbuffer[n2]);
            const r3 = s.convert(i2.format, i2.colorSpace), a2 = s.convert(i2.type), l3 = x(i2.internalFormat, r3, a2, i2.colorSpace, true === e3.isXRRenderTarget), h3 = B2(e3);
            t2.renderbufferStorageMultisample(t2.RENDERBUFFER, h3, l3, e3.width, e3.height), t2.framebufferRenderbuffer(t2.FRAMEBUFFER, t2.COLOR_ATTACHMENT0 + n2, t2.RENDERBUFFER, o2.__webglColorRenderbuffer[n2]);
          }
          t2.bindRenderbuffer(t2.RENDERBUFFER, null), e3.depthBuffer && (o2.__webglDepthRenderbuffer = t2.createRenderbuffer(), D2(o2.__webglDepthRenderbuffer, e3, true)), n.bindFramebuffer(t2.FRAMEBUFFER, null);
        }
      }
      if (h2) {
        n.bindTexture(t2.TEXTURE_CUBE_MAP, l2.__webglTexture), I2(t2.TEXTURE_CUBE_MAP, r2);
        for (let n2 = 0; n2 < 6; n2++) if (r2.mipmaps && r2.mipmaps.length > 0) for (let i2 = 0; i2 < r2.mipmaps.length; i2++) U2(o2.__webglFramebuffer[n2][i2], e3, r2, t2.COLOR_ATTACHMENT0, t2.TEXTURE_CUBE_MAP_POSITIVE_X + n2, i2);
        else U2(o2.__webglFramebuffer[n2], e3, r2, t2.COLOR_ATTACHMENT0, t2.TEXTURE_CUBE_MAP_POSITIVE_X + n2, 0);
        g(r2) && v(t2.TEXTURE_CUBE_MAP), n.unbindTexture();
      } else if (u3) {
        for (let r3 = 0, s2 = c2.length; r3 < s2; r3++) {
          const s3 = c2[r3], a2 = i.get(s3);
          n.bindTexture(t2.TEXTURE_2D, a2.__webglTexture), I2(t2.TEXTURE_2D, s3), U2(o2.__webglFramebuffer, e3, s3, t2.COLOR_ATTACHMENT0 + r3, t2.TEXTURE_2D, 0), g(s3) && v(t2.TEXTURE_2D);
        }
        n.unbindTexture();
      } else {
        let i2 = t2.TEXTURE_2D;
        if ((e3.isWebGL3DRenderTarget || e3.isWebGLArrayRenderTarget) && (i2 = e3.isWebGL3DRenderTarget ? t2.TEXTURE_3D : t2.TEXTURE_2D_ARRAY), n.bindTexture(i2, l2.__webglTexture), I2(i2, r2), r2.mipmaps && r2.mipmaps.length > 0) for (let n2 = 0; n2 < r2.mipmaps.length; n2++) U2(o2.__webglFramebuffer[n2], e3, r2, t2.COLOR_ATTACHMENT0, i2, n2);
        else U2(o2.__webglFramebuffer, e3, r2, t2.COLOR_ATTACHMENT0, i2, 0);
        g(r2) && v(i2), n.unbindTexture();
      }
      e3.depthBuffer && N2(e3);
    }, this.updateRenderTargetMipmap = function(t3) {
      const e3 = t3.textures;
      for (let r2 = 0, s2 = e3.length; r2 < s2; r2++) {
        const s3 = e3[r2];
        if (g(s3)) {
          const e4 = _(t3), r3 = i.get(s3).__webglTexture;
          n.bindTexture(e4, r3), v(e4), n.unbindTexture();
        }
      }
    }, this.updateMultisampleRenderTarget = function(e3) {
      if (e3.samples > 0) {
        if (false === z2(e3)) {
          const r2 = e3.textures, s2 = e3.width, a2 = e3.height;
          let o2 = t2.COLOR_BUFFER_BIT;
          const c2 = e3.stencilBuffer ? t2.DEPTH_STENCIL_ATTACHMENT : t2.DEPTH_ATTACHMENT, h2 = i.get(e3), u3 = r2.length > 1;
          if (u3) for (let e4 = 0; e4 < r2.length; e4++) n.bindFramebuffer(t2.FRAMEBUFFER, h2.__webglMultisampledFramebuffer), t2.framebufferRenderbuffer(t2.FRAMEBUFFER, t2.COLOR_ATTACHMENT0 + e4, t2.RENDERBUFFER, null), n.bindFramebuffer(t2.FRAMEBUFFER, h2.__webglFramebuffer), t2.framebufferTexture2D(t2.DRAW_FRAMEBUFFER, t2.COLOR_ATTACHMENT0 + e4, t2.TEXTURE_2D, null, 0);
          n.bindFramebuffer(t2.READ_FRAMEBUFFER, h2.__webglMultisampledFramebuffer), n.bindFramebuffer(t2.DRAW_FRAMEBUFFER, h2.__webglFramebuffer);
          for (let n2 = 0; n2 < r2.length; n2++) {
            if (e3.resolveDepthBuffer && (e3.depthBuffer && (o2 |= t2.DEPTH_BUFFER_BIT), e3.stencilBuffer && e3.resolveStencilBuffer && (o2 |= t2.STENCIL_BUFFER_BIT)), u3) {
              t2.framebufferRenderbuffer(t2.READ_FRAMEBUFFER, t2.COLOR_ATTACHMENT0, t2.RENDERBUFFER, h2.__webglColorRenderbuffer[n2]);
              const e4 = i.get(r2[n2]).__webglTexture;
              t2.framebufferTexture2D(t2.DRAW_FRAMEBUFFER, t2.COLOR_ATTACHMENT0, t2.TEXTURE_2D, e4, 0);
            }
            t2.blitFramebuffer(0, 0, s2, a2, 0, 0, s2, a2, o2, t2.NEAREST), true === l && (O2.length = 0, F2.length = 0, O2.push(t2.COLOR_ATTACHMENT0 + n2), e3.depthBuffer && false === e3.resolveDepthBuffer && (O2.push(c2), F2.push(c2), t2.invalidateFramebuffer(t2.DRAW_FRAMEBUFFER, F2)), t2.invalidateFramebuffer(t2.READ_FRAMEBUFFER, O2));
          }
          if (n.bindFramebuffer(t2.READ_FRAMEBUFFER, null), n.bindFramebuffer(t2.DRAW_FRAMEBUFFER, null), u3) for (let e4 = 0; e4 < r2.length; e4++) {
            n.bindFramebuffer(t2.FRAMEBUFFER, h2.__webglMultisampledFramebuffer), t2.framebufferRenderbuffer(t2.FRAMEBUFFER, t2.COLOR_ATTACHMENT0 + e4, t2.RENDERBUFFER, h2.__webglColorRenderbuffer[e4]);
            const s3 = i.get(r2[e4]).__webglTexture;
            n.bindFramebuffer(t2.FRAMEBUFFER, h2.__webglFramebuffer), t2.framebufferTexture2D(t2.DRAW_FRAMEBUFFER, t2.COLOR_ATTACHMENT0 + e4, t2.TEXTURE_2D, s3, 0);
          }
          n.bindFramebuffer(t2.DRAW_FRAMEBUFFER, h2.__webglMultisampledFramebuffer);
        } else if (e3.depthBuffer && false === e3.resolveDepthBuffer && l) {
          const n2 = e3.stencilBuffer ? t2.DEPTH_STENCIL_ATTACHMENT : t2.DEPTH_ATTACHMENT;
          t2.invalidateFramebuffer(t2.DRAW_FRAMEBUFFER, [n2]);
        }
      }
    }, this.setupDepthRenderbuffer = N2, this.setupFrameBufferTexture = U2, this.useMultisampledRTT = z2;
  }
  function Wl(t2, e2) {
    return { convert: function(n, i = "") {
      let r;
      const s = ai.getTransfer(i);
      if (n === Et) return t2.UNSIGNED_BYTE;
      if (n === Dt) return t2.UNSIGNED_SHORT_4_4_4_4;
      if (n === Nt) return t2.UNSIGNED_SHORT_5_5_5_1;
      if (n === Ft) return t2.UNSIGNED_INT_5_9_9_9_REV;
      if (n === At) return t2.BYTE;
      if (n === Rt) return t2.SHORT;
      if (n === Ct) return t2.UNSIGNED_SHORT;
      if (n === It) return t2.INT;
      if (n === Pt) return t2.UNSIGNED_INT;
      if (n === Lt) return t2.FLOAT;
      if (n === Ut) return t2.HALF_FLOAT;
      if (n === Bt) return t2.ALPHA;
      if (n === zt) return t2.RGB;
      if (n === kt) return t2.RGBA;
      if (n === Vt) return t2.LUMINANCE;
      if (n === Ht) return t2.LUMINANCE_ALPHA;
      if (n === Gt) return t2.DEPTH_COMPONENT;
      if (n === Wt) return t2.DEPTH_STENCIL;
      if (n === Xt) return t2.RED;
      if (n === jt) return t2.RED_INTEGER;
      if (n === qt) return t2.RG;
      if (n === Yt) return t2.RG_INTEGER;
      if (n === Jt) return t2.RGBA_INTEGER;
      if (n === Kt || n === $t || n === Qt || n === te) if (s === Qe) {
        if (r = e2.get("WEBGL_compressed_texture_s3tc_srgb"), null === r) return null;
        if (n === Kt) return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;
        if (n === $t) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
        if (n === Qt) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
        if (n === te) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
      } else {
        if (r = e2.get("WEBGL_compressed_texture_s3tc"), null === r) return null;
        if (n === Kt) return r.COMPRESSED_RGB_S3TC_DXT1_EXT;
        if (n === $t) return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;
        if (n === Qt) return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;
        if (n === te) return r.COMPRESSED_RGBA_S3TC_DXT5_EXT;
      }
      if (n === ee || n === ne || n === ie || n === re) {
        if (r = e2.get("WEBGL_compressed_texture_pvrtc"), null === r) return null;
        if (n === ee) return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
        if (n === ne) return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
        if (n === ie) return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
        if (n === re) return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
      }
      if (n === se || n === ae || n === oe) {
        if (r = e2.get("WEBGL_compressed_texture_etc"), null === r) return null;
        if (n === se || n === ae) return s === Qe ? r.COMPRESSED_SRGB8_ETC2 : r.COMPRESSED_RGB8_ETC2;
        if (n === oe) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : r.COMPRESSED_RGBA8_ETC2_EAC;
      }
      if (n === le || n === ce || n === he || n === ue || n === de || n === pe || n === me || n === fe || n === ge || n === ve || n === _e || n === xe || n === ye || n === Me) {
        if (r = e2.get("WEBGL_compressed_texture_astc"), null === r) return null;
        if (n === le) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : r.COMPRESSED_RGBA_ASTC_4x4_KHR;
        if (n === ce) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : r.COMPRESSED_RGBA_ASTC_5x4_KHR;
        if (n === he) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : r.COMPRESSED_RGBA_ASTC_5x5_KHR;
        if (n === ue) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : r.COMPRESSED_RGBA_ASTC_6x5_KHR;
        if (n === de) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : r.COMPRESSED_RGBA_ASTC_6x6_KHR;
        if (n === pe) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : r.COMPRESSED_RGBA_ASTC_8x5_KHR;
        if (n === me) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : r.COMPRESSED_RGBA_ASTC_8x6_KHR;
        if (n === fe) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : r.COMPRESSED_RGBA_ASTC_8x8_KHR;
        if (n === ge) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : r.COMPRESSED_RGBA_ASTC_10x5_KHR;
        if (n === ve) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : r.COMPRESSED_RGBA_ASTC_10x6_KHR;
        if (n === _e) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : r.COMPRESSED_RGBA_ASTC_10x8_KHR;
        if (n === xe) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : r.COMPRESSED_RGBA_ASTC_10x10_KHR;
        if (n === ye) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : r.COMPRESSED_RGBA_ASTC_12x10_KHR;
        if (n === Me) return s === Qe ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : r.COMPRESSED_RGBA_ASTC_12x12_KHR;
      }
      if (n === Se || n === be || n === Te) {
        if (r = e2.get("EXT_texture_compression_bptc"), null === r) return null;
        if (n === Se) return s === Qe ? r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : r.COMPRESSED_RGBA_BPTC_UNORM_EXT;
        if (n === be) return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
        if (n === Te) return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
      }
      if (n === we || n === Ee || n === Ae || n === Re) {
        if (r = e2.get("EXT_texture_compression_rgtc"), null === r) return null;
        if (n === Se) return r.COMPRESSED_RED_RGTC1_EXT;
        if (n === Ee) return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;
        if (n === Ae) return r.COMPRESSED_RED_GREEN_RGTC2_EXT;
        if (n === Re) return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
      }
      return n === Ot ? t2.UNSIGNED_INT_24_8 : void 0 !== t2[n] ? t2[n] : null;
    } };
  }
  var Xl = class extends Js {
    constructor(t2 = []) {
      super(), this.isArrayCamera = true, this.cameras = t2;
    }
  };
  var jl = class extends Lr {
    constructor() {
      super(), this.isGroup = true, this.type = "Group";
    }
  };
  var ql = { type: "move" };
  var Yl = class {
    constructor() {
      this._targetRay = null, this._grip = null, this._hand = null;
    }
    getHandSpace() {
      return null === this._hand && (this._hand = new jl(), this._hand.matrixAutoUpdate = false, this._hand.visible = false, this._hand.joints = {}, this._hand.inputState = { pinching: false }), this._hand;
    }
    getTargetRaySpace() {
      return null === this._targetRay && (this._targetRay = new jl(), this._targetRay.matrixAutoUpdate = false, this._targetRay.visible = false, this._targetRay.hasLinearVelocity = false, this._targetRay.linearVelocity = new Ci(), this._targetRay.hasAngularVelocity = false, this._targetRay.angularVelocity = new Ci()), this._targetRay;
    }
    getGripSpace() {
      return null === this._grip && (this._grip = new jl(), this._grip.matrixAutoUpdate = false, this._grip.visible = false, this._grip.hasLinearVelocity = false, this._grip.linearVelocity = new Ci(), this._grip.hasAngularVelocity = false, this._grip.angularVelocity = new Ci()), this._grip;
    }
    dispatchEvent(t2) {
      return null !== this._targetRay && this._targetRay.dispatchEvent(t2), null !== this._grip && this._grip.dispatchEvent(t2), null !== this._hand && this._hand.dispatchEvent(t2), this;
    }
    connect(t2) {
      if (t2 && t2.hand) {
        const e2 = this._hand;
        if (e2) for (const n of t2.hand.values()) this._getHandJoint(e2, n);
      }
      return this.dispatchEvent({ type: "connected", data: t2 }), this;
    }
    disconnect(t2) {
      return this.dispatchEvent({ type: "disconnected", data: t2 }), null !== this._targetRay && (this._targetRay.visible = false), null !== this._grip && (this._grip.visible = false), null !== this._hand && (this._hand.visible = false), this;
    }
    update(t2, e2, n) {
      let i = null, r = null, s = null;
      const a = this._targetRay, o = this._grip, l = this._hand;
      if (t2 && "visible-blurred" !== e2.session.visibilityState) {
        if (l && t2.hand) {
          s = true;
          for (const i3 of t2.hand.values()) {
            const t3 = e2.getJointPose(i3, n), r3 = this._getHandJoint(l, i3);
            null !== t3 && (r3.matrix.fromArray(t3.transform.matrix), r3.matrix.decompose(r3.position, r3.rotation, r3.scale), r3.matrixWorldNeedsUpdate = true, r3.jointRadius = t3.radius), r3.visible = null !== t3;
          }
          const i2 = l.joints["index-finger-tip"], r2 = l.joints["thumb-tip"], a2 = i2.position.distanceTo(r2.position), o2 = 0.02, c = 5e-3;
          l.inputState.pinching && a2 > o2 + c ? (l.inputState.pinching = false, this.dispatchEvent({ type: "pinchend", handedness: t2.handedness, target: this })) : !l.inputState.pinching && a2 <= o2 - c && (l.inputState.pinching = true, this.dispatchEvent({ type: "pinchstart", handedness: t2.handedness, target: this }));
        } else null !== o && t2.gripSpace && (r = e2.getPose(t2.gripSpace, n), null !== r && (o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.rotation, o.scale), o.matrixWorldNeedsUpdate = true, r.linearVelocity ? (o.hasLinearVelocity = true, o.linearVelocity.copy(r.linearVelocity)) : o.hasLinearVelocity = false, r.angularVelocity ? (o.hasAngularVelocity = true, o.angularVelocity.copy(r.angularVelocity)) : o.hasAngularVelocity = false));
        null !== a && (i = e2.getPose(t2.targetRaySpace, n), null === i && null !== r && (i = r), null !== i && (a.matrix.fromArray(i.transform.matrix), a.matrix.decompose(a.position, a.rotation, a.scale), a.matrixWorldNeedsUpdate = true, i.linearVelocity ? (a.hasLinearVelocity = true, a.linearVelocity.copy(i.linearVelocity)) : a.hasLinearVelocity = false, i.angularVelocity ? (a.hasAngularVelocity = true, a.angularVelocity.copy(i.angularVelocity)) : a.hasAngularVelocity = false, this.dispatchEvent(ql)));
      }
      return null !== a && (a.visible = null !== i), null !== o && (o.visible = null !== r), null !== l && (l.visible = null !== s), this;
    }
    _getHandJoint(t2, e2) {
      if (void 0 === t2.joints[e2.jointName]) {
        const n = new jl();
        n.matrixAutoUpdate = false, n.visible = false, t2.joints[e2.jointName] = n, t2.add(n);
      }
      return t2.joints[e2.jointName];
    }
  };
  var Zl = class {
    constructor() {
      this.texture = null, this.mesh = null, this.depthNear = 0, this.depthFar = 0;
    }
    init(t2, e2, n) {
      if (null === this.texture) {
        const i = new yi();
        t2.properties.get(i).__webglTexture = e2.texture, e2.depthNear == n.depthNear && e2.depthFar == n.depthFar || (this.depthNear = e2.depthNear, this.depthFar = e2.depthFar), this.texture = i;
      }
    }
    getMesh(t2) {
      if (null !== this.texture && null === this.mesh) {
        const e2 = t2.cameras[0].viewport, n = new Xs({ vertexShader: "\nvoid main() {\n\n	gl_Position = vec4( position, 1.0 );\n\n}", fragmentShader: "\nuniform sampler2DArray depthColor;\nuniform float depthWidth;\nuniform float depthHeight;\n\nvoid main() {\n\n	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );\n\n	if ( coord.x >= 1.0 ) {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;\n\n	} else {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;\n\n	}\n\n}", uniforms: { depthColor: { value: this.texture }, depthWidth: { value: e2.z }, depthHeight: { value: e2.w } } });
        this.mesh = new Bs(new ha(20, 20), n);
      }
      return this.mesh;
    }
    reset() {
      this.texture = null, this.mesh = null;
    }
    getDepthTexture() {
      return this.texture;
    }
  };
  var Jl = class extends Bn {
    constructor(t2, e2) {
      super();
      const n = this;
      let i = null, r = 1, s = null, a = "local-floor", o = 1, l = null, c = null, h = null, u2 = null, d2 = null, p2 = null;
      const m = new Zl(), f = e2.getContextAttributes();
      let g = null, v = null;
      const _ = [], x = [], y2 = new Jn();
      let M2 = null;
      const S2 = new Js();
      S2.viewport = new Mi();
      const b = new Js();
      b.viewport = new Mi();
      const T = [S2, b], w2 = new Xl();
      let E2 = null, A2 = null;
      function R2(t3) {
        const e3 = x.indexOf(t3.inputSource);
        if (-1 === e3) return;
        const n2 = _[e3];
        void 0 !== n2 && (n2.update(t3.inputSource, t3.frame, l || s), n2.dispatchEvent({ type: t3.type, data: t3.inputSource }));
      }
      function C2() {
        i.removeEventListener("select", R2), i.removeEventListener("selectstart", R2), i.removeEventListener("selectend", R2), i.removeEventListener("squeeze", R2), i.removeEventListener("squeezestart", R2), i.removeEventListener("squeezeend", R2), i.removeEventListener("end", C2), i.removeEventListener("inputsourceschange", I2);
        for (let t3 = 0; t3 < _.length; t3++) {
          const e3 = x[t3];
          null !== e3 && (x[t3] = null, _[t3].disconnect(e3));
        }
        E2 = null, A2 = null, m.reset(), t2.setRenderTarget(g), d2 = null, u2 = null, h = null, i = null, v = null, N2.stop(), n.isPresenting = false, t2.setPixelRatio(M2), t2.setSize(y2.width, y2.height, false), n.dispatchEvent({ type: "sessionend" });
      }
      function I2(t3) {
        for (let e3 = 0; e3 < t3.removed.length; e3++) {
          const n2 = t3.removed[e3], i2 = x.indexOf(n2);
          i2 >= 0 && (x[i2] = null, _[i2].disconnect(n2));
        }
        for (let e3 = 0; e3 < t3.added.length; e3++) {
          const n2 = t3.added[e3];
          let i2 = x.indexOf(n2);
          if (-1 === i2) {
            for (let t4 = 0; t4 < _.length; t4++) {
              if (t4 >= x.length) {
                x.push(n2), i2 = t4;
                break;
              }
              if (null === x[t4]) {
                x[t4] = n2, i2 = t4;
                break;
              }
            }
            if (-1 === i2) break;
          }
          const r2 = _[i2];
          r2 && r2.connect(n2);
        }
      }
      this.cameraAutoUpdate = true, this.enabled = false, this.isPresenting = false, this.getController = function(t3) {
        let e3 = _[t3];
        return void 0 === e3 && (e3 = new Yl(), _[t3] = e3), e3.getTargetRaySpace();
      }, this.getControllerGrip = function(t3) {
        let e3 = _[t3];
        return void 0 === e3 && (e3 = new Yl(), _[t3] = e3), e3.getGripSpace();
      }, this.getHand = function(t3) {
        let e3 = _[t3];
        return void 0 === e3 && (e3 = new Yl(), _[t3] = e3), e3.getHandSpace();
      }, this.setFramebufferScaleFactor = function(t3) {
        r = t3, true === n.isPresenting && console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.");
      }, this.setReferenceSpaceType = function(t3) {
        a = t3, true === n.isPresenting && console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.");
      }, this.getReferenceSpace = function() {
        return l || s;
      }, this.setReferenceSpace = function(t3) {
        l = t3;
      }, this.getBaseLayer = function() {
        return null !== u2 ? u2 : d2;
      }, this.getBinding = function() {
        return h;
      }, this.getFrame = function() {
        return p2;
      }, this.getSession = function() {
        return i;
      }, this.setSession = async function(c2) {
        if (i = c2, null !== i) {
          if (g = t2.getRenderTarget(), i.addEventListener("select", R2), i.addEventListener("selectstart", R2), i.addEventListener("selectend", R2), i.addEventListener("squeeze", R2), i.addEventListener("squeezestart", R2), i.addEventListener("squeezeend", R2), i.addEventListener("end", C2), i.addEventListener("inputsourceschange", I2), true !== f.xrCompatible && await e2.makeXRCompatible(), M2 = t2.getPixelRatio(), t2.getSize(y2), void 0 === i.renderState.layers) {
            const n2 = { antialias: f.antialias, alpha: true, depth: f.depth, stencil: f.stencil, framebufferScaleFactor: r };
            d2 = new XRWebGLLayer(i, e2, n2), i.updateRenderState({ baseLayer: d2 }), t2.setPixelRatio(1), t2.setSize(d2.framebufferWidth, d2.framebufferHeight, false), v = new bi(d2.framebufferWidth, d2.framebufferHeight, { format: kt, type: Et, colorSpace: t2.outputColorSpace, stencilBuffer: f.stencil });
          } else {
            let n2 = null, s2 = null, a2 = null;
            f.depth && (a2 = f.stencil ? e2.DEPTH24_STENCIL8 : e2.DEPTH_COMPONENT24, n2 = f.stencil ? Wt : Gt, s2 = f.stencil ? Ot : Pt);
            const o2 = { colorFormat: e2.RGBA8, depthFormat: a2, scaleFactor: r };
            h = new XRWebGLBinding(i, e2), u2 = h.createProjectionLayer(o2), i.updateRenderState({ layers: [u2] }), t2.setPixelRatio(1), t2.setSize(u2.textureWidth, u2.textureHeight, false), v = new bi(u2.textureWidth, u2.textureHeight, { format: kt, type: Et, depthTexture: new Ya(u2.textureWidth, u2.textureHeight, s2, void 0, void 0, void 0, void 0, void 0, void 0, n2), stencilBuffer: f.stencil, colorSpace: t2.outputColorSpace, samples: f.antialias ? 4 : 0, resolveDepthBuffer: false === u2.ignoreDepthValues });
          }
          v.isXRRenderTarget = true, this.setFoveation(o), l = null, s = await i.requestReferenceSpace(a), N2.setContext(i), N2.start(), n.isPresenting = true, n.dispatchEvent({ type: "sessionstart" });
        }
      }, this.getEnvironmentBlendMode = function() {
        if (null !== i) return i.environmentBlendMode;
      }, this.getDepthTexture = function() {
        return m.getDepthTexture();
      };
      const P2 = new Ci(), L2 = new Ci();
      function U2(t3, e3) {
        null === e3 ? t3.matrixWorld.copy(t3.matrix) : t3.matrixWorld.multiplyMatrices(e3.matrixWorld, t3.matrix), t3.matrixWorldInverse.copy(t3.matrixWorld).invert();
      }
      this.updateCamera = function(t3) {
        if (null === i) return;
        let e3 = t3.near, n2 = t3.far;
        null !== m.texture && (m.depthNear > 0 && (e3 = m.depthNear), m.depthFar > 0 && (n2 = m.depthFar)), w2.near = b.near = S2.near = e3, w2.far = b.far = S2.far = n2, E2 === w2.near && A2 === w2.far || (i.updateRenderState({ depthNear: w2.near, depthFar: w2.far }), E2 = w2.near, A2 = w2.far), S2.layers.mask = 2 | t3.layers.mask, b.layers.mask = 4 | t3.layers.mask, w2.layers.mask = S2.layers.mask | b.layers.mask;
        const r2 = t3.parent, s2 = w2.cameras;
        U2(w2, r2);
        for (let t4 = 0; t4 < s2.length; t4++) U2(s2[t4], r2);
        2 === s2.length ? (function(t4, e4, n3) {
          P2.setFromMatrixPosition(e4.matrixWorld), L2.setFromMatrixPosition(n3.matrixWorld);
          const i2 = P2.distanceTo(L2), r3 = e4.projectionMatrix.elements, s3 = n3.projectionMatrix.elements, a2 = r3[14] / (r3[10] - 1), o2 = r3[14] / (r3[10] + 1), l2 = (r3[9] + 1) / r3[5], c2 = (r3[9] - 1) / r3[5], h2 = (r3[8] - 1) / r3[0], u3 = (s3[8] + 1) / s3[0], d3 = a2 * h2, p3 = a2 * u3, m2 = i2 / (-h2 + u3), f2 = m2 * -h2;
          if (e4.matrixWorld.decompose(t4.position, t4.quaternion, t4.scale), t4.translateX(f2), t4.translateZ(m2), t4.matrixWorld.compose(t4.position, t4.quaternion, t4.scale), t4.matrixWorldInverse.copy(t4.matrixWorld).invert(), -1 === r3[10]) t4.projectionMatrix.copy(e4.projectionMatrix), t4.projectionMatrixInverse.copy(e4.projectionMatrixInverse);
          else {
            const e5 = a2 + m2, n4 = o2 + m2, r4 = d3 - f2, s4 = p3 + (i2 - f2), h3 = l2 * o2 / n4 * e5, u4 = c2 * o2 / n4 * e5;
            t4.projectionMatrix.makePerspective(r4, s4, h3, u4, e5, n4), t4.projectionMatrixInverse.copy(t4.projectionMatrix).invert();
          }
        })(w2, S2, b) : w2.projectionMatrix.copy(S2.projectionMatrix), (function(t4, e4, n3) {
          null === n3 ? t4.matrix.copy(e4.matrixWorld) : (t4.matrix.copy(n3.matrixWorld), t4.matrix.invert(), t4.matrix.multiply(e4.matrixWorld));
          t4.matrix.decompose(t4.position, t4.quaternion, t4.scale), t4.updateMatrixWorld(true), t4.projectionMatrix.copy(e4.projectionMatrix), t4.projectionMatrixInverse.copy(e4.projectionMatrixInverse), t4.isPerspectiveCamera && (t4.fov = 2 * Hn * Math.atan(1 / t4.projectionMatrix.elements[5]), t4.zoom = 1);
        })(t3, w2, r2);
      }, this.getCamera = function() {
        return w2;
      }, this.getFoveation = function() {
        if (null !== u2 || null !== d2) return o;
      }, this.setFoveation = function(t3) {
        o = t3, null !== u2 && (u2.fixedFoveation = t3), null !== d2 && void 0 !== d2.fixedFoveation && (d2.fixedFoveation = t3);
      }, this.hasDepthSensing = function() {
        return null !== m.texture;
      }, this.getDepthSensingMesh = function() {
        return m.getMesh(w2);
      };
      let D2 = null;
      const N2 = new la();
      N2.setAnimationLoop((function(e3, r2) {
        if (c = r2.getViewerPose(l || s), p2 = r2, null !== c) {
          const e4 = c.views;
          null !== d2 && (t2.setRenderTargetFramebuffer(v, d2.framebuffer), t2.setRenderTarget(v));
          let n2 = false;
          e4.length !== w2.cameras.length && (w2.cameras.length = 0, n2 = true);
          for (let i2 = 0; i2 < e4.length; i2++) {
            const r4 = e4[i2];
            let s2 = null;
            if (null !== d2) s2 = d2.getViewport(r4);
            else {
              const e5 = h.getViewSubImage(u2, r4);
              s2 = e5.viewport, 0 === i2 && (t2.setRenderTargetTextures(v, e5.colorTexture, u2.ignoreDepthValues ? void 0 : e5.depthStencilTexture), t2.setRenderTarget(v));
            }
            let a2 = T[i2];
            void 0 === a2 && (a2 = new Js(), a2.layers.enable(i2), a2.viewport = new Mi(), T[i2] = a2), a2.matrix.fromArray(r4.transform.matrix), a2.matrix.decompose(a2.position, a2.quaternion, a2.scale), a2.projectionMatrix.fromArray(r4.projectionMatrix), a2.projectionMatrixInverse.copy(a2.projectionMatrix).invert(), a2.viewport.set(s2.x, s2.y, s2.width, s2.height), 0 === i2 && (w2.matrix.copy(a2.matrix), w2.matrix.decompose(w2.position, w2.quaternion, w2.scale)), true === n2 && w2.cameras.push(a2);
          }
          const r3 = i.enabledFeatures;
          if (r3 && r3.includes("depth-sensing")) {
            const n3 = h.getDepthInformation(e4[0]);
            n3 && n3.isValid && n3.texture && m.init(t2, n3, i.renderState);
          }
        }
        for (let t3 = 0; t3 < _.length; t3++) {
          const e4 = x[t3], n2 = _[t3];
          null !== e4 && void 0 !== n2 && n2.update(e4, r2, l || s);
        }
        D2 && D2(e3, r2), r2.detectedPlanes && n.dispatchEvent({ type: "planesdetected", data: r2 }), p2 = null;
      })), this.setAnimationLoop = function(t3) {
        D2 = t3;
      }, this.dispose = function() {
      };
    }
  };
  var Kl = new fr();
  var $l = new sr();
  function Ql(t2, e2) {
    function n(t3, e3) {
      true === t3.matrixAutoUpdate && t3.updateMatrix(), e3.value.copy(t3.matrix);
    }
    function i(t3, i2) {
      t3.opacity.value = i2.opacity, i2.color && t3.diffuse.value.copy(i2.color), i2.emissive && t3.emissive.value.copy(i2.emissive).multiplyScalar(i2.emissiveIntensity), i2.map && (t3.map.value = i2.map, n(i2.map, t3.mapTransform)), i2.alphaMap && (t3.alphaMap.value = i2.alphaMap, n(i2.alphaMap, t3.alphaMapTransform)), i2.bumpMap && (t3.bumpMap.value = i2.bumpMap, n(i2.bumpMap, t3.bumpMapTransform), t3.bumpScale.value = i2.bumpScale, 1 === i2.side && (t3.bumpScale.value *= -1)), i2.normalMap && (t3.normalMap.value = i2.normalMap, n(i2.normalMap, t3.normalMapTransform), t3.normalScale.value.copy(i2.normalScale), 1 === i2.side && t3.normalScale.value.negate()), i2.displacementMap && (t3.displacementMap.value = i2.displacementMap, n(i2.displacementMap, t3.displacementMapTransform), t3.displacementScale.value = i2.displacementScale, t3.displacementBias.value = i2.displacementBias), i2.emissiveMap && (t3.emissiveMap.value = i2.emissiveMap, n(i2.emissiveMap, t3.emissiveMapTransform)), i2.specularMap && (t3.specularMap.value = i2.specularMap, n(i2.specularMap, t3.specularMapTransform)), i2.alphaTest > 0 && (t3.alphaTest.value = i2.alphaTest);
      const r = e2.get(i2), s = r.envMap, a = r.envMapRotation;
      s && (t3.envMap.value = s, Kl.copy(a), Kl.x *= -1, Kl.y *= -1, Kl.z *= -1, s.isCubeTexture && false === s.isRenderTargetTexture && (Kl.y *= -1, Kl.z *= -1), t3.envMapRotation.value.setFromMatrix4($l.makeRotationFromEuler(Kl)), t3.flipEnvMap.value = s.isCubeTexture && false === s.isRenderTargetTexture ? -1 : 1, t3.reflectivity.value = i2.reflectivity, t3.ior.value = i2.ior, t3.refractionRatio.value = i2.refractionRatio), i2.lightMap && (t3.lightMap.value = i2.lightMap, t3.lightMapIntensity.value = i2.lightMapIntensity, n(i2.lightMap, t3.lightMapTransform)), i2.aoMap && (t3.aoMap.value = i2.aoMap, t3.aoMapIntensity.value = i2.aoMapIntensity, n(i2.aoMap, t3.aoMapTransform));
    }
    return { refreshFogUniforms: function(e3, n2) {
      n2.color.getRGB(e3.fogColor.value, Gs(t2)), n2.isFog ? (e3.fogNear.value = n2.near, e3.fogFar.value = n2.far) : n2.isFogExp2 && (e3.fogDensity.value = n2.density);
    }, refreshMaterialUniforms: function(t3, r, s, a, o) {
      r.isMeshBasicMaterial || r.isMeshLambertMaterial ? i(t3, r) : r.isMeshToonMaterial ? (i(t3, r), (function(t4, e3) {
        e3.gradientMap && (t4.gradientMap.value = e3.gradientMap);
      })(t3, r)) : r.isMeshPhongMaterial ? (i(t3, r), (function(t4, e3) {
        t4.specular.value.copy(e3.specular), t4.shininess.value = Math.max(e3.shininess, 1e-4);
      })(t3, r)) : r.isMeshStandardMaterial ? (i(t3, r), (function(t4, e3) {
        t4.metalness.value = e3.metalness, e3.metalnessMap && (t4.metalnessMap.value = e3.metalnessMap, n(e3.metalnessMap, t4.metalnessMapTransform));
        t4.roughness.value = e3.roughness, e3.roughnessMap && (t4.roughnessMap.value = e3.roughnessMap, n(e3.roughnessMap, t4.roughnessMapTransform));
        e3.envMap && (t4.envMapIntensity.value = e3.envMapIntensity);
      })(t3, r), r.isMeshPhysicalMaterial && (function(t4, e3, i2) {
        t4.ior.value = e3.ior, e3.sheen > 0 && (t4.sheenColor.value.copy(e3.sheenColor).multiplyScalar(e3.sheen), t4.sheenRoughness.value = e3.sheenRoughness, e3.sheenColorMap && (t4.sheenColorMap.value = e3.sheenColorMap, n(e3.sheenColorMap, t4.sheenColorMapTransform)), e3.sheenRoughnessMap && (t4.sheenRoughnessMap.value = e3.sheenRoughnessMap, n(e3.sheenRoughnessMap, t4.sheenRoughnessMapTransform)));
        e3.clearcoat > 0 && (t4.clearcoat.value = e3.clearcoat, t4.clearcoatRoughness.value = e3.clearcoatRoughness, e3.clearcoatMap && (t4.clearcoatMap.value = e3.clearcoatMap, n(e3.clearcoatMap, t4.clearcoatMapTransform)), e3.clearcoatRoughnessMap && (t4.clearcoatRoughnessMap.value = e3.clearcoatRoughnessMap, n(e3.clearcoatRoughnessMap, t4.clearcoatRoughnessMapTransform)), e3.clearcoatNormalMap && (t4.clearcoatNormalMap.value = e3.clearcoatNormalMap, n(e3.clearcoatNormalMap, t4.clearcoatNormalMapTransform), t4.clearcoatNormalScale.value.copy(e3.clearcoatNormalScale), 1 === e3.side && t4.clearcoatNormalScale.value.negate()));
        e3.dispersion > 0 && (t4.dispersion.value = e3.dispersion);
        e3.iridescence > 0 && (t4.iridescence.value = e3.iridescence, t4.iridescenceIOR.value = e3.iridescenceIOR, t4.iridescenceThicknessMinimum.value = e3.iridescenceThicknessRange[0], t4.iridescenceThicknessMaximum.value = e3.iridescenceThicknessRange[1], e3.iridescenceMap && (t4.iridescenceMap.value = e3.iridescenceMap, n(e3.iridescenceMap, t4.iridescenceMapTransform)), e3.iridescenceThicknessMap && (t4.iridescenceThicknessMap.value = e3.iridescenceThicknessMap, n(e3.iridescenceThicknessMap, t4.iridescenceThicknessMapTransform)));
        e3.transmission > 0 && (t4.transmission.value = e3.transmission, t4.transmissionSamplerMap.value = i2.texture, t4.transmissionSamplerSize.value.set(i2.width, i2.height), e3.transmissionMap && (t4.transmissionMap.value = e3.transmissionMap, n(e3.transmissionMap, t4.transmissionMapTransform)), t4.thickness.value = e3.thickness, e3.thicknessMap && (t4.thicknessMap.value = e3.thicknessMap, n(e3.thicknessMap, t4.thicknessMapTransform)), t4.attenuationDistance.value = e3.attenuationDistance, t4.attenuationColor.value.copy(e3.attenuationColor));
        e3.anisotropy > 0 && (t4.anisotropyVector.value.set(e3.anisotropy * Math.cos(e3.anisotropyRotation), e3.anisotropy * Math.sin(e3.anisotropyRotation)), e3.anisotropyMap && (t4.anisotropyMap.value = e3.anisotropyMap, n(e3.anisotropyMap, t4.anisotropyMapTransform)));
        t4.specularIntensity.value = e3.specularIntensity, t4.specularColor.value.copy(e3.specularColor), e3.specularColorMap && (t4.specularColorMap.value = e3.specularColorMap, n(e3.specularColorMap, t4.specularColorMapTransform));
        e3.specularIntensityMap && (t4.specularIntensityMap.value = e3.specularIntensityMap, n(e3.specularIntensityMap, t4.specularIntensityMapTransform));
      })(t3, r, o)) : r.isMeshMatcapMaterial ? (i(t3, r), (function(t4, e3) {
        e3.matcap && (t4.matcap.value = e3.matcap);
      })(t3, r)) : r.isMeshDepthMaterial ? i(t3, r) : r.isMeshDistanceMaterial ? (i(t3, r), (function(t4, n2) {
        const i2 = e2.get(n2).light;
        t4.referencePosition.value.setFromMatrixPosition(i2.matrixWorld), t4.nearDistance.value = i2.shadow.camera.near, t4.farDistance.value = i2.shadow.camera.far;
      })(t3, r)) : r.isMeshNormalMaterial ? i(t3, r) : r.isLineBasicMaterial ? ((function(t4, e3) {
        t4.diffuse.value.copy(e3.color), t4.opacity.value = e3.opacity, e3.map && (t4.map.value = e3.map, n(e3.map, t4.mapTransform));
      })(t3, r), r.isLineDashedMaterial && (function(t4, e3) {
        t4.dashSize.value = e3.dashSize, t4.totalSize.value = e3.dashSize + e3.gapSize, t4.scale.value = e3.scale;
      })(t3, r)) : r.isPointsMaterial ? (function(t4, e3, i2, r2) {
        t4.diffuse.value.copy(e3.color), t4.opacity.value = e3.opacity, t4.size.value = e3.size * i2, t4.scale.value = 0.5 * r2, e3.map && (t4.map.value = e3.map, n(e3.map, t4.uvTransform));
        e3.alphaMap && (t4.alphaMap.value = e3.alphaMap, n(e3.alphaMap, t4.alphaMapTransform));
        e3.alphaTest > 0 && (t4.alphaTest.value = e3.alphaTest);
      })(t3, r, s, a) : r.isSpriteMaterial ? (function(t4, e3) {
        t4.diffuse.value.copy(e3.color), t4.opacity.value = e3.opacity, t4.rotation.value = e3.rotation, e3.map && (t4.map.value = e3.map, n(e3.map, t4.mapTransform));
        e3.alphaMap && (t4.alphaMap.value = e3.alphaMap, n(e3.alphaMap, t4.alphaMapTransform));
        e3.alphaTest > 0 && (t4.alphaTest.value = e3.alphaTest);
      })(t3, r) : r.isShadowMaterial ? (t3.color.value.copy(r.color), t3.opacity.value = r.opacity) : r.isShaderMaterial && (r.uniformsNeedUpdate = false);
    } };
  }
  function tc(t2, e2, n, i) {
    let r = {}, s = {}, a = [];
    const o = t2.getParameter(t2.MAX_UNIFORM_BUFFER_BINDINGS);
    function l(t3, e3, n2, i2) {
      const r2 = t3.value, s2 = e3 + "_" + n2;
      if (void 0 === i2[s2]) return i2[s2] = "number" == typeof r2 || "boolean" == typeof r2 ? r2 : r2.clone(), true;
      {
        const t4 = i2[s2];
        if ("number" == typeof r2 || "boolean" == typeof r2) {
          if (t4 !== r2) return i2[s2] = r2, true;
        } else if (false === t4.equals(r2)) return t4.copy(r2), true;
      }
      return false;
    }
    function c(t3) {
      const e3 = { boundary: 0, storage: 0 };
      return "number" == typeof t3 || "boolean" == typeof t3 ? (e3.boundary = 4, e3.storage = 4) : t3.isVector2 ? (e3.boundary = 8, e3.storage = 8) : t3.isVector3 || t3.isColor ? (e3.boundary = 16, e3.storage = 12) : t3.isVector4 ? (e3.boundary = 16, e3.storage = 16) : t3.isMatrix3 ? (e3.boundary = 48, e3.storage = 48) : t3.isMatrix4 ? (e3.boundary = 64, e3.storage = 64) : t3.isTexture ? console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.") : console.warn("THREE.WebGLRenderer: Unsupported uniform value type.", t3), e3;
    }
    function h(e3) {
      const n2 = e3.target;
      n2.removeEventListener("dispose", h);
      const i2 = a.indexOf(n2.__bindingPointIndex);
      a.splice(i2, 1), t2.deleteBuffer(r[n2.id]), delete r[n2.id], delete s[n2.id];
    }
    return { bind: function(t3, e3) {
      const n2 = e3.program;
      i.uniformBlockBinding(t3, n2);
    }, update: function(n2, u2) {
      let d2 = r[n2.id];
      void 0 === d2 && (!(function(t3) {
        const e3 = t3.uniforms;
        let n3 = 0;
        const i2 = 16;
        for (let t4 = 0, r3 = e3.length; t4 < r3; t4++) {
          const r4 = Array.isArray(e3[t4]) ? e3[t4] : [e3[t4]];
          for (let t5 = 0, e4 = r4.length; t5 < e4; t5++) {
            const e5 = r4[t5], s2 = Array.isArray(e5.value) ? e5.value : [e5.value];
            for (let t6 = 0, r5 = s2.length; t6 < r5; t6++) {
              const r6 = c(s2[t6]), a2 = n3 % i2, o2 = a2 % r6.boundary, l2 = a2 + o2;
              n3 += o2, 0 !== l2 && i2 - l2 < r6.storage && (n3 += i2 - l2), e5.__data = new Float32Array(r6.storage / Float32Array.BYTES_PER_ELEMENT), e5.__offset = n3, n3 += r6.storage;
            }
          }
        }
        const r2 = n3 % i2;
        r2 > 0 && (n3 += i2 - r2);
        t3.__size = n3, t3.__cache = {};
      })(n2), d2 = (function(e3) {
        const n3 = (function() {
          for (let t3 = 0; t3 < o; t3++) if (-1 === a.indexOf(t3)) return a.push(t3), t3;
          return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."), 0;
        })();
        e3.__bindingPointIndex = n3;
        const i2 = t2.createBuffer(), r2 = e3.__size, s2 = e3.usage;
        return t2.bindBuffer(t2.UNIFORM_BUFFER, i2), t2.bufferData(t2.UNIFORM_BUFFER, r2, s2), t2.bindBuffer(t2.UNIFORM_BUFFER, null), t2.bindBufferBase(t2.UNIFORM_BUFFER, n3, i2), i2;
      })(n2), r[n2.id] = d2, n2.addEventListener("dispose", h));
      const p2 = u2.program;
      i.updateUBOMapping(n2, p2);
      const m = e2.render.frame;
      s[n2.id] !== m && (!(function(e3) {
        const n3 = r[e3.id], i2 = e3.uniforms, s2 = e3.__cache;
        t2.bindBuffer(t2.UNIFORM_BUFFER, n3);
        for (let e4 = 0, n4 = i2.length; e4 < n4; e4++) {
          const n5 = Array.isArray(i2[e4]) ? i2[e4] : [i2[e4]];
          for (let i3 = 0, r2 = n5.length; i3 < r2; i3++) {
            const r3 = n5[i3];
            if (true === l(r3, e4, i3, s2)) {
              const e5 = r3.__offset, n6 = Array.isArray(r3.value) ? r3.value : [r3.value];
              let i4 = 0;
              for (let s3 = 0; s3 < n6.length; s3++) {
                const a2 = n6[s3], o2 = c(a2);
                "number" == typeof a2 || "boolean" == typeof a2 ? (r3.__data[0] = a2, t2.bufferSubData(t2.UNIFORM_BUFFER, e5 + i4, r3.__data)) : a2.isMatrix3 ? (r3.__data[0] = a2.elements[0], r3.__data[1] = a2.elements[1], r3.__data[2] = a2.elements[2], r3.__data[3] = 0, r3.__data[4] = a2.elements[3], r3.__data[5] = a2.elements[4], r3.__data[6] = a2.elements[5], r3.__data[7] = 0, r3.__data[8] = a2.elements[6], r3.__data[9] = a2.elements[7], r3.__data[10] = a2.elements[8], r3.__data[11] = 0) : (a2.toArray(r3.__data, i4), i4 += o2.storage / Float32Array.BYTES_PER_ELEMENT);
              }
              t2.bufferSubData(t2.UNIFORM_BUFFER, e5, r3.__data);
            }
          }
        }
        t2.bindBuffer(t2.UNIFORM_BUFFER, null);
      })(n2), s[n2.id] = m);
    }, dispose: function() {
      for (const e3 in r) t2.deleteBuffer(r[e3]);
      a = [], r = {}, s = {};
    } };
  }
  var ec = class {
    constructor(e2 = {}) {
      const { canvas: n = ii(), context: i = null, depth: r = true, stencil: s = false, alpha: a = false, antialias: o = false, premultipliedAlpha: l = true, preserveDrawingBuffer: c = false, powerPreference: h = "default", failIfMajorPerformanceCaveat: u2 = false, reverseDepthBuffer: d2 = false } = e2;
      let p2;
      if (this.isWebGLRenderer = true, null !== i) {
        if ("undefined" != typeof WebGLRenderingContext && i instanceof WebGLRenderingContext) throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
        p2 = i.getContextAttributes().alpha;
      } else p2 = a;
      const m = new Uint32Array(4), f = new Int32Array(4);
      let g = null, v = null;
      const _ = [], x = [];
      this.domElement = n, this.debug = { checkShaderErrors: true, onShaderError: null }, this.autoClear = true, this.autoClearColor = true, this.autoClearDepth = true, this.autoClearStencil = true, this.sortObjects = true, this.clippingPlanes = [], this.localClippingEnabled = false, this._outputColorSpace = Je, this.toneMapping = 0, this.toneMappingExposure = 1;
      const y2 = this;
      let M2 = false, S2 = 0, b = 0, T = null, w2 = -1, E2 = null;
      const A2 = new Mi(), R2 = new Mi();
      let C2 = null;
      const I2 = new Kr(0);
      let P2 = 0, L2 = n.width, U2 = n.height, D2 = 1, N2 = null, O2 = null;
      const F2 = new Mi(0, 0, L2, U2), B2 = new Mi(0, 0, L2, U2);
      let z2 = false;
      const k2 = new oa();
      let V2 = false, H2 = false;
      const G2 = new sr(), W2 = new sr(), X2 = new Ci(), j2 = new Mi(), q2 = { background: null, fog: null, environment: null, overrideMaterial: null, isScene: true };
      let Y = false;
      function Z() {
        return null === T ? D2 : 1;
      }
      let J, K, $, Q, tt, et, nt, it, rt, st, at, ot2, lt2, ct2, ht2, ut2, dt2, pt2, mt2, ft2, gt2, vt2, _t, xt2, yt = i;
      function Mt2(t2, e3) {
        return n.getContext(t2, e3);
      }
      try {
        const e3 = { alpha: true, depth: r, stencil: s, antialias: o, premultipliedAlpha: l, preserveDrawingBuffer: c, powerPreference: h, failIfMajorPerformanceCaveat: u2 };
        if ("setAttribute" in n && n.setAttribute("data-engine", `three.js r${t}`), n.addEventListener("webglcontextlost", wt, false), n.addEventListener("webglcontextrestored", At2, false), n.addEventListener("webglcontextcreationerror", Rt2, false), null === yt) {
          const t2 = "webgl2";
          if (yt = Mt2(t2, e3), null === yt) throw Mt2(t2) ? new Error("Error creating WebGL context with your selected attributes.") : new Error("Error creating WebGL context.");
        }
      } catch (t2) {
        throw console.error("THREE.WebGLRenderer: " + t2.message), t2;
      }
      function St2() {
        J = new Ha(yt), J.init(), vt2 = new Wl(yt, J), K = new ya(yt, J, e2, vt2), $ = new kl(yt, J), K.reverseDepthBuffer && d2 && $.buffers.depth.setReversed(true), Q = new Xa(yt), tt = new wl(), et = new Gl(yt, J, $, tt, K, vt2, Q), nt = new Sa(y2), it = new Va(y2), rt = new ca(yt), _t = new _a(yt, rt), st = new Ga(yt, rt, Q, _t), at = new qa(yt, st, rt, Q), mt2 = new ja(yt, K, et), ut2 = new Ma(tt), ot2 = new Tl(y2, nt, it, J, K, _t, ut2), lt2 = new Ql(y2, tt), ct2 = new Cl(), ht2 = new Nl(J), pt2 = new va(y2, nt, it, $, at, p2, l), dt2 = new Bl(y2, at, K), xt2 = new tc(yt, Q, K, $), ft2 = new xa(yt, J, Q), gt2 = new Wa(yt, J, Q), Q.programs = ot2.programs, y2.capabilities = K, y2.extensions = J, y2.properties = tt, y2.renderLists = ct2, y2.shadowMap = dt2, y2.state = $, y2.info = Q;
      }
      St2();
      const bt = new Jl(y2, yt);
      function wt(t2) {
        t2.preventDefault(), console.log("THREE.WebGLRenderer: Context Lost."), M2 = true;
      }
      function At2() {
        console.log("THREE.WebGLRenderer: Context Restored."), M2 = false;
        const t2 = Q.autoReset, e3 = dt2.enabled, n2 = dt2.autoUpdate, i2 = dt2.needsUpdate, r2 = dt2.type;
        St2(), Q.autoReset = t2, dt2.enabled = e3, dt2.autoUpdate = n2, dt2.needsUpdate = i2, dt2.type = r2;
      }
      function Rt2(t2) {
        console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ", t2.statusMessage);
      }
      function It2(t2) {
        const e3 = t2.target;
        e3.removeEventListener("dispose", It2), (function(t3) {
          (function(t4) {
            const e4 = tt.get(t4).programs;
            void 0 !== e4 && (e4.forEach((function(t5) {
              ot2.releaseProgram(t5);
            })), t4.isShaderMaterial && ot2.releaseShaderCache(t4));
          })(t3), tt.remove(t3);
        })(e3);
      }
      function Lt2(t2, e3, n2) {
        true === t2.transparent && 2 === t2.side && false === t2.forceSinglePass ? (t2.side = 1, t2.needsUpdate = true, qt2(t2, e3, n2), t2.side = 0, t2.needsUpdate = true, qt2(t2, e3, n2), t2.side = 2) : qt2(t2, e3, n2);
      }
      this.xr = bt, this.getContext = function() {
        return yt;
      }, this.getContextAttributes = function() {
        return yt.getContextAttributes();
      }, this.forceContextLoss = function() {
        const t2 = J.get("WEBGL_lose_context");
        t2 && t2.loseContext();
      }, this.forceContextRestore = function() {
        const t2 = J.get("WEBGL_lose_context");
        t2 && t2.restoreContext();
      }, this.getPixelRatio = function() {
        return D2;
      }, this.setPixelRatio = function(t2) {
        void 0 !== t2 && (D2 = t2, this.setSize(L2, U2, false));
      }, this.getSize = function(t2) {
        return t2.set(L2, U2);
      }, this.setSize = function(t2, e3, i2 = true) {
        bt.isPresenting ? console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.") : (L2 = t2, U2 = e3, n.width = Math.floor(t2 * D2), n.height = Math.floor(e3 * D2), true === i2 && (n.style.width = t2 + "px", n.style.height = e3 + "px"), this.setViewport(0, 0, t2, e3));
      }, this.getDrawingBufferSize = function(t2) {
        return t2.set(L2 * D2, U2 * D2).floor();
      }, this.setDrawingBufferSize = function(t2, e3, i2) {
        L2 = t2, U2 = e3, D2 = i2, n.width = Math.floor(t2 * i2), n.height = Math.floor(e3 * i2), this.setViewport(0, 0, t2, e3);
      }, this.getCurrentViewport = function(t2) {
        return t2.copy(A2);
      }, this.getViewport = function(t2) {
        return t2.copy(F2);
      }, this.setViewport = function(t2, e3, n2, i2) {
        t2.isVector4 ? F2.set(t2.x, t2.y, t2.z, t2.w) : F2.set(t2, e3, n2, i2), $.viewport(A2.copy(F2).multiplyScalar(D2).round());
      }, this.getScissor = function(t2) {
        return t2.copy(B2);
      }, this.setScissor = function(t2, e3, n2, i2) {
        t2.isVector4 ? B2.set(t2.x, t2.y, t2.z, t2.w) : B2.set(t2, e3, n2, i2), $.scissor(R2.copy(B2).multiplyScalar(D2).round());
      }, this.getScissorTest = function() {
        return z2;
      }, this.setScissorTest = function(t2) {
        $.setScissorTest(z2 = t2);
      }, this.setOpaqueSort = function(t2) {
        N2 = t2;
      }, this.setTransparentSort = function(t2) {
        O2 = t2;
      }, this.getClearColor = function(t2) {
        return t2.copy(pt2.getClearColor());
      }, this.setClearColor = function() {
        pt2.setClearColor.apply(pt2, arguments);
      }, this.getClearAlpha = function() {
        return pt2.getClearAlpha();
      }, this.setClearAlpha = function() {
        pt2.setClearAlpha.apply(pt2, arguments);
      }, this.clear = function(t2 = true, e3 = true, n2 = true) {
        let i2 = 0;
        if (t2) {
          let t3 = false;
          if (null !== T) {
            const e4 = T.texture.format;
            t3 = e4 === Jt || e4 === Yt || e4 === jt;
          }
          if (t3) {
            const t4 = T.texture.type, e4 = t4 === Et || t4 === Pt || t4 === Ct || t4 === Ot || t4 === Dt || t4 === Nt, n3 = pt2.getClearColor(), i3 = pt2.getClearAlpha(), r2 = n3.r, s2 = n3.g, a2 = n3.b;
            e4 ? (m[0] = r2, m[1] = s2, m[2] = a2, m[3] = i3, yt.clearBufferuiv(yt.COLOR, 0, m)) : (f[0] = r2, f[1] = s2, f[2] = a2, f[3] = i3, yt.clearBufferiv(yt.COLOR, 0, f));
          } else i2 |= yt.COLOR_BUFFER_BIT;
        }
        e3 && (i2 |= yt.DEPTH_BUFFER_BIT), n2 && (i2 |= yt.STENCIL_BUFFER_BIT, this.state.buffers.stencil.setMask(4294967295)), yt.clear(i2);
      }, this.clearColor = function() {
        this.clear(true, false, false);
      }, this.clearDepth = function() {
        this.clear(false, true, false);
      }, this.clearStencil = function() {
        this.clear(false, false, true);
      }, this.dispose = function() {
        n.removeEventListener("webglcontextlost", wt, false), n.removeEventListener("webglcontextrestored", At2, false), n.removeEventListener("webglcontextcreationerror", Rt2, false), ct2.dispose(), ht2.dispose(), tt.dispose(), nt.dispose(), it.dispose(), at.dispose(), _t.dispose(), xt2.dispose(), ot2.dispose(), bt.dispose(), bt.removeEventListener("sessionstart", Bt2), bt.removeEventListener("sessionend", zt2), kt2.stop();
      }, this.renderBufferDirect = function(t2, e3, n2, i2, r2, s2) {
        null === e3 && (e3 = q2);
        const a2 = r2.isMesh && r2.matrixWorld.determinant() < 0, o2 = (function(t3, e4, n3, i3, r3) {
          true !== e4.isScene && (e4 = q2);
          et.resetTextureUnits();
          const s3 = e4.fog, a3 = i3.isMeshStandardMaterial ? e4.environment : null, o3 = null === T ? y2.outputColorSpace : true === T.isXRRenderTarget ? T.texture.colorSpace : Ke, l3 = (i3.isMeshStandardMaterial ? it : nt).get(i3.envMap || a3), c3 = true === i3.vertexColors && !!n3.attributes.color && 4 === n3.attributes.color.itemSize, h3 = !!n3.attributes.tangent && (!!i3.normalMap || i3.anisotropy > 0), u4 = !!n3.morphAttributes.position, d4 = !!n3.morphAttributes.normal, p4 = !!n3.morphAttributes.color;
          let m3 = 0;
          i3.toneMapped && (null !== T && true !== T.isXRRenderTarget || (m3 = y2.toneMapping));
          const f3 = n3.morphAttributes.position || n3.morphAttributes.normal || n3.morphAttributes.color, g3 = void 0 !== f3 ? f3.length : 0, _2 = tt.get(i3), x2 = v.state.lights;
          if (true === V2 && (true === H2 || t3 !== E2)) {
            const e5 = t3 === E2 && i3.id === w2;
            ut2.setState(i3, t3, e5);
          }
          let M3 = false;
          i3.version === _2.__version ? _2.needsLights && _2.lightsStateVersion !== x2.state.version || _2.outputColorSpace !== o3 || r3.isBatchedMesh && false === _2.batching ? M3 = true : r3.isBatchedMesh || true !== _2.batching ? r3.isBatchedMesh && true === _2.batchingColor && null === r3.colorTexture || r3.isBatchedMesh && false === _2.batchingColor && null !== r3.colorTexture || r3.isInstancedMesh && false === _2.instancing ? M3 = true : r3.isInstancedMesh || true !== _2.instancing ? r3.isSkinnedMesh && false === _2.skinning ? M3 = true : r3.isSkinnedMesh || true !== _2.skinning ? r3.isInstancedMesh && true === _2.instancingColor && null === r3.instanceColor || r3.isInstancedMesh && false === _2.instancingColor && null !== r3.instanceColor || r3.isInstancedMesh && true === _2.instancingMorph && null === r3.morphTexture || r3.isInstancedMesh && false === _2.instancingMorph && null !== r3.morphTexture || _2.envMap !== l3 || true === i3.fog && _2.fog !== s3 ? M3 = true : void 0 === _2.numClippingPlanes || _2.numClippingPlanes === ut2.numPlanes && _2.numIntersection === ut2.numIntersection ? (_2.vertexAlphas !== c3 || _2.vertexTangents !== h3 || _2.morphTargets !== u4 || _2.morphNormals !== d4 || _2.morphColors !== p4 || _2.toneMapping !== m3 || _2.morphTargetsCount !== g3) && (M3 = true) : M3 = true : M3 = true : M3 = true : M3 = true : (M3 = true, _2.__version = i3.version);
          let S3 = _2.currentProgram;
          true === M3 && (S3 = qt2(i3, e4, r3));
          let b2 = false, A3 = false, R3 = false;
          const C3 = S3.getUniforms(), I3 = _2.uniforms;
          $.useProgram(S3.program) && (b2 = true, A3 = true, R3 = true);
          i3.id !== w2 && (w2 = i3.id, A3 = true);
          if (b2 || E2 !== t3) {
            $.buffers.depth.getReversed() ? (G2.copy(t3.projectionMatrix), (function(t4) {
              const e6 = t4.elements;
              e6[2] = 0.5 * e6[2] + 0.5 * e6[3], e6[6] = 0.5 * e6[6] + 0.5 * e6[7], e6[10] = 0.5 * e6[10] + 0.5 * e6[11], e6[14] = 0.5 * e6[14] + 0.5 * e6[15];
            })(G2), (function(t4) {
              const e6 = t4.elements;
              -1 === e6[11] ? (e6[10] = -e6[10] - 1, e6[14] = -e6[14]) : (e6[10] = -e6[10], e6[14] = 1 - e6[14]);
            })(G2), C3.setValue(yt, "projectionMatrix", G2)) : C3.setValue(yt, "projectionMatrix", t3.projectionMatrix), C3.setValue(yt, "viewMatrix", t3.matrixWorldInverse);
            const e5 = C3.map.cameraPosition;
            void 0 !== e5 && e5.setValue(yt, X2.setFromMatrixPosition(t3.matrixWorld)), K.logarithmicDepthBuffer && C3.setValue(yt, "logDepthBufFC", 2 / (Math.log(t3.far + 1) / Math.LN2)), (i3.isMeshPhongMaterial || i3.isMeshToonMaterial || i3.isMeshLambertMaterial || i3.isMeshBasicMaterial || i3.isMeshStandardMaterial || i3.isShaderMaterial) && C3.setValue(yt, "isOrthographic", true === t3.isOrthographicCamera), E2 !== t3 && (E2 = t3, A3 = true, R3 = true);
          }
          if (r3.isSkinnedMesh) {
            C3.setOptional(yt, r3, "bindMatrix"), C3.setOptional(yt, r3, "bindMatrixInverse");
            const t4 = r3.skeleton;
            t4 && (null === t4.boneTexture && t4.computeBoneTexture(), C3.setValue(yt, "boneTexture", t4.boneTexture, et));
          }
          r3.isBatchedMesh && (C3.setOptional(yt, r3, "batchingTexture"), C3.setValue(yt, "batchingTexture", r3._matricesTexture, et), C3.setOptional(yt, r3, "batchingIdTexture"), C3.setValue(yt, "batchingIdTexture", r3._indirectTexture, et), C3.setOptional(yt, r3, "batchingColorTexture"), null !== r3._colorsTexture && C3.setValue(yt, "batchingColorTexture", r3._colorsTexture, et));
          const P3 = n3.morphAttributes;
          void 0 === P3.position && void 0 === P3.normal && void 0 === P3.color || mt2.update(r3, n3, S3);
          (A3 || _2.receiveShadow !== r3.receiveShadow) && (_2.receiveShadow = r3.receiveShadow, C3.setValue(yt, "receiveShadow", r3.receiveShadow));
          i3.isMeshGouraudMaterial && null !== i3.envMap && (I3.envMap.value = l3, I3.flipEnvMap.value = l3.isCubeTexture && false === l3.isRenderTargetTexture ? -1 : 1);
          i3.isMeshStandardMaterial && null === i3.envMap && null !== e4.environment && (I3.envMapIntensity.value = e4.environmentIntensity);
          A3 && (C3.setValue(yt, "toneMappingExposure", y2.toneMappingExposure), _2.needsLights && (N3 = R3, (L3 = I3).ambientLightColor.needsUpdate = N3, L3.lightProbe.needsUpdate = N3, L3.directionalLights.needsUpdate = N3, L3.directionalLightShadows.needsUpdate = N3, L3.pointLights.needsUpdate = N3, L3.pointLightShadows.needsUpdate = N3, L3.spotLights.needsUpdate = N3, L3.spotLightShadows.needsUpdate = N3, L3.rectAreaLights.needsUpdate = N3, L3.hemisphereLights.needsUpdate = N3), s3 && true === i3.fog && lt2.refreshFogUniforms(I3, s3), lt2.refreshMaterialUniforms(I3, i3, D2, U2, v.state.transmissionRenderTarget[t3.id]), tl.upload(yt, Zt(_2), I3, et));
          var L3, N3;
          i3.isShaderMaterial && true === i3.uniformsNeedUpdate && (tl.upload(yt, Zt(_2), I3, et), i3.uniformsNeedUpdate = false);
          i3.isSpriteMaterial && C3.setValue(yt, "center", r3.center);
          if (C3.setValue(yt, "modelViewMatrix", r3.modelViewMatrix), C3.setValue(yt, "normalMatrix", r3.normalMatrix), C3.setValue(yt, "modelMatrix", r3.matrixWorld), i3.isShaderMaterial || i3.isRawShaderMaterial) {
            const t4 = i3.uniformsGroups;
            for (let e5 = 0, n4 = t4.length; e5 < n4; e5++) {
              const n5 = t4[e5];
              xt2.update(n5, S3), xt2.bind(n5, S3);
            }
          }
          return S3;
        })(t2, e3, n2, i2, r2);
        $.setMaterial(i2, a2);
        let l2 = n2.index, c2 = 1;
        if (true === i2.wireframe) {
          if (l2 = st.getWireframeAttribute(n2), void 0 === l2) return;
          c2 = 2;
        }
        const h2 = n2.drawRange, u3 = n2.attributes.position;
        let d3 = h2.start * c2, p3 = (h2.start + h2.count) * c2;
        null !== s2 && (d3 = Math.max(d3, s2.start * c2), p3 = Math.min(p3, (s2.start + s2.count) * c2)), null !== l2 ? (d3 = Math.max(d3, 0), p3 = Math.min(p3, l2.count)) : null != u3 && (d3 = Math.max(d3, 0), p3 = Math.min(p3, u3.count));
        const m2 = p3 - d3;
        if (m2 < 0 || m2 === 1 / 0) return;
        let f2;
        _t.setup(r2, i2, o2, n2, l2);
        let g2 = ft2;
        if (null !== l2 && (f2 = rt.get(l2), g2 = gt2, g2.setIndex(f2)), r2.isMesh) true === i2.wireframe ? ($.setLineWidth(i2.wireframeLinewidth * Z()), g2.setMode(yt.LINES)) : g2.setMode(yt.TRIANGLES);
        else if (r2.isLine) {
          let t3 = i2.linewidth;
          void 0 === t3 && (t3 = 1), $.setLineWidth(t3 * Z()), r2.isLineSegments ? g2.setMode(yt.LINES) : r2.isLineLoop ? g2.setMode(yt.LINE_LOOP) : g2.setMode(yt.LINE_STRIP);
        } else r2.isPoints ? g2.setMode(yt.POINTS) : r2.isSprite && g2.setMode(yt.TRIANGLES);
        if (r2.isBatchedMesh) if (null !== r2._multiDrawInstances) g2.renderMultiDrawInstances(r2._multiDrawStarts, r2._multiDrawCounts, r2._multiDrawCount, r2._multiDrawInstances);
        else if (J.get("WEBGL_multi_draw")) g2.renderMultiDraw(r2._multiDrawStarts, r2._multiDrawCounts, r2._multiDrawCount);
        else {
          const t3 = r2._multiDrawStarts, e4 = r2._multiDrawCounts, n3 = r2._multiDrawCount, s3 = l2 ? rt.get(l2).bytesPerElement : 1, a3 = tt.get(i2).currentProgram.getUniforms();
          for (let i3 = 0; i3 < n3; i3++) a3.setValue(yt, "_gl_DrawID", i3), g2.render(t3[i3] / s3, e4[i3]);
        }
        else if (r2.isInstancedMesh) g2.renderInstances(d3, m2, r2.count);
        else if (n2.isInstancedBufferGeometry) {
          const t3 = void 0 !== n2._maxInstanceCount ? n2._maxInstanceCount : 1 / 0, e4 = Math.min(n2.instanceCount, t3);
          g2.renderInstances(d3, m2, e4);
        } else g2.render(d3, m2);
      }, this.compile = function(t2, e3, n2 = null) {
        null === n2 && (n2 = t2), v = ht2.get(n2), v.init(e3), x.push(v), n2.traverseVisible((function(t3) {
          t3.isLight && t3.layers.test(e3.layers) && (v.pushLight(t3), t3.castShadow && v.pushShadow(t3));
        })), t2 !== n2 && t2.traverseVisible((function(t3) {
          t3.isLight && t3.layers.test(e3.layers) && (v.pushLight(t3), t3.castShadow && v.pushShadow(t3));
        })), v.setupLights();
        const i2 = /* @__PURE__ */ new Set();
        return t2.traverse((function(t3) {
          if (!(t3.isMesh || t3.isPoints || t3.isLine || t3.isSprite)) return;
          const e4 = t3.material;
          if (e4) if (Array.isArray(e4)) for (let r2 = 0; r2 < e4.length; r2++) {
            const s2 = e4[r2];
            Lt2(s2, n2, t3), i2.add(s2);
          }
          else Lt2(e4, n2, t3), i2.add(e4);
        })), x.pop(), v = null, i2;
      }, this.compileAsync = function(t2, e3, n2 = null) {
        const i2 = this.compile(t2, e3, n2);
        return new Promise(((e4) => {
          function n3() {
            i2.forEach((function(t3) {
              tt.get(t3).currentProgram.isReady() && i2.delete(t3);
            })), 0 !== i2.size ? setTimeout(n3, 10) : e4(t2);
          }
          null !== J.get("KHR_parallel_shader_compile") ? n3() : setTimeout(n3, 10);
        }));
      };
      let Ft2 = null;
      function Bt2() {
        kt2.stop();
      }
      function zt2() {
        kt2.start();
      }
      const kt2 = new la();
      function Vt2(t2, e3, n2, i2) {
        if (false === t2.visible) return;
        if (t2.layers.test(e3.layers)) {
          if (t2.isGroup) n2 = t2.renderOrder;
          else if (t2.isLOD) true === t2.autoUpdate && t2.update(e3);
          else if (t2.isLight) v.pushLight(t2), t2.castShadow && v.pushShadow(t2);
          else if (t2.isSprite) {
            if (!t2.frustumCulled || k2.intersectsSprite(t2)) {
              i2 && j2.setFromMatrixPosition(t2.matrixWorld).applyMatrix4(W2);
              const e4 = at.update(t2), r3 = t2.material;
              r3.visible && g.push(t2, e4, r3, n2, j2.z, null);
            }
          } else if ((t2.isMesh || t2.isLine || t2.isPoints) && (!t2.frustumCulled || k2.intersectsObject(t2))) {
            const e4 = at.update(t2), r3 = t2.material;
            if (i2 && (void 0 !== t2.boundingSphere ? (null === t2.boundingSphere && t2.computeBoundingSphere(), j2.copy(t2.boundingSphere.center)) : (null === e4.boundingSphere && e4.computeBoundingSphere(), j2.copy(e4.boundingSphere.center)), j2.applyMatrix4(t2.matrixWorld).applyMatrix4(W2)), Array.isArray(r3)) {
              const i3 = e4.groups;
              for (let s2 = 0, a2 = i3.length; s2 < a2; s2++) {
                const a3 = i3[s2], o2 = r3[a3.materialIndex];
                o2 && o2.visible && g.push(t2, e4, o2, n2, j2.z, a3);
              }
            } else r3.visible && g.push(t2, e4, r3, n2, j2.z, null);
          }
        }
        const r2 = t2.children;
        for (let t3 = 0, s2 = r2.length; t3 < s2; t3++) Vt2(r2[t3], e3, n2, i2);
      }
      function Ht2(t2, e3, n2, i2) {
        const r2 = t2.opaque, s2 = t2.transmissive, a2 = t2.transparent;
        v.setupLightsView(n2), true === V2 && ut2.setGlobalState(y2.clippingPlanes, n2), i2 && $.viewport(A2.copy(i2)), r2.length > 0 && Wt2(r2, e3, n2), s2.length > 0 && Wt2(s2, e3, n2), a2.length > 0 && Wt2(a2, e3, n2), $.buffers.depth.setTest(true), $.buffers.depth.setMask(true), $.buffers.color.setMask(true), $.setPolygonOffset(false);
      }
      function Gt2(t2, e3, n2, i2) {
        if (null !== (true === n2.isScene ? n2.overrideMaterial : null)) return;
        void 0 === v.state.transmissionRenderTarget[i2.id] && (v.state.transmissionRenderTarget[i2.id] = new bi(1, 1, { generateMipmaps: true, type: J.has("EXT_color_buffer_half_float") || J.has("EXT_color_buffer_float") ? Ut : Et, minFilter: Tt, samples: 4, stencilBuffer: s, resolveDepthBuffer: false, resolveStencilBuffer: false, colorSpace: ai.workingColorSpace }));
        const r2 = v.state.transmissionRenderTarget[i2.id], a2 = i2.viewport || A2;
        r2.setSize(a2.z, a2.w);
        const o2 = y2.getRenderTarget();
        y2.setRenderTarget(r2), y2.getClearColor(I2), P2 = y2.getClearAlpha(), P2 < 1 && y2.setClearColor(16777215, 0.5), y2.clear(), Y && pt2.render(n2);
        const l2 = y2.toneMapping;
        y2.toneMapping = 0;
        const c2 = i2.viewport;
        if (void 0 !== i2.viewport && (i2.viewport = void 0), v.setupLightsView(i2), true === V2 && ut2.setGlobalState(y2.clippingPlanes, i2), Wt2(t2, n2, i2), et.updateMultisampleRenderTarget(r2), et.updateRenderTargetMipmap(r2), false === J.has("WEBGL_multisampled_render_to_texture")) {
          let t3 = false;
          for (let r3 = 0, s2 = e3.length; r3 < s2; r3++) {
            const s3 = e3[r3], a3 = s3.object, o3 = s3.geometry, l3 = s3.material, c3 = s3.group;
            if (2 === l3.side && a3.layers.test(i2.layers)) {
              const e4 = l3.side;
              l3.side = 1, l3.needsUpdate = true, Xt2(a3, n2, i2, o3, l3, c3), l3.side = e4, l3.needsUpdate = true, t3 = true;
            }
          }
          true === t3 && (et.updateMultisampleRenderTarget(r2), et.updateRenderTargetMipmap(r2));
        }
        y2.setRenderTarget(o2), y2.setClearColor(I2, P2), void 0 !== c2 && (i2.viewport = c2), y2.toneMapping = l2;
      }
      function Wt2(t2, e3, n2) {
        const i2 = true === e3.isScene ? e3.overrideMaterial : null;
        for (let r2 = 0, s2 = t2.length; r2 < s2; r2++) {
          const s3 = t2[r2], a2 = s3.object, o2 = s3.geometry, l2 = null === i2 ? s3.material : i2, c2 = s3.group;
          a2.layers.test(n2.layers) && Xt2(a2, e3, n2, o2, l2, c2);
        }
      }
      function Xt2(t2, e3, n2, i2, r2, s2) {
        t2.onBeforeRender(y2, e3, n2, i2, r2, s2), t2.modelViewMatrix.multiplyMatrices(n2.matrixWorldInverse, t2.matrixWorld), t2.normalMatrix.getNormalMatrix(t2.modelViewMatrix), r2.onBeforeRender(y2, e3, n2, i2, t2, s2), true === r2.transparent && 2 === r2.side && false === r2.forceSinglePass ? (r2.side = 1, r2.needsUpdate = true, y2.renderBufferDirect(n2, e3, i2, r2, t2, s2), r2.side = 0, r2.needsUpdate = true, y2.renderBufferDirect(n2, e3, i2, r2, t2, s2), r2.side = 2) : y2.renderBufferDirect(n2, e3, i2, r2, t2, s2), t2.onAfterRender(y2, e3, n2, i2, r2, s2);
      }
      function qt2(t2, e3, n2) {
        true !== e3.isScene && (e3 = q2);
        const i2 = tt.get(t2), r2 = v.state.lights, s2 = v.state.shadowsArray, a2 = r2.state.version, o2 = ot2.getParameters(t2, r2.state, s2, e3, n2), l2 = ot2.getProgramCacheKey(o2);
        let c2 = i2.programs;
        i2.environment = t2.isMeshStandardMaterial ? e3.environment : null, i2.fog = e3.fog, i2.envMap = (t2.isMeshStandardMaterial ? it : nt).get(t2.envMap || i2.environment), i2.envMapRotation = null !== i2.environment && null === t2.envMap ? e3.environmentRotation : t2.envMapRotation, void 0 === c2 && (t2.addEventListener("dispose", It2), c2 = /* @__PURE__ */ new Map(), i2.programs = c2);
        let h2 = c2.get(l2);
        if (void 0 !== h2) {
          if (i2.currentProgram === h2 && i2.lightsStateVersion === a2) return Kt2(t2, o2), h2;
        } else o2.uniforms = ot2.getUniforms(t2), t2.onBeforeCompile(o2, y2), h2 = ot2.acquireProgram(o2, l2), c2.set(l2, h2), i2.uniforms = o2.uniforms;
        const u3 = i2.uniforms;
        return (t2.isShaderMaterial || t2.isRawShaderMaterial) && true !== t2.clipping || (u3.clippingPlanes = ut2.uniform), Kt2(t2, o2), i2.needsLights = (function(t3) {
          return t3.isMeshLambertMaterial || t3.isMeshToonMaterial || t3.isMeshPhongMaterial || t3.isMeshStandardMaterial || t3.isShadowMaterial || t3.isShaderMaterial && true === t3.lights;
        })(t2), i2.lightsStateVersion = a2, i2.needsLights && (u3.ambientLightColor.value = r2.state.ambient, u3.lightProbe.value = r2.state.probe, u3.directionalLights.value = r2.state.directional, u3.directionalLightShadows.value = r2.state.directionalShadow, u3.spotLights.value = r2.state.spot, u3.spotLightShadows.value = r2.state.spotShadow, u3.rectAreaLights.value = r2.state.rectArea, u3.ltc_1.value = r2.state.rectAreaLTC1, u3.ltc_2.value = r2.state.rectAreaLTC2, u3.pointLights.value = r2.state.point, u3.pointLightShadows.value = r2.state.pointShadow, u3.hemisphereLights.value = r2.state.hemi, u3.directionalShadowMap.value = r2.state.directionalShadowMap, u3.directionalShadowMatrix.value = r2.state.directionalShadowMatrix, u3.spotShadowMap.value = r2.state.spotShadowMap, u3.spotLightMatrix.value = r2.state.spotLightMatrix, u3.spotLightMap.value = r2.state.spotLightMap, u3.pointShadowMap.value = r2.state.pointShadowMap, u3.pointShadowMatrix.value = r2.state.pointShadowMatrix), i2.currentProgram = h2, i2.uniformsList = null, h2;
      }
      function Zt(t2) {
        if (null === t2.uniformsList) {
          const e3 = t2.currentProgram.getUniforms();
          t2.uniformsList = tl.seqWithValue(e3.seq, t2.uniforms);
        }
        return t2.uniformsList;
      }
      function Kt2(t2, e3) {
        const n2 = tt.get(t2);
        n2.outputColorSpace = e3.outputColorSpace, n2.batching = e3.batching, n2.batchingColor = e3.batchingColor, n2.instancing = e3.instancing, n2.instancingColor = e3.instancingColor, n2.instancingMorph = e3.instancingMorph, n2.skinning = e3.skinning, n2.morphTargets = e3.morphTargets, n2.morphNormals = e3.morphNormals, n2.morphColors = e3.morphColors, n2.morphTargetsCount = e3.morphTargetsCount, n2.numClippingPlanes = e3.numClippingPlanes, n2.numIntersection = e3.numClipIntersection, n2.vertexAlphas = e3.vertexAlphas, n2.vertexTangents = e3.vertexTangents, n2.toneMapping = e3.toneMapping;
      }
      kt2.setAnimationLoop((function(t2) {
        Ft2 && Ft2(t2);
      })), "undefined" != typeof self && kt2.setContext(self), this.setAnimationLoop = function(t2) {
        Ft2 = t2, bt.setAnimationLoop(t2), null === t2 ? kt2.stop() : kt2.start();
      }, bt.addEventListener("sessionstart", Bt2), bt.addEventListener("sessionend", zt2), this.render = function(t2, e3) {
        if (void 0 !== e3 && true !== e3.isCamera) return void console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");
        if (true === M2) return;
        if (true === t2.matrixWorldAutoUpdate && t2.updateMatrixWorld(), null === e3.parent && true === e3.matrixWorldAutoUpdate && e3.updateMatrixWorld(), true === bt.enabled && true === bt.isPresenting && (true === bt.cameraAutoUpdate && bt.updateCamera(e3), e3 = bt.getCamera()), true === t2.isScene && t2.onBeforeRender(y2, t2, e3, T), v = ht2.get(t2, x.length), v.init(e3), x.push(v), W2.multiplyMatrices(e3.projectionMatrix, e3.matrixWorldInverse), k2.setFromProjectionMatrix(W2), H2 = this.localClippingEnabled, V2 = ut2.init(this.clippingPlanes, H2), g = ct2.get(t2, _.length), g.init(), _.push(g), true === bt.enabled && true === bt.isPresenting) {
          const t3 = y2.xr.getDepthSensingMesh();
          null !== t3 && Vt2(t3, e3, -1 / 0, y2.sortObjects);
        }
        Vt2(t2, e3, 0, y2.sortObjects), g.finish(), true === y2.sortObjects && g.sort(N2, O2), Y = false === bt.enabled || false === bt.isPresenting || false === bt.hasDepthSensing(), Y && pt2.addToRenderList(g, t2), this.info.render.frame++, true === V2 && ut2.beginShadows();
        const n2 = v.state.shadowsArray;
        dt2.render(n2, t2, e3), true === V2 && ut2.endShadows(), true === this.info.autoReset && this.info.reset();
        const i2 = g.opaque, r2 = g.transmissive;
        if (v.setupLights(), e3.isArrayCamera) {
          const n3 = e3.cameras;
          if (r2.length > 0) for (let e4 = 0, s2 = n3.length; e4 < s2; e4++) {
            Gt2(i2, r2, t2, n3[e4]);
          }
          Y && pt2.render(t2);
          for (let e4 = 0, i3 = n3.length; e4 < i3; e4++) {
            const i4 = n3[e4];
            Ht2(g, t2, i4, i4.viewport);
          }
        } else r2.length > 0 && Gt2(i2, r2, t2, e3), Y && pt2.render(t2), Ht2(g, t2, e3);
        null !== T && (et.updateMultisampleRenderTarget(T), et.updateRenderTargetMipmap(T)), true === t2.isScene && t2.onAfterRender(y2, t2, e3), _t.resetDefaultState(), w2 = -1, E2 = null, x.pop(), x.length > 0 ? (v = x[x.length - 1], true === V2 && ut2.setGlobalState(y2.clippingPlanes, v.state.camera)) : v = null, _.pop(), g = _.length > 0 ? _[_.length - 1] : null;
      }, this.getActiveCubeFace = function() {
        return S2;
      }, this.getActiveMipmapLevel = function() {
        return b;
      }, this.getRenderTarget = function() {
        return T;
      }, this.setRenderTargetTextures = function(t2, e3, n2) {
        tt.get(t2.texture).__webglTexture = e3, tt.get(t2.depthTexture).__webglTexture = n2;
        const i2 = tt.get(t2);
        i2.__hasExternalTextures = true, i2.__autoAllocateDepthBuffer = void 0 === n2, i2.__autoAllocateDepthBuffer || true === J.has("WEBGL_multisampled_render_to_texture") && (console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"), i2.__useRenderToTexture = false);
      }, this.setRenderTargetFramebuffer = function(t2, e3) {
        const n2 = tt.get(t2);
        n2.__webglFramebuffer = e3, n2.__useDefaultFramebuffer = void 0 === e3;
      }, this.setRenderTarget = function(t2, e3 = 0, n2 = 0) {
        T = t2, S2 = e3, b = n2;
        let i2 = true, r2 = null, s2 = false, a2 = false;
        if (t2) {
          const o2 = tt.get(t2);
          if (void 0 !== o2.__useDefaultFramebuffer) $.bindFramebuffer(yt.FRAMEBUFFER, null), i2 = false;
          else if (void 0 === o2.__webglFramebuffer) et.setupRenderTarget(t2);
          else if (o2.__hasExternalTextures) et.rebindTextures(t2, tt.get(t2.texture).__webglTexture, tt.get(t2.depthTexture).__webglTexture);
          else if (t2.depthBuffer) {
            const e4 = t2.depthTexture;
            if (o2.__boundDepthTexture !== e4) {
              if (null !== e4 && tt.has(e4) && (t2.width !== e4.image.width || t2.height !== e4.image.height)) throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");
              et.setupDepthRenderbuffer(t2);
            }
          }
          const l2 = t2.texture;
          (l2.isData3DTexture || l2.isDataArrayTexture || l2.isCompressedArrayTexture) && (a2 = true);
          const c2 = tt.get(t2).__webglFramebuffer;
          t2.isWebGLCubeRenderTarget ? (r2 = Array.isArray(c2[e3]) ? c2[e3][n2] : c2[e3], s2 = true) : r2 = t2.samples > 0 && false === et.useMultisampledRTT(t2) ? tt.get(t2).__webglMultisampledFramebuffer : Array.isArray(c2) ? c2[n2] : c2, A2.copy(t2.viewport), R2.copy(t2.scissor), C2 = t2.scissorTest;
        } else A2.copy(F2).multiplyScalar(D2).floor(), R2.copy(B2).multiplyScalar(D2).floor(), C2 = z2;
        if ($.bindFramebuffer(yt.FRAMEBUFFER, r2) && i2 && $.drawBuffers(t2, r2), $.viewport(A2), $.scissor(R2), $.setScissorTest(C2), s2) {
          const i3 = tt.get(t2.texture);
          yt.framebufferTexture2D(yt.FRAMEBUFFER, yt.COLOR_ATTACHMENT0, yt.TEXTURE_CUBE_MAP_POSITIVE_X + e3, i3.__webglTexture, n2);
        } else if (a2) {
          const i3 = tt.get(t2.texture), r3 = e3 || 0;
          yt.framebufferTextureLayer(yt.FRAMEBUFFER, yt.COLOR_ATTACHMENT0, i3.__webglTexture, n2 || 0, r3);
        }
        w2 = -1;
      }, this.readRenderTargetPixels = function(t2, e3, n2, i2, r2, s2, a2) {
        if (!t2 || !t2.isWebGLRenderTarget) return void console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
        let o2 = tt.get(t2).__webglFramebuffer;
        if (t2.isWebGLCubeRenderTarget && void 0 !== a2 && (o2 = o2[a2]), o2) {
          $.bindFramebuffer(yt.FRAMEBUFFER, o2);
          try {
            const a3 = t2.texture, o3 = a3.format, l2 = a3.type;
            if (!K.textureFormatReadable(o3)) return void console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
            if (!K.textureTypeReadable(l2)) return void console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
            e3 >= 0 && e3 <= t2.width - i2 && n2 >= 0 && n2 <= t2.height - r2 && yt.readPixels(e3, n2, i2, r2, vt2.convert(o3), vt2.convert(l2), s2);
          } finally {
            const t3 = null !== T ? tt.get(T).__webglFramebuffer : null;
            $.bindFramebuffer(yt.FRAMEBUFFER, t3);
          }
        }
      }, this.readRenderTargetPixelsAsync = async function(t2, e3, n2, i2, r2, s2, a2) {
        if (!t2 || !t2.isWebGLRenderTarget) throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
        let o2 = tt.get(t2).__webglFramebuffer;
        if (t2.isWebGLCubeRenderTarget && void 0 !== a2 && (o2 = o2[a2]), o2) {
          const a3 = t2.texture, l2 = a3.format, c2 = a3.type;
          if (!K.textureFormatReadable(l2)) throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
          if (!K.textureTypeReadable(c2)) throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
          if (e3 >= 0 && e3 <= t2.width - i2 && n2 >= 0 && n2 <= t2.height - r2) {
            $.bindFramebuffer(yt.FRAMEBUFFER, o2);
            const t3 = yt.createBuffer();
            yt.bindBuffer(yt.PIXEL_PACK_BUFFER, t3), yt.bufferData(yt.PIXEL_PACK_BUFFER, s2.byteLength, yt.STREAM_READ), yt.readPixels(e3, n2, i2, r2, vt2.convert(l2), vt2.convert(c2), 0);
            const a4 = null !== T ? tt.get(T).__webglFramebuffer : null;
            $.bindFramebuffer(yt.FRAMEBUFFER, a4);
            const h2 = yt.fenceSync(yt.SYNC_GPU_COMMANDS_COMPLETE, 0);
            return yt.flush(), await (function(t4, e4, n3) {
              return new Promise((function(i3, r3) {
                setTimeout((function s3() {
                  switch (t4.clientWaitSync(e4, t4.SYNC_FLUSH_COMMANDS_BIT, 0)) {
                    case t4.WAIT_FAILED:
                      r3();
                      break;
                    case t4.TIMEOUT_EXPIRED:
                      setTimeout(s3, n3);
                      break;
                    default:
                      i3();
                  }
                }), n3);
              }));
            })(yt, h2, 4), yt.bindBuffer(yt.PIXEL_PACK_BUFFER, t3), yt.getBufferSubData(yt.PIXEL_PACK_BUFFER, 0, s2), yt.deleteBuffer(t3), yt.deleteSync(h2), s2;
          }
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
        }
      }, this.copyFramebufferToTexture = function(t2, e3 = null, n2 = 0) {
        true !== t2.isTexture && (si("WebGLRenderer: copyFramebufferToTexture function signature has changed."), e3 = arguments[0] || null, t2 = arguments[1]);
        const i2 = Math.pow(2, -n2), r2 = Math.floor(t2.image.width * i2), s2 = Math.floor(t2.image.height * i2), a2 = null !== e3 ? e3.x : 0, o2 = null !== e3 ? e3.y : 0;
        et.setTexture2D(t2, 0), yt.copyTexSubImage2D(yt.TEXTURE_2D, n2, 0, 0, a2, o2, r2, s2), $.unbindTexture();
      }, this.copyTextureToTexture = function(t2, e3, n2 = null, i2 = null, r2 = 0) {
        let s2, a2, o2, l2, c2, h2, u3, d3, p3;
        true !== t2.isTexture && (si("WebGLRenderer: copyTextureToTexture function signature has changed."), i2 = arguments[0] || null, t2 = arguments[1], e3 = arguments[2], r2 = arguments[3] || 0, n2 = null);
        const m2 = t2.isCompressedTexture ? t2.mipmaps[r2] : t2.image;
        null !== n2 ? (s2 = n2.max.x - n2.min.x, a2 = n2.max.y - n2.min.y, o2 = n2.isBox3 ? n2.max.z - n2.min.z : 1, l2 = n2.min.x, c2 = n2.min.y, h2 = n2.isBox3 ? n2.min.z : 0) : (s2 = m2.width, a2 = m2.height, o2 = m2.depth || 1, l2 = 0, c2 = 0, h2 = 0), null !== i2 ? (u3 = i2.x, d3 = i2.y, p3 = i2.z) : (u3 = 0, d3 = 0, p3 = 0);
        const f2 = vt2.convert(e3.format), g2 = vt2.convert(e3.type);
        let v2;
        e3.isData3DTexture ? (et.setTexture3D(e3, 0), v2 = yt.TEXTURE_3D) : e3.isDataArrayTexture || e3.isCompressedArrayTexture ? (et.setTexture2DArray(e3, 0), v2 = yt.TEXTURE_2D_ARRAY) : (et.setTexture2D(e3, 0), v2 = yt.TEXTURE_2D), yt.pixelStorei(yt.UNPACK_FLIP_Y_WEBGL, e3.flipY), yt.pixelStorei(yt.UNPACK_PREMULTIPLY_ALPHA_WEBGL, e3.premultiplyAlpha), yt.pixelStorei(yt.UNPACK_ALIGNMENT, e3.unpackAlignment);
        const _2 = yt.getParameter(yt.UNPACK_ROW_LENGTH), x2 = yt.getParameter(yt.UNPACK_IMAGE_HEIGHT), y3 = yt.getParameter(yt.UNPACK_SKIP_PIXELS), M3 = yt.getParameter(yt.UNPACK_SKIP_ROWS), S3 = yt.getParameter(yt.UNPACK_SKIP_IMAGES);
        yt.pixelStorei(yt.UNPACK_ROW_LENGTH, m2.width), yt.pixelStorei(yt.UNPACK_IMAGE_HEIGHT, m2.height), yt.pixelStorei(yt.UNPACK_SKIP_PIXELS, l2), yt.pixelStorei(yt.UNPACK_SKIP_ROWS, c2), yt.pixelStorei(yt.UNPACK_SKIP_IMAGES, h2);
        const b2 = t2.isDataArrayTexture || t2.isData3DTexture, T2 = e3.isDataArrayTexture || e3.isData3DTexture;
        if (t2.isRenderTargetTexture || t2.isDepthTexture) {
          const n3 = tt.get(t2), i3 = tt.get(e3), m3 = tt.get(n3.__renderTarget), f3 = tt.get(i3.__renderTarget);
          $.bindFramebuffer(yt.READ_FRAMEBUFFER, m3.__webglFramebuffer), $.bindFramebuffer(yt.DRAW_FRAMEBUFFER, f3.__webglFramebuffer);
          for (let n4 = 0; n4 < o2; n4++) b2 && yt.framebufferTextureLayer(yt.READ_FRAMEBUFFER, yt.COLOR_ATTACHMENT0, tt.get(t2).__webglTexture, r2, h2 + n4), t2.isDepthTexture ? (T2 && yt.framebufferTextureLayer(yt.DRAW_FRAMEBUFFER, yt.COLOR_ATTACHMENT0, tt.get(e3).__webglTexture, r2, p3 + n4), yt.blitFramebuffer(l2, c2, s2, a2, u3, d3, s2, a2, yt.DEPTH_BUFFER_BIT, yt.NEAREST)) : T2 ? yt.copyTexSubImage3D(v2, r2, u3, d3, p3 + n4, l2, c2, s2, a2) : yt.copyTexSubImage2D(v2, r2, u3, d3, p3 + n4, l2, c2, s2, a2);
          $.bindFramebuffer(yt.READ_FRAMEBUFFER, null), $.bindFramebuffer(yt.DRAW_FRAMEBUFFER, null);
        } else T2 ? t2.isDataTexture || t2.isData3DTexture ? yt.texSubImage3D(v2, r2, u3, d3, p3, s2, a2, o2, f2, g2, m2.data) : e3.isCompressedArrayTexture ? yt.compressedTexSubImage3D(v2, r2, u3, d3, p3, s2, a2, o2, f2, m2.data) : yt.texSubImage3D(v2, r2, u3, d3, p3, s2, a2, o2, f2, g2, m2) : t2.isDataTexture ? yt.texSubImage2D(yt.TEXTURE_2D, r2, u3, d3, s2, a2, f2, g2, m2.data) : t2.isCompressedTexture ? yt.compressedTexSubImage2D(yt.TEXTURE_2D, r2, u3, d3, m2.width, m2.height, f2, m2.data) : yt.texSubImage2D(yt.TEXTURE_2D, r2, u3, d3, s2, a2, f2, g2, m2);
        yt.pixelStorei(yt.UNPACK_ROW_LENGTH, _2), yt.pixelStorei(yt.UNPACK_IMAGE_HEIGHT, x2), yt.pixelStorei(yt.UNPACK_SKIP_PIXELS, y3), yt.pixelStorei(yt.UNPACK_SKIP_ROWS, M3), yt.pixelStorei(yt.UNPACK_SKIP_IMAGES, S3), 0 === r2 && e3.generateMipmaps && yt.generateMipmap(v2), $.unbindTexture();
      }, this.copyTextureToTexture3D = function(t2, e3, n2 = null, i2 = null, r2 = 0) {
        return true !== t2.isTexture && (si("WebGLRenderer: copyTextureToTexture3D function signature has changed."), n2 = arguments[0] || null, i2 = arguments[1] || null, t2 = arguments[2], e3 = arguments[3], r2 = arguments[4] || 0), si('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'), this.copyTextureToTexture(t2, e3, n2, i2, r2);
      }, this.initRenderTarget = function(t2) {
        void 0 === tt.get(t2).__webglFramebuffer && et.setupRenderTarget(t2);
      }, this.initTexture = function(t2) {
        t2.isCubeTexture ? et.setTextureCube(t2, 0) : t2.isData3DTexture ? et.setTexture3D(t2, 0) : t2.isDataArrayTexture || t2.isCompressedArrayTexture ? et.setTexture2DArray(t2, 0) : et.setTexture2D(t2, 0), $.unbindTexture();
      }, this.resetState = function() {
        S2 = 0, b = 0, T = null, $.reset(), _t.reset();
      }, "undefined" != typeof __THREE_DEVTOOLS__ && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
    }
    get coordinateSystem() {
      return On;
    }
    get outputColorSpace() {
      return this._outputColorSpace;
    }
    set outputColorSpace(t2) {
      this._outputColorSpace = t2;
      const e2 = this.getContext();
      e2.drawingBufferColorspace = ai._getDrawingBufferColorSpace(t2), e2.unpackColorSpace = ai._getUnpackColorSpace();
    }
  };
  var rc = class extends Lr {
    constructor() {
      super(), this.isScene = true, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new fr(), this.environmentIntensity = 1, this.environmentRotation = new fr(), this.overrideMaterial = null, "undefined" != typeof __THREE_DEVTOOLS__ && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
    }
    copy(t2, e2) {
      return super.copy(t2, e2), null !== t2.background && (this.background = t2.background.clone()), null !== t2.environment && (this.environment = t2.environment.clone()), null !== t2.fog && (this.fog = t2.fog.clone()), this.backgroundBlurriness = t2.backgroundBlurriness, this.backgroundIntensity = t2.backgroundIntensity, this.backgroundRotation.copy(t2.backgroundRotation), this.environmentIntensity = t2.environmentIntensity, this.environmentRotation.copy(t2.environmentRotation), null !== t2.overrideMaterial && (this.overrideMaterial = t2.overrideMaterial.clone()), this.matrixAutoUpdate = t2.matrixAutoUpdate, this;
    }
    toJSON(t2) {
      const e2 = super.toJSON(t2);
      return null !== this.fog && (e2.object.fog = this.fog.toJSON()), this.backgroundBlurriness > 0 && (e2.object.backgroundBlurriness = this.backgroundBlurriness), 1 !== this.backgroundIntensity && (e2.object.backgroundIntensity = this.backgroundIntensity), e2.object.backgroundRotation = this.backgroundRotation.toArray(), 1 !== this.environmentIntensity && (e2.object.environmentIntensity = this.environmentIntensity), e2.object.environmentRotation = this.environmentRotation.toArray(), e2;
    }
  };
  var ac = new Ci();
  var hc = new Ci();
  var uc = new Ci();
  var dc = new Ci();
  var pc = new Jn();
  var mc = new Jn();
  var fc = new sr();
  var gc = new Ci();
  var vc = new Ci();
  var _c = new Ci();
  var xc = new Jn();
  var yc = new Jn();
  var Mc = new Jn();
  var Tc = new Ci();
  var wc = new Ci();
  var Ac = new Ci();
  var Rc = new Mi();
  var Cc = new Mi();
  var Ic = new Ci();
  var Pc = new sr();
  var Lc = new Ci();
  var Uc = new Ji();
  var Dc = new sr();
  var Nc = new rr();
  var Bc = class extends yi {
    constructor(t2 = null, e2 = 1, n = 1, i, r, s, a, o, l = 1003, c = 1003, h, u2) {
      super(null, s, a, o, l, c, i, r, h, u2), this.isDataTexture = true, this.image = { data: t2, width: e2, height: n }, this.generateMipmaps = false, this.flipY = false, this.unpackAlignment = 1;
    }
  };
  var zc = new sr();
  var kc = new sr();
  var Gc = new sr();
  var Wc = new sr();
  var jc = new Li();
  var qc = new sr();
  var Yc = new Bs();
  var Zc = new Ji();
  var th = class {
    constructor() {
      this.index = 0, this.pool = [], this.list = [];
    }
    push(t2, e2, n, i) {
      const r = this.pool, s = this.list;
      this.index >= r.length && r.push({ start: -1, count: -1, z: -1, index: -1 });
      const a = r[this.index];
      s.push(a), this.index++, a.start = t2, a.count = e2, a.z = n, a.index = i;
    }
    reset() {
      this.list.length = 0, this.index = 0;
    }
  };
  var eh = new sr();
  var nh = new Kr(1, 1, 1);
  var ih = new oa();
  var rh = new Li();
  var sh = new Ji();
  var ah = new Ci();
  var oh = new Ci();
  var lh = new Ci();
  var ch = new th();
  var hh = new Bs();
  var gh = new Ci();
  var vh = new Ci();
  var _h = new sr();
  var xh = new rr();
  var yh = new Ji();
  var Mh = new Ci();
  var Sh = new Ci();
  var wh = new Ci();
  var Eh = new Ci();
  var Ih = new sr();
  var Ph = new rr();
  var Lh = new Ji();
  var Uh = new Ci();
  var Vh = class extends yi {
    constructor(t2, e2, n, i, r, s, a, o, l) {
      super(t2, e2, n, i, r, s, a, o, l), this.isCanvasTexture = true, this.needsUpdate = true;
    }
  };
  var Hh = class {
    constructor() {
      this.type = "Curve", this.arcLengthDivisions = 200;
    }
    getPoint() {
      return console.warn("THREE.Curve: .getPoint() not implemented."), null;
    }
    getPointAt(t2, e2) {
      const n = this.getUtoTmapping(t2);
      return this.getPoint(n, e2);
    }
    getPoints(t2 = 5) {
      const e2 = [];
      for (let n = 0; n <= t2; n++) e2.push(this.getPoint(n / t2));
      return e2;
    }
    getSpacedPoints(t2 = 5) {
      const e2 = [];
      for (let n = 0; n <= t2; n++) e2.push(this.getPointAt(n / t2));
      return e2;
    }
    getLength() {
      const t2 = this.getLengths();
      return t2[t2.length - 1];
    }
    getLengths(t2 = this.arcLengthDivisions) {
      if (this.cacheArcLengths && this.cacheArcLengths.length === t2 + 1 && !this.needsUpdate) return this.cacheArcLengths;
      this.needsUpdate = false;
      const e2 = [];
      let n, i = this.getPoint(0), r = 0;
      e2.push(0);
      for (let s = 1; s <= t2; s++) n = this.getPoint(s / t2), r += n.distanceTo(i), e2.push(r), i = n;
      return this.cacheArcLengths = e2, e2;
    }
    updateArcLengths() {
      this.needsUpdate = true, this.getLengths();
    }
    getUtoTmapping(t2, e2) {
      const n = this.getLengths();
      let i = 0;
      const r = n.length;
      let s;
      s = e2 || t2 * n[r - 1];
      let a, o = 0, l = r - 1;
      for (; o <= l; ) if (i = Math.floor(o + (l - o) / 2), a = n[i] - s, a < 0) o = i + 1;
      else {
        if (!(a > 0)) {
          l = i;
          break;
        }
        l = i - 1;
      }
      if (i = l, n[i] === s) return i / (r - 1);
      const c = n[i];
      return (i + (s - c) / (n[i + 1] - c)) / (r - 1);
    }
    getTangent(t2, e2) {
      const n = 1e-4;
      let i = t2 - n, r = t2 + n;
      i < 0 && (i = 0), r > 1 && (r = 1);
      const s = this.getPoint(i), a = this.getPoint(r), o = e2 || (s.isVector2 ? new Jn() : new Ci());
      return o.copy(a).sub(s).normalize(), o;
    }
    getTangentAt(t2, e2) {
      const n = this.getUtoTmapping(t2);
      return this.getTangent(n, e2);
    }
    computeFrenetFrames(t2, e2) {
      const n = new Ci(), i = [], r = [], s = [], a = new Ci(), o = new sr();
      for (let e3 = 0; e3 <= t2; e3++) {
        const n2 = e3 / t2;
        i[e3] = this.getTangentAt(n2, new Ci());
      }
      r[0] = new Ci(), s[0] = new Ci();
      let l = Number.MAX_VALUE;
      const c = Math.abs(i[0].x), h = Math.abs(i[0].y), u2 = Math.abs(i[0].z);
      c <= l && (l = c, n.set(1, 0, 0)), h <= l && (l = h, n.set(0, 1, 0)), u2 <= l && n.set(0, 0, 1), a.crossVectors(i[0], n).normalize(), r[0].crossVectors(i[0], a), s[0].crossVectors(i[0], r[0]);
      for (let e3 = 1; e3 <= t2; e3++) {
        if (r[e3] = r[e3 - 1].clone(), s[e3] = s[e3 - 1].clone(), a.crossVectors(i[e3 - 1], i[e3]), a.length() > Number.EPSILON) {
          a.normalize();
          const t3 = Math.acos(Wn(i[e3 - 1].dot(i[e3]), -1, 1));
          r[e3].applyMatrix4(o.makeRotationAxis(a, t3));
        }
        s[e3].crossVectors(i[e3], r[e3]);
      }
      if (true === e2) {
        let e3 = Math.acos(Wn(r[0].dot(r[t2]), -1, 1));
        e3 /= t2, i[0].dot(a.crossVectors(r[0], r[t2])) > 0 && (e3 = -e3);
        for (let n2 = 1; n2 <= t2; n2++) r[n2].applyMatrix4(o.makeRotationAxis(i[n2], e3 * n2)), s[n2].crossVectors(i[n2], r[n2]);
      }
      return { tangents: i, normals: r, binormals: s };
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t2) {
      return this.arcLengthDivisions = t2.arcLengthDivisions, this;
    }
    toJSON() {
      const t2 = { metadata: { version: 4.6, type: "Curve", generator: "Curve.toJSON" } };
      return t2.arcLengthDivisions = this.arcLengthDivisions, t2.type = this.type, t2;
    }
    fromJSON(t2) {
      return this.arcLengthDivisions = t2.arcLengthDivisions, this;
    }
  };
  var Gh = class extends Hh {
    constructor(t2 = 0, e2 = 0, n = 1, i = 1, r = 0, s = 2 * Math.PI, a = false, o = 0) {
      super(), this.isEllipseCurve = true, this.type = "EllipseCurve", this.aX = t2, this.aY = e2, this.xRadius = n, this.yRadius = i, this.aStartAngle = r, this.aEndAngle = s, this.aClockwise = a, this.aRotation = o;
    }
    getPoint(t2, e2 = new Jn()) {
      const n = e2, i = 2 * Math.PI;
      let r = this.aEndAngle - this.aStartAngle;
      const s = Math.abs(r) < Number.EPSILON;
      for (; r < 0; ) r += i;
      for (; r > i; ) r -= i;
      r < Number.EPSILON && (r = s ? 0 : i), true !== this.aClockwise || s || (r === i ? r = -i : r -= i);
      const a = this.aStartAngle + t2 * r;
      let o = this.aX + this.xRadius * Math.cos(a), l = this.aY + this.yRadius * Math.sin(a);
      if (0 !== this.aRotation) {
        const t3 = Math.cos(this.aRotation), e3 = Math.sin(this.aRotation), n2 = o - this.aX, i2 = l - this.aY;
        o = n2 * t3 - i2 * e3 + this.aX, l = n2 * e3 + i2 * t3 + this.aY;
      }
      return n.set(o, l);
    }
    copy(t2) {
      return super.copy(t2), this.aX = t2.aX, this.aY = t2.aY, this.xRadius = t2.xRadius, this.yRadius = t2.yRadius, this.aStartAngle = t2.aStartAngle, this.aEndAngle = t2.aEndAngle, this.aClockwise = t2.aClockwise, this.aRotation = t2.aRotation, this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.aX = this.aX, t2.aY = this.aY, t2.xRadius = this.xRadius, t2.yRadius = this.yRadius, t2.aStartAngle = this.aStartAngle, t2.aEndAngle = this.aEndAngle, t2.aClockwise = this.aClockwise, t2.aRotation = this.aRotation, t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.aX = t2.aX, this.aY = t2.aY, this.xRadius = t2.xRadius, this.yRadius = t2.yRadius, this.aStartAngle = t2.aStartAngle, this.aEndAngle = t2.aEndAngle, this.aClockwise = t2.aClockwise, this.aRotation = t2.aRotation, this;
    }
  };
  var Wh = class extends Gh {
    constructor(t2, e2, n, i, r, s) {
      super(t2, e2, n, n, i, r, s), this.isArcCurve = true, this.type = "ArcCurve";
    }
  };
  function Xh() {
    let t2 = 0, e2 = 0, n = 0, i = 0;
    function r(r2, s, a, o) {
      t2 = r2, e2 = a, n = -3 * r2 + 3 * s - 2 * a - o, i = 2 * r2 - 2 * s + a + o;
    }
    return { initCatmullRom: function(t3, e3, n2, i2, s) {
      r(e3, n2, s * (n2 - t3), s * (i2 - e3));
    }, initNonuniformCatmullRom: function(t3, e3, n2, i2, s, a, o) {
      let l = (e3 - t3) / s - (n2 - t3) / (s + a) + (n2 - e3) / a, c = (n2 - e3) / a - (i2 - e3) / (a + o) + (i2 - n2) / o;
      l *= a, c *= a, r(e3, n2, l, c);
    }, calc: function(r2) {
      const s = r2 * r2;
      return t2 + e2 * r2 + n * s + i * (s * r2);
    } };
  }
  var jh = new Ci();
  var qh = new Xh();
  var Yh = new Xh();
  var Zh = new Xh();
  var Jh = class extends Hh {
    constructor(t2 = [], e2 = false, n = "centripetal", i = 0.5) {
      super(), this.isCatmullRomCurve3 = true, this.type = "CatmullRomCurve3", this.points = t2, this.closed = e2, this.curveType = n, this.tension = i;
    }
    getPoint(t2, e2 = new Ci()) {
      const n = e2, i = this.points, r = i.length, s = (r - (this.closed ? 0 : 1)) * t2;
      let a, o, l = Math.floor(s), c = s - l;
      this.closed ? l += l > 0 ? 0 : (Math.floor(Math.abs(l) / r) + 1) * r : 0 === c && l === r - 1 && (l = r - 2, c = 1), this.closed || l > 0 ? a = i[(l - 1) % r] : (jh.subVectors(i[0], i[1]).add(i[0]), a = jh);
      const h = i[l % r], u2 = i[(l + 1) % r];
      if (this.closed || l + 2 < r ? o = i[(l + 2) % r] : (jh.subVectors(i[r - 1], i[r - 2]).add(i[r - 1]), o = jh), "centripetal" === this.curveType || "chordal" === this.curveType) {
        const t3 = "chordal" === this.curveType ? 0.5 : 0.25;
        let e3 = Math.pow(a.distanceToSquared(h), t3), n2 = Math.pow(h.distanceToSquared(u2), t3), i2 = Math.pow(u2.distanceToSquared(o), t3);
        n2 < 1e-4 && (n2 = 1), e3 < 1e-4 && (e3 = n2), i2 < 1e-4 && (i2 = n2), qh.initNonuniformCatmullRom(a.x, h.x, u2.x, o.x, e3, n2, i2), Yh.initNonuniformCatmullRom(a.y, h.y, u2.y, o.y, e3, n2, i2), Zh.initNonuniformCatmullRom(a.z, h.z, u2.z, o.z, e3, n2, i2);
      } else "catmullrom" === this.curveType && (qh.initCatmullRom(a.x, h.x, u2.x, o.x, this.tension), Yh.initCatmullRom(a.y, h.y, u2.y, o.y, this.tension), Zh.initCatmullRom(a.z, h.z, u2.z, o.z, this.tension));
      return n.set(qh.calc(c), Yh.calc(c), Zh.calc(c)), n;
    }
    copy(t2) {
      super.copy(t2), this.points = [];
      for (let e2 = 0, n = t2.points.length; e2 < n; e2++) {
        const n2 = t2.points[e2];
        this.points.push(n2.clone());
      }
      return this.closed = t2.closed, this.curveType = t2.curveType, this.tension = t2.tension, this;
    }
    toJSON() {
      const t2 = super.toJSON();
      t2.points = [];
      for (let e2 = 0, n = this.points.length; e2 < n; e2++) {
        const n2 = this.points[e2];
        t2.points.push(n2.toArray());
      }
      return t2.closed = this.closed, t2.curveType = this.curveType, t2.tension = this.tension, t2;
    }
    fromJSON(t2) {
      super.fromJSON(t2), this.points = [];
      for (let e2 = 0, n = t2.points.length; e2 < n; e2++) {
        const n2 = t2.points[e2];
        this.points.push(new Ci().fromArray(n2));
      }
      return this.closed = t2.closed, this.curveType = t2.curveType, this.tension = t2.tension, this;
    }
  };
  function Kh(t2, e2, n, i, r) {
    const s = 0.5 * (i - e2), a = 0.5 * (r - n), o = t2 * t2;
    return (2 * n - 2 * i + s + a) * (t2 * o) + (-3 * n + 3 * i - 2 * s - a) * o + s * t2 + n;
  }
  function $h(t2, e2, n, i) {
    return (function(t3, e3) {
      const n2 = 1 - t3;
      return n2 * n2 * e3;
    })(t2, e2) + (function(t3, e3) {
      return 2 * (1 - t3) * t3 * e3;
    })(t2, n) + (function(t3, e3) {
      return t3 * t3 * e3;
    })(t2, i);
  }
  function Qh(t2, e2, n, i, r) {
    return (function(t3, e3) {
      const n2 = 1 - t3;
      return n2 * n2 * n2 * e3;
    })(t2, e2) + (function(t3, e3) {
      const n2 = 1 - t3;
      return 3 * n2 * n2 * t3 * e3;
    })(t2, n) + (function(t3, e3) {
      return 3 * (1 - t3) * t3 * t3 * e3;
    })(t2, i) + (function(t3, e3) {
      return t3 * t3 * t3 * e3;
    })(t2, r);
  }
  var tu = class extends Hh {
    constructor(t2 = new Jn(), e2 = new Jn(), n = new Jn(), i = new Jn()) {
      super(), this.isCubicBezierCurve = true, this.type = "CubicBezierCurve", this.v0 = t2, this.v1 = e2, this.v2 = n, this.v3 = i;
    }
    getPoint(t2, e2 = new Jn()) {
      const n = e2, i = this.v0, r = this.v1, s = this.v2, a = this.v3;
      return n.set(Qh(t2, i.x, r.x, s.x, a.x), Qh(t2, i.y, r.y, s.y, a.y)), n;
    }
    copy(t2) {
      return super.copy(t2), this.v0.copy(t2.v0), this.v1.copy(t2.v1), this.v2.copy(t2.v2), this.v3.copy(t2.v3), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.v0 = this.v0.toArray(), t2.v1 = this.v1.toArray(), t2.v2 = this.v2.toArray(), t2.v3 = this.v3.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.v0.fromArray(t2.v0), this.v1.fromArray(t2.v1), this.v2.fromArray(t2.v2), this.v3.fromArray(t2.v3), this;
    }
  };
  var eu = class extends Hh {
    constructor(t2 = new Ci(), e2 = new Ci(), n = new Ci(), i = new Ci()) {
      super(), this.isCubicBezierCurve3 = true, this.type = "CubicBezierCurve3", this.v0 = t2, this.v1 = e2, this.v2 = n, this.v3 = i;
    }
    getPoint(t2, e2 = new Ci()) {
      const n = e2, i = this.v0, r = this.v1, s = this.v2, a = this.v3;
      return n.set(Qh(t2, i.x, r.x, s.x, a.x), Qh(t2, i.y, r.y, s.y, a.y), Qh(t2, i.z, r.z, s.z, a.z)), n;
    }
    copy(t2) {
      return super.copy(t2), this.v0.copy(t2.v0), this.v1.copy(t2.v1), this.v2.copy(t2.v2), this.v3.copy(t2.v3), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.v0 = this.v0.toArray(), t2.v1 = this.v1.toArray(), t2.v2 = this.v2.toArray(), t2.v3 = this.v3.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.v0.fromArray(t2.v0), this.v1.fromArray(t2.v1), this.v2.fromArray(t2.v2), this.v3.fromArray(t2.v3), this;
    }
  };
  var nu = class extends Hh {
    constructor(t2 = new Jn(), e2 = new Jn()) {
      super(), this.isLineCurve = true, this.type = "LineCurve", this.v1 = t2, this.v2 = e2;
    }
    getPoint(t2, e2 = new Jn()) {
      const n = e2;
      return 1 === t2 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(t2).add(this.v1)), n;
    }
    getPointAt(t2, e2) {
      return this.getPoint(t2, e2);
    }
    getTangent(t2, e2 = new Jn()) {
      return e2.subVectors(this.v2, this.v1).normalize();
    }
    getTangentAt(t2, e2) {
      return this.getTangent(t2, e2);
    }
    copy(t2) {
      return super.copy(t2), this.v1.copy(t2.v1), this.v2.copy(t2.v2), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.v1 = this.v1.toArray(), t2.v2 = this.v2.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.v1.fromArray(t2.v1), this.v2.fromArray(t2.v2), this;
    }
  };
  var iu = class extends Hh {
    constructor(t2 = new Ci(), e2 = new Ci()) {
      super(), this.isLineCurve3 = true, this.type = "LineCurve3", this.v1 = t2, this.v2 = e2;
    }
    getPoint(t2, e2 = new Ci()) {
      const n = e2;
      return 1 === t2 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(t2).add(this.v1)), n;
    }
    getPointAt(t2, e2) {
      return this.getPoint(t2, e2);
    }
    getTangent(t2, e2 = new Ci()) {
      return e2.subVectors(this.v2, this.v1).normalize();
    }
    getTangentAt(t2, e2) {
      return this.getTangent(t2, e2);
    }
    copy(t2) {
      return super.copy(t2), this.v1.copy(t2.v1), this.v2.copy(t2.v2), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.v1 = this.v1.toArray(), t2.v2 = this.v2.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.v1.fromArray(t2.v1), this.v2.fromArray(t2.v2), this;
    }
  };
  var ru = class extends Hh {
    constructor(t2 = new Jn(), e2 = new Jn(), n = new Jn()) {
      super(), this.isQuadraticBezierCurve = true, this.type = "QuadraticBezierCurve", this.v0 = t2, this.v1 = e2, this.v2 = n;
    }
    getPoint(t2, e2 = new Jn()) {
      const n = e2, i = this.v0, r = this.v1, s = this.v2;
      return n.set($h(t2, i.x, r.x, s.x), $h(t2, i.y, r.y, s.y)), n;
    }
    copy(t2) {
      return super.copy(t2), this.v0.copy(t2.v0), this.v1.copy(t2.v1), this.v2.copy(t2.v2), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.v0 = this.v0.toArray(), t2.v1 = this.v1.toArray(), t2.v2 = this.v2.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.v0.fromArray(t2.v0), this.v1.fromArray(t2.v1), this.v2.fromArray(t2.v2), this;
    }
  };
  var su = class extends Hh {
    constructor(t2 = new Ci(), e2 = new Ci(), n = new Ci()) {
      super(), this.isQuadraticBezierCurve3 = true, this.type = "QuadraticBezierCurve3", this.v0 = t2, this.v1 = e2, this.v2 = n;
    }
    getPoint(t2, e2 = new Ci()) {
      const n = e2, i = this.v0, r = this.v1, s = this.v2;
      return n.set($h(t2, i.x, r.x, s.x), $h(t2, i.y, r.y, s.y), $h(t2, i.z, r.z, s.z)), n;
    }
    copy(t2) {
      return super.copy(t2), this.v0.copy(t2.v0), this.v1.copy(t2.v1), this.v2.copy(t2.v2), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.v0 = this.v0.toArray(), t2.v1 = this.v1.toArray(), t2.v2 = this.v2.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.v0.fromArray(t2.v0), this.v1.fromArray(t2.v1), this.v2.fromArray(t2.v2), this;
    }
  };
  var au = class extends Hh {
    constructor(t2 = []) {
      super(), this.isSplineCurve = true, this.type = "SplineCurve", this.points = t2;
    }
    getPoint(t2, e2 = new Jn()) {
      const n = e2, i = this.points, r = (i.length - 1) * t2, s = Math.floor(r), a = r - s, o = i[0 === s ? s : s - 1], l = i[s], c = i[s > i.length - 2 ? i.length - 1 : s + 1], h = i[s > i.length - 3 ? i.length - 1 : s + 2];
      return n.set(Kh(a, o.x, l.x, c.x, h.x), Kh(a, o.y, l.y, c.y, h.y)), n;
    }
    copy(t2) {
      super.copy(t2), this.points = [];
      for (let e2 = 0, n = t2.points.length; e2 < n; e2++) {
        const n2 = t2.points[e2];
        this.points.push(n2.clone());
      }
      return this;
    }
    toJSON() {
      const t2 = super.toJSON();
      t2.points = [];
      for (let e2 = 0, n = this.points.length; e2 < n; e2++) {
        const n2 = this.points[e2];
        t2.points.push(n2.toArray());
      }
      return t2;
    }
    fromJSON(t2) {
      super.fromJSON(t2), this.points = [];
      for (let e2 = 0, n = t2.points.length; e2 < n; e2++) {
        const n2 = t2.points[e2];
        this.points.push(new Jn().fromArray(n2));
      }
      return this;
    }
  };
  var ou = Object.freeze({ __proto__: null, ArcCurve: Wh, CatmullRomCurve3: Jh, CubicBezierCurve: tu, CubicBezierCurve3: eu, EllipseCurve: Gh, LineCurve: nu, LineCurve3: iu, QuadraticBezierCurve: ru, QuadraticBezierCurve3: su, SplineCurve: au });
  var lu = class extends Hh {
    constructor() {
      super(), this.type = "CurvePath", this.curves = [], this.autoClose = false;
    }
    add(t2) {
      this.curves.push(t2);
    }
    closePath() {
      const t2 = this.curves[0].getPoint(0), e2 = this.curves[this.curves.length - 1].getPoint(1);
      if (!t2.equals(e2)) {
        const n = true === t2.isVector2 ? "LineCurve" : "LineCurve3";
        this.curves.push(new ou[n](e2, t2));
      }
      return this;
    }
    getPoint(t2, e2) {
      const n = t2 * this.getLength(), i = this.getCurveLengths();
      let r = 0;
      for (; r < i.length; ) {
        if (i[r] >= n) {
          const t3 = i[r] - n, s = this.curves[r], a = s.getLength(), o = 0 === a ? 0 : 1 - t3 / a;
          return s.getPointAt(o, e2);
        }
        r++;
      }
      return null;
    }
    getLength() {
      const t2 = this.getCurveLengths();
      return t2[t2.length - 1];
    }
    updateArcLengths() {
      this.needsUpdate = true, this.cacheLengths = null, this.getCurveLengths();
    }
    getCurveLengths() {
      if (this.cacheLengths && this.cacheLengths.length === this.curves.length) return this.cacheLengths;
      const t2 = [];
      let e2 = 0;
      for (let n = 0, i = this.curves.length; n < i; n++) e2 += this.curves[n].getLength(), t2.push(e2);
      return this.cacheLengths = t2, t2;
    }
    getSpacedPoints(t2 = 40) {
      const e2 = [];
      for (let n = 0; n <= t2; n++) e2.push(this.getPoint(n / t2));
      return this.autoClose && e2.push(e2[0]), e2;
    }
    getPoints(t2 = 12) {
      const e2 = [];
      let n;
      for (let i = 0, r = this.curves; i < r.length; i++) {
        const s = r[i], a = s.isEllipseCurve ? 2 * t2 : s.isLineCurve || s.isLineCurve3 ? 1 : s.isSplineCurve ? t2 * s.points.length : t2, o = s.getPoints(a);
        for (let t3 = 0; t3 < o.length; t3++) {
          const i2 = o[t3];
          n && n.equals(i2) || (e2.push(i2), n = i2);
        }
      }
      return this.autoClose && e2.length > 1 && !e2[e2.length - 1].equals(e2[0]) && e2.push(e2[0]), e2;
    }
    copy(t2) {
      super.copy(t2), this.curves = [];
      for (let e2 = 0, n = t2.curves.length; e2 < n; e2++) {
        const n2 = t2.curves[e2];
        this.curves.push(n2.clone());
      }
      return this.autoClose = t2.autoClose, this;
    }
    toJSON() {
      const t2 = super.toJSON();
      t2.autoClose = this.autoClose, t2.curves = [];
      for (let e2 = 0, n = this.curves.length; e2 < n; e2++) {
        const n2 = this.curves[e2];
        t2.curves.push(n2.toJSON());
      }
      return t2;
    }
    fromJSON(t2) {
      super.fromJSON(t2), this.autoClose = t2.autoClose, this.curves = [];
      for (let e2 = 0, n = t2.curves.length; e2 < n; e2++) {
        const n2 = t2.curves[e2];
        this.curves.push(new ou[n2.type]().fromJSON(n2));
      }
      return this;
    }
  };
  var cu = class extends lu {
    constructor(t2) {
      super(), this.type = "Path", this.currentPoint = new Jn(), t2 && this.setFromPoints(t2);
    }
    setFromPoints(t2) {
      this.moveTo(t2[0].x, t2[0].y);
      for (let e2 = 1, n = t2.length; e2 < n; e2++) this.lineTo(t2[e2].x, t2[e2].y);
      return this;
    }
    moveTo(t2, e2) {
      return this.currentPoint.set(t2, e2), this;
    }
    lineTo(t2, e2) {
      const n = new nu(this.currentPoint.clone(), new Jn(t2, e2));
      return this.curves.push(n), this.currentPoint.set(t2, e2), this;
    }
    quadraticCurveTo(t2, e2, n, i) {
      const r = new ru(this.currentPoint.clone(), new Jn(t2, e2), new Jn(n, i));
      return this.curves.push(r), this.currentPoint.set(n, i), this;
    }
    bezierCurveTo(t2, e2, n, i, r, s) {
      const a = new tu(this.currentPoint.clone(), new Jn(t2, e2), new Jn(n, i), new Jn(r, s));
      return this.curves.push(a), this.currentPoint.set(r, s), this;
    }
    splineThru(t2) {
      const e2 = [this.currentPoint.clone()].concat(t2), n = new au(e2);
      return this.curves.push(n), this.currentPoint.copy(t2[t2.length - 1]), this;
    }
    arc(t2, e2, n, i, r, s) {
      const a = this.currentPoint.x, o = this.currentPoint.y;
      return this.absarc(t2 + a, e2 + o, n, i, r, s), this;
    }
    absarc(t2, e2, n, i, r, s) {
      return this.absellipse(t2, e2, n, n, i, r, s), this;
    }
    ellipse(t2, e2, n, i, r, s, a, o) {
      const l = this.currentPoint.x, c = this.currentPoint.y;
      return this.absellipse(t2 + l, e2 + c, n, i, r, s, a, o), this;
    }
    absellipse(t2, e2, n, i, r, s, a, o) {
      const l = new Gh(t2, e2, n, i, r, s, a, o);
      if (this.curves.length > 0) {
        const t3 = l.getPoint(0);
        t3.equals(this.currentPoint) || this.lineTo(t3.x, t3.y);
      }
      this.curves.push(l);
      const c = l.getPoint(1);
      return this.currentPoint.copy(c), this;
    }
    copy(t2) {
      return super.copy(t2), this.currentPoint.copy(t2.currentPoint), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.currentPoint = this.currentPoint.toArray(), t2;
    }
    fromJSON(t2) {
      return super.fromJSON(t2), this.currentPoint.fromArray(t2.currentPoint), this;
    }
  };
  var hu = class _hu extends Es {
    constructor(t2 = [new Jn(0, -0.5), new Jn(0.5, 0), new Jn(0, 0.5)], e2 = 12, n = 0, i = 2 * Math.PI) {
      super(), this.type = "LatheGeometry", this.parameters = { points: t2, segments: e2, phiStart: n, phiLength: i }, e2 = Math.floor(e2), i = Wn(i, 0, 2 * Math.PI);
      const r = [], s = [], a = [], o = [], l = [], c = 1 / e2, h = new Ci(), u2 = new Jn(), d2 = new Ci(), p2 = new Ci(), m = new Ci();
      let f = 0, g = 0;
      for (let e3 = 0; e3 <= t2.length - 1; e3++) switch (e3) {
        case 0:
          f = t2[e3 + 1].x - t2[e3].x, g = t2[e3 + 1].y - t2[e3].y, d2.x = 1 * g, d2.y = -f, d2.z = 0 * g, m.copy(d2), d2.normalize(), o.push(d2.x, d2.y, d2.z);
          break;
        case t2.length - 1:
          o.push(m.x, m.y, m.z);
          break;
        default:
          f = t2[e3 + 1].x - t2[e3].x, g = t2[e3 + 1].y - t2[e3].y, d2.x = 1 * g, d2.y = -f, d2.z = 0 * g, p2.copy(d2), d2.x += m.x, d2.y += m.y, d2.z += m.z, d2.normalize(), o.push(d2.x, d2.y, d2.z), m.copy(p2);
      }
      for (let r2 = 0; r2 <= e2; r2++) {
        const d3 = n + r2 * c * i, p3 = Math.sin(d3), m2 = Math.cos(d3);
        for (let n2 = 0; n2 <= t2.length - 1; n2++) {
          h.x = t2[n2].x * p3, h.y = t2[n2].y, h.z = t2[n2].x * m2, s.push(h.x, h.y, h.z), u2.x = r2 / e2, u2.y = n2 / (t2.length - 1), a.push(u2.x, u2.y);
          const i2 = o[3 * n2 + 0] * p3, c2 = o[3 * n2 + 1], d4 = o[3 * n2 + 0] * m2;
          l.push(i2, c2, d4);
        }
      }
      for (let n2 = 0; n2 < e2; n2++) for (let e3 = 0; e3 < t2.length - 1; e3++) {
        const i2 = e3 + n2 * t2.length, s2 = i2, a2 = i2 + t2.length, o2 = i2 + t2.length + 1, l2 = i2 + 1;
        r.push(s2, a2, l2), r.push(o2, l2, a2);
      }
      this.setIndex(r), this.setAttribute("position", new _s(s, 3)), this.setAttribute("uv", new _s(a, 2)), this.setAttribute("normal", new _s(l, 3));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _hu(t2.points, t2.segments, t2.phiStart, t2.phiLength);
    }
  };
  var uu = class _uu extends hu {
    constructor(t2 = 1, e2 = 1, n = 4, i = 8) {
      const r = new cu();
      r.absarc(0, -e2 / 2, t2, 1.5 * Math.PI, 0), r.absarc(0, e2 / 2, t2, 0, 0.5 * Math.PI), super(r.getPoints(n), i), this.type = "CapsuleGeometry", this.parameters = { radius: t2, length: e2, capSegments: n, radialSegments: i };
    }
    static fromJSON(t2) {
      return new _uu(t2.radius, t2.length, t2.capSegments, t2.radialSegments);
    }
  };
  var du = class _du extends Es {
    constructor(t2 = 1, e2 = 32, n = 0, i = 2 * Math.PI) {
      super(), this.type = "CircleGeometry", this.parameters = { radius: t2, segments: e2, thetaStart: n, thetaLength: i }, e2 = Math.max(3, e2);
      const r = [], s = [], a = [], o = [], l = new Ci(), c = new Jn();
      s.push(0, 0, 0), a.push(0, 0, 1), o.push(0.5, 0.5);
      for (let r2 = 0, h = 3; r2 <= e2; r2++, h += 3) {
        const u2 = n + r2 / e2 * i;
        l.x = t2 * Math.cos(u2), l.y = t2 * Math.sin(u2), s.push(l.x, l.y, l.z), a.push(0, 0, 1), c.x = (s[h] / t2 + 1) / 2, c.y = (s[h + 1] / t2 + 1) / 2, o.push(c.x, c.y);
      }
      for (let t3 = 1; t3 <= e2; t3++) r.push(t3, t3 + 1, 0);
      this.setIndex(r), this.setAttribute("position", new _s(s, 3)), this.setAttribute("normal", new _s(a, 3)), this.setAttribute("uv", new _s(o, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _du(t2.radius, t2.segments, t2.thetaStart, t2.thetaLength);
    }
  };
  var pu = class _pu extends Es {
    constructor(t2 = 1, e2 = 1, n = 1, i = 32, r = 1, s = false, a = 0, o = 2 * Math.PI) {
      super(), this.type = "CylinderGeometry", this.parameters = { radiusTop: t2, radiusBottom: e2, height: n, radialSegments: i, heightSegments: r, openEnded: s, thetaStart: a, thetaLength: o };
      const l = this;
      i = Math.floor(i), r = Math.floor(r);
      const c = [], h = [], u2 = [], d2 = [];
      let p2 = 0;
      const m = [], f = n / 2;
      let g = 0;
      function v(n2) {
        const r2 = p2, s2 = new Jn(), m2 = new Ci();
        let v2 = 0;
        const _ = true === n2 ? t2 : e2, x = true === n2 ? 1 : -1;
        for (let t3 = 1; t3 <= i; t3++) h.push(0, f * x, 0), u2.push(0, x, 0), d2.push(0.5, 0.5), p2++;
        const y2 = p2;
        for (let t3 = 0; t3 <= i; t3++) {
          const e3 = t3 / i * o + a, n3 = Math.cos(e3), r3 = Math.sin(e3);
          m2.x = _ * r3, m2.y = f * x, m2.z = _ * n3, h.push(m2.x, m2.y, m2.z), u2.push(0, x, 0), s2.x = 0.5 * n3 + 0.5, s2.y = 0.5 * r3 * x + 0.5, d2.push(s2.x, s2.y), p2++;
        }
        for (let t3 = 0; t3 < i; t3++) {
          const e3 = r2 + t3, i2 = y2 + t3;
          true === n2 ? c.push(i2, i2 + 1, e3) : c.push(i2 + 1, i2, e3), v2 += 3;
        }
        l.addGroup(g, v2, true === n2 ? 1 : 2), g += v2;
      }
      !(function() {
        const s2 = new Ci(), v2 = new Ci();
        let _ = 0;
        const x = (e2 - t2) / n;
        for (let l2 = 0; l2 <= r; l2++) {
          const c2 = [], g2 = l2 / r, _2 = g2 * (e2 - t2) + t2;
          for (let t3 = 0; t3 <= i; t3++) {
            const e3 = t3 / i, r2 = e3 * o + a, l3 = Math.sin(r2), m2 = Math.cos(r2);
            v2.x = _2 * l3, v2.y = -g2 * n + f, v2.z = _2 * m2, h.push(v2.x, v2.y, v2.z), s2.set(l3, x, m2).normalize(), u2.push(s2.x, s2.y, s2.z), d2.push(e3, 1 - g2), c2.push(p2++);
          }
          m.push(c2);
        }
        for (let n2 = 0; n2 < i; n2++) for (let i2 = 0; i2 < r; i2++) {
          const s3 = m[i2][n2], a2 = m[i2 + 1][n2], o2 = m[i2 + 1][n2 + 1], l2 = m[i2][n2 + 1];
          (t2 > 0 || 0 !== i2) && (c.push(s3, a2, l2), _ += 3), (e2 > 0 || i2 !== r - 1) && (c.push(a2, o2, l2), _ += 3);
        }
        l.addGroup(g, _, 0), g += _;
      })(), false === s && (t2 > 0 && v(true), e2 > 0 && v(false)), this.setIndex(c), this.setAttribute("position", new _s(h, 3)), this.setAttribute("normal", new _s(u2, 3)), this.setAttribute("uv", new _s(d2, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _pu(t2.radiusTop, t2.radiusBottom, t2.height, t2.radialSegments, t2.heightSegments, t2.openEnded, t2.thetaStart, t2.thetaLength);
    }
  };
  var mu = class _mu extends pu {
    constructor(t2 = 1, e2 = 1, n = 32, i = 1, r = false, s = 0, a = 2 * Math.PI) {
      super(0, t2, e2, n, i, r, s, a), this.type = "ConeGeometry", this.parameters = { radius: t2, height: e2, radialSegments: n, heightSegments: i, openEnded: r, thetaStart: s, thetaLength: a };
    }
    static fromJSON(t2) {
      return new _mu(t2.radius, t2.height, t2.radialSegments, t2.heightSegments, t2.openEnded, t2.thetaStart, t2.thetaLength);
    }
  };
  var fu = class _fu extends Es {
    constructor(t2 = [], e2 = [], n = 1, i = 0) {
      super(), this.type = "PolyhedronGeometry", this.parameters = { vertices: t2, indices: e2, radius: n, detail: i };
      const r = [], s = [];
      function a(t3, e3, n2, i2) {
        const r2 = i2 + 1, s2 = [];
        for (let i3 = 0; i3 <= r2; i3++) {
          s2[i3] = [];
          const a2 = t3.clone().lerp(n2, i3 / r2), o2 = e3.clone().lerp(n2, i3 / r2), l2 = r2 - i3;
          for (let t4 = 0; t4 <= l2; t4++) s2[i3][t4] = 0 === t4 && i3 === r2 ? a2 : a2.clone().lerp(o2, t4 / l2);
        }
        for (let t4 = 0; t4 < r2; t4++) for (let e4 = 0; e4 < 2 * (r2 - t4) - 1; e4++) {
          const n3 = Math.floor(e4 / 2);
          e4 % 2 == 0 ? (o(s2[t4][n3 + 1]), o(s2[t4 + 1][n3]), o(s2[t4][n3])) : (o(s2[t4][n3 + 1]), o(s2[t4 + 1][n3 + 1]), o(s2[t4 + 1][n3]));
        }
      }
      function o(t3) {
        r.push(t3.x, t3.y, t3.z);
      }
      function l(e3, n2) {
        const i2 = 3 * e3;
        n2.x = t2[i2 + 0], n2.y = t2[i2 + 1], n2.z = t2[i2 + 2];
      }
      function c(t3, e3, n2, i2) {
        i2 < 0 && 1 === t3.x && (s[e3] = t3.x - 1), 0 === n2.x && 0 === n2.z && (s[e3] = i2 / 2 / Math.PI + 0.5);
      }
      function h(t3) {
        return Math.atan2(t3.z, -t3.x);
      }
      !(function(t3) {
        const n2 = new Ci(), i2 = new Ci(), r2 = new Ci();
        for (let s2 = 0; s2 < e2.length; s2 += 3) l(e2[s2 + 0], n2), l(e2[s2 + 1], i2), l(e2[s2 + 2], r2), a(n2, i2, r2, t3);
      })(i), (function(t3) {
        const e3 = new Ci();
        for (let n2 = 0; n2 < r.length; n2 += 3) e3.x = r[n2 + 0], e3.y = r[n2 + 1], e3.z = r[n2 + 2], e3.normalize().multiplyScalar(t3), r[n2 + 0] = e3.x, r[n2 + 1] = e3.y, r[n2 + 2] = e3.z;
      })(n), (function() {
        const t3 = new Ci();
        for (let n2 = 0; n2 < r.length; n2 += 3) {
          t3.x = r[n2 + 0], t3.y = r[n2 + 1], t3.z = r[n2 + 2];
          const i2 = h(t3) / 2 / Math.PI + 0.5, a2 = (e3 = t3, Math.atan2(-e3.y, Math.sqrt(e3.x * e3.x + e3.z * e3.z)) / Math.PI + 0.5);
          s.push(i2, 1 - a2);
        }
        var e3;
        (function() {
          const t4 = new Ci(), e4 = new Ci(), n2 = new Ci(), i2 = new Ci(), a2 = new Jn(), o2 = new Jn(), l2 = new Jn();
          for (let u2 = 0, d2 = 0; u2 < r.length; u2 += 9, d2 += 6) {
            t4.set(r[u2 + 0], r[u2 + 1], r[u2 + 2]), e4.set(r[u2 + 3], r[u2 + 4], r[u2 + 5]), n2.set(r[u2 + 6], r[u2 + 7], r[u2 + 8]), a2.set(s[d2 + 0], s[d2 + 1]), o2.set(s[d2 + 2], s[d2 + 3]), l2.set(s[d2 + 4], s[d2 + 5]), i2.copy(t4).add(e4).add(n2).divideScalar(3);
            const p2 = h(i2);
            c(a2, d2 + 0, t4, p2), c(o2, d2 + 2, e4, p2), c(l2, d2 + 4, n2, p2);
          }
        })(), (function() {
          for (let t4 = 0; t4 < s.length; t4 += 6) {
            const e4 = s[t4 + 0], n2 = s[t4 + 2], i2 = s[t4 + 4], r2 = Math.max(e4, n2, i2), a2 = Math.min(e4, n2, i2);
            r2 > 0.9 && a2 < 0.1 && (e4 < 0.2 && (s[t4 + 0] += 1), n2 < 0.2 && (s[t4 + 2] += 1), i2 < 0.2 && (s[t4 + 4] += 1));
          }
        })();
      })(), this.setAttribute("position", new _s(r, 3)), this.setAttribute("normal", new _s(r.slice(), 3)), this.setAttribute("uv", new _s(s, 2)), 0 === i ? this.computeVertexNormals() : this.normalizeNormals();
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _fu(t2.vertices, t2.indices, t2.radius, t2.details);
    }
  };
  var gu = class _gu extends fu {
    constructor(t2 = 1, e2 = 0) {
      const n = (1 + Math.sqrt(5)) / 2, i = 1 / n;
      super([-1, -1, -1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1, 0, -i, -n, 0, -i, n, 0, i, -n, 0, i, n, -i, -n, 0, -i, n, 0, i, -n, 0, i, n, 0, -n, 0, -i, n, 0, -i, -n, 0, i, n, 0, i], [3, 11, 7, 3, 7, 15, 3, 15, 13, 7, 19, 17, 7, 17, 6, 7, 6, 15, 17, 4, 8, 17, 8, 10, 17, 10, 6, 8, 0, 16, 8, 16, 2, 8, 2, 10, 0, 12, 1, 0, 1, 18, 0, 18, 16, 6, 10, 2, 6, 2, 13, 6, 13, 15, 2, 16, 18, 2, 18, 3, 2, 3, 13, 18, 1, 9, 18, 9, 11, 18, 11, 3, 4, 14, 12, 4, 12, 0, 4, 0, 8, 11, 9, 5, 11, 5, 19, 11, 19, 7, 19, 5, 14, 19, 14, 4, 19, 4, 17, 1, 12, 14, 1, 14, 5, 1, 5, 9], t2, e2), this.type = "DodecahedronGeometry", this.parameters = { radius: t2, detail: e2 };
    }
    static fromJSON(t2) {
      return new _gu(t2.radius, t2.detail);
    }
  };
  var vu = new Ci();
  var _u = new Ci();
  var xu = new Ci();
  var yu = new jr();
  var Mu = class extends Es {
    constructor(t2 = null, e2 = 1) {
      if (super(), this.type = "EdgesGeometry", this.parameters = { geometry: t2, thresholdAngle: e2 }, null !== t2) {
        const n = 4, i = Math.pow(10, n), r = Math.cos(Vn * e2), s = t2.getIndex(), a = t2.getAttribute("position"), o = s ? s.count : a.count, l = [0, 0, 0], c = ["a", "b", "c"], h = new Array(3), u2 = {}, d2 = [];
        for (let t3 = 0; t3 < o; t3 += 3) {
          s ? (l[0] = s.getX(t3), l[1] = s.getX(t3 + 1), l[2] = s.getX(t3 + 2)) : (l[0] = t3, l[1] = t3 + 1, l[2] = t3 + 2);
          const { a: e3, b: n2, c: o2 } = yu;
          if (e3.fromBufferAttribute(a, l[0]), n2.fromBufferAttribute(a, l[1]), o2.fromBufferAttribute(a, l[2]), yu.getNormal(xu), h[0] = `${Math.round(e3.x * i)},${Math.round(e3.y * i)},${Math.round(e3.z * i)}`, h[1] = `${Math.round(n2.x * i)},${Math.round(n2.y * i)},${Math.round(n2.z * i)}`, h[2] = `${Math.round(o2.x * i)},${Math.round(o2.y * i)},${Math.round(o2.z * i)}`, h[0] !== h[1] && h[1] !== h[2] && h[2] !== h[0]) for (let t4 = 0; t4 < 3; t4++) {
            const e4 = (t4 + 1) % 3, n3 = h[t4], i2 = h[e4], s2 = yu[c[t4]], a2 = yu[c[e4]], o3 = `${n3}_${i2}`, p2 = `${i2}_${n3}`;
            p2 in u2 && u2[p2] ? (xu.dot(u2[p2].normal) <= r && (d2.push(s2.x, s2.y, s2.z), d2.push(a2.x, a2.y, a2.z)), u2[p2] = null) : o3 in u2 || (u2[o3] = { index0: l[t4], index1: l[e4], normal: xu.clone() });
          }
        }
        for (const t3 in u2) if (u2[t3]) {
          const { index0: e3, index1: n2 } = u2[t3];
          vu.fromBufferAttribute(a, e3), _u.fromBufferAttribute(a, n2), d2.push(vu.x, vu.y, vu.z), d2.push(_u.x, _u.y, _u.z);
        }
        this.setAttribute("position", new _s(d2, 3));
      }
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
  };
  var Su = class extends cu {
    constructor(t2) {
      super(t2), this.uuid = Gn(), this.type = "Shape", this.holes = [];
    }
    getPointsHoles(t2) {
      const e2 = [];
      for (let n = 0, i = this.holes.length; n < i; n++) e2[n] = this.holes[n].getPoints(t2);
      return e2;
    }
    extractPoints(t2) {
      return { shape: this.getPoints(t2), holes: this.getPointsHoles(t2) };
    }
    copy(t2) {
      super.copy(t2), this.holes = [];
      for (let e2 = 0, n = t2.holes.length; e2 < n; e2++) {
        const n2 = t2.holes[e2];
        this.holes.push(n2.clone());
      }
      return this;
    }
    toJSON() {
      const t2 = super.toJSON();
      t2.uuid = this.uuid, t2.holes = [];
      for (let e2 = 0, n = this.holes.length; e2 < n; e2++) {
        const n2 = this.holes[e2];
        t2.holes.push(n2.toJSON());
      }
      return t2;
    }
    fromJSON(t2) {
      super.fromJSON(t2), this.uuid = t2.uuid, this.holes = [];
      for (let e2 = 0, n = t2.holes.length; e2 < n; e2++) {
        const n2 = t2.holes[e2];
        this.holes.push(new cu().fromJSON(n2));
      }
      return this;
    }
  };
  var bu = function(t2, e2, n = 2) {
    const i = e2 && e2.length, r = i ? e2[0] * n : t2.length;
    let s = Tu(t2, 0, r, n, true);
    const a = [];
    if (!s || s.next === s.prev) return a;
    let o, l, c, h, u2, d2, p2;
    if (i && (s = (function(t3, e3, n2, i2) {
      const r2 = [];
      let s2, a2, o2, l2, c2;
      for (s2 = 0, a2 = e3.length; s2 < a2; s2++) o2 = e3[s2] * i2, l2 = s2 < a2 - 1 ? e3[s2 + 1] * i2 : t3.length, c2 = Tu(t3, o2, l2, i2, false), c2 === c2.next && (c2.steiner = true), r2.push(Nu(c2));
      for (r2.sort(Pu), s2 = 0; s2 < r2.length; s2++) n2 = Lu(r2[s2], n2);
      return n2;
    })(t2, e2, s, n)), t2.length > 80 * n) {
      o = c = t2[0], l = h = t2[1];
      for (let e3 = n; e3 < r; e3 += n) u2 = t2[e3], d2 = t2[e3 + 1], u2 < o && (o = u2), d2 < l && (l = d2), u2 > c && (c = u2), d2 > h && (h = d2);
      p2 = Math.max(c - o, h - l), p2 = 0 !== p2 ? 32767 / p2 : 0;
    }
    return Eu(s, a, n, o, l, p2, 0), a;
  };
  function Tu(t2, e2, n, i, r) {
    let s, a;
    if (r === (function(t3, e3, n2, i2) {
      let r2 = 0;
      for (let s2 = e3, a2 = n2 - i2; s2 < n2; s2 += i2) r2 += (t3[a2] - t3[s2]) * (t3[s2 + 1] + t3[a2 + 1]), a2 = s2;
      return r2;
    })(t2, e2, n, i) > 0) for (s = e2; s < n; s += i) a = Xu(s, t2[s], t2[s + 1], a);
    else for (s = n - i; s >= e2; s -= i) a = Xu(s, t2[s], t2[s + 1], a);
    return a && zu(a, a.next) && (ju(a), a = a.next), a;
  }
  function wu(t2, e2) {
    if (!t2) return t2;
    e2 || (e2 = t2);
    let n, i = t2;
    do {
      if (n = false, i.steiner || !zu(i, i.next) && 0 !== Bu(i.prev, i, i.next)) i = i.next;
      else {
        if (ju(i), i = e2 = i.prev, i === i.next) break;
        n = true;
      }
    } while (n || i !== e2);
    return e2;
  }
  function Eu(t2, e2, n, i, r, s, a) {
    if (!t2) return;
    !a && s && (function(t3, e3, n2, i2) {
      let r2 = t3;
      do {
        0 === r2.z && (r2.z = Du(r2.x, r2.y, e3, n2, i2)), r2.prevZ = r2.prev, r2.nextZ = r2.next, r2 = r2.next;
      } while (r2 !== t3);
      r2.prevZ.nextZ = null, r2.prevZ = null, (function(t4) {
        let e4, n3, i3, r3, s2, a2, o2, l2, c2 = 1;
        do {
          for (n3 = t4, t4 = null, s2 = null, a2 = 0; n3; ) {
            for (a2++, i3 = n3, o2 = 0, e4 = 0; e4 < c2 && (o2++, i3 = i3.nextZ, i3); e4++) ;
            for (l2 = c2; o2 > 0 || l2 > 0 && i3; ) 0 !== o2 && (0 === l2 || !i3 || n3.z <= i3.z) ? (r3 = n3, n3 = n3.nextZ, o2--) : (r3 = i3, i3 = i3.nextZ, l2--), s2 ? s2.nextZ = r3 : t4 = r3, r3.prevZ = s2, s2 = r3;
            n3 = i3;
          }
          s2.nextZ = null, c2 *= 2;
        } while (a2 > 1);
      })(r2);
    })(t2, i, r, s);
    let o, l, c = t2;
    for (; t2.prev !== t2.next; ) if (o = t2.prev, l = t2.next, s ? Ru(t2, i, r, s) : Au(t2)) e2.push(o.i / n | 0), e2.push(t2.i / n | 0), e2.push(l.i / n | 0), ju(t2), t2 = l.next, c = l.next;
    else if ((t2 = l) === c) {
      a ? 1 === a ? Eu(t2 = Cu(wu(t2), e2, n), e2, n, i, r, s, 2) : 2 === a && Iu(t2, e2, n, i, r, s) : Eu(wu(t2), e2, n, i, r, s, 1);
      break;
    }
  }
  function Au(t2) {
    const e2 = t2.prev, n = t2, i = t2.next;
    if (Bu(e2, n, i) >= 0) return false;
    const r = e2.x, s = n.x, a = i.x, o = e2.y, l = n.y, c = i.y, h = r < s ? r < a ? r : a : s < a ? s : a, u2 = o < l ? o < c ? o : c : l < c ? l : c, d2 = r > s ? r > a ? r : a : s > a ? s : a, p2 = o > l ? o > c ? o : c : l > c ? l : c;
    let m = i.next;
    for (; m !== e2; ) {
      if (m.x >= h && m.x <= d2 && m.y >= u2 && m.y <= p2 && Ou(r, o, s, l, a, c, m.x, m.y) && Bu(m.prev, m, m.next) >= 0) return false;
      m = m.next;
    }
    return true;
  }
  function Ru(t2, e2, n, i) {
    const r = t2.prev, s = t2, a = t2.next;
    if (Bu(r, s, a) >= 0) return false;
    const o = r.x, l = s.x, c = a.x, h = r.y, u2 = s.y, d2 = a.y, p2 = o < l ? o < c ? o : c : l < c ? l : c, m = h < u2 ? h < d2 ? h : d2 : u2 < d2 ? u2 : d2, f = o > l ? o > c ? o : c : l > c ? l : c, g = h > u2 ? h > d2 ? h : d2 : u2 > d2 ? u2 : d2, v = Du(p2, m, e2, n, i), _ = Du(f, g, e2, n, i);
    let x = t2.prevZ, y2 = t2.nextZ;
    for (; x && x.z >= v && y2 && y2.z <= _; ) {
      if (x.x >= p2 && x.x <= f && x.y >= m && x.y <= g && x !== r && x !== a && Ou(o, h, l, u2, c, d2, x.x, x.y) && Bu(x.prev, x, x.next) >= 0) return false;
      if (x = x.prevZ, y2.x >= p2 && y2.x <= f && y2.y >= m && y2.y <= g && y2 !== r && y2 !== a && Ou(o, h, l, u2, c, d2, y2.x, y2.y) && Bu(y2.prev, y2, y2.next) >= 0) return false;
      y2 = y2.nextZ;
    }
    for (; x && x.z >= v; ) {
      if (x.x >= p2 && x.x <= f && x.y >= m && x.y <= g && x !== r && x !== a && Ou(o, h, l, u2, c, d2, x.x, x.y) && Bu(x.prev, x, x.next) >= 0) return false;
      x = x.prevZ;
    }
    for (; y2 && y2.z <= _; ) {
      if (y2.x >= p2 && y2.x <= f && y2.y >= m && y2.y <= g && y2 !== r && y2 !== a && Ou(o, h, l, u2, c, d2, y2.x, y2.y) && Bu(y2.prev, y2, y2.next) >= 0) return false;
      y2 = y2.nextZ;
    }
    return true;
  }
  function Cu(t2, e2, n) {
    let i = t2;
    do {
      const r = i.prev, s = i.next.next;
      !zu(r, s) && ku(r, i, i.next, s) && Gu(r, s) && Gu(s, r) && (e2.push(r.i / n | 0), e2.push(i.i / n | 0), e2.push(s.i / n | 0), ju(i), ju(i.next), i = t2 = s), i = i.next;
    } while (i !== t2);
    return wu(i);
  }
  function Iu(t2, e2, n, i, r, s) {
    let a = t2;
    do {
      let t3 = a.next.next;
      for (; t3 !== a.prev; ) {
        if (a.i !== t3.i && Fu(a, t3)) {
          let o = Wu(a, t3);
          return a = wu(a, a.next), o = wu(o, o.next), Eu(a, e2, n, i, r, s, 0), void Eu(o, e2, n, i, r, s, 0);
        }
        t3 = t3.next;
      }
      a = a.next;
    } while (a !== t2);
  }
  function Pu(t2, e2) {
    return t2.x - e2.x;
  }
  function Lu(t2, e2) {
    const n = (function(t3, e3) {
      let n2, i2 = e3, r = -1 / 0;
      const s = t3.x, a = t3.y;
      do {
        if (a <= i2.y && a >= i2.next.y && i2.next.y !== i2.y) {
          const t4 = i2.x + (a - i2.y) * (i2.next.x - i2.x) / (i2.next.y - i2.y);
          if (t4 <= s && t4 > r && (r = t4, n2 = i2.x < i2.next.x ? i2 : i2.next, t4 === s)) return n2;
        }
        i2 = i2.next;
      } while (i2 !== e3);
      if (!n2) return null;
      const o = n2, l = n2.x, c = n2.y;
      let h, u2 = 1 / 0;
      i2 = n2;
      do {
        s >= i2.x && i2.x >= l && s !== i2.x && Ou(a < c ? s : r, a, l, c, a < c ? r : s, a, i2.x, i2.y) && (h = Math.abs(a - i2.y) / (s - i2.x), Gu(i2, t3) && (h < u2 || h === u2 && (i2.x > n2.x || i2.x === n2.x && Uu(n2, i2))) && (n2 = i2, u2 = h)), i2 = i2.next;
      } while (i2 !== o);
      return n2;
    })(t2, e2);
    if (!n) return e2;
    const i = Wu(n, t2);
    return wu(i, i.next), wu(n, n.next);
  }
  function Uu(t2, e2) {
    return Bu(t2.prev, t2, e2.prev) < 0 && Bu(e2.next, t2, t2.next) < 0;
  }
  function Du(t2, e2, n, i, r) {
    return (t2 = 1431655765 & ((t2 = 858993459 & ((t2 = 252645135 & ((t2 = 16711935 & ((t2 = (t2 - n) * r | 0) | t2 << 8)) | t2 << 4)) | t2 << 2)) | t2 << 1)) | (e2 = 1431655765 & ((e2 = 858993459 & ((e2 = 252645135 & ((e2 = 16711935 & ((e2 = (e2 - i) * r | 0) | e2 << 8)) | e2 << 4)) | e2 << 2)) | e2 << 1)) << 1;
  }
  function Nu(t2) {
    let e2 = t2, n = t2;
    do {
      (e2.x < n.x || e2.x === n.x && e2.y < n.y) && (n = e2), e2 = e2.next;
    } while (e2 !== t2);
    return n;
  }
  function Ou(t2, e2, n, i, r, s, a, o) {
    return (r - a) * (e2 - o) >= (t2 - a) * (s - o) && (t2 - a) * (i - o) >= (n - a) * (e2 - o) && (n - a) * (s - o) >= (r - a) * (i - o);
  }
  function Fu(t2, e2) {
    return t2.next.i !== e2.i && t2.prev.i !== e2.i && !(function(t3, e3) {
      let n = t3;
      do {
        if (n.i !== t3.i && n.next.i !== t3.i && n.i !== e3.i && n.next.i !== e3.i && ku(n, n.next, t3, e3)) return true;
        n = n.next;
      } while (n !== t3);
      return false;
    })(t2, e2) && (Gu(t2, e2) && Gu(e2, t2) && (function(t3, e3) {
      let n = t3, i = false;
      const r = (t3.x + e3.x) / 2, s = (t3.y + e3.y) / 2;
      do {
        n.y > s != n.next.y > s && n.next.y !== n.y && r < (n.next.x - n.x) * (s - n.y) / (n.next.y - n.y) + n.x && (i = !i), n = n.next;
      } while (n !== t3);
      return i;
    })(t2, e2) && (Bu(t2.prev, t2, e2.prev) || Bu(t2, e2.prev, e2)) || zu(t2, e2) && Bu(t2.prev, t2, t2.next) > 0 && Bu(e2.prev, e2, e2.next) > 0);
  }
  function Bu(t2, e2, n) {
    return (e2.y - t2.y) * (n.x - e2.x) - (e2.x - t2.x) * (n.y - e2.y);
  }
  function zu(t2, e2) {
    return t2.x === e2.x && t2.y === e2.y;
  }
  function ku(t2, e2, n, i) {
    const r = Hu(Bu(t2, e2, n)), s = Hu(Bu(t2, e2, i)), a = Hu(Bu(n, i, t2)), o = Hu(Bu(n, i, e2));
    return r !== s && a !== o || (!(0 !== r || !Vu(t2, n, e2)) || (!(0 !== s || !Vu(t2, i, e2)) || (!(0 !== a || !Vu(n, t2, i)) || !(0 !== o || !Vu(n, e2, i)))));
  }
  function Vu(t2, e2, n) {
    return e2.x <= Math.max(t2.x, n.x) && e2.x >= Math.min(t2.x, n.x) && e2.y <= Math.max(t2.y, n.y) && e2.y >= Math.min(t2.y, n.y);
  }
  function Hu(t2) {
    return t2 > 0 ? 1 : t2 < 0 ? -1 : 0;
  }
  function Gu(t2, e2) {
    return Bu(t2.prev, t2, t2.next) < 0 ? Bu(t2, e2, t2.next) >= 0 && Bu(t2, t2.prev, e2) >= 0 : Bu(t2, e2, t2.prev) < 0 || Bu(t2, t2.next, e2) < 0;
  }
  function Wu(t2, e2) {
    const n = new qu(t2.i, t2.x, t2.y), i = new qu(e2.i, e2.x, e2.y), r = t2.next, s = e2.prev;
    return t2.next = e2, e2.prev = t2, n.next = r, r.prev = n, i.next = n, n.prev = i, s.next = i, i.prev = s, i;
  }
  function Xu(t2, e2, n, i) {
    const r = new qu(t2, e2, n);
    return i ? (r.next = i.next, r.prev = i, i.next.prev = r, i.next = r) : (r.prev = r, r.next = r), r;
  }
  function ju(t2) {
    t2.next.prev = t2.prev, t2.prev.next = t2.next, t2.prevZ && (t2.prevZ.nextZ = t2.nextZ), t2.nextZ && (t2.nextZ.prevZ = t2.prevZ);
  }
  function qu(t2, e2, n) {
    this.i = t2, this.x = e2, this.y = n, this.prev = null, this.next = null, this.z = 0, this.prevZ = null, this.nextZ = null, this.steiner = false;
  }
  var Yu = class _Yu {
    static area(t2) {
      const e2 = t2.length;
      let n = 0;
      for (let i = e2 - 1, r = 0; r < e2; i = r++) n += t2[i].x * t2[r].y - t2[r].x * t2[i].y;
      return 0.5 * n;
    }
    static isClockWise(t2) {
      return _Yu.area(t2) < 0;
    }
    static triangulateShape(t2, e2) {
      const n = [], i = [], r = [];
      Zu(t2), Ju(n, t2);
      let s = t2.length;
      e2.forEach(Zu);
      for (let t3 = 0; t3 < e2.length; t3++) i.push(s), s += e2[t3].length, Ju(n, e2[t3]);
      const a = bu(n, i);
      for (let t3 = 0; t3 < a.length; t3 += 3) r.push(a.slice(t3, t3 + 3));
      return r;
    }
  };
  function Zu(t2) {
    const e2 = t2.length;
    e2 > 2 && t2[e2 - 1].equals(t2[0]) && t2.pop();
  }
  function Ju(t2, e2) {
    for (let n = 0; n < e2.length; n++) t2.push(e2[n].x), t2.push(e2[n].y);
  }
  var Ku = class _Ku extends Es {
    constructor(t2 = new Su([new Jn(0.5, 0.5), new Jn(-0.5, 0.5), new Jn(-0.5, -0.5), new Jn(0.5, -0.5)]), e2 = {}) {
      super(), this.type = "ExtrudeGeometry", this.parameters = { shapes: t2, options: e2 }, t2 = Array.isArray(t2) ? t2 : [t2];
      const n = this, i = [], r = [];
      for (let e3 = 0, n2 = t2.length; e3 < n2; e3++) {
        s(t2[e3]);
      }
      function s(t3) {
        const s2 = [], a = void 0 !== e2.curveSegments ? e2.curveSegments : 12, o = void 0 !== e2.steps ? e2.steps : 1, l = void 0 !== e2.depth ? e2.depth : 1;
        let c = void 0 === e2.bevelEnabled || e2.bevelEnabled, h = void 0 !== e2.bevelThickness ? e2.bevelThickness : 0.2, u2 = void 0 !== e2.bevelSize ? e2.bevelSize : h - 0.1, d2 = void 0 !== e2.bevelOffset ? e2.bevelOffset : 0, p2 = void 0 !== e2.bevelSegments ? e2.bevelSegments : 3;
        const m = e2.extrudePath, f = void 0 !== e2.UVGenerator ? e2.UVGenerator : $u;
        let g, v, _, x, y2, M2 = false;
        m && (g = m.getSpacedPoints(o), M2 = true, c = false, v = m.computeFrenetFrames(o, false), _ = new Ci(), x = new Ci(), y2 = new Ci()), c || (p2 = 0, h = 0, u2 = 0, d2 = 0);
        const S2 = t3.extractPoints(a);
        let b = S2.shape;
        const T = S2.holes;
        if (!Yu.isClockWise(b)) {
          b = b.reverse();
          for (let t4 = 0, e3 = T.length; t4 < e3; t4++) {
            const e4 = T[t4];
            Yu.isClockWise(e4) && (T[t4] = e4.reverse());
          }
        }
        const w2 = Yu.triangulateShape(b, T), E2 = b;
        for (let t4 = 0, e3 = T.length; t4 < e3; t4++) {
          const e4 = T[t4];
          b = b.concat(e4);
        }
        function A2(t4, e3, n2) {
          return e3 || console.error("THREE.ExtrudeGeometry: vec does not exist"), t4.clone().addScaledVector(e3, n2);
        }
        const R2 = b.length, C2 = w2.length;
        function I2(t4, e3, n2) {
          let i2, r2, s3;
          const a2 = t4.x - e3.x, o2 = t4.y - e3.y, l2 = n2.x - t4.x, c2 = n2.y - t4.y, h2 = a2 * a2 + o2 * o2, u3 = a2 * c2 - o2 * l2;
          if (Math.abs(u3) > Number.EPSILON) {
            const u4 = Math.sqrt(h2), d3 = Math.sqrt(l2 * l2 + c2 * c2), p3 = e3.x - o2 / u4, m2 = e3.y + a2 / u4, f2 = ((n2.x - c2 / d3 - p3) * c2 - (n2.y + l2 / d3 - m2) * l2) / (a2 * c2 - o2 * l2);
            i2 = p3 + a2 * f2 - t4.x, r2 = m2 + o2 * f2 - t4.y;
            const g2 = i2 * i2 + r2 * r2;
            if (g2 <= 2) return new Jn(i2, r2);
            s3 = Math.sqrt(g2 / 2);
          } else {
            let t5 = false;
            a2 > Number.EPSILON ? l2 > Number.EPSILON && (t5 = true) : a2 < -Number.EPSILON ? l2 < -Number.EPSILON && (t5 = true) : Math.sign(o2) === Math.sign(c2) && (t5 = true), t5 ? (i2 = -o2, r2 = a2, s3 = Math.sqrt(h2)) : (i2 = a2, r2 = o2, s3 = Math.sqrt(h2 / 2));
          }
          return new Jn(i2 / s3, r2 / s3);
        }
        const P2 = [];
        for (let t4 = 0, e3 = E2.length, n2 = e3 - 1, i2 = t4 + 1; t4 < e3; t4++, n2++, i2++) n2 === e3 && (n2 = 0), i2 === e3 && (i2 = 0), P2[t4] = I2(E2[t4], E2[n2], E2[i2]);
        const L2 = [];
        let U2, D2 = P2.concat();
        for (let t4 = 0, e3 = T.length; t4 < e3; t4++) {
          const e4 = T[t4];
          U2 = [];
          for (let t5 = 0, n2 = e4.length, i2 = n2 - 1, r2 = t5 + 1; t5 < n2; t5++, i2++, r2++) i2 === n2 && (i2 = 0), r2 === n2 && (r2 = 0), U2[t5] = I2(e4[t5], e4[i2], e4[r2]);
          L2.push(U2), D2 = D2.concat(U2);
        }
        for (let t4 = 0; t4 < p2; t4++) {
          const e3 = t4 / p2, n2 = h * Math.cos(e3 * Math.PI / 2), i2 = u2 * Math.sin(e3 * Math.PI / 2) + d2;
          for (let t5 = 0, e4 = E2.length; t5 < e4; t5++) {
            const e5 = A2(E2[t5], P2[t5], i2);
            F2(e5.x, e5.y, -n2);
          }
          for (let t5 = 0, e4 = T.length; t5 < e4; t5++) {
            const e5 = T[t5];
            U2 = L2[t5];
            for (let t6 = 0, r2 = e5.length; t6 < r2; t6++) {
              const r3 = A2(e5[t6], U2[t6], i2);
              F2(r3.x, r3.y, -n2);
            }
          }
        }
        const N2 = u2 + d2;
        for (let t4 = 0; t4 < R2; t4++) {
          const e3 = c ? A2(b[t4], D2[t4], N2) : b[t4];
          M2 ? (x.copy(v.normals[0]).multiplyScalar(e3.x), _.copy(v.binormals[0]).multiplyScalar(e3.y), y2.copy(g[0]).add(x).add(_), F2(y2.x, y2.y, y2.z)) : F2(e3.x, e3.y, 0);
        }
        for (let t4 = 1; t4 <= o; t4++) for (let e3 = 0; e3 < R2; e3++) {
          const n2 = c ? A2(b[e3], D2[e3], N2) : b[e3];
          M2 ? (x.copy(v.normals[t4]).multiplyScalar(n2.x), _.copy(v.binormals[t4]).multiplyScalar(n2.y), y2.copy(g[t4]).add(x).add(_), F2(y2.x, y2.y, y2.z)) : F2(n2.x, n2.y, l / o * t4);
        }
        for (let t4 = p2 - 1; t4 >= 0; t4--) {
          const e3 = t4 / p2, n2 = h * Math.cos(e3 * Math.PI / 2), i2 = u2 * Math.sin(e3 * Math.PI / 2) + d2;
          for (let t5 = 0, e4 = E2.length; t5 < e4; t5++) {
            const e5 = A2(E2[t5], P2[t5], i2);
            F2(e5.x, e5.y, l + n2);
          }
          for (let t5 = 0, e4 = T.length; t5 < e4; t5++) {
            const e5 = T[t5];
            U2 = L2[t5];
            for (let t6 = 0, r2 = e5.length; t6 < r2; t6++) {
              const r3 = A2(e5[t6], U2[t6], i2);
              M2 ? F2(r3.x, r3.y + g[o - 1].y, g[o - 1].x + n2) : F2(r3.x, r3.y, l + n2);
            }
          }
        }
        function O2(t4, e3) {
          let n2 = t4.length;
          for (; --n2 >= 0; ) {
            const i2 = n2;
            let r2 = n2 - 1;
            r2 < 0 && (r2 = t4.length - 1);
            for (let t5 = 0, n3 = o + 2 * p2; t5 < n3; t5++) {
              const n4 = R2 * t5, s3 = R2 * (t5 + 1);
              z2(e3 + i2 + n4, e3 + r2 + n4, e3 + r2 + s3, e3 + i2 + s3);
            }
          }
        }
        function F2(t4, e3, n2) {
          s2.push(t4), s2.push(e3), s2.push(n2);
        }
        function B2(t4, e3, r2) {
          k2(t4), k2(e3), k2(r2);
          const s3 = i.length / 3, a2 = f.generateTopUV(n, i, s3 - 3, s3 - 2, s3 - 1);
          V2(a2[0]), V2(a2[1]), V2(a2[2]);
        }
        function z2(t4, e3, r2, s3) {
          k2(t4), k2(e3), k2(s3), k2(e3), k2(r2), k2(s3);
          const a2 = i.length / 3, o2 = f.generateSideWallUV(n, i, a2 - 6, a2 - 3, a2 - 2, a2 - 1);
          V2(o2[0]), V2(o2[1]), V2(o2[3]), V2(o2[1]), V2(o2[2]), V2(o2[3]);
        }
        function k2(t4) {
          i.push(s2[3 * t4 + 0]), i.push(s2[3 * t4 + 1]), i.push(s2[3 * t4 + 2]);
        }
        function V2(t4) {
          r.push(t4.x), r.push(t4.y);
        }
        !(function() {
          const t4 = i.length / 3;
          if (c) {
            let t5 = 0, e3 = R2 * t5;
            for (let t6 = 0; t6 < C2; t6++) {
              const n2 = w2[t6];
              B2(n2[2] + e3, n2[1] + e3, n2[0] + e3);
            }
            t5 = o + 2 * p2, e3 = R2 * t5;
            for (let t6 = 0; t6 < C2; t6++) {
              const n2 = w2[t6];
              B2(n2[0] + e3, n2[1] + e3, n2[2] + e3);
            }
          } else {
            for (let t5 = 0; t5 < C2; t5++) {
              const e3 = w2[t5];
              B2(e3[2], e3[1], e3[0]);
            }
            for (let t5 = 0; t5 < C2; t5++) {
              const e3 = w2[t5];
              B2(e3[0] + R2 * o, e3[1] + R2 * o, e3[2] + R2 * o);
            }
          }
          n.addGroup(t4, i.length / 3 - t4, 0);
        })(), (function() {
          const t4 = i.length / 3;
          let e3 = 0;
          O2(E2, e3), e3 += E2.length;
          for (let t5 = 0, n2 = T.length; t5 < n2; t5++) {
            const n3 = T[t5];
            O2(n3, e3), e3 += n3.length;
          }
          n.addGroup(t4, i.length / 3 - t4, 1);
        })();
      }
      this.setAttribute("position", new _s(i, 3)), this.setAttribute("uv", new _s(r, 2)), this.computeVertexNormals();
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return (function(t3, e2, n) {
        if (n.shapes = [], Array.isArray(t3)) for (let e3 = 0, i = t3.length; e3 < i; e3++) {
          const i2 = t3[e3];
          n.shapes.push(i2.uuid);
        }
        else n.shapes.push(t3.uuid);
        n.options = Object.assign({}, e2), void 0 !== e2.extrudePath && (n.options.extrudePath = e2.extrudePath.toJSON());
        return n;
      })(this.parameters.shapes, this.parameters.options, t2);
    }
    static fromJSON(t2, e2) {
      const n = [];
      for (let i2 = 0, r = t2.shapes.length; i2 < r; i2++) {
        const r2 = e2[t2.shapes[i2]];
        n.push(r2);
      }
      const i = t2.options.extrudePath;
      return void 0 !== i && (t2.options.extrudePath = new ou[i.type]().fromJSON(i)), new _Ku(n, t2.options);
    }
  };
  var $u = { generateTopUV: function(t2, e2, n, i, r) {
    const s = e2[3 * n], a = e2[3 * n + 1], o = e2[3 * i], l = e2[3 * i + 1], c = e2[3 * r], h = e2[3 * r + 1];
    return [new Jn(s, a), new Jn(o, l), new Jn(c, h)];
  }, generateSideWallUV: function(t2, e2, n, i, r, s) {
    const a = e2[3 * n], o = e2[3 * n + 1], l = e2[3 * n + 2], c = e2[3 * i], h = e2[3 * i + 1], u2 = e2[3 * i + 2], d2 = e2[3 * r], p2 = e2[3 * r + 1], m = e2[3 * r + 2], f = e2[3 * s], g = e2[3 * s + 1], v = e2[3 * s + 2];
    return Math.abs(o - h) < Math.abs(a - c) ? [new Jn(a, 1 - l), new Jn(c, 1 - u2), new Jn(d2, 1 - m), new Jn(f, 1 - v)] : [new Jn(o, 1 - l), new Jn(h, 1 - u2), new Jn(p2, 1 - m), new Jn(g, 1 - v)];
  } };
  var Qu = class _Qu extends fu {
    constructor(t2 = 1, e2 = 0) {
      const n = (1 + Math.sqrt(5)) / 2;
      super([-1, n, 0, 1, n, 0, -1, -n, 0, 1, -n, 0, 0, -1, n, 0, 1, n, 0, -1, -n, 0, 1, -n, n, 0, -1, n, 0, 1, -n, 0, -1, -n, 0, 1], [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1], t2, e2), this.type = "IcosahedronGeometry", this.parameters = { radius: t2, detail: e2 };
    }
    static fromJSON(t2) {
      return new _Qu(t2.radius, t2.detail);
    }
  };
  var td = class _td extends fu {
    constructor(t2 = 1, e2 = 0) {
      super([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1], [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2], t2, e2), this.type = "OctahedronGeometry", this.parameters = { radius: t2, detail: e2 };
    }
    static fromJSON(t2) {
      return new _td(t2.radius, t2.detail);
    }
  };
  var ed = class _ed extends Es {
    constructor(t2 = 0.5, e2 = 1, n = 32, i = 1, r = 0, s = 2 * Math.PI) {
      super(), this.type = "RingGeometry", this.parameters = { innerRadius: t2, outerRadius: e2, thetaSegments: n, phiSegments: i, thetaStart: r, thetaLength: s }, n = Math.max(3, n);
      const a = [], o = [], l = [], c = [];
      let h = t2;
      const u2 = (e2 - t2) / (i = Math.max(1, i)), d2 = new Ci(), p2 = new Jn();
      for (let t3 = 0; t3 <= i; t3++) {
        for (let t4 = 0; t4 <= n; t4++) {
          const i2 = r + t4 / n * s;
          d2.x = h * Math.cos(i2), d2.y = h * Math.sin(i2), o.push(d2.x, d2.y, d2.z), l.push(0, 0, 1), p2.x = (d2.x / e2 + 1) / 2, p2.y = (d2.y / e2 + 1) / 2, c.push(p2.x, p2.y);
        }
        h += u2;
      }
      for (let t3 = 0; t3 < i; t3++) {
        const e3 = t3 * (n + 1);
        for (let t4 = 0; t4 < n; t4++) {
          const i2 = t4 + e3, r2 = i2, s2 = i2 + n + 1, o2 = i2 + n + 2, l2 = i2 + 1;
          a.push(r2, s2, l2), a.push(s2, o2, l2);
        }
      }
      this.setIndex(a), this.setAttribute("position", new _s(o, 3)), this.setAttribute("normal", new _s(l, 3)), this.setAttribute("uv", new _s(c, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _ed(t2.innerRadius, t2.outerRadius, t2.thetaSegments, t2.phiSegments, t2.thetaStart, t2.thetaLength);
    }
  };
  var nd = class _nd extends Es {
    constructor(t2 = new Su([new Jn(0, 0.5), new Jn(-0.5, -0.5), new Jn(0.5, -0.5)]), e2 = 12) {
      super(), this.type = "ShapeGeometry", this.parameters = { shapes: t2, curveSegments: e2 };
      const n = [], i = [], r = [], s = [];
      let a = 0, o = 0;
      if (false === Array.isArray(t2)) l(t2);
      else for (let e3 = 0; e3 < t2.length; e3++) l(t2[e3]), this.addGroup(a, o, e3), a += o, o = 0;
      function l(t3) {
        const a2 = i.length / 3, l2 = t3.extractPoints(e2);
        let c = l2.shape;
        const h = l2.holes;
        false === Yu.isClockWise(c) && (c = c.reverse());
        for (let t4 = 0, e3 = h.length; t4 < e3; t4++) {
          const e4 = h[t4];
          true === Yu.isClockWise(e4) && (h[t4] = e4.reverse());
        }
        const u2 = Yu.triangulateShape(c, h);
        for (let t4 = 0, e3 = h.length; t4 < e3; t4++) {
          const e4 = h[t4];
          c = c.concat(e4);
        }
        for (let t4 = 0, e3 = c.length; t4 < e3; t4++) {
          const e4 = c[t4];
          i.push(e4.x, e4.y, 0), r.push(0, 0, 1), s.push(e4.x, e4.y);
        }
        for (let t4 = 0, e3 = u2.length; t4 < e3; t4++) {
          const e4 = u2[t4], i2 = e4[0] + a2, r2 = e4[1] + a2, s2 = e4[2] + a2;
          n.push(i2, r2, s2), o += 3;
        }
      }
      this.setIndex(n), this.setAttribute("position", new _s(i, 3)), this.setAttribute("normal", new _s(r, 3)), this.setAttribute("uv", new _s(s, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return (function(t3, e2) {
        if (e2.shapes = [], Array.isArray(t3)) for (let n = 0, i = t3.length; n < i; n++) {
          const i2 = t3[n];
          e2.shapes.push(i2.uuid);
        }
        else e2.shapes.push(t3.uuid);
        return e2;
      })(this.parameters.shapes, t2);
    }
    static fromJSON(t2, e2) {
      const n = [];
      for (let i = 0, r = t2.shapes.length; i < r; i++) {
        const r2 = e2[t2.shapes[i]];
        n.push(r2);
      }
      return new _nd(n, t2.curveSegments);
    }
  };
  var id = class _id extends Es {
    constructor(t2 = 1, e2 = 32, n = 16, i = 0, r = 2 * Math.PI, s = 0, a = Math.PI) {
      super(), this.type = "SphereGeometry", this.parameters = { radius: t2, widthSegments: e2, heightSegments: n, phiStart: i, phiLength: r, thetaStart: s, thetaLength: a }, e2 = Math.max(3, Math.floor(e2)), n = Math.max(2, Math.floor(n));
      const o = Math.min(s + a, Math.PI);
      let l = 0;
      const c = [], h = new Ci(), u2 = new Ci(), d2 = [], p2 = [], m = [], f = [];
      for (let d3 = 0; d3 <= n; d3++) {
        const g = [], v = d3 / n;
        let _ = 0;
        0 === d3 && 0 === s ? _ = 0.5 / e2 : d3 === n && o === Math.PI && (_ = -0.5 / e2);
        for (let n2 = 0; n2 <= e2; n2++) {
          const o2 = n2 / e2;
          h.x = -t2 * Math.cos(i + o2 * r) * Math.sin(s + v * a), h.y = t2 * Math.cos(s + v * a), h.z = t2 * Math.sin(i + o2 * r) * Math.sin(s + v * a), p2.push(h.x, h.y, h.z), u2.copy(h).normalize(), m.push(u2.x, u2.y, u2.z), f.push(o2 + _, 1 - v), g.push(l++);
        }
        c.push(g);
      }
      for (let t3 = 0; t3 < n; t3++) for (let i2 = 0; i2 < e2; i2++) {
        const e3 = c[t3][i2 + 1], r2 = c[t3][i2], a2 = c[t3 + 1][i2], l2 = c[t3 + 1][i2 + 1];
        (0 !== t3 || s > 0) && d2.push(e3, r2, l2), (t3 !== n - 1 || o < Math.PI) && d2.push(r2, a2, l2);
      }
      this.setIndex(d2), this.setAttribute("position", new _s(p2, 3)), this.setAttribute("normal", new _s(m, 3)), this.setAttribute("uv", new _s(f, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _id(t2.radius, t2.widthSegments, t2.heightSegments, t2.phiStart, t2.phiLength, t2.thetaStart, t2.thetaLength);
    }
  };
  var rd = class _rd extends fu {
    constructor(t2 = 1, e2 = 0) {
      super([1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1], [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1], t2, e2), this.type = "TetrahedronGeometry", this.parameters = { radius: t2, detail: e2 };
    }
    static fromJSON(t2) {
      return new _rd(t2.radius, t2.detail);
    }
  };
  var sd = class _sd extends Es {
    constructor(t2 = 1, e2 = 0.4, n = 12, i = 48, r = 2 * Math.PI) {
      super(), this.type = "TorusGeometry", this.parameters = { radius: t2, tube: e2, radialSegments: n, tubularSegments: i, arc: r }, n = Math.floor(n), i = Math.floor(i);
      const s = [], a = [], o = [], l = [], c = new Ci(), h = new Ci(), u2 = new Ci();
      for (let s2 = 0; s2 <= n; s2++) for (let d2 = 0; d2 <= i; d2++) {
        const p2 = d2 / i * r, m = s2 / n * Math.PI * 2;
        h.x = (t2 + e2 * Math.cos(m)) * Math.cos(p2), h.y = (t2 + e2 * Math.cos(m)) * Math.sin(p2), h.z = e2 * Math.sin(m), a.push(h.x, h.y, h.z), c.x = t2 * Math.cos(p2), c.y = t2 * Math.sin(p2), u2.subVectors(h, c).normalize(), o.push(u2.x, u2.y, u2.z), l.push(d2 / i), l.push(s2 / n);
      }
      for (let t3 = 1; t3 <= n; t3++) for (let e3 = 1; e3 <= i; e3++) {
        const n2 = (i + 1) * t3 + e3 - 1, r2 = (i + 1) * (t3 - 1) + e3 - 1, a2 = (i + 1) * (t3 - 1) + e3, o2 = (i + 1) * t3 + e3;
        s.push(n2, r2, o2), s.push(r2, a2, o2);
      }
      this.setIndex(s), this.setAttribute("position", new _s(a, 3)), this.setAttribute("normal", new _s(o, 3)), this.setAttribute("uv", new _s(l, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _sd(t2.radius, t2.tube, t2.radialSegments, t2.tubularSegments, t2.arc);
    }
  };
  var ad = class _ad extends Es {
    constructor(t2 = 1, e2 = 0.4, n = 64, i = 8, r = 2, s = 3) {
      super(), this.type = "TorusKnotGeometry", this.parameters = { radius: t2, tube: e2, tubularSegments: n, radialSegments: i, p: r, q: s }, n = Math.floor(n), i = Math.floor(i);
      const a = [], o = [], l = [], c = [], h = new Ci(), u2 = new Ci(), d2 = new Ci(), p2 = new Ci(), m = new Ci(), f = new Ci(), g = new Ci();
      for (let a2 = 0; a2 <= n; ++a2) {
        const _ = a2 / n * r * Math.PI * 2;
        v(_, r, s, t2, d2), v(_ + 0.01, r, s, t2, p2), f.subVectors(p2, d2), g.addVectors(p2, d2), m.crossVectors(f, g), g.crossVectors(m, f), m.normalize(), g.normalize();
        for (let t3 = 0; t3 <= i; ++t3) {
          const r2 = t3 / i * Math.PI * 2, s2 = -e2 * Math.cos(r2), p3 = e2 * Math.sin(r2);
          h.x = d2.x + (s2 * g.x + p3 * m.x), h.y = d2.y + (s2 * g.y + p3 * m.y), h.z = d2.z + (s2 * g.z + p3 * m.z), o.push(h.x, h.y, h.z), u2.subVectors(h, d2).normalize(), l.push(u2.x, u2.y, u2.z), c.push(a2 / n), c.push(t3 / i);
        }
      }
      for (let t3 = 1; t3 <= n; t3++) for (let e3 = 1; e3 <= i; e3++) {
        const n2 = (i + 1) * (t3 - 1) + (e3 - 1), r2 = (i + 1) * t3 + (e3 - 1), s2 = (i + 1) * t3 + e3, o2 = (i + 1) * (t3 - 1) + e3;
        a.push(n2, r2, o2), a.push(r2, s2, o2);
      }
      function v(t3, e3, n2, i2, r2) {
        const s2 = Math.cos(t3), a2 = Math.sin(t3), o2 = n2 / e3 * t3, l2 = Math.cos(o2);
        r2.x = i2 * (2 + l2) * 0.5 * s2, r2.y = i2 * (2 + l2) * a2 * 0.5, r2.z = i2 * Math.sin(o2) * 0.5;
      }
      this.setIndex(a), this.setAttribute("position", new _s(o, 3)), this.setAttribute("normal", new _s(l, 3)), this.setAttribute("uv", new _s(c, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    static fromJSON(t2) {
      return new _ad(t2.radius, t2.tube, t2.tubularSegments, t2.radialSegments, t2.p, t2.q);
    }
  };
  var od = class _od extends Es {
    constructor(t2 = new su(new Ci(-1, -1, 0), new Ci(-1, 1, 0), new Ci(1, 1, 0)), e2 = 64, n = 1, i = 8, r = false) {
      super(), this.type = "TubeGeometry", this.parameters = { path: t2, tubularSegments: e2, radius: n, radialSegments: i, closed: r };
      const s = t2.computeFrenetFrames(e2, r);
      this.tangents = s.tangents, this.normals = s.normals, this.binormals = s.binormals;
      const a = new Ci(), o = new Ci(), l = new Jn();
      let c = new Ci();
      const h = [], u2 = [], d2 = [], p2 = [];
      function m(r2) {
        c = t2.getPointAt(r2 / e2, c);
        const l2 = s.normals[r2], d3 = s.binormals[r2];
        for (let t3 = 0; t3 <= i; t3++) {
          const e3 = t3 / i * Math.PI * 2, r3 = Math.sin(e3), s2 = -Math.cos(e3);
          o.x = s2 * l2.x + r3 * d3.x, o.y = s2 * l2.y + r3 * d3.y, o.z = s2 * l2.z + r3 * d3.z, o.normalize(), u2.push(o.x, o.y, o.z), a.x = c.x + n * o.x, a.y = c.y + n * o.y, a.z = c.z + n * o.z, h.push(a.x, a.y, a.z);
        }
      }
      !(function() {
        for (let t3 = 0; t3 < e2; t3++) m(t3);
        m(false === r ? e2 : 0), (function() {
          for (let t3 = 0; t3 <= e2; t3++) for (let n2 = 0; n2 <= i; n2++) l.x = t3 / e2, l.y = n2 / i, d2.push(l.x, l.y);
        })(), (function() {
          for (let t3 = 1; t3 <= e2; t3++) for (let e3 = 1; e3 <= i; e3++) {
            const n2 = (i + 1) * (t3 - 1) + (e3 - 1), r2 = (i + 1) * t3 + (e3 - 1), s2 = (i + 1) * t3 + e3, a2 = (i + 1) * (t3 - 1) + e3;
            p2.push(n2, r2, a2), p2.push(r2, s2, a2);
          }
        })();
      })(), this.setIndex(p2), this.setAttribute("position", new _s(h, 3)), this.setAttribute("normal", new _s(u2, 3)), this.setAttribute("uv", new _s(d2, 2));
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
    toJSON() {
      const t2 = super.toJSON();
      return t2.path = this.parameters.path.toJSON(), t2;
    }
    static fromJSON(t2) {
      return new _od(new ou[t2.path.type]().fromJSON(t2.path), t2.tubularSegments, t2.radius, t2.radialSegments, t2.closed);
    }
  };
  var ld = class extends Es {
    constructor(t2 = null) {
      if (super(), this.type = "WireframeGeometry", this.parameters = { geometry: t2 }, null !== t2) {
        const e2 = [], n = /* @__PURE__ */ new Set(), i = new Ci(), r = new Ci();
        if (null !== t2.index) {
          const s = t2.attributes.position, a = t2.index;
          let o = t2.groups;
          0 === o.length && (o = [{ start: 0, count: a.count, materialIndex: 0 }]);
          for (let t3 = 0, l = o.length; t3 < l; ++t3) {
            const l2 = o[t3], c = l2.start;
            for (let t4 = c, o2 = c + l2.count; t4 < o2; t4 += 3) for (let o3 = 0; o3 < 3; o3++) {
              const l3 = a.getX(t4 + o3), c2 = a.getX(t4 + (o3 + 1) % 3);
              i.fromBufferAttribute(s, l3), r.fromBufferAttribute(s, c2), true === cd(i, r, n) && (e2.push(i.x, i.y, i.z), e2.push(r.x, r.y, r.z));
            }
          }
        } else {
          const s = t2.attributes.position;
          for (let t3 = 0, a = s.count / 3; t3 < a; t3++) for (let a2 = 0; a2 < 3; a2++) {
            const o = 3 * t3 + a2, l = 3 * t3 + (a2 + 1) % 3;
            i.fromBufferAttribute(s, o), r.fromBufferAttribute(s, l), true === cd(i, r, n) && (e2.push(i.x, i.y, i.z), e2.push(r.x, r.y, r.z));
          }
        }
        this.setAttribute("position", new _s(e2, 3));
      }
    }
    copy(t2) {
      return super.copy(t2), this.parameters = Object.assign({}, t2.parameters), this;
    }
  };
  function cd(t2, e2, n) {
    const i = `${t2.x},${t2.y},${t2.z}-${e2.x},${e2.y},${e2.z}`, r = `${e2.x},${e2.y},${e2.z}-${t2.x},${t2.y},${t2.z}`;
    return true !== n.has(i) && true !== n.has(r) && (n.add(i), n.add(r), true);
  }
  var hd = Object.freeze({ __proto__: null, BoxGeometry: ks, CapsuleGeometry: uu, CircleGeometry: du, ConeGeometry: mu, CylinderGeometry: pu, DodecahedronGeometry: gu, EdgesGeometry: Mu, ExtrudeGeometry: Ku, IcosahedronGeometry: Qu, LatheGeometry: hu, OctahedronGeometry: td, PlaneGeometry: ha, PolyhedronGeometry: fu, RingGeometry: ed, ShapeGeometry: nd, SphereGeometry: id, TetrahedronGeometry: rd, TorusGeometry: sd, TorusKnotGeometry: ad, TubeGeometry: od, WireframeGeometry: ld });
  function Md(t2, e2, n) {
    return !t2 || !n && t2.constructor === e2 ? t2 : "number" == typeof e2.BYTES_PER_ELEMENT ? new e2(t2) : Array.prototype.slice.call(t2);
  }
  function Sd(t2) {
    return ArrayBuffer.isView(t2) && !(t2 instanceof DataView);
  }
  var Ad = class {
    constructor(t2, e2, n, i) {
      this.parameterPositions = t2, this._cachedIndex = 0, this.resultBuffer = void 0 !== i ? i : new e2.constructor(n), this.sampleValues = e2, this.valueSize = n, this.settings = null, this.DefaultSettings_ = {};
    }
    evaluate(t2) {
      const e2 = this.parameterPositions;
      let n = this._cachedIndex, i = e2[n], r = e2[n - 1];
      t: {
        e: {
          let s;
          n: {
            i: if (!(t2 < i)) {
              for (let s2 = n + 2; ; ) {
                if (void 0 === i) {
                  if (t2 < r) break i;
                  return n = e2.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
                }
                if (n === s2) break;
                if (r = i, i = e2[++n], t2 < i) break e;
              }
              s = e2.length;
              break n;
            }
            if (t2 >= r) break t;
            {
              const a = e2[1];
              t2 < a && (n = 2, r = a);
              for (let s2 = n - 2; ; ) {
                if (void 0 === r) return this._cachedIndex = 0, this.copySampleValue_(0);
                if (n === s2) break;
                if (i = r, r = e2[--n - 1], t2 >= r) break e;
              }
              s = n, n = 0;
            }
          }
          for (; n < s; ) {
            const i2 = n + s >>> 1;
            t2 < e2[i2] ? s = i2 : n = i2 + 1;
          }
          if (i = e2[n], r = e2[n - 1], void 0 === r) return this._cachedIndex = 0, this.copySampleValue_(0);
          if (void 0 === i) return n = e2.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
        }
        this._cachedIndex = n, this.intervalChanged_(n, r, i);
      }
      return this.interpolate_(n, r, t2, i);
    }
    getSettings_() {
      return this.settings || this.DefaultSettings_;
    }
    copySampleValue_(t2) {
      const e2 = this.resultBuffer, n = this.sampleValues, i = this.valueSize, r = t2 * i;
      for (let t3 = 0; t3 !== i; ++t3) e2[t3] = n[r + t3];
      return e2;
    }
    interpolate_() {
      throw new Error("call to abstract method");
    }
    intervalChanged_() {
    }
  };
  var Rd = class extends Ad {
    constructor(t2, e2, n, i) {
      super(t2, e2, n, i), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = { endingStart: Ne, endingEnd: Ne };
    }
    intervalChanged_(t2, e2, n) {
      const i = this.parameterPositions;
      let r = t2 - 2, s = t2 + 1, a = i[r], o = i[s];
      if (void 0 === a) switch (this.getSettings_().endingStart) {
        case Oe:
          r = t2, a = 2 * e2 - n;
          break;
        case Fe:
          r = i.length - 2, a = e2 + i[r] - i[r + 1];
          break;
        default:
          r = t2, a = n;
      }
      if (void 0 === o) switch (this.getSettings_().endingEnd) {
        case Oe:
          s = t2, o = 2 * n - e2;
          break;
        case Fe:
          s = 1, o = n + i[1] - i[0];
          break;
        default:
          s = t2 - 1, o = e2;
      }
      const l = 0.5 * (n - e2), c = this.valueSize;
      this._weightPrev = l / (e2 - a), this._weightNext = l / (o - n), this._offsetPrev = r * c, this._offsetNext = s * c;
    }
    interpolate_(t2, e2, n, i) {
      const r = this.resultBuffer, s = this.sampleValues, a = this.valueSize, o = t2 * a, l = o - a, c = this._offsetPrev, h = this._offsetNext, u2 = this._weightPrev, d2 = this._weightNext, p2 = (n - e2) / (i - e2), m = p2 * p2, f = m * p2, g = -u2 * f + 2 * u2 * m - u2 * p2, v = (1 + u2) * f + (-1.5 - 2 * u2) * m + (-0.5 + u2) * p2 + 1, _ = (-1 - d2) * f + (1.5 + d2) * m + 0.5 * p2, x = d2 * f - d2 * m;
      for (let t3 = 0; t3 !== a; ++t3) r[t3] = g * s[c + t3] + v * s[l + t3] + _ * s[o + t3] + x * s[h + t3];
      return r;
    }
  };
  var Cd = class extends Ad {
    constructor(t2, e2, n, i) {
      super(t2, e2, n, i);
    }
    interpolate_(t2, e2, n, i) {
      const r = this.resultBuffer, s = this.sampleValues, a = this.valueSize, o = t2 * a, l = o - a, c = (n - e2) / (i - e2), h = 1 - c;
      for (let t3 = 0; t3 !== a; ++t3) r[t3] = s[l + t3] * h + s[o + t3] * c;
      return r;
    }
  };
  var Id = class extends Ad {
    constructor(t2, e2, n, i) {
      super(t2, e2, n, i);
    }
    interpolate_(t2) {
      return this.copySampleValue_(t2 - 1);
    }
  };
  var Pd = class {
    constructor(t2, e2, n, i) {
      if (void 0 === t2) throw new Error("THREE.KeyframeTrack: track name is undefined");
      if (void 0 === e2 || 0 === e2.length) throw new Error("THREE.KeyframeTrack: no keyframes in track named " + t2);
      this.name = t2, this.times = Md(e2, this.TimeBufferType), this.values = Md(n, this.ValueBufferType), this.setInterpolation(i || this.DefaultInterpolation);
    }
    static toJSON(t2) {
      const e2 = t2.constructor;
      let n;
      if (e2.toJSON !== this.toJSON) n = e2.toJSON(t2);
      else {
        n = { name: t2.name, times: Md(t2.times, Array), values: Md(t2.values, Array) };
        const e3 = t2.getInterpolation();
        e3 !== t2.DefaultInterpolation && (n.interpolation = e3);
      }
      return n.type = t2.ValueTypeName, n;
    }
    InterpolantFactoryMethodDiscrete(t2) {
      return new Id(this.times, this.values, this.getValueSize(), t2);
    }
    InterpolantFactoryMethodLinear(t2) {
      return new Cd(this.times, this.values, this.getValueSize(), t2);
    }
    InterpolantFactoryMethodSmooth(t2) {
      return new Rd(this.times, this.values, this.getValueSize(), t2);
    }
    setInterpolation(t2) {
      let e2;
      switch (t2) {
        case Le:
          e2 = this.InterpolantFactoryMethodDiscrete;
          break;
        case Ue:
          e2 = this.InterpolantFactoryMethodLinear;
          break;
        case De:
          e2 = this.InterpolantFactoryMethodSmooth;
      }
      if (void 0 === e2) {
        const e3 = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
        if (void 0 === this.createInterpolant) {
          if (t2 === this.DefaultInterpolation) throw new Error(e3);
          this.setInterpolation(this.DefaultInterpolation);
        }
        return console.warn("THREE.KeyframeTrack:", e3), this;
      }
      return this.createInterpolant = e2, this;
    }
    getInterpolation() {
      switch (this.createInterpolant) {
        case this.InterpolantFactoryMethodDiscrete:
          return Le;
        case this.InterpolantFactoryMethodLinear:
          return Ue;
        case this.InterpolantFactoryMethodSmooth:
          return De;
      }
    }
    getValueSize() {
      return this.values.length / this.times.length;
    }
    shift(t2) {
      if (0 !== t2) {
        const e2 = this.times;
        for (let n = 0, i = e2.length; n !== i; ++n) e2[n] += t2;
      }
      return this;
    }
    scale(t2) {
      if (1 !== t2) {
        const e2 = this.times;
        for (let n = 0, i = e2.length; n !== i; ++n) e2[n] *= t2;
      }
      return this;
    }
    trim(t2, e2) {
      const n = this.times, i = n.length;
      let r = 0, s = i - 1;
      for (; r !== i && n[r] < t2; ) ++r;
      for (; -1 !== s && n[s] > e2; ) --s;
      if (++s, 0 !== r || s !== i) {
        r >= s && (s = Math.max(s, 1), r = s - 1);
        const t3 = this.getValueSize();
        this.times = n.slice(r, s), this.values = this.values.slice(r * t3, s * t3);
      }
      return this;
    }
    validate() {
      let t2 = true;
      const e2 = this.getValueSize();
      e2 - Math.floor(e2) != 0 && (console.error("THREE.KeyframeTrack: Invalid value size in track.", this), t2 = false);
      const n = this.times, i = this.values, r = n.length;
      0 === r && (console.error("THREE.KeyframeTrack: Track is empty.", this), t2 = false);
      let s = null;
      for (let e3 = 0; e3 !== r; e3++) {
        const i2 = n[e3];
        if ("number" == typeof i2 && isNaN(i2)) {
          console.error("THREE.KeyframeTrack: Time is not a valid number.", this, e3, i2), t2 = false;
          break;
        }
        if (null !== s && s > i2) {
          console.error("THREE.KeyframeTrack: Out of order keys.", this, e3, i2, s), t2 = false;
          break;
        }
        s = i2;
      }
      if (void 0 !== i && Sd(i)) for (let e3 = 0, n2 = i.length; e3 !== n2; ++e3) {
        const n3 = i[e3];
        if (isNaN(n3)) {
          console.error("THREE.KeyframeTrack: Value is not a valid number.", this, e3, n3), t2 = false;
          break;
        }
      }
      return t2;
    }
    optimize() {
      const t2 = this.times.slice(), e2 = this.values.slice(), n = this.getValueSize(), i = this.getInterpolation() === De, r = t2.length - 1;
      let s = 1;
      for (let a = 1; a < r; ++a) {
        let r2 = false;
        const o = t2[a];
        if (o !== t2[a + 1] && (1 !== a || o !== t2[0])) if (i) r2 = true;
        else {
          const t3 = a * n, i2 = t3 - n, s2 = t3 + n;
          for (let a2 = 0; a2 !== n; ++a2) {
            const n2 = e2[t3 + a2];
            if (n2 !== e2[i2 + a2] || n2 !== e2[s2 + a2]) {
              r2 = true;
              break;
            }
          }
        }
        if (r2) {
          if (a !== s) {
            t2[s] = t2[a];
            const i2 = a * n, r3 = s * n;
            for (let t3 = 0; t3 !== n; ++t3) e2[r3 + t3] = e2[i2 + t3];
          }
          ++s;
        }
      }
      if (r > 0) {
        t2[s] = t2[r];
        for (let t3 = r * n, i2 = s * n, a = 0; a !== n; ++a) e2[i2 + a] = e2[t3 + a];
        ++s;
      }
      return s !== t2.length ? (this.times = t2.slice(0, s), this.values = e2.slice(0, s * n)) : (this.times = t2, this.values = e2), this;
    }
    clone() {
      const t2 = this.times.slice(), e2 = this.values.slice(), n = new (0, this.constructor)(this.name, t2, e2);
      return n.createInterpolant = this.createInterpolant, n;
    }
  };
  Pd.prototype.TimeBufferType = Float32Array, Pd.prototype.ValueBufferType = Float32Array, Pd.prototype.DefaultInterpolation = Ue;
  var Ld = class extends Pd {
    constructor(t2, e2, n) {
      super(t2, e2, n);
    }
  };
  Ld.prototype.ValueTypeName = "bool", Ld.prototype.ValueBufferType = Array, Ld.prototype.DefaultInterpolation = Le, Ld.prototype.InterpolantFactoryMethodLinear = void 0, Ld.prototype.InterpolantFactoryMethodSmooth = void 0;
  var Ud = class extends Pd {
  };
  Ud.prototype.ValueTypeName = "color";
  var Dd = class extends Pd {
  };
  Dd.prototype.ValueTypeName = "number";
  var Nd = class extends Ad {
    constructor(t2, e2, n, i) {
      super(t2, e2, n, i);
    }
    interpolate_(t2, e2, n, i) {
      const r = this.resultBuffer, s = this.sampleValues, a = this.valueSize, o = (n - e2) / (i - e2);
      let l = t2 * a;
      for (let t3 = l + a; l !== t3; l += 4) Ri.slerpFlat(r, 0, s, l - a, s, l, o);
      return r;
    }
  };
  var Od = class extends Pd {
    InterpolantFactoryMethodLinear(t2) {
      return new Nd(this.times, this.values, this.getValueSize(), t2);
    }
  };
  Od.prototype.ValueTypeName = "quaternion", Od.prototype.InterpolantFactoryMethodSmooth = void 0;
  var Fd = class extends Pd {
    constructor(t2, e2, n) {
      super(t2, e2, n);
    }
  };
  Fd.prototype.ValueTypeName = "string", Fd.prototype.ValueBufferType = Array, Fd.prototype.DefaultInterpolation = Le, Fd.prototype.InterpolantFactoryMethodLinear = void 0, Fd.prototype.InterpolantFactoryMethodSmooth = void 0;
  var Bd = class extends Pd {
  };
  Bd.prototype.ValueTypeName = "vector";
  var Hd = class {
    constructor(t2, e2, n) {
      const i = this;
      let r, s = false, a = 0, o = 0;
      const l = [];
      this.onStart = void 0, this.onLoad = t2, this.onProgress = e2, this.onError = n, this.itemStart = function(t3) {
        o++, false === s && void 0 !== i.onStart && i.onStart(t3, a, o), s = true;
      }, this.itemEnd = function(t3) {
        a++, void 0 !== i.onProgress && i.onProgress(t3, a, o), a === o && (s = false, void 0 !== i.onLoad && i.onLoad());
      }, this.itemError = function(t3) {
        void 0 !== i.onError && i.onError(t3);
      }, this.resolveURL = function(t3) {
        return r ? r(t3) : t3;
      }, this.setURLModifier = function(t3) {
        return r = t3, this;
      }, this.addHandler = function(t3, e3) {
        return l.push(t3, e3), this;
      }, this.removeHandler = function(t3) {
        const e3 = l.indexOf(t3);
        return -1 !== e3 && l.splice(e3, 2), this;
      }, this.getHandler = function(t3) {
        for (let e3 = 0, n2 = l.length; e3 < n2; e3 += 2) {
          const n3 = l[e3], i2 = l[e3 + 1];
          if (n3.global && (n3.lastIndex = 0), n3.test(t3)) return i2;
        }
        return null;
      };
    }
  };
  var Gd = new Hd();
  var Wd = class {
    constructor(t2) {
      this.manager = void 0 !== t2 ? t2 : Gd, this.crossOrigin = "anonymous", this.withCredentials = false, this.path = "", this.resourcePath = "", this.requestHeader = {};
    }
    load() {
    }
    loadAsync(t2, e2) {
      const n = this;
      return new Promise((function(i, r) {
        n.load(t2, i, e2, r);
      }));
    }
    parse() {
    }
    setCrossOrigin(t2) {
      return this.crossOrigin = t2, this;
    }
    setWithCredentials(t2) {
      return this.withCredentials = t2, this;
    }
    setPath(t2) {
      return this.path = t2, this;
    }
    setResourcePath(t2) {
      return this.resourcePath = t2, this;
    }
    setRequestHeader(t2) {
      return this.requestHeader = t2, this;
    }
  };
  Wd.DEFAULT_MATERIAL_NAME = "__DEFAULT";
  var np = new sr();
  var ip = new Ci();
  var rp = new Ci();
  var lp = new sr();
  var cp = new Ci();
  var hp = new Ci();
  var Pp = new sr();
  var Lp = new sr();
  var Up = new sr();
  var Fp = new Ci();
  var Bp = new Ri();
  var zp = new Ci();
  var kp = new Ci();
  var Gp = new Ci();
  var Wp = new Ri();
  var Xp = new Ci();
  var jp = new Ci();
  var Jp = "\\[\\]\\.:\\/";
  var Kp = new RegExp("[" + Jp + "]", "g");
  var $p = "[^" + Jp + "]";
  var Qp = "[^" + Jp.replace("\\.", "") + "]";
  var tm = new RegExp("^" + /((?:WC+[\/:])*)/.source.replace("WC", $p) + /(WCOD+)?/.source.replace("WCOD", Qp) + /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC", $p) + /\.(WC+)(?:\[(.+)\])?/.source.replace("WC", $p) + "$");
  var em = ["material", "materials", "bones", "map"];
  var nm = class _nm {
    constructor(t2, e2, n) {
      this.path = e2, this.parsedPath = n || _nm.parseTrackName(e2), this.node = _nm.findNode(t2, this.parsedPath.nodeName), this.rootNode = t2, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
    }
    static create(t2, e2, n) {
      return t2 && t2.isAnimationObjectGroup ? new _nm.Composite(t2, e2, n) : new _nm(t2, e2, n);
    }
    static sanitizeNodeName(t2) {
      return t2.replace(/\s/g, "_").replace(Kp, "");
    }
    static parseTrackName(t2) {
      const e2 = tm.exec(t2);
      if (null === e2) throw new Error("PropertyBinding: Cannot parse trackName: " + t2);
      const n = { nodeName: e2[2], objectName: e2[3], objectIndex: e2[4], propertyName: e2[5], propertyIndex: e2[6] }, i = n.nodeName && n.nodeName.lastIndexOf(".");
      if (void 0 !== i && -1 !== i) {
        const t3 = n.nodeName.substring(i + 1);
        -1 !== em.indexOf(t3) && (n.nodeName = n.nodeName.substring(0, i), n.objectName = t3);
      }
      if (null === n.propertyName || 0 === n.propertyName.length) throw new Error("PropertyBinding: can not parse propertyName from trackName: " + t2);
      return n;
    }
    static findNode(t2, e2) {
      if (void 0 === e2 || "" === e2 || "." === e2 || -1 === e2 || e2 === t2.name || e2 === t2.uuid) return t2;
      if (t2.skeleton) {
        const n = t2.skeleton.getBoneByName(e2);
        if (void 0 !== n) return n;
      }
      if (t2.children) {
        const n = function(t3) {
          for (let i2 = 0; i2 < t3.length; i2++) {
            const r = t3[i2];
            if (r.name === e2 || r.uuid === e2) return r;
            const s = n(r.children);
            if (s) return s;
          }
          return null;
        }, i = n(t2.children);
        if (i) return i;
      }
      return null;
    }
    _getValue_unavailable() {
    }
    _setValue_unavailable() {
    }
    _getValue_direct(t2, e2) {
      t2[e2] = this.targetObject[this.propertyName];
    }
    _getValue_array(t2, e2) {
      const n = this.resolvedProperty;
      for (let i = 0, r = n.length; i !== r; ++i) t2[e2++] = n[i];
    }
    _getValue_arrayElement(t2, e2) {
      t2[e2] = this.resolvedProperty[this.propertyIndex];
    }
    _getValue_toArray(t2, e2) {
      this.resolvedProperty.toArray(t2, e2);
    }
    _setValue_direct(t2, e2) {
      this.targetObject[this.propertyName] = t2[e2];
    }
    _setValue_direct_setNeedsUpdate(t2, e2) {
      this.targetObject[this.propertyName] = t2[e2], this.targetObject.needsUpdate = true;
    }
    _setValue_direct_setMatrixWorldNeedsUpdate(t2, e2) {
      this.targetObject[this.propertyName] = t2[e2], this.targetObject.matrixWorldNeedsUpdate = true;
    }
    _setValue_array(t2, e2) {
      const n = this.resolvedProperty;
      for (let i = 0, r = n.length; i !== r; ++i) n[i] = t2[e2++];
    }
    _setValue_array_setNeedsUpdate(t2, e2) {
      const n = this.resolvedProperty;
      for (let i = 0, r = n.length; i !== r; ++i) n[i] = t2[e2++];
      this.targetObject.needsUpdate = true;
    }
    _setValue_array_setMatrixWorldNeedsUpdate(t2, e2) {
      const n = this.resolvedProperty;
      for (let i = 0, r = n.length; i !== r; ++i) n[i] = t2[e2++];
      this.targetObject.matrixWorldNeedsUpdate = true;
    }
    _setValue_arrayElement(t2, e2) {
      this.resolvedProperty[this.propertyIndex] = t2[e2];
    }
    _setValue_arrayElement_setNeedsUpdate(t2, e2) {
      this.resolvedProperty[this.propertyIndex] = t2[e2], this.targetObject.needsUpdate = true;
    }
    _setValue_arrayElement_setMatrixWorldNeedsUpdate(t2, e2) {
      this.resolvedProperty[this.propertyIndex] = t2[e2], this.targetObject.matrixWorldNeedsUpdate = true;
    }
    _setValue_fromArray(t2, e2) {
      this.resolvedProperty.fromArray(t2, e2);
    }
    _setValue_fromArray_setNeedsUpdate(t2, e2) {
      this.resolvedProperty.fromArray(t2, e2), this.targetObject.needsUpdate = true;
    }
    _setValue_fromArray_setMatrixWorldNeedsUpdate(t2, e2) {
      this.resolvedProperty.fromArray(t2, e2), this.targetObject.matrixWorldNeedsUpdate = true;
    }
    _getValue_unbound(t2, e2) {
      this.bind(), this.getValue(t2, e2);
    }
    _setValue_unbound(t2, e2) {
      this.bind(), this.setValue(t2, e2);
    }
    bind() {
      let t2 = this.node;
      const e2 = this.parsedPath, n = e2.objectName, i = e2.propertyName;
      let r = e2.propertyIndex;
      if (t2 || (t2 = _nm.findNode(this.rootNode, e2.nodeName), this.node = t2), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !t2) return void console.warn("THREE.PropertyBinding: No target node found for track: " + this.path + ".");
      if (n) {
        let i2 = e2.objectIndex;
        switch (n) {
          case "materials":
            if (!t2.material) return void console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
            if (!t2.material.materials) return void console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
            t2 = t2.material.materials;
            break;
          case "bones":
            if (!t2.skeleton) return void console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
            t2 = t2.skeleton.bones;
            for (let e3 = 0; e3 < t2.length; e3++) if (t2[e3].name === i2) {
              i2 = e3;
              break;
            }
            break;
          case "map":
            if ("map" in t2) {
              t2 = t2.map;
              break;
            }
            if (!t2.material) return void console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
            if (!t2.material.map) return void console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
            t2 = t2.material.map;
            break;
          default:
            if (void 0 === t2[n]) return void console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.", this);
            t2 = t2[n];
        }
        if (void 0 !== i2) {
          if (void 0 === t2[i2]) return void console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, t2);
          t2 = t2[i2];
        }
      }
      const s = t2[i];
      if (void 0 === s) {
        const n2 = e2.nodeName;
        return void console.error("THREE.PropertyBinding: Trying to update property for track: " + n2 + "." + i + " but it wasn't found.", t2);
      }
      let a = this.Versioning.None;
      this.targetObject = t2, void 0 !== t2.needsUpdate ? a = this.Versioning.NeedsUpdate : void 0 !== t2.matrixWorldNeedsUpdate && (a = this.Versioning.MatrixWorldNeedsUpdate);
      let o = this.BindingType.Direct;
      if (void 0 !== r) {
        if ("morphTargetInfluences" === i) {
          if (!t2.geometry) return void console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
          if (!t2.geometry.morphAttributes) return void console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
          void 0 !== t2.morphTargetDictionary[r] && (r = t2.morphTargetDictionary[r]);
        }
        o = this.BindingType.ArrayElement, this.resolvedProperty = s, this.propertyIndex = r;
      } else void 0 !== s.fromArray && void 0 !== s.toArray ? (o = this.BindingType.HasFromToArray, this.resolvedProperty = s) : Array.isArray(s) ? (o = this.BindingType.EntireArray, this.resolvedProperty = s) : this.propertyName = i;
      this.getValue = this.GetterByBindingType[o], this.setValue = this.SetterByBindingTypeAndVersioning[o][a];
    }
    unbind() {
      this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
    }
  };
  nm.Composite = class {
    constructor(t2, e2, n) {
      const i = n || nm.parseTrackName(e2);
      this._targetGroup = t2, this._bindings = t2.subscribe_(e2, i);
    }
    getValue(t2, e2) {
      this.bind();
      const n = this._targetGroup.nCachedObjects_, i = this._bindings[n];
      void 0 !== i && i.getValue(t2, e2);
    }
    setValue(t2, e2) {
      const n = this._bindings;
      for (let i = this._targetGroup.nCachedObjects_, r = n.length; i !== r; ++i) n[i].setValue(t2, e2);
    }
    bind() {
      const t2 = this._bindings;
      for (let e2 = this._targetGroup.nCachedObjects_, n = t2.length; e2 !== n; ++e2) t2[e2].bind();
    }
    unbind() {
      const t2 = this._bindings;
      for (let e2 = this._targetGroup.nCachedObjects_, n = t2.length; e2 !== n; ++e2) t2[e2].unbind();
    }
  }, nm.prototype.BindingType = { Direct: 0, EntireArray: 1, ArrayElement: 2, HasFromToArray: 3 }, nm.prototype.Versioning = { None: 0, NeedsUpdate: 1, MatrixWorldNeedsUpdate: 2 }, nm.prototype.GetterByBindingType = [nm.prototype._getValue_direct, nm.prototype._getValue_array, nm.prototype._getValue_arrayElement, nm.prototype._getValue_toArray], nm.prototype.SetterByBindingTypeAndVersioning = [[nm.prototype._setValue_direct, nm.prototype._setValue_direct_setNeedsUpdate, nm.prototype._setValue_direct_setMatrixWorldNeedsUpdate], [nm.prototype._setValue_array, nm.prototype._setValue_array_setNeedsUpdate, nm.prototype._setValue_array_setMatrixWorldNeedsUpdate], [nm.prototype._setValue_arrayElement, nm.prototype._setValue_arrayElement_setNeedsUpdate, nm.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate], [nm.prototype._setValue_fromArray, nm.prototype._setValue_fromArray_setNeedsUpdate, nm.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];
  var sm = new Float32Array(1);
  var dm = new sr();
  var xm = new Jn();
  var Mm = new Ci();
  var Sm = new Ci();
  var Tm = new Ci();
  var Em = new Ci();
  var Am = new sr();
  var Rm = new sr();
  var Lm = new Ci();
  var Um = new Kr();
  var Dm = new Kr();
  var Bm = new Ci();
  var zm = new Ci();
  var km = new Ci();
  var Hm = new Ci();
  var Gm = new js();
  var jm = new Li();
  var Jm = new Ci();
  "undefined" != typeof __THREE_DEVTOOLS__ && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: { revision: t } })), "undefined" != typeof window && (window.__THREE__ ? console.warn("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = t);

  // lib/blotter/index.js
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
    const p2 = ensurePropertyValues(properties);
    const top = p2.paddingTop || p2.padding;
    const right = p2.paddingRight || p2.padding;
    const bottom = p2.paddingBottom || p2.padding;
    const left = p2.paddingLeft || p2.padding;
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
    const p2 = ensurePropertyValues(properties);
    const el2 = document.createElement("span");
    el2.textContent = textValue;
    el2.style.display = "inline-block";
    el2.style.fontFamily = p2.family;
    el2.style.fontSize = `${p2.size}px`;
    el2.style.fontWeight = String(p2.weight);
    el2.style.fontStyle = p2.style;
    el2.style.lineHeight = String(p2.leading);
    el2.style.maxWidth = "none";
    el2.style.padding = stringifiedPadding(p2);
    el2.style.position = "absolute";
    el2.style.width = "auto";
    el2.style.visibility = "hidden";
    document.body.appendChild(el2);
    const size = { w: el2.offsetWidth, h: el2.offsetHeight };
    document.body.removeChild(el2);
    return size;
  }
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
  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    let id2 = "";
    for (let i = 0; i < 32; i++) {
      id2 += Math.floor(Math.random() * 16).toString(16);
    }
    return id2;
  }
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
    findNode(root, w2, h) {
      if (root.used) {
        return root.right && this.findNode(root.right, w2, h) || root.down && this.findNode(root.down, w2, h) || null;
      }
      if (w2 <= root.w && h <= root.h) return root;
      return null;
    }
    splitNode(node, w2, h) {
      node.used = true;
      node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
      node.right = { x: node.x + w2, y: node.y, w: node.w - w2, h };
      return node;
    }
    growNode(w2, h) {
      const canGrowDown = w2 <= this.root.w;
      const canGrowRight = h <= this.root.h;
      const shouldGrowRight = canGrowRight && this.root.h >= this.root.w + w2;
      const shouldGrowDown = canGrowDown && this.root.w >= this.root.h + h;
      if (shouldGrowRight) return this.growRight(w2, h);
      if (shouldGrowDown) return this.growDown(w2, h);
      if (canGrowRight) return this.growRight(w2, h);
      if (canGrowDown) return this.growDown(w2, h);
      return null;
    }
    growRight(w2, h) {
      this.root = {
        used: true,
        x: 0,
        y: 0,
        w: this.root.w + w2,
        h: this.root.h,
        down: this.root,
        right: { x: this.root.w, y: 0, w: w2, h: this.root.h }
      };
      const node = this.findNode(this.root, w2, h);
      return node ? this.splitNode(node, w2, h) : null;
    }
    growDown(w2, h) {
      this.root = {
        used: true,
        x: 0,
        y: 0,
        w: this.root.w,
        h: this.root.h + h,
        down: { x: 0, y: this.root.h, w: this.root.w, h },
        right: this.root
      };
      const node = this.findNode(this.root, w2, h);
      return node ? this.splitNode(node, w2, h) : null;
    }
  };
  function yieldToMain() {
    const scheduler = globalThis.scheduler;
    if (scheduler?.yield) {
      return scheduler.yield();
    }
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
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
    const texture = new Bc(
      data,
      mapping.texts.length,
      1,
      kt,
      Lt
    );
    texture.colorSpace = Ze;
    texture.needsUpdate = true;
    return texture;
  }
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
    const { userUniforms, textsLength, textureWidth, mainImage: mainImage6 } = args;
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
      mainImage6,
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
      const y2 = Math.ceil(i / width);
      const x = i - width * (y2 - 1);
      let refIndex = 0;
      let alpha = 0;
      for (let k2 = 0; k2 < boundsList.length; k2++) {
        const bounds = boundsList[k2];
        if (!bounds) continue;
        const bW = bounds.w / ratio * sampleAccuracy;
        const bH = bounds.h / ratio * sampleAccuracy;
        const bX = bounds.x / ratio * sampleAccuracy;
        const bY = bounds.y / ratio * sampleAccuracy;
        if (y2 >= bY && y2 <= bY + bH && x >= bX && x <= bX + bW) {
          refIndex = k2 / mapping.texts.length + indicesOffset;
          alpha = 1;
          break;
        }
      }
      const flippedIndex = (height - y2) * width + (x - 1);
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
    const texture = new Bc(
      data,
      width,
      height,
      kt,
      Lt
    );
    texture.flipY = false;
    texture.colorSpace = Ze;
    texture.needsUpdate = true;
    return texture;
  }
  async function buildTextTexture(mapping) {
    const texture = new Vh(mapping.toCanvas());
    texture.minFilter = Mt;
    texture.magFilter = Mt;
    texture.generateMipmaps = true;
    texture.flipY = true;
    texture.colorSpace = Ze;
    texture.needsUpdate = true;
    return texture;
  }
  function buildUserUniformDataTextureObjects(validUniforms, textsLength) {
    const names = Object.keys(validUniforms);
    const dataLength = names.length * textsLength;
    const data = new Float32Array(dataLength * 4);
    const texture = new Bc(
      data,
      dataLength,
      1,
      kt,
      Lt
    );
    texture.colorSpace = Ze;
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
    const threeMaterial = new Xs({
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
      renderer = new ec({
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
  var Renderer = class extends Emitter {
    constructor() {
      super();
      this.scene = new rc();
      this.camera = new ba(0.5, 0.5, 0.5, 0.5, 0, 100);
      this._width = 1;
      this._height = 1;
      this.animationFrame = null;
      this.loop = () => {
        const gl2 = sharedRenderer();
        gl2.setRenderTarget(this.renderTarget);
        gl2.render(this.scene, this.camera);
        gl2.readRenderTargetPixels(
          this.renderTarget,
          0,
          0,
          this._width,
          this._height,
          this.imageDataArray
        );
        gl2.setRenderTarget(null);
        this.emit("render");
        this.animationFrame = requestAnimationFrame(this.loop);
      };
      this.mesh = new Bs(
        new ha(1, 1),
        new es()
        // Stub until a mapping material lands.
      );
      this.scene.add(this.mesh);
      this.setSize(1, 1);
    }
    set material(material) {
      if (material instanceof ts) {
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
      this.renderTarget = new bi(this._width, this._height, {
        minFilter: Mt,
        magFilter: Mt,
        format: kt,
        type: Et
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

  // lib/blotter/materials.js
  var mainImage = (
    /* glsl */
    `
${pi}
${lineMath}
${random}
const int MAX_STEPS = 200;
// Fix a floating point number to two decimal places
float toFixedTwo(float f) {
    return float(int(f * 100.0)) / 100.0;
}
vec2 motionBlurOffsets(vec2 fragCoord, float deg, float spread) {
    // Setup
    // -------------------------------
    vec2 centerUv = vec2(0.5);
    vec2 centerCoord = uResolution.xy * centerUv;
    deg = toFixedTwo(deg);
    float slope = normalizedSlope(slopeForDegrees(deg), uResolution.xy);
    // Find offsets
    // -------------------------------
    vec2 k = offsetsForCoordAtDistanceOnSlope(spread, slope);
    if (deg <= 90.0 || deg >= 270.0) {
        k *= -1.0;
    }
    return k;
}
float noiseWithWidthAtUv(float width, vec2 uv) {
    float noiseModifier = 1.0;
    if (uAnimateNoise > 0.0) {
        noiseModifier = sin(uGlobalTime);
    }
    vec2 noiseRowCol = floor((uv * uResolution.xy) / width);
    vec2 noiseFragCoord = ((noiseRowCol * width) + (width / 2.0));
    vec2 noiseUv = noiseFragCoord / uResolution.xy;
    return random(noiseUv * noiseModifier) * 0.125;
}
vec4 motionBlur(vec2 uv, vec2 blurOffset, float maxOffset) {
    float noiseWidth = 3.0;
    float randNoise = noiseWithWidthAtUv(noiseWidth, uv);
    vec4 result = textTexture(uv);
    float maxStepsReached = 0.0;
    // Note: Step by 2 to optimize performance. We conceal lossiness here via applied noise.
    //   If you do want maximum fidelity, change \`i += 2\` to \`i += 1\` below.
    for (int i = 1; i <= MAX_STEPS; i += 2) {
        if (abs(float(i)) > maxOffset) { break; }
        maxStepsReached += 1.0;
        // Divide blurOffset by 2.0 so that motion blur starts half way behind itself
        //   preventing blur from shoving samples in any direction
        vec2 offset = (blurOffset / 2.0) - (blurOffset * (float(i) / maxOffset));
        vec4 stepSample = textTexture(uv + (offset / uResolution.xy));

        result += stepSample;
    }
    if (maxOffset >= 1.0) {
        result /= maxStepsReached;
        //result.a = pow(result.a, 2.0); // Apply logarithmic smoothing to alpha
        result.a -= (randNoise * (1.0 - result.a)); // Apply noise to smoothed alpha
    }
    return result;
}
void mainImage( out vec4 mainImage, in vec2 fragCoord ) {
    // Setup
    // -------------------------------
    vec2 uv = fragCoord.xy / uResolution.xy;
    float offset = min(float(MAX_STEPS), uResolution.y * uOffset);
    float slope = normalizedSlope(slopeForDegrees(uRotation), uResolution);
    // We want the blur to be the full offset amount in each direction
    //   and to adjust with our logarithmic adjustment made later, so multiply by 4
    float adjustedOffset = offset;// * 4.0;
    vec2 blurOffset = motionBlurOffsets(fragCoord, uRotation, adjustedOffset);
    // Set Starting Points
    // -------------------------------
    vec2 rUv = uv;
    vec2 gUv = uv;
    vec2 bUv = uv;
    vec2 k = offsetsForCoordAtDistanceOnSlope(offset, slope) / uResolution;
    if (uRotation <= 90.0 || uRotation >= 270.0) {
        rUv += k;
        bUv -= k;
    }
    else {
        rUv -= k;
        bUv += k;
    }
    // Blur and Split Channels
    // -------------------------------
    vec4 resultR = vec4(0.0);
    vec4 resultG = vec4(0.0);
    vec4 resultB = vec4(0.0);
    if (uApplyBlur > 0.0) {
        resultR = motionBlur(rUv, blurOffset, adjustedOffset);
        resultG = motionBlur(gUv, blurOffset, adjustedOffset);
        resultB = motionBlur(bUv, blurOffset, adjustedOffset);
    } else {
        resultR = textTexture(rUv);
        resultG = textTexture(gUv);
        resultB = textTexture(bUv);
    }
    float a = resultR.a + resultG.a + resultB.a;
    resultR = normalBlend(resultR, uBlendColor);
    resultG = normalBlend(resultG, uBlendColor);
    resultB = normalBlend(resultB, uBlendColor);
    mainImage = vec4(resultR.r, resultG.g, resultB.b, a);
}
`
  );
  var ChannelSplitMaterial = class extends Material {
    constructor() {
      super({
        mainImage,
        uniforms: {
          uOffset: { type: "1f", value: 0.05 },
          uRotation: { type: "1f", value: 45 },
          uApplyBlur: { type: "1f", value: 1 },
          uAnimateNoise: { type: "1f", value: 1 }
        }
      });
    }
  };
  var mainImage2 = (
    /* glsl */
    `
${random}
vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
float isParticle(out vec3 particleColor, vec2 fragCoord, float pointRadius, float pointCellWidth, float dodge, vec2 dodgePosition, float dodgeSpread, float speed) {    
    if (pointCellWidth == 0.0) { return 0.0; };
    vec2 uv = fragCoord.xy / uResolution.xy;
    float pointRadiusOfCell = pointRadius / pointCellWidth;
    vec2 totalCellCount = uResolution.xy / pointCellWidth;
    vec2 cellUv = uv * totalCellCount;
    // Tile the space
    vec2 iUv = floor(cellUv);
    vec2 fUv = fract(cellUv);
    float minDist = 1.0;  // minimun distance
    vec4 baseSample = textTexture(cellUv);
    float maxWeight = 0.0;
    particleColor = baseSample.rgb;
    for (int y= -1; y <= 1; y++) {
        for (int x= -1; x <= 1; x++) {
            // Neighbor place in the grid
            vec2 neighbor = vec2(float(x), float(y));
            // Random position from current + neighbor place in the grid
            vec2 point = random2(iUv + neighbor);
            // Get cell weighting from cell's center alpha
            vec2 cellRowCol = floor(fragCoord / pointCellWidth) + neighbor;
            vec2 cellFragCoord = ((cellRowCol * pointCellWidth) + (pointCellWidth / 2.0));
            vec4 cellSample = textTexture(cellFragCoord / uResolution.xy);
            float cellWeight = cellSample.a;
            if (cellWeight < 1.0) {
               // If the cell is not fully within our text, we should disregard it
               continue;
            }
            maxWeight = max(maxWeight, cellWeight);
            if (cellWeight == maxWeight) {
                particleColor = cellSample.rgb;
            }
            float distanceFromDodge = distance(dodgePosition * uResolution.xy, cellFragCoord) / uResolution.y;
            distanceFromDodge = 1.0 - smoothstep(0.0, dodgeSpread, distanceFromDodge);
            // Apply weighting to noise and dodge if dodge is set to 1.0
            cellWeight = step(cellWeight, random(cellRowCol)) + (distanceFromDodge * dodge);
            // Animate the point
            point = 0.5 + 0.75 * sin((uGlobalTime * speed) + 6.2831 * point);
            // Vector between the pixel and the point
            vec2 diff = neighbor + point - fUv;
            // Distance to the point
            float dist = length(diff);
            dist += cellWeight; // Effectively remove point
            // Keep the closer distance
            minDist = min(minDist, dist);
        }
    }
    float pointEasing = pointRadiusOfCell - (1.0 / pointCellWidth);
    float isParticle = 1.0 - smoothstep(pointEasing, pointRadiusOfCell, minDist);
    return isParticle;
}
void mainImage( out vec4 mainImage, in vec2 fragCoord ) {
    vec2 uv = fragCoord.xy / uResolution.xy;
    // Convert uPointCellWidth to pixels, keeping it between 1 and the total y resolution of the text
    // Note: floor uPointCellWidth here so that we dont have half pixel widths on retina displays
    float pointCellWidth = floor(max(0.0, min(1.0, uPointCellWidth) * uResolution.y));
    // Ensure uPointRadius allow points to exceed the width of their cells
    float pointRadius = uPointRadius * 0.8;
    pointRadius = min(pointRadius * pointCellWidth, pointCellWidth);
    float dodge = ceil(uDodge);
    vec3 outColor = vec3(0.0);
    float point = isParticle(outColor, fragCoord, pointRadius, pointCellWidth, dodge, uDodgePosition, uDodgeSpread, uSpeed);
    mainImage = vec4(outColor, point);
}
`
  );
  var mainImage3 = (
    /* glsl */
    `
${noise3d}
void mainImage( out vec4 mainImage, in vec2 fragCoord )
{
    // Setup ========================================================================
    vec2 uv = fragCoord.xy / uResolution.xy;
    float z = uSeed + uGlobalTime * uSpeed;
    uv += snoise(vec3(uv, z)) * uVolatility;
    mainImage = textTexture(uv);
}
`
  );
  var mainImage4 = (
    /* glsl */
    `
${pi}
${lineMath}
${noise}
// Fix a floating point number to two decimal places
float toFixedTwo(float f) {
    return float(int(f * 100.0)) / 100.0;
}
// Via: http://www.iquilezles.org/www/articles/functions/functions.htm
float impulse(float k, float x) {
    float h = k * x;
    return h * exp(1.0 - h);
}
vec2 waveOffset(vec2 fragCoord, float sineDistortSpread, float sineDistortCycleCount, float sineDistortAmplitude, float noiseDistortVolatility, float noiseDistortAmplitude, vec2 distortPosition, float deg, float speed) {
    // Setup
    // -------------------------------
    deg = toFixedTwo(deg);
    float centerDistance = 0.5;
    vec2 centerUv = vec2(centerDistance);
    vec2 centerCoord = uResolution.xy * centerUv;
    float changeOverTime = uGlobalTime * speed;
    float slope = normalizedSlope(slopeForDegrees(deg), uResolution.xy);
    float perpendicularDeg = mod(deg + 90.0, 360.0); // Offset angle by 90.0, but keep it from exceeding 360.0
    float perpendicularSlope = normalizedSlope(slopeForDegrees(perpendicularDeg), uResolution.xy);
    // Find intersects for line with edges of viewport
    // -------------------------------
    vec2 edgeIntersectA = vec2(0.0);
    vec2 edgeIntersectB = vec2(0.0);
    intersectsOnRectForLine(edgeIntersectA, edgeIntersectB, vec2(0.0), uResolution.xy, centerCoord, slope);
    float crossSectionLength = distance(edgeIntersectA, edgeIntersectB);
    // Find the threshold for degrees at which our intersectsOnRectForLine function would flip
    //   intersects A and B because of the order in which it finds them. This is the angle at which
    //   the y coordinate for the hypotenuse of a right triangle whose oposite adjacent edge runs from
    //   vec2(0.0, centerCoord.y) to centerCoord and whose opposite edge runs from vec2(0.0, centerCoord.y) to
    //   vec2(0.0, uResolution.y) exceeeds uResolution.y
    float thresholdDegA = atan(centerCoord.y / centerCoord.x) * (180.0 / PI);
    float thresholdDegB = mod(thresholdDegA + 180.0, 360.0);
    vec2 edgeIntersect = vec2(0.0);
    if (deg < thresholdDegA || deg > thresholdDegB) {
        edgeIntersect = edgeIntersectA;
    } else {
        edgeIntersect = edgeIntersectB;
    }
    vec2 perpendicularIntersectA = vec2(0.0);
    vec2 perpendicularIntersectB = vec2(0.0);
    intersectsOnRectForLine(perpendicularIntersectA, perpendicularIntersectB, vec2(0.0), uResolution.xy, centerCoord, perpendicularSlope); 
    float perpendicularLength = distance(perpendicularIntersectA, perpendicularIntersectA);
    vec2 coordLineIntersect = vec2(0.0);
    lineLineIntersection(coordLineIntersect, centerCoord, slope, fragCoord, perpendicularSlope);
    // Define placement for distortion 
    // -------------------------------
    vec2 distortPositionIntersect = vec2(0.0);
    lineLineIntersection(distortPositionIntersect, distortPosition * uResolution.xy, perpendicularSlope, edgeIntersect, slope);
    float distortDistanceFromEdge = (distance(edgeIntersect, distortPositionIntersect) / crossSectionLength);// + sineDistortSpread;
    float uvDistanceFromDistort = distance(edgeIntersect, coordLineIntersect) / crossSectionLength;
    float noiseDistortVarianceAdjuster = uvDistanceFromDistort + changeOverTime;
    uvDistanceFromDistort += -centerDistance + distortDistanceFromEdge + changeOverTime;
    uvDistanceFromDistort = mod(uvDistanceFromDistort, 1.0); // For sine, keep distance between 0.0 and 1.0
    // Define sine distortion 
    // -------------------------------
    float minThreshold = centerDistance - sineDistortSpread;
    float maxThreshold = centerDistance + sineDistortSpread;
    uvDistanceFromDistort = clamp(((uvDistanceFromDistort - minThreshold)/(maxThreshold - minThreshold)), 0.0, 1.0);
    if (sineDistortSpread < 0.5) {
        // Add smoother decay to sin distort when it isnt taking up the full viewport.
        uvDistanceFromDistort = impulse(uvDistanceFromDistort, uvDistanceFromDistort);
    }
    float sineDistortion = sin(uvDistanceFromDistort * PI * sineDistortCycleCount) * sineDistortAmplitude;
    // Define noise distortion 
    // -------------------------------
    float noiseDistortion = noise(noiseDistortVolatility * noiseDistortVarianceAdjuster) * noiseDistortAmplitude;
    if (noiseDistortVolatility > 0.0) {
        noiseDistortion -= noiseDistortAmplitude / 2.0; // Adjust primary distort so that it distorts in two directions.
    }
    noiseDistortion *= (sineDistortion > 0.0 ? 1.0 : -1.0); // Adjust primary distort to account for sin variance.
    // Combine distortions to find UV offsets 
    // -------------------------------
    vec2 kV = offsetsForCoordAtDistanceOnSlope(sineDistortion + noiseDistortion, perpendicularSlope);
    if (deg <= 0.0 || deg >= 180.0) {
        kV *= -1.0;
    }
    return kV;
}
void mainImage( out vec4 mainImage, in vec2 fragCoord )
{
    // Setup
    // -------------------------------
    vec2 uv = fragCoord.xy / uResolution.xy;
    // Minor hacks to ensure our waves start horizontal and animating in a downward direction by default.
    uRotation = mod(uRotation + 270.0, 360.0);
    uDistortPosition.y = 1.0 - uDistortPosition.y;
    // Distortion
    // -------------------------------
    vec2 offset = waveOffset(fragCoord, uSineDistortSpread, uSineDistortCycleCount, uSineDistortAmplitude, uNoiseDistortVolatility, uNoiseDistortAmplitude, uDistortPosition, uRotation, uSpeed);
    mainImage = textTexture(uv + offset);
}
`
  );
  var mainImage5 = (
    /* glsl */
    `
${pi}
float easingForPositionWithDeadzoneWidth(float position, float deadzoneWidth) {
    // Offset position buy 0.25 so that sin wave begins on a downslope at 0.0
    position += 0.25;
    // Distance of adjusted position from 0.75, min of 0.0 and max of 0.5
    float firstDist = distance(position, 0.75);
    // Divide deadzoneWidth by two, as we will be working it out in either direction from the center position.
    float halfDeadzoneWidth = deadzoneWidth / 2.0;
    // Clamp distance of position from center (0.75) to something between 0.5 and the halfDeadzoneWidth from center.
    float removedDistance = max(firstDist, halfDeadzoneWidth);
    // Find the percentage of removedDistance within the range of halfDeadzoneWidth..0.5
    float distanceOfRange = (removedDistance - halfDeadzoneWidth) / (0.5 - halfDeadzoneWidth);
    // Convert distanceOfRange to a number between 0.0 and 0.5. This means that for any pixel +/- halfDeadzoneWidth from center, the value will be 0.5.
    float offsetDist = (0.5 * (1.0 - (distanceOfRange)));
    if (position < 0.75) {
        position = 0.25 + offsetDist;
    } else {
        position = 1.25 - offsetDist;
    }
    return sin((position) * PI * 2.0) / 2.0;
}
void mainImage( out vec4 mainImage, in vec2 fragCoord )
{
    // Setup ========================================================================
    vec2 uv = fragCoord.xy / uResolution.xy;
    float time = uGlobalTime * uSpeed;
    float directionalAdjustment = uFlipAnimationDirection > 0.0 ? -1.0 : 1.0;
    if (uSpeed > 0.0) {
       // Define Axis-Based Striping ===================================================
       float divisions = uDivisions;
       float effectPosition = fragCoord.y;
       float effectDimension = uResolution.y;
       if (uAnimateHorizontal > 0.0) {
          effectPosition = fragCoord.x;
          effectDimension = uResolution.x;
          divisions = floor((divisions * (uResolution.x / uResolution.y)) + 0.5);
       }
       float stripe = floor(effectPosition / (effectDimension / divisions));
       // Animate =====================================================================
       float timeAdjustedForStripe = time - ((uDivisionWidth / divisions) * stripe) * directionalAdjustment;
       float offsetAtTime = mod(timeAdjustedForStripe, 1.0);
       // Divide sin output by 2 and add to 0.5 so that sin wave move between 0.0 and 1.0 rather than -1.0 and 1.0.
       float easing = 0.5 + easingForPositionWithDeadzoneWidth(offsetAtTime, uDivisionWidth);
       // Mulptiply offsetAtTime by 2.0 and subtract from 1.0 so that position changes over a range of -1.0 to 1.0 rather than 0.0 to 1.0.
       if (uAnimateHorizontal > 0.0) {
          uv.x -= ((1.0 - (offsetAtTime * 2.0)) * easing) * directionalAdjustment;
       } else {
          uv.y -= ((1.0 - (offsetAtTime * 2.0)) * easing) * directionalAdjustment;
       }
    }
    mainImage = textTexture(uv);
}
`
  );

  // js/hero-titulo.js
  var OPCIONES_TITULO = {
    efecto: true,
    // false = no usar Blotter (hero.js cae a GSAP)
    base: 0.012,
    // separación mínima, en fracción del alto del lienzo
    radio: 0.07,
    // cuánto crece con la distancia del ratón al centro
    velocidad: 0.025,
    // extra cuando el ratón va rápido
    paseo: true
    // si no hay ratón, el efecto se mueve solo
  };
  var ESPERA_PASEO = 2.2;
  function ajustesTitulo() {
    const retoques = window.HERO_AJUSTES && window.HERO_AJUSTES.titulo || {};
    return Object.assign({}, OPCIONES_TITULO, retoques);
  }
  function propiedadesBase(titulo) {
    const estilo = window.getComputedStyle(titulo);
    return {
      family: estilo.fontFamily || "Anton, Impact, sans-serif",
      weight: estilo.fontWeight || "400",
      size: Math.max(24, Math.round(parseFloat(estilo.fontSize) || 74))
    };
  }
  async function cargarFuente(familia, frase) {
    if (!document.fonts || !document.fonts.load) {
      return;
    }
    const primera = (familia.split(",")[0] || "Anton").replace(/["']/g, "").trim();
    try {
      await document.fonts.load("400 100px " + primera, frase);
    } catch (error) {
    }
  }
  function tamanoQueCabe(prop, titulo) {
    const frase = titulo.textContent.trim().toUpperCase();
    const disponible = Math.max(220, (titulo.getBoundingClientRect().width || window.innerWidth) - 24);
    const muestra = document.createElement("canvas").getContext("2d");
    if (!muestra) {
      return prop.size;
    }
    muestra.font = prop.weight + " " + prop.size + "px " + prop.family;
    const ancho = muestra.measureText(frase).width || 0;
    if (ancho > disponible) {
      return Math.max(22, Math.floor(prop.size * disponible / ancho));
    }
    return prop.size;
  }
  function propiedadesTexto(titulo) {
    const prop = propiedadesBase(titulo);
    const size = tamanoQueCabe(prop, titulo);
    return {
      family: prop.family,
      weight: prop.weight,
      size,
      fill: "#f6f6f6",
      leading: 1,
      paddingTop: Math.round(size * 0.3),
      paddingRight: Math.round(size * 0.14),
      paddingBottom: Math.round(size * 0.2),
      paddingLeft: Math.round(size * 0.14)
    };
  }
  async function montarTituloBlotter(titulo) {
    if (!titulo || !titulo.textContent || prefiereMenosMovimiento()) {
      return false;
    }
    if (typeof isWebGLSupported === "function" && !isWebGLSupported()) {
      return false;
    }
    const ajustes2 = ajustesTitulo();
    if (ajustes2.efecto === false) {
      return false;
    }
    await cargarFuente(propiedadesBase(titulo).family, titulo.textContent.trim().toUpperCase());
    const propiedades = propiedadesTexto(titulo);
    const texto = new Text(titulo.textContent.trim().toUpperCase(), propiedades);
    const material = new ChannelSplitMaterial();
    material.uniforms.uOffset.value = ajustes2.base;
    material.uniforms.uRotation.value = 0;
    if (material.uniforms.uBlendColor) {
      material.uniforms.uBlendColor.value = [0, 0, 0, 1];
    }
    const blotter = new Blotter(material, {
      texts: texto,
      ratio: Math.min(window.devicePixelRatio || 1, 2)
    });
    const alcance = blotter.forText(texto);
    if (!alcance) {
      throw new Error("Blotter no reconoci\xF3 el texto");
    }
    alcance.appendTo(titulo);
    await blotter.ready;
    const lienzo = titulo.querySelector("canvas");
    if (!lienzo) {
      throw new Error("Blotter no dej\xF3 lienzo en el titular");
    }
    titulo.classList.add("blotter-activo");
    titulo.setAttribute("data-efecto", "blotter");
    window.requestAnimationFrame(() => lienzo.classList.add("listo"));
    seguirRaton(material, titulo, lienzo, ajustes2);
    reescalar(texto, titulo);
    return true;
  }
  function seguirRaton(material, titulo, lienzo, ajustes2) {
    const escucha = titulo.closest(".hero") || titulo;
    const uniformes = material.uniforms;
    const puntero = {
      x: 0.5,
      y: 0.5,
      /* posición suavizada */
      tx: 0.5,
      ty: 0.5,
      /* posición objetivo */
      v: 0,
      /* velocidad normalizada 0–1 */
      ultimoTiempo: 0,
      ultimoMovimiento: -Infinity
    };
    let reloj = 0;
    let anterior = performance.now();
    function mover(evento) {
      const caja = lienzo.getBoundingClientRect();
      if (!caja.width || !caja.height) {
        return;
      }
      const nx = (evento.clientX - caja.left) / caja.width;
      const ny = (evento.clientY - caja.top) / caja.height;
      const dt2 = Math.max(8, evento.timeStamp - (puntero.ultimoTiempo || 0));
      const rapidez = Math.hypot(nx - puntero.tx, ny - puntero.ty) / (dt2 / 1e3);
      puntero.v = Math.min(1, puntero.v * 0.6 + Math.min(1, rapidez / 4) * 0.4);
      puntero.tx = nx;
      puntero.ty = ny;
      puntero.ultimoTiempo = evento.timeStamp;
      puntero.ultimoMovimiento = performance.now();
    }
    escucha.addEventListener("pointermove", mover, { passive: true });
    escucha.addEventListener("pointerdown", mover, { passive: true });
    function marco(ahora) {
      const dt2 = Math.min(0.05, (ahora - anterior) / 1e3);
      anterior = ahora;
      reloj += dt2;
      const sinRaton = ahora - puntero.ultimoMovimiento > ESPERA_PASEO * 1e3;
      const paseando = sinRaton && ajustes2.paseo !== false;
      if (paseando) {
        puntero.tx = 0.5 + Math.sin(reloj * 0.7) * 0.42;
        puntero.ty = 0.5 + Math.sin(reloj * 1.1) * 0.32;
        puntero.v += (0.18 + 0.12 * Math.sin(reloj * 0.9) - puntero.v) * dt2 * 2;
      } else {
        puntero.v *= Math.pow(0.25, dt2);
      }
      const suavizado = Math.min(1, dt2 * 7);
      puntero.x += (puntero.tx - puntero.x) * suavizado;
      puntero.y += (puntero.ty - puntero.y) * suavizado;
      const nx = puntero.x - 0.5;
      const ny = puntero.y - 0.5;
      const distancia = Math.min(0.7, Math.hypot(nx, ny));
      uniformes.uOffset.value = ajustes2.base + distancia * ajustes2.radio + puntero.v * ajustes2.velocidad;
      uniformes.uRotation.value = (Math.atan2(-ny, nx) * 180 / Math.PI + 360) % 360;
      window.requestAnimationFrame(marco);
    }
    window.requestAnimationFrame(marco);
  }
  function reescalar(texto, titulo) {
    let temporizador = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        texto.properties = propiedadesTexto(titulo);
      }, 250);
    });
  }

  // js/entrada.js
  var DOBLEZ = 34;
  var DOBLEZ_ENCIMA = 54;
  var UMBRAL = 5;
  var ABIERTA_X = 0;
  var ABIERTA_Y = 1;
  var ASOMA = 0.12;
  var FUNDIDO = 0.1;
  function sinMovimiento() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function conRaton() {
    return !window.matchMedia || window.matchMedia("(hover: hover)").matches;
  }
  function montarEntrada() {
    const caja = document.getElementById("entrada");
    if (!caja) {
      return false;
    }
    if (!window.Peel || !window.Peel.supported) {
      caja.className += " entrada-quieta";
      return false;
    }
    const peel = new window.Peel(caja, {
      corner: window.Peel.Corners.TOP_RIGHT,
      /* La capa es un rectángulo y la entrada no: una sombra de caja
         delataría el rectángulo, así que solo sombras «de dentro». */
      topShadow: false,
      backShadow: true,
      backShadowSize: 0.05,
      backReflection: true,
      backReflectionAlpha: 0.1,
      bottomShadow: true,
      bottomShadowSize: 2.2,
      bottomShadowDarkAlpha: 0.6
    });
    const posicion = { x: 0, y: 0 };
    let tween = null;
    let arrastrando = false;
    let movido = false;
    function doblada() {
      return { x: caja.offsetWidth - DOBLEZ, y: DOBLEZ };
    }
    function encima() {
      return { x: caja.offsetWidth - DOBLEZ_ENCIMA, y: DOBLEZ_ENCIMA };
    }
    function abierta() {
      return { x: caja.offsetWidth * ABIERTA_X, y: caja.offsetHeight * ABIERTA_Y };
    }
    function progreso() {
      const desde = doblada();
      const hasta = abierta();
      const largo = Math.hypot(hasta.x - desde.x, hasta.y - desde.y);
      if (!largo) {
        return 1;
      }
      const andado = Math.hypot(posicion.x - desde.x, posicion.y - desde.y);
      return Math.max(0, Math.min(1, andado / largo));
    }
    function sincronizar() {
      if (progreso() > ASOMA) {
        caja.classList.add("entrada-abierta");
      } else {
        caja.classList.remove("entrada-abierta");
      }
    }
    function poner(x, y2) {
      posicion.x = x;
      posicion.y = y2;
      peel.setPeelPosition(x, y2);
      sincronizar();
      const visto = Math.min(1, Math.max(0, (1 - progreso()) / FUNDIDO));
      caja.style.setProperty("--entrada-visible", visto.toFixed(3));
    }
    function parar() {
      if (tween) {
        tween.kill();
        tween = null;
      }
    }
    function irA(destino, duracion) {
      parar();
      if (!window.gsap || sinMovimiento()) {
        poner(destino.x, destino.y);
        return;
      }
      const punto = { x: posicion.x, y: posicion.y };
      let acabada = false;
      const animacion = window.gsap.to(punto, {
        x: destino.x,
        y: destino.y,
        duration: duracion,
        ease: "power2.out",
        onUpdate: function() {
          poner(punto.x, punto.y);
        },
        onComplete: function() {
          acabada = true;
          tween = null;
        }
      });
      tween = acabada ? null : animacion;
    }
    function alternar() {
      if (progreso() > 0.5) {
        irA(doblada(), 0.5);
      } else {
        irA(abierta(), 0.55);
      }
    }
    function local(evt) {
      const cajaRect = caja.getBoundingClientRect();
      return {
        x: evt.clientX - cajaRect.left,
        y: evt.clientY - cajaRect.top
      };
    }
    function alBajar(evt) {
      if (evt.pointerType === "mouse" && evt.button !== 0) {
        return;
      }
      parar();
      arrastrando = true;
      movido = false;
      if (caja.setPointerCapture) {
        caja.setPointerCapture(evt.pointerId);
      }
      if (evt.cancelable) {
        evt.preventDefault();
      }
    }
    function alMover(evt) {
      if (!arrastrando) {
        return;
      }
      const punto = local(evt);
      if (Math.abs(punto.x - posicion.x) > UMBRAL || Math.abs(punto.y - posicion.y) > UMBRAL) {
        movido = true;
      }
      if (evt.cancelable) {
        evt.preventDefault();
      }
      poner(punto.x, punto.y);
    }
    function alSoltar(evt) {
      if (!arrastrando) {
        return;
      }
      arrastrando = false;
      if (caja.releasePointerCapture && evt.pointerId !== void 0) {
        try {
          caja.releasePointerCapture(evt.pointerId);
        } catch (error) {
        }
      }
      if (!movido) {
        alternar();
        return;
      }
      if (progreso() < 0.5) {
        irA(doblada(), 0.35);
      } else {
        irA(abierta(), 0.5);
      }
    }
    function alEntrar(evt) {
      if (arrastrando || tween || !conRaton()) {
        return;
      }
      if (evt && evt.pointerType && evt.pointerType !== "mouse") {
        return;
      }
      if (progreso() > 0.2) {
        return;
      }
      irA(encima(), 0.28);
    }
    function alSalir() {
      if (arrastrando || tween || !conRaton()) {
        return;
      }
      if (progreso() > 0.2) {
        return;
      }
      irA(doblada(), 0.28);
    }
    poner(doblada().x, doblada().y);
    caja.addEventListener("pointerdown", alBajar, false);
    caja.addEventListener("pointermove", alMover, false);
    caja.addEventListener("pointerup", alSoltar, false);
    caja.addEventListener("pointercancel", alSoltar, false);
    caja.addEventListener("mouseenter", alEntrar, false);
    caja.addEventListener("mouseleave", alSalir, false);
    let espera = 0;
    window.addEventListener("resize", function() {
      window.clearTimeout(espera);
      espera = window.setTimeout(function() {
        peel.setupDimensions();
        peel.setCorner(window.Peel.Corners.TOP_RIGHT);
        if (progreso() < 0.2) {
          poner(doblada().x, doblada().y);
        }
      }, 150);
    });
    return true;
  }

  // js/hero.js
  var ajustes = window.HERO_AJUSTES || {};
  var sinMovimiento2 = prefiereMenosMovimiento();
  var cajaShader = document.getElementById("hero-shader");
  var presetRayos = PRESETS[ajustes.preset] || PRESETS.abismo;
  var montadores = {
    dither: () => montarDither(cajaShader),
    fluido: () => montarFluido(cajaShader),
    rayos: () => montarShader(cajaShader, presetRayos)
  };
  var ordenes = {
    dither: ["dither", "fluido", "rayos"],
    fluido: ["fluido", "dither", "rayos"],
    rayos: ["rayos", "fluido", "dither"]
  };
  async function arrancarFondo() {
    if (!cajaShader) {
      return;
    }
    const orden = ordenes[ajustes.fondo || "fluido"] || ordenes.fluido;
    for (const nombre of orden) {
      if (await montadores[nombre]()) {
        return;
      }
    }
    console.warn("Hero: sin WebGL; queda el resplandor est\xE1tico \xB7", cajaShader.dataset.motivo || "WebGL no disponible");
  }
  async function arrancarTitulo() {
    const titulo = document.getElementById("arriba");
    if (!titulo || sinMovimiento2) {
      return;
    }
    try {
      if (await montarTituloBlotter(titulo)) {
        return;
      }
    } catch (error) {
      console.warn("Hero: Blotter no arranc\xF3; el titular va con GSAP.", error);
    }
    titulo.setAttribute("data-efecto", "gsap");
    animarTitulo(titulo);
  }
  arrancarFondo();
  arrancarTitulo();
  montarEntrada();
  if (!sinMovimiento2) {
    const subtitulo = document.getElementById("hero-sub");
    if (subtitulo) {
      animarSubtitulo(subtitulo, 0.75);
    }
    if (window.gsap) {
      window.gsap.from(".hero-banda .boton", {
        autoAlpha: 0,
        y: 12,
        duration: 0.8,
        delay: 1.5,
        ease: "power2.out"
      });
    }
  }
})();
/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
