import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;
uniform float uIntensity;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    // uIntensity nới trần độ phủ: 1.0 = như bản gốc (nhạt), >1 = màu ăn sâu hơn
    // về phía tối. Không chuẩn hoá chroma khi uIntensity > 1 để GIỮ độ sẫm của màu
    // đầu vào — bản gốc chia cho chromaPeak nên màu nào cũng bị kéo lên bão hoà tối đa.
    float capA = clamp(0.86 * uIntensity, 0.0, 1.0);
    float capB = clamp(0.94 * uIntensity, 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, capA);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    vec3 normalized = chroma / max(chromaPeak, 0.0001);
    chroma = mix(normalized, chroma, clamp(uIntensity - 1.0, 0.0, 1.0));
    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, capB)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
`;

export interface AuroraProps {
  /** 3 mốc màu của dải sáng, trái → phải. */
  colorStops?: [string, string, string];
  amplitude?: number;
  blend?: number;
  speed?: number;
  /** true = dải màu trên NỀN TRẮNG (hợp tông kem); false = dải sáng trên nền tối. */
  lightMode?: boolean;
  /**
   * Chỉ có tác dụng ở lightMode. 1.0 = như bản gốc (màu nhạt, luôn bị kéo lên bão hoà
   * tối đa). Lớn hơn 1 thì màu ăn sâu hơn về phía tối và GIỮ được độ sẫm của colorStops.
   */
  intensity?: number;
}

/**
 * Nền động Aurora (WebGL, thư viện ogl).
 *
 * Bọc trong phần tử cha có kích thước xác định — component tự lấp đầy 100%.
 * Chỉ là TRANG TRÍ: đặt aria-hidden và không nhận tương tác, để nội dung phía trên
 * vẫn đọc/bấm bình thường.
 *
 * Tôn trọng `prefers-reduced-motion`: người bật giảm chuyển động sẽ thấy nền tĩnh
 * (vẫn vẽ 1 khung) thay vì hoạt ảnh chạy liên tục.
 */
const Aurora = ({
  colorStops = ['#5227FF', '#7cff67', '#5227FF'],
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  lightMode = false,
  intensity = 1.0,
}: AuroraProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Props mới nhất cho vòng lặp render — tránh dựng lại WebGL context mỗi lần đổi prop.
  // Ghi trong effect chứ KHÔNG ghi lúc render: React có thể render nhiều lần trước khi
  // commit, ghi ref lúc đó là tác dụng phụ không an toàn.
  const propsRef = useRef({ colorStops, amplitude, blend, speed, lightMode, intensity });
  useEffect(() => {
    propsRef.current = { colorStops, amplitude, blend, speed, lightMode, intensity };
  }, [colorStops, amplitude, blend, speed, lightMode, intensity]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';

    const geometry = new Triangle(gl);
    // Shader không dùng uv — bỏ để khỏi cấp phát buffer thừa.
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    const toRgb = (hex: string) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    };

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStops.map(toRgb) },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uBlend: { value: blend },
        uLightMode: { value: lightMode ? 1 : 0 },
        uIntensity: { value: intensity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);

    const resize = () => {
      const { offsetWidth: w, offsetHeight: h } = container;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
    };
    // ResizeObserver thay vì window resize: panel/khung cha đổi kích thước mà cửa sổ
    // không đổi (mở bảng bên, chia màn) thì listener window không bắn.
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (t: number) => {
      const p = propsRef.current;
      program.uniforms.uTime.value = t * 0.01 * p.speed * 0.1;
      program.uniforms.uAmplitude.value = p.amplitude;
      program.uniforms.uBlend.value = p.blend;
      program.uniforms.uLightMode.value = p.lightMode ? 1 : 0;
      program.uniforms.uIntensity.value = p.intensity;
      program.uniforms.uColorStops.value = p.colorStops.map(toRgb);
      renderer.render({ scene: mesh });
    };

    let frameId = 0;
    if (reduceMotion) {
      draw(0);
    } else {
      const loop = (t: number) => {
        frameId = requestAnimationFrame(loop);
        draw(t);
      };
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      // Trả GPU context — mỗi tab chỉ có hạn ~16 context, không giải phóng thì
      // vào ra phòng học vài lần là mất WebGL.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Chỉ dựng lại khi đổi chế độ màu; các prop khác đọc qua propsRef trong vòng lặp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightMode]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
};

export default Aurora;
