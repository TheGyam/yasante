/**
 * Turns a painting's head with its depth map: every pixel slides sideways by how near it
 * is (the nose most, the back of the hair the other way), which is what a small turn of
 * a real head does. The turn fades out down the neck, so her shoulders never move. One
 * quad, one shader, drawn only when the pose changes.
 */
export interface TurnOptions {
  /** Where the turn starts to fade (her chin) and where it's gone (her collar), 0 top … 1 bottom. */
  chin: number;
  collar: number;
  /** The depth her head turns about, 0 … 1 (about her ears). */
  pivot: number;
  /** How far, in widths of the picture, a turn of 1 moves the nearest point. */
  amount: number;
}

const VERTEX = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D color;
uniform sampler2D depth;
uniform float turn;
uniform float nod;
uniform float chin;
uniform float collar;
uniform float pivot;
uniform float amount;
varying vec2 uv;
void main() {
  // Find the point of the painting that the turn brings here (three steps converge).
  vec2 src = uv;
  for (int i = 0; i < 3; i++) {
    float d = texture2D(depth, src).r - pivot;
    float w = 1.0 - smoothstep(chin, collar, src.y);
    src = uv - vec2(turn * amount * d * w, nod * amount * 0.35 * d * w);
  }
  gl_FragColor = texture2D(color, clamp(src, 0.0, 1.0));
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function texture(gl: WebGLRenderingContext, unit: number, image: HTMLImageElement) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** Set up the turn on a canvas; null where WebGL isn't available (the painting just stays still). */
export function turnable(
  canvas: HTMLCanvasElement,
  color: HTMLImageElement,
  depth: HTMLImageElement,
  options: TurnOptions
) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  texture(gl, 0, color);
  texture(gl, 1, depth);
  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(u('color'), 0);
  gl.uniform1i(u('depth'), 1);
  gl.uniform1f(u('chin'), options.chin);
  gl.uniform1f(u('collar'), options.collar);
  gl.uniform1f(u('pivot'), options.pivot);
  gl.uniform1f(u('amount'), options.amount);
  const turn = u('turn');
  const nod = u('nod');

  return (pose: { turn: number; nod: number }) => {
    // Sized to the screen's pixels, up to the painting's own.
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.min(color.naturalWidth, Math.round(canvas.clientWidth * scale));
    const height = Math.round((width * canvas.clientHeight) / (canvas.clientWidth || 1));
    if (width && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(turn, pose.turn);
    gl.uniform1f(nod, pose.nod);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}
